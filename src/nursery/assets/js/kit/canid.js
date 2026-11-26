// Dogs built from parts: a body outline with a deep chest and a tucked waist, legs (two bones that
// bend on the wolves; four drawn poses on the shorter legs of the coyote, the foxes and the pups), a
// bushy tail, a neck ruff that rides with the head and stretches when the head lifts, and a head
// that can be level, raised to howl or tipped nose down for the fox's pounce. Four tones lit from
// above. One spec per member (WOLF, YEARLING, COYOTE, RED, ARCTIC, PUP), drawn by
// drawDog(spec, pal, plot, pose); canidAt (below) places and poses it. Coordinates are the dog's
// own: x runs from the rump (0) toward the nose and h is the height above the ground;
// `plot(x, h, colour)` paints a pixel, so the caller places and mirrors it. Rest poses are blends of
// SHAPES (stand, sit, lie, bow, and the pounce's leap and dive); howlAt and pounceAt return the pose
// fields of the two actions.
import {
  blender,
  bone,
  coatKey,
  column,
  curve,
  dipAlong,
  drawnDips,
  drawnLimb,
  standFeet as feetAt,
  footRest,
  haunch,
  pawLimb,
  profile,
  rowFill,
  shapeCache,
  walkDips,
} from "./build.js";
import { clamp, frac, hash, lerp, mix, rgba, shadowColour, smooth } from "./pixel.js";
import { blinkAt, breathAt, ease, feet, paintAt, sinceOf, tonesFor } from "./place.js";

export const STANCE = 0.65;

// ---- Tones --------------------------------------------------------------------------------------

// A dog's tones from a scene's canid palette [coat, dark, pale, eye, tail tip]: the coat lit along
// the back (H), its base (T), shaded low on the flank (S), the far legs darker (F); the underside is
// the pale coat in shadow (U), the bib and cheeks pale (P), the nose and eye dark (D), the tail tip
// (K), the far stockings (Z), and the open mouth (R). `own` is the scene's canid entry: the mouth,
// the howl's sound, and whether it is night (the highlight is softer by night).
export function dogTones(arr, own) {
  const [coat, dark, pale, eye, tip] = arr;
  const night = own.dark;
  return {
    H: mix(coat, "#ffffff", night ? 0.1 : 0.2),
    T: coat,
    S: mix(coat, dark, 0.38),
    F: mix(coat, dark, 0.62),
    U: mix(pale, dark, 0.35),
    P: pale,
    D: eye,
    K: tip,
    E: coat,
    Z: mix(dark, "#000000", 0.25),
    R: own.R,
    howl: own.howl,
  };
}

// ---- Poses --------------------------------------------------------------------------------------

const standFeet = (spec, L) => feetAt(spec.drawnLegs ? L.root[0] : L.foot, spec.farShift, L.stand, spec.paw.h);

