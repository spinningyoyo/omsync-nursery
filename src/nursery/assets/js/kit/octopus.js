// The cephalopods, built from parts: the day octopus (Octopus cyanea), Mantle, of the Great
// Barrier Reef. Every part is a capsule in cells (u along the body toward where it is going, v up
// from the ground, facing right): the round mantle (the body sac) held up and back, the head with a
// raised eye on top and, under it, the dark false eye-spot this species wears, the web where the
// arms meet, and eight arms, four near and four far (a darker tone), each a chain root, bend and
// tip that tapers and curls at its end. Tones follow the light from above whatever the pose, with a
// scatter of papillae (skin bumps) in the next tone.
//
// It walks on its arms in four beats, each arm a quarter stride from the next and on the ground two
// thirds of the stride, its planted tip holding its spot while the body moves (the stride clock `c`,
// critters.js stride). It sits with its arms curled round it, breathing (the mantle swells), blinking
// and looking about; peeks out of its den with only its eyes and an arm tip showing; and jets away
// mantle first, its arms trailed in a bundle behind. It changes colour as a real one does: `camo`
// (0..1) fades it to the sand with pale mottles, `flash` (0..1) darkens it in alarm.
//
// Palette octopus: { skin, sand, flash, mottle, eye, pupil, ink } with groundShadow.
import { clamp, frac, lerp, mix, shadowColour } from "./pixel.js";
import { Cells, capsule as capsule0, tidy as tidy0 } from "./swimmer.js";

