// The fish, built from parts: one design for every fish of the reef. A fish is a body capsule (u
// along it from the tail toward the nose, v up, facing right), a head that sets its profile (the
// parrotfish's steep brow and beak, the trevally's blunt forehead, the shark's long snout), a tail
// (forked, crescent or, for the sharks, the long upper lobe), a dorsal fin and a pectoral that
// sculls. Tones follow the light from above, the belly a paler tone, the far fins darker; markings
// are areas of the body (the clownfish's bars, the wrasse's stripe, the sharks' black tips and
// spots), never outlines. `tidy` keeps every frame one connected shape.
//
// Members differ in size, profile, fins and markings: chromis, anthias, clownfish, wrasse, parrotfish,
// trevally and blacktip swim; the epaulette shark walks on its four paired fins along the reef
// at night, each fin cycling four drawn poses in a diagonal gait. The manta, a ray, is drawn seen
// from below as it passes overhead (mantaAt), its wings beating slowly.
//
// Palettes: one per member, { body, belly, fin, mark, accent, eye }, with groundShadow.
import { clamp, frac, mix, shadowColour } from "./pixel.js";
import { Cells, capsule as capsule0, tidy as tidy0 } from "./swimmer.js";

const capsule = (c, a, b, ra, rb, tone) => capsule0(c, a, b, ra, rb, tone, -99);
const tidy = (c) => tidy0(c, null, -99);

const RAMPS = new Map();
function ramp(c) {
  if (!RAMPS.has(c)) RAMPS.set(c, [mix(c, "#ffffff", 0.22), c, mix(c, "#000000", 0.24), mix(c, "#000000", 0.44)]);
  return RAMPS.get(c);
}
const pick = (r, lit) => (lit > 0.45 ? r[0] : lit > -0.15 ? r[1] : lit > -0.6 ? r[2] : r[3]);

// Species in art px, body centre at (0, 0), facing right. `len` is the body rump to chest on the
// scale (families.js REAL_LENGTH), `head` [length, radius at the brow, radius at the nose, drop].
export const FISH = {
  chromis: {
    len: 3.8,
    body: [-1.8, 1.8, 1.1, 1.35],
    head: [1.2, 1.2, 0.6, 0.1],
    tail: { len: 2.2, spread: 1.6, fork: true, hz: 4.5 },
    dorsal: [-1.2, 1.0, 0.7, 1.2, 0.55],
    pectoral: [0.4, -0.3, 1.1, 0.5],
    eye: [2, 0],
    pattern: "solid",
  },
  anthias: {
    len: 4.4,
    body: [-2.0, 2.0, 1.0, 1.3],
    head: [1.1, 1.1, 0.55, 0.2],
    tail: { len: 2.4, spread: 1.8, fork: "crescent", hz: 4.8 },
    dorsal: [-1.4, 1.2, 0.8, 1.0, 0.5],
    pectoral: [0.4, -0.3, 1.1, 0.5],
    eye: [2, 0],
    pattern: "solid",
  },
  clownfish: {
    len: 4.2,
    body: [-2.0, 2.0, 1.55, 1.85],
    head: [1.2, 1.6, 0.9, 0.2],
    tail: { len: 1.9, spread: 1.4, fork: false, hz: 3.6 },
    dorsal: [-1.4, 1.6, 1.0, 1.7, 0.85],
    pectoral: [0.6, -0.5, 1.4, 0.6],
    eye: [2, 0],
    pattern: "clown",
  },
  wrasse: {
    len: 4.2,
    body: [-2.1, 2.1, 0.7, 0.9],
    head: [1.3, 0.85, 0.4, 0.1],
    tail: { len: 1.5, spread: 0.9, fork: false, hz: 5 },
    dorsal: null,
    pectoral: null,
    eye: [2, 0],
    pattern: "wrasse",
  },
  parrotfish: {
    len: 9.2,
    body: [-4.4, 4.0, 2.3, 2.9],
    head: [2.4, 2.6, 1.0, -0.6],
    tail: { len: 3.0, spread: 2.6, fork: "crescent", hz: 2.2 },
    dorsal: [-3.4, 2.4, 2.4, 2.6, 0.75],
    pectoral: [1.4, -0.9, 2.2, 0.75],
    eye: [5, 1],
    pattern: "parrot",
  },
  trevally: {
    len: 12,
    body: [-6.0, 5.4, 2.4, 3.5],
    head: [2.6, 3.2, 1.1, -0.8],
    tail: { len: 4.4, spread: 3.6, fork: "crescent", hz: 3.2 },
    dorsal: [-3.6, 2.6, 0.2, 3.4, 0.8],
    pectoral: [2.2, -0.4, 3.4, 0.7],
    eye: [7, 1],
    pattern: "trevally",
  },
  blacktip: {
    len: 12.8,
    body: [-6.4, 6.4, 1.3, 2.4],
    head: [3.0, 2.1, 0.7, -0.5],
    tail: { len: 5.2, spread: 3.4, fork: "shark", hz: 1.6 },
    dorsal: "shark",
    pectoral: [3.0, -1.6, 4.0, 0.95],
    eye: [8, 0],
    pattern: "shark",
  },
};

