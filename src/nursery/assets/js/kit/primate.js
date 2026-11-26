// Primates built from parts: the macaque, the dusky langur and the white-handed gibbon on one build,
// with the cats' conventions (four tones lit from above, limbs of two bones filled row by row, the far
// limbs in a darker tone, a curved tail, a face grid that rides on the shoulders). A primate walks
// level, sits upright and hangs, so the torso is a capsule from hip to shoulder at any angle, and each
// limb reaches from its root on the torso to a hand or foot placed by the pose. Coordinates are the
// animal's own: x forward, h up from the ground, the branch or the hold; `plot(x, h, colour)` paints
// a pixel, so the caller places and mirrors it. macaqueAt, langurAt and gibbonAt (below) drive
// it from the scene's state. The design is the approved studio proposal primates-family (rev. 1).
import { STANCE, yawnAt } from "./body.js";
import { bone, bump, curve, ease, joint, mixPose, plant, rowFill, stepAt, straighten, walkDips } from "./build.js";
import { clamp, frac, hash, lerp, mix, rgba, shadowColour, smooth } from "./pixel.js";
import { blinkAt, breathAt, paintAt, plotter, sinceOf, tonesFor, ease as walkEase } from "./place.js";

export { yawnAt };

const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];
const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);

// A hand placed toward `target` but no further than `len` from the shoulder.
function reachTo(S, target, len) {
  const d = dist(S, target);
  if (d <= len) return target;
  return add(S, [(target[0] - S[0]) / d, (target[1] - S[1]) / d], len);
}

// ---- The build ------------------------------------------------------------------------------------

// A limb's pixels: two tapering bones from root to end, each row's span reaching the row above so no
// row meets the next at a corner only, and a hand or foot pad along the end row.
function limbCells(R, F, L, straight) {
  const cells = new Map();
  // With the end on the root, the joint goes a bone below it.
  const J = straighten(R, F, joint(R, F, L.a, L.b, L.bend, [R[0], R[1] - L.a]), straight);
  const span = rowFill(cells, { ground: false });
  bone(span, R, J, L.w[0], L.w[1], { nudge: 0.01 });
  bone(span, J, F, L.w[1], L.w[2], { nudge: 0.01 });
  const end = L.end ?? {};
  const px = Math.round(F[0] - L.w[2] / 2 + 0.01);
  rowFill(cells, { ground: false })(Math.round(F[1]), px - (end.back ?? 0), px + L.w[2] + (end.fwd ?? 0) - 1, end.key);
  return [...cells.values()];
}

// The torso: every pixel within the radius of the line from hip to shoulder (the radius running
// from the hip's to the shoulder's).
function capsule(A, B, rA, rB) {
  const cells = new Map();
  const dx = B[0] - A[0];
  const dh = B[1] - A[1];
  const L2 = dx * dx + dh * dh || 1;
  const r = Math.max(rA, rB);
  for (let x = Math.floor(Math.min(A[0], B[0]) - r); x <= Math.ceil(Math.max(A[0], B[0]) + r); x += 1) {
    for (let h = Math.floor(Math.min(A[1], B[1]) - r); h <= Math.ceil(Math.max(A[1], B[1]) + r); h += 1) {
      const t = clamp(((x - A[0]) * dx + (h - A[1]) * dh) / L2, 0, 1);
      if (Math.hypot(x - (A[0] + dx * t), h - (A[1] + dh * t)) <= lerp(rA, rB, t) + 0.001)
        cells.set(`${x}|${h}`, [x, h]);
    }
  }
  return cells;
}

// The face with its mouth open `rows` rows: the jaw rows drop, the gap dark red from the hinge
// column to the front, a fang at the front of the top (and bottom) gap row when the face has fangs.
const faceCache = new Map();
function faceGrid(face, rows) {
  if (!rows) return face.grid;
  const key = `${face.grid.join("/")}|${rows}`;
  if (faceCache.has(key)) return faceCache.get(key);
  const lines = face.grid.map((r) => [...r]);
  const j = face.jaw;
  const above = lines[j - 1];
  const end = above.join("").replace(/\.+$/, "").length - 1;
  const gap = [];
  for (let i = 0; i < rows; i += 1) {
    const r = above.map((ch, c) => (c < face.hinge && ch !== "." && ch !== "e" ? ch : "."));
    for (let c = face.hinge; c <= end; c += 1) r[c] = face.gap ?? "R";
    if (face.fangs && (i === 0 || i === rows - 1)) r[end] = "f";
    gap.push(r);
  }
  const out = [...lines.slice(0, j), ...gap, ...lines.slice(j)].map((r) => r.join(""));
  faceCache.set(key, out);
  return out;
}

