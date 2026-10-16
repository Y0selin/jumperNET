"""Cifrado de registros en los saltos — Fase 8 "cifrado en capas".

El flujo TCP del usuario viaja entre entrada → nodo1 → nodo2 → nodo3 →
destino. Los nodos intermedios reenvian bytes a ciegas (Fase 1), asi que
el cifrado se aplica PUNTO A PUNTO sobre el stream del usuario:

    cliente --plano--> ENTRADA --cifrado--> nodos (reenvio ciego) --cifrado--> EXIT --plano--> destino

Formato del modo cifrado (despues de la linea de ruta del protocolo Fase 1):
  - El emisor escribe UNA vez la magia "JENC" y a continuacion registros:
        [len 4B BE][nonce 12B][ciphertext+tag 16B]
    un registro con len=0 es el terminador de cierre ordenado.
  - Los nodos intermedios NO tocan nada: son reenvio ciego (el cifrado es
    transparente para ellos; de hecho las fases 1-2 no cambian nada).
  - El receptor (nodo EXIT) lee los primeros 4 bytes tras la linea de
    ruta: si son "JENC" entra en modo cifrado; si no, modo plano
    (compatibilidad con las pruebas de las fases 1-2 y sin CLAVE_SALTOS).
  - La clave se deriva de CLAVE_SALTOS con SHA-256 (ChaCha20 de 32B).

Que protege: un observador en el cable entre la entrada y el exit (o
cualquier hop intermedio comprometido en memoria de red) no ve el HTTP del
usuario, solo registros cifrados. La limitacion honesta: la clave es
compartida por configuracion (entrada y nodos son confianza del proyecto),
no es anonimato criptografico estilo onion con claves por salto.
"""
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

MAGIA = b"JENC"      # marca de inicio del modo cifrado (tras la linea de ruta)
LEN_BYTES = 4        # prefijo de longitud en bytes big-endian
NONCE_BYTES = 12     # nonce ChaCha20 standard
CHUNK = 16 * 1024    # tamano maximo de texto claro por registro


def aead_desde_secreto(secreto: str) -> ChaCha20Poly1305:
    """Deriva la clave de cifrado (32B ChaCha20) desde el secreto configurado."""
    return ChaCha20Poly1305(hashlib.sha256(secreto.encode()).digest())


class Emisor:
    """Extremo que CIFRA: la entrada (hacia el exit)."""

    def __init__(self, aead: ChaCha20Poly1305):
        self.aead = aead
        self._magia_enviada = False

    async def enviar(self, writer, datos: bytes):
        if not self._magia_enviada:
            writer.write(MAGIA)
            self._magia_enviada = True
        nonce = os.urandom(NONCE_BYTES)
        ct = self.aead.encrypt(nonce, datos, None)
        writer.write(len(ct).to_bytes(LEN_BYTES, "big") + nonce + ct)
        await writer.drain()

    async def cerrar(self, writer):
        """Registro terminador: longitud 0."""
        if self._magia_enviada:
            writer.write((0).to_bytes(LEN_BYTES, "big"))
        await writer.drain()


class Receptor:
    """Extremo que DESCIFRA: el nodo de salida (hacia el destino)."""

    def __init__(self, aead: ChaCha20Poly1305):
        self.aead = aead

    async def recibir(self, reader) -> bytes:
        """Devuelve el proximo registro descifrado; b'' = fin ordenado."""
        prefijo = await reader.readexactly(LEN_BYTES)
        n = int.from_bytes(prefijo, "big")
        if n == 0:
            return b""
        bloque = await reader.readexactly(NONCE_BYTES + n)
        nonce, ct = bloque[:NONCE_BYTES], bloque[NONCE_BYTES:]
        return self.aead.decrypt(nonce, ct, None)


def es_magia(prefijo: bytes) -> bool:
    return prefijo[:4] == MAGIA
