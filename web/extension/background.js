/*
 * JumperNAT — extension del navegador.
 *
 * Hace de FoxyProxy automatico: apunta el proxy del navegador a la entrada
 * HTTP de tu circuito (host:1081) y RESPONDE EL SOLO a las peticiones de
 * credenciales (407 + Proxy-Authenticate) con tu cuenta, sin ventanas.
 * No tocas nada de la configuracion del navegador: activar/desactivar se
 * hace desde el popup o desde la web.
 *
 * Diseno: el proxy es HTTP CONNECT (no SOCKS5) porque Chrome no admite
 * credenciales SOCKS y Firefox no deja autenticar SOCKS desde una extension;
 * el 407 del proxy HTTP SI lo captura onAuthRequired en los dos navegadores.
 */
"use strict";

const navegador = typeof browser !== "undefined" ? browser : chrome;
/* DETECCIÓN CANÓNICA DE FIREFOX: typeof browser ya NO sirve — Chrome 131+ da
 * el alias browser también en MV3, y con él la rama Firefox metía un objeto
 * {proxyType} inválido en chrome.proxy.settings.set (Invalid invocation):
 * el proxy JAMÁS se aplicaba y el navegador quedaba en modo system => «veo mi
 * IP real». runtime.getBrowserInfo solo existe en el Firefox real. */
const ES_FIREFOX = typeof navegador.runtime?.getBrowserInfo === "function";

const POR_DEFECTO = {
  host: "jumpernet.duckdns.org",
  puerto: 1081,
  usuario: "",
  clave: "",
  activo: false,
};

let config_ahora = { ...POR_DEFECTO };

/* Vigía del secuestro: FoxyProxy (o cualquier otra extension de proxy, o el
 * navegador mismo) escribe chrome.proxy.settings DESPUES que nosotros y esa
 * escritura GANA (ultimio escritor manda). Resultado: nuestro proxy se desvanece
 * y el navegador navega directo — exactamente el sintoma «veo mi IP real».
 * Solucion: comprobar el ajuste vigente (levelOfControl) y RE-AFIRMAR el nuestro
 * cada minuto mientras el usuario lo tenga activo. */

function cadenaProxy(config) {
  return `${config.host}:${config.puerto}`;
}

/*
 * Apaga el proxy SIN borrar la configuracion: equivalente en el popup a
 * "desactivar". "quitar config" se hace borrando credenciales (popup).
 */
async function fijado(contenido) {
  if (ES_FIREFOX) {
    // Firefox: browser.proxy.settings (MV2) recibe el bloque completo
    await navegador.proxy.settings.set({ value: contenido });
  } else if (navegador.proxy?.settings) {
    // Chrome MV3: chrome.proxy.settings con reglas fixed_servers
    // APAGADO = direct SIEMPRE: el apagado caia en la rama de fixed_servers
    // (quedaba un proxy 1081 sin credenciales => ERR_INVALID_AUTH_CREDENTIALS
    //  en TODO el trafico y Chrome reintentaba directo: se veia tu IP real).
    if (["system", "none", "direct"].includes(contenido.proxyType)) {
      await navegador.proxy.settings.set({ value: { mode: "direct" } });
    } else {
      await navegador.proxy.settings.set({
        value: {
          mode: "fixed_servers",
          rules: {
            singleProxy: {
              scheme: "http",
              host: config_ahora.host,
              port: config_ahora.puerto,
            },
            bypassList: ["localhost", "127.0.0.1", "[::1]"],
          },
        },
      });
    }
  }
}

const MANUAL_FIREFOX = {
  proxyType: "manual",
  http: "", // se rellena al aplicar
  ssl: "",
  passthrough: "localhost, 127.0.0.1, ::1",
};

async function aplicar() {
  try {
    if (config_ahora.activo && config_ahora.usuario && config_ahora.clave) {
      if (ES_FIREFOX) {
        await fijado({ ...MANUAL_FIREFOX, http: cadenaProxy(config_ahora), ssl: cadenaProxy(config_ahora) });
      } else {
        await fijado({ proxyType: "manual" });
      }
    } else {
      // apagado: devolver el control al sistema (la configuracion del navegador queda igual que antes de instalar)
      await fijado({ proxyType: ES_FIREFOX ? "system" : "direct" });
    }
    await crear_vigia();
  } catch (e) {
    console.warn("[jumpernet] no se pudo aplicar el proxy:", e);
  }
}