// One primate from a spec and a pose, in its own units: x forward, h up from the ground or the
// branch. `plot(x, h, colour)` paints a pixel. Pose fields: hip, shoulder, head (the face grid's
// top-left), limbs (each { arm, far, end, straight }), tail (three points, or null), mouth (open
// rows), blink, eyesShut, headUp, breath, song (seconds into a call), leaf (a held leaf).
// `layer` "back" paints only the far limbs and the tail, "front" the rest; leave it out for both.
export function drawPrimate(spec, pal, plot, P, layer) {
  const back = layer !== "front";
  const front = layer !== "back";
  const axis = [P.shoulder[0] - P.hip[0], P.shoulder[1] - P.hip[1]];
  const len = Math.hypot(...axis) || 1;
  const a = [axis[0] / len, axis[1] / len];
  const belly = [a[1], -a[0]]; // the side the belly faces: down when level, forward when upright
  const rootOf = (arm, far) => {
    const [along, out] = arm ? spec.armAt : spec.legAt;
    const base = arm ? P.shoulder : P.hip;
    return [
      base[0] + a[0] * along + belly[0] * out + (far ? spec.farShift : 0),
      base[1] + a[1] * along + belly[1] * out,
    ];
  };
  const paintLimb = (l) => {
    const L = l.arm ? spec.arm : spec.leg;
    const key = l.far ? (l.arm ? (spec.farArmKey ?? "F") : "F") : l.arm ? (spec.armKey ?? "T") : (spec.legKey ?? "T");
    for (const [x, h, k] of limbCells(rootOf(l.arm, l.far), l.end, L, l.straight ?? 0)) {
      plot(x, h, pal[k && !l.far ? k : k && l.far ? (spec.farEndKey ?? k) : key]);
    }
  };

  if (back) {
    for (const l of P.limbs) if (l.far) paintLimb(l);
    if (P.tail) {
      const seen = new Set();
      curve(...P.tail, 48, (x, h, t) => {
        if (seen.has(`${x}|${h}`)) return;
        seen.add(`${x}|${h}`);
        plot(x, h, pal[spec.tail.colour?.(t) ?? "T"]);
      });
    }
  }
  if (!front) return;

  // The torso, lit from above: in each column the top pixel is the highlight, the bottom the
  // darkest, and the lower part of the rest shaded. A breath swells the chest a pixel.
  const torso = capsule(P.hip, P.shoulder, spec.r[0], spec.r[1]);
  if (P.breath) {
    const chest = add(add(P.hip, axis, 0.72), belly, spec.r[1]);
    const step = [Math.round(belly[0]), Math.round(belly[1])];
    for (const [x, h] of [...torso.values()]) {
      const k = `${x + step[0]}|${h + step[1]}`;
      if (!torso.has(k) && Math.hypot(x - chest[0], h - chest[1]) <= 1.6) torso.set(k, [x + step[0], h + step[1]]);
    }
  }
  const cols = new Map();
  for (const [x, h] of torso.values()) {
    const c = cols.get(x) ?? [h, h];
    cols.set(x, [Math.min(c[0], h), Math.max(c[1], h)]);
  }
  for (const [x, h] of torso.values()) {
    const [b, t] = cols.get(x);
    let key = "T";
    if (h === t && t - b >= 2) key = "H";
    else if (h === b && t - b >= 1) key = "U";
    else if (h < b + (t - b) * 0.45) key = "S";
    plot(x, h, pal[spec.coat?.(key, h - b, t - b) ?? key]);
  }

  for (const l of P.limbs) if (!l.far) paintLimb(l);

  // The head rides the shoulders; a lifted head lifts as one piece.
  const grid = faceGrid(spec.face, P.mouth ?? 0);
  const lift = Math.round(P.headUp ?? 0);
  const [hx, hh] = [Math.round(P.head[0]), Math.round(P.head[1]) + lift];
  const shut = P.blink || P.eyesShut;
  grid.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      const key = ch === "e" ? (shut ? spec.face.lid : "e") : ch;
      plot(hx + c, hh - r, pal[key]);
    });
  });

  // A leaf held in the hand.
  if (P.leaf) {
    plot(Math.round(P.leaf[0]), Math.round(P.leaf[1]), pal.leaf1);
    plot(Math.round(P.leaf[0]) + 1, Math.round(P.leaf[1]) + 1, pal.leaf0);
  }

  // The call's song: arcs that leave the open mouth and spread, fading, tilted up.
  if (P.rings && pal.song) {
    const end = spec.face.grid[spec.face.jaw - 1].replace(/\.+$/, "").length;
    const mx = hx + end;
    const mh = hh - spec.face.jaw;
    for (const age of P.rings) {
      const u = age / 0.9;
      if (u < 0 || u >= 1) continue;
      const radius = 2 + u * 9;
      const colour = rgba(pal.song, 0.9 * (1 - u));
      const seen = new Set();
      for (let deg = -50; deg <= 50; deg += 4) {
        const rad = ((deg + 20) * Math.PI) / 180;
        const x = mx + Math.round(Math.cos(rad) * radius);
        const h = mh + Math.round(Math.sin(rad) * radius);
        if (seen.has(`${x},${h}`)) continue;
        seen.add(`${x},${h}`);
        plot(x, h, colour);
      }
    }
  }
}

