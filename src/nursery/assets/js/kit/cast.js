// The Hundred Acre storybook cast: Pooh, Piglet, Tigger, Rabbit and Roo, each with the look of
// Shepard's drawings. Built from parts, as the cats are: a body, legs, arms,
// a head and a tail, four tones lit from above, a soft ground shadow. Every character walks its own way
// (Pooh waddles, Piglet trots, Tigger bounds, Rabbit and Roo hop), eases into and out of a stop, and
// rests: Pooh, Piglet, Tigger and Roo sit and Rabbit relaxes, each with a small habit. Pooh and Piglet
// also hang from their balloons, and the swarm that chases them is drawn here too.
// A character is drawn in its own coordinates, x forward from its back and y up from the sole of its
// feet, onto a small canvas that drawCast() puts on the page, mirrored when it faces left.
// castPose(id, walker, time) turns a walker (critters.js, settle()) into the pose to draw, and
// animals.js's poohAt, pigletAt, tiggerAt, rabbitAt and rooAt call the two.
import { clamp, frac, lerp, mix, shadowColour, smooth, TAU } from "./pixel.js";

const R = Math.round;

// ---- The pixel canvas and its shapes ----------------------------------------------------------
// Later pixels cover earlier ones. flush() puts a canvas on the page.

function canvas() {
  const m = new Map();
  const put = (x, y, c) => {
    if (c) m.set(`${x},${y}`, [x, y, c]);
  };
  return { m, put };
}

function flush(g, c, ox, feet, dir = 1) {
  for (const [x, y, col] of c.m.values()) {
    g.ctx.fillStyle = col;
    g.ctx.fillRect(dir > 0 ? ox + x : ox - x, feet - 1 - y, 1, 1);
  }
}

// A filled ellipse about (cx, cy): the pixels whose centres fall inside it.
export function ell(cx, cy, rx, ry, e = 2) {
  const out = [];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (Math.abs((x - cx) / rx) ** e + Math.abs((y - cy) / ry) ** e <= 1.001) out.push([x, y]);
    }
  }
  return out;
}

const box = (x, y, w, h) => {
  const out = [];
  for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) out.push([x + i, y + j]);
  return out;
};

// A limb from (x0, y0) to (x1, y1) swept by a w x h brush. Where two steps meet only at a corner the
// cell between is filled, so every row joins the next along an edge.
export function cap(x0, y0, x1, y1, w = 1, h = 1) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const out = new Map();
  const add = (x, y) => {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) out.set(`${x + i},${y + j}`, [x + i, y + j]);
  };
  let px = null;
  let py = null;
  for (let i = 0; i <= n; i += 1) {
    const x = R(lerp(x0, x1, i / n));
    const y = R(lerp(y0, y1, i / n));
    if (px !== null && x !== px && y !== py) add(x, py);
    add(x, y);
    px = x;
    py = y;
  }
  return [...out.values()];
}

// The light key of the i-th pixel from the top of a column of n: H highlight, T base, S shade, U
// the darkest, underneath.
const keyAt = (i, n) => {
  if (n === 1) return "T";
  if (n === 2) return i ? "S" : "T";
  if (n === 3) return "HTS"[i];
  if (n === 4) return "HTSU"[i];
  if (i === 0) return "H";
  if (i === n - 1) return "U";
  return i >= n - Math.max(2, R(n * 0.4)) ? "S" : "T";
};

// Lays a shape in tones lit from above: by column, a highlight on top, the base, the shade on the
// lower flank and the darkest underneath. fn(key, x, y) chooses the colour.
export function lit(c, pts, fn) {
  const cols = new Map();
  for (const [x, y] of pts) {
    if (!cols.has(x)) cols.set(x, new Set());
    cols.get(x).add(y);
  }
  for (const [x, ys] of cols) {
    const sorted = [...ys].sort((a, b) => b - a);
    let run = [];
    const done = () => {
      run.forEach((y, i) => {
        c.put(x, y, fn(keyAt(i, run.length), x, y));
      });
      run = [];
    };
    for (const y of sorted) {
      if (run.length && run[run.length - 1] - y > 1) done();
      run.push(y);
    }
    done();
  }
}

const flat = (c, pts, col) => {
  for (const [x, y] of pts) c.put(x, y, col);
};

// ---- Tones -------------------------------------------------------------------------------------

const tn = (base, shade, dark) => ({
  H: mix(base, "#ffffff", 0.22),
  T: base,
  S: shade,
  U: mix(shade, dark, 0.4),
  L: mix(shade, dark, 0.22),
});

