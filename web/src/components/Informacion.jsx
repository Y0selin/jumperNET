import { useEffect, useState } from "react";
import { api, nodos, decodificaJwt, getToken } from "../lib/api.js";

export default function Informacion() {
  const [modo, setModo] = useState("principiante");
  const [crudo, setCrudo] = useState({ nodos: null, me: null });

  useEffect(() => {
    if (modo === "avanzado") {
      nodos().then((d) => setCrudo((c) => ({ ...c, nodos: d }))).catch(() => {});
      api("GET", "/me").catch(() => {});
    }
  }, [modo]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="tarjeta t-led">
        <div className="fila-btn" style={{ maxWidth: 420 }}>
          <button className={`btn ${modo === "principiante" ? "primario" : ""}`} onClick={() => setModo("principiante")}>
            🎈 Empieza por aquí
          </button>
          <button className={`btn ${modo === "avanzado" ? "primario" : ""}`} onClick={() => setModo("avanzado")}>
            🧬 Modo avanzado
          </button>
        </div>
      </div>

      {modo === "principiante" ? (
        <>
          <div className="tarjeta grande t-led aparecer">
            <h2 className="seccion">¿Qué es JumperNAT?</h2>
            <p className="nota" style={{ fontSize: 15, lineHeight: 1.7 }}>
              Imagina que quieres que una web vea otra IP que la tuya y, además, que
              <b> nadie vea lo que hablas</b> por el camino. JumperNAT lo resuelve con un
              <b> autobús con 3 cambios de conductor</b>:
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {[
                ["🚏", "Te subes (SOCKS5)", "te conectas al puerto 1080 con tu usuario y contraseña de la web", "--acento-1"],
                ["🔀", "Cambian de conductor 3 veces", "tu tráfico pasa por nodo1 → nodo2 → nodo3 elegidos al azar", "--acento-3"],
                ["🚪", "Y sale anónimo", "la web de destino solo ve la IP del último nodo, y solo aceptamos puertos 80/443", "--acento-2"],
              ].map(([ico, tit, txt, col]) => (
                <div key={tit} className="tarjeta" style={{ padding: 12, borderLeft: `4px solid var(${col})` }}>
                  <b>{ico} {tit}</b>
                  <div className="nota" style={{ fontSize: 13.5 }}>{txt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid2">
            <div className="tarjeta t-led aparecer-1">
              <h2 className="seccion">¿Y nadie ve mi conversación?</h2>
              <p className="nota" style={{ lineHeight: 1.7 }}>
                Entre la entrada y el último nodo va <b>cifrado con ChaCha20-Poly1305</b> (lo mismo
                que usa WireGuard). Un intermedio solo ve texto indescifrable; el último nodo lo
                descifra para llegar a destino… pero nunca guarda lo que pasas. Los nodos son
                «reenvío ciego».
              </p>
              <p className="nota" style={{ lineHeight: 1.7, marginTop: 8 }}>
                Y sobre ti <b>solo se guarda lo mínimo</b>: tu email, tu estado (conectado o no) y
                tu circuito actual. <b>No hay histórico</b> de a qué te conectas.
              </p>
            </div>
            <div className="tarjeta t-led aparecer-2">
              <h2 className="seccion">Guía rápida en 4 pasos</h2>
              <ol className="nota" style={{ paddingLeft: 18, lineHeight: 1.9 }}>
                <li><b>Crea cuenta</b> desde «Acceder» (arriba a la derecha).</li>
                <li><b>Enciende la red</b> en la pestaña <b>Red</b> con el interruptor — llega apagada a propósito: nada se conecta hasta que tú lo pulsas.</li>
                <li><b>Copia el comando</b> SOCKS5 y pégalo en la terminal (o configura el proxy en tu navegador: host jumpernet.duckdns.org, puerto 1080, con usuario+contraseña).</li>
                <li>Cuando quieras <b>otra IP</b>, pulsa <b>Girar circuito</b>: nuevos nodos aleatorios al instante, sin cortar la sesión.</li>
              </ol>
              <div className="ok-msg" style={{ marginTop: 10 }}>
                Si algo falla: ¿has encendido el interruptor? · ¿la contraseña es la de la web? ·
                ¿solo vas a puertos 80/443? Esas son las 3 causas del 95 % de los casos.
              </div>
            </div>
          </div>

          <div className="tarjeta t-led aparecer-3">
            <h2 className="seccion">Preguntas frecuentes</h2>
            <div className="dato"><span className="etq">¿Afecta esto al ping de los videojuegos?</span>
              <span className="val">sí: añades 3 saltos internos (~ms) y el retraso de red real hasta Estados Unidos. Para el tráfico HTTP/S académico está bien; para juegos, mejor no.</span></div>
            <div className="dato"><span className="etq">¿Es «una VPN»?</span>
              <span className="val">se parece, pero es un proyecto educativo: un solo exit real (toda la salida sale del mismo servidor), y cifrado por capas compartido. No es anonimato estilo onion.</span></div>
            <div className="dato"><span className="etq">¿Puedo ver webs como Youtube/Netflix por el circuito?</span>
              <span className="val">es un proxy SOCKS5 normal: cualquier HTTP/S (puerto 80/443) funciona, no bloquea servicios, y no estamos registrando contenido.</span></div>
            <div className="dato"><span className="etq">¿Se pueden cambiar los colores/estilos</span>
              <span className="val">¡sí!: pestaña Ajustes → Diseñador visual (colores, letra, radio, glow, animaciones, CSS…) con preestablecidos como Matrix u Océano Profundo.</span></div>
          </div>
        </>
      ) : (
        <>
          <div className="tarjeta grande t-led aparecer">
            <h2 className="seccion">Ficha técnica del stack</h2>
            <div className="grid2">
              <div>
                <h3 className="mini">Plan de control (API)</h3>
                <div className="dato"><span className="etq">GET /nodos</span><span className="val">tabla de nodos · heartbeat</span></div>
                <div className="dato"><span className="etq">POST /register · /login</span><span className="val">argon2id · rate-limit · lockout 5 fallos</span></div>
                <div className="dato"><span className="etq">GET /me · POST /connect [/disconnect | /rotate]</span><span className="val">JWT HS256 · 2 h · argon2</span></div>
                <div className="dato"><span className="etq">DELETE /me</span><span className="val">borrado inmediato (sin histórico)</span></div>
                <div className="dato"><span className="etq">POST /interno/socks_auth</span><span className="val">solo red interna · X-Interno</span></div>
                <h3 className="mini" style={{ marginTop: 10 }}>Estructura y límites (docker)</h3>
                <div className="dato"><span className="etq">red</span><span className="val">red_jumper (bridge aislado)</span></div>
                <div className="dato"><span className="etq">publicados</span><span className="val">80/443 (caddy) · 1080 (entrada)</span></div>
                <div className="dato"><span className="etq">límite/recursos</span><span className="val">mem: nodos/entrada 96m · api 256m · cpus .25</span></div>
              </div>
              <div>
                <h3 className="mini">Data plane (saltos)</h3>
                <div className="codigo">cliente ──SOCKS5──▶ entrada:1080
                                   │ auth API (argon2, interno)
route: "nodoX,nodoY,dest\n"        │
nodo1 ───▶ nodo2 ───▶ exit ──▶ dest
        reenvío ciego, sin registro

modo JENC (si hay CLAVE_SALTOS):
 [magic 4B]["JENC"]
 [len 4B ][nonce 12B][ct+16B tag] × N
 [len=0 ] terminador</div>
                <div className="dato" style={{ marginTop: 8 }}><span className="etq">motor crypto</span><span className="val">ChaCha20-Poly1305 · SHA-256(CLAVE_SALTOS)</span></div>
                <div className="dato"><span className="etq">bloqueos de salida</span><span className="val">solo 80/443 · anti 10/8,172.16/12,192.168/16,169.254/16 (metadata Oracle)</span></div>
                <div className="dato"><span className="etq">anti-DNS-bypass</span><span className="val">el exit resuelve y revalida la IP</span></div>
              </div>
            </div>
          </div>

          <div className="grid2">
            <div className="tarjeta t-led aparecer-1">
              <h2 className="seccion">nodos (crudo de la API)</h2>
              <pre className="codigo">{crudo.nodos ? JSON.stringify(crudo.nodos, null, 2) : "cargando /nodos…"}</pre>
            </div>
            <div className="tarjeta t-led aparecer-2">
              <h2 className="seccion">JWT (decodificado)</h2>
              <pre className="codigo">{getToken() && decodificaJwt(getToken()) ? JSON.stringify(decodificaJwt(getToken()), null, 2) : "sin sesión (entrar para ver el token)"}</pre>
            </div>
          </div>

          <div className="tarjeta t-led aparecer-3">
            <h2 className="seccion">Inventario de seguridad</h2>
            <div className="dato"><span className="etq">contraseñas</span><span className="val">argon2id (16 MiB, time 2, par 2) · nunca en claro</span></div>
            <div className="dato"><span className="etq">sesión</span><span className="val">JWT firmado, caduca a las 2 h, sin rol admin</span></div>
            <div className="dato"><span className="etq">anti-fuerza bruta</span><span className="val">rate-limit (5/min login, 3/5min registro) + lockout temporal a los 5 fallos</span></div>
            <div className="dato"><span className="etq">firewall</span><span className="val">solo 2 servicios publicados; API en 127.0.0.1 + hostname interno</span></div>
            <div className="dato"><span className="etq">CORS</span><span className="val">solo https://y0selin.github.io (cualquier otro origen es bloqueado)</span></div>
            <div className="dato"><span className="etq">TLS</span><span className="val">Let's Encrypt automático (Caddy), renovación en línea</span></div>
            <div className="dato"><span className="etq">proxy abierto</span><span className="val">IMPOSIBLE: solo userpass RFC 1929 + usuario conectado en la API</span></div>
          </div>
        </>
      )}
    </div>
  );
}