// The tail: forked lobes, a crescent's swept tips, or a shark's long upper lobe; it sweeps with the
// beat `wag` (-1..1) from the hips.
function tail(cells, sp, C, wag, reach = 1.1) {
  const T = sp.tail;
  const base = [sp.body[0] - 0.2, 0];
  const tip = base[0] - T.len;
  const sway = wag * reach;
  const rT = ramp(C.fin ?? C.body);
  const rEdge = ramp(C.mark ?? C.fin ?? C.body);
  const tone = (edge) => (lit, _nx, _ny, u) => pick(u > 0.72 && edge ? rEdge : rT, lit);
  if (T.fork === "shark") {
    capsule(cells, base, [tip - 1.2, T.spread + sway * 0.9], 1.0, 0.45, tone(true));
    capsule(cells, base, [tip + 1.4, -T.spread * 0.6 + sway * 0.6], 0.9, 0.45, tone(true));
    return;
  }
  const lean = T.fork === "crescent" ? 0.9 : 0;
  capsule(cells, base, [tip - lean, T.spread * 0.85 + sway], 0.85, 0.5, tone(sp.pattern === "clown"));
  capsule(cells, base, [tip - lean, -T.spread * 0.85 + sway], 0.85, 0.5, tone(sp.pattern === "clown"));
  if (!T.fork) capsule(cells, base, [tip + 0.6, sway * 0.6], 0.9, 0.75, tone(false));
}

// The body's colour for a cell: the member's markings as areas of the body.
function bodyTone(sp, C) {
  const rB = ramp(C.body);
  const rBelly = ramp(C.belly ?? C.body);
  const rMark = C.mark ? ramp(C.mark) : rB;
  const rAcc = C.accent ? ramp(C.accent) : rB;
  const [a, b] = sp.body;
  return (lit, _nx, ny, _u, x) => {
    const belly = ny < -0.3;
    switch (sp.pattern) {
      case "clown": {
        // Three white bars, head, middle and the root of the tail, edged in black.
        const along = (x - a) / (b - a);
        if (Math.abs(along - 0.9) < 0.1 || Math.abs(along - 0.5) < 0.12 || Math.abs(along - 0.06) < 0.08)
          return pick(rAcc, lit + 0.4);
        return belly ? pick(rBelly, lit) : pick(rB, lit);
      }
      case "wrasse":
        // A black stripe from the snout that widens to the tail.
        if (Math.abs(ny) < 0.35) return rMark[1];
        return belly ? rBelly[0] : pick(rB, lit);
      case "parrot":
        return belly ? pick(rBelly, lit) : pick(rB, lit);
      case "shark":
        return belly ? rBelly[0] : pick(rB, lit);
      default:
        return belly ? pick(rBelly, lit) : pick(rB, lit);
    }
  };
}

