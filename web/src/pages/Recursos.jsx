import Revela from "../components/Revela.jsx";

const APRENDE = [
  ["Dirección IP", "El número que identifica tu conexión ante internet. Sin proxy, el destino la ve y sabe de dónde vienes."],
  ["SOCKS5", "Un protocolo que reenvía tráfico TCP/UDP sin leerlo. JumperNET expone un SOCKS5 en el puerto 1080 con tu cuenta."],
  ["Proxy vs VPN", "Un proxy reenvía tráfico de una aplicación; una VPN crea un túnel para todo el dispositivo. JumperNET es proxy, no VPN."],
  ["Cifrado", "Cada salto cifra el sobre con ChaCha20-Poly1305. Un nodo solo puede abrir su capa, no las demás."],
  ["Latencia", "Tiempo que tarda un paquete en ir y volver. Tres saltos añaden latencia; la puedes medir en el panel."],
  ["Privacidad", "No es anonimato absoluto: significa que ningún nodo del circuito conoce a la vez origen y destino."],
];

const NODOS = [
  { n: "01", nombre: "Entrada", rol: "recibe tu conexión y la cifra", sabe: "de dónde vienes", noSabe: "qué pides" },
  { n: "02", nombre: "Intermedio", rol: "reenvía sin abrir el sobre", sabe: "a quién entregarlo", noSabe: "origen ni destino" },
  { n: "03", nombre: "Salida", rol: "abre la última capa y sale a internet", sabe: "qué pides", noSabe: "de dónde vienes" },
];

export default function Recursos() {
  return (
    <>
      <header className="sp-cabeza">
        <span className="migas">recursos</span>
        <h1 className="sp-h1">Arquitectura, aprendizaje y <span className="texto-gradiente">seguridad</span></h1>
        <p className="sp-lead">
          Todo lo que necesitas para entender cómo está montado JumperNET, qué protege y dónde están sus límites.
          Sin promesas de anonimato absoluto: solo lo que el código hace de verdad.
        </p>
      </header>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">arquitectura</span>
          <h2 className="pp-h2">El flujo <span className="texto-gradiente">de un paquete</span></h2>
        </Revela>
        <div className="sp-tres">
          {["Cliente", "Proxy SOCKS5", "Nodos", "Salida", "Internet"].map((p, i) => (
            <Revela key={p} retardo={i + 1} className="tarjeta">
              <div className="sp-plan-cab">
                <b>{p}</b>
                <span className="mono sp-plan-precio">{i === 0 ? "tú" : i === 4 ? "destino" : "paso " + i}</span>
              </div>
              <p className="nota">
                {i === 0 && "Tu navegador o terminal envía tráfico por SOCKS5 con tu email y contraseña."}
                {i === 1 && "Autentica con argon2id, abre el circuito y reenvía el tráfico cifrado."}
                {i === 2 && "Tres relés en cadena. Cada uno solo abre su capa de cifrado."}
                {i === 3 && "El nodo de salida hace la petición real a internet con su propia IP."}
                {i === 4 && "El destino solo ve la IP del nodo de salida, nunca la tuya."}
              </p>
            </Revela>
          ))}
        </div>

        <Revela className="tarjeta" style={{ marginTop: 18 }}>
          <h3 className="sub-titulo" style={{ marginTop: 0 }}>Diagrama del circuito</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "center", padding: "14px 0" }}>
            {["Tú", "→", "Entrada", "→", "Intermedio", "→", "Salida", "→", "Internet"].map((x, i) => (
              <span
                key={i}
                style={{
                  padding: x === "→" ? 0 : "8px 14px",
                  border: x === "→" ? "none" : "1px solid var(--borde)",
                  borderRadius: 10,
                  background: x === "→" ? "transparent" : "var(--bg-2)",
                  color: x === "→" ? "var(--texto-suave)" : "var(--texto)",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {x}
              </span>
            ))}
          </div>
          <p className="nota mono" style={{ textAlign: "center", fontSize: 11 }}>
            el circuito se elige al azar entre nodos vivos · cada petición puede usar un circuito distinto
          </p>
        </Revela>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">los tres saltos</span>
          <h2 className="pp-h2">Qué sabe <span className="texto-gradiente">cada nodo</span></h2>
        </Revela>
        <div className="sp-tres">
          {NODOS.map((n, i) => (
            <Revela key={n.nombre} retardo={i + 1} className="tarjeta">
              <div className="sp-plan-cab">
                <b>{n.n} · {n.nombre}</b>
                <span className="mono sp-plan-precio">{n.rol}</span>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 10, fontSize: 13 }}>
                <div><b style={{ color: "var(--acento-2)" }}>Sabe:</b> <span>{n.sabe}</span></div>
                <div><b style={{ color: "var(--acento-1)" }}>No sabe:</b> <span>{n.noSabe}</span></div>
              </div>
            </Revela>
          ))}
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">centro de aprendizaje</span>
          <h2 className="pp-h2">Conceptos <span className="texto-gradiente">clave</span></h2>
        </Revela>
        <div className="sp-tres">
          {APRENDE.map(([t, d], i) => (
            <Revela key={t} retardo={(i % 3) + 1} className="tarjeta">
              <b style={{ fontSize: 14 }}>{t}</b>
              <p className="nota" style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.6 }}>{d}</p>
            </Revela>
          ))}
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">seguridad y privacidad</span>
          <h2 className="pp-h2">Qué protege <span className="texto-gradiente">y qué no</span></h2>
        </Revela>
        <div className="sp-tres">
          <Revela className="tarjeta">
            <b>Protege</b>
            <p className="nota" style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.6 }}>
              Tu IP real frente al destino, el contenido entre saltos (cifrado por capas) y el arranque: la red no se enciende sola.
            </p>
          </Revela>
          <Revela retardo={1} className="tarjeta">
            <b>No protege</b>
            <p className="nota" style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.6 }}>
              No oculta que usas JumperNET frente a tu proveedor, ni protege frente a malware, ni da anonimato total.
            </p>
          </Revela>
          <Revela retardo={2} className="tarjeta">
            <b>Límites reales</b>
            <p className="nota" style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.6 }}>
              Solo puertos 80 y 443. Latencia mayor. Nodos del proyecto, no una red global distribuida.
            </p>
          </Revela>
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">estado de la red</span>
          <h2 className="pp-h2">Señales <span className="texto-gradiente">reales</span></h2>
        </Revela>
        <div className="sp-tres">
          {[
            ["Nodos", "3 saltos por circuito"],
            ["Cifrado", "ChaCha20-Poly1305"],
            ["Salida", "80 y 443"],
            ["Sesión", "JWT de 2 h"],
          ].map(([t, d], i) => (
            <Revela key={t} retardo={i + 1} className="tarjeta">
              <b style={{ fontSize: 14 }}>{t}</b>
              <p className="nota" style={{ marginTop: 6, fontSize: 12.5 }}>{d}</p>
              <p className="nota mono" style={{ marginTop: 8, fontSize: 10 }}>métrica descriptiva del sistema, no en tiempo real</p>
            </Revela>
          ))}
        </div>
      </section>
    </>
  );
}