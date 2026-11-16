// The wide-canopy family, on the broadleaf build (broadleaf.js, whose bark, trunk, shadow and clump
// helpers it reuses): the Serengeti umbrella thorn, the rainforest strangler fig and the dipterocarp.
// A trunk lit on its left and shaded on its right, boughs lit on top and shaded under, leaves in
// separate clumps lit from above in four tones with sky between, a soft ground shadow (palette key
// groundShadow), and clumps that sway with the bough they sit on. Each tree has its own shape from
// side-on photographs: the thorn a thin flat roof of layered clumps held up on a fan of forking
// branches; the fig a lattice of fused roots with buttresses and aerial roots that swing, under a
// broad dense crown; the dipterocarp a very tall straight pale trunk with small buttresses and a high
// cauliflower crown of rounded clumps.
//
// Each painter (acaciaTree, figTree, dipterocarpTree) takes the painter `g`, a plant `p`, its size `s`
// (0..1) and its base row, and records the crown it drew in p.crown ({ cx, top, half, bottom }).
// Palette keys: the thorn reads trunk and acacia; the fig trunk and canopy; the dipterocarp trunk,
// canopy, liana and leaf.
//
// The numbers a scene reads come from one place. acaciaGeom, figGeom and dipterocarpGeom give a
// tree's rows, width and centre for scale p.scale, growth s and time (the wind moves the crown by a
// whole pixel), and the painters draw from exactly those numbers: the giraffe's browse band and the
// vulture's and roller's perch (the thorn's `under` and `top`), the eagle's and hornbill's perch (the
// dipterocarp's `perch`) and the fig's and dipterocarp's p.crown for the gibbon, the langur and the
// fireflies. A scene never repeats the formulas, so painter and behaviour cannot drift apart.
import { barkTones, barkTrunk, groundShadow, leafClump, line4 } from "./broadleaf.js";
import { clamp, hash, lerp, rect, smooth, wind } from "./pixel.js";

const px = (g, colour, x, y) => rect(g, colour, Math.round(x), Math.round(y), 1, 1);

// ---- Shared parts -------------------------------------------------------------------------------

// A bough from (x0, y0) to (x1, y1), w0 thick tapering to w1, its upper or left side lit and its
// underside shaded. `shift` darkens it a tone; rows at or above `darkY` (under a crown) darken one more.
function crownBough(g, B, x0, y0, x1, y1, w0 = 1, w1 = 1, shift = 0, darkY = -1e9) {
  const pts = line4(x0, y0, x1, y1);
  const flat = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  pts.forEach(([x, y], i) => {
    const w = Math.max(1, Math.round(lerp(w0, w1, i / Math.max(1, pts.length - 1))));
    const d = shift + (y <= darkY ? 1 : 0);
    for (let k = 0; k < w; k += 1) {
      const t = w === 1 ? 1 : k === 0 ? 1 : 2;
      const c = B[Math.min(3, t + d)];
      if (flat) px(g, c, x, y + k);
      else px(g, c, x + k - (w >> 1), y);
    }
  });
}

// A gentle push on one clump, out of step from clump to clump: -1, 0 or 1 pixel, more on a big tree.
function jig(time, p, i, amp) {
  return Math.round(Math.sin(time * 1.7 + i * 1.9 + p.x * 0.05) * 0.85 * amp);
}

// A hanging strand (a liana or an aerial root) from (x, y0), `len` long, its foot swung `swing` pixels
// out: the top stays put and each row goes a little further, joined edge to edge.
function hang(g, colour, x, y0, len, swing, width = 1, footColour = colour) {
  let prev = x;
  for (let d = 0; d < len; d += 1) {
    const dx = Math.round(swing * (d / Math.max(1, len - 1)) ** 1.5);
    const c = width > 1 && d >= len / 2 ? footColour : colour;
    px(g, c, x + dx, y0 + d);
    if (dx !== prev - x) px(g, c, x + dx, y0 + d - 1);
    if (width > 1 && d >= len / 2) px(g, footColour, x + dx + 1, y0 + d);
    prev = x + dx;
  }
}