// Four tones for each coat from the scene's palette, so night is the same tones, darkened.
export function castTones(pal) {
  const ink = pal.pooh[3];
  const [orange, stripe, cream] = pal.tigger;
  const [rfur, rshade, rwhite] = pal.rabbit;
  const [ofur, oshade] = pal.roo;
  return {
    ink,
    pooh: tn(pal.pooh[0], pal.pooh[1], ink),
    shirt: tn(pal.pooh[2], mix(pal.pooh[2], ink, 0.28), ink),
    piglet: tn(pal.piglet[0], pal.piglet[1], ink),
    jumper: tn(pal.piglet[2], mix(pal.piglet[2], ink, 0.22), ink),
    band: tn(pal.piglet[3], mix(pal.piglet[3], ink, 0.3), ink),
    tigger: tn(orange, mix(orange, stripe, 0.35), stripe),
    stripe,
    cream: tn(cream, mix(cream, orange, 0.35), mix(orange, stripe, 0.3)),
    rabbit: tn(rfur, rshade, ink),
    white: tn(rwhite, mix(rwhite, rshade, 0.35), rshade),
    roo: tn(ofur, oshade, ink),
    rooShirt: tn(pal.roo[2], mix(pal.roo[2], ink, 0.28), ink),
    pot: tn(pal.honey[0], pal.honey[1], ink),
    label: pal.honey[2],
    gold: pal.honey[3],
  };
}

// ---- Timing ------------------------------------------------------------------------------------

// Life while standing: breath (0..1), a blink now and then, and a glance to one side and the other.
const breathAt = (t, seed = 0, period = 2.6) => 0.5 - 0.5 * Math.cos((TAU * (t + seed)) / period);
const blinkAt = (t, seed = 0) => frac((t + seed) / 3.3) < 0.05;
function lookAt(t, seed = 0) {
  const u = frac((t + seed) / 8);
  return u > 0.55 && u < 0.68 ? 1 : u > 0.78 && u < 0.9 ? -1 : 0;
}

// A leg on a stride: stance, the foot slides back under the body at the body's own speed; swing, it
// is lifted and carried forward. Returns the foot's reach (forward is positive) and its lift.
function legAt(ph, reach, stance = 0.6) {
  const u = frac(ph);
  if (u < stance) return { fx: reach * (1 - (2 * u) / stance), up: 0 };
  const k = (u - stance) / (1 - stance);
  return { fx: -reach + 2 * reach * smooth(k), up: k > 0.15 && k < 0.85 ? 1 : 0 };
}
// ---- Pooh --------------------------------------------------------------------------------------
// A round bear in a red shirt riding up over his tummy, a round head with two small ears and a short
// snout. He walks with a waddle (the body rolls over each planted foot and dips at every step) and,
// stopped, breathes, blinks and looks about. Sitting he rests his legs out in front, a honey pot in
// his lap and a paw now and then to his mouth.
//   p: amp, ph (the stride's phase), breath, blink, lx (look: -1, 0, 1), sit (0..1), paw (0..1),
//      hold (a paw raised to a balloon, drawn from p.balloon), air (hanging: legs swing free), swing (hang sway)
function pooh(c, K, p) {
  const F = K.pooh;
  const Sh = K.shirt;
  const walking = p.amp > 0.2 && !p.air;
  const sit = p.sit ?? 0;
  const stage = sit < 0.2 ? 0 : sit < 0.5 ? 1 : sit < 0.85 ? 2 : 3;
  const dip = walking && Math.cos(p.ph * 2 * TAU) > 0.3 ? 1 : 0;
  const bb = stage === 0 ? 2 - dip : stage === 1 ? 1 : 0;
  const roll = walking ? R(Math.sin(p.ph * TAU) * 0.9) : p.air ? (p.swing ?? 0) : 0;
  const lag = walking ? R(Math.sin((p.ph - 0.1) * TAU) * 0.9) - roll : 0;
  const hx = roll + (p.lx ?? 0);
  const inhale = (p.breath ?? 0) > 0.55 ? 1 : 0;
  const ink = K.ink;

  // legs
  if (stage === 0) {
    const reach = 1.3;
    [
      [3, 0.5, true],
      [5, 0, false],
    ].forEach(([hipX, off, far]) => {
      const L = walking ? legAt(p.ph + off, reach) : { fx: 0, up: 0 };
      const swing = p.air ? R(Math.sin((p.t ?? 0) * 2.4 + (far ? 1.6 : 0)) * 1.2) : 0;
      const top = p.air ? bb : Math.max(bb - 1, 0);
      const pts = cap(hipX, top, clamp(hipX + R(L.fx) + swing, 2, 6), p.air ? 0 : L.up, 2, 1);
      if (far) flat(c, pts, F.L);
      else lit(c, pts, (k) => F[k === "H" ? "T" : k]);
    });
  } else {
    const fwd = stage === 1 ? 2 : stage === 2 ? 4 : 6;
    const far = cap(3, 1, 3 + fwd - 1, stage === 3 ? 1 : 0, 1, stage === 3 ? 1 : 2);
    flat(c, stage === 3 ? box(5, 1, 5, 1).concat(box(5, 0, 5, 1)) : far, F.L);
    const near = stage === 3 ? box(4, 0, 5, 2) : cap(4, 0, 4 + fwd - 1, 0, 1, stage === 1 ? 1 : 2);
    lit(c, near, (k) => F[k === "H" ? "T" : k]);
    if (stage === 3) {
      c.put(9, 0, F.S);
      c.put(9, 1, F.T);
    }
  }
  // the tail, a little round one that goes with the hips
  c.put(0 + R(roll * 0.6), bb + 1, F.S);

  // far arm, behind the body
  const sw = walking ? R(Math.sin(p.ph * TAU) * 1.1) : 0;
  if (stage === 0 && !p.hold) flat(c, cap(2 + roll, bb + 4, 2 + roll - sw, bb + 2, 1, 1), F.L);

  // the body: a round tummy, the shirt riding up over its top
  const body = ell(4.2 + roll, bb + 2.5, 3.7, 3.05, 2.7);
  if (inhale) body.push([8 + roll, bb + 2], [8 + roll, bb + 3]);
  lit(c, body, (k, x, y) => {
    if (y === bb + 3) return Sh.S;
    if (y > bb + 3) return Sh[k];
    return F[y === bb ? "S" : y === bb + 2 && x >= 6 + roll ? "H" : "T"];
  });

  // head, ears, snout
  const hy = bb + 7.5;
  const head = ell(5.1 + hx, hy, 2.8, 2.05);
  const sx = 8 + hx;
  const sy = Math.round(hy - 1.5);
  head.push([sx, sy], [sx, sy + 1]);
  lit(c, head, (k) => F[k === "S" ? "S" : k === "H" ? "T" : k]);
  c.put(sx, sy + 1, ink);
  c.put(6 + hx, sy + 2, p.blink ? F.S : ink);
  const earY = Math.round(hy + 2.5);
  const topXs = head.filter(([, y]) => y === Math.max(...head.map(([, yy]) => yy))).map(([x]) => x);
  const lo = Math.min(...topXs);
  const hi = Math.max(...topXs);
  c.put(clamp(lo + lag, lo, hi), earY, F.S);
  c.put(clamp(hi + lag, lo, hi), earY, F.H);

  // the near arm over the shirt
  if (p.hold) {
    flat(c, cap(2 + roll, bb + 4, 1 + roll, bb + 9, 1, 1), F.S);
    c.put(1 + roll, bb + 10, F.T);
    if (p.balloon) balloonAt(c, K, 1 + roll, bb + 11, p.balloon);
  } else if (stage <= 1) {
    const armX = 6 + roll;
    flat(c, cap(armX, bb + 4, armX + sw, bb + 1, 1, 1), F.S);
    c.put(armX + sw, bb + 1, F.T);
  } else {
    // the pot in his lap, the paw in it or at his mouth
    const px = stage === 3 ? 7 : 6;
    potAt(c, K, px, bb + 1 + (stage === 3 ? 1 : 0));
    const paw = p.paw ?? 0;
    const hxp = R(lerp(px + 1, 9 + hx - roll, paw));
    const hyp = R(lerp(bb + 5, sy + 1, paw));
    flat(c, cap(6 + roll, bb + 4, hxp, hyp, 1, 1), F.S);
    c.put(hxp, hyp, paw > 0.5 ? K.gold : F.T);
  }
}

