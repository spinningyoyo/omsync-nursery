// Hares and rodents built from parts: the cottontail, the jackrabbit and the groundhog. The body is
// three round parts (a rump, a middle and a chest), each an oval placed by its hip or shoulder, so a
// pose can tip it up on end (a hare sitting up, a groundhog standing). Legs are drawn from the foot up
// to wherever the body is, row by row so they always join it; a hare has a long hind foot (heel to
// toe), the groundhog short legs that step through four drawn poses. Ears are their own parts rooted
// on the head: they tilt back and turn (the inner ear shows). Four tones lit from above, the far legs
// in their own tone. Coordinates are the animal's own: x runs from the rump toward the nose and h is
// the height above the ground; `plot(x, h, colour)` paints a pixel, so the caller places and mirrors
// it. A pose is a set of numbers (hip, shoulder, head, feet, tail, ears) and any two blend, so every
// move between poses eases. animals.js's hareAt places and poses it; beastFrame says which pose and
// where, from a walker's state.
import { bump, ease } from "./build.js";
import { clamp, frac, lerp, mix } from "./pixel.js";

// ---- Raster helpers -----------------------------------------------------------------------------

// The pixels from a to b with each one sharing an edge with the next, never only a corner.
function line4(a, b) {
  let x = Math.round(a[0]);
  let y = Math.round(a[1]);
  const x1 = Math.round(b[0]);
  const y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x);
  const dy = Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  const out = [[x, y]];
  let ix = 0;
  let iy = 0;
  while (ix < dx || iy < dy) {
    if (iy >= dy || (ix < dx && (0.5 + ix) / dx < (0.5 + iy) / dy)) {
      x += sx;
      ix += 1;
    } else {
      y += sy;
      iy += 1;
    }
    out.push([x, y]);
  }
  return out;
}

// Any two poses of the same shape blended: numbers ease, words switch at the middle.
function blend(A, B, u) {
  const v = ease(u);
  const go = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return lerp(a, b, v);
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((x, i) => go(x, b[i]));
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
      const out = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
        out[k] = k in a && k in b ? go(a[k], b[k]) : v < 0.5 ? a[k] : b[k];
      return out;
    }
    return v < 0.5 ? a : b;
  };
  return go(A, B);
}

