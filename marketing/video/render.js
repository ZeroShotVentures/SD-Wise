const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {spawn}=require('child_process');
const FF='/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
(async()=>{
  const fps=+process.argv[2]||60, out=process.argv[3]||'video.mp4', from=+(process.argv[4]||0), to=process.argv[5];
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+__dirname+'/index.html');await p.waitForFunction(()=>window.READY);
  const dur=to?+to:await p.evaluate(()=>DUR);
  const ff=spawn(FF,['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  const n=Math.round((dur-from)*fps);const t0=Date.now();
  for(let i=0;i<n;i++){
    await p.evaluate(t=>render(t),from+i/fps);
    const buf=await p.screenshot({type:'png'});
    if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
    if(i%300==0)console.log(i,'/',n,((Date.now()-t0)/1000).toFixed(0)+'s');
  }
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done');
})();