/* ------------------------------------------------------- vigía del secuestro */

let conflicto_txt = null;

/* ¡ DIFERATES NAVEGADORES !
 * Chromium: proxy.settings.get() da { value:{mode,..}, levelOfControl };
 * como FoxyProxy escribe al final, el nivel deja de ser controllable_by_this_
 * extension y las regs no son las nuestras (o directamente mode != fixed_servers).
 * Firefox: misma idea con proxyType (manual) y la cadena http/ssl de la Guzzle. */
async function _reglas_nuestras(dato) {
  if (!dato || !dato.value) return false;
  const v = dato.value;
  if (ES_FIREFOX) {
    return v.proxyType === "manual" &&
      (v.http || "").startsWith(config_ahora.host) &&
      (v.ssl || "").startsWith(config_ahora.host);
  }
  return v.mode === "fixed_servers" && v.rules &&
    v.rules.singleProxy && v.rules.singleProxy.host === config_ahora.host &&
    v.rules.singleProxy.port === config_ahora.puerto;
}

async function vigiar() {
  try {
    if (!config_ahora.activo) return; // apagada: no hay nada que pelear
    const dato = await navegador.proxy.settings.get({});
    const nivel = dato && dato.levelOfControl; // variante según versión: controllable_by_this… / controlled_by_this… / …_other…
    const ok = await _reglas_nuestras(dato);
    if (!ok || (nivel && nivel.includes("other"))) {
      // SEQUESTRO REAL: reaplicamos ours AHORA y aterrizamos el aviso en el popup
      conflicto_txt = (nivel || "otra cosa") + " · " + JSON.stringify(dato && dato.value).slice(0, 160);
      try {
        await navegador.storage.local.set({ conflictoJumperNAT: conflicto_txt });
      } catch (e0) { /* storage: nunca fatal */ }
      console.warn("[jumpernet] SECUESTRO del proxy detectado — reafirmando:", conflicto_txt);
      await aplicar();
      pon_badge("\u00a1", "#ffb454", "JumperNAT: otra extension (¿FoxyProxy?) escribió el proxy después que esta\ny le quitó la ruta a tu circuito. JumperNAT la ha reafirmado —\npor consistencia, desáctvala o desactiva su opción proxy.");
    }
  } catch (e) { /* navegadores sin get detallado: nada */ }
}

async function crear_vigia() {
  try {
    await navegador.alarms.create("vigia-jumpernat", { periodInMinutes: 1 });
  } catch (e0) { /* sin alarms (Firefox viejo): solo reaccion al cambio de storage */ }
}

try {
  navegador.alarms.onAlarm.addListener((a) => { if (a && a.name === "vigia-jumpernat") vigiar(); });
} catch (e0) { /* sin alarms: nada */ }

/* ------------------------------------------------------- credenciales 407 */

function credenciales_para_el_proxy() {
  if (!config_ahora.activo) return null;
  if (!config_ahora.usuario || !config_ahora.clave) return null;
  return {
    authCredentials: {
      username: config_ahora.usuario,
      password: config_ahora.clave,
    },
  };
}

/*
 * El navegador pregunta: "para conectarse a este proxy necesito usuario y
 * clave". Respondemos con las tuyas SIN ninguna ventana, como FoxyProxy pero
 * automatico. Si la extension esta apagada o sin datos, devolvemos {} y el
 * navegador sigue su curso normal.
 */
const escucha_auth = (detalles, callback) => {
  const respuesta = detalles.isProxy ? credenciales_para_el_proxy() : null;
  if (typeof callback === "function") {
    callback(respuesta || {}); // Chrome (registrado con asyncBlocking)
  } else {
    return Promise.resolve(respuesta || {}); // Firefox (registrado con asyncBlocking)
  }
};

/*
 * Registro ANTI-MUERTE del script: "asyncBlocking" solo existe en Chromium y
 * Firefox lanza un error al añadirlo con una spec que no reconoce, matando TODO
 * el script (y el proxy nunca se aplicaria: seria el fallo «veo mi IP real»).
 * Por eso: intentamos asyncBlocking (Chrome, callback) y si no se puede cae al
 * registro plano, donde Firefox responde con la PROMESA de escucha_auth.
 */
