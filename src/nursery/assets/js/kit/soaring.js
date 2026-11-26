// The soaring birds on one build: the golden and bald eagles, the red-tailed hawk, the turkey and
// African vultures and the crested serpent eagle. A bird is made of cells (swimmer.js's Cells), u along
// the width and v up. Seen from below (frontBird, head up): a wing is a ribbon from the shoulder through
// a wrist to the tip, its chord hanging toward the tail, and the primaries are separate fingers at the
// tip. It beats about the shoulder (the tip rises, drops and pulls in as the wing tilts), the hand
// trailing the arm. A bank lowers one wing and lifts the other, which is darker and sits partly behind
// the body; the stoop folds both. Seen from the side (sideBird), the wing swings round the shoulder: its
// lit upper face while it is up, its darker underside once it sweeps below the back; feet hang under it
// for a landing and a take-off. A perched bird (perchedBird) folds its wing over its side, looks about,
// blinks, preens and stretches a wing. flyers.js's eagleFlyAt, circlerAt, glideAt and hawkAt place and pose them. Palettes, from
// the scene: eagleGolden or eagleBald [dark, pale, tail, beak, silver], hawk [dark, pale, rufous, _,
// black, streak], vulture or vultureAfrica [dark, _, _, red, silver] and serpent [dark, _, _, yellow, _,
// white].

import { pulse } from "./build.js";
import { clamp, lerp, mix, rect, smooth } from "./pixel.js";
import { Cells } from "./swimmer.js";

const RAD = Math.PI / 180;
const hi = (c, n = 0.2) => mix(c, "#ffffff", n);
const lo = (c, n = 0.25) => mix(c, "#000000", n);

// ---- Species -----------------------------------------------------------------------------------

// What differs between the soaring birds: the wing (arm length a and hand length b from the shoulder
// at `root`, the chords c0, cw and ct along it, its resting dihedral and how far the hand sweeps
// back), the primaries (n fingers every `gap` columns, `len` long), the body and the tail.
const WINGS = {
  golden: { a: 4.2, b: 4.4, c0: 5, cw: 4.4, ct: 3, dih: 10, sweep: -6, up: 28, down: 40, n: 4, gap: 2, len: 2 },
  hawk: { a: 3.6, b: 3.4, c0: 4.6, cw: 4.2, ct: 3, dih: 6, sweep: -4, up: 28, down: 40, n: 3, gap: 2, len: 2 },
  vulture: { a: 4.6, b: 4.2, c0: 3.4, cw: 3.2, ct: 2.4, dih: 16, sweep: -2, up: 26, down: 38, n: 4, gap: 2, len: 2 },
  serpent: { a: 4.0, b: 4.4, c0: 5, cw: 4.6, ct: 3.2, dih: 8, sweep: -4, up: 28, down: 40, n: 4, gap: 2, len: 2 },
};

// Role colours for each kind, from the scene's palette: lead, mid and trail along the chord, tip the
// primaries, body, belly, head, beak and the tail with its band.
function roles(g, kind) {
  if (kind === "golden" || kind === "bald") {
    const [dark, pale, tail, beak, silver] = g.pal[kind === "golden" ? "eagleGolden" : "eagleBald"];
    return {
      lead: dark,
      mid: mix(dark, silver, 0.4),
      trail: silver,
      finger: silver,
      tip: dark,
      body: dark,
      belly: mix(dark, silver, 0.25),
      head: pale,
      beak,
      tail: kind === "bald" ? tail : dark,
      band: kind === "bald" ? tail : mix(dark, silver, 0.35),
    };
  }
  if (kind === "hawk") {
    const [dark, pale, rufous, , black, streak] = g.pal.hawk;
    return {
      lead: dark,
      mid: pale,
      trail: mix(pale, dark, 0.3),
      finger: mix(pale, dark, 0.45),
      tip: black,
      body: pale,
      belly: pale,
      streak,
      head: dark,
      beak: mix(dark, "#e0b838", 0.6),
      tail: rufous,
      band: rufous,
      belt: dark,
    };
  }
  if (kind === "vulture" || kind === "vultureAf") {
    const [dark, , , red, silver] = g.pal[kind === "vultureAf" ? "vultureAfrica" : "vulture"];
    return {
      lead: dark,
      mid: dark,
      trail: silver,
      finger: silver,
      tip: dark,
      body: dark,
      belly: dark,
      head: red,
      beak: mix(red, "#e8e0d0", 0.6),
      tail: dark,
      band: dark,
    };
  }
  const [dark, , , yellow, , white] = g.pal.serpent;
  return {
    lead: dark,
    mid: dark,
    trail: white,
    finger: white,
    tip: lo(dark, 0.5),
    body: dark,
    belly: mix(dark, white, 0.15),
    head: dark,
    beak: yellow,
    tail: dark,
    band: white,
    crest: mix(dark, white, 0.2),
  };
}

