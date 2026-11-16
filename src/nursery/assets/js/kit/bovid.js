// Wild cattle and sheep built from parts, on the hoofed build (hoof.js, whose gait, rest shapes, pose
// blend, legs, ears, neck, tail, body, haunch and head it shares with the horses; the engine under it
// is build.js): the American bison and its calf, and the bighorn ram. Two-bone legs with full thighs,
// four tones lit from above, far legs darker, a soft ground shadow. Added for horned animals: horns
// that grow from the head and move with it (the ram's are a curled arc swept round a centre fixed to
// the head; the bison's are short, in its head grid), a bison's hump and shaggy dark front laid in the
// coat's own columns, a brisket column for the ram's chest, a foreleg that stamps, an open jaw that
// chews, a leg cleanup, and a head that can be swapped (`pose.headGrid`) for the ram's three-quarter
// look-out (RAM_TURN_HEAD). Coordinates are the animal's own: x runs from the rump (0) toward the
// nose and h is the height above the ground; `plot(x, h, colour)` paints a pixel. Rest poses: stand,
// graze, lie and back (the wallow: rolled over, legs in the air). The wallow's dust is horse.js's
// dustAt with `colour: "bisonDust"`. animals.js's bisonAt and bighornAt place and pose them.

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
  hoofShapes,
  hoofTail,
  paintHoofLimb,
} from "./hoof.js";
import { clamp, hash, lerp, mix, smooth } from "./pixel.js";

// ---- Poses ------------------------------------------------------------------------------------

// The hoofed rest shapes (a leg may stand its far foot its own way from the near one, L.farShift);
// grazing, the dip deepens smoothly from the middle of the back to the shoulders.
const SHAPES = hoofShapes(
  hoofFeet,
  (spec, x) => -spec.grazeDip * smooth(clamp((x - spec.len * 0.3) / (spec.len * 0.5), 0, 1)),
);
const shapeOf = shapeCache(SHAPES, flipCentre);

// ---- The bovid --------------------------------------------------------------------------------

// Tidies a leg like the bear's body: a cell with no more than one four-neighbour goes (a knee tip
// poking out past the chest included), an empty one with three or more is filled, twice over.
const NEAR = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
function tidyLeg(cells) {
  const top = Math.max(...[...cells.values()].map((c) => c[1]));
  for (let pass = 0; pass < 2; pass += 1) {
    const links = (x, h) => NEAR.filter(([dx, dh]) => cells.has(`${x + dx}|${h + dh}`));
    const drop = [];
    const add = [];
    const seen = new Set();
    for (const [k, c] of cells) {
      const [x, h] = c;
      if (links(x, h).length <= 1) drop.push(k);
      for (const [dx, dh] of NEAR) {
        const k2 = `${x + dx}|${h + dh}`;
        if (cells.has(k2) || seen.has(k2) || h + dh < 0 || h + dh > top) continue;
        seen.add(k2);
        const n = links(x + dx, h + dh);
        if (n.length >= 3) add.push([k2, [x + dx, h + dh, c[2], c[3]]]);
      }
    }
    for (const k of drop) cells.delete(k);
    for (const [k, v] of add) cells.set(k, v);
  }
}

