// The conifer family: one build for every conifer, on the same footing as the broadleaf family
// (broadleaf.js, whose bark, bough, trunk, shadow and clump helpers it reuses). A trunk lit on its left
// and shaded on its right; boughs you can see; needles in sprays or clumps in four tones lit from above,
// with sky between them; a soft shadow on the ground (palette key groundShadow). In wind each bough bends
// at its tip and its needles go with it, the higher ones more.
//
// - `coniferTree`: a spire, a trunk under tiers of sprays closing to a pointed leader (the fir, the
//   meadow pine, the hemlock, the lodgepole). A species sets its height (`rows`), `tiers`, `spread` (half
//   its width at the foot, as a share of its height), `clear` (bare trunk), `top` (where the highest tier
//   stands), `droop` or `lift` of the sprays, `wide` (reach of a tier), `h` (spray thickness as a share of
//   the height), `taper`, `hang` (needles hanging, as on a hemlock), `nod` (a leader that hooks over),
//   `dense` (tiers that nearly meet) and `thin` (dead twig stubs on a long bare trunk).
// - `sequoiaTree`: a thick fluted trunk, crooked elbow boughs high up carrying clumps, a rounded crown.
// - `bookPine`: the Six Pine Trees' Scots pine, kept as the book drew it: a tall leaning trunk under five
//   flat clouds of needles.
//
// Every tree keeps its apex where the scenes' perches expect it: a spire's tip is the row base - total
// at x = p.x + wind(time, p.x), a sequoia's crown top is `sequoiaTop`.

import { barkTones, barkTrunk, bough, groundShadow, gust, leafClump } from "./broadleaf.js";
import { clamp, hash, lerp, rect, smooth, wind } from "./pixel.js";

const px = (g, colour, x, y) => rect(g, colour, Math.round(x), Math.round(y), 1, 1);

// ---- Needles -----------------------------------------------------------------------------------------

const toneAt = (score) => (score < 0.3 ? 0 : score < 0.6 ? 1 : score < 0.84 ? 2 : 3);

// A spray of needles along a bough, from (x0, y0) at the trunk side out to the tip (x1, y1): thick near
// the trunk, tapering to the tip, flat on top and ragged underneath, so sky shows through. Lit on top
// in four tones; `dark` shades a low tier. `hang` (0..1) hangs short needles from the underside, as on
// a hemlock. Every column overlaps the next, so the spray never hangs on by a corner.
function spray(g, tones, x0, y0, x1, y1, h, seed, o = {}) {
  const { dark = 0, hang = 0, taper = 0.7 } = o;
  const n = Math.abs(Math.round(x1) - Math.round(x0));
  const dir = x1 >= x0 ? 1 : -1;
  for (let i = 0; i <= n; i += 1) {
    const u = n ? i / n : 0;
    const x = Math.round(x0) + dir * i;
    const yc = lerp(y0, y1, u);
    const t = Math.max(2, h * (1 - taper * u ** 1.4));
    const top = Math.round(yc - t * 0.4);
    const bot = Math.round(yc + t * 0.6);
    for (let y = top; y <= bot; y += 1) {
      const rag = hash(x, y, seed);
      if (bot - top >= 2 && y === bot && i < n && rag < 0.34) continue;
      if (bot - top >= 3 && y === top && i > 1 && rag < 0.14) continue;
      const v = (y - top) / Math.max(1, bot - top);
      const score = v * 0.95 + (hash(x, y, seed + 1) - 0.5) * 0.3 + dark + u * 0.05;
      px(g, tones[toneAt(score)], x, y);
    }
    if (hang && hash(x, 7, seed + 2) < hang * 0.55 && i > 0) {
      px(g, tones[2], x, bot + 1);
      if (i === n || hash(x, 8, seed) < hang * 0.25) px(g, tones[3], x, bot + 2);
    }
  }
}