// ---- The wing, from below ----------------------------------------------------------------------

// Fills a ribbon along the points: at each step a column of `chord(s)` cells hanging down from the
// leading edge, so a wing tilted steeply is still one joined shape. Returns the cells by (u, v).
function ribbon(cells, pts, chordAt, roleAt) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    lens.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    total += lens[i - 1];
  }
  const steps = Math.ceil(total * 4);
  for (let k = 0; k <= steps; k += 1) {
    let d = (k / steps) * total;
    let i = 0;
    while (i < lens.length - 1 && d > lens[i]) {
      d -= lens[i];
      i += 1;
    }
    const t = lens[i] ? d / lens[i] : 0;
    const x = lerp(pts[i][0], pts[i + 1][0], t);
    const v = lerp(pts[i][1], pts[i + 1][1], t);
    const s = k / steps;
    const chord = Math.max(1, Math.round(chordAt(s)));
    const col = Math.floor(x);
    const top = Math.floor(v);
    for (let r = 0; r < chord; r += 1) {
      const role = roleAt(s, r, chord);
      if (role) cells.set(col, top - r, role);
    }
  }
}

// The wing's cells for the right side, in role letters, from its pose. `dIn` and `dOut` are the arm's and
// the hand's angle above level, `scale` shortens the wing and `fing` how much of its fingers show.
function wingRoles(W, root, dIn, dOut, scale, fing0) {
  const fing = fing0 * clamp(1.35 - Math.abs(dOut) / 28, 0, 1);
  const cells = new Cells();
  const a = W.a * scale;
  const b = W.b * scale;
  const wrist = [root[0] + a * Math.cos(dIn * RAD), root[1] + a * Math.sin(dIn * RAD)];
  const tip = [wrist[0] + b * Math.cos(dOut * RAD), wrist[1] + b * Math.sin(dOut * RAD)];
  const chordAt = (s) => {
    const k = a / (a + b);
    const c = s < k ? lerp(W.c0, W.cw, s / k) : lerp(W.cw, W.ct, (s - k) / (1 - k));
    return c * (0.55 + 0.45 * scale) * (1 - 0.4 * clamp(Math.abs(dIn) / 60, 0, 1));
  };
  ribbon(cells, [root, wrist, tip], chordAt, (s, r, chord) => {
    if (s > 0.94 && r === 0) return "tip";
    if (r === 0) return "lead";
    if (r === chord - 1 && chord > 1) return "trail";
    return "mid";
  });
  // The primaries: separate fingers hanging from the trailing edge near the tip.
  const n = Math.round(W.n * fing);
  const tipCol = Math.floor(tip[0]);
  for (let i = 0; i < n; i += 1) {
    const col = tipCol - i * W.gap;
    let low = null;
    for (const [u, v] of cells.values()) if (u === col && (low === null || v < low)) low = v;
    if (low === null) continue;
    const len = Math.max(1, Math.round(W.len * fing * (i === 0 ? 1 : i === 1 ? 1.2 : 1)));
    for (let j = 1; j <= len; j += 1) cells.set(col, low - j, j === len ? "tip" : "finger");
  }
  return cells;
}

// ---- The bird from below -----------------------------------------------------------------------

