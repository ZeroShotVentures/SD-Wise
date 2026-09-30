const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path=require('path');
(async()=>{
  const mode=process.argv[2]||'stills';
  const fps=+(process.argv[3]||60);
  const browser=await chromium.launch({args:['--disable-gpu-vsync']});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  page.on('pageerror',e=>console.error('PAGEERR',e.message));
  await page.goto('file://'+path.resolve('index.html'));
  await page.waitForFunction(()=>window.READY===true,null,{timeout:60000});
  await page.waitForTimeout(500);
  if(mode==='stills'){
    const ts=(process.argv[4]||'1,3,4.9,7,9.5,12.5,14.5,17,19.5,22,23.5,25.8,28.2,29.2,31,33').split(',').map(Number);
    for(const t of ts){await page.evaluate(t=>render(t),t);await page.screenshot({path:`stills/t${t}.jpg`,type:'jpeg',quality:80});}
  } else {
    const D=await page.evaluate(()=>DURATION); const N=Math.round(D*fps);
    const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','video.mp4'],{stdio:['pipe','inherit','inherit']});
    for(let i=0;i<N;i++){
      await page.evaluate(t=>render(t),i/fps);
      const buf=await page.screenshot({type:'jpeg',quality:94});
      if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
      if(i%120===0) console.log('frame',i,'/',N);
    }
    ff.stdin.end(); await new Promise(r=>ff.on('close',r));
  }
  await browser.close();
})();
