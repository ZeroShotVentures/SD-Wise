const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const times=process.argv.slice(2).map(Number);
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
  p.on('console',m=>console.log('console:',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+__dirname+'/index.html');await p.waitForFunction(()=>window.READY);
  for(const t of times){await p.evaluate(t=>render(t),t);await p.screenshot({path:__dirname+`/snaps/${t.toFixed(2)}.png`});}
  await b.close();
})();
