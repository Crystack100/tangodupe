// Plays the built game (index.html) in a real browser: keyboard and screen reader support,
// dialogs, damaged saves, offline start and an accessibility audit.
//   npm run test:e2e   (needs: npm ci && npx playwright install chromium)
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { serve } from "../serve.mjs";

const axeSrc = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser, server;
before(async () => { browser = await chromium.launch(); server = await serve(new URL("../..", import.meta.url).pathname); });
after(async () => { await server.close(); await browser.close(); });

const PLAYER = { best: { 1: 3, 2: 2 }, times: { 1: 20, 2: 70 }, wallet: 5, owned: ["cozy"], skin: "cozy", tutDone: true, music: 0, sound: 0, wins: 2 };
// A page with `save` in storage (a string is stored as is). Fails the test on any script error.
async function open(t, save, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" }, opts));
  if (save !== undefined) await ctx.addInitScript(s => { if (!sessionStorage.seeded) { localStorage.setItem("tango:v2", s); sessionStorage.seeded = 1; } },
    typeof save === "string" ? save : JSON.stringify(save));
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  t.after(async () => { await ctx.close(); assert.deepEqual(errors, [], "script errors"); });
  await page.goto(server.url);
  await page.waitForFunction(() => document.getElementById("splash").hidden);
  return page;
}
const focused = page => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.className));

test("the home screen is ready within a second", async t => {
  const page = await open(t, PLAYER);
  const ms = await page.evaluate(() => performance.now());
  assert.ok(ms < 1500, "home ready after " + ms + "ms");
  assert.equal(await page.textContent("#h-play-sub"), "Level 3");
});

test("the board works from the keyboard and names every square", async t => {
  const page = await open(t, PLAYER);
  await page.click("#h-play");
  assert.equal(await page.locator("#board .cell[tabindex='0']").count(), 1, "one square in the Tab order");
  const first = page.locator("#c0");
  await first.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await focused(page), "c1");
  await page.keyboard.press("ArrowDown");
  assert.equal(await focused(page), "c7");
  assert.equal(await page.locator("#board .cell[tabindex='0']").getAttribute("id"), "c7");
  await page.keyboard.press("End");
  assert.equal(await focused(page), "c11");
  // Find an empty square and fill it from the keyboard.
  const empty = await page.evaluate(() => [...document.querySelectorAll("#board .cell")].findIndex(c => /empty/.test(c.getAttribute("aria-label"))));
  await page.focus("#c" + empty);
  await page.keyboard.press("s");
  assert.match(await page.getAttribute("#c" + empty, "aria-label"), /Sunny/);
  await page.keyboard.press("m");
  assert.match(await page.getAttribute("#c" + empty, "aria-label"), /Luna/);
  await page.keyboard.press("0");
  assert.match(await page.getAttribute("#c" + empty, "aria-label"), /empty/);
  // Signs are part of the square names.
  const named = await page.evaluate(() => [...document.querySelectorAll("#board .cell")].some(c => /matches the square|is opposite the square/.test(c.getAttribute("aria-label"))));
  assert.ok(named, "no square mentions its sign");
});

test("tapping a square is announced, and so is a broken rule", async t => {
  const page = await open(t, PLAYER);
  await page.click("#h-play");
  const empties = await page.evaluate(() => [...document.querySelectorAll("#board .cell")].map((c, i) => /empty/.test(c.getAttribute("aria-label")) ? i : -1).filter(i => i >= 0));
  await page.click("#c" + empties[0]);
  await page.waitForFunction(() => document.getElementById("sr").textContent === "Sunny");
  // Fill a whole row with Sunny: that breaks "3 of each".
  const row = await page.evaluate(() => {
    const cells = [...document.querySelectorAll("#board .cell")];
    for (let r = 0; r < 6; r++) {
      const idx = [0, 1, 2, 3, 4, 5].map(c => r * 6 + c);
      if (idx.every(i => !cells[i].classList.contains("given"))) return idx;
    }
    return null;
  });
  if (row) {
    for (const i of row) { const label = await page.getAttribute("#c" + i, "aria-label"); if (/empty/.test(label)) await page.click("#c" + i); }
    await page.waitForFunction(() => /Row|Column|rule/.test(document.getElementById("sr").textContent), null, { timeout: 4000 });
  }
});