const SHAPES = {
  stand(spec) {
    return {
      off: () => 0,
      at: (x) => x,
      hind: standFeet(spec, spec.hind),
      fore: standFeet(spec, spec.fore),
      head: [0, 0],
      tail: spec.tail.points,
      haunch: 0,
      paws: 0,
      stand: 1,
      air: null,
      face: null,
    };
  },
  // Sitting as a dog sits: the rump on the ground and the body closed up short and steep, chest high
  // on straight forelegs, a round haunch over the folded hind leg, the tail laid along the ground.
  sit(spec) {
    const F = spec.len - 1;
    const bottom = profile(spec.bottom);
    const close = spec.sitClose ?? 0.45;
    const at = (x) => F - (F - x) * close;
    const off = (x) => lerp(-bottom(0), spec.sitChest, x / F);
    const hx = at(spec.hind.root[0]);
    const fx = at(spec.fore.root[0]);
    const tail = spec.tail.points;
    const reach = Math.abs(tail[2][0] - tail[0][0]) + Math.abs(tail[2][1] - tail[0][1]) * 0.5;
    return {
      off,
      at,
      hind: { near: [hx + spec.sitPaw, spec.paw.h], far: [hx + spec.sitPaw + 1, spec.paw.h] },
      fore: { near: [fx + (spec.drawnLegs ? 0 : 1), spec.paw.h], far: [fx - 1 + spec.farShift, spec.paw.h] },
      head: [0, spec.sitChest],
      tail: [
        [at(0), tail[0][1] + off(0)],
        [at(0) - reach * 0.45, 0],
        [at(0) - reach * 0.9, 0],
      ],
      haunch: 1,
      paws: 0,
      stand: 0,
      air: null,
      face: null,
    };
  },
  // Lying with the head up: belly down, the hind legs folded under the haunch, the forelegs out flat.
  lie(spec) {
    const F = spec.len - 1;
    const bottom = profile(spec.bottom);
    const off = (x) => -bottom(x);
    const tail = spec.tail.points;
    const reach = Math.abs(tail[2][0] - tail[0][0]) + Math.abs(tail[2][1] - tail[0][1]) * 0.6;
    const hx = spec.hind.root[0];
    const fx = spec.fore.root[0];
    return {
      off,
      at: (x) => x,
      hind: { near: [hx + spec.sitPaw - 1, spec.paw.h], far: [hx + spec.sitPaw, spec.paw.h] },
      fore: { near: [fx + spec.pawReach, spec.paw.h], far: [fx + spec.pawReach - 1, spec.paw.h] },
      head: [0, off(F) + spec.headLie],
      tail: [
        [0, tail[0][1] + off(0)],
        [-reach * 0.5, 0],
        [-reach, 0],
      ],
      haunch: 1,
      paws: 1,
      stand: 0,
      air: null,
      face: null,
    };
  },
  // The play bow, the dogs' stretch: rump high on straight hind legs, chest low, forelegs flat out.
  bow(spec) {
    const F = spec.len - 1;
    const bottom = profile(spec.bottom);
    const rise = spec.bowRise;
    const low = bottom(F) - 1;
    const off = (x) => lerp(rise, -low, smooth(x / F));
    const tail = spec.tail.points;
    const fx = spec.fore.root[0];
    return {
      off,
      at: (x) => x,
      hind: standFeet(spec, spec.hind),
      fore: { near: [fx + spec.pawReach + 1, spec.paw.h], far: [fx + spec.pawReach, spec.paw.h] },
      head: [0, off(F) + 1],
      tail: [
        [tail[0][0], tail[0][1] + rise],
        [tail[1][0] - 1, tail[1][1] + rise + 3],
        [tail[2][0] - 1, tail[2][1] + rise + 5],
      ],
      haunch: 0,
      paws: 1,
      stand: 0,
      air: null,
      face: null,
    };
  },
  // The pounce, in two shapes. The leap: nose up, the hind legs pushed out behind, the forelegs
  // folded to the chest, the brush streaming level.
  leap(spec) {
    const F = spec.len - 1;
    const tail = spec.tail.points;
    return {
      off: (x) => lerp(-1, 2, x / F),
      at: (x) => x,
      hind: standFeet(spec, spec.hind),
      fore: standFeet(spec, spec.fore),
      head: [0, 2],
      tail: [
        [tail[0][0], tail[0][1] - 1],
        [tail[1][0] - 1, tail[0][1] - 2],
        [tail[2][0] - 1, tail[0][1] - 2],
      ],
      haunch: 0,
      paws: 0,
      stand: 0,
      air: { fore: [1, -1], hind: [-3, -2] },
      face: null,
    };
  },
  // The dive: tipped nose down over the mouse, the forelegs reaching down past the nose, the hind
  // legs trailing and the brush raised behind for balance.
  dive(spec) {
    const F = spec.len - 1;
    const tail = spec.tail.points;
    const drop = spec.diveDrop ?? 4;
    return {
      off: (x) => lerp(drop - 1, -1, x / F),
      at: (x) => x,
      hind: standFeet(spec, spec.hind),
      fore: standFeet(spec, spec.fore),
      head: [1, -1],
      tail: [
        [tail[0][0], tail[0][1] + drop - 1],
        [tail[1][0], tail[0][1] + drop + 1],
        [tail[2][0] + 1, tail[0][1] + drop + 3],
      ],
      haunch: 0,
      paws: 0,
      stand: 0,
      air: { fore: [2, -3], hind: [-2, 0] },
      face: "down",
    };
  },
};

const shapeOf = shapeCache(SHAPES);

// Two poses blended; the pounce's legs in the air and the face looking down switch at the middle.
const blend = blender({
  off: "fn",
  at: "fn",
  hind: "pair",
  fore: "pair",
  head: "pt",
  tail: "pts",
  haunch: "num",
  paws: "num",
  stand: "num",
  air: "pick",
  face: "pick",
});

// ---- The dog ------------------------------------------------------------------------------------

