"""ChaCha20-Poly1305 (RFC 8439) en Python puro — fallback del agente cuando la
lib `cryptography` no está instalada. Sin dependencias. Mismo formato byte a
byte que servicios/_comun/cifra.py: ct||tag concatenados y AAD nulo.
Comprobado vectores RFC y contra ChaCha20Poly1305 de cryptography."""
import struct


def tipo():
    return "puro"


def _rotl(x: int, n: int) -> int:
    return ((x << n) | (x >> (32 - n))) & 0xFFFFFFFF


def _chacha_bloque(k: bytes, c: int, n: bytes) -> bytes:
    """Un bloque del keystream: estado = 4 constantes + 8 de clave + contador
    (pos 12) + 3 del nonce; 8 'doubles rounds' de riguroso el RFC."""
    estado = (*struct.unpack("<4I", b"expand 32-byte k"), *struct.unpack("<8I", k), c,
              *struct.unpack("<3I", n))
    x = list(estado)
    QUARTER = ((0, 4, 8, 12), (1, 5, 9, 13), (2, 6, 10, 14), (3, 7, 11, 15),
               (0, 5, 10, 15), (1, 6, 11, 12), (2, 7, 8, 13), (3, 4, 9, 14))
    for _ in range(10):
        for a, b, c2, d in QUARTER:
            x[a] = (x[a] + x[b]) & 0xFFFFFFFF; x[d] = _rotl(x[d] ^ x[a], 16)
            x[c2] = (x[c2] + x[d]) & 0xFFFFFFFF; x[b] = _rotl(x[b] ^ x[c2], 12)
            x[a] = (x[a] + x[b]) & 0xFFFFFFFF; x[d] = _rotl(x[d] ^ x[a], 8)
            x[c2] = (x[c2] + x[d]) & 0xFFFFFFFF; x[b] = _rotl(x[b] ^ x[c2], 7)
    return struct.pack("<16I", *[(x[i] + estado[i]) & 0xFFFFFFFF for i in range(16)])


def _chacha_xor(k: bytes, contador: int, nonce: bytes, datos: bytes) -> bytes:
    out = bytearray()
    for i in range(0, len(datos), 64):
        keystream = _chacha_bloque(k, contador + i // 64, nonce)
        trozo = datos[i:i + 64]
        out += bytes(b ^ s for b, s in zip(trozo, keystream))
    return bytes(out)


def _poly1305(otk: bytes, mac: bytes) -> bytes:
    """MAC Poly1305 con aritmética entera (RFC 8439 §2.5): claves r y s de
    otk, bloque de entrada con 0x01 teviendo cada datos-16 bytes."""
    r = int.from_bytes(otk[:16], "little") & 0x0FFFFFFC0FFFFFFC0FFFFFFC0FFFFFFF
    s = int.from_bytes(otk[16:32], "little")
    p = (1 << 130) - 5
    acc = 0
    for i in range(0, len(mac), 16):
        bloque = mac[i:i + 16] + b"\x01"     # el byte 'de máscara' del RFC
        acc = (r * (acc + int.from_bytes(bloque, "little"))) % p
    return ((acc + s) & ((1 << 128) - 1)).to_bytes(16, "little")


class Cifrador:
    """AEAD chacha20-poly1305 con AAD vacío y tag de 16 bytes (ct||tag)."""

    def __init__(self, clave32: bytes):
        if len(clave32) != 32:
            raise ValueError("la clave debe medir 32 bytes")
        self.k = clave32

    def _mac_key(self, nonce: bytes) -> bytes:
        # bloque 0 del keystream: primeros 32 bytes (r||s de poly1305)
        return _chacha_bloque(self.k, 0, nonce)[:32]

    def mac_entrada(self, ct: bytes) -> bytes:
        """Lo que entra al MAC del RFC 8439 §2.8.1 con AAD vacío:
        ct || pad16(ct) || LE64(0) || LE64(len(ct))  — el ciphertext TAMBIÉN
        se rellena con 0x00 hasta múltiplo de 16 (pad16); las longitudes son
        siempre dos campos LE64 (la del AAD aunque sea nulo)."""
        relleno = b"" if (len(ct) % 16 == 0) else b"\x00" * (16 - len(ct) % 16)
        return ct + relleno + struct.pack("<Q", 0) + struct.pack("<Q", len(ct))

    def cifra(self, plano: bytes, nonce: bytes) -> bytes:
        ct = _chacha_xor(self.k, 1, nonce, plano)
        return ct + _poly1305(self._mac_key(nonce), self.mac_entrada(ct))

    def descifra(self, ct_tag: bytes, nonce: bytes) -> bytes:
        if len(ct_tag) < 16:
            raise ValueError("registro demasiado corto")
        ct, tag = ct_tag[:-16], ct_tag[-16:]
        if _poly1305(self._mac_key(nonce), self.mac_entrada(ct)) != tag:
            raise ValueError("tag no válido (registro corrupto o clave distinta)")
        return _chacha_xor(self.k, 1, nonce, ct)
