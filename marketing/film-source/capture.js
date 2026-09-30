const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const mode = process.argv[2]; // 'stills' or 'video'
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--disable-web-security','--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('PAGEERR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto('file://' + path.resolve('index.html'));
  await page.evaluate(() => window.ready);
  if (mode === 'stills') {
    const times = process.argv.slice(3).map(Number);
    for (const t of times) { await page.evaluate(t => window.render(t), t); await page.screenshot({ path: `stills/s_${String(t).padStart(5,'0')}.jpg`, type: 'jpeg', quality: 80 }); }
  } else {
    const fps = 30, a = +(process.argv[3] || 0), b = +(process.argv[4] || await page.evaluate(() => window.DURATION));
    const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p', process.argv[5] || 'silent.mp4'], { stdio: ['pipe','inherit','inherit'] });
    const n = Math.round((b - a) * fps);
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => window.render(t), a + i / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${n}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