// Plays a list of key poses [[time, pose], ...], easing between each and the next.
function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i += 1) {
    const [t0, a] = keys[i - 1];
    const [t1, b] = keys[i];
    if (t < t1) return a === b ? a : blend(a, b, (t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}

// Moves a pose along the ground by dx (and up by dh): every point in it, the head too, so the
// head stays on the neck when a hop is re-centred.
function shift(P, dx, dh = 0) {
  const pt = (p) => (p.length >= 4 ? [p[0] + dx, p[1] + dh, p[2] + dx, p[3] + dh] : [p[0] + dx, p[1] + dh]);
  return {
    ...P,
    hip: pt(P.hip),
    sh: pt(P.sh),
    head: pt(P.head),
    feet: Object.fromEntries(Object.entries(P.feet).map(([k, f]) => [k, pt(f)])),
  };
}

// ---- The animal ---------------------------------------------------------------------------------

// One animal in pose P (see the poses below for its fields), with the moment's extras: gait {phase,
// amp} for a walker on short drawn legs, sway (tail), blink, breath, twitch (nose), earTurn [near,
// far] (0 shows the ear's back, 1 its inside), head [dx, dh] (a nod or a push), and face (a name).
export function drawBeast(spec, pal, plot, P, x = {}) {
  const { gait = null, sway = 0, blink = false, breath = 0, twitch = false } = x;
  const walking = gait && gait.amp > 0.5;
  const dropFore = walking && Math.floor(frac(gait.phase + 0.25) * 4) === 1 ? 1 : 0;
  const mid = (P.hip[0] + P.sh[0]) / 2;
  const dip = (cx) => (dropFore && cx > mid ? 1 : 0);

  // The body: rump on the hip, chest on the shoulder, and a middle between them.
  const body = new Map();
  const oval = (cx, ch, rx, ry, extra = 0) => {
    for (let px = Math.floor(cx - rx - 1); px <= Math.ceil(cx + rx + 1); px += 1) {
      for (let h = Math.floor(ch - ry - 1); h <= Math.ceil(ch + ry + 1 + extra); h += 1) {
        const nx = (px - cx) / rx;
        const ny = (h - ch) / (h > ch ? ry + extra : ry);
        if (nx * nx + ny * ny > 1.2) continue;
        const hh = h - dip(px);
        if (hh >= 0) body.set(`${px}|${hh}`, [px, hh]);
      }
    }
  };
  const [hx, hh] = P.hip;
  const [sx, sh] = P.sh;
  oval(hx, hh, P.rump[0], P.rump[1]);
  if (P.middle) oval(lerp(hx, sx, 0.5), lerp(hh, sh, 0.5) + (P.middle[2] ?? 0), P.middle[0], P.middle[1]);
  oval(sx, sh, P.chest[0], P.chest[1], breath ? 0.6 : 0);

  const cols = new Map();
  for (const [px, h] of body.values()) {
    const c = cols.get(px) ?? { t: -1, b: 99 };
    c.t = Math.max(c.t, h);
    c.b = Math.min(c.b, h);
    cols.set(px, c);
  }
  const bottomAt = (px) => {
    for (let d = 0; d < 6; d += 1) {
      for (const q of [px + d, px - d]) {
        const c = cols.get(Math.round(q));
        if (c) return c.b;
      }
    }
    return 0;
  };

  // A leg from its foot up to the body, filled row by row, each row reaching the one above. A foot
  // given as [toe, heel] is a long foot laid from heel to toe first. A forepaw raised above the
  // belly (sitting up, washing, holding food) hangs on an arm reaching from the chest at the paw's
  // height; only poses that ask for it (arms: true) draw one.
  const legCells = (L, foot, rootX, fold, arm = false) => {
    const cells = [];
    let prev = null;
    const span = (h, a, b) => {
      if (prev) {
        if (a > prev.b) a = prev.b;
        if (b < prev.a) b = prev.a;
      }
      for (let q = a; q <= b; q += 1) cells.push([q, h]);
      prev = { a, b };
    };
    let start;
    if (foot.length >= 4) {
      for (const p of line4([foot[2], foot[3]], [foot[0], foot[1]])) cells.push(p);
      start = [Math.round(foot[2]), Math.round(foot[3])];
    } else {
      start = [Math.round(foot[0]), Math.round(foot[1])];
      const a = start[0] - (L.w[1] >> 1);
      for (let k = 0; k < (L.paw ?? 0); k += 1) cells.push([a + L.w[1] + k, start[1]]);
      if (fold) cells.push([fold > 0 ? a + L.w[1] : a - 1, start[1]]);
    }
    const top = bottomAt(rootX) - 1;
    for (let h = start[1]; h <= top; h += 1) {
      const u = top === start[1] ? 1 : (h - start[1]) / (top - start[1]);
      const w = h === top ? L.w[0] : L.w[1];
      const a = Math.round(lerp(start[0], rootX, u) - (w - 1) / 2);
      span(h, a, a + w - 1);
    }
    if (arm && top < start[1]) for (const p of line4([rootX, start[1]], start)) cells.push(p);
    if (!cells.length) cells.push(start);
    return cells.filter(([, h]) => h >= 0);
  };

  // Where each foot is: the pose's, or, walking on short legs, one of four drawn poses a quarter
  // stride apart: reaching forward, under the body, pushed back, and lifted with the paw folded.
  const footOf = (k, L) => {
    const f = P.feet[k].slice();
    if (!walking) return [f, 0];
    const off = { hn: 0, fn: 0.25, hf: 0.5, ff: 0.75 }[k];
    const step = Math.floor(frac(gait.phase + off) * 4);
    if (step === 0) f[0] += spec.reach;
    else if (step === 2) f[0] -= spec.reach;
    else if (step === 3) return [[f[0], 1], L.fore ? 1 : -1];
    return [f, 0];
  };
  const legKey = (far) => (far ? "F" : (spec.legKey ?? "T"));
  const paintLeg = (k, far) => {
    const L = k[0] === "h" ? spec.hind : spec.fore;
    const [foot, fold] = footOf(k, L);
    const rootX =
      (k[0] === "h" ? P.hip[0] + (P.hindRoot ?? spec.hind.root ?? 0) : P.sh[0] + (P.foreRoot ?? spec.fore.root ?? 0)) +
      (far ? spec.farShift : 0);
    const cells = legCells(L, foot, rootX, fold, Boolean(P.arms && L.fore));
    cells.forEach(([px, h]) => {
      const key = spec.footKey && h === Math.min(...cells.map((c) => c[1])) ? (far ? "d" : spec.footKey) : legKey(far);
      plot(px, h, pal[key] ?? pal[legKey(far)]);
    });
  };

  // Ears grow from the head: a line up from the root, tilted back by `tilt` degrees.
  const head = [P.head[0] + (x.head?.[0] ?? 0), P.head[1] + (x.head?.[1] ?? 0) - (dropFore ? 1 : 0)];
  const ear = (E, i) => {
    const tilt = ((P.ears?.[i] ?? 0) * Math.PI) / 180;
    const turn = x.earTurn?.[i] ?? 0;
    const root = [head[0] + E.at[0], head[1] + E.at[1]];
    const tip = [root[0] - Math.sin(tilt) * (E.len - 1), root[1] + Math.cos(tilt) * (E.len - 1)];
    const pts = line4(root, tip);
    pts.forEach(([px, h], j) => {
      let key = E.far ? "F" : turn > 0.5 && j > 0 ? "i" : "T";
      if (E.tip && j >= pts.length - E.tip) key = E.far ? "d" : "D";
      if (h >= 0) plot(px, h, pal[key]);
    });
  };

  // The tail: a curve from the rump.
  const tail = () => {
    const [t0, t1, t2] = P.tail.map((p) => [p[0] + hx, p[1] + hh]);
    const tip = [t2[0] + sway * spec.tail.sway, t2[1]];
    let last = null;
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24;
      const p = [
        (1 - t) ** 2 * t0[0] + 2 * t * (1 - t) * t1[0] + t * t * tip[0],
        (1 - t) ** 2 * t0[1] + 2 * t * (1 - t) * t1[1] + t * t * tip[1],
      ];
      const pts = last ? line4(last, p) : [p.map(Math.round)];
      for (const [px, h] of pts) {
        const key = spec.tail.colour?.(t) ?? "T";
        for (let k = 0; k < spec.tail.w; k += 1) if (h + k >= 0) plot(px, h + k, pal[key]);
      }
      last = p;
    }
  };

  // ---- Paint, back to front.
  paintLeg("hf", true);
  paintLeg("ff", true);
  spec.ears?.forEach((E, i) => {
    if (E.far) ear(E, i);
  });
  if (!spec.tail.front) tail();

  for (const [px, h] of body.values()) {
    const { t, b } = cols.get(px);
    let key = "T";
    if (h > t - spec.lit) key = "H";
    else if (h <= b + spec.under - 1) key = "U";
    else if (h < b + (t - b) * 0.45) key = "S";
    plot(px, h, pal[key]);
  }
  // The haunch: a round thigh over the hind leg, lit on top, shaded behind and below.
  if (P.haunch && spec.haunch) {
    const [rx, ry] = spec.haunch;
    const cx = hx + (P.haunch[0] ?? 0);
    const ch = Math.max(ry - 0.5, hh + (P.haunch[1] ?? -1));
    for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px += 1) {
      for (let h = Math.max(0, Math.floor(ch - ry)); h <= Math.ceil(ch + ry); h += 1) {
        const nx = (px - cx) / rx;
        const ny = (h - ch) / ry;
        if (nx * nx + ny * ny > 1 || !body.has(`${px}|${h}`)) continue;
        const key = ny > 0.5 ? "H" : nx < -0.4 || ny < -0.5 ? "S" : "T";
        plot(px, h, pal[key]);
      }
    }
  }
  paintLeg("hn", false);
  paintLeg("fn", false);

  const face = spec.faces[x.face ?? P.face ?? "side"];
  face.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      let key = ch;
      if (ch === "e") key = blink ? (spec.lid ?? "T") : "D";
      if (ch === "n") key = twitch ? "P" : (spec.noseKey ?? "n");
      const h = Math.round(head[1]) - r;
      if (h >= 0) plot(Math.round(head[0]) + c, h, pal[key] ?? pal.T);
    });
  });
  spec.ears?.forEach((E, i) => {
    if (!E.far) ear(E, i);
  });
  if (spec.tail.front) tail();
}

