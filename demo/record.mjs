import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const OUT = path.resolve("segs"); fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";
const PW = "demo-password-123";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(page, name) {
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const start = Date.now() / 1000;
  return async () => {
    const end = Date.now() / 1000;
    await cdp.send("Page.stopScreencast");
    // concat list: each frame lasts until the next one
    let list = "";
    frames.forEach((fr, i) => {
      const next = i + 1 < frames.length ? frames[i + 1].t : end;
      list += `file '${fr.file}'\nduration ${Math.max(0.001, next - fr.t).toFixed(4)}\n`;
    });
    if (frames.length) list += `file '${frames.at(-1).file}'\n`;
    fs.writeFileSync(path.join(OUT, `${name}.txt`), list);
    console.log(name, frames.length, "frames", (end - start).toFixed(2), "s");
  };
}

// Fake cursor + caption overlay, injected on every page.
const OVERLAY = () => {
  const mount = () => {
    if (document.getElementById("__cur")) return;
    const st = document.createElement("style");
    st.textContent = `#__cur{position:fixed;left:0;top:0;width:28px;height:28px;z-index:99999;pointer-events:none;transition:transform .7s cubic-bezier(.3,.8,.3,1);transform:translate(1400px,700px)}
    #__cur svg{filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
    #__cur.click:after{content:"";position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:rgba(255,190,0,.55);animation:__pulse .45s ease-out forwards}
    @keyframes __pulse{from{transform:scale(.3);opacity:1}to{transform:scale(2.2);opacity:0}}
    #__cap{position:fixed;left:50%;top:22px;transform:translate(-50%,-10px);z-index:99998;pointer-events:none;opacity:0;transition:opacity .35s,transform .35s;
      font:800 30px/1.25 Inter,sans-serif;letter-spacing:-.5px;color:#fff;background:rgba(17,26,32,.92);border:2px solid #ffbe00;padding:14px 28px;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.35);white-space:nowrap;margin-left:120px}
    nextjs-portal{display:none!important}
    #__cap.on{opacity:1;transform:translate(-50%,0)} #__cap b{color:#ffbe00}`;
    document.head.appendChild(st);
    const c = document.createElement("div"); c.id = "__cur";
    c.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-8L21 10z" fill="#fff" stroke="#111a20" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(c);
    const cap = document.createElement("div"); cap.id = "__cap"; document.body.appendChild(cap);
    const saved = sessionStorage.getItem("__curpos"); if (saved) { c.style.transition = "none"; c.style.transform = saved; requestAnimationFrame(() => (c.style.transition = "")); }
  };
  window.__move = (x, y) => { mount(); const c = document.getElementById("__cur"); c.style.transform = `translate(${x}px,${y}px)`; sessionStorage.setItem("__curpos", c.style.transform); };
  window.__click = () => { const c = document.getElementById("__cur"); c.classList.remove("click"); void c.offsetWidth; c.classList.add("click"); };
  window.__caption = (html) => { mount(); const cap = document.getElementById("__cap"); if (!html) { cap.classList.remove("on"); return; } cap.innerHTML = html; cap.classList.add("on"); };
  if (document.readyState !== "loading") mount(); else document.addEventListener("DOMContentLoaded", mount);
};

async function moveTo(page, loc) {
  const b = await loc.boundingBox();
  await page.evaluate(([x, y]) => window.__move(x, y), [b.x + b.width / 2, b.y + b.height / 2]);
  await sleep(750);
}
async function clickOn(page, loc) { await moveTo(page, loc); await page.evaluate(() => window.__click()); await loc.click(); }
const caption = (page, html) => page.evaluate((h) => window.__caption(h), html);

async function signIn(page, email) {
  await page.context().clearCookies();
  await page.goto(`${APP}/sign-in`);
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(PW);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/graph|dashboard/);
}
async function signUp(page, name, email) {
  await page.context().clearCookies();
  await page.goto(`${APP}/sign-up`);
  await page.getByPlaceholder("John Doe").fill(name);
  await page.locator("input[type=email]").fill(email);
  for (const el of await page.locator("input[type=password]").all()) await el.fill(PW);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/graph|dashboard/);
}

const browser = await chromium.launch();
const only = process.argv[2];

// Title cards
for (const [s, ms] of [["hook", 3800], ["meet", 3200], ["end", 5200]]) {
  if (only && only !== s) continue;
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto(`file://${path.resolve("cards.html")}?s=${s}&x`, { waitUntil: "networkidle" });
  await page.goto(`file://${path.resolve("cards.html")}?s=${s}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const stop = await capture(page, s); await sleep(ms); await stop(); await ctx.close();
}

if (!only || only === "app") {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 });
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();
  // make sure An exists
  await signUp(page, "An Maes", "an@sdworx.test").catch(() => {});
  await signIn(page, "victor@sdworx.test");
  await page.goto(`${APP}/graph`); await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.__move(1250, 640));

  // Scene: graph
  let stop = await capture(page, "graph");
  await sleep(400);
  await caption(page, "Every chat, email &amp; meeting becomes a <b>fact</b> — owned by the people who were there");
  await sleep(1400);
  const locked = page.getByText("Locked").first();
  if (await locked.isVisible().catch(() => false)) await moveTo(page, locked);
  else await page.evaluate(() => window.__move(800, 450));
  await sleep(1600);
  await stop();

  // Scene: ask
  stop = await capture(page, "ask");
  await caption(page, "Ask the company brain <b>anything</b>");
  const box = page.getByLabel("Ask the graph");
  await clickOn(page, box);
  await box.pressSequentially("What's the 2027 indexation, and is it blocking v3?", { delay: 38 });
  await sleep(250);
  await page.keyboard.press("Enter");
  await caption(page, "");
  await sleep(2600);
  await caption(page, "What you may see: <b>answered</b>. What you may not: <b>the person who knows</b>");
  await sleep(2600);
  const askAn = page.getByRole("button", { name: /^Ask An\b/ });
  await clickOn(page, askAn);
  await sleep(700);
  await clickOn(page, page.getByRole("button", { name: "Send", exact: true }));
  await sleep(1300);
  await stop();

  // Scene: inbox (as An)
  await caption(page, "");
  await signIn(page, "an@sdworx.test");
  await page.goto(`${APP}/inbox`); await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.__move(1100, 600));
  stop = await capture(page, "inbox");
  await caption(page, "An gets the question — with a <b>drafted answer</b> from what she knows");
  await sleep(2400);
  const send = page.getByRole("button", { name: /Send to Victor/ }).first();
  await moveTo(page, send);
  await sleep(500);
  await page.evaluate(() => window.__click()); await send.click();
  await caption(page, "One click to share. <b>The brain learns.</b>");
  await sleep(2200);
  await stop();
  const href = await page.getByRole("link", { name: /View in graph/ }).first().getAttribute("href");
  console.log("href", href);

  // Scene: Victor sees the new answer node
  await caption(page, "");
  await signIn(page, "victor@sdworx.test");
  await page.goto(`${APP}${href}`); await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.__move(1300, 700));
  await page.evaluate(() => { const c = document.getElementById("__cap"); c.style.left = "720px"; c.style.marginLeft = "0"; });
  stop = await capture(page, "learned");
  await caption(page, "Victor has his answer. <b>Seconds, not days.</b>");
  await sleep(3000);
  await stop();
  await page.screenshot({ path: "segs/learned-check.png" });
  await ctx.close();
}
await browser.close();
