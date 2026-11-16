// Deer built from parts: the elk (bull and cow), the white-tailed deer (buck and doe), the wild
// reindeer (bull and cow, both antlered) and the pronghorn, the family's horned member. A body
// outline, legs of two bones (the fore knee bending forward, the hind hock back, each hind leg with a
// full thigh above a slim cannon) ending in a dark hoof, a tail from the rump, a neck that swings the
// head from grazing (attitude -1) through its carriage (0) to the elk's bugle (+1), and a head whose
// antlers or horns sit on its crown in every pose. Four tones lit from above. One spec per member,
// drawn by drawDeer(spec, pal, plot, pose); animals.js's cervidAt places and poses it. Coordinates are
// the deer's own: x runs from the rump (0) toward the nose and h is the height above the ground;
// `plot(x, h, colour)` paints a pixel, so the caller places and mirrors it. Rest poses: stand, graze,
// lie. Gaits: walk, trot (the pronghorn), bound (a startled white-tail, its tail up as a white flag).
// The bull elk's bugle (bugleAt) tips his head up, opens his mouth and shows his breath.
import {
  coatKey,
  column,
  curve,
  dipAlong,
  footRest,
  haunch,
  mixPt,
  plant,
  profile,
  shapeCache,
  stepAt,
} from "./build.js";
import { GAIT, headFor, hoofDips, hoofFeet, hoofLeg, hoofRoot, hoofRow, hoofShapes, restShape } from "./hoof.js";
import { clamp, frac, hash, lerp, mix, smooth } from "./pixel.js";

// Gaits: when each leg's step starts (near hind, near fore, far hind, far fore), the share of the
// stride a hoof is down, and how much longer and higher the stride is than the walk's. The walk is
// the hoofed four-beat walk (hoof.js's GAIT); the trot moves the diagonal pairs together; the bound (a startled
// white-tail) lands the hind pair, then the fore pair, with the body in the air between.
export const GAITS = {
  walk: { ...GAIT, stride: 1, lift: 1 },
  trot: { at: [0, 0.5, 0.5, 0], stance: 0.5, stride: 1.5, lift: 1.4 },
  bound: { at: [0, 0.5, 0.08, 0.58], stance: 0.34, stride: 2.6, lift: 1.6 },
};

// ---- Poses ------------------------------------------------------------------------------------

// The hoofed rest shapes (hoof.js): stand, graze and lie. Grazing, the shoulders dip as one; the
// blend is the hoofed one, the fore end leading down and the hind end leading up.
const { stand, graze, lie } = hoofShapes(hoofFeet, (spec, x) => (x > spec.len * 0.6 ? -spec.grazeDip : 0));
const shapeOf = shapeCache({ stand, graze, lie });

// ---- The deer ---------------------------------------------------------------------------------