// A flat cloud of needles, w by h, for the Six Pine Trees: a level top with small lumps, a ragged underside
// with tufts hanging, a few holes of sky, lit from above in four tones and a little darker on its right.
function cloud(g, tones, cx, cy, w, h, seed, dark = 0) {
  const rx = w / 2;
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
    const dx = (x + 0.5 - cx) / rx;
    if (Math.abs(dx) > 1) continue;
    const t = Math.max(2, h * (0.8 + 0.3 * Math.sqrt(Math.max(0, 1 - dx * dx))));
    const lump = hash(x - Math.round(cx), 1, seed) < 0.3 && Math.abs(dx) < 0.8 ? 1 : 0;
    const top = Math.round(cy - t * 0.45) - lump;
    const bot = Math.round(cy + t * 0.55);
    for (let y = top; y <= bot; y += 1) {
      const rag = hash(x, y, seed);
      if (y === bot && bot - top >= 3 && rag < 0.3) continue;
      if (y > top && y < bot && w >= 10 && rag < 0.03) continue;
      const v = (y - top) / Math.max(1, bot - top);
      const score = v * 0.95 + dx * 0.1 + (hash(x, y, seed + 1) - 0.5) * 0.3 + dark;
      px(g, tones[toneAt(score)], x, y);
    }
    if (hash(x, 5, seed + 2) < 0.22 && w >= 8) px(g, tones[3], x, bot + 1);
  }
}

// The leader: a spire of needles over the trunk's top that closes to one pixel at the apex row (base -
// total). `nod` hangs the tip over to one side, as a hemlock's does. xAt(r) is the trunk's centre.
function leader(g, tones, base, total, len, reach, xAt, seed, nod = 0) {
  for (let k = 0; k < len; k += 1) {
    const r = total - 1 - k;
    const cx = Math.round(xAt(r));
    const half = Math.round((reach * k) / len);
    for (let dx = -half; dx <= half; dx += 1) {
      if (half >= 1 && Math.abs(dx) === half && k > 1 && hash(dx, k, seed) < 0.3) continue;
      const score = (k / len) * 1.3 + (dx > 0 ? 0.35 : dx < 0 ? -0.1 : 0.1) + (hash(dx, k, seed + 3) - 0.5) * 0.3;
      px(g, tones[toneAt(score)], cx + dx, base - 1 - r);
    }
  }
  if (nod && len >= 4) {
    // The apex row hooks over: up, across, and a short drop, all edge to edge.
    const top = base - total;
    const cx = Math.round(xAt(total - 1));
    const pts = [
      [0, 2],
      [0, 1],
      [nod, 1],
      [nod, 0],
      [2 * nod, 0],
      [2 * nod, 1],
    ];
    for (const [i, [dx, dy]] of pts.entries()) px(g, tones[i < 3 ? 1 : i < 5 ? 0 : 2], cx + dx, top + dy);
  }
}

// ---- The spire conifers: fir, young pine, hemlock, lodgepole --------------------------------------------

// Where a spire's parts stand at `time`: its height, trunk, tiers of boughs and sprays.
function spireLayout(p, s, base, spec, time) {
  const { rows, spread, clear = 0.1, tiers, droop = 0, lift = 0, top = 0.8 } = spec;
  const total = Math.max(3, Math.round(rows * p.scale * s));
  const amp = clamp(total / 30, 0.35, 1.3);
  const sway = wind(time, p.x); // the scene's own wind: the apex stands exactly here
  const xAt = (r) => p.x + sway * smooth(clamp((r / total - 0.3) / 0.7, 0, 1));
  const half0 = Math.max(2, Math.round(total * spread));
  const count = clamp(Math.min(tiers, Math.floor(total / 4)), 2, tiers);
  const sprays = [];
  for (let i = 0; i < count; i += 1) {
    const u = i / count;
    const r = Math.round(total * (clear + (top - clear) * u));
    const half = Math.max(2, Math.round(half0 * (1 - u * 0.86)));
    const hf = r / total;
    for (const side of [-1, 1]) {
      const stagger = i % 2 === (side > 0 ? 0 : 1) ? 2 : 0;
      const x0 = Math.round(xAt(r));
      const y0 = base - 1 - r + stagger;
      const reach = Math.max(2, Math.round(half * (spec.wide ?? 1.1)));
      const push = Math.round(gust(time, p.x + i * 6 + side * 9) * amp * (0.25 + 0.8 * hf));
      const x1 = x0 + side * reach + push;
      const y1 = Math.min(base - 4, y0 + Math.round(droop * reach * 0.38) - Math.round(lift * reach * 0.4));
      sprays.push({ x0, y0, x1, y1, side, half, i, u, reach });
    }
  }
  return { total, xAt, sprays, half0, count };
}

