import { useEffect, useRef, useState } from "react";
import Revela from "../components/Revela.jsx";
import VideoPortada from "../components/VideoPortada.jsx";
import MapaCircuito from "../components/MapaCircuito.jsx";
import CircuitoHero from "../components/CircuitoHero.jsx";
import Logo from "../components/Logo.jsx";
import { FRASES, PIEZAS } from "../lib/contenido.js";
import { EQUIPO, NOMBRES } from "../lib/equipo.js";
import { nodos as nodosApi } from "../lib/api.js";

/* Portada nueva. La primera pantalla es un escenario: titular editorial,
   circuito que se enciende, se gira y se toca, y cifras a la vista. Debajo,
   el resto del contenido sigue repartido en páginas propias. */

const DESTINOS = [
  { r: "/usos", n: "01", t: "Para qué sirve", d: "Cinco situaciones reales —Wi-Fi público, otra IP, redes que filtran— con un circuito que enciendes y giras tú.", ico: "◎" },
  { r: "/proyecto", n: "02", t: "El proyecto", d: "Qué es JumperNET, qué problema resuelve y qué no promete. Con una demo del circuito que puedes tocar.", ico: "◈" },
  { r: "/funciona", n: "03", t: "Cómo funciona", d: "Los cuatro pasos desde crear la cuenta hasta navegar, el comando SOCKS5 y una terminal en vivo.", ico: "⌁" },
  { r: "/tarifas", n: "04", t: "Tarifas", d: "Tres velocidades: 3 saltos gratis, hasta 7 en Pro y un plan a medida para equipos.", ico: "◇" },
  { r: "/descargas", n: "05", t: "Descargas", d: "La extensión para tu navegador, el navegador completo para Windows y Linux, y GitHub Releases.", ico: "⬇" },
  { r: "/dudas", n: "06", t: "Dudas", d: "La IP, la latencia, lo que se guarda de ti y en qué se diferencia (y en qué no) de Tor.", ico: "?" },
];

function Typewriter({ frases, velocidad = 46 }) {
  const [txt, setTxt] = useState("");
  const [i, setI] = useState(0);
  const [borra, setBorra] = useState(false);
  useEffect(() => {
    const objetivo = frases[i % frases.length];
    let t;
    if (!borra && txt === objetivo) t = setTimeout(() => setBorra(true), 2100);
    else if (borra && txt === "") { setBorra(false); setI((v) => (v + 1) % frases.length); }
    else t = setTimeout(() => setTxt(objetivo.slice(0, txt.length + (borra ? -1 : 1))), borra ? 20 : velocidad);
    return () => clearTimeout(t);
  }, [txt, borra, i, frases, velocidad]);
  return (
    <span className="pp-maquina" aria-live="off">
      {txt}
      <span className="cursor">▊</span>
    </span>
  );
}