// One fish of `kind` into cells at time t.
// The calm beat a school swims with: one slow rate for every schooling fish, the whole school in
// step, a smaller sweep of the tail and the pectoral held still, so a cloud of fish reads as one
// quiet shape.
export const SCHOOL_BEAT = { hz: 1.5, reach: 0.6 };

// `calm` swims with SCHOOL_BEAT instead of the member's own beat.
export function fishCells(kind, C, t = 0, phase = 0, calm = false) {
  const sp = FISH[kind];
  const cells = new Cells();
  const beat = 2 * Math.PI * (t * (calm ? SCHOOL_BEAT.hz : sp.tail.hz) + phase);
  const wag = Math.sin(beat);
  const [a, b, ra, rb] = sp.body;
  const rFin = ramp(C.fin ?? C.body);
  const rMark = ramp(C.mark ?? C.fin ?? C.body);

  if (sp.dorsal === "shark") {
    // The first dorsal: a tall swept triangle with a black tip.
    const rB = ramp(C.body);
    capsule(cells, [0.6, 1.6], [-0.9, 4.6], 1.35, 0.5, (lit, _nx, _ny, u) => pick(u > 0.62 ? rMark : rB, lit));
    capsule(cells, [-5.2, 0.9], [-5.8, 2.0], 0.6, 0.4, (lit) => pick(rB, lit));
  } else if (sp.dorsal) {
    const [d0, d1, h0, h1, r] = sp.dorsal;
    capsule(cells, [d0, h0], [d1, h1], r, r * 0.8, (lit) => pick(sp.pattern === "clown" ? rMark : rFin, lit));
  }
  tail(cells, sp, C, wag, calm ? SCHOOL_BEAT.reach : 1.1);
  const tone = bodyTone(sp, C);
  capsule(cells, [a, 0], [b, 0], ra, rb, (lit, nx, ny, u) => tone(lit, nx, ny, u, a + (b - a) * u));
  // The head: its profile from brow to nose.
  const [hl, hr0, hr1, drop] = sp.head;
  const rHead = ramp(sp.pattern === "parrot" ? C.mark : C.body);
  const rBelly = ramp(C.belly ?? C.body);
  capsule(cells, [b, 0], [b + hl, drop], hr0, hr1, (lit, _nx, ny) =>
    ny < -0.3 && sp.pattern !== "parrot" ? rBelly[sp.pattern === "shark" ? 0 : 1] : pick(rHead, lit),
  );
  if (sp.pattern === "parrot") {
    // The beak, pale, and the yellow cheek.
    cells.set(Math.round(b + hl + 0.4), Math.round(drop) - 1, C.accent);
    cells.set(Math.round(b + hl - 0.6), Math.round(drop) - 1, C.accent);
    cells.set(Math.round(b + 0.6), -1, C.cheek);
  }
  if (sp.pectoral) {
    const [pu, pv, plen, pr] = sp.pectoral;
    const scull = calm ? 0 : Math.sin(beat * 0.5 + 1) * 0.6;
    capsule(cells, [pu, pv], [pu - plen * 0.8, pv - plen * 0.5 + scull], pr, pr * 0.5, (lit) =>
      pick(sp.pattern === "shark" ? ramp(C.body) : rFin, lit - 0.2),
    );
  }
  if (sp.pattern === "shark") {
    // The black tip on the pectoral and the pale flank band.
    const [pu, pv, plen] = sp.pectoral;
    cells.set(Math.round(pu - plen * 0.8), Math.round(pv - plen * 0.5) - 1, C.mark);
    for (let u = Math.round(a) + 2; u < Math.round(b) - 2; u += 1) if (cells.has(u, -1)) cells.set(u, -1, C.belly);
  }
  tidy(cells);
  const [eu, ev] = sp.eye;
  if (cells.has(eu, ev)) cells.set(eu, ev, C.eye);
  return cells;
}

