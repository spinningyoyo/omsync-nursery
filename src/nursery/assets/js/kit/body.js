// Animals built from parts: a body drawn column by column from an outline, legs that bend at a
// joint (or, when short, step through four drawn poses), a curved tail, a haunch, and a face whose
// mouth can open. One spec per member (see the cats in animals.js) says where each part goes. The
// same parts make every pose: walking, standing, sitting, lying, the long stretch and the arched
// back, and the animal eases from one to the next. Coordinates are the animal's own: x runs from
// the rump (0) toward the nose and h is the height above the ground; `plot(x, h, colour)` paints a
// pixel, so the caller places and mirrors it.
//
// A spec's palette holds four coat tones lit from above (H highlight, T base, S shade, U underside),
// F for the far legs, P pale, D dark, and R and f for an open mouth and a fang; tones() derives the
// ones a scene palette lacks.
import {
  blender,
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
  shapeCache,
  walkDips,
} from "./build.js";
import { clamp, frac, hash, lerp, mix, rgba, smooth } from "./pixel.js";

export const STANCE = 0.65;

export function tones(pal, own = {}) {
  return { ...pal, H: mix(pal.T, pal.P, 0.35), U: mix(pal.S, pal.D, 0.3), F: mix(pal.S, pal.D, 0.15), ...own };
}

export function shade(colour, key) {
  if (key === "H") return mix(colour, "#ffffff", 0.16);
  if (key === "S") return mix(colour, "#000000", 0.16);
  if (key === "U") return mix(colour, "#000000", 0.28);
  return colour;
}

// ---- Poses ------------------------------------------------------------------------------------

// A pose is where the parts go: each body column's lift (off) and new column (at), each foot's
// place, the head's shift, the tail's three points, and how much haunch and stretched forepaw show.
const standFeet = (spec, L) => feetAt(spec.drawnLegs ? L.root[0] : L.foot, spec.farShift, L.stand, spec.paw.h);

// Sitting or lying, a cat holds its neck upright, so its head sits back over its chest (walking, it
// reaches forward): one column back, and raised by spec.sitChest or spec.headLie.
const REST_HEAD_BACK = 1;

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
    };
  },
  // Sitting: the rump down on the ground and the body closed up to half its length, its back
  // sloping up to the shoulders; the forelegs straight, the hind leg folded under a round haunch
  // with its paw out in front, the head up, and the tail laid round along the ground.
  sit(spec) {
    const F = spec.len - 1;
    const bottom = profile(spec.bottom);
    const at = (x) => F - (F - x) * 0.45;
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
      head: [-REST_HEAD_BACK, spec.sitChest],
      tail: [
        [at(0), tail[0][1] + off(0)],
        [at(0) - reach * 0.4, 0],
        [at(0) + reach * 0.45, 0],
      ],
      haunch: 1,
      paws: 0,
      stand: 0,
    };
  },
  // Lying: the body down on its belly, the hind legs folded under the haunch, the forelegs out flat
  // in front, the head held up, and the tail along the ground with its tip turned up.
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
      head: [-REST_HEAD_BACK, off(F) + spec.headLie],
      tail: [
        [0, tail[0][1] + off(0)],
        [-reach * 0.5, 0],
        [-reach, 1],
      ],
      haunch: 1,
      paws: 1,
      stand: 0,
    };
  },
  // The long stretch: the hind legs straight so the rump rises, the body sloping down to a chest
  // just off the ground, the forelegs flat out in front and the head low between them.
  bow(spec) {
    const F = spec.len - 1;
    const bottom = profile(spec.bottom);
    const rise = spec.bowRise;
    const low = bottom(F) - 1;
    const off = (x) => lerp(rise, -low, smooth(x / F));
    const tail = spec.tail.points;
    const fx = spec.fore.root[0];
    const stand = standFeet(spec, spec.hind);
    return {
      off,
      at: (x) => x,
      hind: stand,
      fore: { near: [fx + spec.pawReach + 1, spec.paw.h], far: [fx + spec.pawReach, spec.paw.h] },
      head: [0, off(F) + 1],
      tail: [
        [tail[0][0], tail[0][1] + rise],
        [tail[1][0], tail[1][1] + rise + 1],
        [tail[2][0], tail[2][1] + rise + 2],
      ],
      haunch: 0,
      paws: 1,
      stand: 0,
    };
  },
  // The arched back (small cats): the middle of the body lifts in a curve on straight legs drawn in
  // under it, the head drops a row, and the tail rises.
  arch(spec) {
    const F = spec.len - 1;
    const rise = spec.archRise ?? 2;
    const off = (x) => rise * Math.sin(Math.PI * clamp(x / F, 0, 1)) ** 0.7;
    const hind = standFeet(spec, spec.hind);
    const fore = standFeet(spec, spec.fore);
    const tail = spec.tail.points;
    return {
      off,
      at: (x) => x,
      hind: { near: [hind.near[0] + 1, hind.near[1]], far: [hind.far[0] + 1, hind.far[1]] },
      fore: { near: [fore.near[0] - 1, fore.near[1]], far: [fore.far[0] - 1, fore.far[1]] },
      head: [0, -1],
      tail: [tail[0], [tail[1][0] + 1, tail[1][1] + 2], [tail[2][0] + 1, tail[2][1] + 2]],
      haunch: 0,
      paws: 0,
      stand: 0,
    };
  },
};

