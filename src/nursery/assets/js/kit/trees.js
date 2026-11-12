// Tree painters shared by the scenes. Each takes the painter `g`, a plant `p`, its size `s`
// (0..1) and its base row, plus the scene's rows, tones and trunk colours. A painter records the
// crown it drew in p.crown, so leaves and petals can fall from it.
import { blob, clamp, foliage, hash, line, rect, row, wind } from "./pixel.js";

export function trunk(g, x, base, height, width, tones) {
  const left = x - (width >> 1);
  rect(g, tones[0], left, base - height, width, height);
  if (width >= 2) rect(g, tones[1], left + width - 1, base - height, 1, height);
}

// A rounded mass of leaves centred on (cx, cy), built from three overlapping lobes so its edge is
// lumpy, not an oval. `extra(dx, dy, tone)` may replace a leaf's colour.
export function clump(g, cx, cy, w, h, tones, seed, extra) {
  const box = { cx, top: cy - (h >> 1), w, h };
  const shade = foliage(box, tones, seed, extra);
  blob(g, cx, box.top, w, h, shade);
  blob(g, cx - Math.round(w * 0.26), box.top + 1, Math.round(w * 0.56), Math.round(h * 0.8), shade);
  blob(g, cx + Math.round(w * 0.26), box.top + 1, Math.round(w * 0.56), Math.round(h * 0.86), shade);
}

// A broadleaf's boughs, low to high: [height on the tree, side, reach, clump width, clump height],
// each a fraction of the tree's height. DOME adds a full, oval head.
const BOUGHS = [
  [0.38, -1, 0.24, 0.38, 0.22],
  [0.42, 1, 0.26, 0.4, 0.24],
  [0.58, -1, 0.15, 0.4, 0.26],
  [0.62, 1, 0.17, 0.38, 0.24],
  [0.76, 0, 0.02, 0.44, 0.26],
];
const DOME = [
  [0.74, -1, 0.09, 0.34, 0.24],
  [0.76, 1, 0.1, 0.34, 0.24],
  [0.86, 0, 0.01, 0.4, 0.26],
];

// The broadleaf family: a trunk that forks into boughs, each holding a clump of leaves, with sky
// between them. A species sets its height (`rows`), spread (`wide`), how high its boughs start
// (`lift`), a full head (`dome`), a lean of `lean` pixels at the top, flecks on its bark (`mark`) and
// flowers among its leaves (`extra`). A sapling is a stem under one clump.
export function broadleafTree(g, p, s, base, spec) {
  const { rows, tones, trunkTones, wide = 1, lift = 0, dome = false, lean = 0, mark, extra } = spec;
  const total = Math.max(3, Math.round(rows * p.scale * s));
  const foot = total >= 40 ? 4 : total >= 20 ? 3 : total >= 8 ? 2 : 1;
  const stem = Math.round(total * (0.6 + lift));
  const tilt = (r) => Math.round((lean * Math.min(1, total / 30) * r) / total);
  for (let r = 0; r < stem; r += 1) {
    const w = r < 2 && foot > 1 ? foot + 2 : r > stem * 0.6 ? Math.max(1, Math.min(2, foot), foot - 1) : foot;
    const left = p.x + tilt(r) - (w >> 1);
    rect(g, trunkTones[0], left, base - 1 - r, w, 1);
    if (w > 1) rect(g, trunkTones[1], left + w - 1, base - 1 - r, 1, 1);
    if (mark && hash(0, r, p.seed) < 0.3) rect(g, mark, left, base - 1 - r, Math.max(1, Math.min(2, w - 1)), 1);
  }
  const sway = wind(g.time, p.x);
  if (s < 0.3 || total < 10) {
    const w = Math.max(3, Math.round(total * 0.7));
    const h = Math.max(2, Math.round(total * 0.55));
    const cx = p.x + tilt(total) + sway;
    clump(g, cx, base - total + (h >> 1), w, h, tones, p.seed, extra);
    p.crown = { cx, top: base - total, half: w >> 1, bottom: base - total + h };
    return;
  }
  const boughs = (dome ? [...BOUGHS, ...DOME] : BOUGHS).map(([at, side, reach, cw, ch], i) => {
    const r = Math.round(total * (at + lift));
    const y = base - 1 - r;
    const out = Math.round(total * reach * wide);
    return {
      i,
      x: p.x + tilt(r),
      y,
      cx: p.x + tilt(r) + side * out + sway,
      cy: y - Math.round(total * reach * 0.7 * wide),
      w: Math.round(total * cw * Math.max(0.62, wide)),
      h: Math.max(3, Math.round(total * ch * Math.min(1, 0.7 + lift + wide * 0.3))),
    };
  });
  for (const b of boughs) line(g, trunkTones[1], b.x, b.y, b.cx, b.cy);
  for (const b of boughs) clump(g, b.cx, b.cy, b.w, b.h, tones, p.seed + b.i * 5, extra);
  const cx = p.x + tilt(total) + sway;
  p.crown = {
    cx,
    top: Math.min(...boughs.map((b) => b.cy - (b.h >> 1))),
    half: Math.max(...boughs.map((b) => Math.abs(b.cx - cx) + (b.w >> 1))),
    bottom: Math.max(...boughs.map((b) => b.cy + (b.h >> 1))),
  };
}