// One deer from a spec, in its own units: x runs from the rump (0) toward the nose, h is the height
// above the ground. `plot(x, h, colour)` paints one pixel. Pose fields: phase, amp and gait (the
// walk), sway (the tail), flag (0 to 1, the white-tail's raised tail), head (added to the rest
// pose's head attitude: + looks up, 1 is the bugle), mouth (open), blink, breath, bodyX (plants the
// hooves while the body steps on), rest ({ from, to, u }), puff (the bugle's breath frame) and rise
// (the bound's lift off the ground).
export function drawDeer(spec, pal, plot, pose) {
  const { phase = 0, amp = 0, sway = 0, blink = false, breath = 0, bodyX = null, flag = 0 } = pose;
  const gait = GAITS[pose.gait ?? "walk"];
  const last = spec.len - 1;
  const shape = restShape(spec, shapeOf, pose);
  const rise = Math.round(pose.rise ?? 0);
  // The walk dips the hips and the shoulders in turn; the trot dips both at once.
  const [hind, fore] = hoofDips(phase, amp, spec.bob);
  const dropHind = (pose.gait === "bound" ? 0 : hind) - rise;
  const dropFore = (pose.gait === "trot" ? hind : pose.gait === "bound" ? 0 : fore) - rise;
  const dropAt = dipAlong(dropHind, dropFore, last);
  const top = profile(spec.top);
  const bottom = profile(spec.bottom);
  const P = (key) => pal[key] ?? key;

  // A leg: two tapering bones from the body to the hoof, filled row by row so each row reaches the
  // row above; the hoof is a dark row at the foot.
  const limb = (L, offset, far) => {
    const p = frac(phase + offset);
    const [reach, lift] = stepAt(p, gait.stance, spec.stride * gait.stride, spec.lift * gait.lift);
    const F = [plant(footRest(shape, L, far)[0] + reach * amp, bodyX), lift * amp + Math.max(0, rise * 0.5)];
    const R = hoofRoot(L, shape, far ? spec.farShift : 0, dropHind, dropFore);
    const { cells } = hoofLeg(shape, L, far, R, F, (1 - amp) * shape.stand);
    // The hoof: a dark row at the foot, `spec.hoof` pixels wide.
    hoofRow(cells, spec, L, F);
    return [...cells.values()];
  };
  const paintLimb = (cells, far) => {
    for (const [x, h, key] of cells) {
      if (key === "thigh") plot(x, h, far ? pal.l : pal.S);
      else plot(x, h, key ? P(key) : (spec.legCoat?.(x, h, far, pal) ?? (far ? pal.l : pal.L)));
    }
  };

  const [nh, nf, fh, ff] = gait.at;
  paintLimb(limb(spec.hind, fh, true), true);
  paintLimb(limb(spec.fore, ff, true), true);

  // The tail hangs from the rump and sways with the step; the white-tail's lifts into a white flag.
  const tail = spec.tail;
  const pts = tail.points.map((p, i) => mixPt(p, (tail.flag ?? tail.points)[i], flag));
  const t0 = [pts[0][0], pts[0][1] + shape.off(0) - dropHind];
  const t1 = [pts[1][0], pts[1][1] + shape.off(0) - dropHind];
  const t2 = [pts[2][0] + sway * tail.sway, pts[2][1] + shape.off(0) - dropHind];
  curve(t0, t1, t2, 24, (x, h, t) => {
    for (let k = 0; k < tail.w; k += 1) plot(x - k, Math.max(0, h), P(tail.colour(t, k, flag)));
  });

  // The body, column by column: lit along the back, shaded low, darkest beneath.
  const standing = shape.stand > 0.5;
  for (let x = 0; x < spec.len; x += 1) {
    const [b, t] = column(spec, top, bottom, x, shape.off(x), dropAt(x), breath, standing);
    for (let h = b; h <= t; h += 1) {
      const key = coatKey(spec, x, h - b, t - b);
      plot(x, h, spec.coat?.(x, h - b, t - b, key, pal) ?? pal[key]);
    }
  }

  paintLimb(limb(spec.hind, nh, false), false);

  // Lying, a round haunch over the folded hind leg.
  if (shape.fold > 0.6) {
    const [rx, ry] = spec.haunch;
    haunch(spec.hind.root[0] + 0.5, ry, rx, ry, 0, (x, h, key) =>
      plot(x, h, spec.coat?.(x, h, ry * 2, key, pal) ?? pal[key]),
    );
  }

  paintLimb(limb(spec.fore, nf, false), false);

  // The neck: a thick bone from the withers to the head, lit along its crest and darker (a mane, a
  // ruff or a white throat) beneath. Its end swings with the head's attitude.
  const attitude = clamp(shape.head + (pose.head ?? 0), -1, 1);
  const N = spec.neck;
  const [bx, bh] = N.base;
  const B = [bx, bh + shape.off(bx) - dropFore];
  const dir = attitude < 0 ? mixPt(N.level, N.low, -attitude) : mixPt(N.level, N.high, attitude);
  const up = shape.neckUp ?? 0;
  const v = mixPt(dir, N.lying ?? N.level, attitude < 0 ? 0 : up);
  const E = [B[0] + v[0], B[1] + v[1]];
  const len = Math.hypot(v[0], v[1]);
  const ux = v[0] / len;
  const uh = v[1] / len;
  for (let x = Math.floor(Math.min(B[0], E[0]) - 4); x <= Math.ceil(Math.max(B[0], E[0]) + 4); x += 1) {
    for (let h = Math.floor(Math.min(B[1], E[1]) - 4); h <= Math.ceil(Math.max(B[1], E[1]) + 4); h += 1) {
      const rx = x - B[0];
      const rh = h - B[1];
      const along = (rx * ux + rh * uh) / len;
      if (along < -0.15 || along > 1.05) continue;
      const across = -rx * uh + rh * ux; // + toward the crest
      const half = lerp(N.w[0], N.w[1], clamp(along, 0, 1)) / 2;
      const mane = N.mane ? N.mane * (0.6 + hash(x - Math.round(B[0]), h, 3) * 0.6) : 0;
      if (across > half || across < -half - mane) continue;
      if (h < 0) continue;
      const key = N.colour(along, across / half, across < -half, pal);
      plot(x, h, P(key));
    }
  }

  // The head, its ears and its antlers or horns, placed on the neck's end.
  const which = headFor(attitude);
  const head = spec.heads[which];
  const grid = pose.mouth && head.open ? head.open : head.grid;
  const ex = Math.round(E[0]);
  const eh = Math.round(E[1]);
  const [ac, ar] = head.anchor;
  grid.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      const key = ch === "e" && blink ? (spec.lid ?? "t") : ch;
      const h = eh + ar - r;
      if (h >= 0) plot(ex + c - ac, h, P(key));
    });
  });
  const rack = spec.racks?.[which];
  if (rack) {
    const [cc, cr] = head.crown;
    const [rc, rr] = rack.anchor;
    rack.grid.forEach((line, r) => {
      [...line].forEach((ch, c) => {
        if (ch === ".") return;
        const h = eh + ar - cr + (rr - r);
        if (h >= 0) plot(ex - ac + cc + (c - rc), h, P(ch));
      });
    });
  }

  // The bull's breath while he bugles: a plume that leaves the open mouth, widens as it rises and
  // breaks up, one exhale in eight frames, as the studio edit drew it.
  if (pose.puff != null && head.mouth && pal.B) {
    const [mc, mr] = head.mouth;
    const mx = ex - ac + mc;
    const mh = eh + ar - mr;
    for (const [dx, dh, w, hh] of BREATH[pose.puff % BREATH.length]) {
      for (let i = 0; i < w; i += 1) for (let j = 0; j < hh; j += 1) plot(mx + dx + i, mh + dh - j, pal.B);
    }
  }
}