// A flat tier of leaves y0..y0+h-1 rows, w wide: a squared-off ellipse, its top in light, its lower
// edge ragged, lit from above in four tones. Returns its box.
function tierClump(g, cx, y0, w, h, tones, seed, dark = 0, ragged = 0.3) {
  const rx = w / 2;
  const ry = h / 2;
  const cy = y0 + ry;
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x += 1) {
      const u = (x + 0.5 - cx) / rx;
      const v = (y + 0.5 - cy) / ry;
      const d = Math.abs(u) ** 2.5 + Math.abs(v) ** 2.2;
      if (d > 1) continue;
      const hx = x - Math.round(cx);
      if (d > 0.5 && hash(hx, y - y0, seed) < ragged * (v > 0 ? 1.1 : 0.7)) continue;
      const score = ((y - y0 + 0.5) / h) * 0.85 + (hash(hx, y - y0, seed + 1) - 0.5) * 0.28 + dark - u * 0.06;
      const tone = score < 0.26 ? 0 : score < 0.55 ? 1 : score < 0.8 ? 2 : 3;
      px(g, tones[tone], x, y);
    }
  }
  return { left: cx - rx, right: cx + rx, top: y0, bottom: y0 + h - 1 };
}

// A rounded clump that fills rows y0..y1 (inclusive) exactly, w wide, on leafClump: its box is the
// requested rows, so a crown's top and bottom stay where the scene expects them.
function roundClump(cx, y0, y1, w, flat = 0.42) {
  const lumps = w >= 6;
  const h = Math.max(2, y1 - y0 - (lumps ? 1.02 : 0.02));
  const cy = y0 + h * (1 - flat) + (lumps ? 1.01 : 0.01);
  return { cx, cy, w, h, y0, y1, flat };
}

// ---- The umbrella thorn -------------------------------------------------------------------------

const ACACIA_ROWS = 30;

// The thorn's numbers: its total rows, the canopy's rows (top..under, H rows), its half width and its
// centre (the lean and the wind included). The giraffe's browse band and the perch spots read these.
export function acaciaGeom(p, s, base, time) {
  const total = Math.max(5, Math.round(ACACIA_ROWS * p.scale * s));
  const lean = p.seed & 1 ? 1 : -1;
  const under = base - Math.round(total * 0.62);
  const half = Math.round(total * 0.95);
  const H = Math.max(3, Math.round(total * 0.3));
  return { total, lean, under, half, H, top: under - H + 1, cx: p.x + 2 * lean + wind(time, p.x) };
}

