// Wonderland storybook characters built on the nursery's modern rules: White Rabbit, March Hare,
// Dodo, and Card Soldiers. Each follows John Tenniel's 1865 illustrations and the size tiers, built
// from parts with 4-tone overhead lighting, soft cast ground shadows, four-beat gaits with planted
// feet, and living idle states with breath, blinks, and character habits.
import { ease } from "./build.js";
import { cap, ell, lit } from "./cast.js";
import { doing } from "./critters.js";
import { clamp, frac, hash, lerp, mix, rect, shadowColour, smooth, TAU } from "./pixel.js";

const R = Math.round;

// ---- Pixel canvas primitives -------------------------------------------------------------------

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

const box = (x, y, w, h) => {
  const out = [];
  for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) out.push([x + i, y + j]);
  return out;
};

// Line that joins edge to edge without diagonal-only gaps
function line4(x0, y0, x1, y1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xe = Math.round(x1);
  const ye = Math.round(y1);
  const dx = Math.abs(xe - x);
  const dy = -Math.abs(ye - y);
  const sx = x < xe ? 1 : -1;
  const sy = y < ye ? 1 : -1;
  let err = dx + dy;
  const pts = [[x, y]];
  while (x !== xe || y !== ye) {
    const e2 = 2 * err;
    const stepX = e2 >= dy;
    const stepY = e2 <= dx;
    if (stepX && stepY) pts.push([x + sx, y]);
    if (stepX) {
      err += dy;
      x += sx;
    }
    if (stepY) {
      err += dx;
      y += sy;
    }
    pts.push([x, y]);
  }
  return pts;
}

// Bough with 4-tone lighting, tapering from w0 to w1
export function bough(g, tones, x0, y0, x1, y1, w0 = 1, w1 = 1) {
  const pts = line4(x0, y0, x1, y1);
  const isFlat = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  pts.forEach(([x, y], i) => {
    const t = i / Math.max(1, pts.length - 1);
    const w = Math.max(1, Math.round(lerp(w0, w1, t)));
    for (let k = 0; k < w; k += 1) {
      const tone = w === 1 ? tones[1] : k === 0 ? tones[0] : k === w - 1 ? tones[2] : tones[1];
      if (isFlat) rect(g, tone, x, y + k, 1, 1);
      else rect(g, tone, x + k - (w >> 1), y, 1, 1);
    }
  });
}

const flat = (c, pts, col) => {
  for (const [x, y] of pts) c.put(x, y, col);
};

// ---- Tones -------------------------------------------------------------------------------------

const tn = (base, shade, dark) => ({
  H: mix(base, "#ffffff", 0.24),
  T: base,
  S: shade,
  U: mix(shade, dark, 0.42),
  L: mix(base, shade, 0.35),
});

const tonesCache = new WeakMap();
function wonderlandTones(pal) {
  let hit = tonesCache.get(pal);
  if (hit) return hit;

  const pr = pal.rabbit;
  const ph = pal.hare;
  const pd = pal.dodo;
  const ps = pal.soldier;
  const card = pal.card;
  const ink = pal.shadow ?? "#2a1d3d";

  const coatBase = pal.hareCoat?.[0] ?? "#5b8c68";
  const coatShade = pal.hareCoat?.[1] ?? "#426e4e";
  const vestBase = pal.hareVest?.[0] ?? "#e2b868";
  const vestShade = pal.hareVest?.[1] ?? "#c89a46";

  hit = {
    ink,
    edge: mix(pr.W, ink, 0.4), // the grey edge round the Rabbit's white fur
    rabbit: {
      fur: { H: pr.w, T: pr.w, S: pr.W, U: mix(pr.W, ink, 0.32), L: pr.W },
      jacket: tn(pr.j, pr.J, ink),
      vest: tn(pr.v, pr.y, ink),
      watch: pr.y,
      pink: pr.p,
      eye: pr.e,
      contour: pr.W,
      chain: mix(pr.y, ink, 0.45), // the watch's rim and chain
      glass: mix(pr.w, "#ffffff", 0.5),
    },
    hare: {
      fur: tn(ph.f, ph.F, ink),
      coat: tn(coatBase, coatShade, ink),
      vest: tn(vestBase, vestShade, ink),
      collar: pal.collar ?? "#fffdf8",
      tie: pal.tie ?? "#8e3530",
      straw: ph.s,
      strawLit: ph.s,
      strawShade: mix(ph.s, ph.F, 0.5),
      inner: mix(mix(ph.f, "#ffffff", 0.3), ph.n, 0.45), // dusky pink inside the ears
      tip: mix(ph.F, ink, 0.45),
      eye: ph.e,
      nose: ph.n,
      cup: ph.c,
      saucer: ph.C,
    },
    dodo: {
      body: tn(pd.b, pd.B, ink),
      wing: tn(pd.g, mix(pd.g, ink, 0.35), ink),
      beak: tn(pd.k, pd.K, ink),
      beakHook: pd.K,
      tail: { H: pd.w, T: pd.w, S: mix(pd.w, pd.B, 0.35), U: pd.B },
      legs: tn(pd.l, mix(pd.l, ink, 0.35), ink),
      cane: pd.c,
      eye: pd.e,
    },
    soldier: {
      face: card[0],
      edge: card[1],
      heart: card[2],
      spade: card[3],
      head: tn(ps.s, mix(ps.s, ps.h, 0.35), ps.h),
      hair: ps.h,
      eye: ps.e,
      legs: tn(ps.l, mix(ps.l, ink, 0.4), ink),
      spearShaft: ps.y,
      spearHead: ps.Y,
    },
  };
  tonesCache.set(pal, hit);
  return hit;
}

// ---- Timing & Idling ----------------------------------------------------------------------------

const breathAt = (t, seed = 0, period = 2.6) => 0.5 - 0.5 * Math.cos((TAU * (t + seed)) / period);
const blinkAt = (t, seed = 0) => frac((t + seed) / 3.4) < 0.05;
function lookAt(t, seed = 0) {
  const u = frac((t + seed) / 7.2);
  return u > 0.55 && u < 0.68 ? 1 : u > 0.78 && u < 0.9 ? -1 : 0;
}

// ---- A grey edge round white fur ---------------------------------------------------------------
// Every empty pixel beside a fur pixel (above the ground row) takes the edge tone, so the white shows
// on the pale page. Clothes are left alone: they read on their own.
function edgeFur(c, furTones, edge) {
  const fur = new Set(furTones);
  const add = [];
  for (const [x, y, col] of c.m.values()) {
    if (!fur.has(col)) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (y + dy >= 0 && !c.m.has(`${x + dx},${y + dy}`)) add.push([x + dx, y + dy]);
    }
  }
  for (const [x, y] of add) c.put(x, y, edge);
}

// A long ear along a line, two pixels wide: a dark tip, a left column and a right column that
// is `inner` between rows lo and hi.
function ear(c, x0, y0, x1, y1, o) {
  const path = cap(x0, y0, x1, y1, 1, 1);
  const top = Math.max(...path.map((q) => q[1]));
  for (const [x, y] of path) {
    const tipRow = top - y < (o.tip ?? 0);
    c.put(x, y, tipRow ? o.tipCol : o.left);
    c.put(x + 1, y, tipRow ? o.tipCol : y >= o.lo && y <= o.hi ? o.inner : o.right);
  }
}

