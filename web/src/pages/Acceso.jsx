import Autenticacion from "../components/Autenticacion.jsx";
import { ir } from "../lib/router.js";

/* Acceso: página propia para entrar o crear cuenta. El modo viene de la URL
   (#/acceso/login o #/acceso/registro) para que cada botón lleve a su sitio. */

export default function Acceso({ modo = "login", alEntrar, aviso }) {
  const registro = modo === "registro";

  return (
    <section className="sp-acceso">
      <div className="sp-acceso-lado">
        <span className="migas">{registro ? "crear cuenta" : "entrar"}</span>
        <h1 className="sp-h1">
          {registro ? <>Crea tu cuenta.<br /><span className="texto-gradiente">Enciende tu red.</span></> : <>Bienvenido <span className="texto-gradiente">de vuelta</span></>}
        </h1>
        <p className="sp-lead">
          {registro
            ? "Solo email y contraseña. Al crear la cuenta entras directo al panel, sin volver a escribir la clave."
            : "Tu sesión dura 2 horas. La red sigue apagada hasta que tú pulses el interruptor."}
        </p>

        <div className="sp-acceso-ventajas">
          {[
            ["⚡", "Listo en 20 segundos", "crear cuenta y entrar; nada más"],
            ["⏻", "Apagada por defecto", "nada se conecta sin tu permiso"],
            ["◎", "Comprobación real", "verás la IP que ve internet"],
            ["⛨", "Sin histórico", "ni webs, ni destinos, ni contenido"],
          ].map(([ic, t, d]) => (
            <div key={t} className="pp-ventaja">
              <span className="pp-ventaja-ico">{ic}</span>
              <div><b>{t}</b><span className="nota mono">{d}</span></div>
            </div>
          ))}
        </div>

        <div className="sp-acceso-enlaces nota mono">
          {registro
            ? <>¿Ya tienes cuenta? <a href="#/acceso/login">Entrar</a></>
            : <>¿Primera vez? <a href="#/acceso/registro">Crear una cuenta</a></>}
          <span> · </span>
          <a href="#/dudas">dudas</a>
        </div>
      </div>

      <div className="sp-acceso-form">
        <Autenticacion
          key={modo}
          modoInicial={registro ? "registro" : "login"}
          alEntrar={alEntrar}
          aviso={aviso}
          autoenfocar={false}
          volver={() => ir("/")}
        />
      </div>
    </section>
  );
}