// A thin trunk that forks twice into a fan of branches you can see under the roof, which is two tiers of
// flat leaf clumps (sky between them) swaying with the branch tips they sit on.
export function acaciaTree(g, p, s, base) {
  const { pal, time } = g;
  const B = barkTones(pal.trunk);
  const { total, lean, under, half, H, top, cx } = acaciaGeom(p, s, base, time);
  const amp = clamp(total / 30, 0.4, 1.2);
  const fork = Math.round(total * 0.32);
  const forkY = base - fork;
  const forkX = p.x + lean;
  groundShadow(g, cx, base, half * 0.8);

  // The thin trunk, a little wider at the foot.
  const foot = total >= 24 ? 3 : total >= 12 ? 2 : 1;
  barkTrunk(
    g,
    B,
    base,
    fork,
    (r) => (r < fork * 0.45 ? foot : Math.max(1, foot - 1)),
    (r) => p.x + Math.round((lean * r) / Math.max(1, fork)),
    Math.round(fork * 0.7),
  );

  // The roof's two tiers. Tips sit under the lower tier's clumps; the upper tier is staggered over them.
  const two = H >= 6;
  const hB = two ? Math.max(2, H - Math.max(2, Math.round(H * 0.45)) - (H >= 8 ? 1 : 0)) : H;
  const hA = H - hB - (H >= 8 ? 1 : 0);
  const n = total >= 24 ? 6 : total >= 14 ? 4 : 3;
  const wB = Math.max(5, Math.round(((2 * half) / n) * 1.15));
  const space = (2 * half - wB) / (n - 1);
  const tips = [];
  for (let k = 0; k < n; k += 1) {
    const rel = -(half - wB / 2) + space * k;
    tips.push({ rel, x: Math.round(cx + rel + jig(time, p, k, amp)), k });
  }
  const tipY = under - hB + 2;
  const dark = under + 3;

  // Branches: the trunk splits in a fan, then each limb forks again to two tips.
  const w0 = total >= 24 ? 2 : 1;
  const pairs = [];
  for (let k = 0; k + 1 < n; k += 2) pairs.push([tips[k], tips[k + 1]]);
  if (n % 2) pairs.push([tips[n - 1]]);
  for (const grp of pairs) {
    const ex = grp.reduce((a, t) => a + t.x, 0) / grp.length;
    const ey = forkY - Math.round((forkY - tipY) * 0.5);
    const mx = Math.round(lerp(forkX, ex, 0.82));
    crownBough(g, B, forkX, forkY, mx, ey, w0, 1, 0, dark);
    for (const t of grp) crownBough(g, B, mx, ey, t.x, tipY, 1, 1, 0, dark);
  }

  // The lower tier, then the upper tier staggered over it with a row of sky between.
  const lower = tips.map((t) => tierClump(g, t.x, under - hB + 1, wB, hB, pal.acacia, p.seed + t.k * 5, 0.1, 0.24));
  if (two) {
    const wA = Math.round(space * 1.5);
    for (let k = 0; k + 1 < n; k += 1) {
      const rel = (tips[k].rel + tips[k + 1].rel) / 2;
      const ax = Math.round(cx + rel + jig(time, p, k + 0.5, amp));
      const y0 = top + Math.round(1.1 * (Math.abs(rel) / half) ** 2);
      // A twig lifts from the branch tip to the upper clump through the gap.
      crownBough(g, B, tips[k].x, under - hB + 1, ax, y0 + hA - 1, 1, 1, 1);
      tierClump(g, ax, y0, wA, Math.max(2, hA - (y0 - top)), pal.acacia, p.seed + k * 7 + 3, -0.02, 0.2);
    }
  }
  p.crown = { cx, top, half, bottom: under + 1 };
  return lower;
}

// ---- The strangler fig --------------------------------------------------------------------------

const FIG_ROWS = 42;

// The fig's numbers: its total rows, the crown's rows (top..crownBottom, h rows), its width and centre.
export function figGeom(p, s, base, time) {
  const total = Math.max(4, Math.round(FIG_ROWS * p.scale * s));
  const h = Math.max(3, Math.round(total * 0.42));
  const w = Math.round(total * 1.25);
  return { total, top: base - total, h, w, crownBottom: base - total + h, cx: p.x + wind(time, p.x) };
}

// Place a crown's clumps from fractional specs [fx, y0f, y1f, wf, head, dark]: columns across the crown's
// width, rows down its height. The crown's top and bottom rows land exactly on its box.
function crownClumps(cx, top, W, Hh, specs) {
  return specs
    .map(([fx, y0f, y1f, wf, head, dark], i) => {
      const w = Math.max(3, Math.round(W * wf));
      const y0 = top + Math.round(y0f * Hh);
      const y1 = Math.max(y0 + 1, top + Math.round(y1f * Hh) - 1);
      return { ...roundClump(Math.round(cx + fx * W), y0, y1, w, head ? 0.36 : 0.42), head, dark, i };
    })
    .filter((c) => c.w >= 3);
}

