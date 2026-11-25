// The Thai rainforest scene, after Khao Sok, one of the oldest rainforests on earth: emergent
// dipterocarps on plank buttresses, strangler figs on a lattice of roots with aerial roots hanging
// from their crowns, clumps of giant bamboo and wild banana, tree ferns and cycads, all under dark
// limestone karst towers threaded with mist. A great hornbill pair, a crested serpent eagle and
// kingfishers fly over; a gibbon swings through the canopy, a dusky langur sits on a branch, and a
// line of otters, a macaque and an elephant with her calf pass below. At night one tree of
// fireflies flashes in time.
// A clouded leopard, Khao Sok's secret cat, pads along the floor and rests between walks.
import {
  elephantAt,
  felidAt,
  felidPoses,
  GIBBON_CALL_SECONDS,
  gibbonAt,
  LANGUR_HOP_SECONDS,
  LANGUR_REACH_SECONDS,
  langurAt,
  macaqueAt,
  OTTER_STRIDE,
  otterAt,
} from "../kit/animals.js";
import {
  doing,
  enter,
  enterBehind,
  fidget,
  flock,
  follow,
  isNight,
  narrow,
  percher,
  rest,
  settle,
  stride,
  stroll,
  walker,
  wander,
} from "../kit/critters.js";
import { mistAt, mistBand } from "../kit/effects.js";
import { circlerAt, flyerAt, kingfisherAt } from "../kit/flyers.js";
import { fireflyAt as glowAt, treeFireflies } from "../kit/insect.js";
import { bambooClump, cycadRosette, treeFern, wildBanana } from "../kit/palms.js";
import { blobSpots, circlerPerch, flyByPerch, goHome, unhidden } from "../kit/perch.js";
import {
  blob,
  CLEARING,
  clamp,
  clearing,
  foliage,
  grove,
  hash,
  placeLandmarks,
  rect,
  row,
  scatter,
  sortPlants,
  stroke,
} from "../kit/pixel.js";
import { dipterocarpGeom, dipterocarpTree, figGeom, figTree } from "../kit/widecanopy.js";

const MATURE = {
  tree: 3,
  karst: 3,
  bamboo: 2.5,
  banana: 2,
  treefern: 2,
  cycad: 2,
  fern: 1.5,
  bush: 2.5,
  rafflesia: 1,
  mushroom: 1,
};
const KARST_ROWS = 80;
const TREES = ["dipterocarp", "fig", "dipterocarp"];
const FIREFLIES = 26;
const MISTS = 8;

const LIGHT = {
  groundShadow: "rgba(60, 40, 20, 0.22)", // the soft shadow every animal, plant and rock casts on the ground
  clouded: { T: "#b8a27a", S: "#8e7a58", P: "#e6dcc4", D: "#3a3028", e: "#2a2420" },
  leaf: ["#7fae6e", "#5a9058", "#3e7346", "#2b5a3a"],
  fern: ["#8fbf78", "#649c5c", "#457d48", "#305f38"],
  bamboo: ["#c3d68a", "#8fb05a", "#6a8e42", "#4c6e30"],
  canopy: ["#6a9e72", "#4a815c", "#336649", "#234d38"],
  trunk: ["#b4a692", "#86786a", "#4c4038"],
  bud: ["#7a2e4a", "#a2465e"],
  cycad: ["#5f8a4a", "#3f6a36", "#6a5040"],
  liana: "#3a6e48",
  raff: ["#e24b26", "#f9d3b4", "#b73219", "#c98a5e", "#e2ab82", "#4a1710", "#f08a3a", "#ffd08a"],
  russula: ["#e8482f", "#c23220", "#f2ece0"],
  bolete: ["#a8743f", "#7d5230", "#ecdab4"],
  cup: ["#ee6a3a", "#c94a22"],
  coral: ["#f6bc45", "#e39a2a"],
  stink: ["#6e6c3c", "#f4f1e6", "#d0cbb8"],
  bracket: ["#e8863a", "#c4622a", "#f3c08a"],
  glow: ["#6ee27a", "#b9ffb0", "#eaffe2"],
  karst: ["#a3aeab", "#86928f", "#68746f"],
  soil: ["#8a5e40", "#74492f", "#5c3826"],
  litter: ["#b07a44", "#6e8a44"],
  line: "rgba(255, 255, 255, 0.34)",
  wet: "#4a2a15",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  fire: ["#f2b630", "#ffe58a"],
  monkey: ["#a69582", "#85735f", "#ecbfa6"],
  elephant: ["#9aa1a6", "#7c8389", "#b8979c", "#efe6d2", "#26262a"],
  elephantRoar: "#6a5e56",
  elephantDust: "#c8a070",
  hornbill: ["#26262c", "#f4f2ea", "#f2c230", "#e0862a"],
  serpent: ["#4a3626", "#000000", "#000000", "#e8c040", "#000000", "#f2efe6"],
  kingfisher: ["#2f7fc2", "#e8803a", "#2c2c34", "#f6f2ea"],
  gibbon: ["#b98a5c", "#2e2420", "#fdf6ea"],
  langur: ["#4e4c52", "#2a282c", "#f2efe8", "#8e8a90"],
  primate: { R: "#8c3b3b", f: "#fff6e6", song: "#7a5a3a", dark: false },
  otter: ["#6e4e36", "#4a3424", "#c9ad8a"],
  mist: "#ffffff",
  haze: "#f4f7f2",
};

