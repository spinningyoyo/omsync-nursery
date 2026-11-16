// The palm-like family: the Hawaii coconut palm and the rainforest tree fern, wild banana, cycad and
// giant bamboo, on one build. A stem lit on its left and shaded on its right, darkest under the
// crown; fronds that leave the crown as a midrib with leaflets hanging from it, so sky shows between
// them; four tones lit from above; the fronds behind the crown in their own darker tone; and a soft
// shadow on the ground (palette key groundShadow, read by pixel.js's shadowColour). In wind the stem bends most at the top, the crown
// rides on it, and each frond sways from where it grows, a beat after its neighbour, so the crown,
// its fruit and its fronds move as one. Members differ in frond shape and height.
// Each painter (coconutPalm, treeFern, wildBanana, cycadRosette, bambooClump) takes the painter `g`, a plant `p`, its size `s` (0..1) and its base row. Palette
// keys: coconut reads leaf, trunk and coconut; treefern fern and trunk; banana leaf and bud; cycad
// cycad; bamboo bamboo and leaf.
import { clamp, hash, mix, rect, shadowColour } from "./pixel.js";

// The wind on a plant at x, between about -1 and 1: wind() from pixel.js left smooth, so a frond
// eases across a pixel rather than jumping a whole one.
export function gust(time, x = 0) {
  return 0.7 * Math.sin(time * 1.3 + x * 0.045) + 0.3 * Math.sin(time * 2.9 + x * 0.11 + 1.3);
}

// Four tones lit from above (H highlight, T base, S shade, U darkest) from a scene's ramp of 2 to 4
// colours, and F, the far fronds' tone.
export function ramp(colours) {
  const [a, b, c, d] = colours;
  const t =
    colours.length >= 4
      ? { H: a, T: b, S: c, U: d }
      : colours.length === 3
        ? { H: a, T: b, S: c, U: mix(c, "#000000", 0.3) }
        : { H: mix(a, "#ffffff", 0.22), T: a, S: b, U: mix(b, "#000000", 0.3) };
  return { ...t, F: mix(t.S, t.U, 0.5) };
}

export const plot = (g, c, x, y) => rect(g, c, Math.round(x), Math.round(y), 1, 1);

// A soft shadow on the ground under a plant: a wide row at its foot and a narrower one below.
export function groundShadow(g, cx, base, half) {
  const c = shadowColour(g.pal);
  const h = Math.max(1, Math.round(half));
  rect(g, c, Math.round(cx) - h, base - 1, h * 2 + 1, 1);
  const h2 = Math.max(1, Math.round(half * 0.6));
  rect(g, c, Math.round(cx) - h2, base, h2 * 2 + 1, 1);
}

// A stem from `base` up `h` rows, `w` wide, its centre at x + curve(r): lit on the left (H), shaded on
// the right (S), banded by `band(r)` (rings, nodes, scars) and darkest under the crown. A one-wide
// stem that steps sideways gets a bridging pixel, so no row meets the next at a corner only.
function stem(g, x, base, h, w, curve, tn, { band = () => false, under = 2, foot = 0 } = {}) {
  let prev = null;
  for (let r = 0; r < h; r += 1) {
    const ww = r < foot ? w + 1 : w;
    const left = Math.round(x + curve(r)) - (ww >> 1);
    const y = base - 1 - r;
    const ring = band(r);
    const dark = r >= h - under;
    for (let c = 0; c < ww; c += 1) {
      let tone;
      if (ww === 1) tone = ring || dark ? tn.S : tn.T;
      else if (c === 0) tone = dark ? tn.S : ring ? tn.T : tn.H;
      else if (c === ww - 1) tone = dark || ring ? tn.U : tn.S;
      else tone = dark ? tn.S : ring ? tn.S : tn.T;
      plot(g, tone, left + c, y);
    }
    if (ww === 1 && prev !== null && prev !== left) plot(g, tn.S, prev, y);
    prev = left;
  }
  return { x: Math.round(x + curve(h - 1)), y: base - h };
}

