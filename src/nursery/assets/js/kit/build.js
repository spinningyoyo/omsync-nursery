// The build every animal family shares: the engine parts a family composes into its draw function.
// Outlines (profile), the two-bone joint, the per-spec cache of a family's rest shapes, pose blends,
// where the feet stand and how a foot steps, and the legs: two bones filled row by row (a full thigh
// over a slimmer lower leg, each row reaching the row above so no row meets the next at a corner
// only) ending in a paw or a hoof, and the short legs that step through four drawn poses. Also the
// body's columns and their tones, the round haunch of a folded hind leg, and a tail's curve.
//
// Coordinates are the animal's own, as in every family: x runs from the rump (0) toward the nose and
// h is the height above the ground; a point is [x, h]. Nothing here paints: the parts return cells
// ([x, h, key]) or call back with them, and the family's draw function colours and plots them.
//
// A family supplies its specs (one per member: the outline points, each leg's root, bones `a` and
// `b`, `bend` and widths `w`, the stride and lift), its SHAPES table (one function per rest pose,
// spec => shape), the kinds of its shapes' fields (for blender), its tones, its traits (faces,
// manes, antlers, stripes) and a short draw function that composes these parts.
import { clamp, frac, lerp, smooth } from "./pixel.js";

// ---- Outlines and joints ------------------------------------------------------------------------

// A piecewise-linear outline through [x, h] points, as a function of x (flat past either end).
export function profile(points) {
  return (x) => {
    for (let i = 1; i < points.length; i += 1) {
      const [x0, h0] = points[i - 1];
      const [x1, h1] = points[i];
      if (x <= x1) return lerp(h0, h1, clamp((x - x0) / (x1 - x0), 0, 1));
    }
    return points[points.length - 1][1];
  };
}

// The joint of a two-bone limb from root R to foot F, bones a and b; `bend` 1 throws it forward (a
// knee, a wrist), -1 back (a hock). A limb past full reach stretches a little rather than lift its
// foot. With the foot on the root the joint goes to `onRoot`, by default 0.7 of a bone behind the
// bend; `onRoot` false keeps no such case, the reach floored at 0.01 so the joint still bends from
// the foot's direction.
export function joint(R, F, a, b, bend, onRoot = null) {
  const dx = F[0] - R[0];
  const dy = F[1] - R[1];
  const reach = Math.hypot(dx, dy);
  if (reach < 0.01 && onRoot !== false) return onRoot ?? [R[0] - bend * a * 0.7, R[1]];
  const d = Math.max(0.01, reach);
  const k = Math.max(1, d / ((a + b) * 0.995));
  const cos = ((a * k) ** 2 + d * d - (b * k) ** 2) / (2 * a * k * d);
  const angle = Math.atan2(dy, dx) + bend * Math.acos(clamp(cos, -1, 1));
  return [R[0] + a * k * Math.cos(angle), R[1] + a * k * Math.sin(angle)];
}

// The joint J moved `straight` of the way (0 to 1) to the middle of R and F: a standing leg is straight.
export function straighten(R, F, J, straight) {
  return [lerp(J[0], (R[0] + F[0]) / 2, straight), lerp(J[1], (R[1] + F[1]) / 2, straight)];
}

// Folding to lie, the joint goes to where the folded leg rests: the shape's hindJ or foreJ, by its
// own weight `w` or the shape's `fold`.
export function foldKnee(shape, L, far, J) {
  const fold = shape[L.fore ? "foreJ" : "hindJ"];
  return fold ? mixPt(J, far ? fold.far : fold.near, fold.w ?? shape.fold) : J;
}

// ---- Poses ---------------------------------------------------------------------------------------

export const mixPt = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// Two poses of the same shape blended k of the way, field by field: numbers and lists of numbers
// ease, nested fields blend in turn (a field B leaves out holds A's), words switch at the middle.
export function mixPose(a, b, k) {
  if (typeof a === "number") return a + (b - a) * k;
  if (Array.isArray(a)) return a.map((v, i) => mixPose(v, b[i], k));
  if (a && typeof a === "object") {
    const o = {};
    for (const key of Object.keys(a)) o[key] = mixPose(a[key], b?.[key] ?? a[key], k);
    return o;
  }
  return k < 0.5 ? a : b;
}