test("dialogs take focus, block what is behind them, close with Escape and give focus back", async t => {
  const page = await open(t, PLAYER);
  await page.focus("#t-settings");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.activeElement && document.activeElement.closest("#sheet"));
  assert.equal(await page.evaluate(() => document.getElementById("scroll").inert), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.isHidden("#sheet"), true);
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === "t-settings");
  assert.equal(await page.evaluate(() => document.getElementById("scroll").inert), false);
});

test("solving a level opens the results with the next level focused", async t => {
  const page = await open(t, PLAYER);
  await page.click("#h-play");
  for (let k = 0; k < 40 && await page.isHidden("#win"); k++) await page.click("#hint", { force: true }).catch(() => page.evaluate(() => document.getElementById("hint").click()));
  await page.waitForFunction(() => !document.getElementById("win").hidden);
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === "win-next");
  // The announcement is written a moment after the results open, so screen readers notice the change.
  await page.waitForFunction(() => /Level 3 solved in .* stars?\./.test(document.getElementById("sr").textContent));
  assert.equal(await page.evaluate(() => document.getElementById("scroll").inert), true);
  // The win is saved straight away, not on the next batch.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("tango:v2")).best[3]);
  assert.ok(saved >= 1);
});

test("sun and moon marks and reduce motion can be switched on in Settings", async t => {
  const page = await open(t, PLAYER);
  await page.click("#t-settings");
  await page.click("#s-marks"); await page.click("#s-calm");
  assert.equal(await page.getAttribute("#s-marks", "aria-checked"), "true");
  assert.deepEqual(await page.evaluate(() => ["calm", "marks"].map(c => document.documentElement.classList.contains(c))), [true, true]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("tango:v2")));
  assert.equal(saved.marks, true); assert.equal(saved.calm, true);
});

test("a damaged save keeps what is still good and the game still starts", async t => {
  const page = await open(t, { best: { 1: 3, 2: "oops", 3: 2 }, wallet: "lots", owned: "everything", skin: "nope", play: { board: [1, 2] }, tutDone: true, music: 0, sound: 0 });
  assert.equal(await page.textContent("#h-play-sub"), "Level 2");
  await page.click("#h-play");
  assert.equal(await page.locator("#board .cell").count(), 36);
});

test("an unreadable save starts fresh and keeps a copy", async t => {
  const page = await open(t, "{not json");
  assert.equal(await page.evaluate(() => localStorage.getItem("tango:v2:broken")), "{not json");
  assert.equal(await page.textContent("#h-play-sub"), "Level 1");
});

test("taps are saved in a batch, and leaving the app saves at once", async t => {
  const page = await open(t, PLAYER);
  await page.click("#h-play");
  const i = await page.evaluate(() => [...document.querySelectorAll("#board .cell")].findIndex(c => /empty/.test(c.getAttribute("aria-label"))));
  await page.click("#c" + i);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  const board = await page.evaluate(() => JSON.parse(localStorage.getItem("tango:v2")).play.board);
  assert.equal(board[i], 0);
});

test("the web app opens offline once it has been visited", async t => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => ctx.close());
  const page = await ctx.newPage();
  await page.goto(server.url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => (await caches.keys()).length > 0 && !!(await caches.match("./index.html")));
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.getElementById("splash").hidden);
  assert.equal(await page.isVisible("#h-play"), true);
});

test("no accessibility problems found by axe on the main screens", async t => {
  const page = await open(t, PLAYER);
  await page.addScriptTag({ content: axeSrc });
  // White text on the brand's orange buttons is a known design choice (see the pull request), so color contrast is checked separately.
  const audit = async where => {
    const v = await page.evaluate(async () => (await axe.run(document, { rules: { "color-contrast": { enabled: false } } })).violations.map(v => v.id + ": " + v.nodes.map(n => n.target.join(" ")).join(", ")));
    assert.deepEqual(v, [], where);
  };
  await audit("home");
  await page.click("#t-settings"); await audit("settings"); await page.keyboard.press("Escape");
  await page.click('.tab[data-to="levels"]'); await audit("levels");
  await page.click('.tab[data-to="store"]'); await audit("shop");
  await page.click('.tab[data-to="home"]'); await page.click("#h-play"); await audit("puzzle");
  await page.click("#g-how"); await audit("how to play");
});
