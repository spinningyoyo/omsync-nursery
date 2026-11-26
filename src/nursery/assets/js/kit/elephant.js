// Elephants built from parts: pillar legs of two bones whose joints both bend forward (the wrist in
// front, the knee behind, as in Muybridge's walking elephant), an ear that lies over the neck and
// moves with the head, a trunk of five jointed pieces that hangs from the face, swings as the
// elephant walks and can lift or curl, and tusks that ride with the head. Four tones lit from above.
// One spec per member (AFRICAN, ASIAN and a calf of each), drawn by drawElephant(spec, pal, plot,
// pose); elephantAt (below) places and poses it. Coordinates are the elephant's own: x runs from
// the rump (0) toward the face and h is the height above the ground; `plot(x, h, colour)` paints a
// pixel, so the caller places and mirrors it. The trumpet, the trunk curl and the dust bath are
// trunk actions (trumpetAt, curlAt, dustAt), each returning the pose fields it sets.
import {
  blender,
  bone,
  bump,
  coatKey,
  column,
  curve,
  dipAlong,
  footRest,
  joint,
  plant,
  profile,
  rowFill,
  shapeCache,
  standFeet,
  stepAt,
  straighten,
  walkDips,
} from "./build.js";
import { clamp, frac, hash, lerp, mix, rgba, shadowColour, smooth } from "./pixel.js";
import { blinkAt, breathAt, ease, feet, paintAt, sinceOf, tonesFor } from "./place.js";

export const STANCE = 0.7; // an elephant's slow walk keeps each foot down a little longer than a cat's

// The four tones from a scene's elephant palette [body, shade, ear skin, tusk, eye]: a highlight
// along the back warmed toward the ivory, the base, the shade, the darkest underneath and the far
// legs between the shade and the dark.
export function elephantTones(arr, extra = {}) {
  const [body, shadeTone, skin, tusk, eye] = arr;
  return {
    H: mix(body, tusk, 0.22),
    T: body,
    S: shadeTone,
    U: mix(shadeTone, eye, 0.3),
    F: mix(shadeTone, eye, 0.18),
    K: skin,
    P: tusk,
    p: mix(tusk, shadeTone, 0.35),
    D: eye,
    ...extra,
  };
}

// ---- Poses ------------------------------------------------------------------------------------

const SHAPES = {
  stand(spec) {
    return {
      off: () => 0,
      hind: standFeet(spec.hind.foot, spec.farShift, spec.hind.stand),
      fore: standFeet(spec.fore.foot, spec.farShift, spec.fore.stand),
      head: [0, 0],
      trunk: spec.trunk.hang,
      stand: 1,
    };
  },
  // Lying on the belly (a calf asleep): the body down on the ground, the hind legs folded under it
  // with the feet showing in front of the knee, the forelegs out along the ground, the head resting
  // low and the trunk laid along the ground in front.
  lie(spec) {
    const bottom = profile(spec.bottom);
    const off = (x) => -bottom(x);
    const F = spec.len - 1;
    return {
      off,
      hind: { near: [spec.hind.root[0] + 2, 0], far: [spec.hind.root[0] + 3, 0] },
      fore: { near: [spec.fore.root[0] + 3, 0], far: [spec.fore.root[0] + 2, 0] },
      head: [0, Math.round(off(F)) + spec.headLie],
      trunk: spec.trunk.ground,
      stand: 0,
    };
  },
};

const shapeOf = shapeCache(SHAPES);

const mixAngles = (A, B, u) => A.map((a, i) => lerp(a, B[i], u));
const blend = blender({ off: "fn", hind: "pair", fore: "pair", head: "pt", trunk: "nums", stand: "num" });