const CROWN_SPECS = [
  [-0.02, 0.6, 1.0, 0.3, false, 0.2],
  [-0.38, 0.5, 1.0, 0.22, false, 0.16],
  [0.38, 0.45, 0.96, 0.2, false, 0.14],
  [-0.27, 0.28, 0.88, 0.34, false, 0.1],
  [0.27, 0.25, 0.9, 0.34, false, 0.1],
  [-0.3, 0.16, 0.62, 0.28, false, 0.02],
  [0.32, 0.2, 0.64, 0.28, false, 0.02],
  [0.02, 0, 0.66, 0.34, true, -0.04],
];

function paintClumps(g, clumps, tones, seed, time, p, amp) {
  // Low clumps first so a higher clump covers the shaded top of the one beneath; each one swings a pixel
  // with its bough, the head least.
  const boxes = [];
  [...clumps]
    .sort((a, b) => b.cy - a.cy)
    .forEach((c) => {
      const dx = c.head ? 0 : jig(time, p, c.i, amp);
      boxes.push(
        leafClump(g, c.cx + dx, c.cy, c.w, c.h, tones, seed + c.i * 7, {
          dark: c.dark,
          ragged: c.head ? 0.1 : 0.2,
          flat: c.flat,
        }),
      );
      c.dx = dx;
    });
  return boxes;
}

// A trunk that is a lattice of fused roots (four tones, dark hollows between), roots flaring at its foot,
// boughs forking into a broad dense crown of clumps, and aerial roots that hang from the boughs and swing.
export function figTree(g, p, s, base) {
  const { pal, time } = g;
  const B = barkTones(pal.trunk);
  const { total, top, h, w, crownBottom, cx } = figGeom(p, s, base, time);
  const amp = clamp(total / 30, 0.45, 1.3);
  const width = total >= 30 ? 9 : total >= 18 ? 6 : total >= 10 ? 3 : 1;
  const half = width >> 1;
  groundShadow(g, p.x, base, Math.round(w * 0.4));

  // The lattice trunk: strands that weave, lit to the left, shaded to the right, with hollows between.
  const strands = Math.max(1, Math.round(width / 2));
  for (let y = crownBottom - 2; y < base; y += 1) {
    const under = y < crownBottom + 5 ? 1 : 0;
    if (width >= 6) rect(g, B[3], p.x - half, y, width, 1);
    for (let k = 0; k < strands; k += 1) {
      const home = p.x - half + Math.round(((k + 0.5) / strands) * width);
      const x = home + Math.round(Math.sin(y * 0.35 + k * 2.3 + p.seed) * 1.2);
      if (width >= 6 && hash(k, y >> 1, p.seed + 4) < 0.14) continue;
      const t = strands === 1 ? 1 : Math.min(2, Math.floor((k / strands) * 3));
      if (width >= 6) {
        px(g, B[Math.min(3, t + under)], x - 1, y);
        px(g, B[Math.min(3, t + 1 + under)], x, y);
      } else {
        px(g, B[Math.min(3, (k % 2 ? 2 : 1) + under)], x, y);
      }
    }
    // The trunk's right edge keeps a shaded column so it reads as one body.
    if (width >= 6) px(g, B[3], p.x + half, y);
  }

  // Roots flaring over the ground: lit planks to the left, shaded to the right.
  if (width >= 6) {
    for (const side of [-1, 1]) {
      for (let k = 1; k <= 3; k += 1) {
        const reach = half + k * Math.round(width * 0.45);
        const rise = Math.round(width * 0.9) - k * 2;
        crownBough(
          g,
          B,
          p.x + side * (half - 1),
          base - rise,
          p.x + side * reach,
          base - 1,
          k === 1 ? 2 : 1,
          1,
          side > 0 ? 1 : 0,
        );
      }
    }
  }

  // The crown: boughs fork from the trunk top into the low clumps, then the clumps over them.
  const clumps = crownClumps(cx, top, w, h, total >= 14 ? CROWN_SPECS : CROWN_SPECS.slice(3));
  const lowest = (x) =>
    clumps.reduce((m, c) => (Math.abs(x - c.cx) <= c.w / 2 - 1 ? Math.max(m, c.y1) : m), top + h - 2);
  if (width >= 6) {
    const dark = crownBottom + 1;
    const tl = clumps.find((c) => c.i === 1);
    const tr = clumps.find((c) => c.i === 2);
    const midY = crownBottom + Math.round(width * 0.45);
    if (tl) crownBough(g, B, p.x - half + 1, midY, tl.cx + jig(time, p, tl.i, amp), tl.y1 - 2, 2, 1, 0, dark);
    if (tr) crownBough(g, B, p.x + half - 1, midY, tr.cx + jig(time, p, tr.i, amp), tr.y1 - 2, 2, 1, 1, dark);
    crownBough(g, B, p.x, midY + 1, Math.round(cx), crownBottom - 3, 2, 1, 0, dark);
  } else if (width >= 3) {
    crownBough(g, B, p.x, crownBottom + 1, Math.round(cx), crownBottom - 3, 1, 1, 0, crownBottom + 3);
  }
  const boxes = paintClumps(g, clumps, pal.canopy, p.seed, time, p, amp);

  // Aerial roots from the boughs and the clumps' undersides: thin, swinging at the foot; a few reach the
  // ground and thicken there.
  if (total >= 20) {
    const count = Math.round(w / 6);
    for (let i = 0; i < count; i += 1) {
      const x = Math.round(cx - w / 2 + 3 + ((i + 0.5) / count) * (w - 6));
      if (Math.abs(x - p.x) <= half + 1) continue;
      const y0 = lowest(x);
      const len = Math.round((base - y0) * (0.35 + hash(i, p.seed, 6) * 0.65));
      const swing = Math.sin(time * 1.5 + i * 1.3 + p.x * 0.05) * (0.9 + 0.5 * amp) * (len > 14 ? 1 : 0.6);
      const reach = len >= base - y0 - 2;
      hang(g, B[2], x, y0, len, swing, reach ? 2 : 1, B[1]);
    }
  }
  p.crown = { cx, top, half: w >> 1, bottom: crownBottom };
  return boxes;
}