// The studio edit's breath (ELK_BREATH), starting at the mouth: [dx, dh of the top row, w, h].
const BREATH = [
  [[1, 1, 2, 1]],
  [
    [1, 1, 2, 2],
    [3, 2, 1, 1],
  ],
  [
    [1, 1, 2, 1],
    [2, 2, 3, 1],
    [4, 3, 2, 2],
    [3, 1, 1, 1],
  ],
  [
    [2, 2, 2, 1],
    [3, 3, 3, 1],
    [5, 4, 3, 2],
    [4, 1, 1, 1],
  ],
  [
    [4, 3, 2, 1],
    [5, 4, 2, 1],
    [6, 5, 2, 2],
    [3, 2, 1, 1],
  ],
  [
    [5, 4, 2, 1],
    [7, 5, 1, 1],
    [6, 6, 1, 1],
  ],
  [[7, 6, 1, 1]],
  [],
];

// Antler tones: the beam, its shade low and behind, and ivory tips where a tine ends.
function tineTones(rows) {
  return rows.map((line, r) =>
    [...line]
      .map((ch, c) => {
        if (ch !== "A") return ch;
        const above = r > 0 && rows[r - 1][c] === "A";
        const aboveSide = r > 0 && (rows[r - 1][c - 1] === "A" || rows[r - 1][c + 1] === "A");
        if (!above && !aboveSide) return "I";
        if (r >= rows.length - 2) return "a";
        return "A";
      })
      .join(""),
  );
}
// A rack turned a quarter to the right, for the head lowered to graze.
const turn = (rows) =>
  [...rows[0]].map((_, c) =>
    rows
      .map((line) => line[c])
      .reverse()
      .join(""),
  );