// A honey pot: a round-bellied jar with a pale label and honey on its rim. The base sits on row y.
function potAt(c, K, x, y) {
  lit(c, box(x, y, 4, 3), (k) => K.pot[k]);
  flat(c, box(x + 1, y + 1, 2, 1), K.label);
  flat(c, box(x + 1, y + 3, 2, 1), K.pot.U);
  c.put(x + 1, y + 4, K.gold);
}

// ---- Piglet ------------------------------------------------------------------------------------
// Very small and pink, upright ears, a pointed snout and a green jumper with a band. He trots on his
// tiny legs, quickly, to keep up with Pooh, the body hopping a pixel at every beat and the ears and
// curly tail a beat behind it.
function piglet(c, K, p) {
  const F = K.piglet;
  const walking = p.amp > 0.2 && !p.air;
  const sit = p.sit ?? 0;
  const seated = sit > 0.55;
  const hop = walking && Math.sin(p.ph * 2 * TAU) > 0.2 ? 1 : 0;
  const bb = (seated ? 0 : sit > 0.2 ? 0 : 1) + (p.air ? 0 : hop);
  const hx = p.lx ?? 0;
  const ink = K.ink;
  // legs: one pixel each, the far pair apart from the near
  if (!seated) {
    [
      [3, 0.5, true],
      [1, 0, false],
    ].forEach(([hipX, off, far]) => {
      const L = walking ? legAt(p.ph + off, 1.4, 0.55) : { fx: 0, up: 0 };
      const swing = p.air ? R(Math.sin((p.t ?? 0) * 3 + (far ? 1.6 : 0))) : 0;
      const x = hipX + R(L.fx) + swing;
      const y = p.air ? 0 : L.up ? 1 : 0;
      const topY = Math.max(0, bb - 1);
      const botY = Math.min(y, topY);
      for (let ly = botY; ly <= topY; ly += 1) {
        c.put(x, ly, far ? F.L : F.S);
      }
      if (sit > 0.2 && sit <= 0.55) c.put(x + 1, 0, far ? F.L : F.S);
    });
  } else {
    c.put(5, 0, F.L);
    c.put(4, 0, F.S);
  }
  // the tail, a small curl at the hips
  const flick = p.flick ? 1 : 0;
  c.put(-1, bb + 2 + flick, F.S);
  if (!seated || flick) c.put(-1, bb + 3 + flick, F.T);
  // the jumper: green, with a darker band round the middle
  const jy = bb;
  lit(c, box(0, jy, 5, 3), (k, _x, y) => (y === jy + 1 ? K.band[k === "H" ? "T" : k === "U" ? "S" : k] : K.jumper[k]));
  if (p.breath > 0.55) c.put(5, jy + 1, K.jumper.S);
  // the arm, a stub in front
  if (p.hold) {
    flat(c, cap(1, jy + 2, 0, jy + 6, 1, 1), F.S);
    c.put(0, jy + 7, F.T);
    if (p.balloon) balloonAt(c, K, 0, jy + 8, p.balloon);
  } else {
    const ax = walking ? 4 + R(Math.sin(p.ph * TAU)) : 4;
    c.put(ax, jy + 1, F.S);
  }
  // the head: a round pink face and a snout out in front
  const top = jy + 3;
  lit(c, box(1 + hx, top, 4, 3), (k) => F[k === "U" ? "S" : k === "H" ? "H" : k]);
  c.put(5 + hx, top + 1, F.S);
  c.put(5 + hx, top, F.T);
  c.put(4 + hx, top + 1, p.blink ? F.T : ink);
  // upright ears
  const ey = top + 3;
  c.put(2 + hx, ey, F.H);
  c.put(4 + hx, ey, F.S);
  if (p.ear) c.put(2 + hx, ey - 1, F.T);
}