// A pair of points (near and far) blended; either side may be missing, and then the other holds.
export const pairMix = (A, B, u) =>
  A || B ? { near: mixPt((A ?? B).near, (B ?? A).near, u), far: mixPt((A ?? B).far, (B ?? A).far, u) } : null;

// Standing feet: the near one at base + stand[0], the far one `apart` further on (and stand[1]),
// both at height h.
export function standFeet(base, apart, stand = [0, 0], h = 0) {
  return { near: [base + stand[0], h], far: [base + apart + stand[1], h] };
}

// Where a leg's foot rests in the shape: its near or far point.
export function footRest(shape, L, far) {
  const feet = shape[L.fore ? "fore" : "hind"];
  return far ? feet.far : feet.near;
}

// A family's rest shapes, made once per spec by SHAPES[name](spec) and passed through `finish`
// (shape, spec, name) if given. Shapes are kept per spec object, not per spec id, so a redrawn copy of
// a member (a studio proposal drafting a change) never reuses the shapes of the scene's own.
export function shapeCache(SHAPES, finish = null) {
  const cache = new WeakMap();
  return (spec, name) => {
    if (!cache.has(spec)) cache.set(spec, new Map());
    const shapes = cache.get(spec);
    if (!shapes.has(name)) {
      const shape = SHAPES[name](spec);
      shapes.set(name, finish ? finish(shape, spec, name) : shape);
    }
    return shapes.get(name);
  };
}

// How each kind of shape field blends from a toward b by weight w: a number (missing counts 0), a
// point, a list of points, a list of numbers, a near and far pair, a folded joint (a pair with its
// weight, missing falls back to the shape's fold), a word that switches at the middle, and a function
// of the column (w may be a function of the column too).
const MIXES = {
  num: (a, b, w) => lerp(a ?? 0, b ?? 0, w),
  pt: (a, b, w) => mixPt(a, b, w),
  pts: (a, b, w) => a.map((p, i) => mixPt(p, b[i], w)),
  nums: (a, b, w) => a.map((n, i) => lerp(n, b[i], w)),
  pair: (a, b, w) => pairMix(a, b, w),
  fold: (a, b, w, A, B) => (a || b ? { ...pairMix(a, b, w), w: lerp(a?.w ?? A.fold, b?.w ?? B.fold, w) } : null),
  pick: (a, b, w) => (w < 0.5 ? a : b),
  fn: (a, b, w) => (typeof w === "function" ? (x) => lerp(a(x), b(x), w(x)) : (x) => lerp(a(x), b(x), w)),
};

// The blend of a family's shapes: blend(A, B, u, last) eases u of the way from A to B. `kinds` names
// each field's kind (see MIXES). With `lead`, a blend that folds or unfolds the legs moves one end
// first: going down (B's fold more than A's) the fore end leads, as an animal drops to its knees;
// getting up, the hind end leads, rising rump first. Fields named in lead.hind follow the hips,
// those in lead.fore the shoulders, `fn` fields each column; `lead.together(A, B)` can rule a pair
// out (a roll onto the back is not a fold). `more(A, B, v)` adds fields of the family's own. `last`
// is the body's last column.
export function blender(kinds, { lead = null, more = null } = {}) {
  const fields = Object.entries(kinds);
  return (A, B, u, last) => {
    const v = smooth(clamp(u, 0, 1));
    if (v === 0) return A;
    if (v === 1) return B;
    let weight = () => v;
    if (lead) {
      const together = lead.together ? lead.together(A, B) : true;
      const down = B.fold > A.fold && together;
      const up = A.fold > B.fold && together;
      const at = (x) => {
        if (!down && !up) return v;
        const fore = clamp(x / last, 0, 1);
        const leads = down ? fore : 1 - fore;
        return smooth(clamp(u * 1.5 - (1 - leads) * 0.5, 0, 1));
      };
      const vh = at(0);
      const vf = at(last);
      weight = (name, kind) => (lead.hind.includes(name) ? vh : lead.fore.includes(name) ? vf : kind === "fn" ? at : v);
    }
    const out = {};
    for (const [name, kind] of fields) out[name] = MIXES[kind](A[name], B[name], weight(name, kind), A, B);
    return more ? Object.assign(out, more(A, B, v)) : out;
  };
}