export function coniferTree(g, p, s, base, spec) {
  const { tones, trunkTones, h: hFrac = 0.085, hang = 0, nod = 0, dense = false, taper = 0.7, u0 = 0.35, thin } = spec;
  const B = barkTones(trunkTones);
  const { total, xAt, sprays, half0 } = spireLayout(p, s, base, spec, g.time);
  const len = Math.max(3, Math.round(total * 0.22));
  const foot = total >= 40 ? 3 : total >= 12 ? 2 : 1;
  groundShadow(g, p.x, base, Math.max(2, half0 * 0.8));
  const stem = total - Math.min(len, total - 1) + 2;
  const widthAt = (r) => {
    let w = Math.max(1, Math.round(lerp(foot, 1, r / Math.max(1, stem))));
    if (r < 2 && foot >= 2) w += 1;
    return w;
  };
  const shadeFrom = Math.round((spec.clear ?? 0.1) * total);
  barkTrunk(g, B, base, Math.min(total - 1, stem), widthAt, xAt, shadeFrom);
  // Bare stubs on a long clear trunk: a few dead twigs, so it is not a bare pole.
  if (thin) {
    for (let r = 3; r < (spec.clear ?? 0.1) * total; r += 4) {
      const side = hash(r, p.seed, 4) < 0.5 ? -1 : 1;
      if (hash(r, p.seed, 5) < 0.55) {
        const w = widthAt(r);
        const edge = side > 0 ? Math.round(xAt(r)) - (w >> 1) + w : Math.round(xAt(r)) - (w >> 1) - 1;
        px(g, B[2], edge, base - 1 - r);
        if (hash(r, p.seed, 6) < 0.4) px(g, B[2], edge + side, base - 2 - r);
      }
    }
  }
  const h = Math.max(2, Math.round(total * hFrac * (dense ? 1.15 : 1)));
  // Boughs first (so you see them between the needles), then the sprays, low tiers first so a higher
  // one sits over the tier beneath.
  for (const t of sprays) {
    const bx = Math.round(lerp(t.x0, t.x1, dense ? 0 : u0));
    const by = Math.round(lerp(t.y0, t.y1, dense ? 0 : u0));
    bough(g, B, t.x0, t.y0, bx, by, total >= 50 ? 2 : 1, 1, true);
  }
  [...sprays]
    .sort((a, b) => b.y0 - a.y0)
    .forEach((t) => {
      const ax = Math.round(lerp(t.x0, t.x1, dense ? 0 : u0));
      const ay = Math.round(lerp(t.y0, t.y1, dense ? 0 : u0));
      spray(g, tones, ax, ay, t.x1, t.y1, h, p.seed + t.i * 5 + t.side, { dark: 0.18 * (1 - t.u) - 0.04, hang, taper });
    });
  const reach = Math.max(1, Math.round(total * 0.05));
  leader(g, tones, base, total, Math.min(len, total - 1), reach, xAt, p.seed, nod ? (p.seed % 2 ? 1 : -1) : 0);
  p.crown = { cx: p.x, top: base - total, half: half0, bottom: base - Math.round(total * (spec.clear ?? 0.1)) };
}

// ---- The giant sequoia ---------------------------------------------------------------------------------

// A sequoia's boughs, low to high, on alternating sides: [height on the tree, side, reach, clump width,
// clump height], the last four as fractions of the tree's height.
const SEQUOIA_BOUGHS = [
  [0.46, -1, 0.09, 0.15, 0.07],
  [0.5, 1, 0.1, 0.16, 0.07],
  [0.57, -1, 0.11, 0.18, 0.09],
  [0.62, 1, 0.11, 0.18, 0.09],
  [0.69, -1, 0.1, 0.18, 0.09],
  [0.74, 1, 0.1, 0.17, 0.09],
  [0.81, -1, 0.08, 0.16, 0.09],
  [0.86, 1, 0.07, 0.15, 0.08],
  [0.91, -1, 0.04, 0.13, 0.08],
];

