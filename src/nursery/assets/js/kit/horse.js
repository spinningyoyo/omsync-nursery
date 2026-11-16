// Horses built from parts: the plains zebra and its foal, on the hoofed build (the Hundred Acre Wood's
// donkey draws with the same build from a spec of his own: stripes are optional). A heavy barrel, legs
// of two bones (the fore knee bending forward, the hind hock back, each hind leg with a full thigh)
// ending in a dark hoof, a thick neck with an upright mane that grows from its crest and leans, lifts
// and dips with it, ears that are parts of their own and flick, a tail that hangs from the hips with a
// tuft, and a head placed on the neck's end. Four tones lit from above; a zebra's stripes are laid in
// the coat's own columns (the spec's `coat`), so they travel with the body. One spec per member, drawn
// by drawHorse(spec, pal, plot, pose); animals.js's zebraAt places and poses it. Coordinates are the
// horse's own: x runs from the rump (0) toward the nose and h is the height above the ground;
// `plot(x, h, colour)` paints a pixel, so the caller places and mirrors it. Rest poses: stand, graze,
// lie, back (rolled onto its back, legs in the air) and sit (back on its haunches). dustAt paints the
// cloud that leaves a rolling zebra's coat (and the bison's wallow).
//
// The hoofed parts (the gait, the rest shapes, the blend, the roll onto the back, the legs, the ears,
// the neck and its mane, the tail, the body, the haunch and the head) are hoof.js's, on build.js.
import { shapeCache } from "./build.js";
import {
  flipCentre,
  GAIT,
  hoofBody,
  hoofFeet,
  hoofFrame,
  hoofFront,
  hoofHaunch,
  hoofLimb,
  hoofRow,
  hoofShapes,
  hoofTail,
  paintHoofLimb,
} from "./hoof.js";
import { hash, mix } from "./pixel.js";

export { GAIT };

// ---- Poses ------------------------------------------------------------------------------------

// The hoofed rest shapes; grazing, the shoulders and the back dip as one.
const SHAPES = hoofShapes(hoofFeet, (spec, x) => (x > spec.len * 0.55 ? -spec.grazeDip : 0));
const shapeOf = shapeCache(SHAPES, flipCentre);

// ---- The horse --------------------------------------------------------------------------------

// One horse from a spec, in its own units: x runs from the rump (0) toward the nose, h is the height
// above the ground. `plot(x, h, colour)` paints one pixel. Pose fields: phase, amp (the walk), sway (the
// tail), head (added to the rest pose's attitude: + looks up), blink, breath, bodyX (plants the hooves
// while the body steps on), rest ({ from, to, u }), shake (px the body shudders sideways), kick (the
// legs of a rolling horse waving), ear (0 to 1, the ears flicking up and round) and flop (the ears
// loosely swinging).
export function drawHorse(spec, pal, plot, pose) {
  const f = hoofFrame(spec, shapeOf, pal, plot, pose);
  const { shape, put, putBody, P } = f;

  // A leg: two tapering bones from the body to the hoof; the hoof is a dark row at the foot.
  const limb = (L, offset, far) => {
    const { cells, F } = hoofLimb(spec, f, pose, L, offset, far);
    hoofRow(cells, spec, L, F, false);
    return [...cells.values()];
  };
  const paintLimb = (cells, far) => paintHoofLimb(spec, pal, put, cells, far);

  const [nh, nf, fh, ff] = GAIT.at;
  paintLimb(limb(spec.hind, fh, true), true);
  paintLimb(limb(spec.fore, ff, true), true);
  hoofTail(spec, shape, f.dropHind, pose.sway ?? 0, putBody, P);
  hoofBody(spec, pal, shape, f.dropAt, pose.breath ?? 0, f.inv, putBody);
  paintLimb(limb(spec.hind, nh, false), false);
  hoofHaunch(spec, pal, shape, f.sx, put);
  paintLimb(limb(spec.fore, nf, false), false);

  // The neck, and the head on its end with the ears growing from it.
  hoofFront(spec, pal, pose, f);
}

// ---- Tones ------------------------------------------------------------------------------------