// ---- Timing --------------------------------------------------------------------------------------

// Eased 0 to 1 as t goes from a to b (by default 0 to 1), held outside.
export const ease = (t, a = 0, b = 1) => smooth(clamp((t - a) / (b - a), 0, 1));

// A move that rises over [a, m], holds, and falls over [n, b].
export const pulse = (t, a, m, n, b) => ease(t, a, m) * (1 - ease(t, n, b));

// 1 between a and b, ramping in and out (straight, not eased) over r seconds at each end.
export const bump = (t, a, b, r = 0.25) => clamp(Math.min(t - a, b - t) / r, 0, 1);

// ---- The walk ------------------------------------------------------------------------------------

// A foot p (0 to 1) of the way through its stride: down for the first `stance` of it, moving from
// stride/2 ahead to stride/2 behind, then lifted (up to `height`) and swung forward. [reach, lift].
export function stepAt(p, stance, stride, height) {
  if (p < stance) return [stride / 2 - stride * (p / stance), 0];
  const s = (p - stance) / (1 - stance);
  return [-stride / 2 + stride * smooth(s), height * Math.sin(Math.PI * s)];
}

// A foot planted where the body has stepped to: with the body at bodyX (or null), a foot at fx keeps
// its whole pixel while the body moves on.
export const plant = (fx, bodyX) => (bodyX === null ? fx : Math.round(bodyX + fx) - Math.round(bodyX));

// How far the hips and the shoulders dip with the walk (`amp` 0 still, 1 walking), twice a stride,
// in turn, by up to `bob` px. [hind, fore].
export function walkDips(phase, amp, bob) {
  return [
    Math.round(amp * (0.5 + 0.5 * Math.cos(4 * Math.PI * phase)) * bob),
    Math.round(amp * (0.5 - 0.5 * Math.cos(4 * Math.PI * phase)) * bob),
  ];
}

// On short drawn legs only the shoulders dip, while the near fore leg is under the body. [hind, fore].
export function drawnDips(phase, amp, bob) {
  return [0, amp > 0.5 && Math.floor(frac(phase + 0.25) * 4) === 1 ? bob : 0];
}

// The dip at column x, between the hips' (column 0) and the shoulders' (column last).
export const dipAlong = (hind, fore, last) => (x) => Math.round(lerp(hind, fore, clamp(x / last, 0, 1)));

// ---- Legs ----------------------------------------------------------------------------------------

// Fills spans into `cells` (a Map keyed "x|h") row by row, each row reaching the row before it so no
// row meets the next at a corner only: span(h, a, b, key) fills columns a to b of row h. A cell holds
// [x, h, key ?? kind]; a keyed span paints over what is there, an unkeyed one only fills empty cells.
// On the `ground`, rows below 0 are dropped (a family that turns its animal over keeps them).
export function rowFill(cells, { ground = true, kind } = {}) {
  let prev = null;
  return (h, a, b, key) => {
    if (prev && prev.h !== h) {
      if (a > prev.b) a = prev.b;
      if (b < prev.a) b = prev.a;
    }
    if (h >= 0 || !ground)
      for (let x = a; x <= b; x += 1) if (key || !cells.has(`${x}|${h}`)) cells.set(`${x}|${h}`, [x, h, key ?? kind]);
    prev = { h, a, b };
  };
}

