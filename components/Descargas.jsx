/*
 * Descargas — sección GLOBAL: se ve en la landing (sin sesión), en su propia
 * pestaña del menú y desde el panel. Siempre disponible, tres entregas claras:
 * extensión (cualquier navegador), navegador Windows y navegador Linux.
 */
const DOCS_URL = "https://jumpernet.duckdns.org/docs/";
const URL_EXT = `${import.meta.env.BASE_URL}extension.zip`;
const URL_WIN = "https://jumpernet.duckdns.org/bajares/jumpernet-navegador-windows.zip";
const URL_LINUX = "https://jumpernet.duckdns.org/bajares/JumperNET-1.0.0.AppImage";
const URL_LEEME = "https://jumpernet.duckdns.org/bajares/LEEME-navegador.txt";

export default function Descargas({ compacto = false }) {
  return (
    <>
      <div className="descargas-malla">
        <TarjetaDescarga
          ico="🧩" tono="a"
          titulo="Extensión"
          version="Chrome · Edge · Brave · Firefox"
          correr="Todo tu navegador por el circuito, sin tocar nada: la extensión configura el proxy ella sola y avisa en su popup si otra extensión (FoxyProxy) lo pisa."
          boton="⬇ Descargar extensión" url={URL_EXT} desc="jumpernet-extension.zip"
        />

        <TarjetaDescarga
          ico="🪟" tono="b"
          titulo="Navegador para Windows"
          version="Windows 10 / 11 · 64 bits · portátil"
          correr="Un Chromium entero que ya viene conectado: lo abres, entras con tu cuenta y TODO su tráfico navega por los 3 saltos. Nuevo circuito y reinicio con un clic, estilo Tor."
          boton="⬇ Windows (portátil)" url={URL_WIN} desc="jumpernet-navegador-windows.zip"
        />

        <TarjetaDescarga
          ico="🐧" tono="c"
          titulo="Navegador para Linux"
          version="AppImage · x64"
          correr="Exactamente el mismo navegador en un solo fichero AppImage: chmod +x, ejecutar y a navegar dentro del circuito."
          boton="⬇ Linux (AppImage)" url={URL_LINUX} desc="JumperNET-1.0.0.AppImage"
        />
      </div>

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
            📚 Documentación completa
          </a>
        </div>
      </div>

      {!compacto && (
        <p className="nota" style={{ textAlign: "center", marginTop: 16 }}>
          ¿Problemas con el zip? <a href={URL_LEEME} target="_blank" rel="noreferrer">Instrucciones en texto</a> ·
          {" "}todo se descarga directo de tu servidor, sin third-party
        </p>
      )}
    </>
  );
}

function TarjetaDescarga({ ico, tono, titulo, version, correr, boton, url, desc }) {
  return (
    <div className={`tarjeta-descarga tono-${tono}`}>
      <div className="cabeza-descarga">
        <span className="ico-descarga">{ico}</span>
        <div>
          <div className="titulo-descarga">{titulo}</div>
          <div className="meta-descarga mono">{version}</div>
        </div>
      </div>
      <p className="nota">{correr}</p>
      <a className="btn-descarga" href={url} download>
        {boton}
        <span className="mono" style={{ fontSize: 10.5, opacity: .75 }}>{desc}</span>
      </a>
    </div>
  );
}
