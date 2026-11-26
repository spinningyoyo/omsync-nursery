// The swimmers, built from parts: the Hawaiian monk seal and her pup, the Asian small-clawed otter and
// the humpback whale. Every animal is built from capsules in cells (u along the body from the rear, v
// up from the ground, facing right): a capsule is a thick line with a radius at each end, filled cell by
// cell, so a body that bends, arches, rises or rolls stays one joined shape. Each cell takes its tone
// from how far it faces the light (from above), so four tones follow the body whatever its pose. A last
// pass (tidy) fills gaps and drops stray or corner-only cells. sealAt, otterAt and whaleAt (below)
// place and pose them; sealCycle and boundBeat give the walks, sealRest, otterRest and the whale's
// event time the rest. Palettes: the scene's seal ([back, belly, eye]), otter ([brown, dark, pale]) and
// whale ([back, light]) with sea and groundShadow (the soft shadow on land) beside them.
import { clamp, lerp, mix, shadowColour, smooth } from "./pixel.js";
import { stillOf, tonesFor } from "./place.js";

// ---- Cells ---------------------------------------------------------------------------------------

const key = (u, v) => `${u},${v}`;
export class Cells {
  constructor() {
    this.m = new Map();
  }
  set(u, v, c) {
    if (c) this.m.set(key(u, v), [u, v, c]);
  }
  get(u, v) {
    return this.m.get(key(u, v))?.[2] ?? null;
  }
  has(u, v) {
    return this.m.has(key(u, v));
  }
  del(u, v) {
    this.m.delete(key(u, v));
  }
  values() {
    return [...this.m.values()];
  }
}

const LIGHT = (() => {
  const x = -0.35;
  const y = 0.94;
  const n = Math.hypot(x, y);
  return [x / n, y / n];
})();

// Fills every cell whose centre lies within the capsule a-b (radius ra at a, rb at b). `tone(lit, nx,
// ny, t)` returns its colour: lit is how far the cell faces the light, -1 to 1.
export function capsule(cells, [ax, ay], [bx, by], ra, rb, tone, vmin = 0) {
  const r = Math.max(ra, rb);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  for (let u = Math.floor(Math.min(ax, bx) - r); u <= Math.ceil(Math.max(ax, bx) + r); u++) {
    for (let v = Math.floor(Math.min(ay, by) - r); v <= Math.ceil(Math.max(ay, by) + r); v++) {
      if (v < vmin) continue;
      const cx = u + 0.5;
      const cy = v + 0.5;
      const t = clamp(((cx - ax) * dx + (cy - ay) * dy) / len2, 0, 1);
      const px = ax + t * dx;
      const py = ay + t * dy;
      const rr = ra + (rb - ra) * t;
      const d = Math.hypot(cx - px, cy - py);
      if (d > rr) continue;
      const nx = (cx - px) / Math.max(rr, 0.01);
      const ny = (cy - py) / Math.max(rr, 0.01);
      cells.set(u, v, tone(nx * LIGHT[0] + ny * LIGHT[1], nx, ny, t));
    }
  }
}

// Fills one-cell holes, joins cells that meet only at a corner and drops lone cells. `keep` cells
// (a Set of "u,v") are left alone.
export function tidy(cells, keep = null, vmin = 0) {
  const N4 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let pass = 0; pass < 3; pass++) {
    const all = cells.values();
    if (!all.length) return;
    const us = all.map((c) => c[0]);
    const vs = all.map((c) => c[1]);
    const u0 = Math.min(...us) - 1;
    const u1 = Math.max(...us) + 1;
    const v0 = Math.min(...vs) - 1;
    const v1 = Math.max(...vs) + 1;
    for (let u = u0; u <= u1; u++) {
      for (let v = Math.max(v0, vmin); v <= v1; v++) {
        if (cells.has(u, v)) continue;
        const nb = N4.map(([a, b]) => cells.get(u + a, v + b)).filter(Boolean);
        if (nb.length >= 3) cells.set(u, v, nb[0]);
      }
    }
    for (const [u, v, c] of cells.values()) {
      for (const [a, b] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        if (!cells.has(u + a, v + b) || cells.has(u + a, v) || cells.has(u, v + b)) continue;
        const bv = v + Math.max(b, 0);
        const target = b < 0 ? [u + a, v] : [u, v + b];
        if (target[1] >= vmin && bv >= vmin) cells.set(target[0], target[1], c);
      }
    }
    for (const [u, v] of cells.values()) {
      if (keep?.has(key(u, v))) continue;
      if (!N4.some(([a, b]) => cells.has(u + a, v + b))) cells.del(u, v);
    }
  }
}

// ---- Painting ------------------------------------------------------------------------------------