// A family's tones from a scene's [fur, dark, pale] (or [body, dark, grizzle]): T the coat, a
// highlight toward the pale, the shade and underside toward the dark, the far legs between them, D
// dark (eye, nose), d for a far dark foot, P pale and i an inner ear.
export function beastTones([fur, dark, pale], own = {}) {
  return {
    T: fur,
    S: mix(fur, dark, 0.35),
    P: pale,
    D: dark,
    H: mix(fur, pale, 0.3),
    U: mix(fur, dark, 0.62),
    F: mix(fur, dark, 0.5),
    d: mix(dark, "#000000", 0.25),
    i: mix(mix(pale, "#e0a090", 0.35), fur, 0.25),
    W: pale,
    ...own,
  };
}

// ---- The hares ----------------------------------------------------------------------------------

// A hare's poses, written for the cottontail and scaled for the jackrabbit. Fields: hip and sh
// (where the rump and chest ovals sit), rump/chest/middle their radii, head (the face's top left),
// feet (hn, hf near and far hind, toe then heel; fn, ff the forefeet), tail (three points from the
// hip), ears (tilt back in degrees, near then far), haunch (the thigh's offset from the hip, or
// null), and face.
const C0 = {
  hip: [2.5, 3],
  sh: [5.4, 2.8],
  rump: [2.5, 2.2],
  chest: [1.5, 1.6],
  middle: [2, 2.2, 0.4],
  head: [5, 5],
  feet: { hn: [3, 0, 1, 0], hf: [4, 0, 2, 0], fn: [6, 0], ff: [7, 0] },
  tail: [
    [-2.2, 0.2],
    [-3, 0.3],
    [-3, -0.5],
  ],
  ears: [8, 2],
  haunch: [-0.2, -0.9],
  face: "side",
};