// One bovid from a spec, in its own units: x runs from the rump (0) toward the nose, h is the height
// above the ground. `plot(x, h, colour)` paints one pixel. Pose fields: phase, amp (the walk), sway (the
// tail), head (added to the rest pose's attitude: + looks up), blink, breath, bodyX (plants the hooves
// while the body steps on), rest ({ from, to, u }), shake (px the body shudders sideways), kick (the
// legs of a rolling animal waving), ear (0 to 1, the ears flicking up and round), flop (the ears
// loosely swinging), stamp (0 to 1, the near foreleg lifted), mouth (the jaw open) and headGrid.
export function drawBovid(spec, pal, plot, pose) {
  const last = spec.len - 1;
  const painted = new Set();
  const f = hoofFrame(spec, shapeOf, pal, plot, pose, painted);
  const { shape, put, putBody, P, inv } = f;

  // A leg: two tapering bones from the body to the hoof (no row narrower than L.min), filled row by
  // row so each row reaches the row above; the near foreleg can stamp.
  const limb = (L, offset, far) => {
    const stamp = L.fore && !far ? (pose.stamp ?? 0) : 0;
    const { cells, F } = hoofLimb(spec, f, pose, L, offset, far, stamp);
    // The hoof is the leg's own bottom row, so it can never jut out from the leg.
    const fh = Math.round(F[1]);
    for (const [k, c] of cells) if (c[1] === fh) cells.set(k, [c[0], c[1], "K", true]);
    tidyLeg(cells);
    return [...cells.values()];
  };
  const paintLimb = (cells, far) => paintHoofLimb(spec, pal, put, cells, far);

  // A curled horn grows from the head it is drawn on: a thick arc swept round a centre that is fixed
  // to the head's anchor, tapering to the tip, lit on top and shaded beneath. The far horn peeks out
  // above and behind the near one in a darker tone.
  const horn = (anchor, near) => {
    const [ex0, eh0, _ac0, _ar0, hd] = anchor;
    const Hn = hd.horn;
    if (!Hn || shape.flip > 0.5) return;
    const n = 48;
    const off = near ? [0, 0] : (Hn.far ?? [0, 0]);
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const ang = lerp(Hn.a0, Hn.a1, t);
      const r = lerp(Hn.r0, Hn.r1, t);
      const cx = ex0 + Hn.c[0] + off[0];
      const ch = eh0 + Hn.c[1] + off[1];
      const px = cx + Math.cos(ang) * r;
      const ph = ch + Math.sin(ang) * r * (Hn.sq ?? 1);
      const w = lerp(Hn.w0, Hn.w1, t);
      for (let dx = -2; dx <= 2; dx += 1) {
        for (let dh = -2; dh <= 2; dh += 1) {
          const X = Math.round(px) + dx;
          const Hh = Math.round(ph) + dh;
          if (Math.hypot(X - px, Hh - ph) > w * 0.5 + 0.15) continue;
          const inner = Math.hypot(X - cx, Hh - ch) < r - 0.35;
          const key = !near ? "oF" : t > 0.9 ? "oP" : inner ? "oS" : Math.sin(ang) > 0.3 ? "oH" : "oT";
          putBody(X, Hh, P(key));
        }
      }
    }
  };

  const [nh, nf, fh, ff] = GAIT.at;
  paintLimb(limb(spec.hind, fh, true), true);
  paintLimb(limb(spec.fore, ff, true), true);
  hoofTail(spec, shape, f.dropHind, pose.sway ?? 0, putBody, P);
  hoofBody(spec, pal, shape, f.dropAt, pose.breath ?? 0, inv, putBody);

  // A brisket column: the chest filled out one column to the front, in front of the neck and above the
  // elbow (the ram's; the owner's edit), toned with the body: the upper half base, the lower shade.
  if (spec.brisket) {
    const Bk = spec.brisket;
    const o = shape.off(last);
    for (let h = Bk.b; h <= Bk.t; h += 1) {
      const dh = inv ? Bk.t - h : h - Bk.b;
      const hh = Math.max(0, Math.round(h + o) - f.dropFore);
      putBody(Bk.x, hh, pal[dh >= (Bk.t - Bk.b + 1) / 2 ? "T" : "S"]);
    }
  }

  paintLimb(limb(spec.hind, nh, false), false);
  hoofHaunch(spec, pal, shape, f.sx, put);
  paintLimb(limb(spec.fore, nf, false), false);

  // The neck (a bison's runs on into its beard), and the head on its end with its ears and horns; the
  // head may be swapped for pose.headGrid, or open its jaw (pose.mouth).
  hoofFront(spec, pal, pose, f, {
    painted,
    pick: (head) => pose.headGrid ?? (pose.mouth && head.open ? { ...head, grid: head.open } : head),
    horn,
  });
}

// ---- Tones --------------------------------------------------------------------------------------