// ---- Character Rig: White Rabbit ---------------------------------------------------------------
function drawRabbit(c, K, p) {
  const Rp = K.rabbit;
  const F = Rp.fur;
  const J = Rp.jacket;
  const V = Rp.vest;
  const walking = p.amp > 0.15;
  const air = walking ? Math.max(0, Math.sin(p.ph * TAU)) * 1.8 : 0;
  const bb = walking ? R(air) : 0;
  const watch = !walking && p.habit > 0.28;

  // Legs and feet
  if (walking) {
    const fwd = Math.sin(p.ph * TAU) * 1.8;
    flat(c, cap(3, bb + 3, clamp(R(3 - fwd), 1, 5), bb, 1, 1), F.S);
    flat(c, box(clamp(R(3 - fwd), 0, 5), bb, 2, 1), F.S);
    lit(c, cap(5, bb + 3, clamp(R(5 + fwd), 3, 7), bb, 1, 1), (k) => F[k]);
    lit(c, box(clamp(R(5 + fwd), 2, 7), bb, 3, 1), (k) => F[k]);
  } else {
    flat(c, box(2, 0, 3, 1), F.S);
    lit(c, box(4, 0, 4, 1), (k) => F[k]);
    flat(c, cap(3, 3, 3, 0, 1, 1), F.S);
    lit(c, cap(5, 3, 5, 0, 1, 1), (k) => F[k]);
  }

  // Cottontail, a white puff behind the coat
  flat(c, box(-1, bb + 3, 2, 2), F.T);

  // Red tailcoat tails
  lit(c, cap(1, bb + 6, 1, bb + 2, 1, 1), (k) => J[k]);
  lit(c, cap(2, bb + 7, 2, bb + 3, 1, 1), (k) => J[k]);

  // Torso: the waistcoat is the front of him (three columns), the coat his back and shoulder
  const torso = ell(4.2, bb + 6.0, 2.6, 3.2);
  if (!walking && p.breath > 0.5) torso.push([6, bb + 6], [6, bb + 7]);
  lit(c, torso, (k, x) => (x >= 4 ? V[k] : J[k]));
  c.put(5, bb + 5, Rp.chain);
  c.put(5, bb + 7, Rp.chain);

  // White collar
  flat(c, box(4, bb + 8, 3, 1), F.H);

  // Far arm
  if (!watch) flat(c, cap(3, bb + 7, walking ? 2 : 3, bb + 4, 1, 1), J.S);

  // Head
  const hx = p.lx ?? 0;
  const hy = watch ? -1 : 0;
  lit(c, ell(5.0 + hx, bb + 10.5 + hy, 2.6, 2.5), (k) => F[k]);
  c.put(7 + hx, bb + 10 + hy, Rp.pink);
  c.put(5 + hx, bb + 11 + hy, p.blink ? F.S : Rp.eye);

  // Long upright ears, two wide, with a pink inner on the near one
  const tilt = walking ? R(air * 0.9) : R(Math.sin((p.t ?? 0) * 6) * 0.6);
  ear(c, 3 + hx, bb + 12 + hy, 2 + hx - tilt, bb + 19 + hy, {
    left: F.S,
    right: F.S,
    tipCol: F.S,
    tip: 0,
    lo: 99,
    hi: 0,
    inner: F.S,
  });
  ear(c, 5 + hx, bb + 12 + hy, 5 + hx - tilt, bb + 20 + hy, {
    left: F.T,
    right: F.T,
    tipCol: F.T,
    tip: 1,
    lo: bb + 13 + hy,
    hi: bb + 18 + hy,
    inner: Rp.pink,
  });

  // The watch: always in his paw, hanging on its chain. Checked closer when he fusses over it.
  const gold = Rp.watch;
  // A 3x3 disc: dark gold rim, pale glass in the middle, hanging on its chain from the paw.
  const disc = (cx, cy) => {
    flat(c, box(cx - 1, cy - 1, 3, 3), Rp.chain);
    c.put(cx - 1, cy + 1, gold);
    c.put(cx, cy + 1, gold);
    c.put(cx, cy, Rp.glass);
  };
  if (watch) {
    lit(c, cap(5, bb + 7, 8, bb + 9, 1, 1), (k) => J[k]);
    c.put(9, bb + 9, F.T);
    c.put(10, bb + 9, Rp.chain);
    disc(10, bb + 7);
  } else {
    lit(c, cap(5, bb + 7, 6, bb + 6, 1, 1), (k) => J[k]);
    c.put(7, bb + 6, F.T);
    c.put(8, bb + 6, Rp.chain);
    disc(8, bb + 4);
  }

  edgeFur(c, [F.H, F.T, F.S, F.U, F.L, Rp.pink], K.edge);
}

// ---- Character Rig: March Hare -----------------------------------------------------------------
function drawHare(c, K, p) {
  const Hp = K.hare;
  const F = Hp.fur;
  const J = Hp.coat;
  const V = Hp.vest;
  const walking = p.amp > 0.15;
  const fwd = walking ? Math.sin(p.ph * TAU) * 2.2 : 0;
  const bb = walking ? Math.abs(R(Math.sin(p.ph * TAU) * 1.5)) : 0;
  const sipping = p.sip > 0.2;

  // Long hind legs
  if (walking) {
    flat(c, cap(2, bb + 3, clamp(R(2 - fwd), 0, 5), bb, 1, 1), F.S);
    lit(c, cap(5, bb + 3, clamp(R(5 + fwd), 3, 8), bb, 1, 1), (k) => F[k]);
    lit(c, box(clamp(R(5 + fwd), 2, 8), bb, 3, 1), (k) => F[k]);
  } else {
    flat(c, box(2, 0, 3, 1), F.S);
    lit(c, box(4, 0, 4, 1), (k) => F[k]);
    flat(c, cap(2, 3, 2, 0, 1, 1), F.S);
    lit(c, cap(5, 3, 5, 0, 1, 1), (k) => F[k]);
  }
  flat(c, box(0, bb + 3, 2, 2), F.S);
  lit(c, cap(1, bb + 6, 1, bb + 3, 1, 1), (k) => J[k]);
  lit(c, cap(2, bb + 7, 2, bb + 4, 1, 1), (k) => J[k]);

  const torso = ell(4.5, bb + 6.2, 2.8, 3.2);
  if (!walking && p.breath > 0.5) torso.push([7, bb + 6], [7, bb + 7]);
  lit(c, torso, (k, x) => (x >= 5 ? V[k] : J[k]));
  c.put(5, bb + 5, V.U);
  c.put(5, bb + 7, V.U);
  flat(c, box(4, bb + 8, 3, 1), Hp.collar);
  c.put(5, bb + 8, Hp.tie);
  if (!sipping) flat(c, cap(3, bb + 7, walking ? 2 : 3, bb + 4, 1, 1), J.S);

  const hx = p.lx ?? 0;
  lit(c, ell(5.4 + hx, bb + 10.6, 2.7, 2.5), (k) => F[k]);
  c.put(8 + hx, bb + 10, Hp.nose);
  c.put(6 + hx, bb + 11, p.blink ? F.S : Hp.eye);
  c.put(9 + hx, bb + 10, F.T);
  c.put(9 + hx, bb + 11, F.S);

  // Two long hare ears, two pixels wide and eight long: the back one shaded, the front one with a
  // dusky-pink inner, both tipped dark. They stand apart in a V and sway as he hops.
  const sway = walking ? R(fwd * 0.4) : R(Math.sin((p.t ?? 0) * 4) * 0.7);
  ear(c, 3 + hx, bb + 12, 1 + hx - sway, bb + 20, {
    left: F.S,
    right: F.S,
    tipCol: Hp.tip,
    tip: 2,
    lo: 99,
    hi: 0,
    inner: F.S,
  });
  ear(c, 6 + hx, bb + 12, 8 + hx + sway, bb + 21, {
    left: F.T,
    right: F.T,
    tipCol: Hp.tip,
    tip: 2,
    lo: bb + 14,
    hi: bb + 19,
    inner: Hp.inner,
  });

  // Straw: two short tufts lying flat across the crown, among the ears, ends drooping.
  c.put(1 + hx, bb + 13, Hp.strawLit);
  c.put(2 + hx, bb + 13, Hp.strawLit);
  c.put(3 + hx, bb + 13, Hp.strawShade);
  c.put(0 + hx, bb + 12, Hp.strawShade);
  c.put(7 + hx, bb + 13, Hp.strawLit);
  c.put(8 + hx, bb + 13, Hp.strawShade);
  c.put(9 + hx, bb + 12, Hp.strawShade);

  if (sipping) {
    lit(c, cap(5, bb + 7, 7, bb + 9, 1, 1), (k) => J[k]);
    c.put(7, bb + 9, Hp.collar);
    c.put(7, bb + 10, F.T);
    flat(c, box(8, bb + 9, 3, 2), Hp.cup);
    flat(c, box(7, bb + 8, 4, 1), Hp.saucer);
  } else {
    lit(c, cap(5, bb + 7, 7, bb + 5, 1, 1), (k) => J[k]);
    c.put(7, bb + 5, Hp.collar);
    c.put(7, bb + 4, F.T);
    flat(c, box(8, bb + 4, 3, 2), Hp.cup);
    flat(c, box(7, bb + 3, 4, 1), Hp.saucer);
  }
}

