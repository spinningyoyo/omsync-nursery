// The long-necked birds built from parts: the trumpeter swan (Yellowstone), the whooper swan (Iceland)
// and the lesser flamingo (Serengeti). A bird is cells in (u along the body, v up from the water line or
// the ground), facing right. Each part is a capsule or a sampled sheet (swimmer.js), so a bending neck, a
// beating wing or a stepping leg stays one joined shape: a neck on a curve, a wing on two bones that
// stays rooted on the shoulder and changes shape through its beat, four tones lit from above, a darker
// far wing and far leg, and a soft ground shadow. drawSwan and drawFlamingo draw one pose; the pose
// builders (swanFly, swanSwim, swanWalk, flamingoFly, flamingoWade, ...) and the rest poses (swanRest,
// flamingoRest) are what swanAt and flamingoAt (below) choose between. Palettes: swan (or whooper,
// as the scene names it) [white, shade, bill base, bill tip] and flamingo [pink, wing, dark], with
// groundShadow (the soft shadow on the ground) and pond (shallow, deep, foam, for a swimmer's wake; a scene's
// fjord or water serves) beside them.
import { ease, joint, mixPose } from "./build.js";
import { stride } from "./critters.js";
import { clamp, frac, lerp, mix, shadowColour, smooth, TAU } from "./pixel.js";
import { feet, stillOf } from "./place.js";
import { Cells, capsule, tidy } from "./swimmer.js";

export { mixPose };

// ---- Poses and timelines ---------------------------------------------------------------------------

// Keyframes [[seconds, pose], ...] in order; eased between each pair, held when two are the same.
function timeline(frames, t) {
  let i = 0;
  while (i < frames.length - 1 && t >= frames[i + 1][0]) i += 1;
  const [t0, p0] = frames[i];
  const [t1, p1] = frames[Math.min(i + 1, frames.length - 1)];
  if (t1 <= t0) return p0;
  return mixPose(p0, p1, ease((t - t0) / (t1 - t0)));
}

// ---- Tones ------------------------------------------------------------------------------------------

const lit = (T) => (l) => (l > 0.5 ? T.hi : l > -0.05 ? T.base : l > -0.55 ? T.sh : T.dark);

// A swan's tones from its palette [white, shade, bill base, bill tip].
export function swanTones(g, key = "swan") {
  const [white, shade, base, tip] = g.pal[key];
  return {
    hi: white,
    base: mix(white, shade, 0.3),
    sh: mix(white, shade, 0.72),
    dark: mix(shade, tip, 0.22),
    edge: mix(white, shade, 0.5),
    farWing: mix(white, shade, 0.55),
    farWingSh: mix(shade, tip, 0.2),
    prim: mix(shade, tip, 0.35),
    billBase: base,
    billTip: tip,
    leg: mix(tip, shade, 0.25),
    farLeg: tip,
    eye: tip,
  };
}

// A flamingo's tones from its palette [pink, wing, dark].
export function flamingoTones(g) {
  const [pink, wing, dark] = g.pal.flamingo;
  return {
    hi: mix(pink, "#ffffff", 0.3),
    base: pink,
    sh: mix(pink, wing, 0.6),
    dark: mix(wing, dark, 0.15),
    cov: wing,
    covHi: mix(wing, pink, 0.4),
    prim: dark,
    farWing: mix(wing, dark, 0.35),
    farWingSh: dark,
    billBase: mix(pink, "#ffffff", 0.35),
    billTip: dark,
    leg: wing,
    farLeg: mix(wing, dark, 0.35),
    eye: dark,
  };
}

// ---- Parts ------------------------------------------------------------------------------------------

