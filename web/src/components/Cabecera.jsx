import { useState } from "react";
import { useModo } from "../lib/modo";
import Logo from "../components/Logo";
import { ir } from "../lib/router";

function Cabecera() {
  const [abierto, setAbierto] = useState(false);
  const { modo } = useModo();

  const enlaces = [
    { texto: "Inicio", ruta: "/" },
    { texto: "Recursos", ruta: "/recursos" },
    { texto: "Usos", ruta: "/usos" },
    { texto: "Equipo", ruta: "/equipo" },
    { texto: "Proyecto", ruta: "/proyecto" },
    { texto: "Cómo funciona", ruta: "/cómo-funciona" },
    { texto: "Dudas", ruta: "/dudas" },
    { texto: "Tarifas", ruta: "/tarifas" },
  ];

  return (
    <header className="pp-nav pegada">
      <div className="pp-contenedor">
        {/* Logo a la izquierda */}
        <a className="pp-marca" href="#inicio" aria-label="JumperNET, ir a la portada">
          <Logo tam={42} />
          <span className="pp-marca-txt">
            Jumper<span>NET</span><i className="cursor">_</i></span>
        </a>

        {/* Nav horizontal centrada */}
        <nav className="pp-nav-main">
          <ul>
            {enlaces.map((e) => (
              <li key={e.ruta}>
                <a
                  href={`#${e.ruta === "/" ? "inicio" : e.ruta}`}
                  className="pp-nav-link"
                  onClick={() => {
                    setAbierto(false);
                    ir(e.ruta);
                  }}
                  style={{
                    color: modo === "oscuro" ? "#A8B8CC" : "#14283E",
                    transition: "color .2s",
                    padding: "8px 14px",
                    borderRadius: 6,
                    margin: "0 4px",
                    fontWeight: 500,
                  }}
                  onMouseOver={(e) => {
                    e.target.style.color = modo === "oscuro" ? "#FF6347" : "#FF6347";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.color = modo === "oscuro" ? "#A8B8CC" : "#14283E";
                  }}
                >
                  {e.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Botones de acción a la derecha */}
        <div className="pp-nav-acciones">
          <button
            onClick={() => window.dispatchEvent(new Event("toggle-modo"))}
            className="pp-btn-modo"
            style={{
              background: "none",
              border: "1px solid currentColor",
              color: modo === "oscuro" ? "#FF6347" : "#167D68",
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              marginLeft: 8,
              transition: "all .2s",
            }}
          >
            {modo === "oscuro" ? "claro" : "oscuro"}
          </button>
          <button
            onClick={() => ir("/acceso/login")}
            className="pp-btn-acceso"
            style={{
              background: "none",
              border: "1px solid currentColor",
              color: modo === "oscuro" ? "#FF6347" : "#167D68",
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              marginLeft: 8,
              transition: "all .2s",
            }}
          >
            Entrar
          </button>
        </div>
      </div>
    </header>
  );
}

export default Cabecera;