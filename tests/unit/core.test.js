// Puzzle generator, solver and rule checker (src/core.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const T = require("../../src/core.js");

const N = T.N;
const LEVELS = [...Array(60).keys()].map(i => i + 1).concat([99, 100, 101, 250, 1000, 5000, 123456]);

test("each level is always the same puzzle", () => {
  for (const n of [1, 7, 42, 999]) assert.deepEqual(T.level(n), T.level(n));
});

// If these change, every player's saved board and level history points at a different puzzle.
// Changing the generator on purpose? Update the hashes and bump PUZZLE_V in src/game.html.
test("levels match the published puzzles", () => {
  const hash = n => { const p = T.level(n); return crypto.createHash("sha1").update(JSON.stringify([p.givens, p.edges, p.solution])).digest("hex").slice(0, 12); };
  assert.deepEqual(Object.fromEntries([1, 2, 6, 21, 100, 1000].map(n => [n, hash(n)])),
    { 1: "81bb33526a5d", 2: "f45363147913", 6: "24f8bdd4bc3d", 21: "32b509b1b774", 100: "d1465cac370b", 1000: "d31bfd0833be" });
});

test("every level has one answer, reachable without guessing", () => {
  for (const n of LEVELS) {
    const p = T.level(n);
    assert.equal(p.givens.length, N * N);
    assert.ok(T.check(p.solution, p.edges).solved, "solution breaks a rule on level " + n);
    p.givens.forEach((v, i) => { if (v !== -1) assert.equal(v, p.solution[i], "given differs from answer on level " + n); });
    p.edges.forEach(e => assert.equal(e.type, p.solution[e.a] === p.solution[e.b] ? "=" : "x"));
    assert.equal(T.solve(p.givens, p.edges, 2).count, 1, "level " + n + " has more than one answer");
    assert.ok(T.logicSolvable(p.givens, p.edges, 1), "level " + n + " needs guessing");
  }
});

test("difficulty rises with the level", () => {
  assert.equal(T.levelDifficulty(1), "easy");
  assert.equal(T.levelDifficulty(5), "easy");
  assert.equal(T.levelDifficulty(6), "medium");
  assert.equal(T.levelDifficulty(20), "medium");
  assert.equal(T.levelDifficulty(21), "hard");
});

test("stars depend on solve time", () => {
  for (const d of ["easy", "medium", "hard"]) {
    const [three, two] = T.STAR_TIMES[d];
    assert.equal(T.stars(d, 0), 3);
    assert.equal(T.stars(d, three), 3);
    assert.equal(T.stars(d, three + 1), 2);
    assert.equal(T.stars(d, two), 2);
    assert.equal(T.stars(d, two + 1), 1);
    assert.equal(T.stars(d, 99999), 1);
  }
});

test("hints walk the whole puzzle, and every step is right", () => {
  for (const n of [1, 10, 30, 77]) {
    const p = T.level(n), b = p.givens.slice();
    let s, steps = 0;
    while ((s = T.nextStep(b, p.edges, 1))) {
      assert.equal(s.v, p.solution[s.i], "wrong hint on level " + n);
      assert.ok(s.why.length > 10);
      b[s.i] = s.v; steps++;
    }
    assert.deepEqual(b, p.solution);
    assert.ok(steps > 0);
  }
});

const empty = () => new Array(N * N).fill(-1);
test("three alike in a row is flagged, a run of four is one run", () => {
  const b = empty();
  b[0] = b[1] = b[2] = b[3] = 0;
  const r = T.check(b, []);
  assert.deepEqual([...r.triples].sort((x, y) => x - y), [0, 1, 2, 3]);
  assert.equal(r.runs.length, 1);
  assert.deepEqual(r.runs[0], [0, 1, 2, 3]);
  assert.equal(r.solved, false);
});

test("more than three of one cat in a line is flagged", () => {
  const b = empty();
  b[0] = b[2] = b[4] = b[5] = 1; // column-wise no triples, row has 4 Lunas
  const r = T.check(b, []);
  for (const i of [0, 2, 4, 5]) assert.ok(r.badCells.has(i));
  assert.equal(r.triples.size, 0);
});

test("broken signs are flagged, kept signs are not", () => {
  const b = empty();
  b[0] = 0; b[1] = 1; b[6] = 0;
  const r = T.check(b, [{ a: 0, b: 1, type: "=" }, { a: 0, b: 6, type: "=" }, { a: 1, b: 7, type: "x" }]);
  assert.deepEqual([...r.badEdges], [0]);
  assert.ok(r.badCells.has(0) && r.badCells.has(1));
  assert.ok(!r.badCells.has(6));
});

test("the solver finds the answer and counts extra ones", () => {
  const p = T.level(3);
  assert.deepEqual(T.solve(p.givens, p.edges, 1).solution, p.solution);
  // A blank board with no signs has many answers.
  assert.equal(T.solve(empty(), [], 5).count, 5);
  // A board that already breaks a rule has none.
  const bad = empty(); bad[0] = bad[1] = bad[2] = 0;
  assert.equal(T.solve(bad, [], 2).count, 0);
});