// ---- Character Rig: The Dodo -------------------------------------------------------------------
function drawDodo(c, K, p) {
  const Dpal = K.dodo;
  const B = Dpal.body;
  const W = Dpal.wing;
  const T = Dpal.tail;
  const L = Dpal.legs;
  const walking = p.amp > 0.15;
  const roll = walking ? Math.sin(p.ph * TAU) * 0.8 : 0;
  const bb = walking ? R(Math.abs(Math.sin(p.ph * TAU)) * 0.8) : 0;

  // Legs (stout yellow legs)
  if (walking) {
    const sw = Math.sin(p.ph * TAU) * 2.0;
    flat(c, cap(5, bb + 3, clamp(R(5 - sw), 3, 7), bb, 1, 2), L.S);
    flat(c, box(clamp(R(5 - sw), 2, 7), bb, 2, 1), L.S);
    lit(c, cap(8, bb + 3, clamp(R(8 + sw), 6, 10), bb, 1, 2), (k) => L[k]);
    lit(c, box(clamp(R(8 + sw), 5, 10), bb, 3, 1), (k) => L[k]);
  } else {
    flat(c, box(5, 0, 3, 1), L.S);
    flat(c, cap(5, 3, 5, 0, 1, 2), L.S);
    lit(c, box(8, 0, 3, 1), (k) => L[k]);
    lit(c, cap(8, 3, 8, 0, 1, 2), (k) => L[k]);
  }

  // Curled white tail feathers
  const tailPts = [
    [0, bb + 8],
    [1, bb + 9],
    [2, bb + 9],
    [0, bb + 7],
    [1, bb + 7],
    [2, bb + 8],
    [1, bb + 10],
  ];
  lit(c, tailPts, (k) => T[k]);

  // Round heavy body
  const torso = ell(6.5, bb + 6.2, 4.6, 3.8);
  const breath = !walking && p.breath > 0.5 ? 1 : 0;
  if (breath) torso.push([11, bb + 6], [11, bb + 7]);
  lit(c, torso, (k) => B[k]);

  // Folded wing layered on flank
  const wing = ell(6.0, bb + 6.0, 2.8, 2.0);
  lit(c, wing, (k) => W[k]);

  // Stout neck and head
  const hx = p.lx ?? 0;
  const neckHead = ell(10.5 + hx + R(roll), bb + 10.2, 2.6, 2.4);
  lit(c, neckHead, (k) => B[k]);

  // Eye
  if (p.blink) c.put(11 + hx, bb + 11, B.S);
  else c.put(11 + hx, bb + 11, Dpal.eye);

  // Large hooked beak: yellow base with dark down-hooked tip
  flat(c, box(13 + hx, bb + 9, 3, 2), Dpal.beak.T);
  c.put(13 + hx, bb + 10, Dpal.beak.H);
  flat(c, box(15 + hx, bb + 8, 1, 2), Dpal.beakHook);

  // Dignified walking cane: plants with alternate steps
  const canePlant = walking ? R(Math.sin(p.ph * TAU + 1.2) * 1.5) : 0;
  const caneTopX = 11 + hx;
  const caneFootX = 13 + canePlant;
  const cane = cap(caneTopX, bb + 6, caneFootX, bb, 1, 1);
  flat(c, cane, Dpal.cane);
  c.put(caneTopX, bb + 7, Dpal.beak.H);
}

// ---- Character Rig: Card Soldier ----------------------------------------------------------------
function drawSoldier(c, K, p, suit = "spade") {
  const Spal = K.soldier;
  const L = Spal.legs;
  const walking = p.amp > 0.15;
  const stride = walking ? Math.sin(p.ph * TAU) * 2.5 : 0;
  const bb = walking ? R(Math.abs(Math.cos(p.ph * TAU)) * 0.5) : 0;

  // Long thin legs in dark tights
  if (walking) {
    flat(c, cap(3, bb + 3, clamp(R(3 - stride), 1, 5), bb, 1, 1), L.S);
    flat(c, box(clamp(R(3 - stride), 0, 5), bb, 2, 1), L.S);
    lit(c, cap(6, bb + 3, clamp(R(6 + stride), 4, 8), bb, 1, 1), (k) => L[k]);
    lit(c, box(clamp(R(6 + stride), 3, 8), bb, 2, 1), (k) => L[k]);
  } else {
    flat(c, box(3, 0, 2, 1), L.S);
    flat(c, cap(3, 3, 3, 0, 1, 1), L.S);
    lit(c, box(6, 0, 2, 1), (k) => L[k]);
    lit(c, cap(6, 3, 6, 0, 1, 1), (k) => L[k]);
  }

  // Rectangular playing card: 8 wide (x 1..8), 9 tall (y bb+4 .. bb+12)
  for (let y = bb + 4; y <= bb + 12; y += 1) {
    for (let x = 1; x <= 8; x += 1) {
      const isEdge = x === 1 || x === 8 || y === bb + 4 || y === bb + 12;
      c.put(x, y, isEdge ? Spal.edge : Spal.face);
    }
  }

  // Suit pip centered on the card:
  const pipCol = suit === "heart" ? Spal.heart : Spal.spade;
  if (suit === "heart") {
    c.put(4, bb + 9, pipCol);
    c.put(5, bb + 9, pipCol);
    c.put(3, bb + 8, pipCol);
    c.put(4, bb + 8, pipCol);
    c.put(5, bb + 8, pipCol);
    c.put(6, bb + 8, pipCol);
    c.put(4, bb + 7, pipCol);
    c.put(5, bb + 7, pipCol);
    c.put(4, bb + 6, pipCol);
  } else {
    c.put(4, bb + 9, pipCol);
    c.put(5, bb + 9, pipCol);
    c.put(3, bb + 8, pipCol);
    c.put(4, bb + 8, pipCol);
    c.put(5, bb + 8, pipCol);
    c.put(6, bb + 8, pipCol);
    c.put(4, bb + 7, pipCol);
    c.put(5, bb + 7, pipCol);
    c.put(4, bb + 6, pipCol);
  }

  // Human head perched on top of card
  const hx = p.lx ?? 0;
  const face = box(4 + hx, bb + 13, 3, 3);
  lit(c, face, (k) => Spal.head[k]);
  // Hair / cap
  flat(c, box(3 + hx, bb + 15, 4, 1), Spal.hair);
  flat(c, box(3 + hx, bb + 14, 1, 2), Spal.hair);
  // Eye
  if (p.blink) c.put(5 + hx, bb + 14, Spal.head.S);
  else c.put(5 + hx, bb + 14, Spal.eye);

  // Arm and Spear
  const spearBob = walking ? R(Math.sin(p.ph * TAU) * 0.8) : 0;
  const spearShaft = cap(9, bb + spearBob, 9, bb + 18 + spearBob, 1, 1);
  flat(c, spearShaft, Spal.spearShaft);
  // Spearhead (steel)
  c.put(9, bb + 19 + spearBob, Spal.spearHead);
  c.put(8, bb + 18 + spearBob, Spal.spearHead);
  c.put(10, bb + 18 + spearBob, Spal.spearHead);
  c.put(9, bb + 20 + spearBob, Spal.spearHead);

  // Hand holding spear
  c.put(8, bb + 8, Spal.head.T);
}

// ---- Ground shadow -----------------------------------------------------------------------------
// A soft two-row oval under a walker: the core row at full strength across its feet, a shorter
// row below it at about half, and the ends of the core row feathered. `a`..`b` are its columns in
// the walker's own art (mirrored with dir). `lift` rows in the air (a hop) thins and shortens it.
// Colour comes from the palette's groundShadow.
function walkerShadow(g, x, feet, dir, a, b, lift = 0) {
  const col = shadowColour(g.pal);
  const { ctx } = g;
  const k = clamp(1 - lift * 0.2, 0.55, 1);
  const lo = dir > 0 ? x + a : x - b;
  const hi = dir > 0 ? x + b : x - a;
  const inset = lift > 0 ? 1 : 0;
  ctx.fillStyle = col;
  ctx.globalAlpha = k;
  ctx.fillRect(lo + 1 + inset, feet, hi - lo - 1 - 2 * inset, 1);
  ctx.globalAlpha = 0.55 * k;
  ctx.fillRect(lo + inset, feet, 1, 1);
  ctx.fillRect(hi - inset, feet, 1, 1);
  ctx.fillRect(lo + 2 + inset, feet + 1, hi - lo - 3 - 2 * inset, 1);
  ctx.globalAlpha = 1;
}

// ---- Daytime sparkles --------------------------------------------------------------------------
// Slot `i` twinkles in a fixed spot for `period` seconds, then reappears somewhere else in the
// sky. It fades in and out with an eased curve (smoothstep over a triangle wave): at first a single
// pale dot, and near its peak the four arms open, fainter (opacity `arm` at most).
export const SPARKLE_DAY = { count: 5, period: 5, peak: 0.7, arm: 0.45 };