// Poses blend point by point.
const blendPose = (A, B, u) => mixPose(A, B, ease(u));

// A key pose to the build's pose: four limbs from the named hands and feet.
function limbsOf(K) {
  return [
    { arm: false, far: true, end: K.feet.hf, straight: K.straight },
    { arm: true, far: true, end: K.feet.ff, straight: K.straight },
    { arm: false, far: false, end: K.feet.hn, straight: K.straight },
    { arm: true, far: false, end: K.feet.fn, straight: K.straight },
  ];
}

// A painter for a box or the scene: own unit (x, h) lands at (ox + dir * (x - c), base - h).

// ---- Tones ----------------------------------------------------------------------------------------

// `own` is the scene's `primate` palette entry: { R, f } the mouth and fangs, song the call's rings,
// and dark true at night.
const mouthOf = (own) => ({ R: own.R, f: own.f });

// The macaque from the scene's `monkey` colours [body, dark, face]; grey cheek whiskers W.
export function macaqueTones([T, S, P], own) {
  const D = mix(S, "#000000", 0.55);
  const light = !own.dark;
  return {
    T,
    S,
    P,
    D,
    e: D,
    H: mix(T, "#ffffff", light ? 0.2 : 0.12),
    U: mix(S, D, 0.35),
    F: mix(S, D, 0.25),
    W: mix(T, "#ffffff", light ? 0.45 : 0.22),
    ...mouthOf(own),
  };
}

// The langur from [fur, face, white, belly]; arms (A) darker, legs (L) and tail silvered; leaf the
// leaf it eats.
export function langurTones([T, D, W, B], leaf, own) {
  return {
    T,
    D,
    W,
    B,
    e: D,
    P: W,
    H: mix(T, B, 0.45),
    S: mix(T, D, 0.3),
    U: mix(T, D, 0.6),
    F: mix(T, D, 0.5),
    A: mix(T, D, 0.3),
    L: mix(T, B, 0.35),
    leaf0: leaf[0],
    leaf1: leaf[1],
    ...mouthOf(own),
  };
}

// The gibbon from [fur, face, white]: white hands and feet and the white ring round the dark face;
// song the colour of its call's rings.
export function gibbonTones([T, D, P], own) {
  return {
    T,
    D,
    P,
    e: D,
    H: mix(T, P, 0.35),
    S: mix(T, D, 0.18),
    U: mix(T, D, 0.34),
    F: mix(T, D, 0.28),
    song: own.song,
    ...mouthOf(own),
  };
}

// ---- The macaque ----------------------------------------------------------------------------------

// A long-tailed macaque, M tier: a level back on legs a little longer than its arms, a brown cap over
// a pale face with a muzzle, grey whiskers on the cheek, and a long tail carried in a low arch.
export const MACAQUE = {
  r: [1.6, 1.7],
  arm: { a: 2.7, b: 2.6, bend: -1, w: [2, 1, 1], end: { fwd: 1 } },
  leg: { a: 2.9, b: 2.7, bend: 1, w: [2, 1, 1], end: { fwd: 1, back: 1 } },
  armAt: [0.2, 1.2],
  legAt: [0.4, 1.2],
  farShift: 1,
  stride: 4,
  lift: 1.5,
  tail: { colour: (t) => (t > 0.75 ? "S" : "T") },
  face: { grid: [".HH..", "TTPe.", "WPPPD", ".WPP."], jaw: 3, hinge: 2, open: 2, fangs: true, lid: "P" },
};

const MACAQUE_KEYS = {
  stand: {
    hip: [3, 6.4],
    shoulder: [9, 6.4],
    head: [9, 9],
    feet: { hn: [3, 0], hf: [5, 0], fn: [10.5, 0], ff: [9, 0] },
    tail: [
      [0.5, 7.4],
      [-2.4, 11],
      [-4.4, 3],
    ],
    straight: 1,
  },
  // Sitting up on its rump, knees raised, hands on its shins and the tail laid along the ground.
  sit: {
    hip: [4.4, 1.6],
    shoulder: [6.4, 6.6],
    head: [6, 10],
    feet: { hn: [8.5, 0], hf: [9.5, 0], fn: [9.5, 2], ff: [10, 2.5] },
    tail: [
      [3.6, 1],
      [0.5, 0],
      [-3.4, 0],
    ],
    straight: 0,
  },
};

