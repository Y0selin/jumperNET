/*
 * Descargas — sección GLOBAL: se ve en la landing (sin sesión), en su propia
 * pestaña del menú y desde el panel. Tres entregas claras (extensión,
 * navegador Windows y navegador Linux) + la segunda vía de descarga desde
 * GitHub Releases, con explicación de qué lleva cada archivo.
 */
const DOCS_URL = "https://jumpernet.duckdns.org/docs/";
const URL_EXT = `${import.meta.env.BASE_URL}extension.zip`;
const URL_WIN = "https://jumpernet.duckdns.org/bajares/jumpernet-navegador-windows.zip";
const URL_LINUX = "https://jumpernet.duckdns.org/bajares/JumperNET-1.0.0.AppImage";
const URL_LEEME = "https://jumpernet.duckdns.org/bajares/LEEME-navegador.txt";
const URL_RELEASES = "https://github.com/y0selin/jumperNET/releases";

/* guía de elección rápida */
const CAMINOS = [
  { si: "uso un Chrome / Edge / Brave / Firefox normal", entonces: "extensión", clase: "1" },
  { si: "quiero un navegador aparte, todo preparado", entonces: "JumperNET Browser (Windows o Linux)", clase: "2" },
  { si: "solo quiero probar el circuito en la terminal", entonces: "ni una descarga: el comando SOCKS5 del panel vale", clase: "3" },
];