// Draws the sparkle of slot `i` at `time` in a sky `area` ({ w, top, bottom }); `loop` (cycles) makes
// the pattern repeat, for a sprite that loops. Colours come from the palette's `bubble`.
export function daySparkleAt(g, i, time, area, loop = 0) {
  const { period, peak, arm } = SPARKLE_DAY;
  const t = time + hash(i, 5, 31) * period;
  const k0 = Math.floor(t / period);
  const u = frac(t / period);
  const k = loop ? ((k0 % loop) + loop) % loop : k0;
  const e = smooth(1 - Math.abs(2 * u - 1));
  if (e < 0.08) return;
  const x = 3 + Math.floor(hash(i, k, 32) * (area.w - 6));
  const y = area.top + 3 + Math.floor(hash(i, k, 33) * (area.bottom - area.top - 6)) - Math.round(u * 2);
  const { ctx } = g;
  ctx.fillStyle = g.pal.bubble;
  ctx.globalAlpha = Math.min(peak, e * 0.9);
  ctx.fillRect(x, y, 1, 1);
  const open = clamp((e - 0.55) / 0.45, 0, 1);
  if (open > 0) {
    ctx.globalAlpha = arm * open;
    ctx.fillRect(x - 1, y, 1, 1);
    ctx.fillRect(x + 1, y, 1, 1);
    ctx.fillRect(x, y - 1, 1, 1);
    ctx.fillRect(x, y + 1, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---- Pose Computations --------------------------------------------------------------------------

const EASE = 0.35; // seconds to start or stop walking

// Ground covered in one stride (a whole cycle of the legs), in px, for each walker. The scene's
// stride clock (w.c, see stride() in critters.js) grows by one per this many px, so a planted foot
// holds its spot. At the walking speeds that is about 1.8 strides a second for the Rabbit, 1.5 for
// the Hare, 1.1 for the Dodo and 1 for the soldiers.
export const RABBIT_STRIDE = 9;
export const HARE_STRIDE = 8;
export const HARE_DASH_STRIDE = 14; // flat out the Hare covers more ground a stride
export const DODO_STRIDE = 6.5;
export const SOLDIER_STRIDE = 8;
export const STRIDE_CYCLE = 0.3; // seconds a stopped walker takes to finish its stride

function rabbitPose(w, time = 0) {
  const walking = w.state === "walk";
  const since = w.since == null ? 100 : time - w.since;
  const amp = walking ? Math.min(1, since / EASE) : Math.max(0, 1 - since / EASE);
  const idle = amp < 0.05;
  const seed = 0.5;
  const ph = w.c ?? Math.abs(w.x ?? 0) / RABBIT_STRIDE;
  return {
    amp,
    ph,
    t: time,
    breath: idle ? breathAt(time, seed) : 0,
    blink: idle && blinkAt(time, seed),
    lx: idle ? lookAt(time, seed) : 0,
    habit: idle ? (since > 1.2 && frac((since + seed) / 6.0) < 0.45 ? 1 : 0) : 0,
  };
}

function harePose(w, sipping, time = 0) {
  const walking = w.state === "walk";
  const since = w.since == null ? 100 : time - w.since;
  const amp = walking ? Math.min(1, since / EASE) : Math.max(0, 1 - since / EASE);
  const idle = amp < 0.05;
  const seed = 1.8;
  const ph = w.c ?? Math.abs(w.x ?? 0) / HARE_STRIDE;
  return {
    amp,
    ph,
    t: time,
    breath: idle ? breathAt(time, seed) : 0,
    blink: idle && blinkAt(time, seed),
    lx: idle ? lookAt(time, seed) : 0,
    sip: sipping ? 1 : 0,
  };
}

function dodoPose(w, time = 0) {
  const walking = w.state === "walk";
  const since = w.since == null ? 100 : time - w.since;
  const amp = walking ? Math.min(1, since / EASE) : Math.max(0, 1 - since / EASE);
  const idle = amp < 0.05;
  const seed = 2.7;
  const ph = w.c ?? Math.abs(w.x ?? 0) / DODO_STRIDE;
  return {
    amp,
    ph,
    t: time,
    breath: idle ? breathAt(time, seed) : 0,
    blink: idle && blinkAt(time, seed),
    lx: idle ? lookAt(time, seed) : 0,
  };
}

function soldierPose(w, time = 0) {
  const walking = w.state === "walk";
  const since = w.since == null ? 100 : time - w.since;
  const amp = walking ? Math.min(1, since / EASE) : Math.max(0, 1 - since / EASE);
  const idle = amp < 0.05;
  const seed = w.suit === "heart" ? 4.1 : 3.3;
  const ph = w.c ?? Math.abs(w.x ?? 0) / SOLDIER_STRIDE;
  return {
    amp,
    ph,
    t: time,
    breath: idle ? breathAt(time, seed) : 0,
    blink: idle && blinkAt(time, seed),
    lx: idle ? lookAt(time, seed) : 0,
  };
}

// ---- Scene Painters -----------------------------------------------------------------------------

export function wonderlandRabbitAt(g, r, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandRabbitAt, g, r, time);
  const K = wonderlandTones(g.pal);
  const x = Math.round(r.x);
  const y = g.groundY + 7;
  const dir = r.dir ?? 1;
  const p = rabbitPose(r, time);
  const lift = p.amp > 0.15 ? R(Math.max(0, Math.sin(p.ph * TAU)) * 1.8) : 0;
  walkerShadow(g, x, y, dir, -1, 8, lift);
  const c = canvas();
  drawRabbit(c, K, p);
  flush(g, c, x, y, dir);
}

export function wonderlandHareAt(g, p, sipping, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandHareAt, g, p, sipping, time);
  const K = wonderlandTones(g.pal);
  const isSeat = p.seats != null;
  const x = Math.round(isSeat ? p.seats[1] : p.x);
  const y = isSeat ? p.seatRow + 4 : (p.y ?? g.groundY + 7);
  const dir = isSeat ? -1 : (p.dir ?? 1);
  const pose = harePose(p, sipping, time);
  walkerShadow(g, x, y, dir, -1, 8);
  const c = canvas();
  drawHare(c, K, pose);
  flush(g, c, x, y, dir);
}

export function wonderlandDodoAt(g, d, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandDodoAt, g, d, time);
  const K = wonderlandTones(g.pal);
  const x = Math.round(d.x);
  const y = g.groundY + 7;
  const dir = d.dir ?? 1;
  const p = dodoPose(d, time);
  walkerShadow(g, x, y, dir, -1, 14);
  const c = canvas();
  drawDodo(c, K, p);
  flush(g, c, x, y, dir);
}

export function wonderlandSoldierAt(g, s, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandSoldierAt, g, s, time);
  const K = wonderlandTones(g.pal);
  const x = Math.round(s.x);
  const y = g.groundY + 7;
  const dir = s.dir ?? 1;
  const suit = s.suit === "heart" ? "heart" : "spade";
  const p = soldierPose(s, time);
  walkerShadow(g, x, y, dir, 0, 9);
  const c = canvas();
  drawSoldier(c, K, p, suit);
  flush(g, c, x, y, dir);
}

// ---- The Mad Hatter's 10/6 Top Hat --------------------------------------------------------------

function drawHatterHat(c, _K, pal, x, y, tilt = 0) {
  const h = pal.hat;
  const H = h.H; // dark silk
  const hLight = h.h; // lit silk
  const Rband = h.R; // red silk band
  const ticket = h.t; // white ticket
  const ticketInk = h.T; // ticket price text

  const ox = x + R(tilt * 1.5);
  const oy = y;

  // Brim (curved silk brim)
  flat(c, box(ox - 5 + tilt, oy, 11, 1), tilt ? H : h.b);
  flat(c, box(ox - 6 + tilt, oy + 1, 13, 1), H);

  // Crown (tall, flared slightly at top)
  // Red ribbon band
  flat(c, box(ox - 4 + tilt, oy + 2, 9, 2), Rband);

  // Tucked 10/6 price ticket in the ribbon band
  flat(c, box(ox + 2 + tilt, oy + 2, 3, 3), ticket);
  c.put(ox + 3 + tilt, oy + 3, ticketInk); // the "10/6" mark

  // Silk crown body
  for (let dy = 4; dy <= 8; dy += 1) {
    const flare = dy >= 7 ? 1 : 0;
    const w = 9 + flare * 2;
    const left = ox - 4 - flare + tilt;
    flat(c, box(left, oy + dy, w, 1), H);
    c.put(left + 1, oy + dy, hLight); // silk highlight sheen
  }
  // Top crown lid
  flat(c, box(ox - 5 + tilt, oy + 9, 11, 1), hLight);
}

// ---- The Teapot & Dormouse ---------------------------------------------------------------------

function drawTeapotAndDormouse(c, _K, pal, tx, ty, dormouseRise, dormouseEye, lidOpen, steamPuff) {
  const pot = pal.teapot;
  const dMouse = pal.dormouse;
  const ink = pal.shadow ?? "#2a1d3d";
  const potBase = pot[0];
  const potShade = pot[1];

  // Teapot body
  lit(c, ell(tx, ty + 2.5, 3.8, 2.5), (k) => (k === "H" ? potBase : potShade));

  // Spout on right
  flat(c, cap(tx + 3, ty + 2, tx + 6, ty + 4, 1, 1), potBase);
  c.put(tx + 6, ty + 5, potBase);

  // Handle on left
  flat(c, cap(tx - 3, ty + 3, tx - 5, ty + 2, 1, 1), potShade);
  flat(c, cap(tx - 5, ty + 2, tx - 3, ty + 1, 1, 1), potShade);

  // Dormouse
  if (dormouseRise > 0.05) {
    const dy = R(dormouseRise * 5);
    // Mouse head and paws popping out
    const mouseHead = ell(tx, ty + 4 + dy, 2.2, 2.0);
    lit(c, mouseHead, () => dMouse);
    // Round mouse ears
    c.put(tx - 2, ty + 6 + dy, dMouse);
    c.put(tx + 2, ty + 6 + dy, dMouse);
    c.put(tx - 2, ty + 5 + dy, "#f2a6b4"); // pink inner ear
    c.put(tx + 2, ty + 5 + dy, "#f2a6b4");
    // Nose and eyes
    c.put(tx, ty + 4 + dy, "#d88a8a");
    if (dormouseEye) {
      c.put(tx - 1, ty + 4 + dy, ink); // wide awake eyes!
      c.put(tx + 1, ty + 4 + dy, ink);
    } else {
      c.put(tx - 1, ty + 4 + dy, dMouse); // sleepy squint
      c.put(tx + 1, ty + 4 + dy, dMouse);
    }
    // Little paws resting on the teapot rim
    c.put(tx - 2, ty + 3 + dy, dMouse);
    c.put(tx + 2, ty + 3 + dy, dMouse);
  } else {
    // Just tiny nose and sleepy eyes peeking over the rim
    c.put(tx, ty + 4, "#d88a8a");
    c.put(tx - 1, ty + 4, dMouse);
    c.put(tx + 1, ty + 4, dMouse);
    c.put(tx - 1, ty + 5, dMouse);
    c.put(tx + 1, ty + 5, dMouse);
  }

  // Teapot Lid
  const lidY = ty + 5 + R(lidOpen * 4);
  flat(c, box(tx - 2, lidY, 5, 1), potBase);
  c.put(tx, lidY + 1, potShade); // lid knob

  // Steam puff from spout
  if (steamPuff > 0) {
    const puffY = ty + 6 + R(steamPuff * 4);
    const puffX = tx + 7 + R(Math.sin(steamPuff * 6) * 1.5);
    const steamCol = pal.teaCloth[0];
    c.put(puffX, puffY, steamCol);
    c.put(puffX + 1, puffY, steamCol);
    c.put(puffX, puffY + 1, steamCol);
    if (steamPuff > 0.4) {
      c.put(puffX + 2, puffY + 2, steamCol);
      c.put(puffX + 3, puffY + 2, steamCol);
    }
  }
}

