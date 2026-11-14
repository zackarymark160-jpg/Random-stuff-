// Renders build/*.html (from gen.py) into ../public. Usage: node render.cjs [name-filter]
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{
  const B=path.join(__dirname,'build');const PUB=path.join(__dirname,'..','public');
  const list=JSON.parse(fs.readFileSync(path.join(B,'manifest.json'))).filter(m=>!process.argv[2]||m.src.includes(process.argv[2]));
  const br=await chromium.launch();
  for(const m of list){
    const out=path.join(PUB,m.out);fs.mkdirSync(path.dirname(out),{recursive:true});
    const p=await br.newPage(m.kind==='pdf'?{}:{viewport:{width:m.w,height:m.h},deviceScaleFactor:m.scale||1});
    await p.goto('file://'+path.join(B,m.src));await p.evaluate(()=>document.fonts.ready);
    if(m.kind==='pdf')await p.pdf({path:out,format:m.size,landscape:!!m.landscape,printBackground:true,preferCSSPageSize:false});
    else await p.screenshot({path:out,type:m.kind==='jpg'?'jpeg':'png',quality:m.kind==='jpg'?86:undefined,omitBackground:!!m.transparent});
    await p.close();console.log('wrote',m.out);
  }
  await br.close();
})();