// A bone from A to B tapering from width wA to wB, filled row by row through `span`. `centre` sets
// each row's span on the bone (rounded half up), otherwise its left edge is rounded (`nudge` moves
// it); `inset` centres it too, starting (w - 1) / 2 before the bone (which can round a hair apart
// from `centre`, so a family keeps the one it was drawn with); `thigh` fills the bone as muscle: full most of the way down and swelling behind the bone, then
// narrowing into the hock, so a hindquarter never tapers into a stick (its rows keyed `key`, by
// default "thigh"). No row is narrower than `min`.
export function bone(
  span,
  A,
  B,
  wA,
  wB,
  { centre = false, inset = false, nudge = centre ? 0.5 : 0, thigh = false, key, min = 1 } = {},
) {
  const hA = Math.round(A[1]);
  const hB = Math.round(B[1]);
  if (hA === hB) {
    const w = Math.max(min, Math.round(wB));
    const lo = Math.min(A[0], B[0]);
    const hi = Math.max(A[0], B[0]);
    if (inset) span(hA, Math.round(lo - (w - 1) / 2), Math.round(hi + (w - 1) / 2));
    else if (centre) span(hA, Math.round(lo - w / 2 + 0.5), Math.round(hi + w / 2 - 0.5));
    else span(hA, Math.round(lo - w / 2 + nudge), Math.round(hi + w / 2 + nudge) - 1);
    return;
  }
  const rowKey = key ?? (thigh ? "thigh" : undefined);
  const step = hB < hA ? -1 : 1;
  for (let h = hA; ; h += step) {
    const t = (h - hA) / (hB - hA);
    const w = Math.max(min, Math.round(lerp(wA, wB, thigh ? t ** 2 : t)));
    const x = lerp(A[0], B[0], t);
    const a = Math.round(inset ? x - (w - 1) / 2 : x - w * (thigh ? 0.65 : 0.5) + nudge);
    span(h, a, a + w - 1, typeof rowKey === "function" ? rowKey(t) : rowKey);
    if (h === hB) break;
  }
}

// A bone lying out sideways (a sitting bear's leg): filled column by column into `cells`, thick at
// the thigh, each cell [x, h, kind].
export function boneAcross(cells, A, B, wA, wB, kind) {
  const x0 = Math.round(Math.min(A[0], B[0]));
  const x1 = Math.round(Math.max(A[0], B[0]));
  for (let x = x0; x <= x1; x += 1) {
    const t = clamp((x - A[0]) / (B[0] - A[0]), 0, 1);
    const w = Math.max(1, Math.round(lerp(wA, wB, t)));
    const lo = Math.round(lerp(A[1], B[1], t) - w / 2 + 0.5);
    for (let h = lo; h < lo + w; h += 1) if (h >= 0) cells.set(`${x}|${h}`, [x, h, kind]);
  }
}

// A paw: `paw.h` rows from fh up, from `paw.back` behind the foot's column px to `paw.fwd` past its
// width w.
export function pawRows(span, px, fh, w, paw) {
  for (let h = fh + paw.h - 1; h >= fh; h -= 1) span(h, px - paw.back, px + w + paw.fwd - 1);
}

// A bending leg on a paw (the cats' and the dogs' build): from the root R, its foot p of the way
// through the stride (stance `stance`, the spec's stride and lift) from its rest x, planted by bodyX
// and walking `amp`; `straight` how straight it stands. Two bones and the spec's paw. Returns cells.
export function pawLimb(spec, L, { R, rest, p, amp, bodyX, straight, stance }) {
  const cells = new Map();
  const span = rowFill(cells);
  const [reach, lift] = stepAt(p, stance, spec.stride, spec.lift);
  const F = [plant(rest + reach * amp, bodyX), spec.paw.h + lift * amp];
  const J = straighten(R, F, joint(R, F, L.a, L.b, L.bend), straight);
  bone(span, R, J, L.w[0], L.w[1]);
  bone(span, J, F, L.w[1], L.w[2]);
  pawRows(span, Math.round(F[0] - L.w[2] / 2), Math.round(lift * amp), L.w[2], spec.paw);
  return [...cells.values()];
}