export default function Descargas({ compacto = false }) {
  return (
    <>
      {!compacto && (
        <div className="tarjeta" style={{ marginBottom: 14 }}>
          <h3 className="sub-titulo">Elige tu camino en 10 segundos</h3>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {CAMINOS.map((c) => (
              <div key={c.clase} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span className="chip mono">si…</span>
                <span className="nota" style={{ fontSize: 13.5, flex: "1 1 260px" }}>{c.si}</span>
                <span style={{ color: "var(--acento-2)", fontSize: 13 }}>→</span>
                <b style={{ fontSize: 13 }}>{c.entonces}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="descargas-malla">
        <TarjetaDescarga
          ico="🧩" tono="a"
          titulo="Extensión"
          version="Chrome · Edge · Brave · Firefox"
          correr="Todo tu navegador por el circuito, sin tocar nada: la extensión configura el proxy ella sola y avisa en su popup si otra extensión (FoxyProxy) lo pisa."
          boton="⬇ Descargar extensión" url={URL_EXT} desc="jumpernet-extension.zip"
          extra={[
            { d: "qué lleva", v: "carpetas chrome/ y firefox/ + LEEME.txt" },
            { d: "instalación", v: "1 minuto · modo desarrollador" },
          ]}
        />

        <TarjetaDescarga
          ico="🪟" tono="b" destacado
          titulo="Navegador para Windows"
          version="Windows 10 / 11 · 64 bits · portátil"
          correr="Un Chromium entero que ya viene conectado: lo abres, metes tus credenciales y la primera pestaña ya es DuckDuckGo por el circuito. Todo el tráfico por los 3 saltos; nuevo circuito y reinicio con un clic, estilo Tor."
          boton="⬇ Windows (portátil)" url={URL_WIN} desc="jumpernet-navegador-windows.zip · ~128 MB"
          extra={[
            { d: "qué lleva", v: "JumperNET Browser.exe completo (no necesita instalación)" },
            { d: "instalación", v: "descomprimir y ejecutar · SmartScreen: «ejecutar de todas formas»" },
          ]}
        />

        <TarjetaDescarga
          ico="🐧" tono="c"
          titulo="Navegador para Linux"
          version="AppImage · x64"
          correr="Exactamente el mismo navegador en un solo fichero AppImage: chmod +x, ejecutar y a navegar dentro del circuito — con la misma pantalla de conexión y DuckDuckGo como home."
          boton="⬇ Linux (AppImage)" url={URL_LINUX} desc="JumperNET-1.0.0.AppImage · ~100 MB"
          extra={[
            { d: "qué lleva", v: "navegador autocontenido en un solo fichero" },
            { d: "instalación", v: "chmod +x y ejecutar · libfuse2 si tu distro no la trae" },
          ]}
        />
      </div>

      {!compacto && (
        <ReleasesCard leeme={URL_LEEME} />
      )}

      <div className="descargas-notas">
        <div className="tarjeta">
          <h3 className="sub-titulo">¿Cómo se instala cada cosa?</h3>
          <ol className="pasos-instalacion">
            <li>
              <b>Extensión:</b> descomprime el zip → <span className="mono">chrome://extensions</span> →
              modo desarrollador → «Cargar sin comprimir» → carpeta <span className="mono">chrome/</span>.
              En Firefox: <span className="mono">about:debugging</span> → complemento temporal → carpeta <span className="mono">firefox/</span>.
            </li>
            <li>
              <b>Windows:</b> descomprime y ejecuta <span className="mono">JumperNET Browser.exe</span>.
              La primera vez, Windows preguntará (aplicación sin firmar): «Más información → Ejecutar de todas formas».
            </li>
            <li>
              <b>Linux:</b> <span className="mono">chmod +x JumperNET-1.0.0.AppImage && ./JumperNET-1.0.0.AppImage</span>
              (si tu distro no trae FUSE: <span className="mono">sudo apt install libfuse2</span>).
            </li>
          </ol>
          <p className="nota" style={{ marginTop: 10 }}>
            La red debe estar ENCENDIDA (aquí, en el panel de red). El navegador la enciende solo al
            entrar con tu cuenta; la extensión solo dirige el tráfico.
          </p>
        </div>

        <div className="tarjeta tarjeta-doc">
          <h3 className="sub-titulo">¿Cómo funciona por dentro?</h3>
          <p className="nota">
            Arquitectura completa, el cifrado de los saltos (JENC), la seguridad, los problemas que hubo
            y cómo se resolvieron: todo contado con detalle en la documentación.
          </p>
          <a className="btn primario" href={DOCS_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none", marginTop: 12 }}>
            ▤ Documentación completa
          </a>
        </div>
      </div>

      {!compacto && (
        <p className="nota" style={{ textAlign: "center", marginTop: 16 }}>
          ¿Problemas con el zip? <a href={URL_LEEME} target="_blank" rel="noreferrer">Instrucciones en texto</a> ·
          {" "}todo se descarga directo de tu servidor, sin terceros
        </p>
      )}
    </>
  );
}

/* segunda vía de descarga: GitHub Releases, con el papel de cada archivo */
function ReleasesCard({ leeme }) {
  return (
    <div className="tarjeta" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 className="sub-titulo" style={{ marginBottom: 0 }}>Segunda vía: GitHub Releases</h3>
        <span className="chip mono">espejo oficial</span>
        <a className="btn primario" style={{ marginLeft: "auto", textDecoration: "none" }} href={URL_RELEASES} target="_blank" rel="noreferrer">
          ⬇ Abrir releases en GitHub
        </a>
      </div>
      <p className="nota" style={{ fontSize: 12.5, margin: "10px 0 12px" }}>
        Cada versión del navegador se publica también en GitHub, con sus <b>release notes</b> y el hash de
        cada archivo — útil si tu servidor te va lento o quieres auditar lo que descargas. Qué contiene cada asset:
      </p>
      <div className="envuelve-tabla">
        <table className="tabla" style={{ fontSize: 13 }}>
          <thead>
            <tr><th>archivo del release</th><th>qué es y para qué sirve</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono" style={{ whiteSpace: "nowrap" }}>jumpernet-navegador-windows.zip</td>
              <td className="nota">El navegador completo para Windows 10/11 (portátil). Descomprimir y ejecutar <span className="mono">JumperNET Browser.exe</span>.</td>
            </tr>
            <tr>
              <td className="mono" style={{ whiteSpace: "nowrap" }}>JumperNET-1.0.0.AppImage</td>
              <td className="nota">El mismo navegador para Linux en un solo fichero (x64), ejecutable al vuelo.</td>
            </tr>
            <tr>
              <td className="mono" style={{ whiteSpace: "nowrap" }}>LEEME-navegador.txt</td>
              <td className="nota">Instalación y uso en texto: credenciales, buscador, rotación de circuito y privacidad.</td>
            </tr>
            <tr>
              <td className="mono" style={{ whiteSpace: "nowrap" }}>source code (zip/tar.gz)</td>
              <td className="nota">Código en el que se basa la versión: servidores (Python), panel (React) y navegador (Electron).</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="nota" style={{ marginTop: 10, fontSize: 11.5 }}>
        ¿Y la documentación en texto paso a paso? También está en <a href={leeme} target="_blank" rel="noreferrer">el LEEME</a> y
        en la <a href={DOCS_URL} target="_blank" rel="noreferrer">documentación completa</a>.
      </p>
    </div>
  );
}

function TarjetaDescarga({ ico, tono, titulo, version, correr, boton, url, desc, extra = [], destacado = false }) {
  return (
    <div className={`tarjeta-descarga tono-${tono}`} style={destacado ? { borderColor: "rgb(from var(--acento-1) r g b / .55)", boxShadow: "0 0 30px rgb(from var(--acento-1) r g b / .1)" } : undefined}>
      <div className="cabeza-descarga">
        <span className="ico-descarga">{ico}</span>
        <div>
          <div className="titulo-descarga">{titulo}</div>
          <div className="meta-descarga mono">{version}</div>
        </div>
        {destacado && <span className="chip vivo mono" style={{ marginLeft: "auto", fontSize: 10 }}>recomendado</span>}
      </div>
      <p className="nota">{correr}</p>
      {extra.length > 0 && (
        <div style={{ display: "grid", gap: 5, marginBottom: 10 }}>
          {extra.map((x) => (
            <div key={x.d} style={{ display: "flex", gap: 8, fontSize: 11.5 }} className="mono">
              <span className="nota" style={{ minWidth: 90 }}>{x.d}</span>
              <span style={{ flex: 1 }}>{x.v}</span>
            </div>
          ))}
        </div>
      )}
      <a className="btn-descarga" href={url} download>
        {boton}
        <span className="mono" style={{ fontSize: 10.5, opacity: .75 }}>{desc}</span>
      </a>
    </div>
  );
}