const DARK = {
  groundShadow: "rgba(0, 0, 0, 0.3)",
  clouded: { T: "#7f7061", S: "#65574c", P: "#9b948f", D: "#31292e", e: "#272229" },
  leaf: ["#5e8e5c", "#46784c", "#33603e", "#244a30"],
  fern: ["#6a9a62", "#4e8052", "#386644", "#284e34"],
  bamboo: ["#9fb46e", "#7a974c", "#5e7b3c", "#45602e"],
  canopy: ["#4f8462", "#3c6c52", "#2c5642", "#1e4232"],
  trunk: ["#8a7e70", "#665a4e", "#2e2620"],
  bud: ["#6a2840", "#8a3a52"],
  cycad: ["#4a7040", "#33562e", "#4e3a2e"],
  liana: "#2e5a3c",
  raff: ["#e8512b", "#f3cba8", "#b23a20", "#b27a52", "#d09a70", "#2a0d0a", "#f0903e", "#ffd896"],
  russula: ["#e8553a", "#c23f2a", "#e6dfd0"],
  bolete: ["#a8743f", "#7d5230", "#d8c59c"],
  cup: ["#f07448", "#c9532c"],
  coral: ["#f6bc45", "#e39a2a"],
  stink: ["#8a8848", "#e8e4d6", "#b8b3a0"],
  bracket: ["#e8863a", "#c4622a", "#f3c08a"],
  glow: ["#5ff27a", "#b9ffb0", "#eaffe2"],
  karst: ["#4f5c5c", "#404c4c", "#323d3d"],
  soil: ["#3e2a1e", "#332318", "#281b12"],
  litter: ["#6a4426", "#4a6230"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#140a05",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  fire: ["#ffd24a", "#fff0a0"],
  monkey: ["#b3a28e", "#8e7d69", "#e8b49a"],
  elephant: ["#7c8388", "#61686d", "#94787c", "#d8d0bc", "#141416"],
  elephantRoar: "#e6dcc6",
  elephantDust: "#6a5a4c",
  hornbill: ["#4a4a54", "#e6e4dc", "#e8b82a", "#d07a26"],
  serpent: ["#6a5644", "#000000", "#000000", "#e0b838", "#000000", "#e6e2d8"],
  kingfisher: ["#3a8ad0", "#e8803a", "#52525e", "#e6e2d8"],
  gibbon: ["#8f6a4a", "#1e1815", "#f2ebdd"],
  langur: ["#6a686e", "#3a383c", "#e8e4dc", "#9a969c"],
  primate: { R: "#4a2a30", f: "#c8c0b4", song: "#e8d4a8", dark: true },
  otter: ["#7a5a42", "#56402e", "#c4a886"],
  mist: "#9fb4c8",
  haze: "#0b0b0b",
};

// A dipterocarp, the emergent giant, and a strangler fig, on the wide-canopy family's build
// (kit/widecanopy.js). The kit's dipterocarpGeom and figGeom give each crown's rows and centre, which the
// perches below read too.
function dipterocarp(g, p, s, base) {
  dipterocarpTree(g, p, s, base);
}

function fig(g, p, s, base) {
  figTree(g, p, s, base);
}

// The palm-like plants, on the family's build in kit/palms.js: a tree fern with a fiddlehead, a
// cycad's stiff rosette, giant bamboo, and a wild banana that hangs its bud below its leaves.
function treefern(g, p, s, base) {
  treeFern(g, p, s, base);
}

function cycad(g, p, s, base) {
  cycadRosette(g, p, s, base);
}

function bamboo(g, p, s, base) {
  bambooClump(g, p, s, base);
}

function banana(g, p, s, base) {
  wildBanana(g, p, s, base);
}

function fern(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(2, Math.round((4 + (p.seed % 4)) * p.scale * s) + 1);
  for (const [dx, dy, droop] of [
    [-1, -0.3, 0.8],
    [-0.8, -0.7, 0.6],
    [-0.4, -1, 0.5],
    [0, -1, 0.25],
    [0.4, -1, 0.5],
    [0.8, -0.7, 0.6],
    [1, -0.3, 0.8],
  ]) {
    stroke(g, p.x, base - 1, dx, dy, length, droop, 1, [pal.fern[2], pal.fern[0]]);
  }
}

function bush(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round((6 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 2.4);
  const box = { cx: p.x, top: base - h, w, h };
  blob(g, p.x, base - h, w, h, foliage(box, pal.leaf, p.seed));
}

// Rafflesia, seen as in the photographs: five bumpy, spotted lobes round a tan ring, with a dark
// hole and a spiked disc inside it. It lies flat on the forest floor.
function rafflesia(g, p, s, base) {
  const { pal } = g;
  const [petal, dot, shadow, rim, rimLight, hole, disc, spike] = pal.raff;
  const w = Math.max(5, Math.round(18 * s * p.scale));
  const h = Math.max(3, Math.round(w * 0.4));
  if (s < 0.45) {
    blob(g, p.x, base - 3, 5, 3, () => shadow);
    blob(g, p.x, base - 4, 3, 2, () => petal);
    return;
  }
  const lobe = (cx, top, lw, lh) =>
    blob(g, cx, top, lw, lh, (x, y) => {
      const n = hash(x, y, p.seed);
      if (n > 0.8) return dot;
      return n + ((y - top) / lh) * 0.5 > 0.95 ? shadow : petal;
    });
  const top = base - h;
  const lw = Math.round(w * 0.36);
  lobe(p.x - Math.round(w * 0.3), top, lw, Math.round(h * 0.62));
  lobe(p.x, top, lw, Math.round(h * 0.62));
  lobe(p.x + Math.round(w * 0.3), top, lw, Math.round(h * 0.62));
  lobe(p.x - Math.round(w * 0.4), top + Math.round(h * 0.3), Math.round(w * 0.3), Math.round(h * 0.6));
  lobe(p.x + Math.round(w * 0.4), top + Math.round(h * 0.3), Math.round(w * 0.3), Math.round(h * 0.6));
  const ringTop = top + Math.round(h * 0.04);
  const ringH = Math.max(4, Math.round(h * 0.8));
  const ringW = Math.round(w * 0.56);
  blob(g, p.x, ringTop, ringW, ringH, (_x, y) => (y < ringTop + ringH * 0.3 ? rimLight : rim));
  blob(g, p.x, ringTop + 1, Math.round(ringW * 0.72), Math.max(2, ringH - 2), () => hole);
  blob(g, p.x, ringTop + 2, Math.round(ringW * 0.5), Math.max(1, ringH - 4), (x) =>
    (x - p.x) % 2 === 0 ? spike : disc,
  );
  lobe(p.x, base - Math.round(h * 0.34), Math.round(w * 0.4), Math.round(h * 0.34));
}

// The mushrooms of the field guide, one painter each. The glowing ones pulse softly.
const FUNGI = ["russula", "russula", "bolete", "bolete", "cup", "coral", "stinkhorn", "bracket", "glow", "glow"];

function cap(g, colours, x, y, w) {
  rect(g, colours[0], x - (w >> 1) + 1, y, w - 2, 1);
  rect(g, colours[0], x - (w >> 1), y + 1, w, 1);
  rect(g, colours[1], x - (w >> 1), y + 2, w, 1);
}

const FUNGUS = {
  russula(g, p, s, base) {
    const { pal } = g;
    const w = Math.max(3, Math.round((5 + (p.seed % 3)) * p.scale * s) | 1);
    const stem = Math.max(1, Math.round(3 * p.scale * s));
    rect(g, pal.russula[2], p.x, base - stem, 1 + (w > 5 ? 1 : 0), stem);
    cap(g, pal.russula, p.x, base - stem - 2, w);
  },

  bolete(g, p, s, base) {
    const { pal } = g;
    const w = Math.max(3, Math.round((7 + (p.seed % 3)) * p.scale * s) | 1);
    const stem = Math.max(1, Math.round(3 * p.scale * s));
    rect(g, pal.bolete[2], p.x - (w > 5 ? 1 : 0), base - stem, w > 5 ? 3 : 2, stem);
    cap(g, pal.bolete, p.x, base - stem - 2, w);
  },

  cup(g, p, s, base) {
    const { pal } = g;
    [
      [-3, 4],
      [0, 6],
      [3, 3],
    ].forEach(([dx, tall], i) => {
      const h = Math.max(2, Math.round(tall * s));
      rect(g, pal.stink[2], p.x + dx, base - h, 1, h);
      rect(g, pal.cup[0], p.x + dx - 1, base - h - 1, 3, 1);
      rect(g, pal.cup[1], p.x + dx - 1 + (i % 2), base - h, 2, 1);
    });
  },

  coral(g, p, s, base) {
    const { pal } = g;
    const length = Math.max(2, Math.round(5 * p.scale * s));
    for (const [dx, dy] of [
      [-0.7, -1],
      [-0.3, -1],
      [0, -1],
      [0.3, -1],
      [0.7, -1],
    ]) {
      stroke(g, p.x, base - 1, dx, dy, length, 0, 1, [pal.coral[0], pal.coral[1]]);
    }
  },

  stinkhorn(g, p, s, base) {
    const { pal } = g;
    const h = Math.max(3, Math.round(8 * p.scale * s));
    rect(g, pal.stink[1], p.x, base - h, 1, h);
    rect(g, pal.stink[0], p.x - (h > 5 ? 1 : 0), base - h - 1, h > 5 ? 3 : 2, 2);
    if (h > 5) {
      for (let r = 0; r < 3; r += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if ((dx + r) % 2 === 0) rect(g, pal.stink[1], p.x + dx, base - h + 1 + r, 1, 1);
        }
      }
    }
  },

  bracket(g, p, s, base) {
    const { pal } = g;
    rect(g, pal.trunk[1], p.x - 4, base - 3, 9, 3);
    rect(g, pal.trunk[0], p.x - 4, base - 3, 9, 1);
    if (s < 0.5) return;
    rect(g, pal.bracket[0], p.x - 3, base - 4, 6, 1);
    rect(g, pal.bracket[1], p.x - 2, base - 5, 4, 1);
    rect(g, pal.bracket[2], p.x - 1, base - 6, 2, 1);
  },

  glow(g, p, s, base) {
    const { pal } = g;
    const pulse = 0.55 + 0.45 * Math.sin(g.time * 1.8 + p.seed);
    g.ctx.globalAlpha = 0.16 + pulse * 0.2;
    blob(g, p.x, base - 10, 13, 10, () => pal.glow[1]);
    g.ctx.globalAlpha = 1;
    [
      [-3, 3],
      [0, 5],
      [3, 4],
    ].forEach(([dx, tall]) => {
      const h = Math.max(1, Math.round(tall * s));
      rect(g, pal.glow[1], p.x + dx, base - h, 1, h);
      rect(g, pal.glow[0], p.x + dx - 1, base - h - 1, 3, 1);
      rect(g, pal.glow[2], p.x + dx, base - h - 1, 1, 1);
    });
  },
};

function mushroom(g, p, s, base) {
  FUNGUS[p.species](g, p, s, base);
}

// Limestone karsts: sheer grey towers that rise out of the mist, with forest clinging to their
// ledges and a cap of it on top. Their colours come from the farthest palette, so they read as
// distant.
function karst(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(4, Math.round(KARST_ROWS * p.scale * s));
  const width = Math.round(height * 0.42) + 4;
  const ledges = [0.3, 0.52, 0.7].map((at, i) => Math.round(height * (at + (hash(i, p.seed, 7) - 0.5) * 0.1)));
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const half = Math.round((width / 2) * (1 - f ** 5.5) + (hash(r >> 1, p.seed, 1) - 0.5) * 2.4);
    if (half < 1) break;
    const y = base - 1 - r;
    const ledge = ledges.some((l) => r >= l && r < l + 2);
    row(g, y, p.x - half, p.x + half, (x) => {
      if (f > 0.76 && hash(x, r, p.seed + 1) < ((f - 0.76) / 0.24) * 0.85 + 0.35) return pal.canopy[1 + ((x + r) % 2)];
      if (ledge && hash(x, r, p.seed + 3) < 0.7) return pal.canopy[2 + (x % 2)];
      if (hash(x, r, p.seed + 2) > 0.95 - f * 0.08) return pal.canopy[2];
      const u = (x - p.x) / half;
      const streak = hash(x, 0, p.seed) < 0.25 ? 1 : 0;
      return pal.karst[Math.min(2, (u < -0.2 ? 0 : u < 0.4 ? 1 : 2) + streak)];
    });
  }
}

