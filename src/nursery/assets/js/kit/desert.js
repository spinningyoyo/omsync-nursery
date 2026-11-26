// The desert plants family on one build: the Joshua tree, yucca, teddy-bear cholla, ocotillo and prickly
// pear. Light from above in four tones (ramp, palms.js), a soft shadow on the ground under each (palms.js's
// groundShadow, in palette key groundShadow), bark from broadleaf.js (barkTones, line4), and a part that sways with
// what it grows from: the Joshua tree's arms and rosettes, the ocotillo's canes and the yucca's flower
// stalk (the cacti stay stiff).
//
// Each painter (joshua, yucca, cholla, ocotillo, pad) takes the painter `g`, a plant `p`, its size `s` (0..1)
// and its base row. Palette keys: joshua reads trunk and joshua; yucca yucca and trunk; cholla
// cholla; ocotillo ocotillo, trunk and tip; pad pad and fruit; all of them groundShadow.
//
// The numbers a scene reads come from one place. joshuaGeom gives a Joshua tree's rows, arms and the top of
// its last arm for scale p.scale, growth s and time (the wind moves each arm's tip), and joshua() draws from
// exactly those numbers: the vulture's and the owl's perch read `top` from it, never a copy of the formulas.
// rosette() and limb() are the Joshua tree's parts.
import { barkTones, line4 } from "./broadleaf.js";
import { groundShadow, gust, plot as px, ramp } from "./palms.js";
import { clamp, hash, line, mix, rect, wind } from "./pixel.js";

const TREE_ROWS = 36;

// ---- Shared parts -------------------------------------------------------------------------------

// A limb from (x0, y0) to (x1, y1), w0 thick tapering to w1: lit on its upper or left side, shaded on
// its lower or right side, and one tone darker at and above row `darkY` (under a rosette).
function limb(g, B, x0, y0, x1, y1, w0, w1, darkY = -1e9) {
  const pts = line4(x0, y0, x1, y1);
  const flat = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  pts.forEach(([x, y], i) => {
    const w = Math.max(1, Math.round(w0 + ((w1 - w0) * i) / Math.max(1, pts.length - 1)));
    const d = y >= darkY ? 1 : 0;
    for (let k = 0; k < w; k += 1) {
      const t = w === 1 ? 1 : k === 0 ? 0 : k === w - 1 ? 2 : 1;
      const c = B[Math.min(3, t + d)];
      if (flat) px(g, c, x, y + k);
      else px(g, c, x + k - (w >> 1), y);
    }
  });
}

// ---- The Joshua tree ------------------------------------------------------------------------------

// A rosette of stiff leaves: spikes leave a dark heart in every direction, the upper ones lit, the side
// ones in the base tone, the lower ones shaded, so the sky shows between them. Its top spike stands
// r + 2 rows above (cx, cy).
const SPIKES = [
  // [degrees, share of the length]
  [-90, 1],
  [-60, 1],
  [-120, 1],
  [-32, 0.9],
  [-148, 0.9],
  [-6, 0.8],
  [-174, 0.8],
  [24, 0.55],
  [156, 0.55],
  [48, 0.4],
  [132, 0.4],
];
function rosette(g, tn, B, cx, cy, r) {
  const len = r + 2;
  const list = SPIKES.slice(0, r >= 3 ? 11 : r === 2 ? 9 : 7);
  const order = [...list].sort((a, b) => Math.sin((b[0] * Math.PI) / 180) - Math.sin((a[0] * Math.PI) / 180));
  for (const [deg, share] of order) {
    const a = (deg * Math.PI) / 180;
    const sin = Math.sin(a);
    const L = len * share;
    const pts = line4(cx + Math.cos(a), cy + sin, cx + Math.cos(a) * L, cy + sin * L);
    pts.forEach(([x, y], j) => {
      const late = j >= pts.length - 2;
      let c;
      if (sin < -0.5) c = late ? tn.H : tn.T;
      else if (sin <= 0.2) c = late ? tn.T : tn.S;
      else c = late ? tn.S : tn.U;
      px(g, c, x, y);
    });
  }
  // The heart: lit at its top, dark below.
  if (r >= 2) px(g, tn.T, cx, cy - 1);
  rect(g, tn.S, cx - (r >= 3 ? 1 : 0), cy, r >= 3 ? 3 : 2, 1);
  px(g, tn.U, cx, cy + 1);
  if (r >= 3) {
    // Dead leaves hang below it, the way a Joshua tree's do.
    px(g, B[2], cx - 1, cy + 2);
    px(g, B[3], cx + 1, cy + 2);
  }
}