// The pose: `f` the wingbeat (1 up, 0 resting, -1 down), `v` how fast it is moving (1 rising, -1
// falling, the hand trails behind it), `bank` (1 lowers the right wing), `fold` (1 is the stoop).
export function frontBird(g, kind0, pose = {}) {
  const { f = 0, v = 0, bank = 0, fold = 0 } = pose;
  const R = roles(g, kind0);
  const kind = kind0 === "vultureAf" ? "vulture" : kind0;
  const W = WINGS[kind === "bald" ? "golden" : kind];
  const cells = new Cells();
  const dBase = W.dih + (f > 0 ? f * W.up : f * W.down);
  const root = [1.6, 3.0];
  const side = (sgn) => {
    // sgn 1 is the right wing. A bank lowers the near wing and raises the far one.
    const roll = bank * 17 * sgn;
    let dIn = dBase - roll;
    let dOut = dIn - W.sweep - 26 * v - (kind === "vulture" ? 4 : 0);
    dIn = lerp(dIn, -78, fold);
    dOut = lerp(dOut, -88, fold);
    const raised = bank * sgn < 0;
    const scale = lerp(1, 0.78, fold) * (raised ? 1 - 0.1 * Math.abs(bank) : 1);
    const w = wingRoles(W, root, dIn, dOut, scale, 1 - fold);
    const dark = raised ? clamp(Math.abs(bank) * 1.4, 0, 1) * 0.3 : 0;
    for (const [u, vv, role] of w.values()) {
      let c = R[role];
      if (dark) c = lo(c, dark);
      cells.set(sgn * u, vv, c);
    }
  };
  side(-1);
  side(1);
  // The body over the wing roots: head and beak, torso, tail.
  const sh = Math.abs(bank) > 0.45 ? Math.sign(bank) : 0;
  const body = bodyOf(kind, R, fold);
  for (const [u, vv, c] of body) cells.set(u + (vv >= 1 ? sh : vv <= -2 ? -sh : 0), vv, c);
  return light(cells);
}

// The body's cells as [u, v, colour]: the head and beak above, a torso, a tail below.
function bodyOf(kind, R, fold) {
  const out = [];
  const put = (u, v, c) => out.push([u, v, c]);
  const row = (v, w, c) => {
    for (let u = -(w >> 1); u <= w >> 1; u += 1) put(u, v, c);
  };
  const tailRows = {
    golden: [
      [3, "tail"],
      [5, "tail"],
      [5, "band"],
    ],
    bald: [
      [3, "tail"],
      [5, "tail"],
      [5, "tail"],
    ],
    hawk: [
      [3, "tail"],
      [5, "band"],
    ],
    vulture: [
      [3, "tail"],
      [5, "tail"],
    ],
    serpent: [
      [3, "tail"],
      [5, "band"],
      [5, "tail"],
    ],
  }[kind];
  const small = kind === "hawk" || kind === "vulture";
  // Torso: rows 2 to -1, belly down the middle.
  for (let v = 2; v >= (kind === "vulture" ? 0 : -1); v -= 1) {
    row(v, 3, R.body);
    if (R.belly !== R.body) put(0, v, R.belly);
  }
  if (kind === "hawk") {
    put(-1, -1, R.streak);
    put(1, -1, R.streak);
    put(0, 0, R.streak);
  }
  // The head: 3 wide for an eagle, 1 wide and red for a vulture, with the beak a row above.
  if (kind === "vulture") {
    put(0, 3, R.head);
    put(0, 4, R.beak);
  } else {
    row(3, small ? 3 : 3, R.head);
    put(0, 4, R.beak);
    if (kind === "serpent") {
      put(-1, 4, R.crest);
      put(1, 4, R.crest);
    }
  }
  // The tail.
  const long = Math.round(lerp(0, 0, fold));
  tailRows.forEach(([w, role], i) => {
    const ww = fold > 0.5 ? Math.min(w, 3) : w;
    row((kind === "vulture" ? -1 : -2) - i - long, ww, R[role]);
  });
  const named = out.map(([u, v, c]) => [u, v, typeof c === "string" ? c : c]);
  return named.map(([u, v, c]) => [u, v, R[c] ?? c]);
}

// The lit pass: a cell with sky above it is lifted, one with sky below it is shaded, and the
// bottom row under the belly darkest.
function light(cells) {
  const out = new Cells();
  for (const [u, v, c] of cells.values()) {
    const up = !cells.has(u, v + 1);
    const down = !cells.has(u, v - 1);
    out.set(u, v, up ? hi(c, 0.16) : down ? lo(c, 0.2) : c);
  }
  return out;
}