// The zebra's four white and four black tones from the scene's palette [white, black, belly], lit
// from above: the whites run from warm at the back to grey underneath, the blacks stay soft. The
// foal's blacks are browner and its whites warmer.
export function zebraTones([white, black, belly], foal = false) {
  const w = foal ? mix(white, "#e0c9a0", 0.4) : white;
  const k = foal ? mix(black, "#6a4a32", 0.5) : black;
  const wH = mix(w, "#fff4dc", 0.5);
  const wS = mix(w, belly, 0.7);
  const wU = mix(belly, k, 0.15);
  const kH = mix(k, w, 0.2);
  const kS = mix(k, "#000000", 0.15);
  const kU = mix(k, "#000000", 0.3);
  return {
    H: wH,
    T: w,
    S: wS,
    U: wU,
    wH,
    wT: w,
    wS,
    wU,
    kH,
    kT: k,
    kS,
    kU,
    h: wH,
    t: w,
    s: wS,
    u: wU,
    K: k,
    k: kS,
    N: mix(k, belly, 0.25),
    e: kU,
    L: w,
    l: mix(belly, k, 0.35),
  };
}

// Stripes in the coat, in the body's own columns, so they ride with it. Black runs down the barrel,
// leaning back with the height, and fans out into chevrons over the rump; the belly is white.
const stripeAt = (x, dh, _depth, key, pal, foal) => {
  const base = key === "H" ? "H" : key === "S" ? "S" : key === "U" ? "U" : "T";
  const edge = foal ? 3 : 4; // where the barrel ends and the haunch begins
  if (key === "U" || dh < 1) return pal[`w${base}`];
  // Barrel: straight bands, one black column in three. Haunch: the bands turn diagonal.
  const black = x >= edge ? (x - edge) % 3 === 1 : (((x + dh) % 3) + 3) % 3 === 1;
  return black ? pal[`k${base}`] : pal[`w${base}`];
};

// ---- The members ------------------------------------------------------------------------------