function paintCells(g, cells, ox, y, dir, shadow = true, shadowSpan = null) {
  const X = (u) => (dir > 0 ? ox + u : ox - u);
  g.ctx.fillStyle = shadowColour(g.pal);
  if (shadow) {
    const cols = new Set();
    for (const [u, v] of cells.values()) if (v <= (shadowSpan ?? 2)) cols.add(u);
    for (const u of cols) g.ctx.fillRect(X(u), y, 1, 1);
  }
  for (const [u, v, c] of cells.values()) {
    g.ctx.fillStyle = c;
    g.ctx.fillRect(X(u), y - 1 - v, 1, 1);
  }
}

// ---- The seal ------------------------------------------------------------------------------------

// pale (0 to 1) makes the coat paler, for the pup.
export function sealTones(g, pale = 0) {
  const [back0, belly0, eye] = g.pal.seal;
  const back = mix(back0, belly0, pale);
  const belly = mix(belly0, "#ffffff", pale * 0.3);
  return {
    H: mix(back, belly, 0.3),
    T: back,
    P: belly,
    U: mix(belly, back, 0.3),
    Pl: mix(belly, "#ffffff", 0.3),
    S2: mix(belly, back, 0.3),
    flip: mix(back, "#000000", 0.2),
    far: mix(back, "#000000", 0.42),
    muzzle: mix(back, "#000000", 0.38),
    eye,
    nose: mix(eye, "#000000", 0.2),
  };
}

// pose: k (scale, 1 or 0.6 for the pup), len (body length 17 to 20), arch (the back humping, 0 to
// 1), chest (the front end lifted, 0 to 1), hl (the head lifted, 0 to 1), ro (rolled onto its side,
// 0 to 1), fore ("rest" | "push"; "rest" also raises the flipper by fe, 0 to 1, to wave at angle
// `wave`), ftip (where a pushing flipper's tip is, ahead of the shoulder), lift (a swinging
// flipper's height), breath, blink.
//
// The body is one smooth spindle (a chain of discs), then painted in broad bands, column by column:
// the grey back with a lit top row, a cream belly as one area along the underside, and the darkest
// row underneath. The head is a separate round disc past a slight neck dip, with a dark muzzle.
// The flat outline, in rows above the ground for each column from the tail (0) to the nose (18): a
// fork of hind flippers, a body fattest across the middle, a slight neck dip, then a round head.
const SEAL_TOP = [3, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 4, 3, 4, 5, 5, 5, 4, 3];
const SEAL_NECK = 13; // the first column of the neck; the head is the last five