const PAINT = { dipterocarp, fig };

function tree(g, p, s, base) {
  PAINT[p.species](g, p, s, base);
}

// Two kinds of giant over a floor of ferns, tree ferns and cycads, with the bamboo and the bananas
// growing in clumps the way they do, placed apart from each other and away from the middle.
function generate(ctx) {
  const { cols } = ctx;
  const plants = [];
  const middle = (x) => Math.abs(x - cols / 2) > Math.min(70, cols / 2 - 24);
  const spots = placeLandmarks(ctx, [
    { key: "bamboo", half: 9, away: CLEARING + 14 },
    { key: "banana", half: 9, away: CLEARING + 4 },
    { key: "bamboo2", half: 8, away: CLEARING + 14 },
    { key: "banana2", half: 8, away: CLEARING + 4 },
  ]);
  const wide = cols >= 200;
  scatter(plants, ctx, {
    kind: "karst",
    count: Math.round(cols / 40),
    born: [1, 3],
    scale: [0.75, 1.2],
    layer: -1,
    keep: middle,
  });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 16),
    born: [1, 4],
    scale: [0.5, 0.8],
    layer: 0,
    species: TREES,
  });
  scatter(plants, ctx, { kind: "treefern", count: Math.round(cols / 30), born: [1, 3], scale: [0.8, 1.1], layer: 0 });
  scatter(plants, ctx, { kind: "fern", count: Math.round(cols / 10), born: [0, 3], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 30),
    born: [1, 4],
    scale: [0.85, 1.3],
    depth: [3, 12],
    species: TREES,
  });
  grove(plants, ctx, {
    kind: "bamboo",
    x: spots.bamboo,
    count: 4,
    gap: 4,
    born: [1, 3],
    scale: [0.9, 1.25],
    depth: [3, 6],
  });
  grove(plants, ctx, {
    kind: "banana",
    x: spots.banana,
    count: 4,
    gap: 5,
    born: [1, 3],
    scale: [0.85, 1.15],
    depth: [4, 9],
  });
  if (wide)
    grove(plants, ctx, {
      kind: "bamboo",
      x: spots.bamboo2,
      count: 3,
      gap: 4,
      born: [2, 4],
      scale: [0.8, 1.1],
      depth: [2, 5],
    });
  if (wide)
    grove(plants, ctx, {
      kind: "banana",
      x: spots.banana2,
      count: 3,
      gap: 5,
      born: [2, 4],
      scale: [0.75, 1],
      depth: [5, 10],
    });
  scatter(plants, ctx, {
    kind: "treefern",
    count: Math.round(cols / 40),
    born: [2, 4],
    scale: [0.9, 1.3],
    depth: [3, 12],
  });
  scatter(plants, ctx, {
    kind: "cycad",
    count: Math.round(cols / 45),
    born: [1, 4],
    scale: [0.9, 1.3],
    depth: [6, 14],
  });
  scatter(plants, ctx, { kind: "bush", count: Math.round(cols / 26), born: [2, 5], scale: [0.8, 1.2], depth: [2, 13] });
  scatter(plants, ctx, { kind: "fern", count: Math.round(cols / 6), born: [0, 3], scale: [0.8, 1.3], depth: [0, 15] });
  scatter(plants, ctx, {
    kind: "mushroom",
    count: Math.round(cols / 24),
    born: [2, 6],
    scale: [1.3, 1.8],
    depth: [2, 14],
    species: FUNGI,
  });
  scatter(plants, ctx, {
    kind: "rafflesia",
    count: Math.max(1, Math.round(cols / 110)),
    born: [3, 6],
    scale: [0.9, 1.3],
    depth: [5, 14],
    max: 2,
  });
  const tall = ["tree", "bamboo", "banana", "bush", "treefern"];
  for (const p of plants) {
    if (tall.includes(p.kind)) p.scale *= clearing(p.x, cols);
  }
  sortPlants(plants);
  return plants;
}