// ---- The members ------------------------------------------------------------------------------

const ELK_RACK = ["A........", "AA..A....", ".A..A..A.", ".AA.AA.A.", "..AA.AAA.", "...AA.AA.", "....AAA.."];

// The bull elk: a long pale body with a buff rump, dark legs, a dark chocolate neck with a shaggy
// mane hanging beneath, a long brown head, and the rack sweeping up and back with its tines forward.
const ELK = {
  id: "elk",
  len: 17,
  top: [
    [0, 12],
    [1, 13],
    [5, 13],
    [10, 13],
    [13, 14],
    [16, 14],
  ],
  bottom: [
    [0, 10],
    [1, 8],
    [3, 7],
    [12, 7],
    [16, 8],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [12, 15],
  bob: 1,
  hind: { root: [3, 9], a: 4, b: 4.6, bend: -1, foot: 3, w: [6, 2, 1], stand: [0, 1] },
  fore: { root: [14, 8], a: 3.8, b: 4.2, bend: 1, foot: 14, w: [2, 2, 1], stand: [1, -3], fore: true },
  farShift: 2,
  stride: 5,
  lift: 1.5,
  hoof: 2,
  grazeDip: 1,
  tail: {
    points: [
      [0, 12],
      [-1, 11],
      [-1, 10],
    ],
    w: 1,
    sway: 0.4,
    colour: () => "R",
  },
  // The buff rump patch, its edge a shade darker.
  coat: (x, dh, depth, key, pal) =>
    x <= 1 && key !== "U" ? (key === "S" ? pal.r : pal.R) : x === 2 && dh >= depth - 2 ? pal.r : null,
  neck: {
    base: [14, 11],
    w: [6, 3.6],
    mane: 1.6,
    level: [3, 5],
    low: [4, -7],
    high: [5, 4],
    lying: [3, 6],
    colour: (_along, across, mane) => (mane ? "m" : across > 0.55 ? "N" : across < -0.4 ? "m" : "n"),
  },
  heads: {
    level: { grid: [".ss.....", "sthhh...", "ttethhh.", "sttttttK", ".sssPP.."], anchor: [0, 3], crown: [3, 0] },
    low: { grid: [".s....", "stth..", "tteth.", ".tttth", "..ttth", "..ssPK"], anchor: [0, 2], crown: [3, 1] },
    high: {
      grid: ["....tK", "...thP", "..tth.", "ss.et.", "stts..", ".ss..."],
      open: ["....tK.", "...thMK", "..ttMP.", "ss.etP.", "stts...", ".ss...."],
      anchor: [0, 4],
      crown: [2, 3],
      mouth: [6, 1],
    },
  },
  racks: {
    level: { grid: tineTones(ELK_RACK), anchor: [5, 7] },
    low: { grid: tineTones(turn(ELK_RACK)), anchor: [-1, 4] },
    high: { grid: tineTones(["A.........", ".A..A..A..", "..AA.A.A.A", "....AAAAAA"]), anchor: [9, 4] },
  },
  lid: "t",
  haunch: [3, 2.5],
};

// The cow elk: the bull's build a little smaller, no rack, and a paler neck.
const ELK_COW = {
  ...ELK,
  id: "elkcow",
  len: 16,
  top: [
    [0, 11],
    [1, 12],
    [5, 12],
    [10, 12],
    [13, 13],
    [15, 13],
  ],
  bottom: [
    [0, 9],
    [1, 7],
    [3, 6],
    [12, 6],
    [15, 7],
  ],
  chest: [11, 14],
  hind: { ...ELK.hind, root: [3, 8], a: 3.6, b: 4.2, w: [5.2, 2, 1] },
  fore: { ...ELK.fore, root: [13, 7], foot: 13, a: 3.4, b: 3.8 },
  neck: { ...ELK.neck, base: [13, 10], w: [5, 3.2], mane: 0.8, level: [3, 5], low: [4, -6.5] },
  tail: {
    ...ELK.tail,
    points: [
      [0, 11],
      [-1, 10],
      [-1, 9],
    ],
  },
  racks: null,
  haunch: [2.6, 2.2],
};

const WT_RACK = ["..A.A..", "A.AAAA.", "AAA....", ".AA....", "..A...."];

// The white-tailed deer: slender, grey-brown in the fall, white throat, belly and the underside of a
// longish tail that it raises as a white flag to run; big ears, a white band behind the black nose,
// and the buck's antlers curving forward with their tines up.
const WHITETAIL = {
  id: "whitetail",
  len: 13,
  top: [
    [0, 9],
    [1, 10],
    [9, 10],
    [12, 11],
  ],
  bottom: [
    [0, 7],
    [1, 6],
    [2, 5],
    [10, 5],
    [12, 6],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [9, 11],
  bob: 1,
  hind: { root: [2, 7], a: 3.2, b: 3.6, bend: -1, foot: 2, w: [4.5, 1.6, 1], stand: [0, 1] },
  fore: { root: [11, 6], a: 2.8, b: 3.2, bend: 1, foot: 11, w: [2, 1, 1], stand: [1, -3], fore: true },
  farShift: 2,
  stride: 4,
  lift: 1.5,
  hoof: 1,
  grazeDip: 1,
  tail: {
    points: [
      [0, 9],
      [-1, 8],
      [-1, 6],
    ],
    flag: [
      [0, 9],
      [-1, 11],
      [-1, 13],
    ],
    w: 2,
    sway: 0.5,
    colour: (_t, k, flag) => (flag > 0.5 ? (k === 0 ? "W" : "w") : k === 1 ? "W" : "S"),
  },
  coat: (_x, _dh, _depth, key, pal) => (key === "U" ? pal.W : null),
  neck: {
    base: [11, 8],
    w: [4.5, 3],
    level: [2, 5],
    low: [3, -5],
    high: [4, 4],
    lying: [2, 5],
    colour: (along, across) => (along > 0.75 && across < -0.2 ? "W" : across > 0.4 ? "H" : across < -0.5 ? "S" : "T"),
  },
  heads: {
    level: { grid: ["S.....", "Ss....", "stth..", "ttetW.", "sttWtK", ".sW..."], anchor: [0, 4], crown: [2, 2] },
    low: { grid: ["Ss...", "stt..", "tet..", ".tth.", ".tWt.", "..tK."], anchor: [0, 3], crown: [2, 1] },
    high: { grid: ["....K", "...tW", "S.tt.", "Ssst.", "stte.", "stt..", ".s..."], anchor: [0, 5], crown: [2, 4] },
  },
  lid: "t",
  haunch: [2.4, 2],
};
const WT_BUCK = {
  ...WHITETAIL,
  id: "wtbuck",
  racks: {
    level: { grid: tineTones(WT_RACK), anchor: [1, 5] },
    low: { grid: tineTones(turn(WT_RACK)), anchor: [-1, 2] },
    high: { grid: tineTones(WT_RACK), anchor: [1, 5] },
  },
};

const RD_RACK = ["A...A....", "AA..A....", ".A..AA.A.", ".AA..AAA.", "..AAAAA..", "...AAA..."];
const RD_COW = ["A.A", "AAA", ".A."];

// The wild reindeer: stocky on shorter legs with big hooves, grey-brown with a pale neck, a pale
// ruff hanging under the throat, a pale rump and short tail, and antlers on both sexes: the bull's
// tall and swept back with a brow tine forward, the cow's small.
const REINDEER = {
  id: "reindeer",
  len: 15,
  top: [
    [0, 10],
    [1, 11],
    [10, 11],
    [12, 12],
    [14, 12],
  ],
  bottom: [
    [0, 8],
    [1, 6],
    [2, 5],
    [12, 5],
    [14, 6],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [10, 13],
  bob: 1,
  hind: { root: [2, 7], a: 3, b: 3.2, bend: -1, foot: 2, w: [5, 2, 1], stand: [0, 1] },
  fore: { root: [12, 6], a: 2.8, b: 3, bend: 1, foot: 12, w: [2, 2, 1], stand: [1, -3], fore: true },
  farShift: 2,
  stride: 4,
  lift: 1.5,
  hoof: 2,
  grazeDip: 1,
  tail: {
    points: [
      [0, 10],
      [-1, 10],
      [-1, 9],
    ],
    w: 1,
    sway: 0.4,
    colour: () => "W",
  },
  coat: (x, _dh, _depth, key, pal) => (x <= 1 && key !== "U" ? pal.W : key === "U" ? pal.r : null),
  neck: {
    base: [12, 9],
    w: [5.5, 3.4],
    mane: 1.4,
    level: [3, 4],
    low: [4, -5],
    high: [4, 4],
    lying: [3, 5],
    colour: (_along, across, mane) => (mane ? "W" : across > 0.5 ? "W" : across < -0.3 ? "w" : "P"),
  },
  heads: {
    level: { grid: [".s.....", "stth...", "tteth..", "stttttK", ".ssPP.."], anchor: [0, 3], crown: [2, 0] },
    low: { grid: [".s...", "stth.", "tteth", ".ttth", "..tth", "..sPK"], anchor: [0, 2], crown: [2, 1] },
    high: { grid: ["....K", "...th", "..tth", "s.et.", "stts.", ".ss.."], anchor: [0, 4], crown: [2, 3] },
  },
  lid: "t",
  haunch: [2.6, 2.2],
};
const RD_BULL = {
  ...REINDEER,
  id: "rdbull",
  racks: {
    level: { grid: tineTones(RD_RACK), anchor: [4, 6] },
    low: { grid: tineTones(turn(RD_RACK)), anchor: [-1, 4] },
    high: { grid: tineTones(RD_RACK), anchor: [4, 6] },
  },
};
const RD_COWDEER = {
  ...REINDEER,
  id: "rdcow",
  len: 14,
  top: [
    [0, 9],
    [1, 10],
    [9, 10],
    [11, 11],
    [13, 11],
  ],
  bottom: [
    [0, 7],
    [1, 6],
    [2, 5],
    [11, 5],
    [13, 6],
  ],
  chest: [9, 12],
  fore: { ...REINDEER.fore, root: [11, 6], foot: 11 },
  neck: { ...REINDEER.neck, base: [11, 8], w: [5, 3.2], mane: 1 },
  racks: {
    level: { grid: tineTones(RD_COW), anchor: [1, 3] },
    low: { grid: tineTones(turn(RD_COW)), anchor: [-1, 1] },
    high: { grid: tineTones(RD_COW), anchor: [1, 3] },
  },
};

// The pronghorn: slim and long-legged, tan above and white below with a sharp line between, a white
// rump, two white bands across a tan throat, a black cheek patch, and short black horns that rise
// over the eye, hook back at the tip and carry a prong forward.
const PRONGHORN = {
  id: "pronghorn",
  len: 13,
  top: [
    [0, 10],
    [1, 11],
    [9, 11],
    [12, 11],
  ],
  bottom: [
    [0, 8],
    [1, 7],
    [2, 6],
    [10, 6],
    [12, 7],
  ],
  lit: 1,
  litFrom: 2,
  under: 1,
  chest: [9, 11],
  bob: 1,
  hind: { root: [2, 8], a: 3.6, b: 4, bend: -1, foot: 2, w: [4, 1.6, 1], stand: [0, 1] },
  fore: { root: [11, 7], a: 3.2, b: 3.6, bend: 1, foot: 11, w: [2, 1, 1], stand: [1, -3], fore: true },
  farShift: 2,
  stride: 4,
  lift: 1.5,
  hoof: 1,
  grazeDip: 1,
  tail: {
    points: [
      [0, 10],
      [-1, 10],
      [-1, 9],
    ],
    w: 1,
    sway: 0.3,
    colour: () => "W",
  },
  coat: (x, dh, depth, key, pal) => {
    if (x <= 1) return key === "U" || key === "S" ? pal.w : pal.W;
    if (dh <= depth * 0.45) return dh === 0 ? pal.w : pal.W;
    return null;
  },
  legCoat: (_x, h, far, pal) => (h >= 3 && !far ? pal.T : null),
  neck: {
    base: [11, 9],
    w: [4, 2.8],
    level: [2, 4],
    low: [3, -5],
    high: [3, 4],
    lying: [2, 4],
    colour: (along, across) =>
      across < -0.1 && ((along > 0.2 && along < 0.4) || along > 0.75) ? "W" : across > 0.4 ? "H" : "T",
  },
  heads: {
    // The crowns sit on the skull, so the horns grow from the head (not the ear tip above it).
    level: { grid: [".s....", "stt...", "tDet..", "sDtttK", ".sWW.."], anchor: [0, 3], crown: [3, 2] },
    low: { grid: [".s...", "stt..", "Det..", ".Dtt.", "..tW.", "..tK."], anchor: [0, 2], crown: [2, 2] },
    high: { grid: ["....K", "...tW", "..tt.", "s.et.", "stD..", ".s..."], anchor: [0, 4], crown: [2, 3] },
  },
  racks: {
    level: { grid: ["K.", "KK", ".K", "KK", ".K"], anchor: [1, 5] },
    low: { grid: ["K.K.K", "KKKK."], anchor: [-1, 1] },
    high: { grid: ["K.", "KK", ".K", "KK", ".K"], anchor: [1, 5] },
  },
  lid: "t",
  haunch: [2.4, 2],
};

export const DEER_SPECS = { ELK, ELK_COW, WHITETAIL, WT_BUCK, RD_BULL, RD_COWDEER, PRONGHORN };

// ---- Tones ------------------------------------------------------------------------------------

// Each member's tones from its scene palette, lit from above: H highlight, T base, S shade, U under,
// L and l the near and far legs; the neck's N crest, n base and m mane; the head's h, t and s;
// R and r the rump; W and w white and its shade; P pale; A, a and I the antler, its shade and ivory
// tips; K hooves and nose; e the eye; B the breath; M the open mouth (elk).
export function elkTones([coat, dark, pale, antler, deep = dark, shade = dark], cow = false) {
  const head = mix(coat, dark, cow ? 0.25 : 0.4);
  const neck = cow ? mix(coat, dark, 0.55) : dark;
  return {
    H: mix(coat, pale, 0.3),
    T: coat,
    S: shade,
    U: mix(shade, deep, 0.5),
    L: mix(dark, coat, 0.15),
    l: deep,
    N: mix(neck, coat, 0.3),
    n: neck,
    m: mix(neck, deep, 0.6),
    h: mix(head, pale, 0.2),
    t: head,
    s: mix(head, deep, 0.4),
    R: pale,
    r: mix(pale, coat, 0.4),
    P: pale,
    W: pale,
    w: mix(pale, coat, 0.3),
    A: antler,
    a: mix(antler, dark, 0.35),
    I: mix(antler, pale, 0.6),
    K: mix(deep, "#000000", 0.3),
    e: mix(deep, "#000000", 0.3),
    B: mix(pale, "#ffffff", 0.35),
    D: deep,
    M: mix(deep, "#7a2a24", 0.6),
  };
}

export function whitetailTones([coat, dark, pale, antler]) {
  return {
    H: mix(coat, pale, 0.25),
    T: coat,
    S: mix(coat, dark, 0.3),
    U: mix(coat, dark, 0.5),
    L: mix(coat, dark, 0.1),
    l: mix(coat, dark, 0.5),
    h: mix(coat, pale, 0.2),
    t: mix(coat, dark, 0.12),
    s: mix(coat, dark, 0.45),
    W: pale,
    w: mix(pale, coat, 0.3),
    P: pale,
    A: antler,
    a: mix(antler, dark, 0.35),
    I: mix(antler, pale, 0.6),
    K: mix(dark, "#000000", 0.45),
    e: mix(dark, "#000000", 0.45),
    S2: dark,
  };
}

export function reindeerTones([coat, dark, pale, antler]) {
  return {
    H: mix(coat, pale, 0.25),
    T: coat,
    S: mix(coat, dark, 0.35),
    U: mix(coat, dark, 0.6),
    L: mix(coat, dark, 0.3),
    l: mix(coat, dark, 0.65),
    h: mix(coat, dark, 0.05),
    t: mix(coat, dark, 0.2),
    s: mix(coat, dark, 0.5),
    W: pale,
    w: mix(pale, coat, 0.35),
    P: mix(pale, coat, 0.15),
    r: mix(coat, dark, 0.55),
    A: antler,
    a: mix(antler, dark, 0.35),
    I: mix(antler, pale, 0.6),
    K: mix(dark, "#000000", 0.35),
    e: mix(dark, "#000000", 0.35),
  };
}

export function pronghornTones([coat, dark, pale, horn, deep = dark]) {
  return {
    H: mix(coat, pale, 0.25),
    T: coat,
    S: mix(coat, dark, 0.3),
    U: mix(coat, dark, 0.5),
    L: coat,
    l: mix(coat, dark, 0.5),
    h: mix(coat, pale, 0.2),
    t: coat,
    s: mix(coat, dark, 0.4),
    W: pale,
    w: mix(pale, dark, 0.22),
    D: horn,
    K: mix(horn, "#000000", 0.2),
    e: mix(deep, "#000000", 0.3),
  };
}

// ---- The bugle --------------------------------------------------------------------------------

const BUGLE = 3; // seconds a bugle lasts

// The bugle, s seconds in: the neck stretches out and the head tips up, nose high, over half a
// second; the mouth opens and the breath leaves it in plumes (eight frames at four a second, from
// the moment the mouth opens); the chest heaves; then the head comes down.
export function bugleAt(s) {
  if (s < 0 || s >= BUGLE) return null;
  const up = smooth(clamp(s / 0.5, 0, 1)) * smooth(clamp((BUGLE - s) / 0.5, 0, 1));
  const open = s >= 0.45 && s < BUGLE - 0.4;
  return {
    head: up,
    mouth: open,
    puff: s >= 0.45 ? Math.floor((s - 0.45) * 4) % 8 : null,
    breath: open && Math.floor(s * 4) % 2 === 0 ? 1 : 0,
  };
}

// The bound's rise: the body is in the air after the fore hooves leave the ground and before the
// hind ones land, highest in the long leap.
export function boundRise(phase) {
  const p = frac(phase);
  const leap = p >= 0.84 ? Math.sin((Math.PI * (p - 0.84)) / 0.16) : 0;
  const gather = p >= 0.34 && p < 0.5 ? Math.sin((Math.PI * (p - 0.34)) / 0.16) * 0.5 : 0;
  return 2 * leap + gather;
}