export function drawSeal(g, ox, y, dir, pose = {}, T = sealTones(g)) {
  const {
    k = 1,
    len = 18,
    arch = 0,
    chest = 0,
    hl = 0,
    ro = 0,
    fore = "rest",
    fe = 0,
    ftip = 1,
    wave = 1.2,
    lift = 0,
    breath = 0,
    blink = false,
  } = pose;
  const cells = new Cells();
  const body = new Cells();
  const sc = (v) => Math.max(1, Math.round(v * k));
  const neckW = Math.max(2, Math.round(7 * k));
  const Wb = Math.max(6, Math.round((len - 6) * k)); // the body's columns, before the neck
  const W = Wb + neckW;
  const topAt = (c) => {
    const x = c < Wb ? (c / Wb) * SEAL_NECK : SEAL_NECK + ((c - Wb) / neckW) * (SEAL_TOP.length - SEAL_NECK);
    const a = Math.floor(x);
    const f = x - a;
    return SEAL_TOP[a] + (SEAL_TOP[Math.min(a + 1, SEAL_TOP.length - 1)] - SEAL_TOP[a]) * f;
  };
  const cols = [];
  for (let c = 0; c < W; c++) {
    let top = sc(topAt(c));
    let bot = 0;
    const mid = Math.sin(Math.PI * clamp((c - 2) / Math.max(1, Wb - 3), 0, 1));
    const isBody = c < Wb;
    const arc = isBody ? Math.round(arch * 1.4 * mid) : 0;
    const chestLift = c >= Wb - 4 ? Math.round(chest * 1.2) : 0;
    const headUp = c >= Wb ? Math.round(hl * 2 * k + 0.2) : c >= Wb - 2 ? Math.round(hl * 1.2) : 0;
    const breathe = breath && c > 3 && c < Wb - 2 ? 1 : 0;
    bot = isBody ? Math.max(arc, chestLift) : Math.max(headUp, Math.round(chestLift * 0.8));
    top = top + (isBody ? arc + chestLift + breathe : Math.max(headUp, chestLift) + 0);
    if (c >= Wb - 2 && c < Wb) bot = Math.max(0, Math.min(bot, 1));
    cols.push([bot, top]);
    for (let v = bot; v < top; v++) body.set(c, v, "b");
  }
  // Paint the bands per column.
  const headU = Wb;
  for (const [u, v] of body.values()) {
    const [bot, top0] = cols[u];
    const top = top0 - 1;
    const n = top - bot + 1;
    const f = (v - bot) / n;
    const rolled = ro >= 0.5 && u < headU;
    let c;
    if (!rolled) {
      c = v === top ? T.H : n >= 3 && v === bot ? T.U : f < (ro > 0.2 ? 0.6 : 0.3) ? T.P : T.T;
    } else {
      c = v === top ? T.Pl : v === bot ? T.T : f < 0.4 ? T.S2 : T.P;
    }
    cells.set(u, v, c);
  }
  // The hind flippers: a small fork at the tail, dark.
  cells.del(0, 1);
  for (const [u, v] of cells.values()) if (u <= 1 && v <= 2) cells.set(u, v, T.flip);
  if (k < 0.9) cells.del(0, 2);
  // The dark muzzle on the last two columns.
  for (const [u, v] of cells.values()) if (u >= W - 1) cells.set(u, v, T.muzzle);
  // The fore flippers move from the shoulder.
  const sh = [Wb - 2.5, Math.max(1.2, cols[Math.max(0, Wb - 3)][1] - 1.5 * k)];
  const R = (v, min = 0.5) => Math.max(min, v * k);
  if (fore === "push") {
    capsule(cells, [sh[0] + 1.4 * k, 1.4 * k], [sh[0] + (ftip + 1.2) * k, 0.5 + lift], R(0.7), R(0.5), () => T.far);
    capsule(cells, [sh[0] + 0.1 * k, sh[1] - 0.3 * k], [sh[0] + ftip * k, 0.5 + lift], R(0.9), R(0.55), () => T.flip);
  } else {
    const root = [sh[0] + (0.2 + 0.1 * fe) * k, sh[1] + (-0.3 + 1.0 * fe) * k];
    const L = (2.0 + 1.7 * fe) * k;
    const ang = fe > 0 ? wave : Math.PI + 0.15;
    const tip = [root[0] + L * Math.cos(ang), root[1] + L * Math.sin(ang)];
    capsule(cells, root, tip, R(0.6 + 0.4 * fe), R(0.45 + 0.35 * fe), () => T.flip);
  }
  // Eye and nose.
  const eyeU = Wb + Math.round(3 * k);
  const eyeV = cols[Math.min(W - 1, eyeU)][1] - 2;
  if (cells.has(eyeU, eyeV)) cells.set(eyeU, eyeV, blink || ro >= 0.5 ? T.T : T.eye);
  const noseV = Math.max(cols[W - 1][0], cols[W - 1][1] - 1);
  if (cells.has(W - 1, noseV)) cells.set(W - 1, noseV, T.nose);
  tidy(cells);
  paintCells(g, cells, ox, y, dir, true, 2);
  return { len: W };
}

// ---- The seal's hitching shuffle ------------------------------------------------------------------
//
// A cycle: the front reaches out (the chest lifts, the flipper plants ahead of it), holds, then the
// belly drags up behind it, the back humping as the rear catches up. The shoulders move ahead by
// reach; the rear moves up by the same. Returns the pose and the rear's advance in the cycle so far
// (in cells), so the feet and the belly hold still on the ground.
export const SEAL_CYCLE = 0.75;
export function sealCycle(c, { k = 1, reach = 3, base = 17 } = {}) {
  const p = c - Math.floor(c);
  const n = Math.floor(c);
  const ext = smooth(clamp(p / 0.3, 0, 1));
  const con = smooth(clamp((p - 0.45) / 0.4, 0, 1));
  const lenNow = base + reach * ext - reach * con;
  const arch = Math.sin(Math.PI * con) * 0.6;
  const chest = Math.sin(Math.PI * ext) * (1 - smooth(clamp((p - 0.3) / 0.15, 0, 1))) * 0.55;
  // The flipper: swings forward lifted after the push, plants, and shoves back as the chest moves.
  let ftip = 0.5;
  let liftF = 0;
  if (p < 0.3) {
    ftip = 3.4 - 2.6 * ext;
  } else if (p < 0.85) {
    ftip = 0.8;
  } else {
    const s = smooth((p - 0.85) / 0.15);
    ftip = 0.8 + 2.6 * s;
    liftF = 1.2 * Math.sin(Math.PI * s);
  }
  return {
    pose: { k, len: lenNow, arch, chest, fore: "push", ftip, lift: liftF },
    rear: (n + con) * reach * k, // rear advance, cells
    moving: true,
  };
}

// ---- The otter -----------------------------------------------------------------------------------

export function otterTones(g) {
  const [brown, dark, pale] = g.pal.otter;
  return {
    H: mix(brown, pale, 0.28),
    T: brown,
    S: mix(brown, dark, 0.5),
    U: dark,
    far: mix(dark, "#000000", 0.25),
    paw: mix(dark, "#000000", 0.15),
    claw: mix(dark, "#000000", 0.5),
    P: pale,
    eye: mix(dark, "#000000", 0.7),
    nose: mix(dark, "#000000", 0.6),
  };
}

