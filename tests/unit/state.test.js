// Saved game checks (src/state.js): a damaged save must never stop the game or lose good progress.
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../src/state.js");
const T = require("../../src/core.js");

const BASE = { best: {}, times: {}, wallet: 0, owned: ["cozy"], skin: "cozy", play: null, daily: {}, noAds: false, wins: 0, music: 40, sound: 70, theme: "light" };
const SKINS = ["cozy", "midnight", "sakura"];
const clean = raw => S.clean(raw, BASE, SKINS);
function playing(n) {
  const p = T.level(n);
  return { level: n, difficulty: p.difficulty, givens: p.givens, edges: p.edges, solution: p.solution, board: p.givens.slice(), history: [], elapsed: 12, done: false, v: 3 };
}

test("a good save comes back unchanged", () => {
  const raw = { best: { 1: 3, 2: 1 }, times: { 1: 30, 2: 95, d20250101: 40 }, wallet: 12, owned: ["cozy", "midnight"], skin: "midnight", play: playing(3),
    daily: {}, noAds: true, wins: 2, music: 0, sound: 55, theme: "light", tutDone: true, remind: false, free: { day: 20261121, n: 2 }, adsSeen: 4 };
  const out = clean(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(out.best, raw.best);
  assert.deepEqual(out.times, raw.times);
  assert.equal(out.wallet, 12);
  assert.deepEqual(out.owned, ["cozy", "midnight"]);
  assert.equal(out.skin, "midnight");
  assert.deepEqual(out.play, raw.play);
  assert.equal(out.noAds, true);
  assert.equal(out.tutDone, true);
  assert.equal(out.remind, false);
  assert.deepEqual(out.free, raw.free);
  assert.equal(out.adsSeen, 4);
});

test("nothing usable gives the defaults", () => {
  for (const raw of [null, undefined, 5, "text", [], [1, 2]]) assert.deepEqual(clean(raw), BASE);
});

test("bad entries are dropped, good ones kept", () => {
  const out = clean({ best: { 1: 3, 2: "2", 3: 9, x: 1, 0: 2, 4: null, 5: true }, times: { 1: 20, dx: 5, 2: -4 }, wallet: -5, music: 400, sound: "x", wins: 3.6 });
  assert.deepEqual(out.best, { 1: 3, 2: 2, 3: 3 });
  assert.deepEqual(out.times, { 1: 20, 2: 1 });
  assert.equal(out.wallet, 0);
  assert.equal(out.music, 100);
  assert.equal(out.sound, 70);
  assert.equal(out.wins, 4);
});

test("skins: old names, unknown ids and unowned skins", () => {
  assert.deepEqual(clean({ owned: ["daybreak", "midnight", "midnight", 7, "gone"], skin: "daybreak" }).owned, ["cozy", "midnight"]);
  assert.equal(clean({ owned: ["daybreak"], skin: "daybreak" }).skin, "cozy");
  assert.equal(clean({ owned: ["cozy"], skin: "sakura" }).skin, "cozy");
  assert.equal(clean({ owned: ["cozy"], skin: "sakura", plus: true }).skin, "sakura");
  assert.equal(clean({ owned: "cozy" }).owned[0], "cozy");
});

test("a damaged puzzle in progress is dropped", () => {
  const good = playing(8);
  assert.ok(clean({ play: good }).play);
  const broken = [
    Object.assign({}, good, { board: good.board.slice(0, 30) }),
    Object.assign({}, good, { board: good.board.map(() => 2) }),
    Object.assign({}, good, { edges: [{ a: 0, b: 99, type: "=" }] }),
    Object.assign({}, good, { edges: "none" }),
    Object.assign({}, good, { level: 0 }),
    Object.assign({}, good, { solution: undefined }),
    // a given square that no longer holds its cat
    Object.assign({}, good, { board: good.board.map((v, i) => good.givens[i] === -1 ? v : 1 - v) })
  ];
  for (const p of broken) assert.equal(clean({ play: p }).play, null);
});

test("puzzle in progress: bad history and time are repaired", () => {
  const p = Object.assign(playing(2), { history: [[3, -1], "x", [99, 0], [4, 1]], elapsed: "abc" });
  const out = clean({ play: p }).play;
  assert.deepEqual(out.history, [[3, -1], [4, 1]]);
  assert.equal(out.elapsed, 0);
});

test("fields from a newer version are kept", () => {
  assert.equal(clean({ somethingNew: { a: 1 } }).somethingNew.a, 1);
});