// One dog. Pose fields as the cats' (phase, amp, sway, headUp, blink, breath, bodyX, rest), plus
// howl (0 to 1: how far the head has risen to howl), mouth (0 shut, 1 parted), and sound (seconds
// into the howl's sound, while it lasts).
export function drawDog(spec, pal, plot, pose) {
  const { phase = 0, amp = 0, sway = 0, headUp = 0, blink = false, breath = 0, bodyX = null } = pose;
  const shape = pose.rest
    ? blend(shapeOf(spec, pose.rest.from), shapeOf(spec, pose.rest.to), pose.rest.u)
    : shapeOf(spec, "stand");
  const last = spec.len - 1;
  const [dropHind, dropFore] = (spec.drawnLegs ? drawnDips : walkDips)(phase, amp, spec.bob);
  const dropAt = dipAlong(dropHind, dropFore, last);
  const top = profile(spec.top);
  const bottom = profile(spec.bottom);
  const rootOf = (L, far) => [shape.at(L.root[0]) + (far ? spec.farShift : 0), L.root[1] + shape.off(L.root[0])];

  // A leg off the ground (the pounce): a straight strut from the body, tapering, at the shape's angle.
  const airLimb = (L, far) => {
    const cells = new Map();
    const root = rootOf(L, far);
    const [dx, dh] = shape.air[L.fore ? "fore" : "hind"];
    const R = [root[0] + (far ? -1 : 0), root[1] - 1];
    const len = Math.max(1, (L.root[1] - 1) * 0.8);
    const n = Math.hypot(dx, dh - 1) || 1;
    const F = [R[0] + (dx / n) * len + dx * 0.3, R[1] + ((dh - 1) / n) * len];
    bone(rowFill(cells), R, F, L.w[0], L.w[L.w.length - 1]);
    return [...cells.values()];
  };

  // A bending leg, two tapering bones from the body to the foot; a short leg, four drawn poses
  // walking and at rest straight from the body to its foot.
  const leg = (L, offset, far) => {
    if (shape.air) return airLimb(L, far);
    const root = rootOf(L, far);
    const drop = L.fore ? dropFore : dropHind;
    const p = frac(phase + offset);
    const rest = footRest(shape, L, far)[0];
    if (spec.drawnLegs)
      return drawnLimb(spec, L, { root, drop, foot: rest, p, amp, stand: shape.stand, paws: shape.paws });
    const R = [root[0], root[1] - drop];
    return pawLimb(spec, L, { R, rest, p, amp, bodyX, straight: (1 - amp) * shape.stand, stance: STANCE });
  };
  const paintLimb = (cells, far) => {
    for (const [x, h] of cells) plot(x, h, spec.legCoat?.(x, h, far, pal) ?? (far ? pal.F : pal.T));
  };

  paintLimb(leg(spec.hind, 0.5, true), true);
  paintLimb(leg(spec.fore, 0.75, true), true);

  // The tail: a bushy brush, thick across, darkening or paling at the tip.
  const [t0, t1, t2] = shape.tail;
  const tip = [t2[0] + sway * spec.tail.sway, t2[1]];
  const lying = shape.stand < 0.5 && !shape.air;
  curve([t0[0], t0[1] - dropHind], [t1[0], t1[1] - dropHind / 2], tip, 48, (x, h, t) => {
    const w = spec.tail.bush
      ? Math.max(1, Math.round(spec.tail.w * Math.sin(Math.PI * clamp(0.15 + t * 0.85, 0, 1)) + 0.4))
      : spec.tail.w;
    for (let k = 0; k < w; k += 1) {
      const key = t > 1 - spec.tail.tip ? "K" : k === 0 && w > 1 ? "S" : "T";
      if (spec.tail.thick === "h" || lying) plot(x, Math.max(0, h + k), pal[key]);
      else plot(x - k, Math.max(0, h), pal[key]);
    }
  });

  // The body, column by column: lit along the back, shaded low, the pale underside beneath.
  const standing = shape.stand > 0.5;
  for (let x = 0; x < spec.len; x += 1) {
    const X = Math.round(shape.at(x));
    const [b, t] = column(spec, top, bottom, x, shape.off(x), dropAt(x), breath, standing);
    for (let h = b; h <= t; h += 1) {
      const key = coatKey(spec, x, h - b, t - b);
      plot(X, h, pal[spec.coat?.(x, h - b, t - b, key) ?? key]);
    }
  }

  paintLimb(leg(spec.hind, 0, false), false);

  if (shape.haunch > 0.6) {
    const [rx, ry] = spec.haunch;
    const hipX = spec.hind.root[0];
    const cx = shape.at(hipX) + 0.5;
    const ch = Math.max(ry, bottom(hipX) + shape.off(hipX) + ry * 0.5);
    haunch(cx, ch, rx, ry, Math.max(0, Math.floor(ch - ry)), (x, h, key) => plot(x, h, pal[key]));
  }

  paintLimb(leg(spec.fore, 0.25, false), false);

  // The head and its ruff ride the front of the body. Raised to howl, the ruff keeps its resting
  // rows below its middle, so the neck stretches up from the chest without a gap.
  const howl = pose.howl ?? 0;
  const [headDx, headDh] = shape.head;
  const headLift = Math.round(headUp * spec.headUp + howl * spec.howlUp + headDh);
  const dx = Math.round(headDx);
  const lift = headLift - dropFore;
  for (const [cx, ch, rx, ry] of spec.ruff) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      for (let h = Math.floor(ch - ry); h <= Math.ceil(ch + ry); h += 1) {
        const nx = (x - cx) / rx;
        const ny = (h - ch) / ry;
        if (nx * nx + ny * ny > 1) continue;
        // Lit on top, the pale bib at the throat, shaded behind and below.
        const key = ny > 0.45 ? "H" : nx > 0.15 && ny < 0.35 ? "P" : nx < -0.55 && ny < 0 ? "S" : "T";
        const rest = h - dropFore + Math.round(headDh);
        const lifted = h + lift;
        const from = h < ch ? Math.min(rest, lifted) : lifted;
        for (let k = Math.max(0, from); k <= lifted; k += 1) plot(x + dx, k, pal[key]);
      }
    }
  }
  let face = spec.face;
  if (howl > 0.5) face = pose.mouth ? spec.howl.open : spec.howl.shut;
  else if (shape.face === "down") face = spec.down;
  const [hx, hh] = face.at;
  const eyeShut = blink || pose.eyesShut;
  face.grid.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      const key = ch === "e" ? (eyeShut ? "T" : "D") : ch;
      const h = hh - r + lift;
      if (h >= 0) plot(hx + c + dx, h, pal[key]);
    });
  });

  // The howl's sound: arcs that leave the raised muzzle and spread upward, fading.
  if (pose.sound != null && howl > 0.5) {
    const [mc, mr] = spec.howl.mouth;
    const mx = hx + dx + mc;
    const mh = hh - mr + lift;
    for (const start of HOWL_RINGS) {
      const u = (pose.sound - start) / 1.1;
      if (u < 0 || u >= 1) continue;
      const radius = 2 + u * spec.howl.reach;
      const colour = rgba(pal.howl, 1 - 0.75 * u);
      const seen = new Set();
      for (let a = 25; a <= 115; a += 4) {
        const rad = (a * Math.PI) / 180;
        const x = mx + Math.round(Math.cos(rad) * radius);
        const h = mh + Math.round(Math.sin(rad) * radius);
        if (seen.has(`${x},${h}`)) continue;
        seen.add(`${x},${h}`);
        plot(x, h, colour);
      }
    }
  }
}