// One frond from (x0, y0): a midrib leaving at `deg` degrees (0 right, -90 up, 180 left) for `len`
// px, drooping `droop`·len at its tip and pushed `bend` px by the wind there. Leaflets hang `under`
// px below it at their longest and stand `over` px above; `comb` leaves every other one short so sky
// shows between them, `torn` splits a broad leaf. The midrib catches the light (H), the leaflets are
// the base (T) going to shade (S) at their tips, and the frond is darkest (U) where it leaves the
// crown. A far frond takes the far tone throughout.
function frond(g, x0, y0, f, tn, seed) {
  const {
    deg,
    len,
    droop = 0.5,
    bend = 0,
    under = 2,
    over = 1,
    comb = false,
    torn = 0,
    far = false,
    sweep = 0.35,
    solid = false,
  } = f;
  if (len < 1) return;
  const a = (deg * Math.PI) / 180;
  const pt = (i) => {
    const u = i / len;
    return [x0 + Math.cos(a) * i + bend * u * u, y0 + Math.sin(a) * i + droop * len * u * u];
  };
  const T = far ? tn.F : tn.T;
  const S = far ? tn.U : tn.S;
  const H = far ? tn.S : tn.H;
  for (let i = 1; i <= len; i += 1) {
    const u = i / len;
    const [x, y] = pt(i);
    const [px, py] = pt(i - 1);
    let tx = x - px;
    let ty = y - py;
    const m = Math.hypot(tx, ty) || 1;
    tx /= m;
    ty /= m;
    let [nx, ny] = [-ty, tx];
    if (ny < 0) [nx, ny] = [-nx, -ny];
    const prof = solid
      ? u < 0.1
        ? 0
        : Math.min(1, Math.sin(Math.PI * clamp(u, 0, 1)) * 1.6)
      : u < 0.12
        ? 0
        : Math.sin(Math.PI * clamp(0.15 + u * 0.85, 0, 1));
    const short = comb && i % 2 === 1;
    const jag = solid ? 1 : 0.75 + 0.5 * hash(i, 3, seed);
    const down = Math.round(under * prof * jag * (short ? 0.45 : 1));
    const up = Math.round(over * prof * (short ? 0.4 : 1));
    if (!(torn && hash(i, 7, seed) < torn)) {
      for (let k = 1; k <= down; k += 1) {
        const dx = nx * 0.6 + tx * sweep;
        const dy = ny * 0.6 + 0.5;
        const q = Math.hypot(dx, dy);
        plot(g, k === down && down > 1 ? S : T, x + (dx / q) * k, y + (dy / q) * k);
      }
    }
    for (let k = 1; k <= up; k += 1) plot(g, far ? tn.F : tn.H, x - nx * k + tx * sweep * k, y - ny * k);
    plot(g, i <= Math.max(1, len * 0.15) ? (far ? tn.U : tn.U) : H, x, y);
  }
}

// ---------------------------------------------------------------- the members