// ---- Tigger ------------------------------------------------------------------------------------
// Orange with dark stripes, a big round head with a pale muzzle, and a long tail ringed to a dark
// tip. He bounces: crouching on his legs and tail, springing, and landing again with the tail coiling
// under him, and when he stops he sits up on the coil of his tail.
//   p: amp, ph (the bound's phase), breath, blink, lx, sit (0..1), flick
function tigger(c, K, p) {
  const F = K.tigger;
  const Cr = K.cream;
  const walking = p.amp > 0.2;
  const sit = p.sit ?? 0;
  const ink = K.stripe;
  const u = frac(p.ph);
  const CW = 0.32;
  const grounded = !walking || u < CW;
  const a = grounded ? 0 : (u - CW) / (1 - CW);
  const lift = walking && !grounded ? R(3.4 * Math.sin(Math.PI * a)) : 0;
  const squash = walking && (u < CW * 0.55 || u > 0.94) ? 1 : 0;
  if (sit > 0.3) return tiggerSit(c, K, p, smooth(clamp((sit - 0.3) / 0.6, 0, 1)));
  const crouch = sit > 0.12 ? 1 : 0;
  const bb = 2 + lift - squash - crouch;
  const hx = p.lx ?? 0;
  // legs: hind pair at the back, fore pair at the front; the far ones darker and apart
  const legs = [
    [3, true, false],
    [6, true, true],
    [1, false, false],
    [8, false, true],
  ];
  for (const [hipX, far, fore] of legs) {
    let fx = 0;
    const top = Math.max(bb - 1, 0);
    let foot = 0;
    if (walking) {
      if (grounded) {
        const k = u / CW;
        fx = R(lerp(fore ? 1.4 : 0.8, fore ? -0.8 : -1.6, k));
      } else {
        fx = fore ? R(lerp(0, 2, a)) : R(lerp(-1, -2, Math.min(1, a * 2)));
        if (!fore && a > 0.55) fx = R(lerp(-2, 0, (a - 0.55) / 0.45));
        foot = Math.max(0, bb - 2);
      }
    }
    const pts = cap(hipX, top, hipX + fx, foot, 1, 1);
    if (far) flat(c, pts, F.L);
    else lit(c, pts, (k) => F[k === "H" ? "T" : k]);
  }
  // the tail: long, ringed, and springing; it trails behind him in the air
  const trail = walking && !grounded ? -R(2 * Math.sin(Math.PI * a)) : 0;
  const hold = squash ? 2 : 0;
  const tailP = [
    [0, bb + 2],
    [-2, bb + 3 - Math.min(hold, 1)],
    [-2 + trail, bb + 6 - hold],
    [-1 + trail * 2, bb + 8 - hold - (p.flick ? 0 : 1) + (p.flick ? 1 : 0)],
  ];
  tailRaster(c, K, tailP);
  // the body, long and low: orange above, cream belly, dark stripes over the back
  const body = ell(4.1, bb + 1.5, 4.5, 2.0);
  lit(c, body, (k, x, y) => {
    if (y === bb && x > 1 && x < 8) return Cr[k === "H" ? "T" : k === "U" ? "S" : k];
    if (y >= bb + 2 && (x === 2 || x === 4 || x === 6)) return K.tigger.U;
    return F[k];
  });
  if (p.breath > 0.55) c.put(5, bb + 4, F.H);
  // the head: big and round, a pale muzzle and a dark nose, striped, a round ear at each side
  const hy = bb + 4;
  const head = ell(9.9 + hx, hy, 2.75, 2.6, 2.6);
  lit(c, head, (k) => F[k === "U" ? "S" : k]);
  flat(c, box(11 + hx, bb + 2, 2, 2), Cr.T);
  c.put(11 + hx, bb + 2, Cr.S);
  c.put(12 + hx, bb + 3, ink);
  c.put(10 + hx, bb + 4, p.blink ? F.S : ink);
  c.put(9 + hx, bb + 5, K.stripe);
  c.put(10 + hx, bb + 6, K.stripe);
  const topY = Math.max(...head.map(([, y]) => y));
  const topXs = head.filter(([, y]) => y === topY).map(([x]) => x);
  c.put(Math.min(...topXs), topY + 1, F.S);
  c.put(Math.max(...topXs), topY + 1, F.H);
}