// ---- The Tea Party Furniture (Table, Cloth, Chairs, Cups) ---------------------------------------

function drawTeaTableFurniture(c, pal, tx) {
  const wood = pal.wood;
  const cloth = pal.teaCloth;

  // Chairs:
  // Left chair (Hatter's seat)
  const lx = tx - 14;
  flat(c, box(lx - 4, 0, 1, 4), wood[1]); // back leg
  flat(c, box(lx + 3, 0, 1, 4), wood[1]); // front leg
  flat(c, box(lx - 4, 4, 8, 1), wood[0]); // seat cushion
  flat(c, box(lx - 4, 5, 1, 8), wood[1]); // high chair back

  // Right chair (March Hare's seat)
  const rx = tx + 14;
  flat(c, box(rx - 3, 0, 1, 4), wood[1]);
  flat(c, box(rx + 4, 0, 1, 4), wood[1]);
  flat(c, box(rx - 4, 4, 8, 1), wood[0]);
  flat(c, box(rx + 3, 5, 1, 8), wood[1]);

  // Main table:
  flat(c, box(tx - 1, 0, 2, 7), wood[1]); // central pedestal
  flat(c, box(tx - 4, 0, 9, 1), wood[1]); // table feet base

  // Draped tablecloth
  const topY = 7;
  flat(c, box(tx - 9, topY, 19, 2), cloth[0]);
  flat(c, box(tx - 9, topY - 1, 19, 1), cloth[1]); // drape shade
  flat(c, box(tx - 10, topY - 3, 2, 3), cloth[0]); // left drape hang
  flat(c, box(tx + 9, topY - 3, 2, 3), cloth[0]); // right drape hang

  // Teacups on table:
  const cupBase = pal.hare?.c ?? "#ffffff";
  const cupShade = pal.hare?.C ?? "#d9d5e6";
  flat(c, box(tx - 6, topY + 2, 2, 2), cupBase);
  flat(c, box(tx - 7, topY + 1, 4, 1), cupShade);

  flat(c, box(tx + 4, topY + 2, 2, 2), cupBase);
  flat(c, box(tx + 3, topY + 1, 4, 1), cupShade);
}

// ---- The Tea Party Table Scene Painter ----------------------------------------------------------

export function wonderlandTableAt(g, p, base) {
  const { pal } = g;
  const tx = p.x;
  p.seats = [tx - 14, tx + 14];
  p.seatRow = base - 4;

  g.ctx.fillStyle = shadowColour(pal);
  g.ctx.fillRect(tx - 16, base, 33, 1);
  g.ctx.fillRect(tx - 21, base, 9, 1);
  g.ctx.fillRect(tx + 12, base, 9, 1);

  const c = canvas();
  drawTeaTableFurniture(c, pal, tx);

  if (!p.partyActive) {
    const K = wonderlandTones(pal);
    drawTeapotAndDormouse(c, K, pal, tx, 9, 0, false, 0, 0);
  }

  flush(g, c, 0, base, 1);
}

// ---- Cheshire Cat Rig --------------------------------------------------------------------------

function drawCheshireCat(c, pal, x, y, p) {
  const cp = pal.cat;
  const tBase = cp.t; // tabby base
  const tShade = cp.T; // tabby shade
  const tStripe = cp.k; // dark stripes
  const teeth = cp.G; // white grin teeth
  const mouth = cp.m; // dark mouth inside
  const eye = cp.e; // glowing yellow eye

  const breath = p.breath > 0.5 ? 1 : 0;

  // Soft cast shadow under the cat directly on the bough surface
  flat(c, box(x - 4, y - 1, 16, 1), shadowColour(pal));

  // Body: resting plump tabby cat fully sitting on row y (the bough surface)
  const body = ell(x + 3, y + 3.2, 5.8, 3.2);
  if (breath) body.push([x + 2, y + 6], [x + 3, y + 6]);
  lit(c, body, (k) => (k === "H" ? tBase : k === "U" ? tStripe : tShade));

  // Folded paws resting flat on the bough
  flat(c, box(x - 2, y, 4, 1), tShade);
  flat(c, box(x + 3, y, 4, 1), tShade);

  // Tabby stripes across back
  c.put(x, y + 4, tStripe);
  c.put(x, y + 5, tStripe);
  c.put(x + 3, y + 5, tStripe);
  c.put(x + 4, y + 5, tStripe);
  c.put(x + 6, y + 4, tStripe);
  c.put(x + 7, y + 3, tStripe);

  // Head and round cheeks
  const head = ell(x + 1, y + 8, 4.4, 3.4);
  lit(c, head, (k) => (k === "H" ? tBase : tShade));

  // Cat ears: triangular ears on crown
  flat(c, box(x - 3, y + 11, 2, 2), tBase);
  c.put(x - 3, y + 13, tStripe); // ear tip
  c.put(x - 2, y + 11, "#e8a0a8"); // pink inner ear

  flat(c, box(x + 4, y + 11, 2, 2), tBase);
  c.put(x + 5, y + 13, tStripe);
  c.put(x + 4, y + 11, "#e8a0a8");

  // Forehead tabby stripes
  c.put(x + 1, y + 10, tStripe);
  c.put(x - 1, y + 9, tStripe);
  c.put(x + 3, y + 9, tStripe);

  // Big crescent toothy grin (Tenniel's signature!)
  flat(c, box(x - 3, y + 6, 8, 2), teeth);
  for (let dx = -3; dx <= 4; dx += 2) {
    c.put(x + dx, y + 6, mouth);
  }
  c.put(x - 2, y + 5, teeth);
  c.put(x + 3, y + 5, teeth);

  // Glowing eyes (blinking periodically)
  if (p.blink) {
    flat(c, box(x - 2, y + 8, 2, 1), tStripe);
    flat(c, box(x + 2, y + 8, 2, 1), tStripe);
  } else {
    flat(c, box(x - 2, y + 8, 2, 1), eye);
    flat(c, box(x + 2, y + 8, 2, 1), eye);
    c.put(x - 1, y + 8, cp.n); // dark pupil slit
    c.put(x + 2, y + 8, cp.n);
  }

  // Tail root: completely fills the seam between hips and tail
  flat(c, box(x + 6, y + 2, 3, 2), tShade);
  c.put(x + 7, y + 3, tStripe);

  // Curved striped tail hanging down over the bark without any gap
  const swish = Math.sin(p.t * 2.2) * 2.0;
  let lastX = x + 8;
  for (let d = 0; d < 8; d += 1) {
    const bend = R(swish * (d / 7) ** 1.6);
    const tx = x + 8 + bend;
    const ty = y + 1 - d;
    const col = d % 3 === 1 ? tStripe : tBase;
    const minX = Math.min(lastX, tx);
    const maxX = Math.max(lastX, tx);
    for (let cx = minX; cx <= maxX; cx += 1) {
      c.put(cx, ty, col);
    }
    if (d < 4) c.put(tx - 1, ty, col); // thicker root
    lastX = tx;
  }
  c.put(lastX + 1, y - 6, tStripe);
}

// ---- The Grin in the Tree Hollow ----------------------------------------------------------------

function drawHollowGrin(c, pal, x, y) {
  const teeth = pal.cat.G;
  const mouth = pal.cat.m;
  flat(c, box(x - 3, y, 7, 2), teeth);
  c.put(x - 2, y, mouth);
  c.put(x, y, mouth);
  c.put(x + 2, y, mouth);
  c.put(x - 1, y - 1, teeth);
  c.put(x + 1, y - 1, teeth);
}

// ---- Caterpillar Rig ---------------------------------------------------------------------------