function sequoiaLayout(p, s, base, spec, time) {
  const { rows } = spec;
  const total = Math.max(8, Math.round(rows * p.scale * s));
  const amp = clamp(total / 40, 0.4, 1.3);
  const sway = wind(time, p.x);
  const foot = Math.max(3, Math.round(total * 0.15));
  const widthAt = (r) => Math.max(3, Math.round(foot * (1 - 0.55 * (r / total))));
  const flare = (r) => Math.round(Math.max(0, 1 - r / (total * 0.07)) ** 2 * foot * 0.35);
  const xAt = (r) => p.x + sway * smooth(clamp((r / total - 0.5) / 0.5, 0, 1));
  const boughs = [];
  const clumps = [];
  SEQUOIA_BOUGHS.forEach(([at, side, reach, cw, ch], i) => {
    const r = Math.round(total * at);
    const x0 = Math.round(xAt(r)) + side * (widthAt(r) >> 1);
    const y0 = base - 1 - r;
    const run = Math.max(3, Math.round(total * reach * 1.2));
    const push = Math.round(gust(time, p.x + i * 7) * amp * (0.35 + 0.8 * at));
    // An elbow bough: out and a little up, then up, as a sequoia's crooked limbs go.
    const ex = x0 + side * Math.round(run * 0.6) + Math.round(push * 0.4);
    const ey = y0 - Math.round(run * 0.25);
    const x1 = x0 + side * run + push;
    const y1 = y0 - Math.round(run * 0.55);
    boughs.push({ x0, y0, ex, ey, x1, y1, w0: total >= 50 ? 2 : 1 });
    const w = Math.max(4, Math.round(total * cw * 1.12));
    const h = Math.max(3, Math.round(total * ch * 1.05));
    clumps.push({ cx: x1, cy: y1 - Math.round(h * 0.25), w, h, dark: 0.16 * (1 - at) + (i % 2) * 0.04, i });
  });
  // The crown closes over the tip in one clump, a little off centre.
  const tw = Math.round(total * 0.24);
  const th = Math.max(3, Math.round(total * 0.13));
  const yTop = base - total + Math.round(total * 0.06) - (Math.round(total * 0.12) >> 1);
  const up = th * 0.64;
  const cy = yTop + 1 + Math.ceil(up);
  clumps.push({ cx: Math.round(p.x + sway + 1), cy, w: tw, h: th, dark: -0.05, i: 99, head: true });
  return { total, foot, widthAt, flare, xAt, boughs, clumps, yTop };
}

export function sequoiaTop(p, s, base, rows, time) {
  const total = Math.max(8, Math.round(rows * p.scale * s));
  const y = base - total + Math.round(total * 0.06) - (Math.round(total * 0.12) >> 1);
  return { x: p.x + wind(time, p.x) + 1, y };
}