const FOOT = { reach: 1, under: 0, back: -1, lift: -1 };

// An Asian small-clawed otter: long, low and slender (the body three times as long as it is tall), a
// small flat head with a tiny ear and a pale chin, short legs with small clawed paws, and a long thick
// tail tapering to a point, about two thirds of the body's length, carried low and swinging from the
// hips.
// pose: legs [near hind, far hind, far fore, near fore] ("reach" | "under" | "back" | "lift"), arch
// (0 to 1), ext (the body stretched out, 0 to 1), air (1 when the body is off the ground), tl (tail
// swing, -1 to 1), up (standing up on the hind legs, 0 to 1), look (the head shifted, -1 to 1), sniff
// (nose up, 0 to 1), breath, blink.
export function drawOtter(g, ox, y, dir, pose = {}, T = otterTones(g)) {
  const {
    legs = ["under", "under", "under", "under"],
    arch = 0,
    ext = 0,
    air = 0,
    tl = 0,
    up = 0,
    look = 0,
    sniff = 0,
    breath = 0,
    blink = false,
  } = pose;
  const cells = new Cells();
  const s = up;
  const fur = (lit) => (lit > 0.5 ? T.H : lit > -0.05 ? T.T : lit > -0.5 ? T.S : T.U);
  const dark = (c) => () => c;
  const by = 3.5 + air;

  // Skeleton: hip, middle, shoulder and head, from on all fours to standing up.
  const hip = [lerp(6.0, 5.6, s), lerp(by, 3.1, s)];
  const mid = [lerp(8.1 + 0.5 * ext, 6.2, s), lerp(by + arch * 0.9, 4.7, s)];
  const sho = [lerp(10.1 + 1.0 * ext, 6.9, s), lerp(by + arch * 0.4 + breath * 0.3, 6.2 + breath * 0.3, s)];
  const hd = [lerp(12.2 + 1.5 * ext, 7.6, s) + look * 0.9 * s, lerp(by + 0.3 + arch * 0.1, 8.2, s) + sniff * 0.5 * s];

  // The tail grows from the hips and swings with them: thick at the root, tapering to a point.
  const tailBase = [hip[0] - 1.0, hip[1] - 0.1];
  const tailMid = [lerp(3.1, 2.8, s), lerp(by - 0.5 + tl * 0.6, 1.8, s)];
  const tailTip = [lerp(0.4, 0.5, s), lerp(by - 1.1 + tl * 1.2, 0.9, s)];
  capsule(cells, tailBase, tailMid, 1.4, 1.05, fur);
  capsule(cells, tailMid, tailTip, 1.05, 0.45, fur);

  // Legs are two cells: a thigh row joined to the body and a paw row that moves with the pose.
  const legCells = (rootU, hind, pose2, tone, pawTone, claw) => {
    const sgn = FOOT[pose2];
    const rowTop = 1 + air;
    rootU = Math.round(rootU);
    if (pose2 === "lift") {
      const a = rootU - (hind ? 1 : 0) - 1 + (hind ? 0 : 1);
      for (let k2 = 0; k2 < (hind ? 3 : 2); k2++) cells.set(a + k2, rowTop, k2 === (hind ? 2 : 1) ? pawTone : tone);
      return;
    }
    const aStart = rootU - (hind ? 1 : 0) + sgn;
    for (let k2 = 0; k2 < (hind ? 3 : 2); k2++) cells.set(aStart + k2, rowTop, tone);
    const bStart = rootU + 2 * sgn;
    cells.set(bStart, rowTop - 1, pawTone);
    cells.set(bStart + 1, rowTop - 1, claw);
  };
  const standing = s >= 0.2;
  if (!standing) {
    legCells(hip[0] + 1.5, true, legs[1], T.far, T.far, T.far);
    legCells(sho[0] - 1, false, legs[2], T.far, T.far, T.far);
  }
  capsule(cells, [hip[0], hip[1] + 0.1], mid, 1.65, 1.5, fur);
  capsule(cells, mid, sho, 1.5, 1.5, fur);
  capsule(cells, sho, hd, 1.5, 1.25, fur);
  // A small flat head with a short blunt snout and a pale chin, and a tiny ear.
  const sn = [hd[0] + 1.2, hd[1] - 0.35 + sniff * 0.9 * s];
  const snEnd = [hd[0] + 1.9, sn[1] - 0.05 + sniff * 0.3];
  capsule(cells, hd, sn, 1.25, 0.95, (lit, _nx, ny) => (ny < -0.2 ? T.P : fur(lit)));
  capsule(cells, sn, snEnd, 0.95, 0.85, (lit, _nx, ny) => (ny < -0.2 ? T.P : fur(lit)));
  const eyeU = Math.floor(hd[0] + 0.5);
  const eyeV = Math.floor(hd[1] + 0.6);
  if (cells.has(eyeU, eyeV)) cells.set(eyeU, eyeV, blink ? T.S : T.eye);
  const noseU = Math.floor(snEnd[0] + 0.55);
  const noseV = Math.floor(snEnd[1] + 0.3);
  if (cells.has(noseU, noseV)) cells.set(noseU, noseV, T.nose);
  const earU = Math.floor(hd[0] - 0.8);
  let earV = Math.floor(hd[1] + 1.4);
  while (!cells.has(earU, earV - 1) && earV > 0) earV--;
  cells.set(earU, earV, T.T);

  if (!standing) {
    legCells(hip[0] + 1.5, true, legs[0], T.S, T.paw, T.claw);
    legCells(sho[0] - 1, false, legs[3], T.S, T.paw, T.claw);
  } else {
    // Up on the hind feet: a flat pad each, claws forward, and the fore paws held at the chest.
    const f0 = Math.floor(hip[0] - 1.5);
    for (let k2 = 0; k2 < 4; k2++) cells.set(f0 + k2 + 1, 0, k2 === 3 ? T.claw : T.far);
    for (let k2 = 0; k2 < 4; k2++) cells.set(f0 + k2, 0, k2 === 3 ? T.claw : T.paw);
    const e = smooth(clamp(s / 0.8, 0, 1));
    const paw = [lerp(sho[0] + 0.8, 8.6, e), lerp(1.2, 4.6, e)];
    capsule(cells, [sho[0] - 0.4, sho[1] - 0.6], [paw[0] - 0.9, paw[1] + 0.8], 0.75, 0.6, dark(T.far));
    capsule(cells, [sho[0] + 0.2, sho[1] - 0.9], paw, 0.8, 0.65, dark(T.S));
    cells.set(Math.floor(paw[0] + 0.5), Math.floor(paw[1]), T.claw);
  }
  tidy(cells);
  paintCells(g, cells, ox, y, dir, true, 1);
}