try {
  navegador.webRequest.onAuthRequired.addListener(
    escucha_auth,
    { urls: ["<all_urls>"] },
    ["asyncBlocking"]
  );
  console.log("[jumpernet] onAuthRequired registrado con asyncBlocking");
} catch (e) {
  navegador.webRequest.onAuthRequired.addListener(escucha_auth, { urls: ["<all_urls>"] });
  console.log("[jumpernet] onAuthRequired registrado por promesa (Firefox):", String(e).slice(0, 80));
}

/* -------------------------------------------------------------- arranque */

/*
 * Primer arranque: si no hay nada guardado y la extension trae un fichero
 * config.json (host, puerto, usuario, clave, activo), lo importa. Asi puedes
 * desplegar la extension con las credenciales ya puestas (y los tests
 * automatizados de empaquetado no necesitan tocar el popup).
 * config.json se lee UNA vez; despues manda el storage del popup.
 */
async function importar_config_json() {
  try {
    const r = await fetch(navegador.runtime.getURL("config.json"));
    if (!r.ok) return null;
    const crudo = await r.json();
    const config = { ...POR_DEFECTO, ...crudo };
    await navegador.storage.local.set({ configJumperNAT: config });
    console.log("[jumpernet] config.json importado al primer arranque");
    return config;
  } catch (e) {
    return null; // sin config.json: flujo normal (popup)
  }
}

async function cargar_y_aplicar() {
  const { configJumperNAT } = await navegador.storage.local.get(["configJumperNAT"]);
  if (configJumperNAT) {
    config_ahora = { ...POR_DEFECTO, ...(configJumperNAT || {}) };
  } else {
    config_ahora = (await importar_config_json()) || { ...POR_DEFECTO };
  }
  await aplicar();
  const estado = config_ahora.activo
    ? `activa via ${cadenaProxy(config_ahora)} (usuario ${config_ahora.usuario})`
    : "apagada (el navegador usa su proxy normal)";
  console.log("[jumpernet] extension lista:", estado);
  señal_estado();
}

/* ------------------------------------------------- señal visual (badge) */
/*
 * Como FoxyProxy no se sabe si funciona por clases: esta extension deja la
 * señal escrita EN LA BARRA con el resultado REAL del proxy: ✓ verde si una
 * peticion real del navegador ve una IP por el proxy, ✗ si el proxy no llega,
 * (y ¡ en errores del propio proxy). Sin paneles ni consola: se ve asi enseguida.
 */
const BOTON = navegador.action || navegador.browserAction; // MV3 / MV2

function pon_badge(texto, color, titulo) {
  if (!BOTON) return;
  BOTON.setBadgeText({ text: texto });
  BOTON.setBadgeBackgroundColor({ color });
  try { BOTON.setTitle({ title: titulo }); } catch (e0) { /* nunca fatal */ }
}

async function señal_estado() {
  try {
    if (!config_ahora.activo) {
      pon_badge("", "#555", "JumperNAT: apagada");
      conflicto_txt = null;
      try { await navegador.storage.local.remove("conflictoJumperNAT"); } catch (e0) { /* nada */ }
      return;
    }
    pon_badge("…", "#8a6", "JumperNAT: comprobando el proxy…");
    const r = await fetch(`https://api.ipify.org?cachebust=${Date.now()}`, { cache: "no-store" });
    const ip = (await r.text()).trim().slice(0, 64);
    pon_badge("\u2713", "#34d47c", `JumperNAT: proxy OK — internet te ve con ${ip}`);
  } catch (e) {
    pon_badge("\u2717", "#ff5a6a", "JumperNAT: el trafico no consigue salir por el proxy\n(revisa que la RED este encendida en la web y las credenciales)");
  }
}

try {
  navegador.proxy.onProxyError.addListener(() => {
    pon_badge("\u00a1", "#ffb454", "JumperNAT: error del proxy (mira el popup por detalles)");
  });
} catch (e) { /* navegador sin proxy.onProxyError: sin señal extra */ }

navegador.storage.onChanged.addListener((cambios, area) => {
  if (area === "local" && cambios.configJumperNAT) {
    config_ahora = { ...POR_DEFECTO, ...(cambios.configJumperNAT.newValue || {}) };
    aplicar();
  }
});

navegador.runtime.onInstalled.addListener(cargar_y_aplicar);
navegador.runtime.onStartup?.addListener?.(() => cargar_y_aplicar());
cargar_y_aplicar().then(() => vigiar());