// ---- The dipterocarp ----------------------------------------------------------------------------

const TREE_ROWS = 66;

// The dipterocarp's numbers: its total rows, the crown's height and width and centre, and `perch`, where
// the eagle's and the hornbill's feet go.
export function dipterocarpGeom(p, s, base, time) {
  const total = Math.max(5, Math.round(TREE_ROWS * p.scale * s));
  const crownW = Math.round(total * 0.62) + 2;
  return {
    total,
    top: base - total,
    crownH: Math.max(3, Math.round(total * 0.2)),
    crownW,
    cx: p.x + wind(time, p.x),
    // where the eagle's and the hornbill's feet go
    perch: { x: p.x + wind(time, p.x) + Math.round(crownW * 0.04), y: base - total + 1 },
  };
}

const DIP_SPECS = [
  [-0.02, 0.55, 1.0, 0.28, false, 0.22],
  [-0.36, 0.5, 1.0, 0.2, false, 0.16],
  [0.38, 0.4, 0.96, 0.2, false, 0.14],
  [-0.3, 0.3, 0.84, 0.3, false, 0.08],
  [0.32, 0.28, 0.86, 0.3, false, 0.08],
  [-0.16, 0.2, 0.7, 0.26, false, 0.02],
  [0.22, 0.24, 0.72, 0.26, false, 0.02],
  [0.04, 0, 0.62, 0.3, true, -0.04],
];

