import { useEffect, useRef } from "react";

/* Campo de nodos: fondo interactivo del hero. Los nodos flotan, se conectan
   entre sí y huyen del cursor; al pulsar aparece una onda de energía. */
export default function CampoNodos() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const N = Math.min(52, Math.floor((w * h) / 18000) + 24);
    const nodos = Array.from({ length: N }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: 1.4 + Math.random() * 2.2,
    }));
    const mouse = { x: -9999, y: -9999, activo: false };
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.activo = true;
    };
    const onLeave = () => { mouse.activo = false; };
    const ondas = [];
    const onClick = (e) => {
      const r = canvas.getBoundingClientRect();
      ondas.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 });
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("click", onClick);

    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      // mover nodos
      for (const n of nodos) {
        if (mouse.activo) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < 110 && d > 0) {
            const f = (110 - d) / 110;
            n.vx += (dx / d) * f * 0.35;
            n.vy += (dy / d) * f * 0.35;
          }
        }
        n.vx *= 0.96; n.vy *= 0.96;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > w) { n.x = w; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > h) { n.y = h; n.vy *= -1; }
      }
      // conexiones
      ctx.lineWidth = 1;
      for (let i = 0; i < nodos.length; i++) {
        for (let j = i + 1; j < nodos.length; j++) {
          const a = nodos[i], b = nodos[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) {
            const alpha = (1 - d / 130) * 0.35;
            ctx.strokeStyle = `rgba(124, 77, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // nodos
      for (const n of nodos) {
        ctx.fillStyle = "rgba(124, 77, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // ondas
      for (let k = ondas.length - 1; k >= 0; k--) {
        const o = ondas[k];
        o.t += 1;
        const radio = o.t * 6;
        const alpha = Math.max(0, 1 - o.t / 40);
        if (alpha <= 0) { ondas.splice(k, 1); continue; }
        ctx.strokeStyle = `rgba(0, 184, 217, ${alpha * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(o.x, o.y, radio, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return <canvas ref={ref} className="campo-nodos" aria-hidden="true" />;
}