// The hop, from reference: gathered in a crouch, it pushes off both hind feet (heels lifting, toes
// still down) with its nose rising; stretches out through the air, forelegs reaching, hind legs
// trailing and the white scut flicking up; lands on its forefeet with its rump high; and swings
// both hind feet forward together to land ahead of where they left, gathered again.
const HOP_P = {
  ...C0,
  hip: [3.2, 3.3],
  sh: [6.3, 3.7],
  chest: [1.6, 1.4],
  head: [6.4, 6.3],
  feet: { hn: [3, 0, 1.8, 1.5], hf: [4, 0, 2.8, 1.5], fn: [7.6, 1.6], ff: [8.4, 1.8] },
  tail: [
    [-2.2, 0.6],
    [-2.6, 1.6],
    [-2.4, 2.2],
  ],
  ears: [28, 22],
};
const HOP_A = {
  ...C0,
  hip: [4.5, 3.8],
  sh: [7.5, 3.7],
  chest: [1.6, 1.4],
  head: [7.6, 5.8],
  feet: { hn: [1.8, 1.8, 3.1, 2.3], hf: [2.8, 1.8, 4.1, 2.3], fn: [9.6, 0.8], ff: [10.2, 1] },
  tail: [
    [-2.2, 0.6],
    [-2.6, 1.6],
    [-2.4, 2.2],
  ],
  ears: [34, 30],
};
const HOP_L = {
  ...C0,
  hip: [5.6, 3.9],
  sh: [8.2, 2.6],
  chest: [1.6, 1.5],
  head: [8.3, 4.6],
  feet: { hn: [6.6, 1.4, 4.8, 1.6], hf: [7.6, 1.4, 5.8, 1.6], fn: [10, 0], ff: [11, 0] },
  tail: [
    [-2.2, 0.4],
    [-2.8, 0.9],
    [-2.8, 0.2],
  ],
  ears: [16, 10],
};
const HOP_STRIDE = 4;
const C1 = shift(C0, HOP_STRIDE);

// One hop over u from 0 to 1: a gathered pause, then the push, flight, landing and gathering.
const HOP_KEYS = [
  [0, C0],
  [0.3, C0],
  [0.46, HOP_P],
  [0.6, HOP_A],
  [0.75, HOP_L],
  [0.95, C1],
  [1, C1],
];
function hopAt(u) {
  return keyed(HOP_KEYS, u);
}

