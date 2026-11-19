/* Genera el vídeo de portada (WebM VP9 + Opus) y su carátula JPG.
   Uso:  node scripts/generar-video.mjs
   No necesita ffmpeg: la página scripts/video-portada.html dibuja el guion en un
   canvas, decodifica el MP3 de public/audio y aquí se graba todo con
   MediaRecorder desde Chrome headless. */
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const aquí = dirname(fileURLToPath(import.meta.url));
const raíz = join(aquí, "..");
const salida = join(raíz, "public", "video");
mkdirSync(salida, { recursive: true });

const DURACION_MS = 25_200;
const FPS = 24;

const ejecutable = process.env.CHROMIUM
  || ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"].find((p) => {
    try { return readFileSync(p) && p; } catch { return false; }
  });

const navegador = await puppeteer.launch({
  executablePath: ejecutable,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
});
const pagina = await navegador.newPage();
await pagina.goto("file://" + join(aquí, "video-portada.html"), { waitUntil: "load" });

const caratula = await pagina.evaluate(() => window.__poster());
writeFileSync(join(salida, "portada.jpg"), Buffer.from(caratula.split(",")[1], "base64"));
console.log("carátula: public/video/portada.jpg");

const audio = readFileSync(join(raíz, "public", "audio", "portada.mp3")).toString("base64");
const durAudio = await pagina.evaluate((b) => window.__cargaAudio(b), audio);
console.log(`música: public/audio/portada.mp3 · ${durAudio.toFixed(1)} s`);

const { base64, tipo, bytes } = await pagina.evaluate(
  (ms, fps) => window.__grabar(ms, fps, true), DURACION_MS, FPS,
);
writeFileSync(join(salida, "portada.webm"), Buffer.from(base64, "base64"));
console.log(`vídeo: public/video/portada.webm · ${(bytes / 1024 / 1024).toFixed(2)} MB · ${tipo}`);

await navegador.close();