// The trunk's points from its root: each piece hangs at an angle from straight down, turning
// forward as the angle grows (pi points straight up, more curls back over the head).
function trunkPoints(spec, root, angles, swing = 0) {
  const pts = [root];
  let [x, h] = root;
  spec.trunk.len.forEach((L, i) => {
    const a = angles[i] + swing;
    x += L * Math.sin(a);
    h -= L * Math.cos(a);
    pts.push([x, h]);
  });
  return pts;
}

// ---- The elephant -------------------------------------------------------------------------------

// One elephant, in its own units: x runs from the rump (0) toward the trunk, h is the height above
// the ground. Pose fields: phase and amp (the walk), sway (tail), swing (trunk), headUp, headDh,
// blink, eyesShut, breath, bodyX; rest ({ from, to, u }); trunk (angles that replace the pose's);
// ear (0 laid back, 1 held out); mouth; rings (seconds into a trumpet); dust (seconds into a spray).
export function drawElephant(spec, pal, plot, pose) {
  const { phase = 0, amp = 0, sway = 0, swing = 0, headUp = 0, blink = false, breath = 0, bodyX = null } = pose;
  const shape = pose.rest
    ? blend(shapeOf(spec, pose.rest.from), shapeOf(spec, pose.rest.to), pose.rest.u)
    : shapeOf(spec, "stand");
  const last = spec.len - 1;
  const [dropHind, dropFore] = walkDips(phase, amp, spec.bob);
  const dropAt = dipAlong(dropHind, dropFore, last);
  const top = profile(spec.top);
  const bottom = profile(spec.bottom);

  // A pillar leg: two tapering bones from the body to a round foot, filled row by row.
  const limb = (L, offset, far) => {
    const cells = new Map();
    const p = frac(phase + offset);
    const [reach, lift] = stepAt(p, STANCE, spec.stride, spec.lift);
    const F = [plant(footRest(shape, L, far)[0] + reach * amp, bodyX), lift * amp];
    const R = [
      L.root[0] + (far ? spec.farShift : 0),
      L.root[1] + shape.off(L.root[0]) - (L.fore ? dropFore : dropHind),
    ];
    const straight = (1 - amp) * shape.stand;
    const J = straighten(R, F, joint(R, F, L.a, L.b, L.bend, [R[0] + L.bend * L.a * 0.7, R[1]]), straight);
    const span = rowFill(cells);
    bone(span, R, J, L.w[0], L.w[1]);
    bone(span, J, F, L.w[1], L.w[2]);
    // The round foot: a pad one pixel wider in front, a pale toenail at its toe.
    const fh = Math.round(lift * amp);
    const px = Math.round(F[0] - L.w[2] / 2);
    span(fh, px, px + L.w[2]);
    return { cells: [...cells.values()], nail: [px + L.w[2], fh] };
  };
  const paintLimb = (L, offset, far) => {
    const { cells, nail } = limb(L, offset, far);
    for (const [x, h] of cells) plot(x, h, far ? pal.F : h === 0 && shape.stand > 0.5 ? pal.S : pal.T);
    if (!far && spec.nails && shape.stand > 0.5) plot(nail[0], nail[1], pal.p);
  };

  paintLimb(spec.hind, 0.5, true);
  paintLimb(spec.fore, 0.75, true);

  // The tail hangs from the rump, swinging with the step, a dark tuft at its tip.
  const [t0, t1, t2] = spec.tail.points;
  const off0 = shape.off(0);
  const tip = [t2[0] + sway * spec.tail.sway, Math.max(0, t2[1] + off0)];
  curve([t0[0], t0[1] + off0 - dropHind], [t1[0], t1[1] + off0 - dropHind], tip, 32, (x, h) => {
    if (h >= 0) plot(x, h, pal.S);
  });
  for (const [dx, dh] of spec.tail.tuft) {
    const h = Math.round(tip[1]) + dh;
    if (h >= 0) plot(Math.round(tip[0]) + dx, h, pal.D);
  }

  // The body, column by column: lit along the back, shaded low, darkest beneath.
  const standing = shape.stand > 0.5;
  for (let x = 0; x < spec.len; x += 1) {
    const [b, t] = column(spec, top, bottom, x, shape.off(x), dropAt(x), breath, standing);
    for (let h = b; h <= t; h += 1) plot(x, h, pal[coatKey(spec, x, h - b, t - b, 0.4)]);
  }

  paintLimb(spec.hind, 0, false);
  paintLimb(spec.fore, 0.25, false);

  // The head, the ear, the trunk and the tusks ride the front of the body as one piece.
  const [headDx, headDh] = shape.head;
  const lift = Math.round(headUp * spec.headUp + headDh + (pose.headDh ?? 0)) - dropFore;
  const dx = Math.round(headDx + (pose.headDx ?? 0));
  const eyeShut = blink || pose.eyesShut;
  const [hx, hh] = spec.face.at;
  spec.face.grid.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      const key = ch === "e" ? (eyeShut ? "T" : "D") : ch;
      const h = hh - r + lift;
      if (h >= 0) plot(hx + c + dx, h, pal[key]);
    });
  });
  if (pose.mouth) for (const [mx, mh] of spec.mouth) if (mh + lift >= 0) plot(mx + dx, mh + lift, pal.K);

  // The ear lies over the neck. Held out (a flap, or spread to trumpet) it swings toward us: its
  // back edge draws in toward the head and the pink skin inside shows along it.
  const ear = clamp(pose.ear ?? 0, 0, 1);
  const [ex, eh] = spec.ear.at;
  const front = ex + spec.ear.grid[0].length - 1;
  const squeeze = 1 - spec.ear.swing * ear;
  spec.ear.grid.forEach((line, r) => {
    const cols = [...line];
    const rear = cols.findIndex((ch) => ch !== ".");
    if (rear < 0) return;
    for (let x = front; x >= ex; x -= 1) {
      const src = Math.round(front - (front - x) / squeeze) - ex;
      if (src < 0 || src >= cols.length || cols[src] === ".") continue;
      let key = cols[src];
      if (ear > 0.3 && src <= rear + Math.round(ear * 1.5) && key !== "H") key = "K";
      const h = eh - r + lift + (ear > 0.5 && r === 0 ? 1 : 0);
      if (h >= 0) plot(x + dx, h, pal[key]);
    }
  });

  // The trunk: pieces from the root, tapering, filled with a square brush so every row touches the
  // next; lit along the top where it runs level, shaded underneath.
  const angles = pose.trunk ?? shape.trunk;
  const [rx, rh] = spec.trunk.root;
  const pts = trunkPoints(spec, [rx + dx, rh + lift], angles, swing);
  const trunkCells = new Map();
  const total = spec.trunk.len.reduce((s, v) => s + v, 0);
  let walked = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const [ax, ah] = pts[i - 1];
    const [bx, bh] = pts[i];
    const L = spec.trunk.len[i - 1];
    const n = Math.max(2, Math.ceil(L * 5));
    for (let k = 0; k <= n; k += 1) {
      const u = k / n;
      const w = Math.max(1, Math.round(lerp(spec.trunk.w[0], spec.trunk.w[1], (walked + u * L) / total)));
      const cx = lerp(ax, bx, u);
      const ch = lerp(ah, bh, u);
      const x0 = Math.round(cx - (w - 1) / 2);
      const h0 = Math.round(ch - (w - 1) / 2);
      for (let x = x0; x < x0 + w; x += 1)
        for (let h = h0; h < h0 + w; h += 1) trunkCells.set(`${x}|${Math.max(0, h)}`, [x, Math.max(0, h)]);
    }
    walked += L;
  }
  for (const [x, h] of trunkCells.values()) {
    const below = trunkCells.has(`${x}|${h - 1}`);
    const above = trunkCells.has(`${x}|${h + 1}`);
    plot(x, h, !below && above && h > 0 ? pal.S : pal.T);
  }
  const trunkTip = pts[pts.length - 1];

  // The tusks curve forward from the lip, over the trunk.
  if (spec.tusk) {
    const [tx, th] = spec.tusk.at;
    spec.tusk.cells.forEach(([cx, ch], i) => {
      const h = th + ch + lift;
      if (h >= 0) plot(tx + cx + dx, h, pal[i < (spec.tusk.base ?? 1) ? "p" : "P"]);
    });
  }

  // The trumpet's sound marks: arcs that leave the trunk's tip and spread up and forward, fading,
  // as the lion's roar rings do.
  if (pose.rings != null && pal.roar) {
    const mx = Math.round(trunkTip[0]);
    const mh = Math.round(trunkTip[1]);
    for (const start of spec.rings ?? TRUMPET_RINGS) {
      const u = (pose.rings - start) / 0.8;
      if (u < 0 || u >= 1) continue;
      const radius = 2 + u * (spec.ringReach ?? 8);
      const colour = rgba(pal.roar, 0.9 * (1 - u));
      const seen = new Set();
      for (let a = -50; a <= 50; a += 4) {
        const rad = ((60 + a) * Math.PI) / 180;
        const x = mx + Math.round(Math.cos(rad) * radius);
        const h = mh + Math.round(Math.sin(rad) * radius);
        if (seen.has(`${x},${h}`)) continue;
        seen.add(`${x},${h}`);
        plot(x, h, colour);
      }
    }
  }

  // The dust thrown over the back: puffs that leave the trunk's tip, fly back and fall, fading.
  if (pose.dust != null && pal.dust) {
    const from = pose.dustFrom ?? trunkTip;
    for (let i = 0; i < 14; i += 1) {
      const start = (i % 7) * 0.09;
      const s = pose.dust - start;
      if (s < 0 || s > 1.3) continue;
      const vx = -(6 + hash(i, 1, 9) * 9);
      const vh = 3 + hash(i, 2, 9) * 6;
      const x = Math.round(from[0] + vx * s);
      const h = Math.round(from[1] + vh * s - 9 * s * s);
      if (h < 0) continue;
      const a = 0.85 * (1 - s / 1.3);
      plot(x, h, rgba(pal.dust, a));
      if (hash(i, 3, 9) > 0.5) plot(x + 1, h, rgba(pal.dust, a * 0.6));
    }
  }
}

