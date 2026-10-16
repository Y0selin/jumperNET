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
const ES_FIREFOX = typeof browser !== "undefined" && !!navegador.proxy?.settings?.set;

const POR_DEFECTO = {
  host: "jumpernet.duckdns.org",
  puerto: 1081,
  usuario: "",
  clave: "",
  activo: false,
};

let config_ahora = { ...POR_DEFECTO };

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
  } catch (e) {
    console.warn("[jumpernet] no se pudo aplicar el proxy:", e);
  }
}

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

navegador.webRequest.onAuthRequired.addListener(
  escucha_auth,
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

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
}

navegador.storage.onChanged.addListener((cambios, area) => {
  if (area === "local" && cambios.configJumperNAT) {
    config_ahora = { ...POR_DEFECTO, ...(cambios.configJumperNAT.newValue || {}) };
    aplicar();
  }
});

navegador.runtime.onInstalled.addListener(cargar_y_aplicar);
cargar_y_aplicar();