// A very tall straight pale trunk (lit left, shaded right) with small buttresses at its foot, bare limbs
// forking up into a high crown of rounded clumps with sky between, and lianas that swing from it.
export function dipterocarpTree(g, p, s, base) {
  const { pal, time } = g;
  const B = barkTones(pal.trunk);
  const { total, top, crownH: Hh, crownW: W, cx } = dipterocarpGeom(p, s, base, time);
  const amp = clamp(total / 40, 0.45, 1.3);
  const sway = cx - p.x;
  const width = total >= 52 ? 4 : total >= 34 ? 3 : total >= 16 ? 2 : 1;
  groundShadow(g, p.x, base, Math.max(width + 2, Math.round(W * 0.3)));

  // Trunk: straight, only its top follows the crown in the wind. It runs up into the crown.
  const trunkTop = top + Math.round(Hh * 0.6);
  const rows = base - trunkTop;
  barkTrunk(
    g,
    B,
    base,
    rows,
    () => width,
    (r) => p.x + Math.round(sway * smooth(clamp((r / total - 0.55) / 0.45, 0, 1))),
    Math.max(0, total - Hh - Math.round(total * 0.1)),
  );
  // Small buttresses: fins that flare from the foot and run out over the ground.
  if (total >= 18) {
    const bh = Math.max(3, Math.round(total * 0.15));
    const reach = Math.max(2, Math.round(total * 0.09));
    const left = p.x - (width >> 1);
    const right = left + width - 1;
    for (let r = 0; r < bh; r += 1) {
      const u = 1 - r / bh;
      const out = Math.round(reach * u * u);
      const y = base - 1 - r;
      if (out > 0) {
        rect(g, B[1], left - out, y, out, 1);
        rect(g, B[2], right + 1, y, out, 1);
        px(g, B[0], left - out, y);
        px(g, B[3], right + out, y);
      }
      const inner = Math.round(reach * 0.5 * u * u * u);
      if (inner > 1) {
        px(g, B[2], left - inner, y);
        px(g, B[1], right + inner, y);
      }
    }
  }

  // Bare limbs from the trunk up to the side clumps, lit on top and shaded under.
  const clumps = crownClumps(cx, top, W, Hh, total >= 18 ? DIP_SPECS : DIP_SPECS.slice(3));
  if (total >= 30) {
    const fy = top + Hh + 3 + Math.round(total * 0.04);
    const tl = clumps.find((c) => c.i === 1);
    const tr = clumps.find((c) => c.i === 2);
    const tx = Math.round(cx);
    const w0 = total >= 52 ? 2 : 1;
    if (tl) crownBough(g, B, tx, fy + 3, tl.cx + jig(time, p, tl.i, amp), tl.y1 - 2, w0, 1, 0, top + Hh + 4);
    if (tr) crownBough(g, B, tx, fy + 1, tr.cx + jig(time, p, tr.i, amp), tr.y1 - 2, w0, 1, 0, top + Hh + 4);
  }
  const boxes = paintClumps(g, clumps, pal.canopy, p.seed, time, p, amp);

  // Lianas: thin strands hanging from the crown's underside, each swinging a little at its foot.
  if (total >= 20) {
    const lw = W * 0.8;
    const count = Math.max(2, Math.round(lw / 9));
    for (let i = 0; i < count; i += 1) {
      const x = Math.round(cx - lw / 2 + ((i + 0.5) / count) * lw + (hash(i, p.seed, 3) - 0.5) * 3);
      const len = Math.round(5 + hash(i, p.seed, 4) * 14);
      const y0 = top + Hh - 2;
      const swing = Math.sin(time * 1.6 + i * 1.3 + p.x * 0.05) * (0.9 + 0.4 * amp);
      hang(g, pal.liana, x, y0, len, swing);
      for (let y = 3; y < len; y += 4) {
        const dx = Math.round(swing * (y / Math.max(1, len - 1)) ** 1.5);
        px(g, pal.leaf[1], x + dx + (y % 8 ? 1 : -1), y0 + y);
      }
    }
  }
  p.crown = { cx, top, half: W >> 1, bottom: top + Hh };
  return boxes;
}