// Paints cells at (x, y) with `origin` ([u, v], the bird's own centre unless given) on that point, row v up,
// mirrored by `dir`. `alpha` fades it, for the cross-fade between two views of the same bird.
export function paint(g, cells, x, y, dir = 1, origin = [0, 0], alpha = 1) {
  if (alpha <= 0.01) return;
  const was = g.ctx.globalAlpha;
  g.ctx.globalAlpha = alpha;
  for (const [u, v, c] of cells.values()) {
    rect(g, c, Math.round(x) + (u - origin[0]) * dir, Math.round(y) - (v - origin[1]), 1, 1);
  }
  g.ctx.globalAlpha = was;
}

// ---- The eagle from the side ---------------------------------------------------------------------

// A golden or bald eagle in side view, facing right. The near wing swings round the shoulder from
// nearly straight up (f = 1) through the glide (0) to below the back (f = -1): a band two cells thick
// that bends at the wrist, flares into the hand and ends in three separate primaries. The far wing
// follows a little higher, darker, half behind the body. The top face of the wing is lit while it is
// up; its underside is darker once it sweeps below the back.

// A band `thick` cells wide from p0 to p1: runs across the minor axis at each step of the major one,
// so every step touches the last. `flare` widens it by that many cells at p1.
function band(cells, p0, p1, thick, flare, paintAt) {
  const [t0, t1] = Array.isArray(thick) ? thick : [thick, thick];
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const horiz = Math.abs(dx) >= Math.abs(dy);
  // Enough steps that no column or row is skipped, so a long band (a wing's hand) stays joined.
  const n = Math.max(1, Math.ceil(Math.abs(horiz ? dx : dy) - 1e-6));
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const x = p0[0] + dx * t;
    const y = p0[1] + dy * t;
    const w = Math.round(lerp(t0, t1, t)) + (i === n ? flare : 0);
    for (let k = 0; k < w; k += 1) {
      const off = k - Math.floor((w - 1) / 2);
      const u = Math.round(horiz ? x : x + off);
      const v = Math.round(horiz ? y + off : y);
      cells.set(u, v, paintAt(k, w, t));
    }
  }
}

export const SIDE_ORIGIN = [8, 1]; // the cell a side-on bird is placed by: the middle of its body

export function sideBird(g, kind, pose = {}) {
  const { f = 0, v = 0, feet = 0 } = pose;
  const R = roles(g, kind);
  const cells = new Cells();
  const psi = f >= 0 ? 150 - 50 * f : 150 - 62 * f; // degrees; 180 is straight back
  const turn = (a, b) => [Math.cos(a * RAD) * b, Math.sin(a * RAD) * b];
  const shoulder = [8, 2];
  const reach = 1 - 0.12 * Math.abs(f);
  const wingAt = (lift, len, shift, far) => {
    const ang = psi + lift;
    const under = ang > 184;
    const [ax, ay] = turn(ang, 4.1 * len * reach);
    const wrist = [shoulder[0] + shift[0] + ax, shoulder[1] + shift[1] + ay];
    const up = Math.max(f, 0);
    const handAng = ang + 14 + 26 * v + 34 * up;
    const [hx, hy] = turn(handAng, 4.2 * len * reach);
    const tip = [wrist[0] + hx, wrist[1] + hy];
    const tone = (c, top) => {
      let out = under ? lo(c, 0.22) : top ? hi(c, 0.2) : c;
      if (far) out = lo(out, 0.3);
      return out;
    };
    const start = [shoulder[0] + shift[0], shoulder[1] + shift[1]];
    band(cells, start, wrist, [3 + Math.round(up * 2), 3], 0, (k, w) =>
      tone(k === 0 ? R.lead : R.mid, k === (under ? w : 0)),
    );
    band(cells, wrist, tip, [3 + Math.round(up), 2 + Math.round(up)], far ? 0 : 2, (_k, _w, t) =>
      tone(t > 0.7 ? R.trail : R.mid, false),
    );
    // The primaries: from the hand's wide last column, three separate runs outward with gaps between.
    const steep = up < 0.3 && Math.abs(Math.sin(handAng * RAD)) > Math.abs(Math.cos(handAng * RAD));
    const sgn = steep ? Math.sign(hy) || 1 : up >= 0.3 ? -1 : Math.sign(hx) || -1;
    if (!far)
      [-1, 0, 1].forEach((o, i) => {
        for (let j = 1; j <= (i === 1 ? 2 : 1); j += 1) {
          const u = Math.round(steep ? tip[0] + o * 2 : tip[0] + sgn * j);
          const vv = Math.round(steep ? tip[1] + sgn * j : tip[1] + o * 2);
          cells.set(u, vv, tone(R.tip, false));
        }
      });
  };
  wingAt(-8, 0.86, [1, 0], true);
  // Tail, body, head: columns of cells, lit from above, shaded along the belly.
  const body = new Cells();
  for (let u = 0; u <= 4; u += 1) for (let vv = u < 2 ? 1 : 0; vv <= 1; vv += 1) body.set(u, vv, R.tail);
  if (kind === "bald") for (let vv = 0; vv <= 1; vv += 1) body.set(0, vv, R.band);
  for (let u = 4; u <= 11; u += 1) {
    const bottom = u === 4 || u === 11 ? 1 : 0;
    for (let vv = bottom; vv <= 2; vv += 1) body.set(u, vv, R.body);
  }
  for (let u = 11; u <= 12; u += 1) for (let vv = 2; vv <= 3; vv += 1) body.set(u, vv, R.head);
  body.set(11, 1, R.belly);
  body.set(13, 2, R.beak);
  body.set(14, 2, R.beak);
  body.set(14, 1, R.beak);
  body.set(12, 3, lo(R.head, 0.55)); // the eye
  // The feet, for a landing or a take-off: they hang under the belly, then reach forward.
  if (feet > 0.05) {
    const talon = R.beak;
    body.set(8, -1, talon);
    body.set(9, -1, talon);
    if (feet > 0.45) {
      body.set(10, -1, talon);
      body.set(11, -1, talon);
    }
    if (feet > 0.8) {
      body.set(12, -2, talon);
      body.set(12, -1, talon);
    }
    body.set(8, 0, R.belly);
    body.set(9, 0, R.belly);
  }
  for (const [u, vv, c] of body.values()) cells.set(u, vv, c);
  wingAt(0, 1, [0, 0], false);
  return lightSide(cells);
}

