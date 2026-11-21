// Measures load time, tap cost, memory and accessibility issues for a built Purrzle page.
//   node tests/perf.mjs            (measures ./index.html)
//   node tests/perf.mjs some/dir   (a folder holding index.html, e.g. an older build)
// The phone is emulated: 390x844, touch, and the CPU slowed 4x to stand in for a mid-range phone.
// Numbers are for comparing builds on the same machine, not absolute phone timings.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { serve } from "./serve.mjs";

const arg = process.argv[2] || ".";
const root = path.resolve(arg.endsWith(".html") ? path.dirname(arg) : arg);
const RUNS = +(process.env.RUNS || 5), THROTTLE = +(process.env.THROTTLE || 4);
const axeSrc = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * .95))]; };
const r1 = x => Math.round(x * 10) / 10;

function seed(levels) {
  const best = {}, times = {};
  for (let i = 1; i <= levels; i++) { best[i] = 1 + (i % 3); times[i] = 30 + (i % 200); }
  return { best, times, wallet: 40, owned: ["cozy"], skin: "cozy", play: null, daily: {}, noAds: false, wins: levels, music: 0, sound: 0, tutDone: true };
}

async function page(browser, url, save) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  if (save) await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("tango:v2", s); sessionStorage.setItem("seeded", "1"); } }, JSON.stringify(save));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await cdp.send("Performance.enable");
  const errors = [];
  p.on("pageerror", e => errors.push(String(e)));
  p.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await p.goto(url);
  return { ctx, p, cdp, errors };
}

const tapLoop = n => new Promise(async done => {
  const cells = [...document.querySelectorAll("#board .cell:not(.given)")], sync = [], frame = [];
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await raf();
  for (let k = 0; k < n; k++) {
    const c = cells[(k * 7) % cells.length], t0 = performance.now();
    c.click(); document.body.getBoundingClientRect(); getComputedStyle(c).color;
    sync.push(performance.now() - t0);
    await raf(); frame.push(performance.now() - t0);
  }
  done({ sync, frame });
});

async function main() {
  const browser = await chromium.launch();
  const { url, close } = await serve(root);
  const html = fs.readFileSync(path.join(root, "index.html"));
  const out = { build: path.relative(process.cwd(), root) || ".", size: {
    raw: html.length, gzip: zlib.gzipSync(html, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(html, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length } };

  // 1. Cold start: first paint, and when the home screen is ready to tap (splash gone).
  const fcp = [], ready = [];
  for (let i = 0; i < RUNS; i++) {
    const { ctx, p } = await page(browser, url, seed(0));
    await p.waitForFunction(() => document.getElementById("splash").hidden, null, { timeout: 15000, polling: 10 });
    const t = await p.evaluate(() => ({ fcp: (performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime, now: performance.now() }));
    fcp.push(t.fcp); ready.push(t.now);
    await ctx.close();
  }
  out.load = { firstPaintMs: r1(med(fcp)), homeReadyMs: r1(med(ready)) };

  // 2. Playing: start level 1, then tap squares.
  const playRun = async (levels) => {
    const { ctx, p, cdp, errors } = await page(browser, url, seed(levels));
    await p.waitForFunction(() => document.getElementById("splash").hidden, null, { timeout: 15000, polling: 10 });
    const startMs = await p.evaluate(() => new Promise(r => {
      const t0 = performance.now(); document.getElementById("h-play").click(); document.body.getBoundingClientRect();
      requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now() - t0)));
    }));
    const taps = await p.evaluate(tapLoop, 150);
    // Saving happens after taps; let any delayed work run.
    await p.waitForTimeout(300);
    const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(x => [x.name, x.value]));
    await ctx.close();
    return { startLevelMs: r1(startMs), tapSyncMs: { median: r1(med(taps.sync)), p95: r1(p95(taps.sync)) },
      tapToFrameMs: { median: r1(med(taps.frame)), p95: r1(p95(taps.frame)) },
      jsHeapMB: r1(m.JSHeapUsedSize / 1048576), domNodes: m.Nodes, errors };
  };
  out.newPlayer = await playRun(0);
  out.level3000 = await playRun(3000);

  // 3. Level map with a long history.
  {
    const { ctx, p } = await page(browser, url, seed(3000));
    await p.waitForFunction(() => document.getElementById("splash").hidden, null, { timeout: 15000, polling: 10 });
    out.level3000.openMapMs = r1(await p.evaluate(() => new Promise(r => {
      const t0 = performance.now(); document.querySelector('.tab[data-to="levels"]').click(); document.body.getBoundingClientRect();
      requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now() - t0)));
    })));
    await ctx.close();
  }

  // 4. Accessibility: axe-core rule violations on each main screen.
  {
    const { ctx, p } = await page(browser, url, seed(0));
    await p.waitForFunction(() => document.getElementById("splash").hidden, null, { timeout: 15000, polling: 10 });
    await p.addScriptTag({ content: axeSrc });
    const audit = async () => (await p.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations
      .map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))));
    const screens = {};
    screens.home = await audit();
    await p.click("#t-settings"); await p.waitForTimeout(400); screens.settings = await audit(); await p.click("#sheet-close");
    await p.click('.tab[data-to="levels"]'); await p.waitForTimeout(300); screens.levels = await audit();
    await p.click('.tab[data-to="store"]'); await p.waitForTimeout(300); screens.shop = await audit();
    await p.click('.tab[data-to="home"]'); await p.click("#h-play"); await p.waitForTimeout(300); screens.puzzle = await audit();
    for (let k = 0; k < 40 && await p.evaluate(() => document.getElementById("win").hidden); k++) await p.evaluate(() => document.getElementById("hint").click());
    await p.waitForTimeout(2500); screens.win = await audit();
    out.axe = { total: Object.values(screens).flat().reduce((t, v) => t + v.nodes, 0), screens };
    await ctx.close();
  }

  await close(); await browser.close();
  console.log(JSON.stringify(out, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