const TRUMPET_RINGS = [0.1, 0.55, 1.0];

// ---- The members --------------------------------------------------------------------------------

// The African bull-sized cow: XXL, 31 wide. A long back highest at the shoulder with a dip behind it
// and a rump that drops steeply; long legs; a great ear laid over the neck and shoulder, its lobe
// hanging below the jaw, with the pink skin along its back edge; the trunk
// hanging nearly to the ground with its tip curled forward, and tusks curving out and up.
export const AFRICAN = {
  id: "african",
  len: 22,
  top: [
    [0, 17],
    [1, 19],
    [2, 20],
    [4, 21],
    [7, 22],
    [15, 22],
    [17, 23],
    [21, 23],
  ],
  bottom: [
    [0, 13],
    [1, 11],
    [3, 10],
    [7, 9],
    [13, 9],
    [16, 10],
    [21, 11],
  ],
  lit: 2,
  litFrom: 1,
  under: 1,
  chest: [13, 18],
  bob: 1,
  hind: { root: [4, 11], a: 5, b: 5.2, bend: 1, foot: 4, w: [4, 4, 3], stand: [-1, 1] },
  fore: { root: [17, 11], a: 6.2, b: 4, bend: 1, foot: 17, w: [4, 3, 3], stand: [0, -2], fore: true },
  farShift: 2,
  stride: 5,
  lift: 2,
  nails: true,
  tail: {
    points: [
      [-1, 17],
      [-1.4, 13],
      [-1, 10],
    ],
    sway: 0.6,
    tuft: [
      [0, 0],
      [0, -1],
    ],
  },
  face: {
    at: [19, 23],
    grid: [
      "...HHHH...",
      ".HHHHHHH..",
      "TTTTTTTTT.",
      "TTTTTTTTT.",
      "TTTTTeTTTT",
      "TTTTTTTTTT",
      "STTTTTTTTT",
      "SSTTTTTTTT",
      ".SSSTTTTTT",
      "..SSSSTTT.",
      "...UU.....",
    ],
  },
  mouth: [
    [24, 13],
    [25, 13],
  ],
  ear: {
    at: [13, 22],
    swing: 0.35,
    grid: [
      "...HHHHH..",
      "..HTTTTTT.",
      ".TSKKSSSST",
      "TSKKKSSSST",
      "TSSKKSSSSS",
      "TSSSKSSSSS",
      ".SSSSSSSSS",
      "..SSSSSSSS",
      "...SSSSSS.",
      "....SSSSU.",
      ".....SSU..",
      "......UU..",
      "......U...",
    ],
  },
  trunk: {
    root: [26, 14],
    len: [3, 3, 2.5, 2, 1.5],
    w: [3, 2],
    hang: [0.05, 0, 0, 0.4, 1.2],
    curl: [0, 0.05, 0.6, 2.0, 3.2],
    coil: [0, 1.4, 2.8, 4.0, 4.6],
    raise: [2.6, 3.0, 3.15, 3.3, 3.7],
    reach: [0.15, 0.1, 0.15, 0.3, 0.7],
    scoop: [0.1, 0.05, 0.05, 0.6, 1.8],
    over: [2.4, 3.1, 3.6, 4.0, 4.3],
    ground: [0.6, 1.3, 1.5, 1.6, 1.8],
  },
  tusk: {
    at: [26, 14],
    cells: [
      [0, -1],
      [1, -1],
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 1],
    ],
    base: 2,
  },
  headUp: 1,
  headLie: 2,
  ringReach: 7,
};

