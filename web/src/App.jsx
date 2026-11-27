import { useEffect, useState } from "react";
import Sitio from "./components/Sitio.jsx";
import Panel from "./components/Panel.jsx";
import Inicio from "./pages/Inicio.jsx";
import Proyecto from "./pages/Proyecto.jsx";
import EquipoPagina from "./pages/EquipoPagina.jsx";
import Usos from "./pages/Usos.jsx";
import Recursos from "./pages/Recursos.jsx";
import Funciona from "./pages/Funciona.jsx";
import TarifasPagina from "./pages/TarifasPagina.jsx";
import Dudas from "./pages/Dudas.jsx";
import DescargasPagina from "./pages/DescargasPagina.jsx";
import VideoPagina from "./pages/VideoPagina.jsx";
import Laboratorio from "./pages/Laboratorio.jsx";
import Checkout from "./pages/Checkout.jsx";
import Acceso from "./pages/Acceso.jsx";
import { useRuta, baseRuta, ir } from "./lib/router.js";
import { me, setToken, getToken, getUsuarioGuardado, guardaUsuario } from "./lib/api.js";
import { aplicaTema, cargaTema } from "./lib/temas.js";
import { aplicaModo, cargaModo } from "./lib/modo.js";

/* La web pública y el panel comparten App. El área privada vive en
   components/Panel.jsx, que decide la navegación según el plan real. */

export default function App() {
  const ruta = useRuta();
  const activa = baseRuta(ruta);
  const esPanel = activa === "/panel";

  const [yo, setYo] = useState(() => (getToken() ? getUsuarioGuardado() : null));
  const [cargandoCuenta, setCargandoCuenta] = useState(() => !!getToken());
  const [toasts, setToasts] = useState([]);

  function cargaCuenta() {
    if (!getToken()) { setYo(null); setCargandoCuenta(false); return Promise.resolve(null); }
    setCargandoCuenta(true);
    return me()
      .then((d) => { setYo(d); guardaUsuario(d); return d; })
      .catch(() => {
        const guardado = getUsuarioGuardado();
        if (guardado) setYo(guardado);
        return null;
      })
      .finally(() => setCargandoCuenta(false));
  }

  /* primero el modo base y después el diseño elegido: cada preset trae su
     propia variante clara y oscura, y debe ganar sobre la paleta genérica */
  useEffect(() => { aplicaModo(cargaModo()); aplicaTema(cargaTema()); }, []);
  useEffect(() => {
    if (!getToken()) { setCargandoCuenta(false); return; }
    cargaCuenta();
  }, []);

  useEffect(() => {
    if (!esPanel || getToken()) return;
    /* Guarda a dónde ibas (p. ej. #/panel/admin) para volver ahí después de
       entrar: sin esto, el login siempre dejaba al usuario en el inicio del
       panel y la sala de mando parecía inalcanzable. */
    try {
      if (!sessionStorage.getItem("jumpernet-volver")) {
        sessionStorage.setItem("jumpernet-volver", ruta);
      }
    } catch { /* sin sesión de pestaña */ }
    ir("/acceso/login");
  }, [esPanel, ruta]);

  function aviso(texto, tipo = "ok") {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, texto, tipo }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3600);
  }

  function salir() {
    setToken(null); setYo(null); setCargandoCuenta(false); ir("/");
  }

  function alEntrar() {
    setCargandoCuenta(true);
    me().then((d) => {
      const nombre = d?.alias || (d?.email || "").split("@")[0] || "tú";
      setYo(d); guardaUsuario(d);
      let destino = "/panel";
      try {
        const vuelta = sessionStorage.getItem("jumpernet-volver");
        if (vuelta) { destino = vuelta; sessionStorage.removeItem("jumpernet-volver"); }
      } catch { /* sin sesión de pestaña */ }
      ir(destino);
      aviso(`¡Hola, ${nombre}! 👋 · cuenta #${d.id}`);
    })
      .catch(() => aviso("la cuenta está creada, pero no se pudo cargar el panel — reintenta", "error"))
      .finally(() => setCargandoCuenta(false));
  }

  const enSesion = !!yo && !!getToken();

  if (!esPanel) {
    let pagina = <Inicio />;
    if (activa === "/usos") pagina = <Usos />;
    else if (activa === "/recursos") pagina = <Recursos />;
    else if (activa === "/proyecto") pagina = <Proyecto />;
    else if (activa === "/equipo") pagina = <EquipoPagina />;
    else if (activa === "/funciona") pagina = <Funciona />;
    else if (activa === "/tarifas") pagina = <TarifasPagina />;
    else if (activa === "/dudas") pagina = <Dudas />;
    else if (activa === "/descargas") pagina = <DescargasPagina />;
    else if (activa === "/video") pagina = <VideoPagina />;
    else if (activa === "/lab") pagina = <Laboratorio />;
    else if (activa === "/checkout") pagina = <Checkout aviso={aviso} />;
    else if (activa === "/acceso") {
      pagina = <Acceso modo={ruta.includes("registro") ? "registro" : "login"} alEntrar={alEntrar} aviso={aviso} />;
    }

    return (
      <Sitio ruta={ruta} enSesion={enSesion}>
        {pagina}
        <div className="sp-toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-viva ${t.tipo === "error" ? "error" : "ok"}`}>
              <span aria-hidden>{t.tipo === "error" ? "⚠" : "✓"}</span>{t.texto}
            </div>
          ))}
        </div>
      </Sitio>
    );
  }

  if (!getToken()) return null;
  if (!yo) {
    if (cargandoCuenta) {
      return (
        <Sitio ruta="/panel" enSesion={false}>
          <div className="sp-cargando">Cargando tu panel…</div>
        </Sitio>
      );
    }
    return (
      <Sitio ruta="/panel" enSesion={false}>
        <div className="sp-cargando sp-cargando-error">
          <b>No se pudo cargar tu cuenta</b>
          <p>Tu sesión sigue guardada. La API puede haber tardado o no estar disponible ahora mismo.</p>
          <div className="fila-btn">
            <button className="btn primario" onClick={cargaCuenta}>Reintentar</button>
            <button className="btn" onClick={salir}>Salir</button>
          </div>
        </div>
      </Sitio>
    );
  }

  return (
    <Panel
      yo={yo}
      aviso={aviso}
      salir={salir}
      toasts={toasts}
      cargandoCuenta={cargandoCuenta}
      cargaCuenta={cargaCuenta}
      alRecargar={(d) => { setYo(d); guardaUsuario(d); }}
    />
  );
}