// The bison's tones from the scene's palette [dark, tan, horn, beard] and bisonShade: tan hindquarters
// lit from above (highlight, base, shade, underneath) and the dark woolly front in the same four.
export function bisonTones([dark, tan, horn, beard], shade, theme = "light") {
  const hoof = mix(beard, "#000000", 0.35);
  const tones = {
    H: mix(tan, "#f0d3a0", 0.35),
    T: tan,
    S: shade,
    U: mix(shade, beard, 0.55),
    dH: mix(dark, tan, 0.3),
    dT: dark,
    dS: mix(dark, beard, 0.45),
    dU: beard,
    dM: theme === "dark" ? "#42301f" : "#5a3f28",
    L: mix(dark, beard, 0.25),
    l: beard,
    kT: hoof,
    kS: mix(beard, "#000000", 0.5),
    e: mix(beard, "#000000", 0.6),
    N: mix(dark, tan, 0.2),
    B: beard,
    o: mix(horn, "#ffffff", 0.2),
    p: mix(beard, horn, 0.4),
    F: mix(dark, tan, 0.62),
  };
  return { ...tones, h: tones.dH, D: tones.dT, d: tones.dS, u: tones.dU };
}

// The calf's, from [tan, dark]: all orange-tan, no hump, the legs and muzzle browner.
export function calfTones([tan, dark]) {
  const t = {
    H: mix(tan, "#ffe0b0", 0.35),
    T: tan,
    S: mix(tan, dark, 0.35),
    U: mix(tan, dark, 0.7),
    L: mix(tan, dark, 0.3),
    l: mix(tan, dark, 0.65),
    kT: mix(dark, "#000000", 0.2),
    kS: mix(dark, "#000000", 0.45),
    e: mix(dark, "#000000", 0.5),
    N: mix(tan, dark, 0.7),
    u: mix(tan, dark, 0.5),
  };
  return { ...t, h: t.H, c: t.T, s: t.S };
}

// The ram's from [coat, pale, horn, dark, horn shade]: a brown coat in four tones, a pale rump, belly
// and muzzle, and horn in four (lit on top, base, shaded inside, a pale worn tip) with the far horn darker.
export function sheepTones([coat, pale, horn, dark, hornShade]) {
  const t = {
    H: mix(coat, "#fff0d0", 0.22),
    T: coat,
    S: mix(coat, dark, 0.35),
    U: mix(coat, dark, 0.62),
    pH: mix(pale, "#ffffff", 0.3),
    pT: pale,
    pS: mix(pale, coat, 0.4),
    pU: mix(pale, coat, 0.7),
    oH: mix(horn, "#fff0c0", 0.45),
    oT: mix(horn, "#d9a850", 0.3),
    oS: mix(hornShade, dark, 0.2),
    oP: mix(horn, pale, 0.5),
    oF: mix(hornShade, dark, 0.4),
    L: mix(coat, dark, 0.22),
    l: mix(coat, dark, 0.55),
    kT: dark,
    kS: mix(dark, "#000000", 0.35),
    e: mix(dark, "#000000", 0.5),
    N: dark,
    P: pale,
    u: mix(dark, coat, 0.2),
  };
  return { ...t, h: t.H, c: t.T, s: t.S, Q: t.oH, O: t.oT, R: t.oS };
}

// ---- The members --------------------------------------------------------------------------------

const BISON_LEVEL = [
  "..po...",
  ".hDoD..",
  ".DDDDDd",
  "DFFeFFd",
  ".dFFFFN",
  ".uFFFNN",
  "..BBBN.",
  "..BBBB.",
  "...BBB.",
  "....B..",
];
const BISON_LOW = ["..po..", ".hDoD.", ".DDDDd", "DFeFFd", ".dFFFd", ".uFFNN", ".BBFNN", ".BBBN.", "..BBB.", "...B.."];