// The Asian cow: XL, 27 wide. Shorter in the leg, the back highest in the middle and rounded down
// to the rump, a twin-domed head carried high, a small ear with its top edge rolled forward, a
// slimmer trunk, and short tusks (all the owner's Asian elephants are tuskers).
export const ASIAN = {
  id: "asian",
  len: 19,
  top: [
    [0, 13],
    [1, 15],
    [2, 16],
    [5, 18],
    [8, 19],
    [11, 19],
    [14, 18],
    [16, 17],
    [18, 17],
  ],
  bottom: [
    [0, 11],
    [1, 9],
    [3, 8],
    [7, 7],
    [12, 7],
    [15, 8],
    [18, 9],
  ],
  lit: 2,
  litFrom: 1,
  under: 1,
  chest: [11, 15],
  bob: 1,
  hind: { root: [4, 9], a: 4.1, b: 4.1, bend: 1, foot: 4, w: [4, 3, 3], stand: [-1, 1] },
  fore: { root: [15, 9], a: 4.9, b: 3.3, bend: 1, foot: 15, w: [3, 3, 3], stand: [0, -2], fore: true },
  farShift: 2,
  stride: 4,
  lift: 2,
  nails: true,
  tail: {
    points: [
      [-1, 14],
      [-1.3, 11],
      [-1, 8],
    ],
    sway: 0.6,
    tuft: [
      [0, 0],
      [0, -1],
    ],
  },
  face: {
    at: [16, 19],
    grid: ["..HH.H..", ".HHHHHH.", "TTTTTTTT", "TTTTeTTT", "TTTTTTTT", "STTTTTTT", "SSTTTTTT", ".SSSSTT.", "...UU..."],
  },
  mouth: [
    [20, 11],
    [21, 11],
  ],
  ear: {
    at: [13, 17],
    swing: 0.3,
    grid: [".HHH..", "TSKST.", "TSKSS.", "SSSSS.", ".SSSS.", "..SSU.", "...U.."],
  },
  trunk: {
    root: [21.5, 12],
    len: [2.5, 2.5, 2, 1.5, 1],
    w: [2.6, 1.6],
    hang: [0.05, 0, 0, 0.4, 1.2],
    curl: [0, 0.05, 0.6, 2.0, 3.2],
    coil: [0, 1.4, 2.8, 4.0, 4.6],
    raise: [2.6, 3.0, 3.15, 3.3, 3.7],
    reach: [0.15, 0.1, 0.15, 0.3, 0.7],
    scoop: [0.1, 0.05, 0.05, 0.6, 1.8],
    over: [2.4, 3.1, 3.6, 4.0, 4.3],
    ground: [0.6, 1.3, 1.5, 1.6, 1.8],
  },
  tusk: {
    at: [22, 12],
    cells: [
      [0, -1],
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 1],
    ],
    base: 1,
  },
  headUp: 1,
  headLie: 2,
  ringReach: 6,
};