const HOWL_RINGS = [0.2, 0.8, 1.4, 2.0];

// ---- The members ---------------------------------------------------------------------------------

// Every dog shares a build: a deep chest and a tucked waist, the back level, a ruff of longer fur at
// the neck that carries the head, upright pointed ears, a long muzzle with a dark nose, pale cheeks,
// bib and belly, and a bushy tail. Members differ in size and in the traits the family names.
const REST = { sitClose: 0.5, headLie: 1, bowRise: 2 };

// The wolf: long-legged, its tail hanging to the hocks with a dark tip, a heavy ruff over the neck
// and shoulders, and tan cheeks, throat and belly.
const WOLF_TALL = {
  id: "wolf",
  ...REST,
  len: 12,
  top: [
    [0, 9],
    [1, 10],
    [7, 10],
    [9, 10.5],
    [11, 11],
  ],
  bottom: [
    [0, 7],
    [1, 6],
    [3, 6],
    [5, 6.5],
    [6, 6.5],
    [8, 6],
    [9, 5],
    [11, 5],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [8, 11],
  bob: 1,
  hind: { root: [2.5, 7], a: 3, b: 2.6, bend: -1, foot: 2, w: [4, 3, 2], stand: [-1, 1] },
  fore: { root: [10, 6], a: 2.6, b: 2.2, bend: 1, foot: 10, w: [3, 2, 2], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 4,
  lift: 1.5,
  paw: { h: 1, back: 0, fwd: 1 },
  tail: {
    points: [
      [0, 9],
      [-2, 7],
      [-3, 3],
    ],
    w: 2,
    bush: true,
    tip: 0.18,
    sway: 1,
  },
  ruff: [[10.2, 9.2, 2.6, 2.6]],
  face: { at: [11, 13], grid: ["S.T...", "STT...", "HHHH..", "TeTTTD", "PTTPP.", ".PP..."] },
  howl: {
    shut: { at: [10, 14], grid: [".....D", "....TT", "...HTP", "TSTeP.", "STTTP.", ".TTP.."] },
    open: { at: [10, 14], grid: [".....D", "....TR", "...HTP", "TSTeP.", "STTTP.", ".TTP.."] },
    mouth: [5, 0],
    reach: 9,
  },
  down: { at: [12, 9], grid: ["S.T..", "STT..", "HHHT.", "TeTT.", ".PPTT", "..PTD"] },
  headUp: 1,
  howlUp: 1,
  haunch: [3.2, 3],
  sitPaw: 3,
  sitChest: 2,
  pawReach: 3,
  coat: (x, _dh, _depth, key) => (x >= 9 && key === "S" ? "P" : null),
};

// The yearling: the wolf a pixel smaller each way.
const YEARLING_TALL = {
  ...WOLF_TALL,
  id: "yearling",
  len: 11,
  top: [
    [0, 8],
    [1, 9],
    [6, 9],
    [8, 9.5],
    [10, 10],
  ],
  bottom: [
    [0, 6],
    [1, 5],
    [3, 5],
    [4, 5.5],
    [6, 5.5],
    [7, 5],
    [8, 4.5],
    [10, 4.5],
  ],
  chest: [7, 10],
  hind: { ...WOLF_TALL.hind, root: [2.5, 6], a: 2.6, b: 2.3, foot: 2, w: [3, 3, 2] },
  fore: { ...WOLF_TALL.fore, root: [9, 5.5], a: 2.4, b: 2, foot: 9, w: [3, 2, 2] },
  stride: 3.5,
  ruff: [[9.2, 8.4, 2.3, 2.4]],
  face: { at: [10, 12], grid: ["S.T...", "STT...", "HHHH..", "TeTTTD", "PTTPP.", ".PP..."] },
  howl: {
    ...WOLF_TALL.howl,
    shut: { ...WOLF_TALL.howl.shut, at: [9, 13] },
    open: { ...WOLF_TALL.howl.open, at: [9, 13] },
  },
  down: { ...WOLF_TALL.down, at: [11, 8] },
  haunch: [2.8, 2.6],
  sitChest: 2,
  coat: (x, _dh, _depth, key) => (x >= 8 && key === "S" ? "P" : null),
};

// The wolves stand a pixel lower than first drawn (revision 2): the same body, ruff and head on
// shorter, thicker legs. Every height in a spec drops by d.
function lowered(spec, d) {
  const down = (pts) => pts.map(([x, h]) => [x, h - d]);
  const at = (f) => ({ ...f, at: [f.at[0], f.at[1] - d] });
  return {
    ...spec,
    top: down(spec.top),
    bottom: down(spec.bottom),
    hind: { ...spec.hind, root: [spec.hind.root[0], spec.hind.root[1] - d] },
    fore: { ...spec.fore, root: [spec.fore.root[0], spec.fore.root[1] - d] },
    tail: { ...spec.tail, points: down(spec.tail.points) },
    ruff: spec.ruff.map(([x, h, rx, ry]) => [x, h - d, rx, ry]),
    face: at(spec.face),
    howl: { ...spec.howl, shut: at(spec.howl.shut), open: at(spec.howl.open) },
    down: at(spec.down),
  };
}
export const WOLF = lowered(WOLF_TALL, 1);
export const YEARLING = lowered(YEARLING_TALL, 1);

// The coyote: the wolf's design on a lighter frame, short enough in the leg to draw its legs; big
// ears, a narrow muzzle, a slighter ruff, and a bushy tail held low with a black tip.
export const COYOTE = {
  id: "coyote",
  ...REST,
  len: 10,
  top: [
    [0, 7],
    [1, 8],
    [6, 8],
    [9, 8.5],
  ],
  bottom: [
    [0, 5],
    [1, 4],
    [3, 4],
    [4, 5],
    [5, 5],
    [6, 4],
    [9, 4],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [6, 9],
  bob: 1,
  drawnLegs: true,
  reach: 2,
  hind: { root: [2, 4], w: [3, 2], stand: [0, 1] },
  fore: { root: [8, 4], w: [2, 2], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 3,
  lift: 1,
  paw: { h: 1, back: 0, fwd: 1 },
  tail: {
    points: [
      [0, 7],
      [-2, 5],
      [-3, 2],
    ],
    w: 2,
    bush: true,
    tip: 0.2,
    sway: 1,
  },
  ruff: [[8.4, 7.4, 2, 2.2]],
  face: { at: [9, 11], grid: ["S.T...", "STT...", "HHHH..", "TeTTTD", "PTPP.."] },
  howl: {
    shut: { at: [8, 12], grid: ["....D", "...TT", "..HTP", "STeP.", "TTTP.", ".TP.."] },
    open: { at: [8, 12], grid: ["....D", "...TR", "..HTP", "STeP.", "TTTP.", ".TP.."] },
    mouth: [4, 0],
    reach: 8,
  },
  down: { at: [9, 8], grid: ["S.T..", "STT..", "HHT..", "TeTT.", ".PTTD"] },
  headUp: 1,
  howlUp: 1,
  haunch: [2.4, 2.2],
  sitPaw: 2,
  sitChest: 2,
  pawReach: 2,
  coat: (x, _dh, _depth, key) => (x >= 7 && key === "S" ? "P" : null),
};

// The red fox: low and long, black stockings and black-backed ears, a white bib, cheeks and belly,
// and a long brush held level, its white tip clear of the ground.
export const RED = {
  id: "red",
  ...REST,
  len: 9,
  top: [
    [0, 6],
    [1, 7],
    [6, 7],
    [8, 7.5],
  ],
  bottom: [
    [0, 4],
    [1, 3],
    [3, 3.5],
    [5, 3.5],
    [6, 3],
    [8, 3],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [5, 8],
  bob: 1,
  drawnLegs: true,
  reach: 1,
  hind: { root: [2, 3], w: [3, 1], stand: [0, 1] },
  fore: { root: [7, 3], w: [2, 1], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 3,
  lift: 1,
  paw: { h: 1, back: 0, fwd: 1 },
  tail: {
    points: [
      [0, 5],
      [-3, 4],
      [-6, 3.5],
    ],
    w: 3,
    thick: "h",
    bush: true,
    tip: 0.16,
    sway: 0.6,
  },
  ruff: [[7.2, 6.6, 1.8, 2]],
  face: { at: [7, 10], grid: ["D.D...", "STT...", "HHHH..", "TeTTTD", "PPPP.."] },
  howl: {
    shut: { at: [6, 12], grid: ["...D", "..TP", ".HTP", "DTeP", "STP."] },
    open: { at: [6, 12], grid: ["...D", "..RP", ".HTP", "DTeP", "STP."] },
    mouth: [3, 0],
    reach: 7,
  },
  down: { at: [8, 7], grid: ["D.D.", "STT.", "HTTT", "TeTP", ".PTD"] },
  headUp: 1,
  howlUp: 1,
  haunch: [2.2, 2],
  sitPaw: 2,
  sitChest: 3,
  pawReach: 2,
  diveDrop: 4,
  coat: (x, _dh, _depth, key) => (key === "U" || (x >= 6 && key === "S") ? "P" : null),
  // Black stockings below the body, the far ones a shade deeper.
  legCoat: (_x, h, far, pal) => (h <= 2 ? (far ? pal.Z : pal.D) : null),
};

// The arctic fox: compact and round, the shortest legs and muzzle and small round ears, a full tail.
export const ARCTIC = {
  id: "arctic",
  ...REST,
  len: 8,
  top: [
    [0, 5],
    [1, 6],
    [7, 6],
  ],
  bottom: [
    [0, 3],
    [1, 2],
    [7, 2],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [4, 7],
  bob: 1,
  drawnLegs: true,
  reach: 1,
  hind: { root: [1.5, 2], w: [3, 2], stand: [0, 1] },
  fore: { root: [6, 2], w: [2, 2], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 2,
  lift: 1,
  paw: { h: 1, back: 0, fwd: 1 },
  tail: {
    points: [
      [0, 3.5],
      [-2, 3],
      [-4, 2],
    ],
    w: 3,
    thick: "h",
    bush: true,
    tip: 0,
    sway: 0.6,
  },
  ruff: [[6.3, 5.5, 1.8, 1.8]],
  face: { at: [6, 9], grid: ["T.T..", "HHHH.", "TeTTD", "PPP.."] },
  howl: {
    shut: { at: [5, 10], grid: ["...D", "..TP", "THeP", "TTP."] },
    open: { at: [5, 10], grid: ["...D", "..RP", "THeP", "TTP."] },
    mouth: [3, 0],
    reach: 6,
  },
  down: { at: [7, 6], grid: ["T.T.", "HHT.", "TeTP", ".PTD"] },
  headUp: 1,
  howlUp: 1,
  haunch: [2, 1.8],
  sitPaw: 2,
  sitChest: 2,
  pawReach: 2,
  coat: (x, _dh, _depth, key) => (x >= 6 && key === "S" ? "P" : null),
};

// The pups: the same build, small and round, with big ears, a short muzzle and a short tail.
export const PUP = {
  id: "pup",
  ...REST,
  len: 6,
  top: [
    [0, 4],
    [1, 5],
    [5, 5],
  ],
  bottom: [
    [0, 2],
    [5, 2],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [3, 5],
  bob: 1,
  drawnLegs: true,
  reach: 1,
  hind: { root: [1, 2], w: [2, 1], stand: [0, 1] },
  fore: { root: [4.5, 2], w: [2, 1], stand: [0, -2], fore: true },
  farShift: 1,
  stride: 2,
  lift: 1,
  paw: { h: 1, back: 0, fwd: 0 },
  tail: {
    points: [
      [0, 3.5],
      [-1, 3.5],
      [-2, 3],
    ],
    w: 2,
    thick: "h",
    bush: true,
    tip: 0.3,
    sway: 0.5,
  },
  ruff: [[4.6, 4.6, 1.4, 1.5]],
  face: { at: [5, 8], grid: ["S.T.", "STT.", "HeTD", "PPP."] },
  howl: {
    shut: { at: [4, 9], grid: ["...D", "..TP", "SHeP", "TTP."] },
    open: { at: [4, 9], grid: ["...D", "..RP", "SHeP", "TTP."] },
    mouth: [3, 0],
    reach: 5,
  },
  down: { at: [5, 6], grid: ["S.T.", "HTT.", "TeTD"] },
  headUp: 1,
  howlUp: 1,
  haunch: [1.6, 1.6],
  sitPaw: 1,
  sitChest: 2,
  pawReach: 1,
  coat: (x, _dh, _depth, key) => (x >= 4 && key === "S" ? "P" : null),
};

// ---- Actions ------------------------------------------------------------------------------------

// The howl, h seconds in (it fits the desert coyote's 3.5 s with 0.4 s to sit first): the head rises
// over 0.4 s with the ruff stretching up the neck, the mouth parts, rings of sound leave the muzzle
// and spread upward, then the mouth closes and the head comes down.
const HOWL = 3.0;
export function howlAt(h) {
  if (h < 0 || h >= HOWL) return null;
  const howl = h < 0.4 ? smooth(h / 0.4) : h < HOWL - 0.4 ? 1 : smooth((HOWL - h) / 0.4);
  const mouth = h >= 0.5 && h < HOWL - 0.6 ? 1 : 0;
  return { howl, mouth, sound: h >= 0.5 ? h - 0.5 : null };
}

// The red fox's pounce, p seconds into the meadow's 1.1 s leap: it springs nose up, tips over the
// top and dives nose down at the mouse. Returns the rest blend.
const POUNCE = 1.1;
const POUNCE_STEPS = [
  [0, 0.3, "stand", "leap"],
  [0.3, 0.45, "leap", "leap"],
  [0.45, 0.8, "leap", "dive"],
  [0.8, POUNCE, "dive", "dive"],
];
export function pounceAt(p) {
  const t = clamp(p, 0, POUNCE - 0.001);
  const [a, b, from, to] = POUNCE_STEPS.find(([s, e]) => t >= s && t < e);
  return { from, to, u: from === to ? 0 : (t - a) / (b - a) };
}

// Dogs

// Built from parts (canid.js): the wolf and its yearling, the coyote, the red and arctic foxes, and
// a pup (any kind below scale 0.8). A dog walks with its feet planted, eases to a stop and rests in
// the pose settleCanid picked as it stopped (standing and looking about, sitting, or lying), and in
// a long stop may get up and stretch into the play bow before it walks on. c.state "howl" sits it
// up to howl, rings of sound leaving the raised muzzle; "pounce" (the red fox, held c.lift pixels
// off the ground) springs nose up and dives nose down, landing in a sit. c.since is when its state
// last changed (settleCanid); c.pose ("stand", "sit", "lie" or "bow") and c.actAt (seconds into a
// howl or pounce) show a pose on demand. Its palette is the scene's array under its kind (coat, dark,
// pale, eye, tail tip) with the scene's `canid` entry beside it (the mouth, the howl's sound,
// and dark at night), and its groundShadow.
const CANID_SPECS = { wolf: WOLF, coyote: COYOTE, red: RED, arctic: ARCTIC };
const CANID_SHADOW_COLUMNS = {
  wolf: [-3, 16],
  yearling: [-3, 15],
  coyote: [-3, 14],
  red: [-4, 13],
  arctic: [-3, 11],
  pup: [-2, 9],
};
const CANID_OWN = { R: "#6e2c2c", howl: "#5f6f84", dark: false };
const CANID_POSES = new Set(["stand", "sit", "lie", "bow"]);
const CANID_EASE = 0.25; // seconds a walk takes to start or stop
const CANID_SETTLE = 0.5; // seconds it takes to sit or lie down
const CANID_RISE = 0.5; // seconds it takes to get up
const CANID_SIT_TO_HOWL = 0.4;

function canidSpec(c) {
  const k = c.scale ?? 1;
  if (k < 0.8) return PUP;
  if (c.kind === "wolf" && k < 1) return YEARLING;
  return CANID_SPECS[c.kind];
}

// Call after the scene's update has set w.state (wander, a howl, a pounce, or a leader's state for a
// pup or yearling, passed as `lead` so it rests as its leader does). Records when the state changed
// and, as a stop begins, the pose it rests in, when the stop ends, and whether it bows before it goes.
export function settleCanid(f, w, lead = null) {
  if (w.state === w.was) return;
  const prev = w.was;
  w.was = w.state;
  w.prev = prev;
  w.since = f.time;
  if (w.state === "walk") {
    w.lastPose = prev === "pounce" ? "dive" : prev && prev !== "walk" && !w.bows ? (w.pose ?? "sit") : null;
    w.pose = null;
    w.bows = false;
    return;
  }
  if (w.state !== "sit") return;
  if (prev === "pounce" || prev === "howl") {
    w.pose = "sit";
    w.bows = false;
    return;
  }
  const by = lead ?? w;
  w.stopEnd = f.time + Math.max(0, by.timer ?? 0);
  if (lead) {
    w.pose = lead.pose ?? "sit";
    w.bows = lead.bows ?? false;
    return;
  }
  const stop = w.stopEnd - f.time;
  const r = hash(Math.round(f.time * 100), Math.round(w.x), 3);
  w.pose = stop < 1.6 ? "stand" : stop >= 3 && r < 0.5 ? "lie" : "sit";
  w.bows = stop >= 4.5 && hash(Math.round(f.time * 100), Math.round(w.x), 4) < 0.5;
}

// The bow before it walks on: in the last 1.6 s of the stop it gets up, bows, holds and stands.
function canidBow(name, left) {
  if (left > 1.6 || left < 0) return null;
  if (left > 1.2) return { from: name, to: "stand", u: (1.6 - left) / 0.4 };
  if (left > 0.8) return { from: "stand", to: "bow", u: (1.2 - left) / 0.4 };
  if (left > 0.4) return { from: "bow", to: "bow", u: 0 };
  return { from: "bow", to: "stand", u: (0.4 - left) / 0.4 };
}

export function canidAt(g, c, time = 0) {
  if (g.trace) return g.trace.draw(canidAt, g, c, time);
  const spec = canidSpec(c);
  const own = g.pal.canid ?? CANID_OWN;
  const colours = g.pal[c.pal ?? c.kind];
  const pal = tonesFor(colours, "canid", () => dogTones(colours, own));
  const state = c.state;
  const walking = state === "walk";
  const since = sinceOf(c, time);
  const bodyX = c.x * c.dir;
  const phase = bodyX / (spec.stride / STANCE);
  const pose = {
    phase,
    bodyX,
    amp: ease(walking, since, CANID_EASE),
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.75 : Math.sin(time * 1.4) * 0.6,
    breath: breathAt(time, 2.2, !walking),
    blink: blinkAt(time, c.phase ?? 0, 3.1),
    headUp: 0,
  };
  let lift = 0;
  if (state === "pounce") {
    Object.assign(pose, { rest: pounceAt(c.actAt ?? since), amp: 0, blink: false });
    lift = Math.max(0, Math.round(c.lift ?? 0));
  } else if (state === "howl") {
    const h = c.actAt ?? since;
    const from = c.prev === "sit" && c.pose !== "stand" ? (c.pose ?? "sit") : "stand";
    pose.rest = { from, to: "sit", u: h / CANID_SIT_TO_HOWL };
    const act = howlAt(h - CANID_SIT_TO_HOWL);
    if (act) Object.assign(pose, act, { blink: false });
  } else if (walking) {
    if (c.lastPose && since < CANID_RISE) pose.rest = { from: c.lastPose, to: "stand", u: since / CANID_RISE };
  } else {
    const name = CANID_POSES.has(c.pose) ? c.pose : "sit";
    if (c.prev === "pounce") pose.rest = { from: "dive", to: "sit", u: since / 0.3 };
    else if (c.prev === "howl") pose.rest = { from: "sit", to: "sit", u: 0 };
    else if (name !== "stand") pose.rest = { from: "stand", to: name, u: (since - CANID_EASE * 0.6) / CANID_SETTLE };
    const bow = c.bows && c.stopEnd != null ? canidBow(name, c.stopEnd - time) : null;
    if (bow) pose.rest = bow;
    // Now and then it lifts its head to look about.
    else if (since > 1 && since < 2) pose.headUp = Math.min(1, (since - 1) / 0.25, (2 - since) / 0.25);
  }
  // The shadow stays on the ground, shorter the higher the dog is off it.
  const [s0, s1] = CANID_SHADOW_COLUMNS[spec.id];
  const shrink = Math.min(Math.floor((s1 - s0) / 2) - 1, Math.round(lift / 2));
  const shadow = { colour: shadowColour(g.pal), span: [s0 + shrink, s1 - 1 - shrink] };
  paintAt(g, Math.round(c.x), feet(g, c), c.dir, (plot) => drawDog(spec, pal, plot, pose), shadow, lift);
}

export const FAMILY = {
  id: "dogs",
  title: "Dogs",
  group: "Animals",
  differ: "size, colour, tail",
  members: {
    "arctic-fox": { spec: ARCTIC, realLength: 0.55 },
    fox: { spec: RED, realLength: 0.65, predator: true },
    coyote: { spec: COYOTE, realLength: 0.9, predator: true },
    wolf: { spec: WOLF, realLength: 1.2, predator: true },
  },
  drivers: {
    canidAt: {
      role: "walker",
      member: (a) => ((a.scale ?? 1) < 0.8 ? "pup" : a.kind === "red" || a.kind === "arctic" ? "fox" : a.kind),
    },
  },
};