function tailRaster(c, K, pts) {
  const out = [];
  for (let i = 1; i < pts.length; i += 1) out.push(...cap(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 1, 1));
  const seen = new Set();
  const list = out.filter(([x, y]) => (seen.has(`${x},${y}`) ? false : seen.add(`${x},${y}`)));
  list.forEach(([x, y], i) => {
    const n = list.length;
    const dark = i >= n - 2 || (i % 4 === 2 && i < n - 3);
    c.put(x, y, dark ? K.stripe : K.tigger.S);
  });
}

// Tigger sat up on the coil of his tail: an upright body striped across the back, the big round head
// with its pale muzzle above, and the tail curling up behind and flicking. `h` (0..1) is how far he
// has drawn himself up, from a squat to sitting tall.
function tiggerSit(c, K, p, h) {
  const F = K.tigger;
  const Cr = K.cream;
  const hx = p.lx ?? 0;
  const flick = p.flick ? 1 : 0;
  const up = R(h * 2);
  // the spring of his tail beneath him
  flat(c, box(-2, 0, 3, 1), K.stripe);
  flat(c, box(-1, 1, 3, 1), F.S);
  // the tail up behind
  tailRaster(c, K, [
    [-2, 1],
    [-3, 3 + up],
    [-2 + flick, 5 + up * 2 + flick],
  ]);
  // the body
  const body = ell(2.4, 2.3 + h * 0.5, 2.6, 2.4 + h * 0.6, 2.6);
  lit(c, body, (k, x, y) => {
    if (x >= 4 && y < 4 + up) return Cr[k === "H" ? "T" : k === "U" ? "S" : k];
    if (y >= 2 && (x === 0 || x === 2)) return K.tigger.U;
    return F[k];
  });
  if (p.breath > 0.55) c.put(5, 2, Cr.T);
  // the arm folded on his tummy
  flat(c, cap(3, 4 + up, 5, 2, 1, 1), F.S);
  // the head
  const hy = 6.2 + up;
  const head = ell(3.1 + hx, hy, 2.6, 2.4, 2.6);
  lit(c, head, (k) => F[k === "U" ? "S" : k]);
  const y0 = Math.round(hy - 1.5);
  flat(c, box(5 + hx, y0, 2, 2), Cr.T);
  c.put(5 + hx, y0, Cr.S);
  c.put(6 + hx, y0 + 1, K.stripe);
  c.put(4 + hx, y0 + 2, p.blink ? F.S : K.stripe);
  c.put(2 + hx, y0 + 3, K.stripe);
  const topY = Math.max(...head.map(([, y]) => y));
  const xs = head.filter(([, y]) => y === topY).map(([x]) => x);
  c.put(Math.min(...xs), topY + 1, F.S);
  c.put(Math.max(...xs), topY + 1, F.H);
}