// The lit pass for the side view: sky above a cell lifts it, sky below shades it.
function lightSide(cells) {
  const out = new Cells();
  for (const [u, v, c] of cells.values()) {
    if (
      ![
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([a, b]) => cells.has(u + a, v + b))
    )
      continue; // no loose cells
    const up = !cells.has(u, v + 1);
    const down = !cells.has(u, v - 1);
    out.set(u, v, up ? hi(c, 0.1) : down ? lo(c, 0.16) : c);
  }
  return out;
}

// ---- Time ----------------------------------------------------------------------------------------

// The wingbeat as the bird is shown at t: slow beats now and then, each `n` beats of `period`
// seconds starting at `start`, eased in and out of the glide. Returns { f, v }.
export function beat(t, start, period, n) {
  const k = (t - start) / period;
  if (k <= 0 || k >= n) return { f: 0, v: 0 };
  const env = Math.sin((Math.PI * k) / n) ** 0.5;
  const ph = 2 * Math.PI * k;
  return { f: Math.sin(ph) * env, v: Math.cos(ph) * env };
}

// How the bird leans on its circle: `a` is where it is on the loop. At each end of the loop it banks
// into the turn and eases level along the straight run, the lean never snapping when it turns round.
export function bankAt(a) {
  const k = 1 - smooth(clamp(Math.abs(Math.sin(a)) / 0.55, 0, 1));
  return Math.cos(a) >= 0 ? k : -k;
}

// ---- The hawk's stoop ----------------------------------------------------------------------------

// The pose at t seconds from the start of the stoop: it closes, falls, opens at the bottom and beats back up.
export function stoopPose(t) {
  // t in seconds from the start of the stoop: closes, falls, opens at the bottom, beats back up.
  const fold = smooth(clamp(t / 0.35, 0, 1)) * (1 - smooth(clamp((t - 1.0) / 0.35, 0, 1)));
  const k = (t - 1.2) / 0.45;
  const beatOn = k > 0 && k < 4;
  const f = beatOn ? Math.sin(2 * Math.PI * k) * Math.sin((Math.PI * k) / 4) ** 0.5 : 0;
  const v = beatOn ? Math.cos(2 * Math.PI * k) * Math.sin((Math.PI * k) / 4) ** 0.5 : 0;
  return { fold, f, v };
}

// ---- Perched -------------------------------------------------------------------------------------