// Where its feet fall: a diagonal-sequence walk (hind, opposite fore, other hind, other fore), as in
// Muybridge's walking baboon. Hips and shoulders dip a pixel in turn.
const WALK_BASE = { hn: 3, hf: 4, fn: 10, ff: 11 };
const DS = { hn: 0, ff: 0.25, hf: 0.5, fn: 0.75 };
export function macaquePose(state) {
  const { rest = { from: "stand", to: "stand", u: 0 }, phase = 0, amp = 0, bodyX = null, sway = 0 } = state;
  const K = blendPose(MACAQUE_KEYS[rest.from], MACAQUE_KEYS[rest.to], rest.u);
  const [dropHind, dropFore] = walkDips(phase, amp, 1);
  const feet = {};
  for (const k of Object.keys(K.feet)) {
    const [reach, up] = stepAt(frac(phase + DS[k]), STANCE, MACAQUE.stride, MACAQUE.lift);
    const x = plant(lerp(K.feet[k][0], WALK_BASE[k] + reach, amp), amp > 0 ? bodyX : null);
    feet[k] = [x, K.feet[k][1] + up * amp];
  }
  const tail = K.tail.map((p, i) => [p[0] + (i === 2 ? sway : 0), p[1] - (i === 0 ? dropHind : 0)]);
  return {
    hip: [K.hip[0], K.hip[1] - dropHind],
    shoulder: [K.shoulder[0], K.shoulder[1] - dropFore],
    head: [K.head[0], K.head[1] - dropFore],
    limbs: limbsOf({ feet, straight: K.straight * (1 - amp) }),
    tail,
    headUp: state.headUp ?? 0,
    blink: state.blink,
    eyesShut: state.eyesShut,
    breath: state.breath,
    mouth: state.mouth,
  };
}

// ---- The langur -----------------------------------------------------------------------------------

// A dusky langur, a little bigger than the macaque: dark grey, darker arms and hands, silvery legs,
// a shaggy cap, white rings round the eye and a pale mouth, and a pale tail longer than its body
// that hangs straight down behind the branch. Its h 0 is the row above the branch.
export const LANGUR = {
  r: [1.6, 1.8],
  arm: { a: 3.2, b: 3.0, bend: -1, w: [2, 1, 1], end: { fwd: 1, key: "D" } },
  leg: { a: 3.4, b: 3.2, bend: 1, w: [2, 2, 1], end: { fwd: 1, key: "D" } },
  armAt: [0.2, 1.0],
  legAt: [0.6, 1.0],
  farShift: 1,
  armKey: "A",
  legKey: "L",
  farEndKey: "D",
  tail: { colour: (t) => (t > 0.85 ? "S" : "B") },
  face: { grid: [".HTH", "TTWD", "TWeD", ".TDW"], jaw: 3, hinge: 2, open: 1, lid: "W" },
};

const LANGUR_KEYS = {
  // Hunched on the branch: knees up to the chest, hands gripping the branch in front of the feet.
  sit: {
    hip: [2.5, 1.6],
    shoulder: [4.5, 6.4],
    head: [5, 10],
    feet: { hn: [6.5, 0], hf: [7.5, 0], fn: [8, 0], ff: [7, 0] },
    tail: [
      [1.8, 1],
      [0.6, -5],
      [0.8, -13],
    ],
    straight: 0,
  },
  // On all fours along the branch.
  stand: {
    hip: [2, 6.2],
    shoulder: [8.5, 6.6],
    head: [9, 9],
    feet: { hn: [2.5, 0], hf: [4, 0], fn: [10, 0], ff: [9, 0] },
    tail: [
      [0.5, 6.5],
      [-2.5, 4],
      [-2, -8],
    ],
    straight: 1,
  },
  // Gathered to spring: hips and shoulders low, the legs folded.
  crouch: {
    hip: [2.5, 3.8],
    shoulder: [8.5, 4.6],
    head: [9, 7],
    feet: { hn: [3.5, 0], hf: [5, 0], fn: [10.5, 0], ff: [9.5, 0] },
    tail: [
      [0.8, 4.2],
      [-2.5, 2],
      [-2.5, -8],
    ],
    straight: 0,
  },
  // In the air: stretched long, arms reaching for the far branch, legs trailing, tail streaming.
  fly: {
    hip: [2, 6.5],
    shoulder: [9, 7.8],
    head: [10, 10.5],
    feet: { hn: [-3, 4.5], hf: [-2, 5.5], fn: [14, 6.5], ff: [13, 7.5] },
    tail: [
      [0.5, 7],
      [-5, 7.5],
      [-10, 4],
    ],
    straight: 0,
  },
};

export function langurPose(state) {
  const { rest = { from: "sit", to: "sit", u: 0 }, sway = 0 } = state;
  const K = blendPose(LANGUR_KEYS[rest.from], LANGUR_KEYS[rest.to], rest.u);
  const tail = K.tail.map((p, i) => [p[0] + (i === 2 ? sway : i === 1 ? sway * 0.4 : 0), p[1]]);
  const feet = { ...K.feet, ...(state.hand ? { fn: state.hand } : {}) };
  return {
    hip: K.hip,
    shoulder: K.shoulder,
    head: K.head,
    limbs: limbsOf({ feet, straight: K.straight }),
    tail,
    headUp: state.headUp ?? 0,
    blink: state.blink,
    breath: state.breath,
    mouth: state.mouth,
    leaf: state.leaf,
  };
}