// A shaggy trunk: a tone lit on its left, one on its right, bark flecks and a skirt of dead leaves
// along its edges, flaring at the foot and darkest under the arms.
function shaggyTrunk(g, B, p, base, rows, width) {
  for (let r = 0; r < rows; r += 1) {
    const w = width >= 3 && r < 3 ? width + 1 : width;
    const left = p.x - (w >> 1);
    const y = base - 1 - r;
    const under = r >= rows - 2 ? 1 : 0;
    for (let i = 0; i < w; i += 1) {
      let t = w >= 3 ? (i === 0 ? 0 : i === w - 1 ? 2 : 1) : w === 2 ? i + 1 : 1;
      if (w >= 3 && t === 1 && hash(i, r, p.seed) < 0.28) t = 3;
      px(g, B[Math.min(3, t + under)], left + i, y);
    }
    if (width >= 2 && r >= 2 && hash(r, 4, p.seed) < 0.36) px(g, B[1], left - 1, y);
    if (width >= 2 && r >= 2 && hash(r, 5, p.seed) < 0.36) px(g, B[3], left + w, y);
  }
}

// A Joshua tree's numbers at scale p.scale, growth s and base row `base`, in the wind at `time`: its total
// rows, trunk rows and width, rosette radius, and each arm's plan (reach, tip, swing). `top` is where the
// highest arm ends, the last one, one row over its rosette's top spike: where a vulture's or an owl's feet go.
export function joshuaGeom(p, s, base, time) {
  const total = Math.max(5, Math.round(TREE_ROWS * p.scale * s));
  const sway = wind(time, p.x);
  const trunkRows = Math.max(3, Math.round(total * 0.45));
  const width = total >= 18 ? 3 : total >= 12 ? 2 : 1;
  const r = total >= 26 ? 3 : total >= 12 ? 2 : 1;
  const arms = 2 + (p.seed % 2);
  const length = total - trunkRows;
  const y0 = base - trunkRows;
  const plan = [];
  for (let i = 0; i < arms; i += 1) {
    const lean = [-0.55, 0.55, 0.1][i];
    const reach = Math.max(2, Math.round(length * (0.75 + 0.25 * hash(i, p.seed, 6))));
    const dxTip = Math.round(lean * (reach - 1));
    const swung = reach - 1 > reach * 0.6 ? 1 : 0;
    plan.push({ i, lean, reach, dxTip, swung, tipX: p.x + dxTip + swung * sway, tipY: y0 - (reach - 1) });
  }
  const last = plan[arms - 1];
  return { total, sway, trunkRows, width, r, arms, y0, plan, top: { x: last.tipX, y: last.tipY - r - 1 } };
}

