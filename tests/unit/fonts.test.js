// The bundled fonts are cut down to a set of characters (src/font-subset.json). Any text the game shows
// must stay inside that set, or it falls back to a different-looking system font.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = p => fs.readFileSync(path.join(__dirname, "../../src", p), "utf8");
const cfg = JSON.parse(src("font-subset.json"));
const inSubset = cp => cfg.ranges.some(([lo, hi]) => cp >= parseInt(lo, 16) && cp <= parseInt(hi, 16));
// Symbols and emoji the game deliberately draws with the system's own fonts.
const SYSTEM = ["★", "✓", "⭐", "🐱"];

test("every character in the game is in the font subset", () => {
  let text = src("game.html") + src("core.js") + src("state.js");
  for (const ch of SYSTEM) text = text.split(ch).join("");
  // Escapes in scripts (×), in CSS (\2713) and in HTML (&#215;).
  text = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  for (const ch of SYSTEM) text = text.split(ch).join("");
  text = text.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  const missing = new Set();
  for (const ch of text) { const cp = ch.codePointAt(0); if (cp > 0x7e && !inSubset(cp) && !SYSTEM.includes(ch)) missing.add(ch + " U+" + cp.toString(16)); }
  assert.deepEqual([...missing], [], "Add these to src/font-subset.json and run tools/subset-fonts.py");
});

test("the subset fonts are built and used", () => {
  for (const f of cfg.fonts) assert.ok(fs.existsSync(path.join(__dirname, "../../src", f.to)), f.to + " is missing: run tools/subset-fonts.py");
  const build = fs.readFileSync(path.join(__dirname, "../../build.py"), "utf8");
  for (const f of cfg.fonts) assert.ok(build.includes(f.to), "build.py does not use " + f.to);
});