// ---- The otter's bound ---------------------------------------------------------------------------
//
// Four beats a cycle (0.5 s), the back arching and then stretching long: (0) the fore paws land, the
// hind ones tuck; (1) the hind paws land under the chest, the back at its highest; (2) the fore paws
// push off; (3) flight, the body stretched out long and off the ground. Feet planted on the ground
// hold their place (the camera moves; the body goes forward 5 cells a cycle).
export const BOUND_CYCLE = 0.5;
const BEATS = [
  { legs: ["lift", "lift", "reach", "reach"], arch: 0.5, ext: 0.1, air: 0, tl: 0.4 },
  { legs: ["reach", "reach", "under", "under"], arch: 1, ext: 0, air: 0, tl: 0 },
  { legs: ["under", "under", "back", "back"], arch: 0.45, ext: 0.4, air: 0, tl: -0.4 },
  { legs: ["back", "back", "lift", "lift"], arch: 0, ext: 1, air: 1, tl: -0.8 },
];
const BEAT_X = [1, 1, 1.5, 1.5];
export function boundBeat(c, off = 0) {
  const x = c + off;
  const beat = ((Math.floor(x * 4) % 4) + 4) % 4;
  const b = BEATS[beat];
  const prev = BEATS[(beat + 3) % 4];
  return { ...b, legs: [b.legs[0], prev.legs[1], prev.legs[2], b.legs[3]], beat };
}
export function boundX(c) {
  const n = Math.floor(c * 4);
  let x = Math.floor(n / 4) * 5;
  for (let i = 0; i < n % 4; i++) x += BEAT_X[i];
  const frac = c * 4 - n;
  return x + BEAT_X[((n % 4) + 4) % 4] * frac;
}

// ---- The whale ----------------------------------------------------------------------------------
//
// A humpback rolling through the water line: a long, low, dark back, wider than it is tall. Along its
// 15 cells (u from the tail, 0, to the snout, 14) the back shows through a window that slides from the
// head to the tail as the whale moves on, so the head comes up first, the long back rolls through, a
// small dorsal knob sits two thirds back, and the tail stock goes under last. A blow rises over the
// head. On a deep dive the back arches higher and the broad tail flukes rise clear on a stalk, V
// shaped with the pale underside showing, and drop. Cells under the water are drawn faintly.

function whaleTones(g) {
  const [back, light] = g.pal.whale;
  return {
    H: mix(back, light, 0.42),
    T: back,
    S: mix(back, "#000000", 0.22),
    U: mix(back, "#000000", 0.42),
    pale: mix(back, light, 0.78),
    foam: g.pal.sea[3],
    edge: mix(g.pal.sea[3], back, 0.5),
    deep: g.pal.sea[1],
  };
}

