import "./styles/globals.css";
import { useState, useEffect } from "react";
import { ir, useRuta, baseRuta } from "./lib/router";
import { useModo, MODOS } from "./lib/modo";
import { useTemas } from "./lib/temas";
import { ENLACES } from "./lib/contenido";
import Logo from "./components/Logo";
import Cabecera from "./components/Cabecera";
import Inicio from "./pages/Inicio";
import Recursos from "./pages/Recursos";
import Usos from "./pages/Usos";
import Equipo from "./pages/EquipoPagina";
import Proyecto from "./pages/Proyecto";
import Funciona from "./pages/Funciona";
import Dudas from "./pages/Dudas";
import Tarifas from "./pages/TarifasPagina";
import Acceso from "./pages/Acceso";
import Descargas from "./pages/DescargasPagina";
import { jsx as _jsx } from "react";

function App() {
  const [modo, setModo] = useModo();
  const { modo: tmodo, clear, dark, toggle } = modo;
  const { tema } = useTemas();
  const ruta = useRuta();

  useEffect(() => {
    // Aplicar clase html para modo claro/oscuro
    if (tmodo === "oscuro") {
      document.documentElement.classList.add("modo-oscuro");
      document.documentElement.classList.remove("modo-claro");
    } else {
      document.documentElement.classList.add("modo-claro");
      document.documentElement.classList.remove("modo-oscuro");
    }
  }, [tmodo]);

  const activa = baseRuta(ruta);

  // Evitar parpadeo al cargar
  useEffect(() => {
    document.documentElement.classList.add("tema-cargando");
    setTimeout(() => {
      document.documentElement.classList.remove("tema-cargando");
    }, 500);
  }, []);

  // Navegación por hash
  useEffect(() => {
    const handleHash = () => {
      const h = location.hash.replace(/^#/, "");
      if (!h) ir("/");
    };
    window.addEventListener("hashchange", handleHash);
    handleHash();
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <div className="app">
      <Cabecera modo={tmodo} toggle={toggle} />
      <main className="contenido">
        <section className="pagina" id="inicio">
          <Inicio />
        </section>

        <section className="pagina" id="recursos">
          <Recursos />
        </section>

        <section className="pagina" id="usos">
          <Usos />
        </section>

        <section className="pagina" id="equipo">
          <Equipo />
        </section>

        <section className="pagina" id="proyecto">
          <Proyecto />
        </section>

        <section className="pagina" id="cómo-funciona">
          <Funciona />
        </section>

        <section className="pagina" id="dudas">
          <Dudas />
        </section>

        <section className="pagina" id="tarifas">
          <Tarifas />
        </section>

        <section className="pagina" id="acceso">
          <Acceso />
        </section>

        <section className="pagina" id="descargas">
          <Descargas />
        </section>
      </main>
      <footer className="footer">
        <div className="footer-enlaces">
          {ENLACES.map((e) => (
            <a
              key={e.corto}
              href={`#${e.ruta}`}
              className="footer-link"
              style={{
                color: tmodo === "oscuro" ? "#A8B8CC" : "#14283E",
                transition: "color .2s",
              }}
            >
              {e.corto}
            </a>
          ))}
        </div>
        <div className="footer-footer">
          <span>JumperNET · v{VERSION}</span>
          <button
            onClick={toggle}
            className="footer-modo"
            style={{
              background: "none",
              border: "none",
              color: tmodo === "oscuro" ? "#FF6347" : "#167D68",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "4px 8px",
              borderRadius: 4,
            }}
          >
            {tmodo === "oscuro" ? "claro" : "oscuro"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;