// Lays cells on the page round (x, y) facing dir, with a soft shadow on the row `shadowRow` when
// the fish swims close over the sand.
function paintCells(g, cells, x, y, dir, shadowRow = null) {
  const ox = Math.round(x);
  const oy = Math.round(y);
  const X = (u) => (dir > 0 ? ox + u : ox - u);
  if (shadowRow !== null) {
    g.ctx.fillStyle = shadowColour(g.pal);
    const us = new Set(cells.values().map(([u]) => u));
    for (const u of us) g.ctx.fillRect(X(u), shadowRow, 1, 1);
  }
  for (const [u, v, c] of cells.values()) {
    g.ctx.fillStyle = c;
    g.ctx.fillRect(X(u), oy - v, 1, 1);
  }
}

// Draws a swimming fish f ({ x, y, dir, phase }) of `kind` at `time`; y is its body's middle row.
export function fishAt(g, kind, f, time, shadowRow = null) {
  if (g.trace) return g.trace.draw(fishAt, g, kind, f, time, shadowRow);
  const C = g.pal[kind];
  const phase = f.phase ?? 0;
  const bob = Math.sin(time * 1.9 + phase * 3) * 0.6;
  paintCells(g, fishCells(kind, C, time * (f.rate ?? 1), phase), f.x, f.y + bob, f.dir, shadowRow);
}

// A school: members [{ back, up, phase }] behind the leader at (s.x, s.y). With s.calm the school
// beats as one at SCHOOL_BEAT (its tails in step, on the school's own phase).
export function schoolAt(g, kind, s, time) {
  if (g.trace) return g.trace.draw(schoolAt, g, kind, s, time);
  for (const m of s.members) {
    const y = s.y + m.up + Math.sin(time * 1.6 + m.phase) * 1.2;
    const cells = fishCells(kind, g.pal[kind], time, s.calm ? (s.phase ?? 0) : m.phase, Boolean(s.calm));
    paintCells(g, cells, s.x - s.dir * m.back, y, m.dir ?? s.dir);
  }
}

// ---- The epaulette shark -------------------------------------------------------------------------

// A slender cat shark of the reef flats (Hemiscyllium ocellatum, 0.7 m) that walks at night on its
// pectoral and pelvic fins: a long tail, small dorsals far back, dark spots, and the big black
// "epaulette" behind each pectoral, ringed in white. Units: v0 the ground.
export const EPAULETTE = { len: 9.9, stride: [5, 0.7] };

// One short fin as a leg, in one of its four drawn poses: 0 reaching, 1 under, 2 pushed back,
// 3 lifted. Returns its cells [u, v] from the root (u, 2).
function finLeg(u, pose) {
  switch (pose) {
    case 0:
      return [
        [u, 1],
        [u + 1, 1],
        [u + 1, 0],
        [u + 2, 0],
      ];
    case 1:
      return [
        [u, 1],
        [u, 0],
        [u + 1, 0],
      ];
    case 2:
      return [
        [u, 1],
        [u - 1, 1],
        [u - 1, 0],
        [u - 2, 0],
      ];
    default:
      return [
        [u, 1],
        [u + 1, 1],
      ];
  }
}