// How thick the back is along the body when fully risen, tail (0) to snout (14).
// The back is long and low, never a peak: at full rise it shows exactly three rows above the water
// line over 15 columns (0 is the tail end, 14 the head end): the top row over columns 4 to 10, the
// middle row over 1 to 13, the row at the water line over 0 to 14. It rises head first, rolls through,
// then goes under head first; on a deep dive the back arches (the top span slides toward the tail and
// rises a row, flat across, with no point) as the tail stock and the flukes come up.
const FULL = [1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1];
const ARCH = [2, 3, 4, 4, 4, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0];
const THICK = [1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2]; // for the faint body under the water
const WHALE_EVENT = 3;
const rampAge = (t, a, b) => smooth(clamp((t - a) / (b - a), 0, 1));

// The rows of back above the water at each column at `age`.
function visRows(age, dive) {
  const m = dive ? rampAge(age, 1.6, 2.0) : 0;
  const out = dive ? 2.0 : 1.7;
  const rows = FULL.map((full, u) => {
    const fromHead = (14 - u) / 14;
    const up = smooth(clamp((age - 0.1 - fromHead * 0.5) / 0.5, 0, 1));
    const down = smooth(clamp((age - out - fromHead * 0.5) / 0.5, 0, 1));
    return Math.round((full + (ARCH[u] - full) * m) * up * (1 - down));
  });
  for (let pass = 0; pass < 2; pass++) {
    for (let u = 0; u < rows.length; u++) {
      rows[u] = Math.min(rows[u], u > 0 ? rows[u - 1] + 1 : 9, u < rows.length - 1 ? rows[u + 1] + 1 : 9);
    }
  }
  return rows;
}

// Draws the whale at its event time `age` (0 to 3). `ox` is the tail's column, `wy` the waterline
// row. opts: fluke (a deep dive: the back arches and the tail flukes rise), blow (show the spout).
export function drawWhale(g, ox, wy, dir, age, opts = {}) {
  if (age < 0 || age > WHALE_EVENT) return;
  const { fluke = true, blow = true } = opts;
  const T = whaleTones(g);
  const slide = Math.round(age * 1.2); // it moves forward a little as it rolls through
  const X = (u) => (dir > 0 ? ox + u + slide : ox - u - slide);
  const put = (u, v, c, alpha = 1) => {
    g.ctx.globalAlpha = alpha;
    g.ctx.fillStyle = c;
    g.ctx.fillRect(X(u), wy - 1 - v, 1, 1);
    g.ctx.globalAlpha = 1;
  };
  const rows = visRows(age, fluke);

  // The body under the water, faint, while the whale is near the surface.
  const near = clamp(Math.min(age / 0.4, (WHALE_EVENT - age) / 0.5), 0, 1);
  for (let u = 0; u < THICK.length; u++) {
    const depth = Math.max(1, Math.round(THICK[u] * 0.45));
    for (let v = -1; v >= -depth; v--) put(u, v, mix(T.T, T.deep, 0.4), 0.3 * near);
  }
  // The back above the water: a lit top row, the base, a darker row at the water line.
  for (let u = 0; u < rows.length; u++) {
    for (let v = 0; v < rows[u]; v++) {
      const top = v === rows[u] - 1;
      put(u, v, top && rows[u] > 1 ? T.H : v === 0 ? T.S : T.T);
    }
    // The pale wake: foam where the back meets the sea, and a line ahead of the head.
    if (rows[u] > 0 && (rows[u - 1] ?? 0) === 0) put(u - 1, 0, T.foam, 0.85);
    if (rows[u] > 0 && (rows[u + 1] ?? 0) === 0) put(u + 1, 0, T.foam, 0.85);
  }
  if (rows[14] > 0) put(16, 0, T.foam, 0.7);
  // The dorsal knob, one cell over the top row two thirds back from the head, only while that part is up.
  if (rows[5] >= 3 && rows[5] === FULL[5] && !(fluke && age > 1.65)) put(5, 3, T.T);

  // The blow: from the head end, a short thin stalk widening into a bushy plume that leans back, pale
  // grey with a grey edge, fading over about a second. It starts as the head breaks the water.
  if (blow) {
    let t0 = null;
    for (let a = 0; a < WHALE_EVENT; a += 0.04) {
      if (visRows(a, fluke)[13] >= 1) {
        t0 = a;
        break;
      }
    }
    const base = rows[13];
    if (t0 !== null && age >= t0 && base >= 1) {
      const tau = age - t0;
      const spans = [
        [13, 13],
        [13, 13],
        [12, 13],
        [11, 14],
        [10, 14],
        [10, 13],
      ];
      const hgt = Math.min(spans.length, Math.round(tau * 20));
      const fade = tau < 0.6 ? 1 : clamp(1 - (tau - 0.6) / 0.5, 0, 1);
      const spray = new Set();
      for (let r = 0; r < hgt; r++) for (let u = spans[r][0]; u <= spans[r][1]; u++) spray.add(`${u},${base + r}`);
      for (const k2 of spray) {
        const [u, v] = k2.split(",").map(Number);
        const inner = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].every(([a, b]) => spray.has(`${u + a},${v + b}`) || v + b < base);
        put(u, v, inner ? mix(T.foam, T.edge, 0.2) : T.edge, fade);
      }
    }
  }

  // The tail flukes: a stalk rising from the tail stock with the broad V of the flukes on top, the
  // pale underside showing, then dropping back under.
  if (fluke) {
    const f = rampAge(age, 1.95, 2.45) - rampAge(age, 2.65, 2.95);
    const h = Math.round(3 * f);
    if (f > 0.15) {
      const u0 = 2;
      for (let v = 0; v < h; v++) for (let d = 0; d < 2; d++) put(u0 + d, v, v === h - 1 ? T.S : T.T);
      for (let d = -2; d <= 3; d++) put(u0 + d, h, T.pale);
      for (const d of [-4, -3, -2, 3, 4, 5]) put(u0 + d, h + 1, T.pale);
      for (const d of [-5, -4, 5, 6]) put(u0 + d, h + 2, T.S);
      put(u0 - 1, 0, T.foam, 0.85);
      put(u0 + 2, 0, T.foam, 0.85);
    }
  }
}