export function joshua(g, p, s, base) {
  const { pal } = g;
  const B = barkTones(pal.trunk);
  const tn = ramp(pal.joshua);
  const { total, sway, trunkRows, width, r, arms, y0, plan } = joshuaGeom(p, s, base, g.time);
  const spread = Math.max(...plan.map((a) => Math.abs(a.tipX - p.x))) + r + 2;
  groundShadow(g, p.x, base, Math.max(2, Math.round(spread * 0.6)));
  shaggyTrunk(g, B, p, base, trunkRows, width);
  const thick = total >= 18 ? 2 : 1;
  const rosettes = [];
  for (const a of plan) {
    // A point a share U of the way up the arm: it flares out fast, then rises, and bends with the wind.
    const at = (U) => ({
      x: p.x + Math.round(a.dxTip * (1 - (1 - U) ** 1.7)) + Math.round(a.swung * sway * U * U),
      y: y0 - Math.round(U * (a.reach - 1)),
    });
    const way = [0, 0.4, 0.75, 1].map(at);
    const dark = a.tipY + r + 3;
    for (let k = 0; k < 3; k += 1) {
      const w0 = k === 0 ? thick : k === 1 ? thick : 1;
      const w1 = k === 0 ? thick : 1;
      limb(g, B, way[k].x, way[k].y, way[k + 1].x, way[k + 1].y, w0, w1, dark);
    }
    rosettes.push({ x: a.tipX, y: a.tipY, r });
    if (total >= 18 && a.reach >= 8) {
      const f = at(0.5);
      const side = a.lean < 0 ? -1 : a.lean > 0 ? 1 : p.seed % 2 ? 1 : -1;
      const bx = f.x + side * Math.round(a.reach * 0.32) + Math.round(sway * 0.8);
      const by = f.y - Math.round(a.reach * 0.26);
      limb(g, B, f.x, f.y, bx, by, 1, 1, by + r + 2);
      rosettes.push({ x: bx, y: by, r: Math.max(1, r - 1) });
      if (arms === 2 && a.reach >= 12) {
        const f2 = at(0.3);
        const bx2 = f2.x - side * Math.round(a.reach * 0.28) + Math.round(sway * 0.6);
        const by2 = f2.y - Math.round(a.reach * 0.2);
        limb(g, B, f2.x, f2.y, bx2, by2, 1, 1, by2 + r + 2);
        rosettes.push({ x: bx2, y: by2, r: Math.max(1, r - 1) });
      }
    }
  }
  // Low rosettes first, so a higher one sits over them.
  for (const q of rosettes.sort((m, n) => n.y - m.y)) rosette(g, tn, B, q.x, q.y, q.r);
}

// ---- Yucca ----------------------------------------------------------------------------------------

// A yucca: a rosette of stiff sword leaves round a short trunk. The upright leaves catch the light, the
// outer ones lie flatter and darker, and each leaf is a tapering blade, thickest above its dark base.
// The flower stalk, on every third plant, bends with the wind at its top.
const BLADES = [
  // [dx, dy]
  [-1, -0.2],
  [1, -0.2],
  [-0.7, -0.7],
  [0.7, -0.7],
  [-0.3, -1],
  [0.3, -1],
  [0, -1],
];
export function yucca(g, p, s, base) {
  const { pal } = g;
  const tn = ramp(pal.yucca);
  const B = barkTones(pal.trunk);
  const length = Math.max(2, Math.round((5 + (p.seed % 4)) * p.scale * s));
  const y0 = base - 2;
  groundShadow(g, p.x, base, Math.max(2, Math.round(length * 0.85)));
  px(g, B[1], p.x, base - 2);
  px(g, B[2], p.x, base - 1);
  if (length >= 4) {
    px(g, B[3], p.x - 1, base - 1);
    px(g, B[2], p.x + 1, base - 1);
  }
  for (const [dx, dy] of BLADES) {
    const flat = Math.abs(dx) > 0.6;
    const pts = [];
    for (let i = 0; i <= length; i += 1)
      pts.push([Math.round(p.x + dx * i), Math.round(y0 + dy * i + 0.15 * (i / length) * (i / length) * length)]);
    const cells = [];
    for (let i = 1; i < pts.length; i += 1) cells.push(...line4(...pts[i - 1], ...pts[i]));
    const mid = Math.abs(dx) > 0.6 ? 0 : Math.abs(dx) > 0.2 ? 1 : 2;
    cells.forEach(([x, y], j) => {
      const u = j / Math.max(1, cells.length - 1);
      const body = mid === 2 ? tn.H : mid === 1 ? tn.T : tn.S;
      px(g, u < 0.12 ? tn.U : u > 0.8 ? (mid === 0 ? tn.T : tn.H) : body, x, y);
      if (length >= 5 && u > 0.1 && u < 0.78) {
        if (flat) px(g, mid === 0 ? tn.U : tn.S, x, y + 1);
        else px(g, tn.S, x + (dx < 0 ? -1 : 1), y);
      }
    });
  }
  if (p.seed % 3 === 0 && s >= 0.9) {
    const stalk = Math.round(length * 1.6);
    const topY = base - 2 - stalk - 4;
    const bend = gust(g.time, p.x) * 1.1;
    const at = (y) => p.x + Math.round(bend * ((base - 2 - y) / (stalk + 4)) ** 2);
    const cream = "#f4ecc0";
    const bloom = [mix(cream, "#ffffff", 0.45), cream, mix(cream, pal.yucca[1], 0.5), mix(cream, pal.yucca[2], 0.7)];
    for (let y = base - 3; y > topY + 4; y -= 1) px(g, tn.S, at(y), y);
    const widths = [3, 5, 5, 5, 3];
    widths.forEach((w, k) => {
      const y = topY + k;
      for (let x = -(w >> 1); x <= w >> 1; x += 1) {
        const t = k === 0 ? 0 : k === 4 ? 3 : k === 3 ? 2 : 1;
        const fleck = hash(x, k, p.seed) < 0.3 ? Math.max(0, t - 1) : t;
        px(g, bloom[fleck], at(y) + x, y);
      }
    });
  }
}