// ---- Rabbit ------------------------------------------------------------------------------------
// Upright on long hind feet, two tall ears, a white scut. He hops briskly: a short crouch, a spring
// that stretches him forward with his ears swept back, and a landing on his long feet.
//   p: amp, ph, breath, blink, lx, sit (0..1: relaxed, ears down), ear (0..1 an ear's twitch), groom
function rabbit(c, K, p) {
  const F = K.rabbit;
  const W = K.white;
  const walking = p.amp > 0.2;
  const u = frac(p.ph);
  const CW = 0.3;
  const grounded = !walking || u < CW;
  const a = grounded ? 0 : (u - CW) / (1 - CW);
  const lift = walking && !grounded ? R(3.4 * Math.sin(Math.PI * a)) : 0;
  const crouch = walking && (u < CW * 0.5 || u > 0.93) ? 1 : 0;
  const sit = p.sit ?? 0;
  const relaxed = sit > 0.5;
  const bb = 1 + lift - crouch - (relaxed ? 1 : 0);
  const lean = walking && !grounded ? R(Math.sin(Math.PI * a) * 1.2) : 0;
  const hx = (p.lx ?? 0) + lean;
  // the long hind feet: planted through the start of the spring, trailing as he leaps, reaching to land
  const trailX =
    walking && !grounded ? -R(2 * Math.sin(Math.PI * a)) + (a > 0.6 ? R(lerp(0, 3, (a - 0.6) / 0.4)) : 0) : 0;
  const footY = lift;
  flat(c, box(2 + trailX + (relaxed ? 0 : 1), footY, 4, 1), F.L);
  flat(c, box(0 + trailX + (relaxed ? 1 : 0), footY, 4, 1), F.S);
  c.put(3 + trailX + (relaxed ? 1 : 0), footY, F.T);
  // haunch and body, upright on his hind legs
  const haunch = ell(1.2, bb + 1.0, 1.7, 1.5, 2.4);
  lit(c, haunch, (k) => F[k === "H" ? "T" : k === "U" ? "S" : k]);
  const bx = R(lean * 0.5);
  const body = ell(1.7 + bx, bb + 2.3, 1.9, 2.2, 2.6);
  lit(c, body, (k, x, y) => (x >= 3 + bx && y < bb + 3 && y > bb ? W[k === "H" ? "T" : k] : F[k]));
  if (p.breath > 0.55) c.put(4 + bx, bb + 2, W.T);
  // the white scut, going with the hips
  flat(c, box(-1 + R(lean * 0.3), bb + 1, 1, 2), W.T);
  // forepaws held at the chest, or drawn up to wash his face
  const groom = p.groom ?? 0;
  const hy = bb + 4;
  const wx = 4 + bx + R(lerp(0, 1, groom));
  const wy = R(lerp(bb + 2, hy + 1, groom));
  flat(c, cap(2 + bx, bb + 3, wx, wy, 1, 1), F.S);
  c.put(wx, wy, F.H);
  // the head, a snout out in front
  const head = box(1 + hx, hy, 4, 3).filter(([x, y]) => !(x === 1 + hx && y === hy));
  lit(c, head, (k) => F[k === "U" ? "S" : k]);
  c.put(5 + hx, hy + 1, F.S);
  c.put(5 + hx, hy + 2, F.T);
  c.put(3 + hx, hy + 1, p.blink ? F.S : K.ink);
  // the ears: tall and upright, or laid back when he is easy or leaping; one twitches
  const droop = relaxed ? 0.8 : walking && !grounded ? 1 : 0;
  const tw = p.ear ?? 0;
  const ear = (x0, len, flatTone, back) => {
    const tipX = x0 - R(droop * len * 0.7) - back;
    const tipY = hy + 3 + len - 1 - R(droop * len * 0.45);
    const pts = cap(x0, hy + 3, tipX, tipY, 1, 1);
    if (flatTone) flat(c, pts, flatTone);
    else lit(c, pts, (k) => F[k === "H" ? "T" : k === "U" ? "S" : k]);
  };
  ear(4 + hx, 3, F.L, 0);
  ear(2 + hx, 4, null, R(tw));
}

// ---- Roo ---------------------------------------------------------------------------------------
// A joey about Piglet's size in a blue shirt, long ears, big feet and a thin tail. He hops in little
// hops, the tail swinging up behind him in the air.
//   p: amp, ph, breath, blink, lx, sit (0..1), ear
function roo(c, K, p) {
  const F = K.roo;
  const walking = p.amp > 0.2;
  const sit = p.sit ?? 0;
  const u = frac(p.ph);
  const CW = 0.28;
  const grounded = !walking || u < CW;
  const a = grounded ? 0 : (u - CW) / (1 - CW);
  const lift = walking && !grounded ? R(3.2 * Math.sin(Math.PI * a)) : 0;
  const crouch = walking && (u < CW * 0.5 || u > 0.93) ? 1 : 0;
  const seated = sit > 0.5;
  const bb = 1 + lift - crouch - (seated ? 1 : 0);
  const hx = p.lx ?? 0;
  const trail = walking && !grounded ? -R(1.4 * Math.sin(Math.PI * a)) + (a > 0.65 ? 2 : 0) : 0;
  // big feet
  const footY = lift;
  if (seated) {
    flat(c, box(2, 0, 4, 1), F.L);
    flat(c, box(1, 0, 4, 1), F.S);
    c.put(5, 0, F.T);
  } else {
    flat(c, box(1 + trail, footY, 4, 1), F.L);
    flat(c, box(0 + trail, footY, 4, 1), F.S);
    c.put(3 + trail, footY, F.T);
  }
  // the thin tail
  const lifted = walking && !grounded ? 1 : 0;
  const tailPts = seated
    ? [
        [-1, 0],
        [-3, 0],
        [-4, 1],
      ]
    : [
        [0, bb + 1],
        [-2, bb + (lifted ? 2 : 0)],
        [-3, bb + (lifted ? 3 : 0)],
      ];
  for (let i = 1; i < tailPts.length; i += 1) flat(c, cap(...tailPts[i - 1], ...tailPts[i], 1, 1), F.S);
  // body in his blue shirt
  lit(c, box(0, bb, 4, 3), (k, _x, y) => (y === bb ? K.rooShirt.S : K.rooShirt[k === "U" ? "S" : k]));
  if (p.breath > 0.55) c.put(4, bb + 1, K.rooShirt.S);
  // an arm
  c.put(3, bb + 1, F.S);
  // the head: round, a snout in front, long ears
  const hy = bb + 3;
  lit(c, box(1 + hx, hy, 4, 3), (k) => F[k === "U" ? "S" : k]);
  c.put(5 + hx, hy + 1, F.S);
  c.put(5 + hx, hy, F.T);
  c.put(3 + hx, hy + 1, p.blink ? F.T : K.ink);
  const droop = walking && !grounded ? 1 : 0;
  const ear = (x0, tone, extra) => {
    flat(c, cap(x0, hy + 3, x0 - droop - extra, hy + 4, 1, 1), tone);
  };
  ear(2 + hx, F.T, R(p.ear ?? 0));
  ear(4 + hx, F.L, 0);
}