function drawCaterpillar(c, pal, x, y, p) {
  const cp = pal.caterpillar;
  const bBase = cp.b; // blue base
  const bShade = cp.B; // blue shade
  const gold = cp.y; // hookah gold
  const pipe = cp.c; // pipe stem
  const breath = p.breath > 0.5 ? 1 : 0;

  // Soft shadow under caterpillar on the mushroom
  flat(c, box(x - 4, y + 1, 14, 1), shadowColour(pal));

  // Segmented coiled body
  lit(c, ell(x - 2, y + 3, 2.4, 2.0), (k) => (k === "H" ? bBase : bShade));
  lit(c, ell(x + 2, y + 3, 2.4, 2.0), (k) => (k === "H" ? bBase : bShade));

  // Upright torso segments
  const seg1 = ell(x + 4, y + 6, 2.2, 2.0);
  if (breath) seg1.push([x + 5, y + 6], [x + 5, y + 7]);
  lit(c, seg1, (k) => (k === "H" ? bBase : bShade));

  const seg2 = ell(x + 4, y + 9, 2.0, 1.8);
  lit(c, seg2, (k) => (k === "H" ? bBase : bShade));

  // Head segment
  const head = ell(x + 4, y + 12, 2.2, 2.0);
  lit(c, head, (k) => (k === "H" ? bBase : bShade));

  // Little antennae on top of head
  c.put(x + 3, y + 14, bShade);
  c.put(x + 3, y + 15, bBase);
  c.put(x + 5, y + 14, bShade);
  c.put(x + 5, y + 15, bBase);

  // Dark eye
  c.put(x + 5, y + 12, cp.e);

  // Hookah pipe:
  // Hookah bowl & base on mushroom cap to left
  flat(c, box(x - 6, y + 2, 3, 2), gold);
  flat(c, box(x - 5, y + 4, 1, 3), gold); // central flask
  c.put(x - 5, y + 7, cp.Y); // bowl on top

  // Curving flexible hookah pipe stem from flask to mouth
  const pipePts = cap(x - 4, y + 5, x + 3, y + 11, 1, 1);
  flat(c, pipePts, pipe);

  // Little front arms / claspers holding the pipe stem
  c.put(x + 3, y + 10, bBase);
  c.put(x + 2, y + 9, bShade);
}

// ---- Additional Scene Painters -----------------------------------------------------------------

export function wonderlandHatAt(g, tea, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandHatAt, g, tea, time);
  const K = wonderlandTones(g.pal);
  const feet = g.groundY + 7;
  const hx = tea.seats ? tea.seats[0] : tea.x - 14;
  const x = Math.round(hx + Math.sin(time * 0.45) * 6);
  const y = Math.round(14 + Math.sin(time * 1.6) * 1.5);
  g.ctx.fillStyle = shadowColour(g.pal);
  g.ctx.fillRect(x - 4, feet, 9, 1);
  const c = canvas();
  drawHatterHat(c, K, g.pal, x, y, 0);
  flush(g, c, 0, feet, 1);
}

export function wonderlandCatAt(g, limb, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandCatAt, g, limb, time);
  const feet = g.groundY + 7;
  const p = {
    t: time,
    breath: 0.5 + 0.5 * Math.sin(time * 2.5),
    blink: time % 3.0 < 0.18,
  };
  const c = canvas();
  drawCheshireCat(c, g.pal, limb.x, feet - limb.row, p);
  flush(g, c, 0, feet, 1);
}

export function wonderlandGrinAt(g, grin) {
  const c = canvas();
  drawHollowGrin(c, g.pal, grin.x, 0);
  flush(g, c, 0, grin.y, 1);
}

export function wonderlandCaterpillarAt(g, perch, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandCaterpillarAt, g, perch, time);
  const feet = g.groundY + 7;
  const p = {
    t: time,
    breath: 0.5 + 0.5 * Math.sin(time * 2.5),
  };
  const c = canvas();
  drawCaterpillar(c, g.pal, perch.x, feet - perch.top, p);
  flush(g, c, 0, feet, 1);
}

export function wonderlandTeaPartyAt(g, tea, stroke, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandTeaPartyAt, g, tea, stroke, time);
  const K = wonderlandTones(g.pal);
  const feet = g.groundY + 7;
  const tx = tea.x;
  const t = clamp(stroke, 0, 4.0);

  // Ground shadows under table and chairs
  g.ctx.fillStyle = shadowColour(g.pal);
  g.ctx.fillRect(tx - 14, feet, 29, 1);
  g.ctx.fillRect(tx - 21, feet, 9, 1);
  g.ctx.fillRect(tx + 12, feet, 9, 1);

  const c = canvas();
  drawTeaTableFurniture(c, g.pal, tx);

  const dormouseRise = t < 1.0 ? 0 : t < 1.4 ? (t - 1.0) / 0.4 : t < 2.8 ? 1.0 : t < 3.2 ? 1.0 - (t - 2.8) / 0.4 : 0;
  const dormouseEye = t >= 1.2 && t <= 2.8;
  const lidOpen = dormouseRise;
  const steamPuff = t >= 0.8 && t <= 1.6 ? (t - 0.8) / 0.8 : t >= 2.8 && t <= 3.3 ? (t - 2.8) / 0.5 : 0;

  drawTeapotAndDormouse(c, K, g.pal, tx, 9, dormouseRise, dormouseEye, lidOpen, steamPuff);

  const hx = tea.seats ? tea.seats[0] : tx - 14;
  let hatX = hx;
  let hatY = 14 + R(Math.sin(time * 2.5) * 1.5);
  let hatTilt = 0;
  if (t >= 1.6 && t <= 2.8) {
    const madT = (t - 1.6) / 1.2;
    hatTilt = R(Math.sin(madT * Math.PI * 3) * 2);
    hatY = 16 + R(Math.abs(Math.sin(madT * Math.PI * 4)) * 3);
    hatX = hx + R(Math.sin(madT * Math.PI * 2) * 2);
  }
  drawHatterHat(c, K, g.pal, hatX, hatY, hatTilt);

  const rx = tea.seats ? tea.seats[1] : tx + 14;
  let hareX = rx;
  const hareDir = -1;
  const hareSipping = t < 1.0 || t > 3.4;
  let hareLean = 0;
  if (t >= 1.6 && t <= 2.8) {
    hareLean = 1;
    hareX = rx - 4;
  }

  const hareP = {
    amp: hareLean ? 0.8 : 0,
    ph: time * 3,
    t: time,
    breath: 0.5 + 0.5 * Math.sin(time * 3),
    blink: t < 1.0 && time % 3.0 < 0.2,
    lx: hareLean ? 1 : 0,
    sip: hareSipping ? 1 : 0,
  };

  const hareCanvas = canvas();
  drawHare(hareCanvas, K, hareP);
  flush(g, hareCanvas, hareX, feet - (hareLean ? 1 : 0), hareDir);

  if (t >= 1.8 && t <= 2.5) {
    const dropCol = g.pal.hareCoat ? g.pal.hareCoat[0] : "#5b8c68";
    c.put(tx + 6, 12 + R(Math.sin(t * 12) * 2), dropCol);
    c.put(tx + 2, 13 + R(Math.cos(t * 14) * 2), dropCol);
    c.put(tx - 2, 11 + R(Math.sin(t * 16) * 2), dropCol);
  }

  flush(g, c, 0, feet, 1);
}

// ---- Umbrella Vulture & Flying Cards ------------------------------------------------------------

function drawVultureFlight(c, pal, x, y, p) {
  const vp = pal.vulture;
  const K = vp.K;
  const k = vp.k;
  const i = vp.i;
  const H = vp.H;
  const Hdark = mix(H, "#000000", 0.3);
  const P = vp.P;
  const pDark = vp.p;
  const e = vp.e;
  const b = vp.b;
  const w = vp.w;

  const wingT = (p.phase ?? 0) % TAU;
  const open = 0.5 - 0.5 * Math.cos(wingT);

  // 1. Golden crook handle trailing behind
  const handleX = x - 10 - R((1 - open) * 2);
  const handleY = y + 1;
  flat(c, box(handleX, handleY, x - 6 - handleX + 1, 1), H);
  c.put(handleX - 1, handleY, H);
  c.put(handleX - 2, handleY + 1, H);
  c.put(handleX - 2, handleY + 2, H);
  c.put(handleX - 1, handleY + 3, Hdark);
  c.put(handleX, handleY + 3, Hdark);

  // 2. Umbrella canopy (pulsing from furled spindle to ribbed dome)
  const canopyLen = 10;
  const domeH = 2 + R(open * 4);
  for (let col = 0; col <= canopyLen; col += 1) {
    const u = col / canopyLen;
    const h = Math.max(1, R(domeH * Math.sqrt(u)));
    const cx = x - 6 + col;

    for (let dy = -h; dy <= h; dy += 1) {
      if (col === 0 && h > 2 && dy % 2 === 0) continue;

      let tone;
      const isRib = col % 3 === 0 || dy === 0;
      if (dy > h - 2) {
        tone = k;
      } else if (dy < -h + 2) {
        tone = open > 0.4 ? i : K;
      } else if (isRib) {
        tone = k;
      } else {
        tone = K;
      }
      c.put(cx, y + dy + 1, tone);
    }
  }

  // Canopy ferrule tip
  c.put(x + 5, y + 1, H);

  // 3. White fluffy ruff collar
  flat(c, box(x + 5, y - 1, 2, 4), w);
  flat(c, box(x + 6, y, 1, 2), w);

  // 4. Bald vulture head & hooked beak
  const headX = x + 7;
  const headY = y;
  flat(c, box(headX, headY, 3, 3), P);
  flat(c, box(headX, headY - 1, 2, 1), pDark);
  c.put(headX + 1, headY + 3, P);

  // Eye
  if (p.blink) {
    c.put(headX + 1, headY + 1, pDark);
  } else {
    c.put(headX + 1, headY + 1, e);
  }

  // Hooked beak
  c.put(headX + 3, headY + 1, b);
  c.put(headX + 3, headY, b);
  c.put(headX + 3, headY - 1, mix(b, "#000000", 0.4));
}