// A pose scaled to a bigger member: positions and radii by k (heights by kh), legs raised by `leg`.
function scalePose(P, k, kh = k, leg = 0) {
  const pt = (p, up = leg) =>
    p.length >= 4
      ? [p[0] * k, p[1] * kh + (p[1] > 0 ? up : 0), p[2] * k, p[3] * kh + (p[3] > 0 ? up : 0)]
      : [p[0] * k, p[1] * kh + (p[1] > 0 ? up : 0)];
  return {
    ...P,
    hip: [P.hip[0] * k, P.hip[1] * kh + leg],
    sh: [P.sh[0] * k, P.sh[1] * kh + leg],
    rump: [P.rump[0] * k, P.rump[1] * kh],
    chest: [P.chest[0] * k, P.chest[1] * kh],
    middle: P.middle && [P.middle[0] * k, P.middle[1] * kh, P.middle[2]],
    head: [P.head[0] * k, P.head[1] * kh + leg],
    feet: Object.fromEntries(Object.entries(P.feet).map(([key, f]) => [key, pt(f)])),
    tail: P.tail.map(([a, b]) => [a * k, b * kh]),
    haunch: P.haunch && [P.haunch[0] * k, P.haunch[1] * kh],
  };
}

const COTTONTAIL = {
  id: "cottontail",
  lit: 1,
  under: 1,
  farShift: 1,
  reach: 1,
  hind: { w: [1, 1] },
  fore: { w: [1, 1], fore: true },
  haunch: null,
  // A brown head with a big dark eye, a dark nose that twitches, and a pale chin under it.
  faces: {
    side: ["HHHH", "TeTn", "TTTP", ".SS."],
    down: ["HHH.", "TeTT", "TTTn"],
  },
  lid: "T",
  noseKey: "D",
  ears: [
    { at: [1, 1], len: 2, far: true },
    { at: [2, 1], len: 2 },
  ],
  // The scut: white, a short curve off the rump.
  tail: { w: 1, sway: 0, colour: () => "W", front: true },
  poses: (P) => P,
};

// The jackrabbit: the same hare, longer in body and leg, with tall black-tipped ears.
const JACKRABBIT = {
  ...COTTONTAIL,
  id: "jackrabbit",
  faces: {
    side: ["HHHH.", "TTeTn", "TTTTP", ".SSS."],
    down: ["HHHH", "TTeT", "TTTn"],
  },
  ears: [
    { at: [1, 1], len: 4, far: true, tip: 1 },
    { at: [2, 1], len: 4, tip: 1 },
  ],
  tail: { w: 1, sway: 0, colour: (t) => (t < 0.3 ? "D" : "W"), front: true },
  poses: (P) => scalePose(P, 1.15, 1.2, 1),
};

// ---- The groundhog ------------------------------------------------------------------------------

// Low and long, its back arched, on short dark legs; a small flat head with a dark ear, a grizzled
// back (its highlight), and a bushy dark tail.
const GROUNDHOG = {
  id: "groundhog",
  lit: 1,
  under: 1,
  farShift: 1,
  reach: 1,
  legKey: "D",
  hind: { w: [2, 1], root: 0.5 },
  fore: { w: [1, 1], root: 0.4, fore: true },
  haunch: [1.8, 1.5],
  faces: {
    side: ["DHH.", "TTeT", "TPPn"],
    up: ["DHH.", "TTeH", "TTTn", ".PP."],
    front: ["D..D", "HHHH", "eTTe", "TPPT", ".nn."],
  },
  lid: "T",
  tail: { w: 2, sway: 1, colour: () => "D" },
};

const GROUND_STAND = {
  hip: [2.5, 3],
  sh: [6, 2.8],
  rump: [2.5, 1.9],
  chest: [1.6, 1.5],
  middle: [1.8, 1.9, 0.4],
  head: [6.4, 5],
  feet: { hn: [2.2, 0], hf: [3.2, 0], fn: [6.2, 0], ff: [7.2, 0] },
  tail: [
    [-2.4, 0.2],
    [-3.2, -0.4],
    [-3.4, -1.4],
  ],
  haunch: null,
  face: "side",
};

// ---- The rest poses ------------------------------------------------------------------------------

// Gathered: the scenes' "sit", where every stop starts.
const CROUCH = hopAt(0);

// Sitting up tall: the rump stays down on the long hind feet, the body rises on end, the forepaws
// hang tucked at the chest, the head is high and the ears stand up and turn.
const TALL = {
  ...CROUCH,
  hip: [2.2, 2.4],
  rump: [2.3, 2.0],
  sh: [3.8, 4.4],
  chest: [1.4, 1.8],
  middle: [1.5, 1.8, 0],
  head: [3.4, 7],
  feet: { hn: [3.5, 0, 1.2, 0], hf: [4.5, 0, 2.2, 0], fn: [5, 3], ff: [4.6, 3.2] },
  tail: [
    [-2.3, -1.4],
    [-3, -1.6],
    [-3, -2.1],
  ],
  ears: [0, 0],
  arms: true,
};