const shapeOf = shapeCache(SHAPES);

// Two poses blended, u of the way from the first to the second.
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
});

// ---- Faces ------------------------------------------------------------------------------------

// The face with its mouth open `rows` rows: the jaw drops below the nose row, the gap dark red (R)
// from a hinge columns behind the nose, widest at the front, with a fang (f) under the nose.
const faceCache = new WeakMap(); // per spec object, as the shapes are
function faceOf(spec, mouth) {
  if (!faceCache.has(spec)) faceCache.set(spec, new Map());
  const cache = faceCache.get(spec);
  const key = mouth;
  if (cache.has(key)) return cache.get(key);
  let grid = spec.face.grid;
  const rows = mouth === 0 ? 0 : mouth === 1 ? 1 : spec.face.open;
  if (rows > 0) {
    const lines = grid.map((r) => [...r]);
    // The nose: the first row below the eye that ends in a dark pixel (not a dark ear tuft above).
    const eye = lines.findIndex((r) => r.includes("e"));
    const j = lines.findIndex((r, i) => i >= eye && r.join("").replace(/\.+$/, "").endsWith("D"));
    const end = lines[j].join("").replace(/\.+$/, "").length - 1;
    const chin = lines[j + 1] ?? [];
    const hinge = end - spec.face.hinge;
    const gap = [];
    for (let i = 0; i < rows; i += 1) {
      const r = chin.slice();
      while (r.length <= end) r.push(".");
      for (let c = hinge + i; c <= end; c += 1) r[c] = "R";
      if (i === 0) r[end] = "f";
      gap.push(r);
    }
    grid = [...lines.slice(0, j + 1), ...gap, ...lines.slice(j + 1)].map((r) => r.join(""));
  }
  const eyeRow = grid.findIndex((r) => r.includes("e"));
  const nose = grid.findIndex((r, i) => i >= eyeRow && r.replace(/\.+$/, "").endsWith("D"));
  const out = { grid, mouth: [grid[nose].replace(/\.+$/, "").length, nose + 1] };
  cache.set(key, out);
  return out;
}

// ---- The cat ----------------------------------------------------------------------------------

// One animal. Pose fields: phase and amp (the walk), sway, headUp, blink, breath, bodyX; rest (a blend
// of two poses: { from, to, u }); mouth (0 shut, 1 parted, 2 wide), eyesShut, and for the lion
// roar (seconds into the roar, while it lasts). A spec with `closeHoles` has its one-pixel pinholes
// closed (a blend between two poses can leave one under short legs): the body is painted into a map
// first, and a hole with a pixel on all four sides takes the colour of the one to its left.
export function drawBody(spec, pal, plot, pose) {
  if (!spec.closeHoles) {
    paintBody(spec, pal, plot, pose);
    return;
  }
  const cells = new Map();
  paintBody(spec, pal, (x, h, colour) => cells.set(`${x}|${h}`, [x, h, colour]), pose);
  const all = [...cells.values()];
  const xs = all.map(([x]) => x);
  const hs = all.map(([, h]) => h);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1) {
    for (let h = Math.min(...hs); h <= Math.max(...hs); h += 1) {
      const around = [
        [-1, 0],
        [1, 0],
        [0, 1],
        [0, -1],
      ].map(([a, b]) => cells.get(`${x + a}|${h + b}`));
      if (!cells.has(`${x}|${h}`) && around.every(Boolean)) cells.set(`${x}|${h}`, [x, h, around[0][2]]);
    }
  }
  for (const [x, h, colour] of cells.values()) plot(x, h, colour);
}

