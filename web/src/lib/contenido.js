/* Contenido compartido por las páginas públicas: así la portada, la página
   del proyecto y las dudas hablan exactamente de lo mismo. */

export const FRASES = [
  "viaja por 3 nodos aleatorios…",
  "va cifrada en cada salto…",
  "sale a internet solo por 80/443…",
  "cambia la IP que ve el destino…",
  "solo se mueve si tú la enciendes…",
];

/* Solo las páginas principales: la cabecera tiene que leerse de un vistazo.
   Descargas y el resto siguen en el pie y en el directorio de la portada. */
export const ENLACES = [
  { ruta: "/", texto: "Inicio", corto: "Inicio", ico: "⌂" },
  { ruta: "/usos", texto: "Para qué sirve", corto: "Usos", ico: "◎" },
  { ruta: "/proyecto", texto: "Proyecto", corto: "Proyecto", ico: "◈" },
  { ruta: "/equipo", texto: "El equipo", corto: "Equipo", ico: "✦" },
  { ruta: "/funciona", texto: "Cómo funciona", corto: "Funciona", ico: "⌁" },
  { ruta: "/lab", texto: "Laboratorio interactivo", corto: "Lab", ico: "⌘" },
  { ruta: "/tarifas", texto: "Tarifas", corto: "Tarifas", ico: "◇" },
  { ruta: "/dudas", texto: "Dudas", corto: "Dudas", ico: "?" },
  { ruta: "/recursos", texto: "Recursos", corto: "Recursos", ico: "⌬" },
];

export const PIEZAS = [
  {
    ico: "◈",
    tag: "route",
    tit: "Circuito de 3 saltos",
    txt: "La red elige tres nodos vivos al azar y abre tu ruta. Si quieres otra, «girar» te da un circuito nuevo sin cortar la sesión.",
    pies: ["nodos al azar", "cambio en caliente"],
  },
  {
    ico: "⛨",
    tag: "crypto",
    tit: "Cifrado por capas",
    txt: "Del primer salto al de salida el flujo viaja con ChaCha20-Poly1305. Los intermedios reenvían a ciegas: no entienden ni guardan lo que llevas.",
    pies: ["JENC", "AEAD", "reenvío ciego"],
  },
  {
    ico: "◎",
    tag: "real",
    tit: "La IP cambia de verdad",
    txt: "Nada de estimaciones: el panel lanza una petición real por tu circuito y te enseña la IP que ha visto el destino.",
    pies: ["comprobación real", "latencia medida"],
  },
  {
    ico: "⛓",
    tag: "hive",
    tit: "La red, a la vista",
    txt: "Cada salto es un contenedor en el servidor. El panel enseña estado por latido, latencia TCP, conexiones vivas y su papel en tu ruta.",
    pies: ["heartbeat", "10 s en vivo"],
  },
];

export const DUDAS = [
  ["¿La IP cambia de verdad?", "Sí — y puedes comprobarlo tú: el panel lanza una petición real por el circuito y te enseña la IP que vio el destino. Si no coincide con la tuya, el circuito está haciendo su trabajo."],
  ["¿Se enciende sola al entrar?", "No. La red llega apagada: el interruptor es tuyo. Nada se conecta hasta que lo pulsas, y puedes apagarla o girar el circuito cuando quieras."],
  ["¿Qué guarda el sistema de mí?", "Tu email, tu nombre visible si lo pones, el estado del circuito y cuándo cambió. Nada más: no hay histórico de webs ni de destinos, y puedes borrar la cuenta de golpe."],
  ["¿Cuánto añade de latencia?", "La de tres saltos más el cifrado: normalmente entre 40 y 120 ms extra. Bien para navegar y buscar; no lo recomendamos para juegos competitivos."],
  ["¿Los nodos son de terceros?", "Son de laboratorio: contenedores en el servidor del proyecto. Además puedes aportar tu propio equipo como nodo voluntario si aceptas ser salto."],
  ["¿Es lo mismo que Tor?", "Comparte la idea de saltos en capas, pero no es una red de anonimato de grado onion: aquí los nodos son pocos, conocidos y del propio proyecto. Es una herramienta educativa y un proxy real, no una promesa de anonimato fuerte."],
];

export const PLANES_RESUMEN = [
  { nombre: "Free", precio: "0 €", nota: "3 saltos, cifrado base y refresco diario." },
  { nombre: "Pro", precio: "5 €/mes", nota: "Hasta 7 saltos, mejor cifrado y refresco cada 10 h." },
  { nombre: "Empresarial", precio: "a medida", nota: "Salidas y consumos dedicados, trato directo." },
];