export function sequoiaTree(g, p, s, base, spec) {
  const { tones, bark, depth } = spec;
  const { total, foot, widthAt, flare, xAt, boughs, clumps } = sequoiaLayout(p, s, base, spec, g.time);
  const tn = [depth[0], bark[0], bark[1], depth[1]]; // lit, base, shade, deepest
  groundShadow(
    g,
    p.x,
    base,
    Math.max(foot * 1.2, Math.max(...clumps.map((c) => Math.abs(c.cx - p.x) + c.w / 2)) * 0.8),
  );
  // The trunk: lit on the left, shaded on the right, fluted with grooves that run unbroken from the foot,
  // a tone darker once the crown shades it.
  const top = Math.round(total * 0.9);
  for (let r = 0; r < top; r += 1) {
    const w = widthAt(r) + flare(r) * 2;
    const cxr = Math.round(xAt(r));
    const left = cxr - (w >> 1);
    const dark = r >= total * 0.46 ? 1 : 0;
    for (let i = 0; i < w; i += 1) {
      const u = i / Math.max(1, w - 1);
      const off = left + i - p.x;
      const groove = Math.round(Math.sin(r * 0.2 + off * 1.3 + p.seed) * 0.9);
      const furrow = (off + groove + 60) % 3 === 0 && w >= 5;
      let t = u < 0.3 ? 0 : u < 0.7 ? 1 : 2;
      if (furrow) t += 1;
      px(g, tn[Math.min(3, t + dark)], left + i, base - 1 - r);
    }
  }
  if (s < 0.3 && total < 16) {
    // Too small for boughs: one rounded clump on the stem.
    leafClump(
      g,
      Math.round(xAt(total)),
      base - total + 1,
      Math.max(4, Math.round(total * 0.6)),
      Math.max(3, Math.round(total * 0.3)),
      tones,
      p.seed,
      { ragged: 0.2 },
    );
    return;
  }
  for (const b of boughs) {
    bough(g, tn, b.x0, b.y0, b.ex, b.ey, b.w0, 1, true);
    bough(g, tn, b.ex, b.ey, b.x1, b.y1, 1);
  }
  const drawn = [...clumps].sort((a, b) => b.cy - a.cy);
  const boxes = drawn.map((c) =>
    leafClump(g, c.cx, c.cy, c.w, c.h, tones, p.seed + c.i * 7, {
      dark: c.dark,
      ragged: c.head ? 0.12 : 0.26,
      flat: c.head ? 0.36 : 0.4,
    }),
  );
  p.crown = {
    cx: p.x,
    top: Math.min(...boxes.map((b) => b.top)),
    half: Math.round(Math.max(...clumps.map((c) => Math.abs(c.cx - p.x) + c.w / 2))),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
}

// ---- The Six Pine Trees (kept as the book drew them) ---------------------------------------------------

const BOOK_TIERS = [
  [1.0, 0.1, 0.7],
  [0.92, -0.4, 1],
  [0.83, 0.6, 1.1],
  [0.74, -0.2, 0.85],
  [0.66, 0.5, 0.6],
];

// A tall, bare, leaning trunk and a flat windswept crown in tiers on swept branches: the trunk lit and
// shaded with plated bark, the branches seen under each cloud, each flat cloud of needles lit from above
// with a ragged underside, and trunk, branches and clouds leaning and swaying together in wind. `rows` is
// its height, `tones` its needles and `bark` its trunk.
export function bookPine(g, p, s, base, spec) {
  const { time } = g;
  const { rows, tones, bark } = spec;
  const height = Math.max(4, Math.round(rows * p.scale * s));
  const lean = (p.seed % 2 ? 1 : -1) * (0.04 + (p.seed % 4) * 0.02);
  const sweep = p.seed % 3 === 0 ? -1 : 1;
  const amp = clamp(height / 40, 0.4, 1.3);
  const sw = (r) => gust(time, p.x) * amp * 0.9 * smooth(clamp((r / height - 0.4) / 0.6, 0, 1));
  const xAt = (r) => p.x + Math.round(r * lean) + Math.round(sw(r));
  const B = barkTones(bark);
  groundShadow(g, p.x + Math.round(height * lean * 0.5), base, Math.max(3, 10 * p.scale * s));
  const widthAt = (r) => (r < 3 ? 4 : r < height * 0.5 ? 3 : 2);
  // Scots pine bark: plated and darker low down, brighter orange up in the crown.
  const mark = (r, i, _w, t) => (r < height * 0.45 && hash(r >> 1, i, p.seed) < 0.18 ? B[Math.min(3, t + 1)] : null);
  barkTrunk(g, B, base, height, widthAt, xAt, Math.round(height * 0.62), mark);
  const tiers = [];
  if (s >= 0.3) {
    for (const [at, side, size] of BOOK_TIERS) {
      const r = Math.round(height * at);
      const px0 = xAt(r);
      const cx = Math.round(px0 + (side + sweep * 0.5) * 14 * p.scale * s);
      const cy = base - 1 - r;
      const w = Math.max(3, Math.round(24 * p.scale * size * s));
      const h = Math.max(2, Math.round(6 * p.scale * size * s));
      tiers.push({ r, x0: Math.round(px0), cx, cy, w, h, at });
    }
  }
  for (const t of tiers) {
    // A swept branch from the trunk up to the underside of its cloud, with a twig going up into it.
    const dir = t.cx >= t.x0 ? 1 : -1;
    const ex = t.cx - dir * Math.round(t.w * 0.18);
    bough(g, B, t.x0, t.cy + 2, ex, t.cy + 1, 1);
  }
  for (const t of [...tiers].sort((a, b) => b.cy - a.cy))
    cloud(g, tones, t.cx, t.cy, t.w, t.h, p.seed + t.r, 0.12 * (1 - t.at) * 3);
  if (s < 0.3) {
    // A young pine: bare trunk, a short pointed leader of needles.
    leader(g, tones, base, height, Math.max(3, Math.round(height * 0.3)), 1, xAt, p.seed);
  }
  p.crown = {
    cx: p.x,
    top: base - height,
    half: Math.round(14 * p.scale * s),
    bottom: base - Math.round(height * 0.6),
  };
}