// A coconut palm (Hawaii): a slim ringed trunk with a swollen foot, curving as it leans, under a
// crown of long feathery fronds, the old ones hanging, a young one standing up, and a bunch of
// coconuts under the crown.
const PALM_ROWS = 40;
const COCONUT_FRONDS = [
  // [degrees, length share, droop, far]
  [-165, 0.8, 0.4, true],
  [-15, 0.8, 0.4, true],
  [-150, 1, 0.45, false],
  [-30, 1, 0.45, false],
  [-178, 1, 0.7, false],
  [-2, 1, 0.7, false],
  [160, 0.85, 0.9, false],
  [20, 0.85, 0.9, false],
  [-96, 0.55, 0.05, false],
];
export function coconutPalm(g, p, s, base) {
  const tn = ramp(g.pal.trunk);
  const lf = ramp(g.pal.leaf);
  const total = Math.max(5, Math.round(PALM_ROWS * p.scale * s));
  const lean = p.seed & 1 ? 1 : -1;
  const reach = Math.round(total * 0.2) * lean;
  const w = gust(g.time, p.x);
  const curve = (r) => reach * (r / total) ** 1.7 + w * 1.2 * (r / total) ** 2;
  const len = Math.max(3, Math.round(total * 0.48));
  groundShadow(g, p.x + reach * 0.6, base, Math.max(2, len * 0.55));
  const k = total / PALM_ROWS;
  const leaf = { under: Math.max(1, Math.round(3 * k + 0.4)), over: k > 0.45 ? 1 : 0, comb: total >= 18 };
  const tx = Math.round(p.x + curve(total));
  const ty = base - total;
  const fronds = COCONUT_FRONDS.filter((f) => total >= 14 || !f[3]).map(([deg, share, droop, far], i) => ({
    ...leaf,
    deg,
    len: Math.max(2, Math.round(len * share)),
    droop,
    far,
    bend: gust(g.time - i * 0.07, p.x) * len * 0.18,
  }));
  for (const f of fronds.filter((f) => f.far)) frond(g, tx, ty, f, lf, p.seed + f.deg);
  stem(g, p.x, base, total, total >= 22 ? 2 : 1, curve, tn, { band: (r) => r % 3 === 2, foot: total >= 28 ? 2 : 0 });
  if (total >= 14) {
    const nut = ramp([g.pal.coconut, mix(g.pal.coconut, "#000000", 0.3)]);
    for (const [dx, dy] of [
      [-2, 1],
      [1, 1],
      [-1, 2],
    ]) {
      rect(g, nut.T, tx + dx, ty + dy, 2, 2);
      plot(g, nut.H, tx + dx, ty + dy);
      plot(g, nut.S, tx + dx + 1, ty + dy + 1);
    }
  }
  for (const f of fronds.filter((f) => !f.far)) frond(g, tx, ty, f, lf, p.seed + f.deg);
  p.crown = { cx: tx, top: ty - len, half: len, bottom: ty + len };
}

// A tree fern: a slender furry trunk scarred where old fronds fell,
// under six long lacy fronds arching out and down, with a fiddlehead uncurling at the top.
const FERN_FRONDS = [
  [-120, 0.8, 0.5, true],
  [-60, 0.8, 0.5, true],
  [-148, 1, 0.9, false],
  [-32, 1, 0.9, false],
  [-174, 1, 1.1, false],
  [-6, 1, 1.1, false],
];
export function treeFern(g, p, s, base) {
  const pal = g.pal;
  const tn = ramp([mix(pal.trunk[0], pal.trunk[1], 0.5), pal.trunk[1], pal.trunk[2]]);
  const lf = ramp(pal.fern);
  const height = Math.max(3, Math.round((12 + (p.seed % 7)) * p.scale * s));
  const w = gust(g.time, p.x);
  const curve = (r) => (height > 8 ? w * 0.9 * (r / height) ** 2 : 0);
  const len = Math.max(2, Math.round(height * 0.7));
  groundShadow(g, p.x, base, Math.max(2, len * 0.6));
  const x = Math.round(p.x + 0.5 + curve(height));
  const y = base - height;
  const fronds = FERN_FRONDS.filter((f) => height >= 9 || !f[3]).map(([deg, share, droop, far], i) => ({
    deg,
    len: Math.max(2, Math.round(len * share)),
    droop,
    far,
    under: height >= 12 ? 2 : 1,
    over: height >= 12 ? 1 : 0,
    comb: height >= 12,
    sweep: 0.5,
    bend: gust(g.time - i * 0.09, p.x) * len * 0.16,
  }));
  for (const f of fronds.filter((f) => f.far)) frond(g, x, y, f, lf, p.seed + f.deg);
  stem(g, p.x + 0.5, base, height, 2, curve, tn, { band: (r) => r % 3 === 1 && r < height - 3, under: 2 });
  for (const f of fronds.filter((f) => !f.far)) frond(g, x, y, f, lf, p.seed + f.deg);
  if (s >= 0.8 && height >= 9) {
    // The fiddlehead: a curled crozier on its stalk, lit on top.
    plot(g, lf.T, x, y - 1);
    plot(g, lf.T, x, y - 2);
    plot(g, lf.H, x, y - 3);
    plot(g, lf.H, x + 1, y - 3);
    plot(g, lf.S, x + 1, y - 2);
  }
}

