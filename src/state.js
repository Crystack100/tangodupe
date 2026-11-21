// Saved game checks. Plain JavaScript, no DOM, so it can be tested on its own.
// A save can come back damaged: written by an older version, cut short, or edited by hand.
// `clean` keeps every part that still makes sense and drops the rest, so a bad save never
// stops the game from starting and never wipes the progress that is still good.
var PurrzleState = (function () {
  var CELLS = 36;
  function obj(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : null; }
  function int(x, lo, hi, dflt) {
    var n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? +x : NaN;
    if (!isFinite(n)) return dflt;
    n = Math.round(n);
    return n < lo ? lo : n > hi ? hi : n;
  }
  // { key: value } keeping only entries whose key passes `keyOk` and whose value is a whole number in range.
  function counts(x, keyOk, lo, hi) {
    var out = {}, src = obj(x);
    if (!src) return out;
    Object.keys(src).forEach(function (k) {
      var v = int(src[k], lo, hi, null);
      if (keyOk(k) && v !== null && typeof src[k] !== "boolean") out[k] = v;
    });
    return out;
  }
  function levelKey(k) { return /^[1-9]\d{0,8}$/.test(k); }
  function timeKey(k) { return /^d?[1-9]\d{0,8}$/.test(k); }
  function cellsOk(a, allowEmpty) {
    return Array.isArray(a) && a.length === CELLS && a.every(function (v) { return v === 0 || v === 1 || (allowEmpty && v === -1); });
  }
  // A puzzle in progress: only kept if every part is the right shape.
  function cleanPlay(p) {
    p = obj(p);
    if (!p || !cellsOk(p.board, true) || !cellsOk(p.givens, true) || !cellsOk(p.solution, false)) return null;
    if (!Array.isArray(p.edges) || !p.edges.every(function (e) {
      return obj(e) && int(e.a, 0, CELLS - 1, -1) === e.a && int(e.b, 0, CELLS - 1, -1) === e.b && (e.type === "=" || e.type === "x");
    })) return null;
    if (int(p.level, 1, 1e9, null) !== p.level) return null;
    // A given square must hold its given cat.
    for (var i = 0; i < CELLS; i++) if (p.givens[i] !== -1 && p.board[i] !== p.givens[i]) return null;
    var out = {};
    for (var k in p) out[k] = p[k];
    out.elapsed = int(p.elapsed, 0, 86400 * 365, 0);
    out.history = Array.isArray(p.history) ? p.history.filter(function (h) {
      return Array.isArray(h) && h.length === 2 && int(h[0], 0, CELLS - 1, -1) === h[0] && (h[1] === -1 || h[1] === 0 || h[1] === 1);
    }) : [];
    out.done = !!p.done;
    if (["easy", "medium", "hard"].indexOf(p.difficulty) < 0) out.difficulty = "hard";
    return out;
  }
  // raw: what was read from storage. base: the defaults. skins: the skin ids this version knows.
  function clean(raw, base, skins) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    raw = obj(raw);
    if (!raw) return out;
    // Unknown fields are kept as they are, so a newer version's data survives a trip through an older one.
    for (k in raw) if (!(k in base)) out[k] = raw[k];
    out.best = counts(raw.best, levelKey, 1, 3);
    out.daily = counts(raw.daily, levelKey, 1, 3);
    out.times = counts(raw.times, timeKey, 1, 86400 * 365);
    out.wallet = int(raw.wallet, 0, 1e7, base.wallet);
    out.wins = int(raw.wins, 0, 1e9, base.wins);
    out.music = int(raw.music, 0, 100, base.music);
    out.sound = int(raw.sound, 0, 100, base.sound);
    var owned = Array.isArray(raw.owned) ? raw.owned : [];
    owned = owned.map(function (id) { return id === "daybreak" ? "cozy" : id; })
      .filter(function (id, i, a) { return typeof id === "string" && (!skins || skins.indexOf(id) >= 0) && a.indexOf(id) === i; });
    if (owned.indexOf("cozy") < 0) owned.unshift("cozy");
    out.owned = owned;
    var skin = raw.skin === "daybreak" ? "cozy" : raw.skin;
    out.skin = typeof skin === "string" && (!skins || skins.indexOf(skin) >= 0) && (owned.indexOf(skin) >= 0 || raw.plus) ? skin : "cozy";
    ["noAds", "plus", "tutDone", "calm", "marks"].forEach(function (f) { if (f in raw) out[f] = !!raw[f]; });
    if ("remind" in raw) out.remind = raw.remind == null ? raw.remind : !!raw.remind;
    out.play = cleanPlay(raw.play);
    var free = obj(raw.free);
    if (free) out.free = { day: int(free.day, 0, 99991231, 0), n: int(free.n, 0, 1000, 0) };
    if ("adsSeen" in raw) out.adsSeen = int(raw.adsSeen, 0, 1e9, 0);
    return out;
  }
  return { clean: clean, cleanPlay: cleanPlay };
})();
if (typeof module !== "undefined") module.exports = PurrzleState;
