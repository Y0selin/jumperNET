import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000,deviceScaleFactor:2});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1200));
const r = await p.evaluate(()=>{
  const acc=document.querySelector(".hn-panel-acc");
  const out={};
  for (const el of acc.querySelectorAll("*")) {
    const cs=getComputedStyle(el); const b=el.getBoundingClientRect();
    out[el.className||el.tagName]={bg:cs.backgroundColor,bgi:cs.backgroundImage,rect:[b.x,b.y,b.width,b.height]};
  }
  const b=acc.getBoundingClientRect();
  return {acc:[b.x,b.y,b.width,b.height], kids:out};
});
console.log(JSON.stringify(r,null,1));
const b2=await p.evaluate(()=>{const a=document.querySelector(".hn-panel-acc").getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height}});
await p.screenshot({path:".shots/rediseno/switch.png",clip:{x:b2.x-90,y:b2.y-10,width:b2.w+100,height:b2.h+20}});
await b.close();