// The conifer family: a trunk you can see, boughs off it, and thin flat pads of needles with sky
// between, tapering to a single pointed leader. A species sets its height (`rows`), `tiers` of pads,
// `spread` (half its width at the foot, as a fraction of its height), `clear` (bare trunk, as a
// fraction of its height) and `droop`.
export function coniferTree(g, p, s, base, spec) {
  const { rows, tones, trunkTones, tiers, spread, clear = 0.1, droop = 0 } = spec;
  const total = Math.max(3, Math.round(rows * p.scale * s));
  const top = base - total;
  const foot = total >= 40 ? 3 : total >= 12 ? 2 : 1;
  const leader = Math.max(3, Math.round(total * 0.22));
  trunk(g, p.x, base, Math.max(2, total - leader), foot, trunkTones);
  const sway = wind(g.time, p.x);
  const cx = p.x + sway;
  // The leader: a narrow spire of needles that closes to one pixel at the tip.
  const reach = Math.max(1, Math.round(total * 0.05));
  const shade = foliage({ cx, top, w: reach * 2 + 1, h: leader }, tones, p.seed);
  for (let r = 0; r < leader; r += 1) {
    const half = Math.round((reach * r) / leader);
    row(g, top + r, cx - half, cx + half, shade);
  }
  const half0 = Math.max(2, Math.round(total * spread));
  p.crown = { cx: p.x, top, half: half0, bottom: base - Math.round(total * clear) };
  const count = clamp(Math.min(tiers, Math.floor(total / 4)), 2, tiers);
  const h = Math.max(2, Math.round(total * 0.085));
  for (let i = 0; i < count; i += 1) {
    const u = i / count;
    const y = base - 1 - Math.round(total * (clear + (0.8 - clear) * u));
    const half = Math.max(2, Math.round(half0 * (1 - u * 0.86)));
    const lean = u < 0.5 ? 0 : sway;
    for (const side of [-1, 1]) {
      const stagger = i % 2 === (side > 0 ? 0 : 1) ? 2 : 0;
      const padX = p.x + lean + side * Math.round(half * 0.52);
      const padY = y + stagger + Math.round(droop * half * 0.35);
      const w = Math.max(4, Math.round(half * 1.2));
      line(g, trunkTones[1], p.x, y - 2, padX, padY);
      const box = { cx: padX, top: padY - (h >> 1), w, h };
      blob(g, padX, box.top, w, h, foliage(box, tones, p.seed + i * 3 + side));
    }
  }
}
