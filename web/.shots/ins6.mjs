import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","claro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,900));
const o=await p.evaluate(()=>{
  const pick=(s)=>{const e=document.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return {y:Math.round(r.y+scrollY),h:Math.round(r.height),w:Math.round(r.width),bg:cs.backgroundColor,color:cs.color,ar:cs.aspectRatio,mt:cs.marginTop,pt:cs.paddingTop};};
  return {fig:pick(".hn-video-hero .pp-video"), caps:pick(".hn-video-hero .pp-video-caps"), pie:pick(".hn-video-hero .pp-video-pie"), sub:pick(".hn-video-hero .pp-video-sub"), cap:pick(".hn-video-hero .pp-video-cap"), sonido:pick(".hn-video-hero .pp-video-sonido"), modo:document.documentElement.dataset.modo, bloque:pick(".hn-video-hero")};
});
console.log(JSON.stringify(o,null,1));
await p.evaluate(()=>window.scrollTo(0,720));
await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:".shots/rediseno/movil-video.png"});
await b.close();