// The jackrabbit's look-out, as in the reference photo: up on long straight forelegs, chest high,
// head up and the tall ears turning; the rump stays down on the hind feet.
const ALERT = {
  ...CROUCH,
  hip: [2.4, 2.7],
  sh: [5.2, 4.2],
  chest: [1.4, 1.6],
  middle: [1.8, 1.9, 0.2],
  head: [5.1, 5.9],
  feet: { hn: [3.2, 0, 1.1, 0], hf: [4.2, 0, 2.1, 0], fn: [5.8, 0], ff: [6.6, 0] },
  tail: [
    [-2.3, -0.4],
    [-3, -0.6],
    [-3, -1.2],
  ],
  ears: [0, 0],
};

// Grazing: the chest and head down to the grass, the ears laid a little back; it nibbles.
const GRAZE = { ...CROUCH, sh: [5.6, 2.3], head: [5.6, 2.4], face: "down", ears: [40, 34] };

// Washing the face: half up, the head bowed, the forepaws raised to the muzzle on short arms.
const GROOM = {
  ...TALL,
  sh: [4, 4],
  head: [4.2, 6],
  face: "down",
  feet: { ...TALL.feet, fn: [8, 3.6], ff: [7.8, 4] },
  ears: [30, 24],
};
const GROOM_UP = { ...GROOM, head: [4.2, 6.6], feet: { ...GROOM.feet, fn: [8, 4.6], ff: [7.8, 5] } };

// Loafing: the belly down, paws tucked (their tips show in front), ears laid back.
const LOAF = {
  ...CROUCH,
  hip: [2.5, 2.2],
  sh: [5.4, 1.9],
  middle: [2, 2.1, 0.3],
  head: [5.2, 4],
  feet: { hn: [3, 0, 1, 0], hf: [4, 0, 2, 0], fn: [6.8, 0], ff: [7.3, 0] },
  ears: [55, 50],
};

// Lying stretched out: long and low, the hind feet out behind, the forepaws forward, the chin down
// and the ears flat along the back.
const LIE = {
  ...CROUCH,
  hip: [2, 1.6],
  rump: [2.4, 1.6],
  sh: [5.8, 1.6],
  chest: [1.6, 1.5],
  middle: [2.2, 1.6, 0],
  head: [6.2, 3],
  feet: { hn: [-1.6, 0, 0.6, 0], hf: [-0.6, 0, 1.6, 0], fn: [8.6, 0], ff: [9, 0] },
  tail: [
    [-2.2, 0],
    [-3, 0],
    [-3, -0.6],
  ],
  ears: [80, 76],
};

// Freezing (the desert's hawk): pressed flat, ears flat back, nothing moves until the hawk is gone.
const FREEZE = { ...CROUCH, hip: [2.5, 2.5], sh: [5.4, 2.2], head: [5.1, 4.2], ears: [82, 80] };

// Standing up on its hind legs to look about: tall and straight, forepaws held at the chest, the
// tail along the ground behind; its head turns to face us and back.
const UP = {
  ...GROUND_STAND,
  hip: [2.6, 2.5],
  rump: [2.2, 2.3],
  sh: [2.9, 5.8],
  chest: [1.8, 2.3],
  middle: [2, 2.4, 0],
  head: [2.2, 10],
  feet: { hn: [3.8, 0], hf: [2.8, 0], fn: [4.8, 5.4], ff: [4.6, 5.8] },
  tail: [
    [-2.2, -1.4],
    [-3.2, -2],
    [-4, -2.2],
  ],
  face: "up",
  arms: true,
};

// Sitting on its haunches to eat, forepaws at its mouth, chewing.
const HUNCH = {
  ...UP,
  sh: [3.9, 4.6],
  chest: [1.8, 2],
  middle: [1.9, 2.2, 0],
  head: [4.2, 7.4],
  feet: { hn: [3.6, 0], hf: [2.6, 0], fn: [6.8, 4.6], ff: [6.6, 5] },
  face: "side",
};