// A wild banana: a thick green stem under broad paddle leaves, the old
// ones drooping, split by the wind, a young one rolled upright, and on a grown one a stalk curving
// out of the crown with a hand of green fruit and the purple bud hanging below.
const BANANA_LEAVES = [
  [-118, 0.95, 0.3, true],
  [-42, 1.25, 0.25, false],
  [-138, 1.25, 0.25, false],
  [-169, 1.15, 0.75, false],
  [-11, 1.15, 0.75, false],
  [-153, 1.1, 0.5, false],
];
export function wildBanana(g, p, s, base) {
  const pal = g.pal;
  const lf = ramp(pal.leaf);
  const st = { ...ramp([pal.leaf[1], pal.leaf[2], pal.leaf[3]]) };
  const height = Math.max(3, Math.round((14 + (p.seed % 6)) * p.scale * s));
  const w = gust(g.time, p.x);
  const curve = (r) => (height > 6 ? w * 0.8 * (r / height) ** 2 : 0);
  const len = Math.round(height * 0.7) + 2;
  groundShadow(g, p.x + 0.5, base, Math.max(2, len * 0.5));
  const x = Math.round(p.x + curve(height));
  const y = base - height;
  const broad = height >= 12 ? 3 : height >= 7 ? 2 : 1;
  const leaves = BANANA_LEAVES.filter((f) => height >= 10 || !f[3]).map(([deg, share, droop, far], i) => ({
    deg,
    len: Math.max(2, Math.round(len * share)),
    droop,
    far,
    under: Math.max(1, broad - 1),
    over: broad > 1 ? 1 : 0,
    solid: true,
    torn: height >= 12 ? 0.1 : 0,
    sweep: 0.15,
    bend: gust(g.time - i * 0.11, p.x) * len * 0.12,
  }));
  for (const f of leaves.filter((f) => f.far)) frond(g, x, y, f, lf, p.seed + f.deg);
  stem(g, p.x, base, height, height >= 10 ? 2 : 1, curve, st, {
    band: () => false,
    under: 2,
    foot: height >= 14 ? 1 : 0,
  });
  for (const f of leaves.filter((f) => !f.far)) frond(g, x, y, f, lf, p.seed + f.deg);
  // The young leaf, still rolled, standing up out of the crown.
  for (let i = 1; i <= Math.max(2, len >> 1); i += 1)
    plot(g, i % 2 ? lf.H : lf.T, x + Math.round(w * 0.6 * (i / len)), y - i);
  if (s >= 1 && p.seed % 3 === 0 && height >= 10) {
    const swing = Math.round(gust(g.time - 0.4, p.x) * 0.9);
    const stalk = [
      [1, 1],
      [2, 2],
      [3, 3],
      [3 + swing * 0.5, 4],
      [3 + swing, 5],
    ];
    for (const [dx, dy] of stalk) plot(g, st.S, x + dx, y + dy);
    // A hand of green fingers on the stalk, then the bud, dark purple with a lit top.
    plot(g, lf.T, x + 4, y + 2);
    plot(g, lf.S, x + 4, y + 3);
    const bx = x + 3 + swing;
    rect(g, pal.bud[0], bx, y + 6, 2, 3);
    plot(g, pal.bud[1], bx, y + 6);
    plot(g, mix(pal.bud[0], "#000000", 0.3), bx + 1, y + 8);
  }
}