// ---- The gibbon -----------------------------------------------------------------------------------

// A white-handed gibbon: buff, small-headed, with arms longer than its body (hand to shoulder 5,
// shoulder to hip 4), white hands and feet, a dark face in a white ring, and no tail. Its h 0 is
// the hold, under a crown or bough.
export const GIBBON = {
  r: [1.4, 1.6],
  arm: { a: 2.6, b: 2.6, bend: -1, w: [1, 1, 1], end: { key: "P" } },
  leg: { a: 2.1, b: 2.0, bend: 1, w: [2, 1, 1], end: { key: "P" } },
  armAt: [0, 0],
  legAt: [0, 0],
  farShift: 0,
  tail: null,
  face: { grid: ["TTP", "TPD", ".TP"], jaw: 2, hinge: 2, open: 1, gap: "D", lid: "D" },
};

const ARM = 5; // the holding arm, hand to shoulder
const BODY = 4;
const SWING = 1.1; // the widest angle of a swing: wide enough that both hands meet their holds
export const REACH = 9;
const RELEASE = 0.08; // the trailing hand lets go of the last hold
const GRAB = 0.92; // the reaching hand takes the next
const TRAIL = 235; // degrees: a hand with no hold trails back and down

const unit = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const angleTo = (S, T) => (Math.atan2(T[1] - S[1], T[0] - S[0]) * 180) / Math.PI;

function hangingBody(S, theta, legs = "tucked") {
  const ub = [Math.sin(theta), -Math.cos(theta)];
  const nb = [Math.cos(theta), Math.sin(theta)];
  const hip = add(S, ub, BODY);
  const tuck = legs === "tucked" ? [2.4, 1.6] : [3.7, 0.3];
  const fn = add(add(hip, ub, tuck[0]), nb, tuck[1]);
  const ff = add(fn, nb, legs === "tucked" ? 0.8 : -0.8);
  const head = add(add(S, ub, -1.1), nb, 0.9);
  return { hip, fn, ff, head: [Math.round(head[0]) - 1, Math.round(head[1]) + 1] };
}

// The gibbon at fraction t of a swing under the hold at (0, 0): the holding arm straight, the body a
// pendulum under it, and the other hand letting go of the last hold, swinging through low and taking
// the next one a reach ahead. `prev` and `next` are the holds' heights relative to this one (null
// where there is none). `near` says whether the near arm is the holding one: the arms take turns.
export function gibbonSwing(t, { prev = 0, next = 0, near = true } = {}) {
  const theta = -SWING * Math.cos(Math.PI * t);
  const S = [ARM * Math.sin(theta), -ARM * Math.cos(theta)];
  const body = hangingBody(S, theta * 0.85);
  const P = prev === null ? null : [-REACH, prev];
  const N = [REACH, next ?? 0];
  let free;
  if (t < RELEASE && P) free = reachTo(S, P, 5.2);
  else if (t > GRAB) free = reachTo(S, N, 5.2);
  else {
    const t0 = P ? RELEASE : 0;
    const s = clamp((t - t0) / (GRAB - t0), 0, 1);
    const S0 = gibbonShoulder(t0);
    const S1 = gibbonShoulder(GRAB);
    const a0 = P ? angleTo(S0, P) : TRAIL;
    let a1 = angleTo(S1, N);
    while (a1 < a0) a1 += 360;
    const reach = (P || s > 0 ? 1 : 0) * 0;
    const lenAt = lerp(P ? 5.0 : 4.8, 5.0, s) * (1 - 0.22 * Math.sin(Math.PI * s)) + reach;
    free = add(S, unit(lerp(a0, a1, smooth(s))), lenAt);
  }
  return assemble(S, body, near ? [0, 0] : free, near ? free : [0, 0]);
}

function gibbonShoulder(t) {
  const theta = -SWING * Math.cos(Math.PI * t);
  return [ARM * Math.sin(theta), -ARM * Math.cos(theta)];
}

function assemble(S, body, nearHand, farHand) {
  return {
    hip: body.hip,
    shoulder: S,
    head: body.head,
    limbs: [
      { arm: false, far: true, end: body.ff },
      { arm: true, far: true, end: farHand },
      { arm: false, far: false, end: body.fn },
      { arm: true, far: false, end: nearHand },
    ],
    tail: null,
  };
}