// The calves, drawn on their own: a big head held high over a short, round body, long legs for
// their size (they bend, at five pixels), a small ear, a short trunk and no tusks.
export const AFRICAN_CALF = {
  id: "africanCalf",
  len: 11,
  top: [
    [0, 7],
    [1, 8],
    [3, 9],
    [8, 9],
    [10, 9],
  ],
  bottom: [
    [0, 6],
    [1, 5],
    [9, 5],
    [10, 6],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [7, 9],
  bob: 1,
  hind: { root: [2, 6], a: 2.7, b: 2.6, bend: 1, foot: 2, w: [2, 2, 2], stand: [0, 1] },
  fore: { root: [8, 6], a: 2.7, b: 2.6, bend: 1, foot: 8, w: [2, 2, 2], stand: [0, -1], fore: true },
  farShift: 1,
  stride: 3,
  lift: 1,
  tail: {
    points: [
      [-1, 8],
      [-1.2, 6],
      [-1, 4],
    ],
    sway: 0.5,
    tuft: [[0, 0]],
  },
  face: { at: [8, 11], grid: ["..HHH..", ".HHHHH.", "TTTTeTT", "TTTTTTT", "STTTTTT", ".SSTTT.", "..UU..."] },
  mouth: [[11, 5]],
  ear: { at: [6, 10], swing: 0.3, grid: ["..HH.", ".TKSS", "TKKSS", "SSSSS", ".SSSS", "..SU."] },
  trunk: {
    root: [13, 6],
    len: [1.6, 1.6, 1.2],
    w: [2, 1],
    hang: [0.05, 0.15, 1.0],
    curl: [0.2, 1.4, 2.8],
    coil: [0.2, 1.6, 3.2],
    raise: [2.6, 3.1, 3.6],
    reach: [0.2, 0.2, 0.6],
    scoop: [0.2, 0.6, 1.6],
    over: [2.6, 3.4, 4.0],
    ground: [0.4, 1.1, 1.5],
  },
  headUp: 1,
  headLie: 2,
  ringReach: 4,
  rings: [0.3, 0.9],
};

export const ASIAN_CALF = {
  ...AFRICAN_CALF,
  id: "asianCalf",
  face: { at: [8, 11], grid: ["..H.H..", ".HHHHH.", "TTTTeTT", "TTTTTTT", "STTTTTT", ".SSTTT.", "..UU..."] },
  ear: { at: [7, 9], swing: 0.3, grid: [".HH.", "TKSS", "SSSS", ".SSU"] },
};

// ---- Actions ----------------------------------------------------------------------------------

// 0 to 1 over `rise` seconds from `a`, held, then back to 0 over the last `rise` seconds before `b`.
const swell = (t, a, b, rise) => smooth(bump(t, a, b, rise));

export const TRUMPET = 2.6;
// The trumpet, r seconds in: the head lifts and the ears swing out as the trunk sweeps up in front of
// the face, the mouth opens beneath it, the tip flicks as three sound marks leave it, then all eases
// back down.
export function trumpetAt(spec, r) {
  if (r < 0 || r >= TRUMPET) return null;
  const k = swell(r, 0, TRUMPET, 0.6);
  const trunk = mixAngles(spec.trunk.hang, spec.trunk.raise, k);
  if (r > 0.6 && r < 2.0) trunk[trunk.length - 1] += 0.18 * Math.sin(r * 12);
  return { trunk, headUp: k, ear: k, mouth: r > 0.45 && r < 2.15, rings: r > 0.5 && r < 2.3 ? r - 0.5 : null };
}

export const CURL = 2.2;
// The trunk curled up in front of the chest, testing the air, then let down again.
export function curlAt(spec, c) {
  if (c < 0 || c >= CURL) return null;
  return { trunk: mixAngles(spec.trunk.hang, spec.trunk.curl, swell(c, 0, CURL, 0.6)) };
}

export const DUST = 3.8;
// The dust bath, d seconds in: the head dips and the trunk reaches down to the ground, curls under to
// gather a trunkful, swings up and back over the head, throws the dust over the back, and lets down.
export function dustAt(spec, d) {
  if (d < 0 || d >= DUST) return null;
  const T = spec.trunk;
  const keys = [
    [0, T.hang, 0],
    [0.7, T.reach, -1],
    [1.3, T.scoop, -1],
    [1.8, T.over, 1],
    [2.9, T.over, 1],
    [3.6, T.hang, 0],
  ];
  let i = keys.findIndex(([at]) => at > d);
  if (i < 0) i = keys.length;
  const A = keys[Math.max(0, i - 1)];
  const B = keys[Math.min(keys.length - 1, i)];
  const u = B === A ? 1 : smooth(clamp((d - A[0]) / (B[0] - A[0]), 0, 1));
  return {
    trunk: mixAngles(A[1], B[1], u),
    headDh: Math.round(A[2] + (B[2] - A[2]) * u),
    dust: d > 1.65 && d < 3.1 ? d - 1.65 : null,
  };
}

// Elephants

// Built from parts (elephant.js), a calf (scale below 0.8) drawn on its own. An elephant walks an
// amble with its feet planted, stands breathing and blinking and now and then flaps an ear, and in a
// long stop does one thing: curls its trunk to test the air, trumpets (rings of sound leave the
// trunk) or takes a dust bath. A calf in a long stop lies down to sleep and gets up before the herd
// moves on. e.since (settle, critters.js) is when its state last changed and e.timer the seconds its
// stop has left, so an action is only chosen when it fits (e.act, "curl", "trumpet" or "dust", with
// e.actAt seconds in, shows one on demand; e.pose "lie" lays a calf down). Its palette is the scene's `elephant`
// array (body, shade, skin, tusk, eye) with elephantRoar and elephantDust beside it.
const ELEPHANTS = { african: AFRICAN, asian: ASIAN, africanCalf: AFRICAN_CALF, asianCalf: ASIAN_CALF };
const ELEPHANT_SHADOW_COLUMNS = { african: [-1, 29], africanCalf: [0, 15], asian: [-1, 25], asianCalf: [0, 15] };
const ELEPHANT_ACTIONS = [
  [curlAt, CURL],
  [trumpetAt, TRUMPET],
  [dustAt, DUST],
];
const ELEPHANT_ACT_AT = 1.2; // seconds into a stop before it acts
const ELEPHANT_EASE = 0.4; // seconds a walk takes to start or stop
const ELEPHANT_ACT_BY_NAME = { curl: curlAt, trumpet: trumpetAt, dust: dustAt };

export function elephantAt(g, e, time) {
  if (g.trace) return g.trace.draw(elephantAt, g, e, time);
  const calf = (e.scale ?? 1) < 0.8;
  const kind = e.kind === "asian" ? "asian" : "african";
  const name = calf ? `${kind}Calf` : kind;
  const spec = ELEPHANTS[name];
  const colours = g.pal[e.pal ?? "elephant"];
  const pal = tonesFor(colours, "elephant", () =>
    elephantTones(colours, { roar: g.pal.elephantRoar, dust: g.pal.elephantDust }),
  );
  const walking = e.state === "walk";
  const since = sinceOf(e, time);
  const bodyX = e.x * e.dir;
  const phase = bodyX / (spec.stride / STANCE);
  const stride = Math.sin(phase * 2 * Math.PI);
  const pose = {
    phase,
    bodyX,
    amp: ease(walking, since, ELEPHANT_EASE),
    sway: walking ? stride * 0.7 : Math.sin(time * 1.3) * 0.5,
    swing: walking ? stride * 0.16 : Math.sin(time * 0.9) * 0.06,
    breath: breathAt(time, 1.6),
    blink: blinkAt(time, (e.phase ?? 0) * 1.7, 3.7, 0.035),
  };
  if (!walking && since > ELEPHANT_EASE) {
    const stop = since + (e.timer ?? 0); // how long this stop lasts
    const at = since - ELEPHANT_ACT_AT;
    if (calf) {
      // A long stop: lie down, sleep, and be up before the walk.
      const [d0, d1, u0, u1] = [0.8, 1.8, stop - 1.6, stop - 0.6];
      if (e.pose === "lie") {
        Object.assign(pose, { rest: { from: "lie", to: "lie", u: 0 }, swing: 0, eyesShut: true, blink: false });
      } else if (stop >= 5.4 && since >= d0 && since < u1) {
        if (since < d1) pose.rest = { from: "stand", to: "lie", u: (since - d0) / (d1 - d0) };
        else if (since < u0) pose.rest = { from: "lie", to: "lie", u: 0 };
        else pose.rest = { from: "lie", to: "stand", u: (since - u0) / (u1 - u0) };
        pose.swing = 0;
        pose.eyesShut = since >= d1 + 0.4 && since < u0;
        if (pose.eyesShut) pose.blink = false;
      }
    } else {
      const r = hash(Math.round((e.since ?? 0) * 100), Math.round(e.x), kind === "asian" ? 1 : 2);
      const fits = ELEPHANT_ACTIONS.filter(([, length]) => stop >= ELEPHANT_ACT_AT + length + 0.8);
      const act = e.act
        ? ELEPHANT_ACT_BY_NAME[e.act](spec, e.actAt ?? 0)
        : fits.length && r < 0.8
          ? fits[Math.floor((r / 0.8) * fits.length)][0](spec, at)
          : null;
      if (act) {
        Object.assign(pose, act, { swing: 0, blink: false });
      } else if (since >= 2.4 && since < 3.6) {
        pose.ear = Math.sin((Math.PI * (since - 2.4)) / 0.6) ** 2; // two slow ear flaps
      }
    }
  }
  const [s0, s1] = ELEPHANT_SHADOW_COLUMNS[name];
  const shadow = { colour: shadowColour(g.pal), span: [s0, s1 - 1] };
  // Its feet stand a row lower than the other families'.
  paintAt(g, Math.round(e.x), feet(g, e) + 1, e.dir, (plot) => drawElephant(spec, pal, plot, pose), shadow);
}

export const FAMILY = {
  id: "elephants",
  title: "Elephants",
  group: "Animals",
  differ: "size, ears",
  members: {
    "elephant-asian": { spec: ASIAN, realLength: 5.5 },
    "elephant-african": { spec: AFRICAN, realLength: 6.0 },
  },
  drivers: {
    elephantAt: {
      role: "walker",
      member: (a) => (a.kind === "african" ? "elephant-african" : a.kind === "asian" ? "elephant-asian" : "elephant"),
    },
  },
};