function drawFlockCards(c, pal, x, y, time, _dir = 1) {
  const [face, edge, red] = pal.card;
  const ink = pal.shadow ?? "#2a1d3d";

  const CARDS = [
    { offX: -12, offY: 4, suit: "heart", speed: 5.2, phase: 0 },
    { offX: -4, offY: -3, suit: "spade", speed: 4.8, phase: 1.3 },
    { offX: 5, offY: 5, suit: "diamond", speed: 5.6, phase: 2.7 },
    { offX: 13, offY: -4, suit: "club", speed: 4.5, phase: 4.1 },
    { offX: 2, offY: 1, suit: "back", speed: 5.0, phase: 5.4 },
  ];

  CARDS.forEach((card) => {
    const bobX = Math.sin(time * 2.2 + card.phase) * 2;
    const bobY = Math.cos(time * 3.0 + card.phase * 1.4) * 2.5;
    const cx = x + card.offX + R(bobX);
    const cy = y + card.offY + R(bobY);

    const rot = time * card.speed + card.phase;
    const cosR = Math.cos(rot);
    const absCos = Math.abs(cosR);
    const w = Math.max(1, R(absCos * 5));
    const h = 7;

    const isFace = cosR >= 0;

    if (w === 1) {
      flat(c, box(cx, cy - 3, 1, h), edge);
      return;
    }

    const halfW = w >> 1;
    const x0 = cx - halfW;
    const y0 = cy - 3;

    if (isFace && card.suit !== "back") {
      flat(c, box(x0, y0, w, h), face);
      flat(c, box(x0, y0, w, 1), edge);
      flat(c, box(x0, y0 + h - 1, w, 1), edge);
      flat(c, box(x0, y0, 1, h), edge);
      flat(c, box(x0 + w - 1, y0, 1, h), edge);

      const suitCol = card.suit === "heart" || card.suit === "diamond" ? red : ink;
      if (w >= 3) {
        if (card.suit === "heart") {
          c.put(cx - 1, cy + 1, suitCol);
          c.put(cx + 1, cy + 1, suitCol);
          c.put(cx, cy, suitCol);
          c.put(cx, cy - 1, suitCol);
        } else if (card.suit === "spade") {
          c.put(cx, cy + 1, suitCol);
          c.put(cx - 1, cy, suitCol);
          c.put(cx + 1, cy, suitCol);
          c.put(cx, cy - 1, suitCol);
        } else if (card.suit === "diamond") {
          c.put(cx, cy + 1, suitCol);
          c.put(cx - 1, cy, suitCol);
          c.put(cx + 1, cy, suitCol);
          c.put(cx, cy - 1, suitCol);
        } else {
          c.put(cx, cy + 1, suitCol);
          c.put(cx - 1, cy, suitCol);
          c.put(cx + 1, cy, suitCol);
          c.put(cx, cy - 1, suitCol);
        }
      } else {
        c.put(cx, cy, suitCol);
      }
    } else {
      flat(c, box(x0, y0, w, h), face);
      if (w >= 3) {
        flat(c, box(x0 + 1, y0 + 1, w - 2, h - 2), red);
        c.put(cx, cy, face);
      } else {
        flat(c, box(x0, y0, w, h), red);
      }
    }
  });
}

// ---- Perched moves -------------------------------------------------------------------------------
// Each move is on its own timer (critters.js percher and fidget: they never overlap) and is eased: about
// 0.25 s in, a hold, about 0.25 s out. Breathing is always on.

export const VULTURE_MOVES = {
  look: { every: [3, 7], lasts: 2.0 },
  blink: { every: [2, 5], lasts: 0.6 },
  preen: { every: [7, 13], lasts: 2.6 },
};
const EDGE = 0.25;
const hump = (u, lasts) =>
  u < 0 ? 0 : smooth(clamp((u * lasts) / EDGE, 0, 1)) * smooth(clamp(((1 - u) * lasts) / EDGE, 0, 1));

// The perched pose { look, blink, preen, nib, breath }, each 0 to 1, at `time`. `calm` (1 to 0) fades the
// moves out, for a bird about to leave in the middle of one.
function vulturePerchPose(p, time, calm = 1) {
  const look = hump(doing(p, "look", time), VULTURE_MOVES.look.lasts) * calm;
  const blink = hump(doing(p, "blink", time), VULTURE_MOVES.blink.lasts) * calm;
  const preen = hump(doing(p, "preen", time), VULTURE_MOVES.preen.lasts) * calm;
  return {
    look,
    blink,
    preen,
    nib: preen > 0.99 && Math.sin(time * 14) > 0 ? 1 : 0, // the nibbling while the head is down
    breath: Math.sin(time * 2.2 + (p?.phase ?? 0)) > 0.3 ? 1 : 0,
  };
}

// The perched drawing of kit/wonderland.js, with the head moves eased into steps instead of snapped:
// a look lifts the head first and turns it second; a preen dips it in two steps and nibbles.
function drawVulturePerchedEased(c, pal, x, y, pose) {
  const { K, k, i, H, P, p: pDark, e, b, w } = pal.vulture;
  const Hdark = mix(H, "#000000", 0.3);
  const breath = pose.breath ? 1 : 0;
  const lift = pose.look > 0.25 ? 1 : 0;
  const turn = pose.look > 0.7 ? 1 : 0;
  const dip = R(2 * pose.preen);

  c.put(x - 1, y, H);
  c.put(x, y, Hdark);
  c.put(x + 2, y, H);
  c.put(x + 3, y, Hdark);

  flat(c, box(x - 4, y - 1, 1, 3), H);
  c.put(x - 5, y - 2, H);
  c.put(x - 5, y - 3, H);
  c.put(x - 4, y - 4, Hdark);
  c.put(x - 3, y - 4, Hdark);

  const bodyX = x - 2;
  const bodyY = y + 1;
  flat(c, box(bodyX - 2, bodyY, 4, 3), K);
  flat(c, box(bodyX - 2, bodyY + 3, 5 + breath, 5), K);
  flat(c, box(bodyX - 1, bodyY + 8, 4, 2), K);
  c.put(bodyX - 1, bodyY + 4, k);
  c.put(bodyX - 1, bodyY + 6, k);
  c.put(bodyX + 1, bodyY + 3, k);
  c.put(bodyX + 1, bodyY + 5, k);
  c.put(bodyX + 1, bodyY + 7, k);
  c.put(bodyX - 2, bodyY + 2, i);
  c.put(bodyX, bodyY + 10, H);
  c.put(bodyX, bodyY + 11, H);

  const ruffX = bodyX + 2;
  const ruffY = bodyY + 6 - dip;
  flat(c, box(ruffX - 1, ruffY, 3, 3), w);
  c.put(ruffX + 2, ruffY + 1, w);

  const headX = ruffX + turn;
  const headY = ruffY + 3 - dip + lift;
  flat(c, box(headX, headY, 3, 3), P);
  flat(c, box(headX, headY - 1, 2, 1), pDark);
  c.put(headX + 1, headY + 3, P);
  c.put(headX + 1, headY + 1, mix(e, pDark, pose.blink)); // the lid closes through a middle tone
  const beakX = headX + 3;
  const beakY = headY + 1 - (pose.preen > 0.5 ? 1 : 0) - pose.nib;
  c.put(beakX, beakY, b);
  c.put(beakX, beakY - 1, b);
  c.put(beakX, beakY - 2, mix(b, "#000000", 0.4));
}

// ---- The fold: flight to perched, one shape through the whole change ------------------------------
// Coordinates are relative to the feet (0, 0), y up. `e` is 0 in flight and 1 perched. The umbrella's spine
// turns from level to upright about its middle, its width slides from the pulsing dome to the furled
// spindle, the crook swings down from the tail to hang under the feet, and the head rides the ferrule
// end, still facing forward. `feet` (0 to 1) lowers the legs and talons toward the bough.

// The furled body's half-widths by column along the spine: [left, right] of the spine (x = -2) when upright.
const FURLED = [
  [-0.6, -0.6],
  [2, 1],
  [2, 1],
  [2, 1],
  [2, 2],
  [2, 2],
  [2, 2],
  [2, 2],
  [2, 2],
  [1, 2],
  [1, 2],
];
const FURL_K = [
  [-3, 5],
  [-3, 7],
  [-1, 4],
  [-1, 6],
  [-1, 8],
];
const HANDLE_END = [
  [-4, 1],
  [-4, 0],
  [-4, -1],
  [-4, -1],
  [-5, -2],
  [-5, -2],
  [-5, -3],
  [-4, -4],
  [-3, -4],
];