// The leap across a gap in the canopy, u of the way from the hold at (0, 0) to the landing (dx, dh):
// it lets go at the top of a swing, flies in an arc with the leading hand stretched for the landing,
// and lands with the body behind that hand, as a swing begins.
export function gibbonLeap(u, dx, dh, { near = true } = {}) {
  const S0 = [ARM * Math.sin(SWING), -ARM * Math.cos(SWING)];
  const S1 = [dx - ARM * Math.sin(SWING), dh - ARM * Math.cos(SWING)];
  const S = [lerp(S0[0], S1[0], u), lerp(S0[1], S1[1], u) + 4 * Math.sin(Math.PI * u)];
  const theta = lerp(SWING, -SWING, smooth(u)) * 0.85;
  const body = hangingBody(S, theta);
  const lead = reachTo(S, [dx, dh], 5.2);
  const F = [0, 0];
  const Sr = [lerp(S0[0], S1[0], 0.1), lerp(S0[1], S1[1], 0.1) + 4 * Math.sin(Math.PI * 0.1)];
  const trail =
    u < 0.1
      ? reachTo(S, F, 5.2)
      : add(S, unit(lerp(angleTo(Sr, F), TRAIL, smooth((u - 0.1) / 0.9))), lerp(5, 4.8, (u - 0.1) / 0.9));
  // The leading hand is the one that was reaching; the trailing one held the last hold.
  return assemble(S, body, near ? trail : lead, near ? lead : trail);
}

// Hanging still from two hands close together on one hold, legs hanging, body swaying a little.
function gibbonHang(sway = 0) {
  const theta = sway;
  const S = [0.5 + Math.sin(theta) * 4.7, -4.7];
  const body = hangingBody(S, theta, "hanging");
  return assemble(S, body, [-1.5, 0], [2.5, 0]);
}

export const HOP = [
  [0, 1.0, "sit", "sit"],
  [1.0, 1.5, "sit", "stand"],
  [1.5, 1.9, "stand", "stand"],
  [1.9, 2.2, "stand", "crouch"],
  [2.2, 2.35, "crouch", "fly"],
  [2.35, 2.85, "fly", "fly"],
  [2.85, 3.05, "fly", "crouch"],
  [3.05, 3.45, "crouch", "stand"],
  [3.45, 3.95, "stand", "sit"],
  [3.95, 4.0, "sit", "sit"],
];
function restAt(loop, t) {
  const seg = loop.find(([a, b]) => t >= a && t < b) ?? loop[loop.length - 1];
  const [a, b, from, to] = seg;
  return { from, to, u: from === to ? 0 : (t - a) / (b - a) };
}

// Where the langur is on its hop at t (of 4 s): the flight carries it from A to B in an arc.
export function langurHop(t, A, B) {
  const rest = restAt(HOP, t);
  const u = clamp((t - 2.25) / 0.7, 0, 1);
  const x = lerp(A, B, smooth(u));
  const h = Math.round(5 * Math.sin(Math.PI * u));
  return { rest, x, h };
}

// ---- Actions --------------------------------------------------------------------------------------