// ---- The balloon ---------------------------------------------------------------------------------
// Rows' widths of the balloon as it swells and goes limp, and the length of the string below its knot.
const BALLOON = [
  { rows: [1, 3, 1], string: 2 },
  { rows: [3, 5, 5, 3, 1], string: 4 },
  { rows: [3, 5, 5, 5, 5, 3, 1], string: 7 },
  { rows: [3, 5, 3, 1], string: 3 },
];

// A balloon on its string from the paw that holds it at (hx, hy - 1): four tones lit from above, a pale
// shine, and the string leaning with `b.sway`. b: { frame (0..3), colours: [body, shine, cord], sway }.
function balloonAt(c, K, hx, hy, b) {
  const { rows, string } = BALLOON[b.frame];
  const [body, shine, cord] = b.colours;
  const tones = { H: shine, T: body, S: mix(body, K.ink, 0.22), U: mix(body, K.ink, 0.4) };
  const kx = hx + b.sway;
  const ky = hy + string;
  flat(c, cap(hx, hy - 1, kx, ky, 1, 1), cord);
  const pts = [];
  rows.forEach((w, i) => {
    const y = ky + 1 + (rows.length - 1 - i);
    for (let x = kx - (w >> 1); x <= kx + (w >> 1); x += 1) pts.push([x, y]);
  });
  lit(c, pts, (k) => tones[k]);
}

// A loose balloon drifting across the sky: drawn in four tones lit from above, with its string swaying below it.
export function drawLooseBalloon(g, ox, oy, colours, ink, sway = 0) {
  const { rows, string } = BALLOON[2];
  const [body, shine, cord] = colours;
  const tones = { H: shine, T: body, S: mix(body, ink, 0.22), U: mix(body, ink, 0.4) };
  const c = canvas();
  const kx = 0;
  const ky = string;
  flat(c, cap(-sway, 0, kx, ky, 1, 1), cord);
  const pts = [];
  rows.forEach((w, i) => {
    const y = ky + 1 + (rows.length - 1 - i);
    for (let x = kx - (w >> 1); x <= kx + (w >> 1); x += 1) pts.push([x, y]);
  });
  lit(c, pts, (k) => tones[k]);
  flush(g, c, ox, oy + string + rows.length, 1);
}

// ---- The swarm -----------------------------------------------------------------------------------
// A stream of bees, each four pixels long (a dark head, a bright back, a dark stripe, a golden tail), a
// pale wing blurring over its back and a sting at the front on the lead one. s: { x, y, dir } is the
// head of the stream on the page; the bees trail behind it.
export function swarmAt(g, s, time) {
  const [yellow, dark, wing] = g.pal.bee;
  const hi = mix(yellow, "#ffffff", 0.3);
  const lo = mix(yellow, dark, 0.35);
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  for (let i = 0; i < 7; i += 1) {
    const bx = x - s.dir * (i * 3 + (i % 2) * 2) + R(Math.sin(time * 9 + i * 2.1) * 2);
    const by = y + R(Math.cos(time * 11 + i * 1.7) * 2.2) + (i % 3) - 1;
    const put = (dx, dy, col) => {
      g.ctx.fillStyle = col;
      g.ctx.fillRect(bx + s.dir * dx, by - dy, 1, 1);
    };
    const up = (Math.floor(time * 9) + i) % 2 === 0;
    put(2, 0, dark);
    put(1, 0, hi);
    put(0, 0, dark);
    put(-1, 0, lo);
    put(up ? 1 : 0, 1, wing);
    if (up) put(0, 1, wing);
    if (i === 0) put(3, 0, dark);
  }
}