function paintBody(spec, pal, plot, pose) {
  const { phase = 0, amp = 0, sway = 0, headUp = 0, blink = false, breath = 0, bodyX = null } = pose;
  const shape = pose.rest
    ? blend(shapeOf(spec, pose.rest.from), shapeOf(spec, pose.rest.to), pose.rest.u)
    : shapeOf(spec, "stand");
  const last = spec.len - 1;
  const [dropHind, dropFore] = (spec.drawnLegs ? drawnDips : walkDips)(phase, amp, spec.bob);
  const dropAt = dipAlong(dropHind, dropFore, last);
  const top = profile(spec.top);
  const bottom = profile(spec.bottom);
  const nearLeg = spec.coatLegs ? pal.L : pal.T;
  const farLeg = spec.coatLegs ? pal.l : pal.F;
  const rootOf = (L, far) => [shape.at(L.root[0]) + (far ? spec.farShift : 0), L.root[1] + shape.off(L.root[0])];

  // A bending leg, two tapering bones from the body to the foot; a short leg, four drawn poses while
  // walking, and at rest straight from the body to its foot, a foreleg laid flat adding its paw.
  const leg = (L, offset, far) => {
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
    for (const [x, h] of cells) plot(x, h, spec.legCoat?.(x, h, far, pal) ?? (far ? farLeg : nearLeg));
  };

  paintLimb(leg(spec.hind, 0.5, true), true);
  paintLimb(leg(spec.fore, 0.75, true), true);

  // The tail.
  const [t0, t1, t2] = shape.tail;
  const tip = [t2[0] + sway * spec.tail.sway, t2[1]];
  curve([t0[0], t0[1] - dropHind], [t1[0], t1[1] - dropHind / 2], tip, 48, (x, h, t) => {
    for (let k = 0; k < spec.tail.w; k += 1) {
      const key = spec.tail.colour?.(t, k) ?? (k === 0 && spec.tail.w > 1 ? "S" : "T");
      const lying = shape.stand < 0.5 && spec.tail.thick !== "h";
      if (spec.tail.thick === "h" || lying) plot(x, Math.max(0, h + k), pal[key] ?? key);
      else plot(x + k, Math.max(0, h), pal[key] ?? key);
    }
  });
  for (const [dx, dh, key] of spec.tail.tuft)
    plot(Math.round(tip[0]) + dx, Math.max(0, Math.round(tip[1]) + dh), pal[key]);

  // The body, column by column: lit along the back, shaded low, darkest beneath.
  const standing = shape.stand > 0.5;
  for (let x = 0; x < spec.len; x += 1) {
    const X = Math.round(shape.at(x));
    const [b, t] = column(spec, top, bottom, x, shape.off(x), dropAt(x), breath, standing);
    for (let h = b; h <= t; h += 1) {
      const key = coatKey(spec, x, h - b, t - b);
      plot(X, h, spec.coat?.(x, h - b, t - b, key, pal) ?? pal[key]);
    }
  }

  paintLimb(leg(spec.hind, 0, false), false);

  // The haunch: a round thigh over the folded hind leg, lit on top and shaded behind and below.
  if (shape.haunch > 0.6) {
    const [rx, ry] = spec.haunch;
    const hipX = spec.hind.root[0];
    const cx = shape.at(hipX) + 0.5;
    const ch = Math.max(ry, bottom(hipX) + shape.off(hipX) + ry * 0.5);
    haunch(cx, ch, rx, ry, Math.max(0, Math.floor(ch - ry)), (x, h, key) =>
      plot(x, h, spec.coat?.(x, h, ry * 2, key, pal) ?? pal[key]),
    );
  }

  paintLimb(leg(spec.fore, 0.25, false), false);

  // The head and its mane ride the front of the body; a raised head lifts them as one piece.
  const [headDx, headDh] = shape.head;
  const mouthOpen = pose.mouth ?? 0;
  const headLift = Math.round(headUp * spec.headUp + headDh);
  const dx = Math.round(headDx);
  if (spec.mane) {
    const [faceX, faceH] = spec.maneFace;
    const ragged = spec.ragged + (pose.bristle ? 1 : 0);
    for (const [cx, ch, rx, ry] of spec.mane) {
      const grow = pose.bristle ? 0.6 : 0;
      for (let x = Math.floor(cx - rx - grow); x <= Math.ceil(cx + rx + grow); x += 1) {
        const strand = Math.round((hash(x, 1, 5) - 0.3) * ragged);
        for (let h = Math.floor(ch - ry) - ragged; h <= Math.ceil(ch + ry + grow); h += 1) {
          const nx = (x - cx) / (rx + grow);
          const below = h < ch;
          const ny = (h - ch) / (below ? ry + strand : ry + grow);
          if (nx * nx + ny * ny > 1) continue;
          const far = Math.hypot(x - faceX, (h - faceH) * 0.8) / spec.maneReach + (hash(x, 2, 7) - 0.5) * spec.jitter;
          const tone = far < 0.34 ? pal.g : far < 0.6 ? pal.m : far < 0.84 ? pal.n : pal.k;
          const lifted = h - dropFore + headLift;
          if (below && headLift > 0) plot(x + dx, Math.max(0, h - dropFore + Math.round(headDh)), tone);
          if (lifted >= 0) plot(x + dx, lifted, tone);
        }
      }
    }
  }
  const face = faceOf(spec, mouthOpen);
  const [hx, hh] = spec.face.at;
  const lift = headLift - dropFore;
  const eyeShut = blink || pose.eyesShut;
  face.grid.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      const key = ch === "e" ? (eyeShut ? (spec.face.lid ?? "T") : (spec.face.eye ?? "D")) : ch;
      const h = hh - r + lift;
      if (h >= 0) plot(hx + c + dx, h, pal[key]);
    });
  });

  // The roar's rings of sound: arcs that leave the mouth and spread, fading, tilted a little up.
  if (pose.roar != null && pal.roar) {
    const mx = hx + dx + face.mouth[0];
    const mh = hh - face.mouth[1] + lift;
    for (const start of ROAR_RINGS) {
      const u = (pose.roar - start) / 0.9;
      if (u < 0 || u >= 1) continue;
      const radius = 3 + u * 12;
      const colour = rgba(pal.roar, 0.9 * (1 - u));
      const seen = new Set();
      for (let a = -60; a <= 50; a += 4) {
        const rad = ((a - 15) * Math.PI) / 180;
        const x = mx + Math.round(Math.cos(rad) * radius);
        const h = mh - Math.round(Math.sin(rad) * radius);
        if (seen.has(`${x},${h}`)) continue;
        seen.add(`${x},${h}`);
        plot(x, h, colour);
      }
    }
  }
}

const ROAR = 2.2; // seconds a roar lasts
const ROAR_RINGS = [0.3, 0.8, 1.3];
const YAWN = 2.0; // seconds a yawn lasts

// The roar, r seconds in: the head lifts and the jaw parts, then opens wide with the mane bristling
// every other beat while three rings of sound leave the mouth; then it closes and the head lowers.
export function roarAt(r) {
  if (r < 0 || r >= ROAR) return null;
  const mouth = r < 0.25 ? 1 : r < 1.75 ? 2 : r < 2.0 ? 1 : 0;
  return { roar: r, mouth, headUp: r < 2.0 ? 1 : 0, bristle: mouth === 2 && Math.floor(r * 4) % 2 === 0 };
}

// The yawn, y seconds in: the head tips up and the jaw drops wide with the eyes squeezed shut, holds,
// then closes, and the cat blinks.
export function yawnAt(y) {
  if (y < 0 || y >= YAWN) return null;
  const mouth = y < 0.25 ? 1 : y < 1.4 ? 2 : y < 1.65 ? 1 : 0;
  return { mouth, headUp: y < 1.65 ? 1 : 0, eyesShut: y >= 0.3 && y < 1.5, blink: y >= 1.75 && y < 1.87 };
}