function drawVultureMorph(c, pal, p) {
  const { K, k, i: shade, H, P, p: pDark, e: eye, b, w } = pal.vulture;
  const Hdark = mix(H, "#000000", 0.3);
  const e = clamp(p.e, 0, 1);
  const open = clamp(p.open ?? 0, 0, 1);
  const feet = p.feet ?? 0;

  // Legs and talons first, so the umbrella covers their tops.
  if (feet > 0.05) {
    const len = R(feet * 7 * (1 - 0.85 * e));
    for (const lx of [-1, 2]) {
      for (let j = 0; j <= len; j += 1) c.put(lx, j, H);
    }
    c.put(-1, 0, H);
    c.put(2, 0, H);
    if (feet > 0.5) {
      c.put(0, 0, Hdark);
      c.put(3, 0, Hdark);
    }
  }

  if (e <= 0) {
    drawVultureFlight(c, pal, 0, 5, { phase: Math.acos(1 - 2 * open), blink: p.blink });
    return;
  }

  const theta = (e * Math.PI) / 2;
  const d = [Math.cos(theta), Math.sin(theta)];
  const n = [-Math.sin(theta), Math.cos(theta)];
  const cx = lerp(-1, -2, e);
  const cy = lerp(6, 5.5, e);
  const len = 10;
  const domeH = 2 + R(open * 4);
  const tol = 0.45 * Math.sin(2 * theta);
  const breath = p.breath ? 1 : 0;

  // The canopy: every cell is tested against the spine's frame, so the shape turns without gaps.
  for (let Y = -3; Y <= 17; Y += 1) {
    for (let X = -10; X <= 10; X += 1) {
      const rx = X - cx;
      const ry = Y - cy;
      const a = (rx * d[0] + ry * d[1]) / len + 0.5;
      if (a < -0.05 || a > 1.05) continue;
      const col = clamp(R(a * 10 + 1e-9), 0, 10);
      const q = rx * n[0] + ry * n[1];
      const h = Math.max(1, R(domeH * Math.sqrt(col / 10)));
      const fl = FURLED[col];
      const up = lerp(h, fl[0], e);
      const dn = lerp(h, fl[1] + (col >= 4 && col <= 8 ? breath : 0), e);
      if (q > up + tol + 1e-9 || q < -dn - tol - 1e-9) continue;
      const qq = R(q);
      let tone = K;
      if (e < 0.5) {
        if (col === 0 && h > 2 && qq % 2 === 0) continue;
        if (qq > h - 2) tone = k;
        else if (qq < -h + 2) tone = open > 0.4 ? shade : K;
        else if (col % 3 === 0 || qq === 0) tone = k;
      } else if (FURL_K.some(([kx, ky]) => kx === X && ky === Y)) tone = k;
      else if (X === -4 && Y === 3) tone = shade;
      c.put(X, Y, tone);
    }
  }

  // The crook swings from the tail to hang under the feet: nine points, tail end first, the last two dark.
  const hx = -10 - R((1 - open) * 2);
  const FL = [
    [hx + 3, 6],
    [hx + 2, 6],
    [hx + 1, 6],
    [hx, 6],
    [hx - 1, 6],
    [hx - 2, 7],
    [hx - 2, 8],
    [hx - 1, 9],
    [hx, 9],
  ];
  const pts = FL.map(([fx, fy], j) => [R(lerp(fx, HANDLE_END[j][0], e)), R(lerp(fy, HANDLE_END[j][1], e))]);
  pts.forEach(([px, py], j) => {
    const col = j >= 7 ? Hdark : H;
    c.put(px, py, col);
    if (j > 0) {
      const [qx, qy] = pts[j - 1];
      if (Math.max(Math.abs(px - qx), Math.abs(py - qy)) > 1) {
        for (const [lx, ly] of line4(qx, qy, px, py)) c.put(lx, ly, col);
      }
    }
  });

  // The ferrule at the spine's far end, two long once upright.
  const ex = cx + (len / 2 + 0.5) * d[0];
  const ey = cy + (len / 2 + 0.5) * d[1];
  c.put(R(ex), R(ey), H);
  if (e >= 0.5) c.put(R(ex + d[0]), R(ey + d[1]), H);

  // The ruff and the head ride the ferrule end and keep facing forward.
  const rx0 = R(ex + lerp(0.5, 1, e));
  const ry0 = R(ey + lerp(-2, -4, e));
  flat(c, box(rx0, ry0, R(lerp(2, 3, e)), R(lerp(4, 3, e))), w);
  if (e >= 0.5) c.put(rx0 + 3, ry0 + 1, w);
  const hx0 = R(ex + lerp(2.5, 2, e));
  const hy0 = R(ey - 1);
  flat(c, box(hx0, hy0, 3, 3), P);
  flat(c, box(hx0, hy0 - 1, 2, 1), pDark);
  c.put(hx0 + 1, hy0 + 3, P);
  c.put(hx0 + 1, hy0 + 1, p.blink ? pDark : eye);
  c.put(hx0 + 3, hy0 + 1, b);
  c.put(hx0 + 3, hy0, b);
  c.put(hx0 + 3, hy0 - 1, mix(b, "#000000", 0.4));
}

// ---- Landing and take-off ---------------------------------------------------------------------------
// Landing (u, 0 to 1, through the descent): the umbrella beats as it comes, flares wide and holds like a
// parachute from half way, the legs lower, and in the last quarter the umbrella folds and turns upright as
// the talons reach the bough. Take-off (t seconds since the leave began): it unfolds over 2.2 s, starting
// while still on the bough, the beats grow in and the legs tuck once it is clear.

function vultureLandPose(u, time, phase = 0) {
  const flap = 0.5 - 0.5 * Math.cos(time * 4 + phase);
  const hold = 0.88 + 0.12 * Math.sin(time * 2.4);
  return { e: ease(u, 0.74, 1), open: lerp(flap, hold, ease(u, 0.5, 0.7)), feet: ease(u, 0.45, 0.8) };
}

const PREP = 0.9; // seconds on the bough before it lifts, as animals.js's PREP
function vultureLeavePose(t, time, phase = 0) {
  const flap = 0.5 - 0.5 * Math.cos(time * 4 + phase);
  return { e: 1 - ease(t, 0, 2.2), open: flap * ease(t, 0.3, PREP), feet: 1 - ease(t, PREP, 2.4) };
}

// The Umbrella Vulture. `v` is { x, y, dir, phase, visit }, with
// v.visit.p its percher (VULTURE_MOVES).
export function wonderlandVultureAt(g, v, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandVultureAt, g, v, time);
  const pal = g.pal;
  const vis = v.visit;
  const phase = v.phase ?? 0;
  const blink = time % 2.5 < 0.22;
  const breath = Math.sin(time * 2.2 + (vis?.p?.phase ?? 0)) > 0.3 ? 1 : 0;
  const c = canvas();
  const dir = vis?.dir ?? v.dir ?? 1;
  let fx = v.x;
  let fy = v.y + 5; // the feet hang five rows under the umbrella's middle in flight

  if (vis?.mode === "perch") {
    const top = vis.spot.top(time);
    drawVulturePerchedEased(c, pal, 0, 0, vulturePerchPose(vis.p, time));
    flush(g, c, R(top.x), R(top.y), dir);
    return;
  }

  let pose = { e: 0, open: 0.5 - 0.5 * Math.cos(time * 4 + phase), feet: 0, blink };
  if (vis?.mode === "land") {
    const top = vis.spot.top(time);
    const u = clamp(vis.t / vis.T, 0, 1);
    fx = lerp(v.x, top.x, smooth(u));
    fy = lerp(v.y + 5, top.y, smooth(u) ** 1.3);
    pose = { ...vultureLandPose(u, time, phase), blink, breath };
  } else if (vis?.mode === "leave") {
    const top = vis.spot.top(time);
    const air = Math.max(0.1, vis.T - PREP);
    const k = clamp((vis.t - PREP) / air, 0, 1);
    fx = lerp(top.x, v.x, smooth(k));
    fy = lerp(top.y, v.y + 5, smooth(k) ** 0.8);
    pose = { ...vultureLeavePose(vis.t, time, phase), blink, breath };
    if (pose.e >= 1) {
      drawVulturePerchedEased(c, pal, 0, 0, vulturePerchPose(vis.p, time, 1 - ease(vis.t, 0, 0.3)));
      flush(g, c, R(fx), R(fy), dir);
      return;
    }
  }
  if (pose.e >= 1) {
    drawVulturePerchedEased(c, pal, 0, 0, { look: 0, blink: 0, preen: 0, nib: 0, breath });
  } else drawVultureMorph(c, pal, pose);
  flush(g, c, R(fx), R(fy), dir);
}

export function wonderlandFlockAt(g, b, time = g.time ?? 0) {
  if (g.trace) return g.trace.draw(wonderlandFlockAt, g, b, time);
  const pal = g.pal;
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  const dir = b.dir ?? 1;
  const c = canvas();
  drawFlockCards(c, pal, 0, 0, time, dir);
  flush(g, c, x, y, dir);
}