// One walking epaulette shark into cells: c its stride clock, m how far into a walk (0 stands).
export function epauletteCells(C, c = 0, m = 0, t = 0) {
  const cells = new Cells();
  const rB = ramp(C.body);
  const rF = ramp(mix(C.body, "#000000", 0.3));
  const beatOf = (off) => (m < 0.3 ? 1 : Math.floor(frac(c + off) * 4));
  // Far fins first, a diagonal gait: near fore with far hind.
  for (const [u, off] of [
    [3, 0.5],
    [-2, 0],
  ]) {
    for (const [fu, fv] of finLeg(u + 1, beatOf(off))) cells.set(fu, fv, rF[1]);
  }
  const sway = Math.sin(t * 2.2 + c * Math.PI * 2) * 0.7;
  capsule(cells, [-3, 2.2], [-11, 2.8 + sway], 1.2, 0.45, (lit) => pick(rB, lit));
  capsule(cells, [-3, 2.2], [4.5, 2.4], 1.2, 1.5, (lit, _nx, ny) => (ny < -0.3 ? C.belly : pick(rB, lit)));
  capsule(cells, [4.5, 2.4], [6.6, 2.1], 1.4, 0.9, (lit, _nx, ny) => (ny < -0.3 ? C.belly : pick(rB, lit)));
  capsule(cells, [-5.5, 3.2], [-6.4, 4.4], 0.6, 0.35, (lit) => pick(rB, lit));
  capsule(cells, [-7.6, 3.2], [-8.3, 4.1], 0.5, 0.35, (lit) => pick(rB, lit));
  for (const [u, off] of [
    [3, 0],
    [-2, 0.5],
  ]) {
    for (const [fu, fv] of finLeg(u, beatOf(off))) cells.set(fu, fv, rB[2]);
  }
  tidy(cells);
  // Spots, fixed to the body, and the epaulette: black, ringed in white, behind the pectoral.
  for (const [u, v] of [
    [-2, 3],
    [-5, 2],
    [-8, 3],
    [5, 3],
  ])
    if (cells.has(u, v)) cells.set(u, v, C.spot);
  for (const [u, v] of [
    [0, 2],
    [0, 3],
    [1, 4],
    [2, 4],
    [3, 3],
    [3, 2],
  ])
    if (cells.has(u, v)) cells.set(u, v, C.ring);
  for (const [u, v] of [
    [1, 2],
    [1, 3],
    [2, 2],
    [2, 3],
  ])
    cells.set(u, v, C.mark);
  if (cells.has(6, 3)) cells.set(6, 3, C.eye);
  return cells;
}

// Draws the epaulette shark w ({ x, dir, c, m }) with its fins on row y - 1.
export function epauletteAt(g, w, y, time) {
  if (g.trace) return g.trace.draw(epauletteAt, g, w, y, time);
  const cells = epauletteCells(g.pal.epaulette, w.c ?? 0, w.m ?? 0, time);
  const ox = Math.round(w.x);
  const X = (u) => (w.dir > 0 ? ox + u : ox - u);
  g.ctx.fillStyle = shadowColour(g.pal);
  for (let u = -10; u <= 7; u += 1) g.ctx.fillRect(X(u), y, 1, 1);
  for (const [u, v, c] of cells.values()) {
    g.ctx.fillStyle = c;
    g.ctx.fillRect(X(u), y - 1 - v, 1, 1);
  }
}

// ---- The manta -----------------------------------------------------------------------------------

// Fills the polygon pts ([[u, v], ...]) into cells with tone(u, v).
function poly(cells, pts, tone) {
  const us = pts.map((p) => p[0]);
  const vs = pts.map((p) => p[1]);
  for (let u = Math.floor(Math.min(...us)); u <= Math.ceil(Math.max(...us)); u += 1) {
    for (let v = Math.floor(Math.min(...vs)); v <= Math.ceil(Math.max(...vs)); v += 1) {
      const x = u + 0.5;
      const y = v + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) cells.set(u, v, tone(u, v));
    }
  }
}