// A cycad: a squat trunk of diamond leaf scars under a stiff rosette of comb-like fronds, leaflets on
// both sides with sky between; stiff enough that the wind barely moves it.
const CYCAD_FRONDS = [
  [-125, 0.85, 0.15, true],
  [-55, 0.85, 0.15, true],
  [-160, 1, 0.35, false],
  [-20, 1, 0.35, false],
  [-140, 1, 0.2, false],
  [-40, 1, 0.2, false],
  [-92, 0.8, 0.05, false],
];
export function cycadRosette(g, p, s, base) {
  const [green, dark, bark] = g.pal.cycad;
  const lf = ramp([mix(green, "#d8f0a0", 0.25), green, dark]);
  const tn = ramp([mix(bark, "#ffffff", 0.18), bark, mix(bark, "#000000", 0.3)]);
  const height = Math.max(1, Math.round((3 + (p.seed % 3)) * p.scale * s));
  const len = Math.max(2, Math.round(7 * p.scale * s));
  groundShadow(g, p.x, base, Math.max(2, len * 0.7));
  const y = base - height;
  const fronds = CYCAD_FRONDS.filter((f) => len >= 5 || !f[3]).map(([deg, share, droop, far], i) => ({
    deg,
    len: Math.max(2, Math.round(len * share)),
    droop,
    far,
    under: len >= 5 ? 1 : 0,
    over: len >= 5 ? 1 : 0,
    comb: true,
    sweep: 0.2,
    bend: gust(g.time - i * 0.05, p.x) * len * 0.05,
  }));
  for (const f of fronds.filter((f) => f.far)) frond(g, p.x, y, f, lf, p.seed + f.deg);
  for (let r = 0; r < height; r += 1) {
    for (let c = -1; c <= 1; c += 1) {
      const scar = (c + r) % 2 === 0;
      const tone = c === -1 ? (scar ? tn.T : tn.H) : c === 1 ? (scar ? tn.U : tn.S) : scar ? tn.S : tn.T;
      plot(g, tone, p.x + c, base - 1 - r);
    }
  }
  for (const f of fronds.filter((f) => !f.far)) frond(g, p.x, y, f, lf, p.seed + f.deg);
}

// Giant bamboo: a clump of jointed culms, lit on one side, each node a pale ring with a shadow
// below it, leaning out and arching at the top, where sprays of narrow leaves hang from the upper
// nodes. The tallest member and the most supple, so it sways the most; the far culms are darker.
export function bambooClump(g, p, s, base) {
  const pal = g.pal;
  const lf = ramp(pal.leaf);
  const culm = ramp(pal.bamboo);
  const farCulm = { H: pal.bamboo[2], T: pal.bamboo[2], S: pal.bamboo[3], U: mix(pal.bamboo[3], "#000000", 0.25) };
  const culms = 3 + (p.seed % 3);
  const offsets = [-3, 0, 3, -1, 2];
  const outs = [-1, 0.3, 1, -0.5, 0.7];
  groundShadow(g, p.x, base, 5 * Math.max(0.5, p.scale * s));
  const order = [3, 4, 0, 1, 2].filter((i) => i < culms);
  for (const i of order) {
    const far = i >= 3;
    const tn = far ? farCulm : culm;
    const height = Math.max(3, Math.round((24 + hash(i, p.seed, 9) * 20) * p.scale * s));
    const width = height > 16 ? 2 : 1;
    const w = gust(g.time - i * 0.15, p.x + i * 3);
    const curve = (r) => outs[i] * 3 * (r / height) ** 2 + w * 2.2 * (r / height) ** 2;
    const node = (r) => r % 6 === 5;
    stem(g, p.x + offsets[i], base, height, width, curve, tn, {
      band: (r) => node(r) || node(r + 1),
      under: 0,
    });
    // Nodes: a pale ring over the shaded row the stem() band already darkened.
    for (let r = 5; r < height; r += 6) {
      const left = Math.round(p.x + offsets[i] + curve(r)) - (width >> 1);
      rect(g, far ? tn.T : pal.bamboo[0], left, base - 1 - r, width, 1);
    }
    if (height <= 10) continue;
    const sprays = Math.min(3, Math.floor(height / 8));
    for (let k = 0; k < sprays; k += 1) {
      const r = height - 1 - k * 6;
      const nx = Math.round(p.x + offsets[i] + curve(r));
      const ny = base - 1 - r;
      const ln = height >= 30 ? 4 : 3;
      const b = w * 1.2;
      for (const [deg, droop] of [
        [-160, 0.7],
        [-20, 0.7],
        [180, 1.1],
        [0, 1.1],
      ]) {
        frond(
          g,
          nx + (deg > -90 ? width : 0),
          ny,
          { deg, len: ln, droop, under: 1, over: 0, bend: b, far },
          lf,
          p.seed + i * 11 + k,
        );
      }
    }
  }
}
