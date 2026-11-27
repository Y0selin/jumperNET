import { useEffect, useRef } from "react";

/* FondoRed: una malla de nodos y paquetes que se mueve detrás de todo el
   sitio. No es decoración porque sí: son exactamente las piezas de JumperNET
   (nodos, enlaces y un paquete viajando). Reacciona al cursor —los nodos se
   apartan y se dibujan enlaces hacia él— y al clic, que lanza una onda.
   Respeta prefers-reduced-motion y data-anim="off": en ese caso dibuja una
   sola instantánea quieta. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function aRgb(valor, respaldo) {
  const t = (valor || "").trim();
  const hex = t.match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  const nums = t.match(/\d+(\.\d+)?/g);
  return nums && nums.length >= 3 ? nums.slice(0, 3).join(",") : respaldo;
}

export default function FondoRed({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv && cv.getContext("2d");
    if (!ctx) return;

    const fino = window.matchMedia?.("(pointer: fine)").matches;
    let ancho = 0;
    let alto = 0;
    let dpr = 1;
    let raf = 0;
    let ultimo = 0;
    let nodos = [];
    let paquetes = [];
    let ondas = [];
    let viendo = true;
    let quieto = false;
    let claro = false;
    let colores = { a: "255,90,54", b: "139,123,255", c: "51,214,192" };
    const raton = { x: -9999, y: -9999, activo: false };

    function leeTema() {
      const s = getComputedStyle(document.documentElement);
      colores = {
        a: aRgb(s.getPropertyValue("--acento-1"), "255,90,54"),
        b: aRgb(s.getPropertyValue("--acento-2"), "139,123,255"),
        c: aRgb(s.getPropertyValue("--acento-3"), "51,214,192"),
      };
      claro = document.documentElement.dataset.modo === "claro";
      quieto = document.documentElement.dataset.anim === "off"
        || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    }

    function crea() {
      const n = !fino ? 32 : ancho < 760 ? 38 : ancho < 1200 ? 54 : 76;
      nodos = Array.from({ length: n }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: 1 + Math.random() * 1.4,
        tono: Math.random(),
      }));
      paquetes = Array.from({ length: fino ? 5 : 3 }, () => nuevoPaquete());
      ondas = [];
    }

    function nuevoPaquete() {
      const a = (Math.random() * nodos.length) | 0;
      let b = (Math.random() * nodos.length) | 0;
      if (b === a) b = (b + 1) % nodos.length;
      return { a, b, t: Math.random(), v: 0.0016 + Math.random() * 0.0022 };
    }

    function mide() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      ancho = window.innerWidth;
      alto = window.innerHeight;
      cv.width = Math.round(ancho * dpr);
      cv.height = Math.round(alto * dpr);
      cv.style.width = ancho + "px";
      cv.style.height = alto + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      leeTema();
      crea();
      if (quieto) pinta(0, 0);
    }

    function pinta(t, dt) {
      ctx.clearRect(0, 0, ancho, alto);
      const alfaLinea = claro ? 0.26 : 0.15;
      const alfaNodo = claro ? 0.7 : 0.74;
      const lejos = 172;
      const ratonCerca = 185;

      for (const n of nodos) {
        if (!quieto) {
          n.x += n.vx * dt * 0.06;
          n.y += n.vy * dt * 0.06;
          if (n.x < -20) n.x = ancho + 20;
          if (n.x > ancho + 20) n.x = -20;
          if (n.y < -20) n.y = alto + 20;
          if (n.y > alto + 20) n.y = -20;
        }

        if (raton.activo && fino) {
          const dx = n.x - raton.x;
          const dy = n.y - raton.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const fuerza = (1 - d / 150) * 0.55;
            n.x += (dx / d) * fuerza;
            n.y += (dy / d) * fuerza;
          }
        }
      }

      /* enlaces entre nodos cercanos */
      for (let i = 0; i < nodos.length; i++) {
        for (let j = i + 1; j < nodos.length; j++) {
          const a = nodos[i];
          const b = nodos[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > lejos) continue;
          const p = 1 - d / lejos;
          const c = (i + j) % 3 === 0 ? colores.b : (i + j) % 3 === 1 ? colores.c : colores.a;
          ctx.strokeStyle = `rgba(${c},${(alfaLinea * p).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      /* la malla se acerca al cursor */
      if (raton.activo && fino) {
        for (const n of nodos) {
          const d = Math.hypot(n.x - raton.x, n.y - raton.y);
          if (d > ratonCerca) continue;
          const p = 1 - d / ratonCerca;
          ctx.strokeStyle = `rgba(${colores.b},${(0.32 * p).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(raton.x, raton.y);
          ctx.stroke();
        }
        const halo = ctx.createRadialGradient(raton.x, raton.y, 0, raton.x, raton.y, 190);
        halo.addColorStop(0, `rgba(${colores.a},${claro ? 0.09 : 0.11})`);
        halo.addColorStop(0.55, `rgba(${colores.b},0.03)`);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(raton.x, raton.y, 190, 0, Math.PI * 2);
        ctx.fill();
      }

      /* nodos */
      for (const n of nodos) {
        const c = n.tono > 0.72 ? colores.b : n.tono > 0.4 ? colores.c : colores.a;
        ctx.fillStyle = `rgba(${c},${alfaNodo})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (n.r > 1.7) {
          ctx.fillStyle = `rgba(${c},0.12)`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 4.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* paquetes viajando por los enlaces */
      if (!quieto) {
        for (const q of paquetes) {
          q.t += q.v * dt * 0.06;
          if (q.t >= 1) Object.assign(q, nuevoPaquete(), { t: 0 });
          const a = nodos[q.a];
          const b = nodos[q.b];
          if (!a || !b) continue;
          const x = a.x + (b.x - a.x) * q.t;
          const y = a.y + (b.y - a.y) * q.t;
          ctx.save();
          ctx.shadowBlur = 12;
          ctx.shadowColor = `rgba(${colores.a},0.9)`;
          /* el paquete toma el acento del tema: nada de naranjas heredados */
          ctx.fillStyle = `rgba(${colores.a},${claro ? 0.85 : 0.95})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = `rgba(${colores.a},0.16)`;
          ctx.beginPath();
          ctx.arc(x, y, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* ondas del clic */
      for (const o of ondas) {
        ctx.strokeStyle = `rgba(${colores.a},${(0.4 * (1 - o.p)).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(o.x, o.y, 8 + o.p * 130, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function corazon(t) {
      if (!viendo) return;
      raf = requestAnimationFrame(corazon);
      const dt = ultimo ? clamp(t - ultimo, 0, 48) : 16;
      ultimo = t;
      if (quieto) return;
      for (const o of ondas) o.p += 0.012;
      ondas = ondas.filter((o) => o.p < 1);
      pinta(t, dt);
    }

    function arranca() {
      cancelAnimationFrame(raf);
      ultimo = 0;
      raf = requestAnimationFrame(corazon);
    }

    function alMover(e) {
      raton.x = e.clientX;
      raton.y = e.clientY;
      raton.activo = true;
    }
    function alSalir() {
      raton.activo = false;
      raton.x = -9999;
      raton.y = -9999;
    }
    function alPulsar(e) {
      if (e.pointerType === "touch" && !fino) {
        raton.x = e.clientX;
        raton.y = e.clientY;
        raton.activo = true;
      }
      ondas.push({ x: e.clientX, y: e.clientY, p: 0 });
      if (quieto) {
        pinta(0, 0);
      }
    }
    function alVisibilidad() {
      viendo = !document.hidden;
      if (viendo && !quieto) arranca();
      else cancelAnimationFrame(raf);
    }

    const observa = new MutationObserver(() => {
      leeTema();
      if (quieto) {
        cancelAnimationFrame(raf);
        pinta(0, 0);
      } else {
        arranca();
      }
    });

    mide();
    pinta(0, 0);
    if (!quieto) arranca();

    window.addEventListener("resize", mide);
    window.addEventListener("pointermove", alMover, { passive: true });
    window.addEventListener("pointerdown", alPulsar, { passive: true });
    document.addEventListener("pointerleave", alSalir);
    document.addEventListener("visibilitychange", alVisibilidad);
    observa.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-modo", "data-anim", "style"],
    });

    return () => {
      cancelAnimationFrame(raf);
      observa.disconnect();
      window.removeEventListener("resize", mide);
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerdown", alPulsar);
      document.removeEventListener("pointerleave", alSalir);
      document.removeEventListener("visibilitychange", alVisibilidad);
    };
  }, []);

  return <canvas ref={ref} className={`fondo-red ${className}`.trim()} aria-hidden="true" />;
}