// The American bison: a high hump over the shoulders, a deep dark woolly front, slim tan hindquarters
// with full thighs, short legs, a head hung low with a forelock, short horns and a beard, a thin tail
// with a tuft. The dark of the front is laid in the coat's own columns, so it travels with the body.
export const BISON = {
  id: "bison",
  len: 19,
  top: [
    [0, 13],
    [1, 14],
    [5, 15],
    [9, 17],
    [13, 19],
    [17, 19],
    [18, 16],
  ],
  bottom: [
    [0, 10],
    [1, 8],
    [3, 7],
    [8, 6],
    [14, 5],
    [18, 5],
  ],
  lit: 2,
  litFrom: 3,
  under: 2,
  chest: [14, 18],
  bob: 1,
  hind: { root: [3, 8], a: 4.2, b: 4.2, bend: -1, foot: 3, w: [7, 3, 2.4], min: 2, stand: [0, 1] },
  fore: { root: [15, 6], a: 3.1, b: 3.1, bend: 1, foot: 15, w: [6, 4, 3], min: 3, stand: [1, -3], fore: true },
  farShift: 2,
  stride: 5,
  lift: 1.4,
  hoof: 2,
  grazeDip: 2,
  tail: {
    points: [
      [0, 13],
      [-1, 11],
      [-1, 5],
    ],
    w: 1,
    sway: 0.8,
    tuftFrom: 0.62,
    colour: (t) => (t > 0.5 ? "B" : "dS"),
  },
  coat: (x, dh, depth, key, pal) => {
    const edge = 12 - 4.5 * (dh / Math.max(1, depth));
    const dark = x >= edge + 1 ? 1 : x <= edge - 1 ? 0 : hash(x, dh, 5) < (x - edge + 1) / 2 ? 1 : 0;
    return dark ? pal[`d${key}`] : pal[key];
  },
  legCoat: (_x, _h, far, pal) => (far ? pal.l : pal.L),
  thighCoat: (_x, _h, far, pal) => (far ? pal.l : pal.S),
  neck: {
    base: [15, 16],
    w: [9, 6.5],
    reach: 2.4,
    level: [3.6, -6.8],
    low: [4.6, -12.5],
    high: [4, 0.5],
    lying: [4.5, 2],
    back: [5, 0.6],
    colour: (_along, across) => (across > 0.45 ? "dH" : across < -0.4 ? "dS" : "dT"),
  },
  heads: {
    level: { grid: BISON_LEVEL, anchor: [0, 3] },
    low: { grid: BISON_LOW, anchor: [0, 3] },
    high: { grid: BISON_LEVEL, anchor: [0, 3] },
  },
  lid: "D",
  haunch: [3.4, 3.4],
};