// Lying flat on its belly in the sun, the dark feet splayed at its sides, the chin down.
const SPRAWL = {
  ...GROUND_STAND,
  hip: [2.5, 1.9],
  rump: [2.5, 1.9],
  sh: [6, 1.7],
  chest: [1.6, 1.6],
  middle: [1.8, 1.7, 0],
  head: [6.2, 3],
  feet: { hn: [2.4, 0], hf: [3.4, 0], fn: [7.6, 0], ff: [7.9, 0] },
  tail: [
    [-2.4, -0.4],
    [-3, -0.9],
    [-3.4, -1.2],
  ],
};

// What each member is: its spec, the body's middle (so x is where the animal is), the shadow's
// columns, and the poses a stop can pick from, the first being the default ("sit").
export const BEASTS = {
  cottontail: {
    spec: COTTONTAIL,
    mid: 3,
    shadow: [0, 8],
    tall: TALL,
    poses: ["sit", "tall", "graze", "groom", "loaf", "lie"],
  },
  jackrabbit: {
    spec: JACKRABBIT,
    mid: 3.5,
    shadow: [0, 11],
    tall: ALERT,
    poses: ["sit", "tall", "graze", "groom", "loaf", "lie"],
  },
  groundhog: { spec: GROUNDHOG, mid: 3.5, shadow: [-3, 11], poses: ["up", "hunch", "sprawl"] },
};
export const harePoses = (kind) => BEASTS[kind ?? "cottontail"].poses;

// ---- Where it is and which pose, from a walker's state ----------------------------------------------

const EASE = 0.25; // seconds a hop or a walk takes to start or stop
const GATHER = 0.9; // seconds a stop stays gathered before it takes its pose
const SETTLE = 0.5; // seconds it takes to move into a pose, or out of it before it hops on
const FREEZE_SECONDS = 3; // how long the hawk's stoop holds a hare still (desert.js)
const HOP_NEED = { sit: 0, tall: 3.4, graze: 3.4, groom: 3.8, loaf: 3.4, lie: 4.6 };
const GROUND_NEED = { up: 0, hunch: 5, sprawl: 6 };
const GROUND_STRIDE = 4; // pixels a groundhog's four-beat step carries it

// A hare in a pose of the stop it is in: its ears, nose and breath move on their own.
function hareStop(name, tall, since, left, time, seed) {
  const pose = { sit: CROUCH, tall, graze: GRAZE, groom: GROOM, loaf: LOAF, lie: LIE };
  const w = clamp((since - GATHER) / SETTLE, 0, 1) * clamp(left / SETTLE, 0, 1);
  let P = CROUCH;
  if (w > 0) {
    if (name === "lie") P = w < 0.5 ? blend(CROUCH, LOAF, w * 2) : blend(LOAF, LIE, w * 2 - 1);
    else P = blend(CROUCH, pose[name], w);
  }
  const x = {
    breath: Math.sin(time * 3) > 0.2 ? 1 : 0,
    twitch: Math.floor(time * 6) % 3 === 0,
    blink: frac((time + seed) / 3.3) < 0.04,
    earTurn: [0, 0],
  };
  const held = w >= 1 ? since - GATHER - SETTLE : -1;
  if (name === "sit") x.earTurn = [since > 0.6 && since < 2.2 ? 1 : 0, 0];
  if (held >= 0 && name === "tall") {
    // The ears turn in turn, each to catch a sound: the near one swings round (its inside shows)
    // and tips back, then the far one, then both forward.
    const near = bump(held, 0.4, 1.6);
    const far = bump(held, 1.2, 2.4);
    x.earTurn = [near > 0.5 ? 1 : 0, far > 0.5 ? 1 : 0];
    P = { ...P, ears: [near * 22, far * 18] };
  }
  if (held >= 0 && name === "graze") x.head = [0, Math.floor(held * 5) % 2 ? -1 : 0];
  if (name === "groom" && w >= 1) P = blend(GROOM, GROOM_UP, (Math.sin(held * 7) + 1) / 2);
  if (name === "lie" || name === "loaf") x.twitch = false;
  return { P, x };
}