function bezier(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const a = (1 - t) ** 3;
    const b = 3 * (1 - t) ** 2 * t;
    const c = 3 * (1 - t) * t * t;
    const d = t ** 3;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

// A neck from base B: two control points and the head, all relative to B. Returns the head point.
function neck(cells, B, n, rBase, rHead, tone) {
  const [x1, y1, x2, y2, hx, hy] = n;
  const pts = bezier([0, 0], [x1, y1], [x2, y2], [hx, hy], 16).map(([u, v]) => [B[0] + u, B[1] + v]);
  for (let i = 0; i < pts.length - 1; i += 1) {
    const r0 = lerp(rBase, rHead, i / (pts.length - 1));
    const r1 = lerp(rBase, rHead, (i + 1) / (pts.length - 1));
    capsule(cells, pts[i], pts[i + 1], r0, r1, tone);
  }
  return pts[pts.length - 1];
}

// A head and bill at H. The bill points at angle `a` (radians, 0 forward, negative down) and may
// bend by `bend` after its first part, as a flamingo's does. Cells at the bill's end take `tip`.
function head(cells, H, a, o, tone) {
  capsule(cells, [H[0] - 0.3, H[1]], [H[0] + 0.4, H[1] - 0.1], o.r, o.r - 0.1, tone);
  const len1 = o.len1;
  const len2 = o.len2 ?? 0;
  const dir1 = [Math.cos(a), Math.sin(a)];
  const m = [H[0] + 0.5 + dir1[0] * len1, H[1] + dir1[1] * len1];
  const b2 = a + (o.bend ?? 0);
  const e = [m[0] + Math.cos(b2) * len2, m[1] + Math.sin(b2) * len2];
  const bill = (from, to, r0, r1, x0, x1) => {
    const cs = new Cells();
    capsule(cs, from, to, r0, r1, () => "x");
    for (const [u, v] of cs.values()) {
      const t = lerp(
        x0,
        x1,
        clamp(
          ((u + 0.5 - from[0]) * (to[0] - from[0]) + (v + 0.5 - from[1]) * (to[1] - from[1])) /
            Math.max(0.01, (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2),
          0,
          1,
        ),
      );
      cells.set(u, v, t < o.split ? o.base : o.tip);
    }
  };
  const start = [H[0] + 0.3, H[1]];
  if (len2 > 0) {
    bill(start, m, o.r0, o.r1, 0, 0.5);
    bill(m, e, o.r1, 0.5, 0.5, 1);
  } else bill(start, m, o.r0, o.r1, 0, 1);
  return o.eye ? [H[0] + 0.4, H[1] + 0.3] : null;
}

// A leg: R the hip, F the foot, `a` and `b` the bones; the ankle bends backward. The foot is a
// webbed or toed flat of `toe` cells.
function leg(cells, R, F, a, b, colour, toe, bend = -1, r = 0.55) {
  const J = joint(R, F, a, b, bend, false);
  const flat = () => colour;
  capsule(cells, R, J, r, r, flat);
  capsule(cells, J, F, r, r, flat);
  for (let i = 1; i <= toe; i += 1) cells.set(Math.floor(F[0] + i), Math.floor(F[1] - 0.5), colour);
  return J;
}

// A wing on two bones rooted on the shoulder S. `b` is the lift of the wing in radians (up positive),
// `lag` how far the tip trails the arm, `sw` how far it sweeps back (1 folded), `k` its scale and
// `fold` how far its chord hangs down over the flank (1 folded). W holds the wing's size and look.
// Returns nothing: it paints into `cells` sheet by sheet from the shoulder to the tip.
function wing(cells, S, w, W, far = false) {
  const { b, lag = 0, sw = 0.55, k = 1, fold = 0 } = w;
  const L1 = W.L1 * k;
  const L2 = W.L2 * k;
  const b1 = b + lag * 0.5;
  const b2 = b + lag;
  const wr = [S[0] + L1 * (-sw * 0.85 * Math.cos(b1) + 0.12 * Math.sin(b1)), S[1] + L1 * Math.sin(b1)];
  const tp = [wr[0] + L2 * (-sw * 1.25 * Math.cos(b2) + 0.12 * Math.sin(b2)), wr[1] + L2 * Math.sin(b2)];
  const under = b < -0.12 && fold < 0.5;
  const rear = [-1, -0.4 * (1 - Math.abs(Math.sin(b)))];
  const hang = [-0.15, -1];
  const cv = [lerp(rear[0], hang[0], fold), lerp(rear[1], hang[1], fold)];
  const spine = (s) => {
    const m = 0.45;
    return s < m
      ? [lerp(S[0], wr[0], s / m), lerp(S[1], wr[1], s / m)]
      : [lerp(wr[0], tp[0], (s - m) / (1 - m)), lerp(wr[1], tp[1], (s - m) / (1 - m))];
  };
  const chord = (s) => {
    let c = (s < 0.45 ? lerp(W.c0, W.c1, s / 0.45) : lerp(W.c1, W.c2, (s - 0.45) / 0.55)) * (0.5 + 0.5 * k);
    if (s > 0.9) c *= 1 - ((s - 0.9) / 0.1) ** 2 * 0.6;
    // Fingered tips: the trailing edge steps in separate primaries on a big wing.
    if (W.fingers && s > 0.62) c *= 0.74 + 0.26 * frac(((s - 0.62) / 0.38) * W.fingers);
    return c;
  };
  const N = Math.ceil((L1 + L2) * 2.2);
  for (let i = N; i >= 0; i -= 1) {
    const s = i / N;
    const P = spine(s);
    const c = chord(s);
    const M = Math.ceil(c * 2.2);
    for (let j = 0; j <= M; j += 1) {
      const q = j / M;
      const u = P[0] + cv[0] * c * q;
      const v = P[1] + cv[1] * c * q;
      cells.set(Math.floor(u), Math.floor(v), W.paint(s, q, under, far, fold));
    }
  }
}

// The water's three colours: a pond, a fjord or a scene's water.
const pondOf = (g) => g.pal.pond ?? g.pal.fjord ?? g.pal.water;

// ---- Painting ---------------------------------------------------------------------------------------

function paintCells(g, cells, ox, y, dir, o = {}) {
  const X = (u) => (dir > 0 ? ox + u : ox - u - 1);
  if (o.shadow) {
    g.ctx.fillStyle = shadowColour(g.pal);
    for (let u = o.shadow[0]; u <= o.shadow[1]; u += 1) g.ctx.fillRect(X(u), y, 1, 1);
  }
  const all = cells.values();
  for (const [u, v, c] of all) {
    if (o.water && v < 0) continue;
    g.ctx.fillStyle = c;
    g.ctx.fillRect(X(u), y - 1 - v, 1, 1);
  }
  if (o.water) {
    // The reflection: the cells mirrored under the water line, faint and rippling.
    g.ctx.globalAlpha = 0.3;
    for (const [u, v, c] of all) {
      if (v < 0 || v > 8) continue;
      const wob = Math.round(Math.sin(o.time * 3 + v * 0.9) * 0.6);
      g.ctx.fillStyle = c;
      g.ctx.fillRect(X(u + wob), y + v, 1, 1);
    }
    g.ctx.globalAlpha = 1;
  }
}

// A swan's wake and a flamingo's ripples, on the water line at row y.
export function wake(g, ox, y, dir, time, { speed = 1, tail = -7, bow = 5 } = {}) {
  const [, , foam] = pondOf(g);
  const X = (u) => (dir > 0 ? ox + u : ox - u - 1);
  g.ctx.fillStyle = foam;
  g.ctx.globalAlpha = 0.6;
  g.ctx.fillRect(X(bow), y, 2, 1);
  for (let i = 0; i < 8; i += 1) {
    const on = Math.floor(i + time * 4 * speed) % 3 !== 0;
    g.ctx.globalAlpha = 0.5 - i * 0.05;
    if (on) g.ctx.fillRect(X(tail - i), y, 1, 1);
  }
  g.ctx.globalAlpha = 0.28;
  for (let i = 0; i < 9; i += 1) if (Math.floor(i + time * 3 * speed) % 2) g.ctx.fillRect(X(tail - 1 - i), y + 1, 1, 1);
  g.ctx.globalAlpha = 1;
}

// A ring that spreads where a head or a foot meets the water, at row y.
export function ring(g, cx, y, age, wide = 5) {
  if (age < 0 || age > 1) return;
  const [, , foam] = pondOf(g);
  const r = Math.round(1 + age * wide);
  g.ctx.globalAlpha = (1 - age) * 0.7;
  g.ctx.fillStyle = foam;
  g.ctx.fillRect(Math.round(cx) - r, y, 1, 1);
  g.ctx.fillRect(Math.round(cx) + r, y, 1, 1);
  g.ctx.fillRect(Math.round(cx) - r + 1, y + 1, r * 2 - 1, 1);
  g.ctx.globalAlpha = 1;
}

// ---- The swan ---------------------------------------------------------------------------------------

const SWAN_WING = {
  L1: 6,
  L2: 7.4,
  c0: 5,
  c1: 4,
  c2: 1.6,
  fingers: 3,
  paint(_s, q, under) {
    const T = this.T;
    if (under) return q < 0.25 ? T.base : q < 0.8 ? T.sh : T.dark;
    return q < 0.3 ? T.hi : q < 0.7 ? T.base : T.sh;
  },
};

const SWAN_POSE = {
  bv: 5.8, // the body's centre line above the ground (the water line)
  pitch: 0, // how far the rear sits above the front
  neck: [4.6, 0.8, -3.4, 4.6, 1.8, 9.0],
  bill: -0.12,
  look: 0, // 1 draws the eye closed
  wing: { b: 0.1, lag: 0, sw: 1, k: 0.62, fold: 1 },
  legs: { n: [0, 0], f: [0, 0] }, // foot x and lift for the near and the far leg
  water: 0, // 1 sits in the water: low, nothing below the line, a reflection
  air: 0, // 1 flies: legs trail
};

const swanPose = (over = {}) => ({
  ...SWAN_POSE,
  ...over,
  wing: { ...SWAN_POSE.wing, ...(over.wing ?? {}) },
  legs: { ...SWAN_POSE.legs, ...(over.legs ?? {}) },
});

// Draws a swan with its body's centre at column ox and its feet (or water line) on row y.
export function drawSwan(g, ox, y, dir, pose, T, o = {}) {
  const cells = new Cells();
  const p = pose;
  const bv = p.bv;
  const ground = p.water < 0.5 && p.air < 0.5;
  const W = {
    ...SWAN_WING,
    T,
    prim: T.prim,
    farPrim: T.farWingSh,
    paint: (s, q, u, far) => (far ? (q < 0.3 ? T.farWing : T.farWingSh) : SWAN_WING.paint.call({ T }, s, q, u)),
  };
  const shoulder = [-0.4, bv + 2.0 + p.pitch * 0.3];
  // Far leg and far wing first, behind the body.
  if (ground) {
    const hip = [0.4, bv - 2.2];
    const [fx, fl] = p.legs.f;
    leg(cells, [hip[0] - 0.4, hip[1]], [hip[0] + 0.2 + fx, fl], 1.9, 1.9, T.farLeg, 2);
  }
  if (p.air > 0.5) {
    const drop = o.drop ?? 0;
    capsule(cells, [-4, bv - 1.4], [-9, bv - 1.8 - drop], 0.55, 0.55, () => T.farLeg);
  }
  if (p.wing.fold < 0.95 && p.wing.b > -0.9) {
    const fw = { ...p.wing, b: p.wing.b * 0.8 - 0.1 + 0.1, k: p.wing.k * 0.9 };
    wing(cells, [shoulder[0] + 1.2, shoulder[1] + 0.2], fw, W, true);
  }
  // The body: a low boat, a breast and a pointed tail that lifts.
  const rear = bv + p.pitch;
  const front = bv - p.pitch * 0.4;
  capsule(cells, [-4.2, rear + 0.5], [-0.8, bv + p.pitch * 0.5], 1.7, 2.8, lit(T));
  capsule(cells, [-0.8, bv + p.pitch * 0.5], [3.0, front - 0.1], 2.8, 2.4, lit(T));
  capsule(cells, [-4.2, rear + 0.8], [-7.4, rear + 1.8 + p.pitch * 0.3], 1.2, 0.5, lit(T));
  // The neck and head.
  const B = [3.2, front + 1.0];
  const H = neck(cells, B, p.neck, 1.6, 1.0, lit(T));
  const eyeAt = head(
    cells,
    H,
    p.bill,
    { r: 1.25, len1: 3, r0: 0.75, r1: 0.55, split: 0.45, base: T.billBase, tip: T.billTip, eye: true },
    lit(T),
  );
  // The wing on the near side over the body.
  const body = new Cells();
  wing(body, shoulder, p.wing, W);
  for (const [u, v, c] of body.values()) cells.set(u, v, c);
  // The near leg.
  if (ground) {
    const hip = [0.4, bv - 2.2];
    const [nx, nl] = p.legs.n;
    leg(cells, hip, [hip[0] + 0.2 + nx, nl], 1.9, 1.9, T.leg, 2);
  }
  if (p.air > 0.5) {
    const drop = o.drop ?? 0;
    capsule(cells, [-4, bv - 1.8], [-9.5, bv - 2.2 - drop], 0.55, 0.55, () => T.leg);
  }
  tidy(cells);
  for (const [u, v, c] of cells.values()) if (c === T.hi && !cells.has(u, v + 1)) cells.set(u, v, T.edge);
  if (eyeAt && p.look < 0.5) cells.set(Math.floor(eyeAt[0]), Math.floor(eyeAt[1]), T.eye);
  paintCells(g, cells, ox, y, dir, {
    shadow: ground ? [-5, 4] : null,
    water: p.water > 0.5,
    time: o.time ?? 0,
  });
}

// A swan's flight: slow deep beats, the neck stretched out, the feet trailing.
const SWAN_FLY = swanPose({
  bv: 6,
  neck: [3.6, 0.3, 7.4, 0.8, 11.0, 1.3],
  bill: -0.12,
  air: 1,
  wing: { b: 0.2, lag: 0, sw: 0.7, k: 1, fold: 0 },
});

// Wing beat at phase c (cycles): the lift, the trailing tip and the body bob, from reference. The
// downstroke is a little quicker than the upstroke.
function beat(c, { mid = 0.25, amp = 1.0 } = {}) {
  const ph = frac(c);
  const a = ph < 0.42 ? ph / 0.42 / 2 : 0.5 + (ph - 0.42) / 0.58 / 2; // 0 at the top, 1 at the bottom
  const lift = mid + amp * Math.cos(a * TAU);
  const lag = 0.5 * Math.sin(a * TAU);
  return { lift, lag, bob: -0.9 * Math.sin(a * TAU + 1.4) };
}

export function swanFly(c, over = {}) {
  const w = beat(c);
  return swanPose({
    ...SWAN_FLY,
    bv: SWAN_FLY.bv + w.bob,
    neck: [3.6, 0.3, 7.4, 0.8 + w.bob * 0.2, 11.0, 1.3 + w.bob * 0.3],
    wing: { b: w.lift, lag: w.lag, sw: 0.7, k: 1, fold: 0 },
    ...over,
  });
}

// A swan swimming: the body rides low, the neck in an S that sways, the head level.
export function swanSwim(t, over = {}) {
  const s = Math.sin((t * TAU) / 4);
  return swanPose({
    bv: 2.3 + Math.sin((t * TAU) / 2) * 0.25,
    pitch: 1.0,
    neck: [4.4 + s * 0.2, 0.8, -3.0 + s * 0.3, 4.6, 1.7 + s * 0.3, 8.8 + Math.sin((t * TAU) / 3) * 0.2],
    bill: -0.12 + s * 0.04,
    water: 1,
    ...over,
  });
}

// A swan walking on land at phase c (cycles); returns the pose and the ground it covers.
const SWAN_REACH = 1.6;
const SWAN_STANCE = 0.65;
function footAt(c, reach, lift) {
  const ph = frac(c);
  if (ph < SWAN_STANCE) return [reach - (ph / SWAN_STANCE) * 2 * reach, 0];
  const s = (ph - SWAN_STANCE) / (1 - SWAN_STANCE);
  return [-reach + ease(s) * 2 * reach, Math.sin(s * Math.PI) * lift];
}
export function swanWalk(c, over = {}) {
  const near = footAt(c, SWAN_REACH, 1.6);
  const far = footAt(c + 0.5, SWAN_REACH, 1.6);
  const dip = Math.abs(Math.sin(c * Math.PI)) * 0.5;
  return swanPose({
    bv: 5.8 - dip + 0.25,
    neck: [4.6, 0.8, -3.0 + Math.sin(c * TAU) * 0.5, 4.6, 2.0 + Math.sin(c * TAU) * 0.5, 9.0],
    bill: -0.3,
    legs: { n: near, f: far },
    ...over,
  });
}
// The camera speed that keeps a planted foot still: the ground a foot covers in its stance.
export const SWAN_SPEED = (2 * SWAN_REACH) / SWAN_STANCE; // px per cycle

// ---- The flamingo -----------------------------------------------------------------------------------

const FLAMINGO_WING = {
  L1: 5.4,
  L2: 6.6,
  c0: 3.8,
  c1: 3,
  c2: 1.2,
  fingers: 0,
  paint(s, q, under, far, fold) {
    const T = this.T;
    if (fold > 0.5) return far ? T.farWing : s > 0.82 && q > 0.45 ? T.prim : q > 0.7 ? T.sh : q < 0.3 ? T.covHi : T.cov;
    if (far) return s > 0.4 && q > 0.3 ? T.farWingSh : T.farWing;
    if (s > 0.62 || (s > 0.35 && q > 0.45)) return T.prim;
    if (under) return q < 0.3 ? T.sh : T.cov;
    return q > 0.75 ? T.sh : q < 0.3 ? T.covHi : T.cov;
  },
};

const FLAMINGO_POSE = {
  bv: 11.2,
  neck: [3.2, 1.6, -2.6, 4.0, 1.6, 8.2],
  bill: -0.2,
  bend: -0.9,
  look: 0,
  wing: { b: 0.05, lag: 0, sw: 1, k: 0.5, fold: 1 },
  legs: { n: [1.4, 0, 0], f: [-3.0, 0, 0] }, // foot x, lift and how far it is tucked up
  air: 0,
  water: 0, // a wading depth in cells, 0 on dry ground
};
const flamingoPose = (over = {}) => ({
  ...FLAMINGO_POSE,
  ...over,
  wing: { ...FLAMINGO_POSE.wing, ...(over.wing ?? {}) },
  legs: { ...FLAMINGO_POSE.legs, ...(over.legs ?? {}) },
});

// Draws a flamingo with its body's centre at column ox and its feet on row y.
export function drawFlamingo(g, ox, y, dir, pose, T, o = {}) {
  const cells = new Cells();
  const p = pose;
  const bv = p.bv;
  const W = {
    ...FLAMINGO_WING,
    T,
    prim: T.prim,
    farPrim: T.farWingSh,
    paint: (s, q, u, far, fold) => FLAMINGO_WING.paint.call({ T }, s, q, u, far, fold),
  };
  const hip = [0.2, bv - 2.4];
  const shoulder = [-0.2, bv + 1.8];
  const A = 4.97;
  const legFoot = (L) => {
    const [fx, fl, tuck] = L;
    const stand = [hip[0] + fx, Math.max(0, fl)];
    const folded = [hip[0] + 0.6, hip[1] - 1.6];
    return [lerp(stand[0], folded[0], tuck), lerp(stand[1], folded[1], tuck)];
  };
  const drawLeg = (L, colour, far) => {
    const R = [hip[0] + (far ? -1.8 : 1.4), hip[1]];
    const F = legFoot(L);
    if (p.air > 0.5) return;
    leg(cells, R, F, A, A, colour, L[2] > 0.5 ? 0 : 2, -1);
  };
  if (p.air > 0.5) {
    const d = o.drop ?? 0;
    capsule(cells, [-3.5, bv - 1.2], [-8, bv - 1.8 - d], 0.55, 0.55, () => T.farLeg);
    capsule(cells, [-8, bv - 1.8 - d], [-11.5, bv - 1.9 - d * 1.5], 0.55, 0.55, () => T.farLeg);
  } else drawLeg(p.legs.f, T.farLeg, true);
  if (p.wing.fold < 0.95) {
    wing(cells, [shoulder[0] + 1.2, shoulder[1] + 0.2], { ...p.wing, b: p.wing.b * 0.8, k: p.wing.k * 0.9 }, W, true);
  }
  // The body, a tail and the wing tips behind.
  const z = p.air > 0.5 ? 0.82 : 1;
  capsule(cells, [-3.6, bv + 0.3], [-0.5, bv], 2.0 * z, 2.9 * z, lit(T));
  capsule(cells, [-0.5, bv], [3.0, bv - 0.2], 2.9 * z, 2.5 * z, lit(T));
  capsule(cells, [-3.6, bv + 0.5], [-5.2, bv + 0.9], 1.3 * z, 0.8 * z, lit(T));
  const B = [3.0, bv + 0.7];
  const H = neck(cells, B, p.neck, 1.1, 0.6, lit(T));
  const eyeAt = head(
    cells,
    H,
    p.bill,
    {
      r: 1.0,
      len1: 1.8,
      len2: 1.8,
      bend: p.bend,
      r0: 0.55,
      r1: 0.55,
      split: 0.5,
      base: T.billBase,
      tip: T.billTip,
      eye: true,
    },
    lit(T),
  );
  const near = new Cells();
  wing(near, shoulder, p.wing, W);
  for (const [u, v, c] of near.values()) cells.set(u, v, c);
  if (p.air > 0.5) {
    const d = o.drop ?? 0;
    capsule(cells, [-3.5, bv - 1.6], [-8.5, bv - 2.2 - d], 0.55, 0.55, () => T.leg);
    capsule(cells, [-8.5, bv - 2.2 - d], [-12, bv - 2.4 - d * 1.5], 0.55, 0.55, () => T.leg);
  } else drawLeg(p.legs.n, T.leg, false);
  tidy(cells);
  if (eyeAt && p.look < 0.5) cells.set(Math.floor(eyeAt[0]), Math.floor(eyeAt[1]), T.eye);
  paintCells(g, cells, ox, y, dir, { shadow: p.air > 0.5 ? null : [-3, 3], time: o.time ?? 0 });
  if (p.water > 0) {
    // Wading: the water hides the foot and the lower leg, and mirrors the bird.
    const [shallow, mid] = pondOf(g);
    g.ctx.globalAlpha = 0.55;
    g.ctx.fillStyle = shallow;
    g.ctx.fillRect(ox - 12, y - Math.round(p.water), 24, Math.round(p.water));
    g.ctx.globalAlpha = 0.85;
    g.ctx.fillStyle = mid;
    g.ctx.fillRect(ox - 12, y - Math.round(p.water), 24, 1);
    g.ctx.globalAlpha = 1;
  }
}

const FLAMINGO_FLY = flamingoPose({
  bv: 6,
  neck: [3.0, 0.2, 6.0, 0.8, 8.2, 1.3],
  bill: -0.15,
  bend: -0.9,
  air: 1,
  wing: { b: 0.2, lag: 0, sw: 0.55, k: 1, fold: 0 },
});
export function flamingoFly(c, over = {}) {
  const w = beat(c, { mid: 0.1, amp: 0.9 });
  return flamingoPose({
    ...FLAMINGO_FLY,
    bv: FLAMINGO_FLY.bv + w.bob,
    wing: { b: w.lift, lag: w.lag, sw: 0.55, k: 1, fold: 0 },
    ...over,
  });
}

// A flamingo wading at phase c (cycles): a slow high step, the ankle folding back, the neck's S
// nodding with each stride.
const FLAMINGO_REACH = 1.8;
export function flamingoWade(c, over = {}) {
  const [nx, nl] = footAt(c, FLAMINGO_REACH, 3.2);
  const [fx, fl] = footAt(c + 0.5, FLAMINGO_REACH, 3.2);
  const nod = Math.sin(c * TAU);
  return flamingoPose({
    bv: 11.2 - Math.abs(Math.sin(c * Math.PI)) * 0.4 + 0.2,
    neck: [3.2 + nod * 0.4, 1.6, -2.6 + nod * 0.6, 4.0, 1.6 + nod * 0.9, 8.2],
    legs: { n: [nx + 0.4, nl, 0], f: [fx - 1.4, fl, 0] },
    ...over,
  });
}

// ---- Rest ---------------------------------------------------------------------------------------------

const blink = (t, period, at = 0) => (t + at) % period < 0.14;

// The poses a swan takes when it stops, on land or on the water.
export const SWAN_RESTS = {
  land: ["stand", "graze", "look", "preen", "flap"],
  water: ["glide", "dabble", "preen", "flap"],
};
const SWAN_TARGET = {
  stand: SWAN_POSE,
  look: swanPose({ bv: 6.0, neck: [4.8, 0.8, -3.2, 5.0, 1.8, 9.6], bill: 0.05 }),
  graze: swanPose({ neck: [4.0, 2.0, 6.4, -2.0, 3.6, -5.6], bill: -1.3 }),
  preen: swanPose({ neck: [3.8, 3.0, 0.5, 9.0, -3.2, 4.8], bill: -2.3, bv: 5.4, pitch: 0.4 }),
};
const SWIM_TARGET = {
  dabble: swanPose({ bv: 4.4, pitch: 3.2, neck: [4.6, -0.6, 5.4, -6.5, 3.4, -12.5], bill: -1.5, water: 1 }),
  preen: swanPose({ bv: 2.3, pitch: 0.7, neck: [3.8, 3.0, 0.5, 9.0, -3.2, 4.8], bill: -2.3, water: 1 }),
};

// A swan at rest after `since` seconds of a stop `total` seconds long (`water` on the water, `legs` the
// feet it stopped on). It eases in from standing, holds the pose and eases out again; the flap stretch
// opens the wings, beats them three times and folds them.
export function swanRest(name, since, total, { water = false, legs = [0, 0], time = 0 } = {}) {
  const home = water ? swanSwim(0) : { ...SWAN_POSE, legs: { n: legs[0], f: legs[1] } };
  const target = water ? SWIM_TARGET[name] : SWAN_TARGET[name];
  const end = Math.max(total, 3.2);
  let p = home;
  if (target)
    p = timeline(
      [
        [0, home],
        [0.5, home],
        [1.4, target],
        [end - 1.2, target],
        [end - 0.3, home],
      ],
      since,
    );
  if (!water) p = { ...p, legs: home.legs };
  else p = { ...p, bv: p.bv + Math.sin((time * TAU) / 2) * 0.2 };
  if (name === "flap") {
    const open = ease((since - 0.6) / 0.5) * (1 - ease((since - 2.4) / 0.5));
    if (open > 0.01) {
      const w = beat((since - 1.1) * 2.5, { mid: 0.5, amp: 0.8 });
      p = {
        ...p,
        wing: mixPose(p.wing, { b: w.lift, lag: w.lag, sw: 0.7, k: 1, fold: 0 }, open),
        bv: p.bv + w.bob * 0.4 * open,
      };
    }
  }
  if (!water) p = { ...p, bv: p.bv + Math.sin((time * TAU) / 2.4) * 0.18 };
  return { ...p, look: blink(time, 3.7) ? 1 : 0 };
}

const FSTAND = flamingoPose();
const FEED = flamingoPose({ neck: [3.5, 1.5, 6.0, -4.5, 3.8, -10.2], bill: -0.35, bend: 0.7, bv: 10.9 });
const FREST = flamingoPose({
  bv: 10.6,
  neck: [2.4, 2.0, 1.5, 4.0, -1.5, 3.2],
  bill: -2.7,
  bend: 0.2,
  look: 1,
  legs: { n: [-0.4, 0, 0], f: [0, 0, 1] },
});

// A flamingo at rest: it filters with its head down and sweeping, or tucks one leg up and its head
// on its back with its eye shut.
export function flamingoRest(name, since, total, { legs = null, time = 0 } = {}) {
  const home = legs ? { ...FSTAND, legs } : FSTAND;
  const target = name === "feed" ? FEED : name === "rest" ? FREST : null;
  const end = Math.max(total, 3.2);
  let p = home;
  if (target)
    p = timeline(
      [
        [0, home],
        [0.6, home],
        [1.8, target],
        [end - 1.4, target],
        [end - 0.2, home],
      ],
      since,
    );
  if (name === "feed") {
    const down = ease((since - 0.6) / 1.2) * (1 - ease((since - (end - 1.6)) / 1.2));
    p = { ...p, neck: p.neck.map((v, i) => (i === 4 ? v + Math.sin(time * 2.4) * 1.4 * down : v)) };
  }
  return { ...p, look: p.look > 0.5 || blink(time, 3.7, 1) ? 1 : 0 };
}

// Long-necked birds

// Built from parts (longneck.js): the trumpeter and whooper swans (Yellowstone, Iceland) and the lesser
// flamingo (Serengeti). A swan walks with its feet planted: its stride clock s.c (critters.js stride) grows
// with the ground it covers, SWAN_STRIDE being [px a stride, seconds a stride] and SWAN_SPEED the speed that
// goes with it; swanStep() keeps it. It eases into a stop and plays the pose rest() picked from
// swanPoses(s): on land it stands, grazes with its neck bent to the grass (a stop with no pose
// grazes), looks about, preens or stretches and flaps; on the water (s.swimming, at the water line s.y)
// it glides with a wake, dabbles with its head under and its tail up, preens or flaps. A flyer (pose
// "fly") beats slow and deep with its neck stretched out and its feet trailing. A flamingo flies the
// same way, or, when it has a state (a walker), wades on slow high steps (b.water the depth of the
// water over its feet) and rests: it filters with its head down or stands on one leg. Palettes: swan [white, shade, bill base, bill tip] (the scene may name another, as `pal`)
// and flamingo [pink, wing, dark], with groundShadow, and pond (or fjord, or water) for the water.
export const SWAN_STRIDE = [SWAN_SPEED, 1.1];
export const swanSpeed = SWAN_SPEED / SWAN_STRIDE[1];
export const swanPoses = (s) => SWAN_RESTS[s.swimming ? "water" : "land"];

// Keeps a swan's or a flamingo's stride clock; call it after wander(), with x0 where it stood before.
export function longNeckStep(w, x0, dt, [px, cycle]) {
  stride(w, x0, dt, px, cycle);
}

// The swan's and the flamingo's shared gait and rest: the walking pose at stride c, or the rest pose
// the bird eased into once its feet stopped where they were.
function walkOrRest(s, time, { walkAt, rest, stand }) {
  const c = s.c ?? (s.phase ?? 0) * 0.25;
  const moving = s.moving ?? s.state === "walk";
  const held = s.c != null && c - Math.floor(c) > 1e-6;
  if (moving || held) {
    const w = walkAt(c);
    const since = s.since == null ? 1 : time - s.since;
    return moving && since < 0.3 ? mixPose(stand(w), w, smooth(since / 0.3)) : w;
  }
  const still = stillOf(s, time);
  const w = walkAt(Math.round(c));
  const r = rest(still, still + (s.timer ?? 60), w);
  return s.c == null ? r : mixPose(w, r, smooth(Math.min(1, still / 0.3)));
}

export function swanAt(g, s, time = 0) {
  if (g.trace) return g.trace.draw(swanAt, g, s, time);
  const T = swanTones(g, s.pal ?? "swan");
  const dir = s.dir;
  const phase = s.phase ?? 0;
  if (s.pose === "fly") {
    const c = time * 1.5 + phase * 0.37;
    const y = Math.round(s.y + Math.sin(time * 1.1 + phase));
    drawSwan(g, Math.round(s.x), y + 7, dir, swanFly(c), T, { time, drop: Math.sin(c * Math.PI * 2) * 0.4 });
    return;
  }
  const y = feet(g, s);
  const ox = Math.round(s.x) + dir * 3;
  const sit = s.state === "sit" ? (s.pose ?? "graze") : "stand";
  if (s.swimming) {
    const moving = s.moving ?? s.state === "walk";
    if (moving) {
      wake(g, ox, y, dir, time, { speed: 1 });
      drawSwan(g, ox, y, dir, swanSwim(time + phase), T, { time });
      return;
    }
    const still = stillOf(s, time);
    const total = still + (s.timer ?? 60);
    wake(g, ox, y, dir, time, { speed: 0.3 });
    drawSwan(g, ox, y, dir, swanRest(s.pose ?? "glide", still, total, { water: true, time }), T, { time });
    if (s.pose === "dabble") for (const a of [1.4, 2.2, 3]) ring(g, ox + dir * 4, y, (still - a) / 0.8, 6);
    return;
  }
  const p = walkOrRest(s, time, {
    walkAt: (c) => swanWalk(c),
    rest: (since, total, w) => swanRest(sit, since, total, { legs: [w.legs.n, w.legs.f], time }),
    stand: (w) => swanRest("stand", 1, 60, { legs: [w.legs.n, w.legs.f], time }),
  });
  drawSwan(g, ox, y, dir, p, T, { time });
}

// A flamingo in flight: a pale pink body, a red wing with black flight feathers, its neck held out
// ahead and its legs trailing. On the ground (b.state) it wades or rests. Its palette is flamingo:
// [pink, wing, dark].
export function flamingoAt(g, b, time = 0) {
  if (g.trace) return g.trace.draw(flamingoAt, g, b, time);
  const T = flamingoTones(g);
  const dir = b.dir;
  if (b.state == null || b.pose === "fly") {
    const c = time * 1.5 + (b.phase ?? 0) * 0.37 + 0.2;
    const y = Math.round(b.y + Math.sin(time * 1.2 + (b.phase ?? 0)) * 2);
    drawFlamingo(g, Math.round(b.x), y + 7, dir, flamingoFly(c), T, { time, drop: Math.sin(c * Math.PI * 2) * 0.4 });
    return;
  }
  const y = feet(g, b);
  const ox = Math.round(b.x) + dir * 2;
  const sit = b.state === "sit" ? (b.pose ?? "stand") : "stand";
  const keep = (w) => w.legs;
  const p = walkOrRest(b, time, {
    walkAt: (c) => flamingoWade(c),
    rest: (since, total, w) => flamingoRest(sit, since, total, { legs: keep(w), time }),
    stand: (w) => flamingoRest("stand", 1, 60, { legs: keep(w), time }),
  });
  drawFlamingo(g, ox, y, dir, { ...p, water: b.water ?? 0 }, T, { time });
}

export const FAMILY = {
  id: "long-necked-birds",
  title: "Long-necked birds",
  group: "Birds",
  differ: "neck, colour, legs",
  drivers: {
    swanAt: {
      member: () => "swan",
      role: (a) => (a.pose === "fly" ? "flyer" : a.swimming ? "swimmer" : "walker"),
      day: (a, _args, scene) => scene === "yellowstone" || a?.pose === "fly",
    },
    flamingoAt: { role: "flyer", member: () => "flamingo", day: true },
  },
};