// ---- Resting -------------------------------------------------------------------------------------

const ramp = (t, a, b) => smooth(clamp((t - a) / (b - a), 0, 1));
const bump = (t, a, b, c, d) => ramp(t, a, b) - ramp(t, c, d);
const inside = (t, a, b) => t >= a && t < b;

// The seal's pose lying still for `t` seconds of a stop `total` seconds long. "lie": breathing and
// blinking, and every few seconds the head lifts to look about. "roll": she rolls onto her side (the
// cream belly turns to face us, the eye closes), waves a fore flipper and rolls back before the stop
// ends (it needs about 7 s). The pup (`pup`) lies beside her and lifts her head with her mother.
export const SEAL_ROLL_SECONDS = 7;
export function sealRest(pose, t, total, pup = false) {
  const breath = Math.sin(t * (pup ? 2.6 : 1.9) + (pup ? 1 : 0)) > (pup ? 0.3 : 0.35) ? 1 : 0;
  if (pose === "roll") {
    const a = 0.3;
    const z = total - 0.8;
    const ro = bump(t, a, a + 1.1, z - 1.3, z);
    const fe = ramp(t, a + 0.6, a + 1.6) * (1 - ramp(t, z - 2.5, z - 1.8));
    const swing = Math.sin(((t - a - 1.6) / 1.1) * Math.PI * 2);
    const wave = 1.05 + 0.5 * swing * ramp(t, a + 1.4, a + 2) * (1 - ramp(t, z - 2.9, z - 2.4));
    const ang = fe > 0 ? 3.4 - (3.4 - wave) * ramp(t, a + 1.0, a + 1.6) * (1 - ramp(t, z - 2.5, z - 1.8)) : wave;
    const hl = pup ? 0.8 * bump(t, a + 1.3, a + 2.1, z - 3.2, z - 2.5) : 0;
    const blink = !pup && [0.9, 5.3].some((s) => inside(t, s, s + 0.14));
    return { hl, ro: pup ? 0 : ro, fore: "rest", fe: pup ? 0 : fe, wave: ang, breath, blink };
  }
  const ph = (t - (pup ? 0.35 : 0)) % 8;
  const hl = bump(ph, 1.2, 2.0, 3.4, 4.2) * (pup ? 0.8 : 1) + (pup ? 0 : 0.5 * bump(ph, 6.0, 6.6, 7.0, 7.5));
  const blink = [1.0, 3.0, 4.6, 6.7].some((s) => inside(ph, s, s + 0.14));
  return { hl, ro: 0, fore: "rest", fe: 0, wave: 1.2, breath, blink };
}

// The lead otter standing up to look round for `t` seconds of a stop `total` seconds long: it rises on its
// hind feet (the tail propping it), looks one way and the other, sniffs, and drops back on all fours.
export function otterRest(stand, t, total) {
  const up = stand ? bump(t, 0.1, 0.9, total - 0.9, total - 0.1) : 0;
  const look = Math.sin(t * 2.4) * up;
  const sniff = bump(t, 1.2, 1.6, 2.1, 2.5) * up;
  const blink = [0.8, 2.6, 4.2].some((s) => inside(t % 5, s, s + 0.14));
  const breath = Math.sin(t * 2.2) > 0.3 ? 1 : 0;
  return { up: clamp(up, 0, 1), look: clamp(look, -1, 1), sniff: clamp(sniff, 0, 1), blink, breath };
}

// Seals, otters and whales

