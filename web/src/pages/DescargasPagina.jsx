import Descargas from "../components/Descargas.jsx";

/* Descargas: su propia página. El componente ya trae las tres entregas y la
   guía de instalación; aquí solo se le pone cabecera y contexto. */

export default function DescargasPagina() {
  return (
    <>
      <header className="sp-cabeza">
        <span className="migas">público · sin entrar</span>
        <h1 className="sp-h1">Descarga y <span className="texto-gradiente">navega por el circuito</span></h1>
        <p className="sp-lead">
          Tres maneras de usar tu red: la extensión para el navegador que ya tienes, o el
          navegador completo para Windows y Linux (ya viene conectado). También puedes probarlo
          sin descargar nada con el comando SOCKS5.
        </p>
        <div className="sp-acciones">
          <a className="btn" href="#/funciona">Ver el comando SOCKS5</a>
          <a className="btn" href="#/acceso/registro">Crear cuenta</a>
        </div>
      </header>

      <section className="pp-seccion">
        <Descargas />
      </section>

      <div className="sp-aviso tarjeta">
        <span className="sp-aviso-ico">ⓘ</span>
        <div>
          <b>La red tiene que estar encendida</b>
          <p className="nota">
            El navegador la enciende solo al entrar con tu cuenta; la extensión únicamente dirige el
            tráfico. Si el panel dice «RED OFF», nada sale por el circuito todavía.
          </p>
        </div>
      </div>
    </>
  );
}