export const ZEBRA = {
  id: "zebra",
  len: 15,
  top: [
    [0, 13],
    [1, 14],
    [14, 14],
  ],
  bottom: [
    [0, 10],
    [1, 8],
    [2, 7],
    [14, 7],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [11, 14],
  bob: 1,
  hind: { root: [3, 10], a: 4.8, b: 5.2, bend: -1, foot: 3, w: [6, 2.4, 2], stand: [0, 1] },
  fore: { root: [12, 9], a: 4.4, b: 4.8, bend: 1, foot: 12, w: [3.4, 2.2, 2], stand: [1, -3], fore: true },
  farShift: 2,
  stride: 5,
  lift: 1.6,
  hoof: 2,
  grazeDip: 1,
  tail: {
    points: [
      [0, 13],
      [-1, 12],
      [-1, 6],
    ],
    w: 1,
    sway: 0.7,
    tuftFrom: 0.62,
    colour: (t) => (t > 0.3 ? "kT" : "kS"),
  },
  coat: (x, dh, depth, key, pal) => stripeAt(x, dh, depth, key, pal),
  // The legs are banded: a black band every other row, white between, grey in the shade.
  legCoat: (_x, h, far, pal) => (h % 2 === 0 ? (far ? pal.kS : pal.kT) : far ? pal.l : pal.wS),
  thighCoat: (x, h, far, pal) => ((((x + h) % 3) + 3) % 3 === 1 ? (far ? pal.kU : pal.kS) : far ? pal.l : pal.wS),
  neck: {
    base: [12, 12],
    w: [6.4, 4],
    mane: 1,
    maneSolid: true,
    maneTo: 0.88,
    maneKey: (i) => (i % 2 === 0 ? "kT" : "wT"),
    level: [3.4, 3.4],
    low: [4.6, -8.5],
    high: [3.6, 5.6],
    lying: [3.5, 5],
    back: [4, 0.6],
    colour: (_along, across, px) => {
      const black = ((Math.round(px) % 3) + 3) % 3 === 1;
      const tone = across > 0.45 ? "H" : across < -0.4 ? "S" : "T";
      return black ? `k${tone}` : `w${tone}`;
    },
  },
  heads: {
    level: {
      grid: [".hhh......", "hKethK....", "sKttthtK..", ".sttKttttK", "..sstttNNN", "....ssNNN."],
      anchor: [0, 1],
      ear: [2, 0],
    },
    low: {
      grid: [".hh..", "hKeh.", "sKtth", "sKttt", ".sKtt", ".sttK", "..sNN", "..NNN"],
      anchor: [0, 1],
      ear: [2, 0],
    },
    high: { grid: [".hhh......", "hKethK....", "sKttthtK..", ".sttKtNNNN", "..sstNNN.."], anchor: [0, 1], ear: [2, 0] },
  },
  // Short upright ears, black with a pale inside; they flick back and round.
  ear: { rest: 1.45, flick: 2.5, len: 2.1, w: 1.2, near: "kT", far: "kS", farDx: 1 },
  lid: "t",
  haunch: [3.2, 3],
};

// The foal: the same horse smaller, its legs long for its body, a short fuzzy mane, brown stripes.
export const FOAL = {
  ...ZEBRA,
  id: "foal",
  len: 10,
  top: [
    [0, 8],
    [1, 9],
    [9, 9],
  ],
  bottom: [
    [0, 7],
    [1, 5],
    [2, 5],
    [9, 5],
  ],
  chest: [7, 9],
  hind: { root: [2, 7], a: 3.6, b: 4, bend: -1, foot: 2, w: [3.4, 1.4, 1], stand: [0, 1] },
  fore: { root: [8, 6], a: 3.4, b: 3.8, bend: 1, foot: 8, w: [2.4, 1.6, 1.2], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 4,
  lift: 1.3,
  hoof: 1,
  tail: {
    points: [
      [0, 8],
      [-1, 7],
      [-1, 3],
    ],
    w: 1,
    sway: 0.7,
    tuftFrom: 0.6,
    colour: (t) => (t > 0.3 ? "kT" : "kS"),
  },
  coat: (x, dh, depth, key, pal) => stripeAt(x, dh, depth, key, pal, true),
  legCoat: (_x, h, far, pal) => (h % 2 === 0 ? (far ? pal.kS : pal.kT) : far ? pal.l : pal.wS),
  thighCoat: (x, h, far, pal) => ((((x + h) % 3) + 3) % 3 === 1 ? (far ? pal.kU : pal.kS) : far ? pal.l : pal.wS),
  neck: {
    base: [8, 8],
    w: [4.4, 2.8],
    mane: 1,
    level: [3, 3],
    low: [3.2, -5.5],
    high: [3, 4.6],
    lying: [2.5, 4.5],
    back: [3, 0.6],
    colour: ZEBRA.neck.colour,
  },
  heads: {
    level: { grid: [".hh....", "hKeh...", "sKtthK.", ".sttKtN", "..sstNN"], anchor: [0, 1], ear: [2, 0] },
    low: { grid: [".hh.", "hKeh", "sKtt", ".sKt", ".stK", "..NN", "..NN"], anchor: [0, 1], ear: [2, 0] },
    high: { grid: [".hh....", "hKeh...", "sKtthK.", ".sttKNN", "..sstN."], anchor: [0, 1], ear: [2, 0] },
  },
  ear: { ...ZEBRA.ear, len: 2, w: 1.2 },
  haunch: [2.4, 2.4],
};

// The dust that leaves the coat after a roll and the little clouds kicked up while it rolls. Each
// speck climbs, drifts and fades; `s` is the seconds since the cloud started. `ox` is the animal's
// left edge column and `feet` its feet row; the cloud is drawn in the scene's own `horseDust` colour
// (or the palette key `colour` names: the bison's wallow uses `bisonDust`).
export function dustAt(g, ox, feet, s, { x0, x1, count = 14, life = 1.2, rise = 9, colour = "horseDust" }) {
  if (s < 0 || s > life) return;
  g.ctx.save();
  for (let i = 0; i < count; i += 1) {
    const a = hash(i, 1, 7);
    const b = hash(i, 2, 7);
    const born = b * 0.25;
    const u = (s - born) / (life - 0.25);
    if (u < 0 || u > 1) continue;
    const x = ox + x0 + (x1 - x0) * a + (a - 0.5) * 6 * u;
    const h = 1 + u * rise * (0.4 + b * 0.6) - u * u * 2;
    g.ctx.globalAlpha = (1 - u) * 0.85;
    g.ctx.fillStyle = g.pal[colour];
    const size = u < 0.4 && i % 3 === 0 ? 2 : 1;
    g.ctx.fillRect(Math.round(x), Math.round(feet - 1 - h), size, size);
  }
  g.ctx.restore();
}

// Eeyore (Hundred Acre Wood), the same build with no stripes: his own spec, in the book's grey. Tones from the scene's palette [grey, shade, dark, muzzle]: the highlight toward the pale muzzle, the
// base, the shade, the darkest underneath, the far legs and the dark of the mane, hooves and tail.
export function eeyoreTones([grey, shade, dark, muzzle]) {
  return {
    H: mix(grey, muzzle, 0.55),
    T: grey,
    S: shade,
    U: mix(shade, dark, 0.45),
    L: mix(grey, shade, 0.35),
    l: mix(shade, dark, 0.35),
    kT: dark,
    kS: mix(dark, "#000000", 0.2),
    kU: mix(dark, "#000000", 0.3),
    kH: mix(dark, grey, 0.25),
    g: grey,
    h: mix(grey, muzzle, 0.55),
    s: shade,
    d: dark,
    m: muzzle,
    e: mix(dark, "#000000", 0.3),
    wT: grey,
    wS: shade,
    wH: muzzle,
    wU: shade,
  };
}

export const EEYORE = {
  id: "eeyore",
  len: 12,
  top: [
    [0, 10],
    [1, 11],
    [11, 11],
  ],
  bottom: [
    [0, 8],
    [1, 6],
    [2, 5],
    [11, 5],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [8, 11],
  bob: 1,
  hind: { root: [2, 7], a: 3.1, b: 3.2, bend: -1, foot: 2, w: [6, 1.7, 1.3], stand: [0, 1] },
  fore: { root: [10, 6], a: 2.9, b: 3, bend: 1, foot: 10, w: [2.2, 1.4, 1.4], stand: [1, -2], fore: true },
  farShift: 2,
  stride: 3,
  lift: 1.2,
  hoof: 2,
  grazeDip: 1,
  tail: {
    points: [
      [0, 10],
      [-1, 9],
      [-1, 4],
    ],
    w: 1,
    sway: 0.5,
    colour: (t) => (t > 0.85 ? "kT" : "S"),
  },
  neck: {
    base: [11, 9],
    w: [4.6, 3.4],
    mane: 1,
    maneSolid: true,
    maneTo: 1,
    level: [3.2, -2],
    low: [3.2, -3.4],
    high: [3.6, 0.4],
    lying: [3, -1.4],
    colour: (_along, across) => (across > 0.4 ? "H" : across < -0.4 ? "S" : "T"),
  },
  heads: {
    level: {
      grid: [".hgg....", "hggggs..", "geggggs.", "ggggggmm", ".gggmmmm", "..gsmmmm", "...smmm."],
      anchor: [0, 1],
      ear: [1, 0],
    },
    low: { grid: [".hgg..", "hgggs.", "gegggs", "ggggs.", ".gmms.", "..mmm.", "..mmm."], anchor: [0, 1], ear: [1, 0] },
    high: { grid: [".hgg....", "hggggs..", "geggggmm", "gggggmmm", ".gssmmm."], anchor: [0, 1], ear: [1, 0] },
  },
  // Long donkey ears laid back from the top of the head and drooping at the tip, in his grey with a
  // darker inner; they flick up and swing as he walks.
  ear: {
    rest: 2.05,
    flick: 1.5,
    len: 7,
    w: 2.4,
    droop: 0.12,
    near: "T",
    far: "U",
    inner: "S",
    innerAll: true,
    farDx: 1,
  },
  lid: "s",
  haunch: [3.6, 3.4],
  sitHead: -0.6,
};