const capsule = (c, a, b, ra, rb, tone) => capsule0(c, a, b, ra, rb, tone, 0);
const tidy = (c) => tidy0(c, null, 0);
const hashUV = (u, v) => {
  let h = Math.imul(u + 97, 374761393) ^ Math.imul(v + 31, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const RAMPS = new Map();
function ramp(c) {
  if (!RAMPS.has(c)) RAMPS.set(c, [mix(c, "#ffffff", 0.2), c, mix(c, "#000000", 0.26), mix(c, "#000000", 0.48)]);
  return RAMPS.get(c);
}
const pick = (r, lit) => (lit > 0.5 ? r[0] : lit > -0.1 ? r[1] : lit > -0.55 ? r[2] : r[3]);

// The mantle's length (its build's len) rump to head, in px: a 0.16 m mantle on the scale.
export const OCTOPUS = { len: 5.5, stride: [9, 0.9] };
export const OCTOPUS_POSES = ["curl", "look", "reach"];

// The skin colour for a colour state.
export function octopusSkin(P, camo = 0, flash = 0) {
  return mix(mix(P.skin, P.sand, clamp(camo, 0, 1)), P.flash, clamp(flash, 0, 1));
}

// Where one arm's tip is in a crawl, q of the way through its stride: on the ground sweeping back
// for two thirds, then lifted and swung forward.
function crawlFoot(q, reach, back) {
  if (q < 2 / 3) return [lerp(reach, back, q / (2 / 3)), 0];
  const r = (q - 2 / 3) / (1 / 3);
  return [lerp(back, reach, r), Math.sin(r * Math.PI) * 2.6];
}

// An arm from its root through a bend to its tip, then curled back on itself as a real arm's tip
// is: a thick root (the thigh, two cells) tapering to a one-cell tip. `curl` lifts the curl (1) or
// lays it flat along the sand (0).
function arm(cells, root, bend, tip, tone, curl = 1) {
  const out = Math.sign(tip[0] - root[0]) || 1;
  capsule(cells, root, bend, 0.95, 0.62, tone);
  capsule(cells, bend, tip, 0.62, 0.56, tone);
  const c1 = [tip[0] + out * 1.1, tip[1] + 0.9 * curl + 0.1];
  const c2 = [tip[0] + out * 0.3, tip[1] + 2.4 * curl + 0.2];
  capsule(cells, tip, c1, 0.56, 0.56, tone);
  if (curl > 0.5) capsule(cells, c1, c2, 0.56, 0.56, tone);
}

// One octopus into cells. pose: { mode: "crawl" | "sit" | "den" | "jet", c, m (how far into a
// walk, 0..1), breath (0..1), blink, look (-1..1), rest ("curl", "look", "reach"), t (seconds) }.
export function octopusCells(P, skin, pose) {
  const { mode = "sit", c = 0, m = 0, breath = 0, blink = false, look = 0, t = 0 } = pose;
  const cells = new Cells();
  const near = ramp(skin);
  const far = ramp(mix(skin, "#000000", 0.32));
  const mottle = pose.camo > 0.35 ? P.mottle : null;
  const skinTone = (r) => (lit, _nx, _ny, _t) => pick(r, lit);
  const textured = (r) => (lit) => pick(r, lit);

  if (mode === "jet") {
    // Mantle first, arms trailing in a bundle that ripples.
    capsule(cells, [-1, 3], [4.5, 3.6], 2.2, 2.6, textured(near));
    for (let i = 0; i < 3; i += 1) {
      const w = Math.sin(t * 9 - i) * 0.8;
      capsule(cells, [-1.5, 2.6 - i * 0.3], [-8 - i, 2.2 + w - i * 0.5], 0.9, 0.56, textured(i === 1 ? far : near));
    }
    tidy(cells);
    if (cells.has(0, 4)) cells.set(0, 4, blink ? near[1] : P.eye);
    return cells;
  }

  const dip = mode === "crawl" ? Math.round(Math.abs(Math.sin(c * Math.PI * 4)) * m * 0.6) : 0;
  const swell = breath * 0.4;
  const headY = 3.6 - dip;
  const rest = pose.rest ?? "curl";
  // Each arm: its root under the head, where its tip rests (sitting) and how far it reaches and
  // pushes back (walking). Far arms lie between the near ones, a darker tone.
  const ARMS = [
    { root: [-0.4, 1.8], sit: [-8.5, 0], reach: 3, back: -8, arch: 3.8 },
    { root: [0.4, 1.2], sit: [-2, 0], reach: 5, back: -5, arch: 1.8 },
    { root: [1.6, 1.2], sit: [3.4, 0], reach: 8, back: -2, arch: 1.8 },
    { root: [2.4, 1.8], sit: [9.5, 0], reach: 11, back: 1, arch: 3.8 },
  ];
  const tipFor = (i, isFar) => {
    const a = ARMS[i];
    const q = frac(c + i * 0.25 + (isFar ? 0.5 : 0));
    const crawl = crawlFoot(q, a.reach, a.back);
    const sit = [a.sit[0] * (isFar ? 0.55 : 1), 0];
    if (rest === "reach" && i === 3 && !isFar) {
      sit[0] = 9 + Math.sin(t * 2.4) * 1.5;
      sit[1] = 3 + Math.sin(t * 3.1) * 1.5;
    }
    return [lerp(sit[0], crawl[0], m), lerp(sit[1], crawl[1], m)];
  };
  // An arm arches up off the sand from its root and comes down to its tip, leaving water under the
  // arch; the outer arms arch highest.
  const drawArm = (i, isFar) => {
    const a = ARMS[i];
    const root = isFar ? [a.root[0] + 0.4, a.root[1] + 0.5] : a.root;
    const tip = tipFor(i, isFar);
    const bend = [lerp(root[0], tip[0], 0.55), Math.max(tip[1] + 1, isFar ? a.arch * 0.7 : a.arch)];
    arm(cells, root, bend, tip, textured(isFar ? far : near), tip[1] > 0.8 ? 0.4 : 1);
  };
  if (mode !== "den") for (let i = 0; i < 4; i += 1) drawArm(i, true);
  // The mantle, held up and back over the head, then the head, the web and the raised eye.
  // The mantle: a round bag held up and back over the head, joined to it by a short neck.
  const bag = mode === "den" ? [-1.6, 5.6] : [-2.8, 6.6 - dip];
  const mantleTone = (lit, _nx, _ny, u) => {
    const r = pick(near, lit);
    return mottle && hashUV(Math.round(u * 6), Math.round(lit * 3)) < 0.18 ? mottle : r;
  };
  capsule(cells, [-0.4, headY + 0.8], bag, 2.1, 3.1 + swell, mantleTone);
  capsule(cells, [bag[0] + 0.3, bag[1] + 0.2], [bag[0] - 0.5, bag[1] + 0.6], 3.2 + swell, 3.1 + swell, mantleTone);
  capsule(cells, [-0.2, headY], [1.6, headY - 0.2], 1.8, 1.6, skinTone(near));
  if (mode !== "den") capsule(cells, [0, 1.6], [2, 1.6], 0.9, 0.9, skinTone(near));
  capsule(cells, [1.2, headY + 1.6], [1.6, headY + 1.9], 1.05, 1.0, skinTone(near));
  if (mode !== "den") {
    for (let i = 0; i < 4; i += 1) drawArm(i, false);
  } else {
    // One arm tip curled out over the den's lip.
    const wave = Math.sin(t * 1.7) * 0.8;
    arm(cells, [2.2, 1], [4.5 + wave, 1.4], [6.5 + wave, 0.6 + Math.abs(wave)], textured(near), 1);
  }
  // Papillae: a scatter of the next tone over the lit skin, fixed to the body.
  for (const [u, v, col] of cells.values()) {
    if (col === near[1] && hashUV(u, v) < 0.12) cells.set(u, v, near[2]);
    else if (mottle && col === near[1] && hashUV(v, u) < 0.22) cells.set(u, v, mottle);
  }
  tidy(cells);
  // The eye: a gold iris with the dark bar of a pupil, looking where `look` says; shut, it is skin.
  const ev = Math.round(headY + 2.1);
  const eu = look < -0.3 ? 1 : 2;
  const on = (u, v, col) => cells.has(u, v) && cells.set(u, v, col);
  if (blink) {
    on(1, ev, near[0]);
    on(2, ev, near[0]);
  } else {
    on(1, ev, look < -0.3 ? P.pupil : P.eye);
    on(2, ev, look < -0.3 ? P.eye : P.pupil);
    on(eu, ev + 1, near[0]);
  }
  // The false eye-spot under the eye, dark with a paler ring under it.
  if (mode !== "den") {
    on(2, Math.round(headY) - 1, P.pupil);
    on(3, Math.round(headY) - 1, near[0]);
  }
  return cells;
}

// Draws an octopus o ({ x, dir, mode, c, m, camo, flash, since, rest, lift }) with its feet on row
// y - 1, at `time`. A lifted one (o.lift rows, as when it jets) casts its shadow on the sand below.
export function octopusAt(g, o, y, time) {
  if (g.trace) return g.trace.draw(octopusAt, g, o, y, time);
  const P = g.pal.octopus;
  const skin = octopusSkin(P, o.camo ?? 0, o.flash ?? 0);
  const blink = ((time + (o.phase ?? 0)) / 3.7) % 1 < 0.05;
  const look = Math.sin(time * 0.45 + (o.phase ?? 0)) > 0.6 ? -1 : 0;
  const cells = octopusCells(P, skin, {
    mode: o.mode,
    c: o.c ?? 0,
    m: o.m ?? 0,
    breath: Math.sin(time * 2.2) > 0.2 ? 1 : 0,
    blink,
    look,
    rest: o.rest,
    t: time,
    camo: o.camo ?? 0,
  });
  const ox = Math.round(o.x);
  const lift = Math.round(o.lift ?? 0);
  const X = (u) => (o.dir > 0 ? ox + u : ox - u);
  {
    g.ctx.fillStyle = shadowColour(g.pal);
    const us = new Set();
    for (const [u, v] of cells.values()) if (v <= 1 || lift > 0) us.add(u);
    const a = g.ctx.globalAlpha;
    if (lift > 0) g.ctx.globalAlpha = a * clamp(1 - lift / 40, 0.25, 1);
    for (const u of us) g.ctx.fillRect(X(u), y, 1, 1);
    g.ctx.globalAlpha = a;
  }
  for (const [u, v, col] of cells.values()) {
    g.ctx.fillStyle = col;
    g.ctx.fillRect(X(u), y - 1 - v - lift, 1, 1);
  }
}

// A puff of ink left where an octopus jetted: a dark cloud that spreads, drifts up and fades over
// `life` seconds. ink: { x, y, age }.
export function inkAt(g, ink, life = 3) {
  if (g.trace) return g.trace.draw(inkAt, g, ink, life);
  const p = clamp(ink.age / life, 0, 1);
  const r = 1.5 + p * 4;
  const a = g.ctx.globalAlpha;
  g.ctx.globalAlpha = a * (1 - p) * 0.8;
  g.ctx.fillStyle = g.pal.octopus.ink;
  const cy = ink.y - p * 4;
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy += 1) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * 1.3);
    for (let dx = -half; dx <= half; dx += 1) {
      if ((dx * 7 + dy * 13 + Math.floor(ink.age * 6)) % 5 === 0 && p > 0.4) continue;
      g.ctx.fillRect(Math.round(ink.x + dx), Math.round(cy + dy), 1, 1);
    }
  }
  g.ctx.globalAlpha = a;
}

export const FAMILY = {
  id: "cephalopods",
  title: "Octopuses",
  group: "Animals",
  differ: "size, skin colour and its changes",
  members: {
    octopus: { spec: OCTOPUS, realLength: 0.16 },
  },
  drivers: {
    octopusAt: { role: "walker", member: () => "octopus" },
    inkAt: { role: "prop", member: () => "ink" },
  },
};