// A short leg's n rows down from the body at column x0, in drawn pose `step`: 0 reaching forward
// (`reach` px at the foot), 1 under the body, 2 pushed back, 3 lifted with the paw folded. The top
// row is L.w[0] wide, the rest L.w[1]; the bottom row has `fwd` px of paw in front. Cells [x, h, kind].
export function drawnRows(L, x0, n, step, reach, fwd, kind) {
  const cells = [];
  for (let r = 0; r < n; r += 1) {
    const h = n - 1 - r;
    if (step === 3 && h === 0) continue;
    const u = (r + 1) / n;
    let dx = 0;
    if (step === 0) dx = Math.round(reach * u);
    else if (step === 2) dx = -Math.round(reach * u);
    const w = r === 0 ? L.w[0] : L.w[1];
    const a = x0 + dx - (w >> 1);
    for (let x = a; x < a + w; x += 1) cells.push([x, h, kind]);
    if (step === 3 && h === 1) cells.push([L.fore ? a + w : a - 1, h, kind]);
    if (h === 0) for (let k = 0; k < fwd; k += 1) cells.push([a + w + k, 0, kind]);
  }
  return cells;
}

// A short leg (the cats' and the dogs' build) from its root, dipped `drop`: walking (amp over a
// half) one of four drawn poses a quarter stride apart by p; at rest it stands from the root toward
// its foot (`stand` 1 straight down), and a foreleg laid flat (`paws` over a half) adds its paw along
// the ground, spec.pawReach px.
export function drawnLimb(spec, L, { root, drop, foot, p, amp, stand, paws }) {
  const n = Math.max(0, Math.round(root[1]) - drop);
  const walking = amp > 0.5;
  const step = walking ? Math.floor(p * 4) : 1;
  const x0 = walking ? Math.round(root[0]) : Math.round(lerp(root[0], foot, 1 - stand) + stand * (foot - root[0]));
  const cells = drawnRows(L, x0, n, step, spec.reach, spec.paw.fwd);
  if (L.fore && paws > 0.5) {
    const a = Math.round(root[0]) - (L.w[1] >> 1);
    const len = Math.round(spec.pawReach * paws) + L.w[1];
    for (let x = a; x < a + len; x += 1) cells.push([x, 0]);
  }
  return cells;
}

// ---- Body, haunch and tail -----------------------------------------------------------------------

// Body column x between the outlines top and bottom, lifted `o` by the pose and dipped `drop` by the
// step. Breathing, the chest (spec.chest columns) swells a pixel: standing it deepens, lying it rises.
// [b, t], the underside and the back.
export function column(spec, top, bottom, x, o, drop, breath, standing) {
  const swell = breath && x >= spec.chest[0] && x <= spec.chest[1] ? 1 : 0;
  const t = Math.round(top(x) + o) - drop + (standing ? 0 : swell);
  const b = Math.max(0, Math.round(bottom(x) + o) - drop - (standing ? swell : 0));
  return [b, t];
}

// The tone key of a body pixel dh rows above the underside of a column depth rows deep: lit along the
// back (spec.lit rows, from column spec.litFrom), darkest underneath (spec.under rows), shaded over
// the lowest `shade` of the column.
export function coatKey(spec, x, dh, depth, shade = 0.45) {
  if (dh > depth - spec.lit && x >= spec.litFrom) return "H";
  if (dh <= spec.under - 1) return "U";
  if (dh < depth * shade) return "S";
  return "T";
}

// A round haunch over a folded hind leg, centred (cx, ch) with radii rx and ry, from row h0 up: each
// pixel with its key, lit on top and shaded behind and below.
export function haunch(cx, ch, rx, ry, h0, each) {
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
    for (let h = h0; h <= Math.ceil(ch + ry); h += 1) {
      const nx = (x - cx) / rx;
      const ny = (h - ch) / ry;
      if (nx * nx + ny * ny > 1) continue;
      each(x, h, ny > 0.55 ? "H" : nx < -0.4 || ny < -0.45 ? "S" : "T");
    }
  }
}

// A curve from p0 through p1's pull to p2 (a quadratic Bezier), n + 1 rounded points: each(x, h, t).
export function curve(p0, p1, p2, n, each) {
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const x = Math.round((1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0]);
    const h = Math.round((1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1]);
    each(x, h, t);
  }
}