// ---- The cast on the page ------------------------------------------------------------------------
// Each member: how it is drawn, the speed it walks on the page and the length of a stride in pixels (so
// the planted feet hold still), where its ground shadow lies (from the back to the front, in its own
// pixels), the seed of its blinking and glancing, how soon into a stop it sits (`lead`, seconds) and
// whether it hops (`hop`: the share of each hop spent on the ground).
const CAST = {
  pooh: { draw: pooh, speed: 5, stride: 5, shadow: [0, 9], seed: 0.4, lead: 1.2, off: 0 },
  piglet: { draw: piglet, speed: 5, stride: 3.4, shadow: [-1, 6], seed: 1.9, lead: 1.2, off: 1.1 },
  tigger: { draw: tigger, speed: 10, stride: 8, shadow: [-2, 12], seed: 3.1, lead: 1, hop: 0.32 },
  rabbit: { draw: rabbit, speed: 12, stride: 6, shadow: [-1, 6], seed: 2.2, lead: 0.8, hop: 0.3 },
  roo: { draw: roo, speed: 9, stride: 4.6, shadow: [-3, 6], seed: 0.9, lead: 1, hop: 0.28 },
};

const RAMP_S = 0.35; // seconds a walk takes to start or stop
const EASE = 0.9; // seconds to settle into a sit and to get up from one
const bump = (t, from, to, ramp = 0.35) => smooth(clamp(Math.min(t - from, to - t) / ramp, 0, 1));

// The pose of cast member `id` for walker `w` ({ x, dir, state, since, timer, lift, held, pose, step })
// at `time`. A walk is x-driven, so the feet stay planted. A stopped walker stands, then sits when its
// stop is long enough (w.pose "sit" or "stand" forces one), easing down and up over EASE. `lift` and
// `held` (a balloon frame) hang Pooh and Piglet from a balloon.
export function castPose(id, w, time) {
  const m = CAST[id];
  const since = w.since == null ? 100 : time - w.since;
  const walking = w.state === "walk";
  const hanging = (w.lift ?? 0) > 1.5;
  const held = w.held != null;
  let amp = walking ? smooth(clamp(since / RAMP_S, 0, 1)) : smooth(clamp(1 - since / RAMP_S, 0, 1));
  let ph = w.step ?? (w.x * w.dir) / m.stride;
  if (m.hop) {
    // a hopper stopped mid-air finishes its hop in place, so it never hangs in the air
    const u = frac(ph);
    const more = !walking && u >= m.hop ? Math.min((since * m.speed) / m.stride, 1 - u) : 0;
    ph += more;
    amp = walking || (u >= m.hop && more < 1 - u) ? 1 : 0;
  }
  const idle = !walking && amp < 0.05 && !hanging;
  let sit = 0;
  if (!walking && !hanging && !held) {
    if (w.pose === "sit") sit = 1;
    else if (w.pose !== "stand") {
      const stop = since + (w.timer ?? 0);
      if (stop >= m.lead + 2 * EASE + 0.8) {
        sit = smooth(clamp((since - m.lead) / EASE, 0, 1)) * (1 - smooth(clamp((since - (stop - EASE)) / EASE, 0, 1)));
      }
    }
  }
  const seed = m.seed;
  const c = frac((time + seed) / 4.2);
  const p = {
    amp,
    ph,
    t: time,
    sit,
    breath: idle ? breathAt(time, seed) : 0,
    blink: idle && blinkAt(time, seed),
    lx: idle ? lookAt(time, seed) : 0,
  };
  const settled = sit > 0.95;
  if (id === "pooh" && settled) p.paw = bump(frac((time + seed) / 5.5) * 5.5, 1.6, 3.4);
  if (id === "tigger") p.flick = idle && frac((time + seed) / 2.6) < 0.18;
  if (id === "rabbit") {
    p.ear = idle && c > 0.7 && c < 0.8 ? 1 : 0;
    if (settled) p.groom = bump(frac((time + seed) / 6) * 6, 2.5, 4.3);
  }
  if (id === "roo") p.ear = idle && c > 0.55 && c < 0.65 ? 1 : 0;
  if (id === "piglet") {
    p.ear = idle && c > 0.3 && c < 0.4 ? 1 : 0;
    p.flick = idle && frac((time + seed) / 3.7) < 0.12;
  }
  if (held && (id === "pooh" || id === "piglet")) {
    const at = time + m.off;
    p.hold = true;
    p.air = hanging;
    p.swing = hanging ? R(Math.sin(at * 1.5)) : 0;
    p.balloon = { frame: w.held, sway: R(Math.sin(at * 1.5 - 0.7) * 1.4) };
  }
  return p;
}

// Draws cast member `id` in pose `p` standing on ground row `ground`, its balloon (if held) in `colours`,
// lifted `lift` rows into the air; the shadow stays on the ground and thins as it rises.
export function drawCast(g, K, id, p, x, ground, lift, dir, colours) {
  const m = CAST[id];
  const [a, b] = m.shadow;
  g.ctx.fillStyle = shadowColour(g.pal);
  g.ctx.globalAlpha = lift > 0 ? clamp(1 - lift / 40, 0.3, 1) : 1;
  g.ctx.fillRect(dir > 0 ? x + a : x - b, ground, b - a + 1, 1);
  g.ctx.globalAlpha = 1;
  const c = canvas();
  if (p.balloon) p.balloon.colours = colours;
  m.draw(c, K, p);
  flush(g, c, x, ground - lift, dir);
}
