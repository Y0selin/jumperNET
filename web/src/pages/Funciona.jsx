import Revela from "../components/Revela.jsx";
import TerminalVivo from "../components/TerminalVivo.jsx";
import Descargas from "../components/Descargas.jsx";
import { Escalon } from "../components/Piezas.jsx";

/* Cómo funciona: el recorrido completo, de crear la cuenta a navegar.
   Incluye el comando real y la terminal que simula el flujo. */

export default function Funciona() {
  return (
    <>
      <header className="sp-cabeza">
        <span className="migas">paso a paso</span>
        <h1 className="sp-h1">Cómo <span className="texto-gradiente">funciona</span></h1>
        <p className="sp-lead">
          Cuatro pasos y estás dentro. Sin configuración de red, sin instalar nada para probarlo:
          una cuenta, un interruptor y el comando SOCKS5 que el panel te copia.
        </p>
        <div className="sp-acciones">
          <a className="btn primario" href="#/acceso/registro">▸ Empezar gratis</a>
          <a className="btn" href="#/descargas">Descargar la extensión</a>
        </div>
      </header>

      <section className="pp-seccion">
        <div className="pp-dos">
          <Revela className="tarjeta pp-pasos">
            <Escalon n="1" titulo="Creas tu cuenta">solo email y contraseña; nada de datos personales.</Escalon>
            <Escalon n="2" titulo="Pulsas el interruptor">el circuito nace cuando tú lo pides, no antes.</Escalon>
            <Escalon n="3" titulo="Copias el comando SOCKS5">el puerto 1080 acepta tus mismas credenciales.</Escalon>
            <Escalon n="4" titulo="Compruebas y navegas">ves los saltos, su latencia y la IP con la que sales.</Escalon>
            <div className="pp-codigo copiabloque">
              <header>
                <span className="rotulo"><span className="punto" style={{ background: "var(--acento-1)" }} />terminal</span>
                <span className="mono">tu@correo</span>
              </header>
              <pre>{`curl --socks5-hostname jumpernet.duckdns.org:1080 \\\n     --proxy-user 'tu@correo:TU_CLAVE' \\\n     https://api.ipify.org`}</pre>
            </div>
          </Revela>

          <Revela retardo={1} className="pp-terminal">
            <TerminalVivo />
            <div className="pp-terminal-pie nota">
              La terminal es una <b>simulación</b> del flujo. Los datos reales los enseña el panel
              cuando enciendes la red: estado, latencia y la IP observada por el destino.
            </div>
          </Revela>
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">qué pasa por dentro</span>
          <h2 className="pp-h2">Del interruptor al <span className="texto-gradiente">primer paquete</span></h2>
        </Revela>
        <div className="sp-tres">
          {[
            ["⏻", "Enciendes", "La API elige tres nodos vivos al azar y abre el circuito. La red no se conecta antes de este paso."],
            ["⌁", "Se autentica", "Tu equipo habla con la entrada SOCKS5 en el 1080 con tu email y contraseña; el servidor verifica con argon2id."],
            ["◎", "Se comprueba", "El panel pide a un servicio externo que diga qué IP ve. Si es la del exit, el circuito está funcionando."],
          ].map(([i, t, d], k) => (
            <Revela key={t} retardo={k + 1} className="sp-tres-item tarjeta">
              <span className="sp-tres-ico">{i}</span>
              <h3>{t}</h3>
              <p className="nota">{d}</p>
            </Revela>
          ))}
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">sin instalar nada</span>
          <h2 className="pp-h2">Lleva el circuito a <span className="texto-gradiente">tu navegador</span></h2>
          <p className="pp-sub2 nota">
            Para probarlo, el comando de arriba basta. Si quieres todo el navegador por el circuito,
            usa la extensión o el navegador completo: ya vienen conectados.
          </p>
        </Revela>
        <Revela><Descargas compacto /></Revela>
        <div className="sp-fila-enlace">
          <a className="btn" href="#/descargas">Ver todas las descargas <span>→</span></a>
        </div>
      </section>

      <Revela className="sp-banda">
        <div>
          <span className="migas">manos a la obra</span>
          <h2 className="pp-h2">Tu primer salto, <span className="texto-gradiente">en 20 segundos</span></h2>
          <p className="nota">Crear la cuenta entra directo al panel. La red empieza apagada, como debe.</p>
        </div>
        <div className="sp-banda-acciones">
          <a className="btn primario grande" href="#/acceso/registro">▶ Crear mi cuenta</a>
          <a className="btn grande" href="#/tarifas">Ver tarifas</a>
        </div>
      </Revela>
    </>
  );
}