const CALF_LEVEL = [".hhh.", "hcecc", "scccc", "scNNc", ".sss."];
const CALF_LOW = [".hh..", "hcec.", "sccc.", "scNN.", ".ss.."];
export const CALF = {
  id: "calf",
  len: 9,
  top: [
    [0, 8],
    [1, 9],
    [8, 9],
  ],
  bottom: [
    [0, 6],
    [1, 5],
    [8, 5],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [6, 8],
  bob: 1,
  hind: { root: [2, 6], a: 2.6, b: 2.8, bend: -1, foot: 2, w: [3.6, 1.8, 1.4], stand: [0, 1] },
  fore: { root: [7, 5.5], a: 2.6, b: 2.6, bend: 1, foot: 7, w: [2.6, 1.8, 1.4], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 3.5,
  lift: 1.1,
  hoof: 1,
  grazeDip: 1,
  tail: {
    points: [
      [0, 8],
      [-1, 7],
      [-1, 3],
    ],
    w: 1,
    sway: 0.7,
    tuftFrom: 0.6,
    colour: (t) => (t > 0.5 ? "u" : "S"),
  },
  neck: {
    base: [7, 8],
    w: [4, 3],
    level: [2.6, -1.2],
    low: [2.8, -5.5],
    high: [2.6, 2],
    lying: [2.5, 3],
    back: [3, 0.6],
    colour: (_along, across) => (across > 0.45 ? "H" : across < -0.4 ? "S" : "T"),
  },
  heads: {
    level: { grid: CALF_LEVEL, anchor: [0, 1] },
    low: { grid: CALF_LOW, anchor: [0, 1] },
    high: { grid: CALF_LEVEL, anchor: [0, 1] },
  },
  lid: "c",
  haunch: [2.4, 2.4],
};

// The bighorn ram's curled horn on the head's anchor: from the crown back, round and under, ending
// forward beside the cheek.
const RAM_HORN = { c: [-0.9, -0.2], r0: 2.6, r1: 1.7, a0: 1.2, a1: 1.2 + Math.PI * 1.5, w0: 2.7, w1: 1, far: [1.4, 1] };
const RAM_LEVEL = ["..hhh...", ".hccch..", "hcccecc.", ".sccPPPP", "..sPPPN."];
const RAM_OPEN = ["..hhh...", ".hccch..", "hcccecc.", ".sccPPP.", "..s.PNNN", "....PP.."];
const RAM_LOW = ["..hh...", ".hccc..", "hccecc.", ".sccc..", "..sPP..", "..sPN..", "...PN.."];
export const BIGHORN = {
  id: "bighorn",
  len: 12,
  top: [
    [0, 12],
    [1, 13],
    [11, 13],
  ],
  bottom: [
    [0, 7],
    [1, 6],
    [11, 6],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [9, 11],
  brisket: { x: 12, b: 7, t: 10 },
  bob: 1,
  hind: { root: [2, 8], a: 3.3, b: 3.5, bend: -1, foot: 2, w: [5.4, 2.3, 1.8], stand: [0, 1] },
  fore: {
    root: [10, 6],
    a: 3,
    b: 3,
    bend: 1,
    foot: 9,
    w: [3.6, 2.4, 2],
    min: 2,
    farShift: -2,
    stand: [1, 1],
    fore: true,
  },
  farShift: 2,
  stride: 4,
  lift: 1.5,
  hoof: 1,
  grazeDip: 1.5,
  tail: {
    points: [
      [0, 12],
      [-1, 11],
      [-1, 9],
    ],
    w: 1,
    sway: 0.5,
    colour: () => "u",
  },
  coat: (x, dh, depth, key, pal) => (x <= 1 && dh > depth * 0.15 ? pal[`p${key}`] : key === "U" ? pal.pU : pal[key]),
  legCoat: (_x, _h, far, pal) => (far ? pal.l : pal.L),
  thighCoat: (_x, _h, far, pal) => (far ? pal.l : pal.S),
  neck: {
    base: [10, 12],
    w: [5.4, 4],
    level: [2.2, 3],
    low: [3.4, -5.2],
    high: [2, 4.4],
    lying: [2, 4],
    back: [3, 0.6],
    colour: (_along, across) => (across > 0.4 ? "H" : across < -0.4 ? "S" : "T"),
  },
  heads: {
    level: { grid: RAM_LEVEL, open: RAM_OPEN, anchor: [2, 2], horn: RAM_HORN, ear: [3, 0] },
    low: {
      grid: RAM_LOW,
      anchor: [2, 2],
      horn: { ...RAM_HORN, c: [-2.3, 1.1], a0: 0.7, a1: 0.7 + Math.PI * 1.5 },
      ear: [3, 0],
    },
    high: { grid: RAM_LEVEL, open: RAM_OPEN, anchor: [2, 2], horn: RAM_HORN, ear: [3, 0] },
  },
  ear: { rest: 0.3, flick: 0.9, len: 1.8, w: 1.2, near: "S", far: "l", farDx: 1 },
  lid: "c",
  haunch: [2.8, 2.8],
};
// The look-out: the head turned three-quarters to face out, the far horn showing past the near one.
export const RAM_TURN_HEAD = {
  grid: ["..hhh....", ".hcccch..", "hcceccec.", ".scccPPPN", "..sPPPPN.", "...sPNN.."],
  anchor: [2, 2],
  horn: { ...RAM_HORN, far: [3, 0.8], w0: 2.7 },
  ear: [3, 0],
};