// Moss thickens along the top edge as the forest grows, over a floor of damp earth and litter.
function soil(pal, x, y, depth, turf) {
  if (y === 0 && hash(x, 0, 5) < turf) return pal.leaf[2];
  if (y === 1 && hash(x, 1, 5) < turf * 0.7) return pal.leaf[3];
  const n = hash(x, y, 11);
  if (y < 5 && hash(x, y, 21) < 0.04) return pal.litter[hash(x, y, 22) < 0.65 ? 0 : 1];
  if (n < 0.12 + depth * 0.25) return pal.soil[2];
  if (n > 0.92 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures. Each one is drawn in its own coordinates, facing right, and mirrored by `dir`.

// A great hornbill in flight, the biggest of the small flyers: a white tail crossed by a black band,
// a white bar on its wing, a huge yellow bill under its casque, and a slow, deep beat.
function hornbillAt(g, b, time) {
  if (g.trace) return g.trace.draw(hornbillAt, g, b, time);
  flyerAt(g, b, time, "hornbill");
}

// The hornbill pair, the second a wingspan behind the first.
function pairAt(g, bird, time) {
  if (g.trace) return g.trace.draw(pairAt, g, bird, time);
  if (bird.visit && bird.visit.mode !== "wait") return hornbillAt(g, bird, time);
  for (const m of bird.members) {
    hornbillAt(g, { x: bird.x - bird.dir * m.back, y: bird.y + m.up, dir: bird.dir, phase: m.phase }, time);
  }
}

// The crested serpent eagle circles high over the canopy and banks at each end of its circle (kit/animals.js
// circlerAt draws it). It is a day bird. Now and then it comes down on the crown of an emergent giant.

// The top of a full-grown dipterocarp's crown, where the eagle's feet go: dipterocarpGeom's perch, the numbers
// the painter draws the crown from, swayed with the wind at `time`.
function crownTop(p, groundY, time) {
  return dipterocarpGeom(p, 1, groundY + (p.layer < 1 ? 1 : p.depth), time).perch;
}

// Where the eagle may perch: the full-grown dipterocarps.
function perchSpots(f) {
  const trees = f.plants.map((p, order) => ({ p, order })).filter(({ p }) => p.kind === "tree");
  const giants = trees.filter(({ p }) => p.species === "dipterocarp");
  const spots = giants
    .filter(({ p }) => p.shown - p.born >= MATURE.tree)
    .map(({ p, order }) => ({ x: p.x, order, top: (time) => crownTop(p, f.groundY, time) }));
  // A giant drawn later, or a strangler fig, may cover a crown's top.
  const covers = trees.map(({ p, order }) => {
    const base = f.groundY + (p.layer < 1 ? 1 : p.depth);
    if (p.species === "fig") {
      const geom = figGeom(p, 1, base, 0);
      return { x: p.x, order, y: geom.top, reach: geom.w >> 1 };
    }
    const geom = dipterocarpGeom(p, 1, base, 0);
    return { x: p.x, order, y: geom.top, reach: geom.crownW >> 1 };
  });
  return unhidden(spots, covers, f.time);
}

// Where the kingfisher may perch: the tops of the full-grown bushes, drawn in bush() from the same numbers.
function bushSpots(f) {
  return blobSpots(f, "bush", MATURE.bush, (p) => {
    const h = Math.max(2, Math.round((6 + (p.seed % 3)) * p.scale));
    return { cx: p.x, top: f.groundY + (p.layer < 1 ? 1 : p.depth) - h, w: Math.round(h * 2.4), h };
  });
}

// The gibbon brachiates under the canopy of the near broadleaf trees. One hand holds a branch on a
// crown's underside while its body swings beneath it like a pendulum, from behind the hand to ahead
// of it. Then the free hand takes the next hold, one reach further on, the hands taking turns. Where
// the canopy breaks, it leaps to the next crown if one is close, or turns back. Every 25 to 40 s it
// stops at a hold and sings its great call (b.next, which the studio's Trigger row fires). It needs
// grown crowns, which the trees record as they are painted, so it arrives once one is there. It is
// drawn by gibbonAt (animals.js).
const GIBBON_REACH = 9; // how far ahead the next hold is, so each swing ends under it
const GIBBON_SWING_SECONDS = 0.8;
const GIBBON_LEAP = 18; // the widest gap in the canopy it will leap
const GIBBON_LEAP_SECONDS = 0.6;
const GIBBON_CLEARANCE = 16; // how high a crown's underside must be, so the gibbon hangs clear of the ground
const GIBBON_CALLS = [25, 40]; // seconds between its calls

// The crowns a gibbon can hang from in one layer: broadleaf trees grown tall and wide enough to swing
// under.
function gibbonCrowns(f, layer) {
  return f.plants.filter(
    (p) =>
      p.kind === "tree" &&
      p.layer === layer &&
      p.crown &&
      p.crown.half >= 8 &&
      p.crown.bottom <= f.groundY - GIBBON_CLEARANCE,
  );
}

// Where a hand can hold at x in a layer: just inside the lowest crown underside above it, which
// curves up toward the crown's edge. Null where no crown reaches, or at the page's edges.
function gibbonHold(f, x, layer) {
  if (x < 4 || x > f.cols - 4) return null;
  let best = null;
  for (const { crown } of gibbonCrowns(f, layer)) {
    const t = (x - crown.cx) / crown.half;
    if (Math.abs(t) > 0.85) continue;
    const y = crown.bottom - 1 - Math.round(t * t * (crown.bottom - crown.top) * 0.4);
    if (best === null || y > best) best = y;
  }
  return best;
}

function moveGibbon(f, b, dt) {
  if (!b.active) {
    // It arrives in the widest crown once a tree has grown one high enough, in the near trees if
    // they have one and otherwise in the middle row, and it stays in that row.
    for (const layer of [1, 0]) {
      const crowns = gibbonCrowns(f, layer).map((p) => p.crown);
      if (!crowns.length) continue;
      const crown = crowns.reduce((widest, c) => (c.half > widest.half ? c : widest));
      // A crown at the page's edge is held at the nearest point inside the page.
      const x = clamp(crown.cx, 8, f.cols - 8);
      const y = gibbonHold(f, x, layer);
      if (y === null) continue;
      const dir = f.rand() < 0.5 ? 1 : -1;
      Object.assign(b, { active: true, layer, hx: x, hy: y, dir, t: 0, leap: null, prevOk: false, call: null });
      if (!Number.isFinite(b.next)) b.next = f.time + GIBBON_CALLS[0] + f.rand() * (GIBBON_CALLS[1] - GIBBON_CALLS[0]);
      return;
    }
    return;
  }
  if (b.call != null) {
    // Calling: it hangs by both hands, then takes up the swing where it stopped.
    b.call += dt;
    if (b.call < GIBBON_CALL_SECONDS) return;
    b.call = null;
    b.next = f.time + GIBBON_CALLS[0] + f.rand() * (GIBBON_CALLS[1] - GIBBON_CALLS[0]);
    const next = b.hx + b.dir * GIBBON_REACH;
    const y = gibbonHold(f, next, b.layer);
    if (y !== null) Object.assign(b, { hx: next, hy: y, count: (b.count ?? 0) + 1, prevOk: true });
    return;
  }
  if (b.leap) {
    b.t += dt / GIBBON_LEAP_SECONDS;
    if (b.t >= 1) {
      Object.assign(b, { hx: b.leap.x, hy: b.leap.y, t: 0, leap: null, count: (b.count ?? 0) + 1, prevOk: false });
    }
    return;
  }
  b.t += dt / GIBBON_SWING_SECONDS;
  if (b.t < 1) return;
  b.t = 0;
  const next = b.hx + b.dir * GIBBON_REACH;
  const y = gibbonHold(f, next, b.layer);
  if (y !== null) {
    // Its free hand has the next hold: it moves on, or stops there to call when its time has come.
    if (f.time >= b.next) {
      b.call = 0;
      return;
    }
    Object.assign(b, { hx: next, hy: y, count: (b.count ?? 0) + 1, prevOk: true });
    return;
  }
  for (let step = GIBBON_REACH + 1; step <= GIBBON_LEAP; step += 1) {
    const x = b.hx + b.dir * step;
    const landing = gibbonHold(f, x, b.layer);
    if (landing !== null) {
      b.leap = { fromX: b.hx, fromY: b.hy, x, y: landing };
      return;
    }
  }
  // Nothing within a leap: it swings back the way it came, from the same hold, which may have moved
  // as the crown grew. A hold that no longer exists, as after a resize, lets it arrive again.
  const here = gibbonHold(f, b.hx, b.layer);
  if (here === null) b.active = false;
  else b.hy = here;
  b.dir = -b.dir;
  b.prevOk = false;
}

// Fireflies come out at night. Most drift low over the floor, each blinking on its own; the rest
// gather in one tree and flash together, a wave running out from the middle that draws together and
// loosens again (kit/insect.js), as the river fireflies of southern Thailand do.
function fireflyAt(g, fly, time) {
  const x = fly.homeX + Math.sin(time * fly.speed + fly.phase) * fly.reach;
  const y = fly.homeY + Math.sin(time * fly.speed * 1.4 + fly.phase * 2) * 7;
  glowAt(g, x, y, time, fly.phase, g.pal.fire);
}

// The widest grown crown of the near trees away from the middle, for the langur and the fireflies.
function bigCrown(f) {
  const crowns = gibbonCrowns(f, 1).filter((p) => Math.abs(p.crown.cx - f.cols / 2) > CLEARING * 0.6);
  if (!crowns.length) return null;
  return crowns.reduce((widest, p) => (p.crown.half > widest.crown.half ? p : widest));
}

// The langur now and then hops between its two branches: it rises onto all fours, leaps, lands and
// sits facing the way it went (l.next, which the studio's Trigger row fires). It reaches for leaves
// only while it sits.
const LANGUR_GAP = [16, 26];
const LANGUR_HOPS = [14, 28];
function hopLangur(f, l) {
  if (l.hop && f.time >= l.hop.start + LANGUR_HOP_SECONDS) {
    l.dir = l.hop.to > l.hop.from ? 1 : -1;
    l.x = l.hop.to;
    l.hop = null;
    l.next = f.time + LANGUR_HOPS[0] + f.rand() * (LANGUR_HOPS[1] - LANGUR_HOPS[0]);
  }
  if (!l.hop && l.perches.length > 1 && f.time >= l.next && doing(l, "reach", f.time) < 0) {
    l.hop = { from: l.x, to: l.perches.find((p) => p !== l.x), start: f.time };
  }
  if (!l.hop) fidget(f, l);
}

const extras = {
  init(f) {
    return {
      cat: walker(f),
      flies: Array.from({ length: FIREFLIES }, (_, i) => ({
        homeX: ((i + f.rand()) / FIREFLIES) * f.cols,
        homeY: f.groundY - 6 - f.rand() * 30,
        phase: f.rand() * 6.28,
        speed: 0.3 + f.rand() * 0.4,
        reach: 6 + f.rand() * 10,
        u: f.rand() * 2 - 1,
        v: f.rand(),
      })),
      mists: [
        ...Array.from({ length: MISTS - 3 }, () => mistBand(f, 16, 40)),
        ...Array.from({ length: 3 }, () => mistBand(f, 2, 4)),
      ],
      hornbills: { next: 4, bird: null },
      kingfisher: { next: 2, bird: null },
      eagle: {
        active: false,
        cx: f.cols * (0.25 + f.rand() * 0.5),
        reach: Math.min(60, f.cols * 0.3),
        cy: 14 + f.rand() * 10,
        phase: f.rand() * 6,
      },
      gibbon: { active: false, layer: 1, hx: 0, hy: 0, dir: 1, t: 0, leap: null, count: 0, call: null, next: Infinity },
      langur: null,
      monkey: walker(f),
      otters: [walker(f), walker(f), walker(f)].map((o, i) => ({ ...o, c: i * 0.3 })), // c: the stride clock, staggered
      elephants: [
        { ...walker(f), kind: "asian" },
        { ...walker(f, 0.55), kind: "asian" },
      ],
    };
  },

  // Each stage brings something new: kingfishers, the hornbill pair, the gibbon, the
  // macaque, the langur, the otters, the elephants. The first otter comes at stage 1, the rest of
  // the line at 7.
  onGrow(f) {
    if (f.stage >= 5 && !narrow(f)) enter(f, f.extra.cat);
    const { monkey, otters, elephants } = f.extra;
    if (f.stage >= 4) enter(f, monkey);
    if (f.stage >= 1) enter(f, otters[0]);
    if (f.stage >= 7) {
      enterBehind(f, otters[1], otters[0], 18);
      if (!narrow(f)) enterBehind(f, otters[2], otters[1], 18);
    }
    if (f.stage >= 6) enter(f, elephants[0]);
    if (f.stage >= 8) enterBehind(f, elephants[1], elephants[0], 17);
  },

  busy: (f) => f.stage >= 2,

  update(f, dt) {
    wander(f, f.extra.cat, dt, { speed: 7, stride: 7, sit: [4, 9], walk: [3, 6] });
    rest(f, f.extra.cat, felidPoses("clouded"));
    const x = f.extra;
    // Hornbills cross in a pair; now and then a lone one comes instead and settles on a giant's crown. The
    // kingfisher now and then stops on a bush.
    if (f.stage >= 3 && !isNight(f)) {
      flyByPerch(f, x.hornbills, dt, {
        every: [8, 8],
        speed: 18,
        margin: 34,
        spawn: () => {
          const lone = f.rand() < 0.3;
          return { y: 18 + f.rand() * Math.max(10, f.groundY - 110), members: flock(f, lone ? 1 : 2, 16, 2) };
        },
        spots: perchSpots,
        small: "hornbill",
        odds: 0.8,
        only: (b) => b.members.length === 1,
        stay: [8, 16],
      });
    } else if (x.hornbills.bird?.visit) goHome(f, x.hornbills.bird);
    if (f.stage >= 2 && !isNight(f)) {
      const spawn = () => ({ y: f.groundY - 14 - f.rand() * 34 });
      flyByPerch(f, x.kingfisher, dt, {
        every: [4, 5],
        speed: 62,
        spawn,
        spots: bushSpots,
        small: "kingfisher",
        odds: 0.3,
        stay: [8, 16],
      });
    } else if (x.kingfisher.bird?.visit) goHome(f, x.kingfisher.bird);
    if (f.stage >= 4 && !isNight(f)) {
      circlerPerch(f, x.eagle, dt, { first: [20, 20], every: [50, 40], stay: [14, 26], spots: perchSpots });
    } else goHome(f, x.eagle);
    if (f.stage >= 5) moveGibbon(f, x.gibbon, dt);
    if (f.stage >= 6 && !x.langur) {
      const tree = bigCrown(f);
      if (tree) {
        const side = tree.crown.cx < f.cols / 2 ? 1 : -1;
        const { cx, half, bottom } = tree.crown;
        const at = Math.round(cx + side * half * 0.4);
        x.langur = percher(f, at, bottom + 1, -side, { reach: { every: [4, 7], lasts: LANGUR_REACH_SECONDS } });
        // A second branch on the same crown, a leap away toward its far side, if the crown is wide enough.
        const other = at - side * clamp(Math.round(half * 0.7), LANGUR_GAP[0], LANGUR_GAP[1]);
        const fits = Math.abs(other - cx) <= half * 0.85 && other > 8 && other < f.cols - 8;
        x.langur.perches = fits ? [at, other] : [at];
        x.langur.hop = null;
        x.langur.next = fits ? f.time + LANGUR_HOPS[0] + f.rand() * (LANGUR_HOPS[1] - LANGUR_HOPS[0]) : Infinity;
      }
    }
    if (x.langur) hopLangur(f, x.langur);
    wander(f, x.monkey, dt, { speed: 11 });
    settle(f, x.monkey);
    // The otters bound at 10 px/s, 5 px a stride (2 strides a second). The lead, when it stops, often stands up on
    // its hind legs to look round; the others wait on all fours.
    const [lead, ...trail] = x.otters;
    const leadX = lead.x;
    wander(f, lead, dt, { speed: 10, stride: 2, sit: [2, 4], walk: [3, 6] });
    rest(f, lead, ["stand", "stand", "stay"]);
    stride(lead, leadX, dt, OTTER_STRIDE[0], OTTER_STRIDE[1]);
    let ahead = lead;
    for (const o of trail) {
      const ox = o.x;
      follow(o, ahead, dt, 18);
      o.state = lead.state;
      o.timer = lead.timer;
      settle(f, o);
      stride(o, ox, dt, OTTER_STRIDE[0], OTTER_STRIDE[1]);
      ahead = o;
    }
    const [mother, calf] = x.elephants;
    stroll(f, mother, dt, 7);
    follow(calf, mother, dt, 17);
    calf.state = mother.state;
    calf.phase = mother.phase + 1;
  },

  draw(g, f) {
    if (f.extra.cat.active) felidAt(g, { ...f.extra.cat, kind: "clouded" }, f.time);
    const x = f.extra;
    const night = isNight(f);
    if (f.stage >= 2) for (const m of x.mists) mistAt(g, m, f.time, f.cols);
    if (f.stage >= 4 && !night) circlerAt(g, "serpent", x.eagle, f.time);
    for (const e of x.elephants) if (e.active) elephantAt(g, e, f.time);
    for (const o of x.otters) if (o.active) otterAt(g, o);
    if (x.monkey.active) macaqueAt(g, x.monkey, f.time);
    if (x.langur) langurAt(g, x.langur, f.time);
    if (night) {
      const tree = bigCrown(f)?.crown;
      const count = clamp(Math.round(f.stage * 3.3), 0, FIREFLIES);
      const crowd = [];
      for (let i = 0; i < count; i += 1) {
        if (i % 2 && tree) crowd.push(x.flies[i]);
        else fireflyAt(g, x.flies[i], f.time);
      }
      if (tree) treeFireflies(g, crowd, tree, f.time, g.pal.fire);
    }
    // A gibbon in the middle row takes that row's faded colours, so it sits at the depth of its tree.
    if (x.gibbon.active) {
      const { gibbon } = x;
      gibbonAt(g, gibbon, gibbon.layer === 0 ? f.pal.far : g.pal, f.time, (at) => gibbonHold(f, at, gibbon.layer));
    }
    if (x.hornbills.bird && !night) pairAt(g, x.hornbills.bird, f.time);
    if (x.kingfisher.bird && !night) kingfisherAt(g, x.kingfisher.bird, f.time);
  },
};

export default {
  id: "rainforest",
  label: "Thailand Khao Sok Rainforest",
  group: "woods",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.38, 0.64], dark: [0.5, 0.75] },
  mature: MATURE,
  paint: { tree, karst, bamboo, banana, treefern, cycad, fern, bush, rafflesia, mushroom },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      "..ggg.gggg..",
      ".gggggggggg.",
      ".gegssggggg.",
      ".gggspgggggg",
      ".gggsggggggg",
      ".gw.gggggggs",
      "www.gggggggs",
      ".g..gg..gg.s",
      ".gg.gg..gg..",
      "....gg..gg..",
      "....dd..dd..",
    ],
    colours: { g: "#a2abb2", s: "#80898f", d: "#80898f", e: "#2c2c34", p: "#d9a6a0", w: "#efe6d2" },
  },
};