// ---- Teddy-bear cholla ----------------------------------------------------------------------------

// The teddy-bear cholla: a dark stem with arms of fat, glowing joints, each one pale where the spines
// catch the light and darker at its base, and a soft shadow under it. It ignores p.scale, as it always has,
// so the clearing does not shrink it. Its palette is cholla: [glow, light, mid, stem].
export function cholla(g, p, s, base) {
  const [glow, light, mid, stem] = g.pal.cholla;
  const joints = Math.max(1, Math.round((3 + (p.seed % 2)) * s));
  groundShadow(g, p.x, base, joints >= 3 ? 4 : 2);
  const joint = (x, y) => {
    rect(g, mid, x - 1, y, 3, 3);
    rect(g, light, x - 1, y, 2, 2);
    rect(g, glow, x - 1, y, 1, 1);
    if (hash(x, y, p.seed) > 0.5) rect(g, glow, x + 1, y + 1, 1, 1);
  };
  rect(g, stem, p.x, base - joints * 3, 1, joints * 3);
  for (let i = 0; i < joints; i += 1) joint(p.x, base - (i + 1) * 3);
  if (joints >= 3) {
    line(g, stem, p.x, base - 6, p.x - 3, base - 9);
    joint(p.x - 3, base - 11);
    joint(p.x - 3, base - 14);
    line(g, stem, p.x, base - 5, p.x + 3, base - 7);
    joint(p.x + 3, base - 9);
  }
}

// ---- Ocotillo -------------------------------------------------------------------------------------

