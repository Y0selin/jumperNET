/* Fecha y hora en castellano, sin dependencias. La portada y el panel usan
   esto para enseñar qué día es hoy en vez de una cuenta atrás. */

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/* Semana ISO 8601: la del jueves de esa semana. */
export function semanaIso(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const inicio = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - inicio) / 86400000 + 1) / 7);
}

const dos = (n) => String(n).padStart(2, "0");

export function datosHoy(d = new Date()) {
  return {
    dia: DIAS[d.getDay()],
    diaMayus: DIAS[d.getDay()].charAt(0).toUpperCase() + DIAS[d.getDay()].slice(1),
    diaCorto: DIAS_CORTOS[d.getDay()],
    numero: dos(d.getDate()),
    mes: MESES[d.getMonth()],
    mesCorto: MESES_CORTOS[d.getMonth()],
    anio: d.getFullYear(),
    completa: `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`,
    semana: semanaIso(d),
    hora: `${dos(d.getHours())}:${dos(d.getMinutes())}`,
    horaSeg: `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`,
  };
}

/* "hace 3 min", "hace 1 h", "ahora" — para la actividad del panel. */
export function haceCuanto(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return "ahora";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}