// Built from parts (swimmer.js): the Hawaiian monk seal, her pup (scale below 0.8), the Asian
// small-clawed otter and the humpback whale. A walker's s.c (critters.js stride) is its stride clock, so
// the seal's belly and flipper and the otter's paws hold still on the ground; its x is the centre of the
// body. SEAL_STRIDE and OTTER_STRIDE are [px a stride, seconds a stride] for stride(): the seal hitches
// 3 px (the pup 2.3) in 0.75 s (0.575), the otter bounds 5 px in 0.5 s. A stopped animal rests in the
// pose rest() picked (sealPoses, "lie" or "roll"; the lead otter "stand" or "stay"); s.still is the
// seconds it has been at rest and s.timer the seconds its stop has left, as the sprites show it.
export const SEAL_STRIDE = [3, SEAL_CYCLE];
export const PUP_STRIDE = [2.3, 0.575];
export const OTTER_STRIDE = [5, BOUND_CYCLE];
export const sealPoses = (s) => ((s.timer ?? 0) >= SEAL_ROLL_SECONDS ? ["lie", "lie", "roll", "roll"] : ["lie"]);

export function sealAt(g, s, time = 0) {
  if (g.trace) return g.trace.draw(sealAt, g, s, time);
  const pup = (s.scale ?? 1) < 0.8;
  const k = pup ? 0.7 : 1;
  const [px] = pup ? PUP_STRIDE : SEAL_STRIDE;
  const c = s.c ?? (s.phase ?? 0) * 0.3;
  const dir = s.dir;
  let pose;
  let off = 0;
  if ((s.moving ?? s.state === "walk") || c - Math.floor(c) > 1e-6) {
    const w = sealCycle(c, { k, reach: px / k, base: 17 });
    pose = { ...w.pose, breath: 0, blink: (time / 3.7 + (s.phase ?? 0)) % 1 < 0.04 };
    off = w.rear - c * px;
  } else {
    const still = stillOf(s, time);
    const e = smooth(Math.min(1, still / 0.35));
    pose = { k, len: 17 + e, ...sealRest(s.pose ?? "lie", still, still + (s.timer ?? 0), pup) };
    if (e < 1) Object.assign(pose, { fore: "push", ftip: 3.4 - 2.6 * e, lift: 0 });
  }
  const half = Math.round(9 * k);
  const tones = tonesFor(g.pal, pup ? "seal:pup" : "seal", () => sealTones(g, pup ? 0.3 : 0));
  drawSeal(g, Math.round(s.x - dir * half + dir * off), s.y ?? g.groundY + 7, dir, pose, tones);
}

export function otterAt(g, o, time = 0) {
  if (g.trace) return g.trace.draw(otterAt, g, o, time);
  const dir = o.dir;
  const c = o.c ?? (o.phase ?? 0) * 0.3;
  let pose;
  let off = 0;
  let shift = 0;
  if ((o.moving ?? o.state === "walk") || c - Math.floor(c) > 1e-6) {
    const b = boundBeat(c);
    pose = {
      legs: b.legs,
      arch: b.arch,
      ext: b.ext,
      air: b.air,
      tl: b.tl,
      blink: (time / 3.1 + (o.phase ?? 0)) % 1 < 0.04,
    };
    off = boundX(c) - c * OTTER_STRIDE[0];
  } else {
    const still = stillOf(o, time);
    const e = smooth(Math.min(1, still / 0.35));
    const b = boundBeat(c);
    pose = otterRest(o.pose === "stand", still, still + (o.timer ?? 0));
    if (e < 1)
      Object.assign(pose, {
        arch: b.arch * (1 - e),
        ext: b.ext * (1 - e),
        tl: b.tl * (1 - e),
        legs: e < 0.5 ? b.legs : undefined,
      });
    if (pose.up > 0.2) shift = 2;
  }
  drawOtter(
    g,
    Math.round(o.x - dir * 7 + dir * (off + shift)),
    o.y ?? g.groundY + 6,
    dir,
    pose,
    tonesFor(g.pal, "otter", () => otterTones(g)),
  );
}

// The whale's surfacing: w.start the time it came up, w.x the middle of its back, w.dir the way it faces
// and w.dive whether this one dives with its flukes. wy is the water line's row.
export function whaleAt(g, w, wy, time = 0) {
  if (g.trace) return g.trace.draw(whaleAt, g, w, wy, time);
  const dir = w.dir ?? 1;
  drawWhale(g, Math.round(w.x) - dir * 7, wy, dir, time - w.start, { fluke: !!w.dive });
}

export const FAMILY = {
  id: "swimmers",
  title: "Seals, otters and whales",
  group: "Animals",
  differ: "size, colour, flippers or paws",
  drivers: {
    sealAt: { role: "walker", member: () => "seal" },
    otterAt: { role: "walker", member: () => "otter" },
    whaleAt: { role: "swimmer", member: () => "whale" },
  },
};