// An ocotillo: seven whip-like canes from a woody crown, tight at the foot and arching out as they rise.
// Each cane is two pixels wide low down (lit on its left, shaded on its right) and one above, with
// small leaves along it on both sides; the canes behind are a tone darker. A few canes end in a red
// flower. The canes bend with the wind, the tips most, a beat apart.
export function ocotillo(g, p, s, base) {
  const { pal } = g;
  const tn = ramp(pal.ocotillo);
  const dim = { H: tn.T, T: tn.S, S: tn.U, U: tn.U };
  const B = barkTones(pal.trunk);
  const length = Math.max(3, Math.round((16 + (p.seed % 8)) * p.scale * s));
  groundShadow(g, p.x, base, Math.max(2, Math.round(length * 0.32)));
  rect(g, B[1], p.x - 1, base - 2, 3, 2);
  px(g, B[0], p.x - 1, base - 2);
  px(g, B[3], p.x + 1, base - 1);
  let tips = 0;
  for (const i of [0, 6, 1, 5, 2, 4, 3]) {
    const far = i === 0 || i === 1 || i === 5 || i === 6;
    const c = far ? dim : tn;
    const dx = (i - 3) * 0.16;
    const len = Math.round(length * (0.8 + 0.2 * hash(i, p.seed, 2)));
    const x0 = p.x + (i - 3) * 0.5;
    const reach = dx * len;
    const amp = clamp(len / 14, 0.3, 1.4) * 1.4;
    const wave = (u) => gust(g.time - i * 0.12, p.x) * amp * u * u;
    let prev = null;
    for (let y = 0; y <= len; y += 1) {
      const u = y / len;
      const x = Math.round(x0 + reach * u ** 1.4 + wave(u));
      const row = base - 1 - y;
      const wide = len >= 14 && u < 0.3 && !far;
      if (wide) {
        px(g, c.H, x, row);
        px(g, c.S, x + 1, row);
      } else {
        px(g, u > 0.85 ? c.H : c.T, x, row);
      }
      if (prev !== null && prev !== x) px(g, c.T, x, row + 1);
      if (len >= 8 && u > 0.2 && u < 0.94 && y % 3 === 1 && hash(y, i, p.seed + 7) < 0.7) {
        const left = hash(y, i, p.seed) < 0.5;
        px(g, left ? c.T : c.S, left ? x - 1 - (wide ? 0 : 0) : x + (wide ? 2 : 1), row);
      }
      prev = x;
      if (y === len && s >= 0.8 && (i + p.seed) % 3 === 0 && tips < 2) {
        px(g, pal.tip, x, row);
        px(g, mix(pal.tip, "#000000", 0.28), x, row + 1);
        tips += 1;
      }
    }
  }
}

// ---- Prickly pear ---------------------------------------------------------------------------------

// A prickly pear: flat oval pads, each joined to the one below at its edge, in four tones lit from above
// (light on the upper left, shaded lower right, darkest along the underside where it meets the pad
// below), with pale spines on a grid. Fruit on the highest pad, and on one more on some plants.
export function pad(g, p, s, base) {
  const { pal } = g;
  const tn = ramp(pal.pad);
  const count = Math.max(1, Math.round((3 + (p.seed % 2)) * s));
  const pads = [
    [0, 0],
    [3, -5],
    [-3, -6],
    [1, -10],
    [5, -10],
  ].slice(0, count);
  groundShadow(g, p.x + 1, base, count >= 3 ? 6 : 4);
  const spine = mix(tn.H, "#fff6cc", 0.55);
  const highest = pads.reduce((m, q, k) => (q[1] < pads[m][1] ? k : m), 0);
  for (const [i, [dx, dy]] of pads.entries()) {
    const cx = p.x + dx;
    const top = base - 7 + dy;
    for (let y = top; y < top + 7; y += 1) {
      const ny = (y + 0.5 - (top + 3.5)) / 3.5;
      const half = Math.round(3 * Math.sqrt(Math.max(0, 1 - ny * ny)));
      if (half < 1) continue;
      for (let x = cx - half; x <= cx + half; x += 1) {
        const u = (x - cx) / 3;
        const v = (y - top) / 7;
        const score = u * 0.4 + v * 0.8 + (hash(x - cx, y - top, p.seed + i) - 0.5) * 0.3;
        const tone = score < 0.12 ? tn.H : score < 0.5 ? tn.T : score < 0.85 ? tn.S : tn.U;
        px(g, tone, x, y);
      }
    }
    for (const [ax, ay] of [
      [-1, 2],
      [1, 3],
      [-1, 4],
    ]) {
      px(g, spine, cx + ax, top + ay);
    }
    if (s >= 0.8 && (i === highest || (p.seed % 2 === 0 && i === 1 && highest !== 1)))
      px(g, pal.fruit[i % 2], cx, top - 1);
  }
}

export const FAMILY = {
  id: "desert-plants",
  title: "Desert trees and cactus",
  group: "Trees",
  differ: "arms, spines",
};