// The langur's reach for leaves, s seconds in: up into the crown, a pluck, the leaf to its mouth,
// chewing, and back to its grip on the branch. Returns the near hand, the leaf it holds and its mouth.
export const REACH_SECONDS = 2.9;
const GRIP = [8, 0];
const LEAF_AT = [7, 13.5]; // under the crown above it
const MOUTH_AT = [9.5, 7.5];
const REACH_PATH = [
  [0, GRIP],
  [0.5, LEAF_AT],
  [0.8, LEAF_AT],
  [1.3, MOUTH_AT],
  [2.4, MOUTH_AT],
  [REACH_SECONDS, GRIP],
];
export function reachAt(s) {
  if (s < 0 || s >= REACH_SECONDS) return null;
  const i = REACH_PATH.findIndex(([at], k) => s >= at && s < REACH_PATH[k + 1][0]);
  const [a, p] = REACH_PATH[i];
  const [b, q] = REACH_PATH[i + 1];
  const u = smooth((s - a) / (b - a));
  const hand = [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
  const holding = s >= 0.7 && s < 1.9;
  const chewing = s >= 1.3 && s < 2.4;
  return {
    hand,
    leaf: holding ? [hand[0] + 1, hand[1] + 1] : null,
    mouth: chewing && Math.floor(s * 6) % 2 === 0 ? 1 : 0,
  };
}

// The gibbon's great call, c seconds after a swing has ended under the hold at (0, 0) with the next
// hold a reach ahead: the trailing hand comes in beside the other, it hangs by both, tips its head
// up and sings (the notes quicken to a peak, a ring of song leaving its mouth on each), then takes
// up the swing again where it stopped. `near` is the holding arm, as in gibbonSwing.
export const CALL_SECONDS = 6.8;
const NOTES = [1.5, 2.1, 2.6, 3.0, 3.35, 3.65, 3.9, 4.15, 4.4];
const SETTLE = 0.5;
const HANG_AT = 7; // where it settles, from the hold it swung from
export function gibbonCallAt(c, { near = true, time = 0 } = {}) {
  const hang = gibbonHang(0.08 * Math.sin(time * 1.5));
  const mv = (p) => [p[0] + HANG_AT, p[1]];
  const settled = { ...hang, hip: mv(hang.hip), shoulder: mv(hang.shoulder), head: mv(hang.head) };
  settled.limbs = hang.limbs.map((l) => ({ ...l, end: mv(l.end) }));
  if (!near) [settled.limbs[1].end, settled.limbs[3].end] = [settled.limbs[3].end, settled.limbs[1].end];
  const end = CALL_SECONDS - SETTLE;
  let P = settled;
  const u = c < SETTLE ? c / SETTLE : c > end ? 1 - (c - end) / SETTLE : 1;
  if (u < 1) {
    P = blendPose(gibbonSwing(1, { prev: null, next: 0, near }), settled, u);
    // The hand that moves lets go and takes the bough again, dipping below it on the way.
    const moving = P.limbs[near ? 3 : 1];
    moving.end = [moving.end[0], moving.end[1] - 1.5 * Math.sin(Math.PI * clamp(u, 0, 1))];
  }
  const calling = c >= NOTES[0] && c < 5.0;
  return {
    ...P,
    headUp: bump(c, 1.2, 5.3, 0.3),
    mouth: calling && NOTES.some((n) => c >= n && c < n + 0.3) ? 1 : 0,
    rings: NOTES.map((n) => c - n).filter((a) => a >= 0 && a < 0.9),
    blink: !calling && (time / 2.9) % 1 < 0.04,
  };
}

// Primates

// Built from parts (primate.js): a macaque that walks the ground, a langur that sits on a branch and
// now and then hops to another, and a gibbon that brachiates under the crowns. Each palette is the
// scene's array under the animal's name (monkey, langur, gibbon) with the scene's `primate` entry
// beside it (the mouth, the call's song, and dark at night), and its groundShadow. Tones are cached per array.
const primateTones = (colours, make) => tonesFor(colours, "primate", make);

// A painter at origin (x0, base), own unit dx forward of it and h up.
const primatePlot = (g, x0, base, dir) => plotter(g, x0, base + 1, dir);

const MACAQUE_EASE = 0.25; // seconds a walk takes to start or stop
const MACAQUE_SIT = [0.3, 0.8]; // into a stop: it sits down over this
const MACAQUE_YAWN_AT = 1.6;
const MACAQUE_YAWN = 2.0;
const MACAQUE_SHADOW = [-2, 12]; // the columns its shadow spans

// The macaque walks on all fours with its feet planted (a diagonal-sequence walk), eases to a stop,
// sits down on its rump for a stop of 2 s or more and stands before it walks on, and in a long stop
// may yawn, showing its canines. Standing or sitting it breathes, blinks and looks up. m.since
// (settle, critters.js) is when its state last changed and m.timer the seconds its stop has left;
// m.pose "sit" sits it down and m.act "yawn" (with m.actAt seconds in) shows the yawn on demand. Its
// feet stand on m.y, or four rows below the soil line.
export function macaqueAt(g, m, time) {
  if (g.trace) return g.trace.draw(macaqueAt, g, m, time);
  const own = g.pal.primate;
  const pal = primateTones(g.pal.monkey, () => macaqueTones(g.pal.monkey, own));
  const walking = m.state === "walk";
  const since = sinceOf(m, time);
  const x = Math.round(m.x);
  const bodyX = m.x * m.dir;
  const phase = bodyX / (MACAQUE.stride / STANCE);
  const state = {
    phase,
    amp: walkEase(walking, since, MACAQUE_EASE),
    bodyX,
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.6 : Math.sin(time * 1.4) * 0.6,
    breath: breathAt(time, 2.2, !walking),
    blink: blinkAt(time, m.phase ?? 0, 3.1),
    headUp: 0,
  };
  if (!walking) {
    const stop = since + (m.timer ?? 0);
    const [d0, d1] = MACAQUE_SIT;
    let sit = 0;
    if (m.pose === "sit" || m.act) sit = 1;
    else if (stop >= 2) {
      const up = stop - 0.8;
      sit =
        since < d0 ? 0 : since < d1 ? (since - d0) / (d1 - d0) : since < up ? 1 : Math.max(0, 1 - (since - up) / 0.5);
    }
    state.rest = { from: "stand", to: "sit", u: sit };
    const r = hash(Math.round((m.since ?? 0) * 100), x, 7);
    const yawning =
      m.act === "yawn"
        ? (m.actAt ?? 0.8)
        : stop >= MACAQUE_YAWN_AT + MACAQUE_YAWN + 1.2 && r < 0.7
          ? since - MACAQUE_YAWN_AT
          : -1;
    const yawn = yawnAt(yawning);
    if (yawn) Object.assign(state, yawn, { blink: yawn.blink ?? false });
    else if (since > 1 && since < 2) state.headUp = Math.min(1, (since - 1) / 0.25, (2 - since) / 0.25);
  }
  // Its feet stand on m.y, or four rows below the soil line.
  const fy = (m.y ?? g.groundY + 4) + 1;
  const shadow = { colour: shadowColour(g.pal), span: MACAQUE_SHADOW };
  paintAt(g, x, fy, m.dir, (plot) => drawPrimate(MACAQUE, pal, plot, macaquePose(state)), shadow);
}

export const LANGUR_HOP_SECONDS = HOP[HOP.length - 1][1];

// A dusky langur sitting on a branch under a crown (l.x, its feet on the row above l.y, facing
// l.dir), its tail hanging behind the branch and swaying. Its reach move (l.moves.reach, see percher
// and fidget in critters.js) takes it up into the crown for a leaf that it eats. While l.hop
// ({ from, to, start }) runs, it rises onto all fours, leaps to the branch at `to` and sits there.
// The branch is drawn under each of l.perches (or l.x). Its palette is langur: [fur, face, white,
// belly], with the scene's leaf tones for the leaf.
export function langurAt(g, l, time) {
  if (g.trace) return g.trace.draw(langurAt, g, l, time);
  const own = g.pal.primate;
  const pal = primateTones(g.pal.langur, () => langurTones(g.pal.langur, [g.pal.leaf[1], g.pal.leaf[2]], own));
  let x = l.x;
  let lift = 0;
  let dir = l.dir;
  const state = {
    rest: { from: "sit", to: "sit", u: 0 },
    sway: Math.sin(time * 1.3 + (l.phase ?? 0)) * 1.5,
    breath: breathAt(time),
    blink: blinkAt(time, l.phase ?? 0, 3.3),
  };
  const hopping = l.hop && time >= l.hop.start && time < l.hop.start + LANGUR_HOP_SECONDS;
  if (hopping) {
    const hop = langurHop(time - l.hop.start, l.hop.from, l.hop.to);
    dir = l.hop.to > l.hop.from ? 1 : -1;
    x = hop.x;
    lift = hop.h;
    state.rest = hop.rest;
    if (hop.rest.from === "fly" || hop.rest.to === "fly") state.sway = 0;
    state.breath = hop.rest.from === "sit" && hop.rest.to === "sit" && state.breath;
  } else {
    const m = l.moves?.reach;
    const reach = m && time < m.until ? reachAt(m.lasts - (m.until - time)) : null;
    if (reach) Object.assign(state, reach);
  }
  // Own x 5 is the langur's middle, so it turns where it sits.
  const plot = primatePlot(g, Math.round(x) - dir * 5, l.y - 1 - lift, dir);
  const P = langurPose(state);
  drawPrimate(LANGUR, pal, plot, P, "back");
  for (const px of l.perches ?? [l.x]) {
    g.ctx.fillStyle = g.pal.trunk[0];
    g.ctx.fillRect(Math.round(px) - 8, l.y, 17, 1);
    g.ctx.fillStyle = g.pal.trunk[1];
    g.ctx.fillRect(Math.round(px) - 8, l.y + 1, 17, 1);
  }
  drawPrimate(LANGUR, pal, plot, P, "front");
}

export const GIBBON_CALL_SECONDS = CALL_SECONDS;
export const LANGUR_REACH_SECONDS = REACH_SECONDS;

// A white-handed gibbon brachiating under the crowns: one hand holds (b.hx, b.hy) while its body
// swings under it like a pendulum (b.t from 0, behind, to 1, ahead), the hands taking turns (b.count
// swings so far) and the free one letting go of the last hold (when b.prevOk) and taking the next.
// b.leap ({ fromX, fromY, x, y }) flies it across a gap; b.call (seconds in) stops it for its great
// call, hanging by both hands. holdAt(x) is the row a hand can hold at x, or null; `pal` holds its
// gibbon array [fur, face, white] and the primate entry.
export function gibbonAt(g, b, pal, time = 0, holdAt = () => null) {
  if (g.trace) return g.trace.draw(gibbonAt, g, b, pal, time, holdAt);
  const tones = primateTones(pal.gibbon, () => gibbonTones(pal.gibbon, pal.primate));
  const near = (b.count ?? 0) % 2 === 0;
  let P;
  let x0 = b.hx;
  let base = b.hy;
  if (b.call != null) P = gibbonCallAt(b.call, { near, time });
  else if (b.leap) {
    x0 = b.leap.fromX;
    base = b.leap.fromY;
    P = gibbonLeap(b.t, Math.abs(b.leap.x - b.leap.fromX), b.leap.fromY - b.leap.y, { near });
  } else {
    const prevY = b.prevOk ? holdAt(b.hx - b.dir * REACH) : null;
    const nextY = holdAt(b.hx + b.dir * REACH);
    P = gibbonSwing(b.t, { prev: prevY === null ? null : b.hy - prevY, next: nextY === null ? 0 : b.hy - nextY, near });
    P.blink = blinkAt(time, 0, 2.9);
  }
  drawPrimate(GIBBON, tones, primatePlot(g, Math.round(x0), Math.round(base), b.dir), P);
}

export const FAMILY = {
  id: "primates",
  title: "Primates",
  group: "Animals",
  differ: "size, colour, arm length",
  drivers: {
    macaqueAt: { role: "climber", member: () => "monkey" },
    langurAt: { role: "climber", member: () => "langur" },
    gibbonAt: { role: "climber", member: () => "gibbon" },
  },
};
