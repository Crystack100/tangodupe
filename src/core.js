// Tango puzzle core: generator, solver and rule checker. Pure logic, no DOM.
// Cell values: -1 empty, 0 sun, 1 moon. Board is a flat array of N*N.
// Edge constraints: {a, b, type} where type is "=" (same) or "x" (different).
var TangoCore = (function () {
  var N = 6, HALF = N / 2;

  function rng(seed) {
    // mulberry32
    var t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rand) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // Edges touching each cell, built per puzzle.
  function edgeIndex(edges) {
    var idx = [];
    for (var i = 0; i < N * N; i++) idx.push([]);
    edges.forEach(function (e) { idx[e.a].push(e); idx[e.b].push(e); });
    return idx;
  }

  // Is placing board[i] consistent with the rules, given the rest of the board?
  function okAt(board, i, eidx) {
    var v = board[i], r = Math.floor(i / N), c = i % N, k, cnt;
    // row / column counts
    cnt = 0; for (k = 0; k < N; k++) if (board[r * N + k] === v) cnt++;
    if (cnt > HALF) return false;
    cnt = 0; for (k = 0; k < N; k++) if (board[k * N + c] === v) cnt++;
    if (cnt > HALF) return false;
    // no three alike in a line, any window containing i
    for (k = Math.max(0, c - 2); k <= Math.min(N - 3, c); k++) {
      var a = board[r * N + k];
      if (a !== -1 && a === board[r * N + k + 1] && a === board[r * N + k + 2]) return false;
    }
    for (k = Math.max(0, r - 2); k <= Math.min(N - 3, r); k++) {
      var b = board[k * N + c];
      if (b !== -1 && b === board[(k + 1) * N + c] && b === board[(k + 2) * N + c]) return false;
    }
    // edge constraints
    if (eidx) {
      var es = eidx[i];
      for (k = 0; k < es.length; k++) {
        var e = es[k], o = board[e.a === i ? e.b : e.a];
        if (o === -1) continue;
        if (e.type === "=" ? o !== v : o === v) return false;
      }
    }
    return true;
  }

  // Count solutions up to `limit`. Returns {count, solution}.
  function solve(givens, edges, limit) {
    var board = givens.slice(), eidx = edgeIndex(edges), count = 0, first = null;
    for (var i = 0; i < N * N; i++) if (board[i] !== -1 && !okAt(board, i, eidx)) return { count: 0, solution: null };
    function rec(pos) {
      while (pos < N * N && board[pos] !== -1) pos++;
      if (pos === N * N) { count++; if (!first) first = board.slice(); return count >= limit; }
      for (var v = 0; v < 2; v++) {
        board[pos] = v;
        if (okAt(board, pos, eidx) && rec(pos + 1)) { board[pos] = -1; return true; }
      }
      board[pos] = -1;
      return false;
    }
    rec(0);
    return { count: count, solution: first };
  }

  function randomSolution(rand) {
    var board = new Array(N * N).fill(-1);
    function rec(pos) {
      if (pos === N * N) return true;
      var order = rand() < 0.5 ? [0, 1] : [1, 0];
      for (var k = 0; k < 2; k++) {
        board[pos] = order[k];
        if (okAt(board, pos, null) && rec(pos + 1)) return true;
      }
      board[pos] = -1;
      return false;
    }
    rec(0);
    return board;
  }

  function allEdges() {
    var out = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var i = r * N + c;
      if (c < N - 1) out.push([i, i + 1]);
      if (r < N - 1) out.push([i, i + N]);
    }
    return out;
  }

  /* ---------- Logic solver ----------
     Finds the next cell a person can work out without guessing, and says why.
     Tier 1 rules: a sign next to a placed cat, two alike side by side, a gap between two alike,
     and a line that already has its 3 of one cat. Tier 2 adds "line logic": try a cat in a cell and
     see that its row or column can no longer be finished. Every level must be solvable this way. */
  var NAMES = ["Sunny", "Luna"];
  function lineName(isRow, n) { return (isRow ? "row " : "column ") + (n + 1); }
  function lines() {
    var out = [], r, c, k;
    for (r = 0; r < N; r++) { var a = []; for (k = 0; k < N; k++) a.push(r * N + k); out.push({ cells: a, row: true, n: r }); }
    for (c = 0; c < N; c++) { var b = []; for (k = 0; k < N; k++) b.push(k * N + c); out.push({ cells: b, row: false, n: c }); }
    return out;
  }
  var LINES = lines();
  function nextStep(board, edges, tier) {
    var i, k, L, e, v;
    // 1. A sign next to a placed cat.
    for (k = 0; k < edges.length; k++) {
      e = edges[k];
      var x = board[e.a], y = board[e.b];
      if ((x === -1) === (y === -1)) continue;
      var empty = x === -1 ? e.a : e.b, known = x === -1 ? y : x;
      v = e.type === "=" ? known : 1 - known;
      return { i: empty, v: v, cells: [x === -1 ? e.b : e.a], rule: "sign",
        why: e.type === "=" ? "The = sign means both cats match, so this one is " + NAMES[v] + " too."
                            : "The \u00d7 sign means the cats are opposite, so this one is " + NAMES[v] + "." };
    }
    for (var l = 0; l < LINES.length; l++) {
      L = LINES[l]; var c = L.cells, nm = lineName(L.row, L.n);
      for (k = 0; k < N; k++) {
        // 2. Two alike side by side: the cells on either end take the other cat.
        if (k + 1 < N && board[c[k]] !== -1 && board[c[k]] === board[c[k + 1]]) {
          v = 1 - board[c[k]];
          var ends = [k - 1, k + 2];
          for (var q = 0; q < 2; q++) if (ends[q] >= 0 && ends[q] < N && board[c[ends[q]]] === -1)
            return { i: c[ends[q]], v: v, cells: [c[k], c[k + 1]], rule: "pair",
              why: "Two " + NAMES[1 - v] + "s are already side by side. A third would make 3 in a row, so this one is " + NAMES[v] + "." };
        }
        // 3. A gap between two alike.
        if (k + 2 < N && board[c[k]] !== -1 && board[c[k]] === board[c[k + 2]] && board[c[k + 1]] === -1)
          return { i: c[k + 1], v: 1 - board[c[k]], cells: [c[k], c[k + 2]], rule: "gap",
            why: "A " + NAMES[board[c[k]]] + " on each side. Another one in the middle would make 3 in a row, so this one is " + NAMES[1 - board[c[k]]] + "." };
      }
      // 4. A line that already has its 3 of one cat.
      var cnt = [0, 0], holes = [];
      for (k = 0; k < N; k++) { if (board[c[k]] === -1) holes.push(c[k]); else cnt[board[c[k]]]++; }
      for (v = 0; v < 2; v++) if (cnt[v] === HALF && holes.length)
        return { i: holes[0], v: 1 - v, cells: c.filter(function (j) { return board[j] === v; }), rule: "count",
          why: nm.charAt(0).toUpperCase() + nm.slice(1) + " already has its 3 " + NAMES[v] + "s, so the rest are " + NAMES[1 - v] + "." };
    }
    if (tier < 2) return null;
    // 5. Line logic: one cat in this cell leaves the row or column with no legal way to finish.
    var eidx = edgeIndex(edges);
    for (l = 0; l < LINES.length; l++) {
      L = LINES[l]; var cs = L.cells, hole = cs.filter(function (j) { return board[j] === -1; });
      if (!hole.length) continue;
      var seen = hole.map(function () { return [false, false]; }), any = false, b = board.slice();
      for (var m = 0; m < (1 << hole.length); m++) {
        var ok = true;
        for (k = 0; k < hole.length; k++) b[hole[k]] = (m >> k) & 1;
        for (k = 0; k < hole.length && ok; k++) ok = okAt(b, hole[k], eidx);
        if (!ok) continue;
        any = true;
        for (k = 0; k < hole.length; k++) seen[k][(m >> k) & 1] = true;
      }
      if (!any) return null;
      for (k = 0; k < hole.length; k++) if (seen[k][0] !== seen[k][1]) {
        v = seen[k][0] ? 0 : 1;
        return { i: hole[k], v: v, cells: cs.filter(function (j) { return board[j] !== -1; }), rule: "line",
          why: "Try " + NAMES[1 - v] + " here and " + lineName(L.row, L.n) + " can't be finished without breaking a rule (3 of each, no 3 in a row, and the signs). So it must be " + NAMES[v] + "." };
      }
    }
    return null;
  }
  // Can a person solve this from the givens, step by step, with no guessing?
  function logicSolvable(givens, edges, tier) {
    var b = givens.slice(), s;
    while ((s = nextStep(b, edges, tier))) b[s.i] = s.v;
    return b.every(function (x) { return x !== -1; });
  }

  // difficulty: "easy" | "medium" | "hard"
  function generate(seed, difficulty) {
    var rand = rng(seed);
    var sol = randomSolution(rand);
    var nEdges = difficulty === "hard" ? 5 + Math.floor(rand() * 3) : 7 + Math.floor(rand() * 3);
    var edges = shuffle(allEdges(), rand).slice(0, nEdges).map(function (p) {
      return { a: p[0], b: p[1], type: sol[p[0]] === sol[p[1]] ? "=" : "x" };
    });
    var givens = sol.slice(), tier = difficulty === "easy" ? 1 : 2;
    // Strip givens while the puzzle can still be solved by logic alone (which also means one solution).
    var removed = [];
    shuffle(Array.from({ length: N * N }, function (_, i) { return i; }), rand).forEach(function (i) {
      var keep = givens[i];
      givens[i] = -1;
      if (!logicSolvable(givens, edges, tier)) givens[i] = keep;
      else removed.push(i);
    });
    // Then try dropping edge clues too, for a leaner hard puzzle.
    if (difficulty === "hard") {
      for (var k = edges.length - 1; k >= 0; k--) {
        var e = edges.splice(k, 1)[0];
        if (!logicSolvable(givens, edges, tier)) edges.splice(k, 0, e);
      }
    } else if (difficulty === "easy") {
      // Easy: hand back a few cells so there are more footholds.
      shuffle(removed, rand).slice(0, 4).forEach(function (i) { givens[i] = sol[i]; });
    }
    return { size: N, givens: givens, edges: edges, solution: sol, seed: seed, difficulty: difficulty };
  }

  // Find rule breaks on a player board. Returns sets of cell indexes and edge indexes.
  function check(board, edges) {
    var badCells = new Set(), badEdges = new Set(), triples = new Set(), runs = [], r, c, k;
    function line(get) {
      var cnt = [0, 0], idx = [];
      for (k = 0; k < N; k++) { idx.push(get(k)); if (board[get(k)] !== -1) cnt[board[get(k)]]++; }
      [0, 1].forEach(function (v) {
        if (cnt[v] > HALF) idx.forEach(function (i) { if (board[i] === v) badCells.add(i); });
      });
      var run = null, runEnd = -1;
      for (k = 0; k + 2 < N; k++) {
        var a = board[idx[k]];
        if (a !== -1 && a === board[idx[k + 1]] && a === board[idx[k + 2]]) {
          badCells.add(idx[k]); badCells.add(idx[k + 1]); badCells.add(idx[k + 2]);
          triples.add(idx[k]); triples.add(idx[k + 1]); triples.add(idx[k + 2]);
          // A run of four or more is one long run, not overlapping threes.
          if (run && runEnd === k + 1) { run.push(idx[k + 2]); runEnd = k + 2; } else { run = [idx[k], idx[k + 1], idx[k + 2]]; runEnd = k + 2; runs.push(run); }
        }
      }
    }
    for (r = 0; r < N; r++) line(function (k) { return r * N + k; });
    for (c = 0; c < N; c++) line(function (k) { return k * N + c; });
    edges.forEach(function (e, j) {
      var x = board[e.a], y = board[e.b];
      if (x === -1 || y === -1) return;
      if (e.type === "=" ? x !== y : x === y) { badEdges.add(j); badCells.add(e.a); badCells.add(e.b); }
    });
    var full = board.every(function (v) { return v !== -1; });
    return { badCells: badCells, badEdges: badEdges, triples: triples, runs: runs, solved: full && badCells.size === 0 };
  }

  // Level n always maps to the same puzzle, so levels are unlimited and repeatable.
  function levelDifficulty(n) { return n <= 5 ? "easy" : n <= 20 ? "medium" : "hard"; }
  function level(n) {
    var seed = (Math.imul(n, 2654435761) ^ 0x5bd1e995) >>> 0;
    var p = generate(seed, levelDifficulty(n));
    p.level = n;
    return p;
  }
  // Seconds needed for 3 and 2 stars; anything slower still earns 1 star.
  var STAR_TIMES = { easy: [40, 90], medium: [60, 150], hard: [90, 240] };
  function stars(difficulty, seconds) {
    var t = STAR_TIMES[difficulty];
    return seconds <= t[0] ? 3 : seconds <= t[1] ? 2 : 1;
  }

  return { N: N, generate: generate, level: level, levelDifficulty: levelDifficulty,
    STAR_TIMES: STAR_TIMES, stars: stars, solve: solve, check: check, rng: rng,
    nextStep: nextStep, logicSolvable: logicSolvable };
})();
if (typeof module !== "undefined") module.exports = TangoCore;