// A groundhog in a pose of its stop: standing on all fours, then rising to look about, sitting to
// eat, or sprawling in the sun, and back to all fours before it walks on.
function groundStop(name, since, left, time, seed) {
  const target = { up: UP, hunch: HUNCH, sprawl: SPRAWL }[name];
  const w = clamp((since - 0.6) / SETTLE, 0, 1) * clamp(left / SETTLE, 0, 1);
  const P = w > 0 ? blend(GROUND_STAND, target, w) : GROUND_STAND;
  const x = {
    breath: Math.sin(time * 2.2) > 0.2 ? 1 : 0,
    blink: frac((time + seed) / 2.9) < 0.04,
    sway: Math.sin(time * 1.4) * 0.5,
  };
  const held = w >= 1 ? since - 0.6 - SETTLE : -1;
  if (held >= 0 && name === "up") {
    // Looking about: the head lifts, turns to face us, holds, turns back, lifts again.
    const s = held % 5.2;
    if (s > 1.2 && s < 2.6) Object.assign(x, { face: "front", head: [-0.2, 0] });
    else if ((s > 0.5 && s < 1.2) || (s > 3.2 && s < 3.8)) x.head = [0, 0.4];
  }
  if (held >= 0 && name === "hunch") x.head = [0, Math.floor(held * 4) % 2 ? -1 : 0];
  return { P, x };
}

// Where a hare or groundhog is and how it looks. `r` is the walker (state, pose, since, timer, x and
// dir, and prevX and sinceX from settle in critters.js); `time` is the scene's. Returns the pose P,
// the moment's extras x, the animal's origin `at` along the ground (in its own mirrored coordinates,
// the middle of its body at the walker's x), `gait` for the groundhog's legs, and the shadow's
// columns. A hare hops from a fixed place (x0, where this walk began) in whole hops, so each foot
// stays where it landed: the hop's push, flight and landing play out over its length, and a stop
// settles where the walker stopped.
export function beastFrame(kind, r, time) {
  const b = BEASTS[kind ?? "cottontail"];
  const { spec } = b;
  const dir = r.dir;
  const bx = r.x * dir;
  const walking = r.state === "walk";
  const still = r.since == null; // a sprite in the studio, never settled: its phase steps the walk
  const since = still ? 100 : time - r.since;
  const left = r.timer ?? 99;
  const seed = (r.phase ?? 0) * 0.37;
  const out = { shadow: b.shadow, gait: null };
  const finish = (P, x, at) => ({ ...out, P: spec.poses ? spec.poses(P) : P, x, at: at - b.mid });

  if (kind === "groundhog") {
    const stride = GROUND_STRIDE;
    const phase = still ? (r.phase ?? 0) * 0.25 : bx / stride;
    if (walking) {
      const amp = Math.min(1, since / EASE);
      const x = { gait: { phase, amp }, sway: Math.sin(phase * 2 * Math.PI) * 0.75, blink: false, breath: 0 };
      return finish(GROUND_STAND, x, bx);
    }
    const stopLen = since + left;
    let name = r.pose ?? "up";
    if (!(name in GROUND_NEED) || stopLen < GROUND_NEED[name]) name = "up";
    const { P, x } = groundStop(name, since, left, time, seed);
    // Easing to a stop, the legs keep their gait for a moment.
    if (since < EASE) x.gait = { phase, amp: 1 - since / EASE };
    return finish(P, x, bx);
  }

  const L = HOP_STRIDE * (kind === "jackrabbit" ? 1.15 : 1);
  const tall = b.tall;
  if (walking) {
    const dist = still ? (r.phase ?? 0) * 0.25 * L : bx - (r.sinceX ?? bx) * dir;
    const n = Math.floor(dist / L);
    const u = dist / L - n;
    return finish(hopAt(u), {}, bx - dist + n * L);
  }
  // Stopped: it settles from wherever its hop had got to (that pose, laid at the walk's own lattice,
  // relative to where it stopped), then holds its pose.
  const dist = still ? 0 : bx - (r.prevX ?? r.x) * dir;
  const u = Math.max(0, dist / L - Math.floor(dist / L));
  const stopLen = since + left;
  let name = r.pose ?? "sit";
  if (!(name in HOP_NEED) || stopLen < HOP_NEED[name]) name = "sit";
  let { P, x } = hareStop(name, tall, since, left, time, seed);
  if (since < EASE) P = blend(shift(hopAt(u), -u * HOP_STRIDE), P, since / EASE);
  // The hawk's stoop: pressed flat, still, ears back, held for a moment before and after.
  const frozen = r.frozen ?? 0;
  if (frozen > 0) {
    const f = Math.min((FREEZE_SECONDS - frozen) / 0.3, frozen / 0.4);
    if (f > 0) P = blend(P, FREEZE, f);
    if (f > 0.5) Object.assign(x, { breath: 0, twitch: false, blink: false });
  }
  return finish(P, x, bx);
}