function Cuenta({ hasta, sufijo = "", duracion = 1100 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const ya = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const arranca = () => {
      if (ya.current) return;
      ya.current = true;
      const t0 = performance.now();
      const paso = (t) => {
        const p = Math.min(1, (t - t0) / duracion);
        setN(Math.round(hasta * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };
    if (typeof IntersectionObserver !== "function") { arranca(); return; }
    const obs = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { arranca(); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasta, duracion]);
  return <span ref={ref} className="mono">{n}{sufijo}</span>;
}

export default function Inicio() {
  const hero = useRef(null);
  const [vivos, setVivos] = useState(null);
  const [sinApi, setSinApi] = useState(false);
  const [abierta, setAbierta] = useState(-1);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let montado = true;
    const pide = () => nodosApi()
      .then((lista) => {
        if (!montado) return;
        const v = (lista || []).filter((n) => n.estado === "vivo");
        setVivos({
          total: v.length,
          infra: v.filter((n) => n.tipo !== "usuario").length,
          equipos: v.filter((n) => n.tipo === "usuario").length,
        });
        setSinApi(false);
      })
      .catch(() => { if (montado) setSinApi(true); });
    pide();
    const t = setInterval(pide, 15000);
    return () => { montado = false; clearInterval(t); };
  }, [recarga]);

  const total = vivos?.total;
  const infra = vivos?.infra;
  const equipos = vivos?.equipos;

  /* el escenario del hero se mueve un poco con el ratón */
  function paralaje(e) {
    const el = hero.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - .5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - .5).toFixed(3));
  }
  function suelta() {
    const el = hero.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }
  const poneMusica = () => window.dispatchEvent(new Event("jumpernet-musica"));

  return (
    <>
      <section className="hn-hero" ref={hero} onPointerMove={paralaje} onPointerLeave={suelta}>
        <div className="hn-terciopelo" aria-hidden>
          <i className="hn-luz hn-luz-a" />
          <i className="hn-luz hn-luz-b" />
          <i className="hn-luz hn-luz-c" />
          <span className="hn-aro hn-aro-a" />
          <span className="hn-aro hn-aro-b" />
          <span className="hn-constelacion hn-constelacion-a">✦</span>
          <span className="hn-constelacion hn-constelacion-b">✦</span>
          <span className="hn-constelacion hn-constelacion-c">+</span>
        </div>

        <div className="hn-hero-txt">
          <a className="hn-promo" href="#/tarifas">
            <span className="hn-promo-estrella" aria-hidden>✦</span>
            <span className="hn-promo-txt"><b>Diciembre en red</b><span>7 saltos Pro al precio de 3</span></span>
            <span className="hn-promo-tag mono">hasta 31/12</span>
            <span className="hn-promo-flecha" aria-hidden>→</span>
          </a>

          <span className="hn-eyebrow">
            <span className="punto-vivo" /> jumpernet · proxy SOCKS5 · 3 saltos · la enciendes tú
          </span>

          <h1 className="hn-titulo">
            <span>Tu conexión</span>
            <em>no va sola.</em>
          </h1>

          <p className="hn-rotativa mono"><Typewriter frases={FRASES} /></p>

          <p className="hn-lead">
            Un proxy <b>SOCKS5 con cuentas</b> que elige tres nodos vivos al azar, cifra cada
            salto y sale a internet por la red de salida. Sin histórico, sin configuración de
            red y sin encenderse hasta que tú lo pides.
          </p>

          <div className="hn-acciones">
            <a className="btn primario grande" href="#/acceso/registro">
              Crear cuenta gratis <span aria-hidden>→</span>
            </a>
            <a className="btn grande" href="#/funciona">Cómo funciona</a>
            <button className="hn-play" type="button"
              onClick={() => window.dispatchEvent(new Event("jumpernet-video"))}>
              <span className="hn-play-ico" aria-hidden>▶</span>
              <span>Ver el vídeo</span>
              <i className="mono">30 s</i>
            </button>
            <button className="hn-musica" type="button" onClick={poneMusica}
              aria-label="Poner la música de la portada">
              <span className="hn-musica-ico" aria-hidden>♪</span>
              <span>Poner música</span>
            </button>
          </div>

          <dl className="hn-cifras">
            <div><dt className="mono">saltos</dt><dd>3</dd></div>
            <div><dt className="mono">cifrado</dt><dd>ChaCha20</dd></div>
            <div><dt className="mono">salida</dt><dd>80 / 443</dd></div>
            <div><dt className="mono">histórico</dt><dd>0</dd></div>
          </dl>

          <a className="hn-firma" href="#/equipo"
            aria-label={`Conocer al equipo que ha creado JumperNET: ${NOMBRES}`}>
            <span className="hn-firma-avatares" aria-hidden>
              {EQUIPO.map((p) => (
                <i key={p.nombre} data-tono={p.tono}>{p.nombre.slice(0, 1)}</i>
              ))}
            </span>
            <span className="hn-firma-txt">
              Hecho por <b>{NOMBRES}</b>
              <span className="hn-firma-link">la marca y el equipo →</span>
            </span>
          </a>

          <a className="hn-scroll" href="#esquema">
            <span className="mono">sigue el paquete</span>
            <i aria-hidden>↓</i>
          </a>
        </div>

        <div className="hn-hero-visual">
          <span className="hn-globo hn-globo-a mono" aria-hidden>JENC</span>
          <span className="hn-globo hn-globo-b mono" aria-hidden>sin logs</span>
          <span className="hn-globo hn-globo-c mono" aria-hidden>exit 80/443</span>
          <CircuitoHero />
          <span className="hn-pie-visual mono">toca una parada · enciende o apaga la red</span>
        </div>
      </section>

      <div className="pp-cinta" aria-hidden>
        <div className="pp-cinta-pista">
          {[0, 1].map((k) => (
            <div className="pp-cinta-grupo" key={k}>
              {["SOCKS5 autenticado", "3 saltos al azar", "ChaCha20-Poly1305", "REENVÍO CIEGO",
                "Solo 80/443", "Anti-IP-privada", "Anti-metadata", "JWT 2 h", "Latencia real",
                "Nodos en Docker"].map((t) => (
                  <span key={t} className="pp-cinta-item mono"><i>◆</i>{t}</span>
                ))}
            </div>
          ))}
        </div>
      </div>

      <section id="esquema" className="pp-seccion sp-mapa-sec">
        <Revela className="pp-cab">
          <span className="migas">empieza aquí · en diez segundos</span>
          <h2 className="pp-h2">Tú, tres relés y <span className="texto-gradiente">la salida</span></h2>
          <p className="pp-sub2 nota">
            Esto es JumperNET: tu conexión entra en un proxy, cruza tres nodos que solo
            reenvían y sale a internet con otra IP. Toca cada parada o lanza el paquete
            para ver qué sabe de ti cada salto.
          </p>
        </Revela>
        <Revela retardo={1}><MapaCircuito /></Revela>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">qué es jumpernet</span>
          <h2 className="pp-h2">Tres ideas, <span className="texto-gradiente">ni una promesa de más</span></h2>
          <p className="pp-sub2 nota">
            No es una VPN comercial ni anonimato de grado onion: es un circuito de tres saltos
            que puedes encender, apagar y mirar por dentro. Toca cada idea para ver el detalle.
          </p>
        </Revela>
        <div className="sp-tres">
          {[
            { i: "01", t: "Entra por SOCKS5", d: "Tu navegador o la terminal apuntan a un proxy SOCKS5 en el puerto 1080. Se autentica con tu cuenta; no hay configuración de red que tocar.", mas: "Puedes probarlo con curl en una terminal o con la extensión del navegador. La red llega apagada: el interruptor del panel es lo que abre el circuito." },
            { i: "02", t: "Tres relés, tres capas", d: "La red elige tres nodos vivos. Cada uno recibe un sobre cifrado que no puede leer: solo sabe a quién entregarlo.", mas: "El cifrado es ChaCha20-Poly1305 y va envolviendo el paquete salto a salto. Si giras el circuito, cambian los nodos sin cortar la sesión." },
            { i: "03", t: "Sale por el exit", d: "El tercer nodo valida el destino, lo entrega y devuelve la respuesta. Lo que ve internet es su IP, no la tuya.", mas: "La salida solo permite 80 y 443 y descarta IP privadas o de loopback. El panel lanza una petición real para enseñarte la IP que vio el destino." },
          ].map((x, k) => (
            <Revela key={x.t} retardo={k + 1} className="sp-tres-item tarjeta">
              <span className="sp-tres-n mono">{x.i}</span>
              <h3>{x.t}</h3>
              <p className="nota">{x.d}</p>
              <button type="button" className="sp-mas" aria-expanded={abierta === k}
                onClick={() => setAbierta(abierta === k ? -1 : k)}>
                {abierta === k ? "menos" : "saber más"}
                <span aria-hidden>{abierta === k ? "−" : "+"}</span>
              </button>
              {abierta === k && <p className="sp-mas-txt nota">{x.mas}</p>}
            </Revela>
          ))}
        </div>
        <div className="sp-fila-enlace">
          <a className="btn" href="#/proyecto">Ver el proyecto completo <span>→</span></a>
          <a className="btn" href="#/funciona">Cómo funciona, paso a paso <span>→</span></a>
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">qué te llevas</span>
          <h2 className="pp-h2">Cuatro piezas, <span className="texto-gradiente">una red</span></h2>
        </Revela>
        <div className="pp-grid">
          {PIEZAS.map((p, i) => (
            <Revela key={p.tit} retardo={Math.min(4, i + 1)} className="pp-pieza tarjeta brillo">
              <div className="pp-pieza-top">
                <span className="pp-pieza-ico flota" style={{ animationDelay: `${i * 0.35}s` }}>{p.ico}</span>
                <span className="pp-pieza-tag mono">{p.tag}</span>
                <span className="pp-pieza-num mono">0{i + 1}</span>
              </div>
              <h3>{p.tit}</h3>
              <p className="nota">{p.txt}</p>
              <div className="pp-pieza-pies">
                {p.pies.map((x) => <span key={x} className="chip mono">{x}</span>)}
              </div>
            </Revela>
          ))}
        </div>
      </section>

      <section id="video" className="pp-seccion pp-video-seccion">
        <Revela className="pp-cab">
          <span className="migas">el proyecto en 30 segundos</span>
          <h2 className="pp-h2">Así viaja tu tráfico, <span className="texto-gradiente">de principio a fin</span></h2>
          <p className="pp-sub2 nota">
            El vídeo de portada lleva la música del proyecto y se reproduce solo al llegar aquí.
            Actívala con el botón «activar música», o salta al capítulo que te interese.
          </p>
        </Revela>
        <Revela retardo={1}><VideoPortada /></Revela>
      </section>

      <Revela className="pp-metricas tarjeta">
        <div className="pp-metricas-cab">
          <span className="etiqueta-viva">la red ahora mismo</span>
          <span className="nota mono sp-metricas-pie">
            cada 15 s · sin sesión
            <button type="button" className="sp-refresh" onClick={() => setRecarga((v) => v + 1)}
              aria-label="Actualizar las métricas ahora">↻ actualizar</button>
          </span>
        </div>
        <div className="pp-metricas-grid">
          <div className="pp-metrica"><span className="etq mono">nodos activos</span><b>{total != null ? <Cuenta hasta={total} /> : "—"}</b><span className="pie mono">{sinApi ? "API no accesible ahora" : `${infra != null ? `${infra} infra` : "…"} · ${equipos != null ? `${equipos} equipos` : "…"}`}</span></div>
          <div className="pp-metrica"><span className="etq mono">saltos por circuito</span><b><Cuenta hasta={3} /></b><span className="pie mono">elegidos al azar</span></div>
          <div className="pp-metrica"><span className="etq mono">cifrado</span><b className="pp-b-txt">ChaCha20</b><span className="pie mono">Poly1305 · JENC</span></div>
          <div className="pp-metrica"><span className="etq mono">puertos de salida</span><b className="pp-b-txt">80 / 443</b><span className="pie mono">nada más</span></div>
        </div>
      </Revela>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">sigue explorando</span>
          <h2 className="pp-h2">Cada cosa, en <span className="texto-gradiente">su página</span></h2>
          <p className="pp-sub2 nota">
            Aquí no hay una sola página interminable: lo que quieras saber tiene su sitio,
            su URL y su enlace en el dock de abajo.
          </p>
        </Revela>
        <div className="sp-directorio">
          {DESTINOS.map((d, i) => (
            <Revela key={d.r} retardo={Math.min(4, i)} className="sp-dir">
              <a href={`#${d.r}`}>
                <span className="sp-dir-n mono">{d.n}</span>
                <span className="sp-dir-ico">{d.ico}</span>
                <b>{d.t}</b>
                <span className="nota">{d.d}</span>
                <span className="sp-dir-flecha mono">abrir →</span>
              </a>
            </Revela>
          ))}
        </div>
      </section>

      <Revela className="sp-equipo-teaser tarjeta">
        <div className="sp-equipo-cab">
          <div className="sp-equipo-marca">
            <Logo tam={46} />
            <span className="sp-equipo-logo">Jumper<span>NET</span></span>
          </div>
          <span className="migas">la marca y el equipo</span>
          <h2 className="pp-h2">Cinco personas, <span className="texto-gradiente">una red</span></h2>
          <p className="nota">
            JumperNET lo firma <b>{NOMBRES}</b>. La marca es el propio circuito: tres relés
            y un salto hacia la salida.
          </p>
          <a className="btn" href="#/equipo">Conocer al equipo <span aria-hidden>→</span></a>
        </div>
        <div className="sp-equipo-gente" aria-label="Equipo fundador de JumperNET">
          {EQUIPO.map((p) => (
            <a key={p.nombre} href="#/equipo" className="sp-equipo-mini" data-tono={p.tono}>
              <i aria-hidden>{p.nombre.slice(0, 1)}</i>
              <span>{p.nombre}</span>
            </a>
          ))}
        </div>
      </Revela>

      <Revela className="sp-banda">
        <div>
          <span className="migas">el último paso</span>
          <h2 className="pp-h2">Enciende tu <span className="texto-gradiente">propia red</span></h2>
          <p className="nota">Entras con tu email, eliges el circuito y el interruptor sigue en tu mano.</p>
        </div>
        <div className="sp-banda-acciones">
          <a className="btn primario grande" href="#/acceso/registro">Crear mi cuenta <span aria-hidden>→</span></a>
          <a className="btn grande" href="#/acceso/login">Ya tengo cuenta</a>
        </div>
      </Revela>
    </>
  );
}