// A reef manta (Mobula alfredi) seen from below as it glides over, three-quarters on: a white
// belly with its gill slits and its own dark spots (by which divers know it), broad wings edged in
// charcoal that sweep back to pointed tips and beat slowly (the tips rise and fall and swing fore
// and aft), the rolled cephalic fins at its head and a short whip of a tail. About 20 px nose to
// tail and 18 px tip to tip as drawn.
export const MANTA = { span: 26 };
export function mantaCells(C, t = 0, phase = 0) {
  const cells = new Cells();
  const beat = Math.sin(t * 1.5 + phase);
  const lag = Math.sin(t * 1.5 + phase - 0.8);
  const half = 9 - Math.abs(beat) * 1.6;
  const sweep = -3 + lag * 1.4;
  const tone = (side) => (u, v) => {
    const out = Math.abs(v) / half;
    if (out > 0.72 || (u < sweep + 3 && out > 0.5)) return side > 0 ? C.back : C.edge;
    if (side > 0 && out > 0.45) return C.shade;
    return C.belly;
  };
  poly(
    cells,
    [
      [5.5, 0.5],
      [2.5, half * 0.55],
      [sweep, half],
      [-2.5, half * 0.45],
      [-5, 0.5],
    ],
    tone(1),
  );
  poly(
    cells,
    [
      [5.5, -0.5],
      [2.5, -half * 0.55],
      [sweep, -half],
      [-2.5, -half * 0.45],
      [-5, -0.5],
    ],
    tone(-1),
  );
  capsule(cells, [-4.5, 0], [4.8, 0], 2.1, 2.4, (_lit, _nx, ny) => (ny > 0.7 ? C.shade : C.belly));
  // Cephalic fins, rolled, either side of the mouth.
  capsule(cells, [5.2, 1.7], [7.6, 2], 0.6, 0.5, () => C.back);
  capsule(cells, [5.2, -1.7], [7.6, -2], 0.6, 0.5, () => C.edge);
  for (let i = 0; i < 6; i += 1) cells.set(-5 - i, Math.round(Math.sin(t * 2 - i * 0.7) * 0.6), C.back);
  // Gill slits, five a side, and its belly spots.
  for (let u = 1; u <= 3; u += 1) {
    cells.set(u, 2, C.shade);
    cells.set(u, -2, C.shade);
  }
  for (const [u, v] of [
    [-1, -1],
    [-2, 0],
    [0, 0],
    [-3, -1],
  ])
    if (cells.get(u, v) === C.belly) cells.set(u, v, C.spot);
  tidy(cells);
  return cells;
}

// Draws the manta m ({ x, y, dir, phase }) at `time`. Its shadow is the scene's to cast (see
// mantaShadow), far below on the sand.
export function mantaAt(g, m, time) {
  if (g.trace) return g.trace.draw(mantaAt, g, m, time);
  const cells = mantaCells(g.pal.manta, time, m.phase ?? 0);
  paintCells(g, cells, m.x, m.y + Math.sin(time * 0.8) * 1.2, m.dir);
}

// The shadow a manta casts on the sand far below it: soft, wide and fading toward its edges.
export function mantaShadow(g, x, row, span = MANTA.span) {
  if (g.trace) return g.trace.draw(mantaShadow, g, x, row, span);
  const a = g.ctx.globalAlpha;
  g.ctx.fillStyle = shadowColour(g.pal);
  for (let i = 0; i < 3; i += 1) {
    const half = Math.round(span * (0.5 - i * 0.12));
    g.ctx.globalAlpha = a * clamp(0.9 - i * 0.25, 0, 1);
    g.ctx.fillRect(Math.round(x - half), row + i, half * 2 + 1, 1);
  }
  g.ctx.globalAlpha = a;
}

export const FAMILIES = [
  {
    id: "fish",
    title: "Fish and sharks",
    group: "Animals",
    differ: "size, body profile, tail, fins, markings; the epaulette walks on its fins",
    members: {
      chromis: { spec: FISH.chromis, realLength: 0.07 },
      clownfish: { spec: FISH.clownfish, realLength: 0.08 },
      anthias: { spec: FISH.anthias, realLength: 0.1 },
      wrasse: { spec: FISH.wrasse, realLength: 0.1 },
      parrotfish: { spec: FISH.parrotfish, realLength: 0.6 },
      trevally: { spec: FISH.trevally, realLength: 1.2, predator: true },
      blacktip: { spec: FISH.blacktip, realLength: 1.4, predator: true },
      epaulette: { spec: EPAULETTE, realLength: 0.7, predator: true },
    },
    drivers: {
      epauletteAt: { role: "walker", member: () => "epaulette", day: false },
      fishAt: {
        role: "swimmer",
        member: (_a, args) => args[0],
        day: (a, args) => args[0] !== "blacktip" && !a?.asleep,
      },
      schoolAt: { role: "group", member: (_a, args) => `${args[0]} school`, day: true },
    },
  },
  {
    id: "rays",
    title: "Rays",
    group: "Animals",
    differ: "span, colour, belly spots",
    drivers: {
      mantaAt: { role: "swimmer", member: () => "manta", day: true },
      mantaShadow: { role: "prop", member: () => "manta shadow" },
    },
  },
];
