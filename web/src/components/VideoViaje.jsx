const BASE = import.meta.env.BASE_URL || "./";

/* El vídeo largo del proyecto. Se usa en su página y en la portada,
   para no duplicar el marcado ni el archivo. */
export default function VideoViaje({ className = "" }) {
  return (
    <figure className={`vp-video tarjeta ${className}`}>
      <video
        controls
        playsInline
        preload="metadata"
        poster={`${BASE}video/portada.jpg`}
        aria-label="Vídeo completo del proyecto JumperNET: el viaje de principio a fin"
      >
        <source src={`${BASE}video/JumperNET_El_Viaje.mp4`} type="video/mp4" />
        Tu navegador no puede reproducir este vídeo.
      </video>
      <figcaption className="vp-video-pie">
        <span className="mono">el viaje completo · JumperNET</span>
        <span className="nota">si quieres, ábrelo a pantalla completa</span>
      </figcaption>
    </figure>
  );
}