export const PERCH_ORIGIN = [4, 0]; // the cell a perched bird is placed by: under its feet, v 1 the row above the perch

// What a perched bird does, each move on its own timer (critters.js percher): a look about, a blink, a
// preen and a wing stretch.
export const PERCH_MOVES = {
  look: { every: [3, 7], lasts: 2 },
  blink: { every: [2, 5], lasts: 0.35 },
  preen: { every: [8, 15], lasts: 2.5 },
  stretch: { every: [14, 24], lasts: 2.6 },
};

// Where the head and the wing are, from how far through each move the bird is (0..1, or -1 for none; see
// critters.js doing). `time` drives the breathing.
export function perchPose(p, time) {
  const at = (u, a, m, n, b) => (u < 0 ? 0 : pulse(u, a, m, n, b));
  return {
    look: at(p.look, 0, 0.25, 0.75, 1),
    preen: at(p.preen, 0, 0.25, 0.75, 1),
    stretch: Math.max(at(p.stretch, 0, 0.3, 0.7, 1), p.hold ?? 0),
    blink: at(p.blink, 0, 0.3, 0.6, 1),
    breathe: Math.sin(time * 2.2) > 0.4 ? 1 : 0,
  };
}

// A perched bird in side view, facing right, its feet on the row v 1 and its tail hanging below the perch.
export function perchedBird(g, kind, p) {
  const R = roles(g, kind);
  const small = kind === "hawk";
  const cells = new Cells();
  const put = (u, v, c) => cells.set(u, v, c);
  const run = (v, u0, u1, c) => {
    for (let u = u0; u <= u1; u += 1) put(u, v, c);
  };
  const b = p.breathe;
  // The tail hangs below the perch, then the body and its belly.
  for (let v = -2; v <= 2; v += 1) run(v, 1, 2 + (v > 0 ? 1 : 0), R.tail);
  const top = small ? 6 : 7;
  for (let v = 1; v <= top; v += 1) {
    const u0 = v < 3 ? 3 : 2;
    const u1 = v === top ? 5 : v > top - 2 ? 6 + b * (v === top - 1 ? 1 : 0) : 6;
    run(v, u0, u1, R.body);
  }
  run(3, 6, 6, R.belly);
  // The feet, on the perch.
  put(4, 1, R.beak);
  put(5, 1, R.beak);
  // The folded wing over the side, its flight feathers reaching the tail.
  for (let v = 2; v <= top - 1; v += 1) run(v, 3, 5, v === 2 ? R.trail : R.mid);
  put(2, 1, R.tip);
  put(3, 1, R.tip);
  // The wing stretch: the near wing opens up and back from the shoulder, then folds again.
  if (p.stretch > 0.02) {
    const ang = 215 - 100 * p.stretch;
    const reach = 3 + 4 * p.stretch;
    const from = [5, top - 1];
    const to = [from[0] + Math.cos(ang * RAD) * reach, from[1] + Math.sin(ang * RAD) * reach];
    band(cells, from, to, [2, 2], 1, (k, _w, t) => (t > 0.8 ? R.tip : k === 0 ? hi(R.lead) : R.mid));
  }
  // The head rides on the shoulders: a look turns it forward and up, a preen dips it to the wing.
  const dip = Math.round(p.preen * 3);
  const hx = 6 + Math.round(p.look) - Math.round(p.preen * 2);
  const hy = top + 1 - dip + Math.round(p.look * 0.5);
  run(hy, hx, hx + 1, R.head);
  run(hy - 1, hx, hx + 1, R.head);
  // The neck keeps the head joined, whether the head is down (a preen) or up above the shoulders (a look).
  for (let v = Math.min(top, hy); v <= Math.max(top, hy - 1); v += 1) put(Math.min(hx, 6), v, R.body);
  put(hx + 2, hy, R.beak);
  put(hx + 2, hy - 1, R.beak);
  put(hx + 2, hy - 2 + (p.preen > 0.5 ? 0 : 1), R.beak);
  put(hx + 1, hy, p.blink > 0.5 ? R.head : lo(R.head, 0.6));
  const out = new Cells();
  for (const [u, v, c] of cells.values()) {
    out.set(u, v, !cells.has(u, v + 1) ? hi(c, 0.18) : !cells.has(u, v - 1) && v > 0 ? lo(c, 0.22) : c);
  }
  return out;
}
