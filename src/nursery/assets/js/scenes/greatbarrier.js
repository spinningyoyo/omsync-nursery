// The Great Barrier Reef: a sunlit patch of reef off Heron Island, seen from the sand at its foot.
// Light comes down through the water in slow shafts and plays across the sand in a moving net of
// caustics, and the reef fades into blue with distance: terraced reef walls in the haze, the far
// reef and a second bommie, the farthest only a silhouette. The colours are the water's: limestone,
// olive, ochre and dusky rose, with the bright tones only on tips, polyps and a few fish. As the
// reef grows, a living crust of coralline algae and rubble spreads over the sand, with sand
// channels winding through it. The signature landmark is a bommie, a pillar of coral
// heads ledged with tabletop Acropora, staghorn on its crown and a dark den at its foot.
//
// Its signature animal is Mantle, a day octopus (Octopus cyanea), who peeks from the den at the
// first watering, then crawls out over the sand on four-beat arms, sits and turns sand-coloured,
// and, when a shark or a trevally passes, flashes dark, inks and jets home. Clownfish live in a
// magnificent anemone; a cloud of blue-green chromis hangs over a staghorn thicket and drops into
// its branches whenever a hunter or a shadow passes; a steephead parrotfish bites the coral and
// leaves a puff of sand (parrotfish make the reef's sand); a green turtle comes to the cleaner
// wrasse at their station over a bommie table; a blacktip reef shark patrols and a giant trevally
// dashes through. A bait ball of silver fish turns in mid-water by day. The timed event by day is a
// reef manta gliding through it every 25 to 45 s: the ball flashes and parts round the manta, a
// wake of bubbles trails it, and its shadow sweeps the sand, where the giant clam snaps shut as it
// passes, as real ones do.
//
// At night the day fish are home: Mantle watches from the den, the clownfish sleep in their
// anemone, the parrotfish sleeps in its mucus cocoon, the corals put out their polyps, and an
// epaulette shark walks the reef flat on its fins as the ones at Heron Island do. Plankton sparks
// blue-green in the wake of anything that moves, and the timed event is the reef's mass coral
// spawning, which follows the full moons of late spring: every 25 to 45 s the corals release
// bundles of eggs that rise through the water like snow falling upward.

import { isNight, narrow, rest, settle, stride } from "../kit/critters.js";
import { EPAULETTE, epauletteAt, fishAt, MANTA, mantaAt, mantaShadow, schoolAt } from "../kit/fish.js";
import { inkAt, OCTOPUS, OCTOPUS_POSES, octopusAt } from "../kit/octopus.js";
import {
  between,
  CLEARING,
  clamp,
  clearing,
  grove,
  hash,
  makePlant,
  mix,
  NARROW_COLS,
  placeLandmarks,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
} from "../kit/pixel.js";
import { bird, walk } from "../kit/poses.js";
import * as reef from "../kit/reef.js";
import { anemoneTop, bommieGeom } from "../kit/reef.js";
import { crossingActor, drawStep, runCast } from "../kit/runner.js";
import { honuShellAt } from "../kit/shell.js";

const MATURE = {
  bommie: 3,
  tableCoral: 2.5,
  staghorn: 2,
  boulderCoral: 2,
  softCoral: 1.5,
  seaFan: 2,
  seagrass: 1,
  anemone: 1,
  giantClam: 1.5,
  stylophora: 1.5,
  goniopora: 1.5,
  mushroom: 1,
  organPipe: 2,
  acroporaBush: 2,
  softTree: 2,
};
// The healthy reef's colour morphs: Stylophora, Goniopora, mushroom corals, bushy Acropora, soft
// tree corals, and the tints a share of the boulder corals take. Colour comes from the algae in the
// coral tissue and the water takes the reds first, so every tone is muted toward the water's
// olive, ochre and dusky rose, and the brightest are only tips and polyps.
const MORPHS = {
  stylophora: [
    ["#d8b4a8", "#b98f84", "#8f6a61"],
    ["#a9bccb", "#8aa0b2", "#687e90"],
    ["#b5bf92", "#949e72", "#717a54"],
    ["#d9cfb2", "#b9ad8e", "#8f8468"],
  ],
  goniopora: [
    ["#a9b880", "#86935f", "#667249", "#4a5436"],
    ["#b3a3b8", "#8d8091", "#6c6172", "#4d4554"],
  ],
  mushroom: [
    ["#d9cfa8", "#b6a97f", "#8d8160"],
    ["#c2d39a", "#9caf74", "#748553"],
    ["#d6b9cf", "#b393ab", "#8a6c83"],
  ],
  organPipe: ["#b8645a", "#94493f", "#6e3731", "#9fc88a"],
  bush: [
    ["#cdb6c9", "#a58fa3", "#806c80", "#5c4c5d"],
    ["#c8d8a6", "#9fb27a", "#7c8f5b", "#5a6b41"],
  ],
  softTree: [
    ["#d9a9a7", "#bd8c8b", "#d6c6b8", "#a99486"],
    ["#d8c88f", "#b9a96e", "#d6ccb0", "#a99d80"],
  ],
  anthias: { body: "#ee9a70", belly: "#f6c09f", fin: "#e98a8f", eye: "#2a1c1a" },
};
const TINTS = ["#8c9e6c", "#968aa0", "#b58f80"];
// The same morphs by night: darker and greyed, as the reef's other night tones are.
const toNight = (v) =>
  typeof v === "string"
    ? mix(mix(v, "#000000", 0.42), "#5a6470", 0.25)
    : Array.isArray(v)
      ? v.map(toNight)
      : Object.fromEntries(Object.entries(v).map(([k, c]) => [k, toNight(c)]));
// The forms sown across the near reef, in turn; the tall ones stay out of the clearing.
const FORMS = [
  "stylophora",
  "goniopora",
  "acroporaBush",
  "softTree",
  "organPipe",
  "stylophora",
  "mushroom",
  "goniopora",
];
const TALL = new Set(["softTree", "acroporaBush", "organPipe"]);
const ANTHIAS = 10;
const BOMMIE_HALF = 20;
const SNOW = 40;
const SPAWN = 70;
const CHROMIS = 12;
const BAIT = 24;

const LIGHT = {
  soil: ["#e2e2cf", "#cfd0bb", "#b5b89f"],
  line: "rgba(255, 255, 255, 0.3)",
  wet: "#86b9c9",
  water: ["#48b8d9", "#98e4f5", "#ffffff"],
  haze: "#7ab9cf",
  waterTop: "#cdebf2",
  waterDeep: "#80bdd2",
  ray: "#ffffff",
  caustic: "#ffffff",
  snow: "#f4fbfc",
  deep: "#2c2a24",
  groundShadow: "rgba(24, 66, 84, 0.22)",
  turf: ["#94ad66", "#73904b"],
  boulder: ["#cdbd8e", "#a8976b", "#7d6e51", "#544a38"],
  table: ["#ebe3c8", "#cbbf9b", "#9b8c6b", "#5f5543"],
  tips: "#8cb4dc",
  staghorn: ["#dcc89f", "#b9a179", "#8d7857"],
  softCoral: ["#dad39d", "#b5ad75", "#8a8254", "#605a3a"],
  seaFan: ["#d4673f", "#ac4a30", "#7f3525", "#56251a"],
  seagrass: ["#98b166", "#73904b", "#556d37"],
  anemone: ["#dccf9a", "#bcaa70", "#f1e7c2", "#94406f"],
  clam: ["#d3cab6", "#aca38d", "#7b7463", "#2f9db3", "#1f708a", "#86e2d2"],
  polyp: "#f3ecdc",
  octopus: {
    skin: "#a8503a",
    sand: "#cdb58f",
    flash: "#4f241c",
    mottle: "#ead2b9",
    eye: "#e9c65e",
    pupil: "#1a1210",
    ink: "#1d1b24",
  },
  chromis: { body: "#86d2cb", belly: "#c9efe9", fin: "#6abbbf", eye: "#14262c" },
  clownfish: { body: "#f2781f", belly: "#f89b4a", fin: "#f2781f", mark: "#1c140f", accent: "#f7f3ea", eye: "#140e0a" },
  wrasse: { body: "#5aa8e0", belly: "#dcedf6", mark: "#1a2230", eye: "#0f1820" },
  parrotfish: {
    body: "#3fb3a3",
    belly: "#90d6c5",
    fin: "#3a8db7",
    mark: "#2e6db0",
    accent: "#ebe4cc",
    cheek: "#e3c94c",
    eye: "#18202a",
  },
  trevally: { body: "#7d8b92", belly: "#d5dcdd", fin: "#525e65", mark: "#2c3439", eye: "#e2d28c" },
  blacktip: { body: "#8f9ca3", belly: "#f0f3f3", fin: "#8f9ca3", mark: "#1d2226", eye: "#14181b" },
  epaulette: {
    body: "#b89c76",
    belly: "#e4d6bd",
    spot: "#5b4834",
    mark: "#141210",
    ring: "#f4eee2",
    eye: "#1a140e",
  },
  manta: { belly: "#eef2f3", shade: "#b9c4ca", edge: "#4c565d", back: "#2d353a", spot: "#2d353a" },
  turtle: ["#8c6c3f", "#4a3320", "#bba67c"],
  cocoon: "#e4f4f6",
  spawn: ["#f5a8a2", "#f8cdb8"],
  glow: "#7ff5e0",
  sand: "#d9cdb0",
  reefCrust: ["#8c9e82", "#758c78", "#9c8a72", "#68827e"],
  ridgeFar: ["#8fc4cf", "#74aebc", "#5995a6"],
  ridgeMid: ["#6aa0a6", "#538a91", "#3e727a"],
  baitfish: ["#eefaff", "#8ce0f5", "#4bb8d9"],
  bubble: ["#ffffff", "#b8eefc"],
  ...MORPHS,
};

const DARK = {
  ...LIGHT,
  night: true,
  soil: ["#3e4a52", "#333e47", "#29323b"],
  line: "rgba(160, 220, 255, 0.1)",
  wet: "#15283a",
  haze: "#12293b",
  waterTop: "#0b1824",
  waterDeep: "#11293a",
  snow: "#5a7a8c",
  deep: "#06090c",
  groundShadow: "rgba(0, 0, 0, 0.34)",
  turf: ["#3e5a44", "#2f4636"],
  boulder: ["#6a6a5c", "#545446", "#3f3f35", "#2b2b25"],
  table: ["#787868", "#5f5f52", "#47473d", "#2f2f29"],
  tips: "#4d6a8c",
  staghorn: ["#727060", "#5a584b", "#434137"],
  softCoral: ["#6e6d52", "#575640", "#414030", "#2e2d22"],
  seaFan: ["#7a3e2e", "#622f24", "#4a231b", "#331812"],
  seagrass: ["#4b6440", "#3a4f33", "#2c3c27"],
  anemone: ["#7c7558", "#625c45", "#a59d78", "#5a2847"],
  clam: ["#6c6a62", "#55534c", "#3f3d38", "#1f6d80", "#164e5e", "#56b6aa"],
  polyp: "#8fa39a",
  octopus: { ...LIGHT.octopus, skin: "#6c3a2c", sand: "#6e6452", flash: "#2c1712", mottle: "#8a7a68", eye: "#b39a48" },
  clownfish: { ...LIGHT.clownfish, body: "#9a5426", belly: "#a8683a", fin: "#9a5426", accent: "#b9b6ae" },
  parrotfish: {
    ...LIGHT.parrotfish,
    body: "#2a6e66",
    belly: "#4b8279",
    fin: "#28597a",
    mark: "#22487a",
    accent: "#9c9a8c",
    cheek: "#8c7c3a",
  },
  blacktip: { body: "#4f5b62", belly: "#8d989c", fin: "#4f5b62", mark: "#101315", eye: "#0b0d0f" },
  epaulette: { body: "#7c6a52", belly: "#a29684", spot: "#3a2e22", mark: "#0b0a09", ring: "#c9c4b8", eye: "#0e0b08" },
  turtle: ["#4e3e28", "#2a1e14", "#6e6450"],
  cocoon: "#9fc4cc",
  spawn: ["#f29a96", "#f6c2ae"],
  glow: "#7ff5e0",
  reefCrust: ["#3b5452", "#2d4547", "#4a4842", "#263d45"],
  ridgeFar: ["#1f394a", "#172d3d", "#112230"],
  ridgeMid: ["#26424f", "#1d3542", "#152936"],
  baitfish: ["#c2e8f5", "#6bb6d4", "#3b7fa3"],
  bubble: ["#a6e4f7", "#5ca8c4"],
  ...toNight(MORPHS),
};

// A plant's growth, 0..1, as the engine draws it.
const grown = (p) => smooth(clamp((p.shown - p.born) / MATURE[p.kind], 0, 1));
const baseOf = (f, p) => f.groundY + (p.layer < 1 ? 1 : p.depth);

// The reef's plants, each drawn by the coral family's build (kit/reef.js).
function bommie(g, p, s, base) {
  reef.bommie(g, p, s, base);
}
function tableCoral(g, p, s, base) {
  reef.tableCoral(g, p, s, base);
}
function staghorn(g, p, s, base) {
  reef.staghorn(g, p, s, base);
}
function boulderCoral(g, p, s, base) {
  reef.boulderCoral(g, p, s, base);
}
function softCoral(g, p, s, base) {
  reef.softCoral(g, p, s, base);
}
function seaFan(g, p, s, base) {
  reef.seaFan(g, p, s, base);
}
function seagrass(g, p, s, base) {
  reef.seagrass(g, p, s, base);
}
function anemone(g, p, s, base) {
  reef.anemone(g, p, s, base);
}
function giantClam(g, p, s, base) {
  reef.giantClam(g, p, s, base);
}
function stylophora(g, p, s, base) {
  reef.stylophora(g, p, s, base);
}
function goniopora(g, p, s, base) {
  reef.goniopora(g, p, s, base);
}
function mushroom(g, p, s, base) {
  reef.mushroom(g, p, s, base);
}
function organPipe(g, p, s, base) {
  reef.organPipe(g, p, s, base);
}
function acroporaBush(g, p, s, base) {
  reef.acroporaBush(g, p, s, base);
}
function softTree(g, p, s, base) {
  reef.softTree(g, p, s, base);
}

function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const narrowPage = cols < NARROW_COLS;
  const k = narrowPage ? 0.8 : 1.15;
  const half = Math.round(BOMMIE_HALF * k);
  const { bommie: bx, far: fx } = placeLandmarks(ctx, [
    { key: "bommie", half, away: CLEARING + half - 4, inside: true },
    { key: "far", half: Math.round(half * 1.2), away: CLEARING + half },
  ]);
  plants.push(makePlant(rand, "bommie", bx, { layer: 1, depth: 3, born: 0, scale: k }));
  plants.push(makePlant(rand, "bommie", fx, { layer: 0, depth: 1, born: 2, scale: k * 0.95 }));
  // The farthest reef: low silhouettes along the whole horizon.
  scatter(plants, ctx, {
    kind: "boulderCoral",
    count: Math.round(cols / 14),
    born: [0, 3],
    scale: [1.2, 1.9],
    layer: -1,
  });
  scatter(plants, ctx, { kind: "tableCoral", count: Math.round(cols / 30), born: [1, 4], scale: [1, 1.4], layer: -1 });
  // The far reef: thickets, tables and heads.
  scatter(plants, ctx, { kind: "staghorn", count: Math.round(cols / 26), born: [1, 4], scale: [0.9, 1.3], layer: 0 });
  scatter(plants, ctx, { kind: "tableCoral", count: Math.round(cols / 40), born: [2, 5], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, {
    kind: "boulderCoral",
    count: Math.round(cols / 32),
    born: [1, 4],
    scale: [0.9, 1.3],
    layer: 0,
  });
  // The near reef round the bommie: the chromis' staghorn on the far side of it from the middle,
  // the anemone and the clam between it and the clearing.
  const out = bx < cols / 2 ? -1 : 1;
  const inward = -out;
  const thicket = clamp(bx + out * Math.round(30 * k), 8, cols - 8);
  grove(plants, ctx, { kind: "staghorn", x: thicket, count: 3, gap: 6, born: [1, 2], scale: [1, 1.3], depth: [4, 6] });
  plants.push(makePlant(rand, "anemone", clamp(bx + inward * Math.round(30 * k), 8, cols - 8), { depth: 8, born: 0 }));
  plants.push(
    makePlant(rand, "giantClam", clamp(bx + inward * Math.round(46 * k), 8, cols - 8), { depth: 10, born: 1 }),
  );
  plants.push(
    makePlant(rand, "softCoral", clamp(bx + out * Math.round(16 * k), 6, cols - 6), { depth: 7, born: 2, scale: 1 }),
  );
  scatter(plants, ctx, {
    kind: "seaFan",
    count: Math.max(1, Math.round(cols / 90)),
    born: [3, 5],
    scale: [0.9, 1.2],
    depth: [4, 6],
    max: 2,
    keep: (x) => Math.abs(x - cols / 2) > CLEARING,
  });
  scatter(plants, ctx, {
    kind: "boulderCoral",
    count: Math.round(cols / 50),
    born: [1, 3],
    scale: [0.6, 1],
    depth: [5, 10],
  });
  scatter(plants, ctx, {
    kind: "softCoral",
    count: Math.round(cols / 70),
    born: [2, 4],
    scale: [0.7, 1],
    depth: [5, 9],
  });
  // Seagrass meadows on the open sand.
  for (const x of [0.12, 0.38, 0.62, 0.88].map((t) => Math.round(t * cols + (rand() - 0.5) * 20))) {
    grove(plants, ctx, { kind: "seagrass", x, count: 3, gap: 8, born: [0, 2], scale: [0.8, 1.2], depth: [9, 13] });
  }
  for (const p of plants) {
    if (p.kind !== "bommie" && p.kind !== "seagrass" && p.kind !== "anemone" && p.kind !== "giantClam") {
      p.scale *= clearing(p.x, cols);
    }
  }
  // A healthy reef: living coral over about 30% more of the ground, in its colour morphs. Tall forms
  // at the sides, only low ones (mushrooms, small domes) in the middle behind the sign-in card.
  const mid = cols / 2;
  const step = narrowPage ? 7 : 8;
  for (let x = 4, i = 0; x < cols - 3; x += step + Math.floor(rand() * 5), i += 1) {
    const open = Math.abs(x - mid) < 60;
    let kind = FORMS[i % FORMS.length];
    if (open && TALL.has(kind)) kind = rand() < 0.5 ? "mushroom" : "goniopora";
    if (open && rand() < 0.25) continue;
    const fields = {
      depth: between(rand, 2, 11),
      born: between(rand, 1, 5),
      scale: open ? 0.85 : 1.1 + rand() * 0.5,
      hue: Math.floor(rand() * 4),
    };
    const sow = {
      stylophora: () => makePlant(rand, "stylophora", x, fields),
      goniopora: () => makePlant(rand, "goniopora", x, fields),
      mushroom: () => makePlant(rand, "mushroom", x, fields),
      organPipe: () => makePlant(rand, "organPipe", x, fields),
      acroporaBush: () => makePlant(rand, "acroporaBush", x, fields),
      softTree: () => makePlant(rand, "softTree", x, fields),
    };
    plants.push(sow[kind]());
  }
  // Colour morphs on a share of the boulder corals: green, purple and rose heads.
  for (const p of plants) {
    if (p.kind === "boulderCoral" && p.layer === 1 && rand() < 0.55) p.tint = TINTS[Math.floor(rand() * TINTS.length)];
  }
  sortPlants(plants);
  return plants;
}

// Coral sand, flecked with rubble, with seagrass along its top edge. As the reef grows (turf), a
// living crust of coralline algae and rubble spreads over it, thickest at the top and thinning
// with depth, with sand channels winding through.
function soil(pal, x, y, depth, turf) {
  const n = hash(x, y, 13);
  if (y === 0 && hash(x, 0, 7) < turf * 0.4) return pal.turf[0];
  if (y === 1 && hash(x, 1, 7) < turf * 0.25) return pal.turf[1];
  const channel = Math.sin(x * 0.08 + Math.sin(x * 0.021) * 2) > 0.62;
  if (!channel && hash(x, y, 9) < turf * (0.8 - depth * 0.9)) {
    return pal.reefCrust[Math.floor(hash(x, y, 21) * pal.reefCrust.length)];
  }
  if (n < 0.03 + depth * 0.12) return pal.soil[2];
  if (n > 0.97 - (1 - depth) * 0.05) return pal.soil[0];
  return pal.soil[1];
}

// ---- The water -------------------------------------------------------------------------------------

// The water column, drawn once per page size and theme: clear near the surface, deepening to blue
// at the reef, in an ordered dither so it stays pixel art.
function waterCanvas(f, pal) {
  const key = `${f.cols}:${f.groundY}:${f.theme}`;
  const x = f.extra;
  if (x.waterKey === key) return x.water;
  const canvas = x.water ?? document.createElement("canvas");
  canvas.width = f.cols;
  canvas.height = f.groundY;
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, f.cols, f.groundY);
  // One colour a row: clear at the top, deepening and thickening toward the reef.
  for (let y = 0; y < f.groundY; y += 1) {
    const t = y / f.groundY;
    c.globalAlpha = smooth(clamp((t - 0.02) / 0.8, 0, 1));
    c.fillStyle = mix(pal.waterTop, pal.waterDeep, smooth(t));
    c.fillRect(0, y, f.cols, 1);
  }
  c.globalAlpha = 1;
  x.water = canvas;
  x.waterKey = key;
  return canvas;
}

// The reef walls in the haze behind the reef: terraced ridges of the reef's drop-off, a far row and
// a nearer one, lower in the middle of the page so the sign-in card stays on open water. Drawn once
// per page size and theme.
function reefWall(f, pal) {
  const key = `${f.cols}:${f.groundY}:${f.theme}`;
  const x = f.extra;
  if (x.wallKey === key) return x.wall;
  const canvas = x.wall ?? document.createElement("canvas");
  canvas.width = f.cols;
  canvas.height = f.groundY;
  const g = { ctx: canvas.getContext("2d") };
  g.ctx.clearRect(0, 0, f.cols, f.groundY);
  for (const [tones, n, lo, hi, seed] of [
    [pal.ridgeFar, Math.max(2, Math.round(f.cols / 70)), 0.18, 0.34, 1],
    [pal.ridgeMid, Math.max(2, Math.round(f.cols / 90)), 0.08, 0.18, 5],
  ]) {
    for (let i = 0; i < n; i += 1) {
      const cx = Math.round(((i + 0.2 + hash(i, seed, 3) * 0.6) / n) * f.cols);
      const height = Math.round(f.groundY * (lo + hash(i, seed, 4) * (hi - lo)) * clearing(cx, f.cols));
      const width = Math.round((f.cols / n) * (0.9 + hash(i, seed, 5) * 0.5));
      ridge(g, cx, f.groundY, height, width, tones, seed + i);
    }
  }
  x.wall = canvas;
  x.wallKey = key;
  return canvas;
}

// One ridge: a mound that narrows upward in terraces, lit on its left, a ledge every seventh row.
function ridge(g, cx, base, height, width, tones, seed) {
  for (let r = 0; r < height; r += 1) {
    const t = r / height;
    const contour = Math.sin(r * 0.25 + seed) * 2.5 + (hash(r >> 1, seed, 1) - 0.5) * 3;
    const half = Math.max(2, Math.round((width / 2) * (1 - t ** 1.7 * 0.65) + contour));
    row(g, base - 1 - r, cx - half, cx + half, (xx) => {
      if (r % 7 === 0 && hash(xx, r, seed + 2) < 0.55) return tones[0];
      const u = (xx - cx) / half;
      return tones[u < -0.2 ? 0 : u < 0.35 ? 1 : 2];
    });
  }
}

// Shafts of sunlight slanting down from the surface, swaying slowly and fading with depth.
function rays(g, f) {
  const n = Math.max(2, Math.round(f.cols / 70));
  const ctx = g.ctx;
  for (let i = 0; i < n; i += 1) {
    const x0 = ((i + 0.35 + hash(i, 1, 5) * 0.4) / n) * f.cols + Math.sin(g.time * 0.23 + i * 2) * 6;
    const w0 = 3 + hash(i, 2, 5) * 4;
    const pulse = 0.6 + 0.4 * Math.sin(g.time * 0.5 + i * 1.7);
    for (let y = 0; y < f.groundY; y += 1) {
      const t = y / f.groundY;
      ctx.globalAlpha = 0.13 * pulse * (1 - t) ** 1.4;
      ctx.fillStyle = g.pal.ray;
      ctx.fillRect(Math.round(x0 + y * 0.32), y, Math.round(w0 + t * 6), 1);
    }
  }
  ctx.globalAlpha = 1;
}

// The surface seen from below: a band of light rippling along the top of the page.
function surface(g, f) {
  const ctx = g.ctx;
  ctx.fillStyle = g.pal.ray;
  for (let y = 0; y < 4; y += 1) {
    ctx.globalAlpha = (g.pal.night ? 0.08 : 0.4) * (1 - y / 4);
    for (let x = 0; x < f.cols; x += 1) {
      if (Math.sin(x * 0.31 + g.time * 1.4 + y * 1.7) + Math.sin(x * 0.13 - g.time * 0.8) > 0.9)
        ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// Caustics: the net of light the rippled surface throws on the sand, moving all the time.
function caustics(g, f) {
  const ctx = g.ctx;
  ctx.fillStyle = g.pal.caustic;
  const t = g.time;
  for (let y = 0; y < 12; y += 1) {
    const row = f.groundY + y;
    ctx.globalAlpha = 0.75 * (1 - y / 12);
    for (let x = 0; x < f.cols; x += 1) {
      const v =
        Math.sin(x * 0.29 + t * 1.1 + y * 0.6) +
        Math.sin(x * 0.17 - t * 0.7 - y * 1.3) +
        Math.sin((x + y * 3) * 0.11 + t * 0.9);
      if (Math.abs(v) < 0.3) ctx.fillRect(x, row, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// ---- Animals ---------------------------------------------------------------------------------------

function newSnow(f, anywhere) {
  return {
    x: f.rand() * f.cols,
    y: anywhere ? f.rand() * f.groundY : -2,
    speed: 0.6 + f.rand() * 1.2,
    phase: f.rand() * 6,
  };
}

// The threats the reef answers to: hunters passing and the manta's shadow, by x.
function threats(f) {
  const x = f.extra;
  const out = [];
  if (x.shark.bird) out.push({ x: x.shark.bird.x, reach: 34 });
  if (x.trevally.bird) out.push({ x: x.trevally.bird.x, reach: 30 });
  if (x.manta.bird) out.push({ x: x.manta.bird.x, reach: MANTA.span * 0.6 });
  return out;
}
const near = (list, at) => list.some((t) => Math.abs(t.x - at) < t.reach);

// Mantle: den, crawl out over the sand, sit, crawl on, and now and then home; jets home in alarm.
function mantleUpdate(f, o, dt, den, alarm) {
  const prev = o.x;
  o.age += dt;
  if (isNight(f)) {
    Object.assign(o, { mode: "den", x: den.x, m: 0, lift: 0, flash: Math.max(0, o.flash - dt) });
    return;
  }
  if (alarm && o.mode !== "den" && o.mode !== "jet") {
    o.mode = "jet";
    o.dir = den.x > o.x ? 1 : -1;
    o.from = o.x;
    o.age = 0;
    f.extra.inks.push({ x: o.x - o.dir * 4, y: f.groundY - 5, age: 0 });
  }
  o.flash = clamp(o.flash + (o.mode === "jet" ? dt * 4 : -dt * 0.8), 0, 1);
  switch (o.mode) {
    case "den":
      o.camo = Math.max(0, o.camo - dt);
      if (o.age > o.wait && !alarm) {
        o.mode = "crawl";
        o.dir = f.rand() < 0.5 ? 1 : -1;
        if (o.x + o.dir * 40 < 10 || o.x + o.dir * 40 > f.cols - 10) o.dir *= -1;
        o.target = clamp(o.x + o.dir * (16 + f.rand() * 34), 10, f.cols - 10);
        o.age = 0;
      }
      break;
    case "crawl": {
      o.x += o.dir * 7 * dt;
      o.camo = Math.max(0.1, o.camo - dt * 0.5);
      if ((o.dir > 0 && o.x >= o.target) || (o.dir < 0 && o.x <= o.target)) {
        o.x = o.target;
        o.mode = "sit";
        o.age = 0;
        o.wait = 4 + f.rand() * 5;
      }
      break;
    }
    case "sit":
      o.camo = Math.min(1, o.camo + dt * 0.5);
      if (o.age > o.wait) {
        o.mode = "crawl";
        o.age = 0;
        const home = f.rand() < 0.35;
        o.target = home ? den.x : clamp(o.x + (f.rand() < 0.5 ? -1 : 1) * (14 + f.rand() * 26), 10, f.cols - 10);
        o.dir = o.target > o.x ? 1 : -1;
        o.homing = home;
      }
      break;
    case "jet": {
      const d = Math.abs(den.x - o.from) || 1;
      o.x += o.dir * 38 * dt;
      const p = clamp(Math.abs(o.x - o.from) / d, 0, 1);
      o.lift = Math.sin(p * Math.PI) * Math.min(12, d * 0.25);
      if (p >= 1) Object.assign(o, { mode: "den", x: den.x, lift: 0, age: 0, wait: 6 + f.rand() * 4 });
      break;
    }
  }
  if (o.mode === "crawl" && o.homing && Math.abs(o.x - den.x) < 1)
    Object.assign(o, { mode: "den", age: 0, wait: 4 + f.rand() * 6, homing: false });
  // The stride clock and the ease into and out of a walk.
  o.state = o.mode === "crawl" ? "walk" : "sit";
  stride(o, prev, dt, OCTOPUS.stride[0], OCTOPUS.stride[1]);
  rest(f, o, OCTOPUS_POSES);
  const since = f.time - (o.since ?? 0);
  o.m = o.mode === "crawl" ? Math.min(1, since / 0.25) : o.mode === "sit" ? Math.max(0, 1 - since / 0.25) : 0;
}

const extras = runCast(
  [
    {
      label: "Mantle, a day octopus: crawls out of its den, sits camouflaged, inks and jets home",
      kind: "animal",
      family: "cephalopods",
      presence: ["mantle"],
      sprites: ["mantle", "mantle-sitting", "mantle-camouflaged", "mantle-reaching", "mantle-in-den", "mantle-jetting"],
    },
    {
      label: "clownfish pair in their anemone (asleep in it at night)",
      kind: "animal",
      family: "fish",
      arrives: 2,
      sprites: ["clownfish"],
    },
    {
      label: "blue-green chromis over their staghorn, diving in when a hunter passes",
      kind: "animal",
      family: "fish",
      arrives: 2,
      sprites: ["chromis"],
    },
    {
      label: "anthias, orange-pink clouds over the coral, dropping toward it when a hunter passes",
      kind: "animal",
      family: "fish",
      arrives: 3,
      sprites: ["anthias"],
    },
    {
      label: "cleaner wrasse at their station",
      kind: "animal",
      family: "fish",
      arrives: 3,
      sprites: ["wrasse"],
    },
    {
      label: "steephead parrotfish biting the coral (in its mucus cocoon at night)",
      kind: "animal",
      family: "fish",
      presence: ["parrot"],
      sprites: ["parrotfish"],
    },
    {
      label: "green turtle visiting the cleaning station",
      kind: "animal",
      family: "shelled-scaled",
      presence: ["turtle"],
      sprites: ["turtle"],
    },
    drawStep(
      "water",
      (g, f) => {
        const x = f.extra;
        g.ctx.drawImage(waterCanvas(f, g.pal), 0, 0);
        g.ctx.drawImage(reefWall(f, g.pal), 0, 0);
        surface(g, f);
        if (!isNight(f)) {
          rays(g, f);
          caustics(g, f);
        }
        if (x.manta.bird) mantaShadow(g, x.manta.bird.x, f.groundY);
      },
      { back: true },
    ),
    drawStep("bait-and-spawn", (g, f) => {
      const x = f.extra;
      const time = f.time;
      const ctx = g.ctx;
      const pal = g.pal;

      // Marine snow.
      ctx.fillStyle = pal.snow;
      for (const s of x.snow) {
        ctx.globalAlpha = 0.5;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      }
      ctx.globalAlpha = 1;

      // Spawning: bundles of eggs rising, each a pale pink bead that glints.
      for (const e of x.spawn.eggs) {
        ctx.globalAlpha = clamp(e.y / 20, 0.2, 0.95);
        rect(g, pal.spawn[e.c], Math.round(e.x), Math.round(e.y), 1, 1);
        if (Math.sin(time * 4 + e.phase) > 0.85)
          rect(g, pal.spawn[1 - e.c], Math.round(e.x), Math.round(e.y) - 1, 1, 1);
      }
      ctx.globalAlpha = 1;

      // The bait ball: silver fish turning in a ring, flashing as they turn, parting round the manta.
      const ray = x.manta.bird;
      if (x.bait.active) {
        const count = narrow(f) ? BAIT / 2 : BAIT;
        x.bait.members.slice(0, count).forEach((b, i) => {
          const a = time * b.rate + b.a;
          let bx = x.bait.x + Math.cos(a) * b.r * 1.4;
          let by = x.bait.y + Math.sin(a) * b.r * 0.7;
          if (ray) {
            const dx = bx - ray.x;
            const dy = by - ray.y;
            const d = Math.hypot(dx, dy);
            const reach = MANTA.span * 0.85;
            if (d < reach) {
              const push = ((reach - d) * 0.75) / Math.max(1, d);
              bx += dx * push;
              by += dy * push;
            }
          }
          const tone = Math.sin(time * 12 + b.flash) > 0.35 ? pal.baitfish[0] : pal.baitfish[1 + (i % 2)];
          rect(g, tone, Math.round(bx), Math.round(by), 2, 1);
        });
      }
      // The manta, and the bubbles in its wake.
      for (const b of x.bubbles) {
        ctx.globalAlpha = 1 - b.age / 1.6;
        rect(g, pal.bubble[b.age < 0.6 ? 0 : 1], Math.round(b.x), Math.round(b.y), 1, 1);
      }
      ctx.globalAlpha = 1;
    }),
    crossingActor({
      id: "manta",
      label:
        "reef manta gliding through the bait ball, a wake of bubbles behind it and its shadow on the sand (the timed event by day)",
      kind: "animal",
      family: "rays",
      sprites: ["manta"],
      arrives: 6,
      when: "day",
      first: (f) => 10 + f.rand() * 10,
      every: [25, 20],
      speed: 12,
      margin: 20,
      spawn: (f) => ({ y: Math.round(Math.max(16, Math.round(f.groundY * 0.36)) + (f.rand() - 0.5) * 6) }),
      clearOnOff: true,
      draw: (g, b, f) => mantaAt(g, b, f.time),
    }),
    crossingActor({
      id: "shark",
      label: "blacktip reef shark on patrol, day and night",
      kind: "animal",
      family: "fish",
      sprites: ["blacktip"],
      arrives: 5,
      first: 6,
      every: [12, 10],
      speed: 22,
      margin: 16,
      spawn: (f) => ({ y: f.groundY - 30 - f.rand() * 30 }),
      draw: (g, b, f) => fishAt(g, "blacktip", b, f.time),
    }),
    drawStep("sparks", (g, f) => {
      const x = f.extra;
      const ctx = g.ctx;
      const pal = g.pal;

      // Sparks in the wake of moving night animals.
      for (const s of x.sparks) {
        ctx.globalAlpha = 1 - s.age / 1.2;
        rect(g, pal.glow, Math.round(s.x), Math.round(s.y), 1, 1);
      }
      ctx.globalAlpha = 1;
    }),
    drawStep("turtle-and-wrasse", (g, f) => {
      const x = f.extra;
      const day = !isNight(f);
      const time = f.time;

      // The turtle and the cleaner wrasse at their station.
      const bom = x.bom;
      const geo = bommieGeom(bom, grown(bom), baseOf(f, bom));
      const station = geo.tables[1];
      const t = x.turtle.t;
      if (t) honuShellAt(g, t, Math.round(t.y), time);
      if (day && f.stage >= 3) {
        x.wrasse.forEach((w, i) => {
          const at = t && t.state === "clean";
          const cx = at
            ? t.x + (i ? -3 : 4) + Math.sin(time * 2 + w.phase) * 2
            : station.x + (i ? -4 : 3) + Math.sin(time * 0.9 + w.phase) * 4;
          const cy = at
            ? t.y - 4 + Math.sin(time * 3 + w.phase) * 2
            : station.y - 3 - Math.abs(Math.sin(time * 1.3 + w.phase)) * 3;
          const dir = Math.cos(time * 0.9 + w.phase) > 0 ? 1 : -1;
          fishAt(g, "wrasse", { x: cx, y: cy, dir, phase: w.phase }, time);
        });
      }
    }),
    crossingActor({
      id: "trevally",
      label: "giant trevally dashing through",
      kind: "animal",
      family: "fish",
      sprites: ["trevally"],
      arrives: 7,
      when: "day",
      phone: "hide",
      first: 10,
      every: [14, 12],
      speed: 42,
      margin: 16,
      spawn: (f) => ({ y: f.groundY - 18 - f.rand() * 12 }),
      clearOnOff: true,
      draw: (g, b, f) => fishAt(g, "trevally", { ...b, rate: 1.6 }, f.time),
    }),
    drawStep("school-and-reef", (g, f) => {
      const x = f.extra;
      const day = !isNight(f);
      const time = f.time;
      const ctx = g.ctx;
      const pal = g.pal;
      const bom = x.bom;
      const geo = bommieGeom(bom, grown(bom), baseOf(f, bom));

      // The chromis over their staghorn; when they hide, the thicket is drawn again over them.
      if (day && f.stage >= 2) {
        const ch = x.chromis;
        const thicket = f.plants.filter((p) => p.kind === "staghorn" && p.layer === 1);
        const crown = thicket.length
          ? Math.min(...thicket.map((p) => baseOf(f, p) - 10 * p.scale * grown(p)))
          : f.groundY - 10;
        const count = narrow(f) ? Math.ceil(CHROMIS / 2) : CHROMIS;
        ch.members.slice(0, count).forEach((m) => {
          const a = time * m.rate + m.phase;
          const hover = crown - 5 - m.oy;
          const y = hover + (crown + 3 - hover) * ch.hide;
          const xx = ch.home + m.ox * (1 - ch.hide * 0.6) + Math.sin(a) * 3;
          schoolAt(
            g,
            "chromis",
            { x: xx, y, dir: Math.cos(a) > 0 ? 1 : -1, calm: true, members: [{ back: 0, up: 0, phase: m.phase }] },
            time,
          );
        });
        if (ch.hide > 0.05) {
          for (const p of thicket) staghorn(g, p, grown(p), baseOf(f, p));
        }
      }

      // Anthias: a cloud of orange-pink fish over the coral on each side, facing into the current.
      if (day && f.stage >= 3) {
        const count = narrow(f) ? Math.ceil(ANTHIAS / 2) : ANTHIAS;
        for (const cloud of x.anthias) {
          cloud.members.slice(0, count).forEach((m) => {
            const a = time * m.rate + m.phase;
            const y = f.groundY - 14 - m.oy * (1 - cloud.hide * 0.7) + Math.cos(a * 1.3) * 1.5;
            const xx = cloud.x + m.ox * (1 - cloud.hide * 0.4) + Math.sin(a) * 3;
            schoolAt(
              g,
              "anthias",
              { x: xx, y, dir: Math.cos(a) > -0.3 ? 1 : -1, calm: true, members: [{ back: 0, up: 0, phase: m.phase }] },
              time,
            );
          });
        }
      }

      // The parrotfish, and its sand falling. By night it sleeps in its cocoon by the bommie.
      if (f.stage >= 3 && !narrow(f)) {
        const pf = x.parrot;
        if (day) {
          const nod = pf.bite > 0 ? Math.round(Math.sin(pf.bite * 12)) : 0;
          fishAt(
            g,
            "parrotfish",
            { x: pf.x, y: pf.y + nod, dir: pf.dir, phase: 1, rate: pf.bite > 0 ? 0.3 : 1 },
            time,
            f.groundY,
          );
        } else {
          const cx = bom.x - geo.side * Math.round(12 * geo.k);
          const cy = f.groundY - 4;
          fishAt(g, "parrotfish", { x: cx, y: cy, dir: geo.side, phase: 1, rate: 0.15, asleep: true }, 0, f.groundY);
          cocoon(g, cx, cy, 10, 5, time);
        }
      }
      for (const p of x.puffs) {
        ctx.globalAlpha = 1 - p.age / 2.5;
        rect(g, pal.sand, Math.round(p.x), Math.round(p.y), 1, 1);
      }
      ctx.globalAlpha = 1;

      // The clownfish in their anemone: they dart about its mat by day and dive in at any threat; by
      // night they sleep in it.
      const an = f.plants.find((p) => p.kind === "anemone");
      if (an && f.stage >= 2) {
        const top = anemoneTop(an, grown(an), baseOf(f, an));
        const tucked = !day || near(threats(f), an.x);
        x.clowns.forEach((c, i) => {
          const a = time * (0.8 + i * 0.3) + c.phase;
          const xx = top.x + Math.sin(a) * (tucked ? 1 : top.half * 0.8) + (i ? -2 : 2);
          const yy = tucked ? top.y + 1 : top.y - 2 - Math.abs(Math.sin(a * 1.3)) * 3;
          fishAt(
            g,
            "clownfish",
            { x: xx, y: yy, dir: Math.cos(a) > 0 ? 1 : -1, phase: c.phase, rate: tucked ? 0.3 : 1, asleep: !day },
            time,
          );
        });
      }

      // Mantle and its ink.
      for (const ink of x.inks) inkAt(g, ink);
      if (x.mantle.active)
        octopusAt(g, x.mantle, f.groundY + (x.mantle.mode === "den" ? geo.den.y - f.groundY + 1 : 0), time);

      // The epaulette shark by night.
      if (!day && x.epaulette.active) epauletteAt(g, x.epaulette, f.groundY + 2, time);
    }),
    {
      label: "bait ball, silver fish turning in mid-water and parting round the manta (day)",
      kind: "effect",
      arrives: 6,
      fixed: `${BAIT} fish`,
    },
    {
      label: "reef walls: terraced ridges of the drop-off in the haze",
      kind: "effect",
      layer: "behind the plants",
      arrives: 0,
    },
    {
      label: "epaulette shark walking the reef flat on its fins (night)",
      kind: "animal",
      family: "fish",
      arrives: 2,
      sprites: ["epaulette"],
    },
    {
      label: "mass coral spawning, eggs rising like snow falling upward (the timed event by night)",
      kind: "effect",
      arrives: 6,
    },
    {
      label: "sunlight: shafts from the surface and caustics on the sand (day)",
      kind: "effect",
      layer: "behind the plants",
      arrives: 0,
    },
    {
      label: "marine snow drifting down",
      kind: "effect",
      arrives: 0,
      fixed: `${SNOW} motes`,
    },
    {
      label: "plankton sparking in the wake of anything that moves (night)",
      kind: "effect",
      arrives: 2,
    },
  ],
  {
    init(f) {
      const bom = f.plants.find((p) => p.kind === "bommie" && p.layer === 1);
      const geo = bommieGeom(bom, 1, baseOf(f, bom));
      const thicket = f.plants.filter((p) => p.kind === "staghorn" && p.layer === 1);
      const home = thicket.length ? thicket.reduce((a, p) => a + p.x, 0) / thicket.length : f.cols * 0.2;
      return {
        bom,
        mantle: {
          active: false,
          x: geo.den.x,
          dir: 1,
          mode: "den",
          age: 0,
          wait: 3,
          camo: 0,
          flash: 0,
          c: 0,
          m: 0,
          lift: 0,
          phase: f.rand() * 5,
        },
        clowns: [0, 1].map((i) => ({ phase: f.rand() * 6, size: i })),
        chromis: {
          home,
          hide: 0,
          members: Array.from({ length: CHROMIS }, () => ({
            ox: (f.rand() - 0.5) * 22,
            oy: f.rand() * 12,
            phase: f.rand() * 6,
            rate: 0.5 + f.rand() * 0.6,
          })),
        },
        parrot: { x: f.cols * 0.3, dir: 1, y: 0, bite: 0, next: 4 },
        puffs: [],
        wrasse: [0, 1].map(() => ({ phase: f.rand() * 6 })),
        anthias: [0.18, 0.82].map((at) => ({
          x: Math.round(f.cols * at),
          hide: 0,
          members: Array.from({ length: ANTHIAS }, () => ({
            ox: (f.rand() - 0.5) * 30,
            oy: f.rand() * 14,
            phase: f.rand() * 6,
            rate: 0.6 + f.rand() * 0.5,
          })),
        })),
        turtle: { next: 6, t: null },
        // The bait ball hangs on the open-water side of the bommie.
        bait: {
          side: bom.x < f.cols / 2 ? 1 : -1,
          members: Array.from({ length: BAIT }, (_, i) => ({
            a: (i / BAIT) * Math.PI * 2,
            r: 4 + (i % 3) * 4 + f.rand() * 2,
            rate: 1.8 + f.rand() * 0.8,
            flash: f.rand() * 6,
          })),
        },
        bubbles: [],
        epaulette: { active: false, x: f.cols * 0.7, dir: -1, state: "walk", timer: 4, c: 0, phase: 0 },
        spawn: { next: 8 + f.rand() * 8, until: 0, eggs: [] },
        snow: Array.from({ length: SNOW }, () => newSnow(f, true)),
        sparks: [],
        inks: [],
      };
    },

    onGrow(f) {
      if (f.stage >= 1) f.extra.mantle.active = true;
      if (f.stage >= 2) f.extra.epaulette.active = true;
    },

    busy: (f) => f.stage >= 1,

    update(f, dt) {
      const x = f.extra;
      const day = !isNight(f);
      const bom = x.bom;
      const geo = bommieGeom(bom, grown(bom), baseOf(f, bom));
      const danger = threats(f);
      const phone = narrow(f);

      // Marine snow drifts down all day and night.
      for (const s of x.snow) {
        s.y += s.speed * dt;
        s.x += Math.sin(f.time * 0.5 + s.phase) * 0.6 * dt;
        if (s.y > f.groundY) Object.assign(s, newSnow(f, false));
      }

      // Mantle.
      if (x.mantle.active) {
        const hunters = danger.filter((t) => t.reach > 25);
        mantleUpdate(f, x.mantle, dt, geo.den, f.stage >= 5 && near(hunters, x.mantle.x));
      }
      for (const ink of x.inks) ink.age += dt;
      x.inks = x.inks.filter((i) => i.age < 3);

      // The chromis drop into their staghorn when something passes, and rise again after.
      const scared = near(danger, x.chromis.home);
      x.chromis.hide = clamp(x.chromis.hide + (scared ? dt * 3 : -dt * 0.6), 0, 1);

      // The anthias drop toward the coral when a hunter passes, like the chromis.
      for (const a of x.anthias) a.hide = clamp(a.hide + (near(danger, a.x) ? dt * 3 : -dt * 0.6), 0, 1);

      // The giant clam shuts under the manta's shadow and opens again slowly.
      const clam = f.plants.find((p) => p.kind === "giantClam");
      if (clam) {
        const over = x.manta.bird && Math.abs(x.manta.bird.x - clam.x) < MANTA.span * 0.55;
        clam.shut = clamp((clam.shut ?? 0) + (over ? dt * 6 : -dt * 0.35), 0, 1);
      }

      // The parrotfish browses along the reef, biting the coral and dropping sand.
      const pf = x.parrot;
      if (f.stage >= 3 && day && !phone) {
        if (pf.bite > 0) {
          pf.bite -= dt;
          if (pf.bite <= 0) {
            for (let i = 0; i < 6; i += 1) {
              x.puffs.push({
                x: pf.x - pf.dir * (8 + f.rand() * 3),
                y: pf.y + f.rand() * 2,
                vy: 2 + f.rand() * 3,
                age: 0,
              });
            }
            pf.next = f.time + 4 + f.rand() * 5;
          }
        } else {
          pf.x += pf.dir * 6 * dt;
          if (pf.x < 14 || pf.x > f.cols - 14) pf.dir *= -1;
          if (f.time > pf.next) pf.bite = 1.6;
        }
        pf.y = f.groundY - 9 + Math.sin(f.time * 0.4) * 2;
      }
      pf.active = f.stage >= 3 && day && !phone;
      for (const p of x.puffs) {
        p.age += dt;
        p.y += p.vy * dt;
      }
      x.puffs = x.puffs.filter((p) => p.age < 2.5 && p.y < f.groundY);

      // The green turtle swims in to the cleaning station, hovers while the wrasse clean it, swims on.
      const station = geo.tables[1];
      const tu = x.turtle;
      if (f.stage >= 4 && day) {
        if (!tu.t && f.time >= tu.next) {
          const dir = f.rand() < 0.5 ? 1 : -1;
          tu.t = { x: dir > 0 ? -16 : f.cols + 16, y: station.y - 9, dir, state: "in", hold: 0 };
        }
        const t = tu.t;
        if (t) {
          const sx = station.x;
          if (t.state === "in") {
            t.x += t.dir * 9 * dt;
            t.y += (station.y - 9 - t.y) * dt;
            if ((t.dir > 0 && t.x >= sx) || (t.dir < 0 && t.x <= sx)) Object.assign(t, { state: "clean", hold: 7 });
          } else if (t.state === "clean") {
            t.hold -= dt;
            if (t.hold <= 0) t.state = "out";
          } else {
            t.x += t.dir * 9 * dt;
            t.y -= 3 * dt;
            if (t.x < -20 || t.x > f.cols + 20) {
              tu.t = null;
              tu.next = f.time + 14 + f.rand() * 12;
            }
          }
        }
      } else if (!day) tu.t = null;
      tu.active = Boolean(tu.t);

      // The bait ball hangs on the open-water side of the bommie.
      const bait = x.bait;
      bait.active = f.stage >= 6 && day;
      bait.x = Math.round(f.cols * (bait.side > 0 ? 0.72 : 0.28));
      bait.y = Math.max(16, Math.round(f.groundY * 0.36));
      const ray = x.manta.bird;
      if (ray && f.rand() < dt * 10) {
        x.bubbles.push({
          x: ray.x - ray.dir * (MANTA.span * 0.4 + f.rand() * 4),
          y: ray.y + (f.rand() - 0.5) * 4,
          age: 0,
        });
      }
      for (const b of x.bubbles) {
        b.age += dt;
        b.y -= 5 * dt;
        b.x += Math.sin(f.time * 3 + b.age * 4) * 0.5 * dt;
      }
      x.bubbles = x.bubbles.filter((b) => b.age < 1.6 && b.y > 2);

      // Night: the epaulette shark walks the reef flat; the corals spawn.
      const ep = x.epaulette;
      if (!day && ep.active) {
        const prev = ep.x;
        ep.timer -= dt;
        if (ep.state === "walk") {
          ep.x += ep.dir * 5 * dt;
          if (ep.timer <= 0 || ep.x < 12 || ep.x > f.cols - 12) {
            ep.state = "stand";
            ep.timer = 2 + f.rand() * 3;
            if (ep.x < 12) ep.dir = 1;
            if (ep.x > f.cols - 12) ep.dir = -1;
          }
        } else if (ep.timer <= 0) {
          ep.state = "walk";
          ep.timer = 4 + f.rand() * 6;
          if (f.rand() < 0.4) ep.dir *= -1;
        }
        settle(f, ep);
        stride(ep, prev, dt, EPAULETTE.stride[0], EPAULETTE.stride[1]);
        const since = f.time - (ep.since ?? 0);
        ep.m = ep.state === "walk" ? Math.min(1, since / 0.25) : Math.max(0, 1 - since / 0.25);
        if (ep.moving && f.rand() < dt * 6) x.sparks.push({ x: ep.x - ep.dir * 8, y: f.groundY - 3, age: 0 });
      }
      if (!day && x.shark.bird && f.rand() < dt * 10) {
        const b = x.shark.bird;
        x.sparks.push({ x: b.x - b.dir * (10 + f.rand() * 8), y: b.y + (f.rand() - 0.5) * 3, age: 0 });
      }
      for (const s of x.sparks) s.age += dt;
      x.sparks = x.sparks.filter((s) => s.age < 1.2);

      const sp = x.spawn;
      if (!day && f.stage >= 6) {
        if (f.time >= sp.next && sp.until <= f.time) {
          sp.until = f.time + 14;
          sp.next = sp.until + 25 + f.rand() * 20;
        }
        if (f.time < sp.until && sp.eggs.length < SPAWN && f.rand() < dt * 14) {
          const corals = f.plants.filter(
            (p) => p.layer >= 0 && ["tableCoral", "staghorn", "boulderCoral", "bommie"].includes(p.kind),
          );
          const p = corals[Math.floor(f.rand() * corals.length)];
          if (p) {
            const top = p.kind === "bommie" ? bommieGeom(p, grown(p), baseOf(f, p)) : null;
            const y = top ? top.top + f.rand() * (top.H * 0.6) : baseOf(f, p) - 6;
            const xx = top ? p.x + (f.rand() - 0.5) * 24 * top.k : p.x + (f.rand() - 0.5) * 6;
            sp.eggs.push({ x: xx, y, vy: 3 + f.rand() * 3, phase: f.rand() * 6, c: f.rand() < 0.5 ? 0 : 1 });
          }
        }
      } else if (day) sp.until = 0;
      for (const e of sp.eggs) {
        e.y -= e.vy * dt;
        e.x += Math.sin(f.time * 0.9 + e.phase) * 1.2 * dt;
      }
      sp.eggs = sp.eggs.filter((e) => e.y > 2);
    },
  },
);

// A parrotfish's mucus cocoon: a faint shell round it that it blows each night.
function cocoon(g, cx, cy, hw, hh, time) {
  const ctx = g.ctx;
  ctx.fillStyle = g.pal.cocoon;
  ctx.globalAlpha = 0.35 + 0.1 * Math.sin(time * 1.2);
  for (let a = 0; a < 40; a += 1) {
    const t = (a / 40) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(t) * hw), Math.round(cy - Math.sin(t) * hh), 1, 1);
  }
  ctx.globalAlpha = 1;
}

const SPRITES = {
  mantle: (g, frame) =>
    octopusAt(g, walk(frame, { mode: "crawl", c: frame.time / 0.9, m: 1, phase: 1 }), g.groundY, frame.time),
  "mantle-sitting": (g, frame) => octopusAt(g, walk(frame, { mode: "sit", phase: 1 }), g.groundY, frame.time),
  "mantle-camouflaged": (g, frame) =>
    octopusAt(g, walk(frame, { mode: "sit", camo: 1, phase: 1 }), g.groundY, frame.time),
  "mantle-reaching": (g, frame) =>
    octopusAt(g, walk(frame, { mode: "sit", rest: "reach", phase: 1 }), g.groundY, frame.time),
  "mantle-in-den": (g, frame) => octopusAt(g, walk(frame, { mode: "den", phase: 1 }), g.groundY, frame.time),
  "mantle-jetting": (g, frame) => {
    inkAt(g, { x: 30, y: 38, age: 0.8 });
    octopusAt(g, walk(frame, { mode: "jet", flash: 1, lift: 8, phase: 1 }), g.groundY, frame.time);
  },
  clownfish: (g, frame) => fishAt(g, "clownfish", bird(frame), frame.time),
  chromis: (g, frame) => fishAt(g, "chromis", bird(frame), frame.time),
  anthias: (g, frame) => fishAt(g, "anthias", bird(frame), frame.time),
  wrasse: (g, frame) => fishAt(g, "wrasse", bird(frame), frame.time),
  parrotfish: (g, frame) => fishAt(g, "parrotfish", bird(frame, { y: 38 }), frame.time, g.groundY),
  trevally: (g, frame) => fishAt(g, "trevally", bird(frame), frame.time),
  blacktip: (g, frame) => fishAt(g, "blacktip", bird(frame), frame.time),
  epaulette: (g, frame) => epauletteAt(g, walk(frame, { c: frame.time / 0.7, m: 1 }), g.groundY, frame.time),
  turtle: (g, frame) => honuShellAt(g, { x: 40, dir: 1 }, 34, frame.time),
  manta: (g, frame) => {
    mantaShadow(g, 40, g.groundY);
    mantaAt(g, bird(frame, { y: 24 }), frame.time);
  },
};

const PLANT_FAMILIES = {
  bommie: "corals",
  tableCoral: "corals",
  staghorn: "corals",
  boulderCoral: "corals",
  softCoral: "corals",
  seaFan: "corals",
  seagrass: "corals",
  anemone: "corals",
  giantClam: "corals",
  stylophora: "corals",
  goniopora: "corals",
  mushroom: "corals",
  organPipe: "corals",
  acroporaBush: "corals",
  softTree: "corals",
};

export const META = {
  id: "greatbarrier",
  label: "Great Barrier Reef",
  group: "underwater",
  tint: ["#9be0ea", "rgb(42 152 178)"],
  backdrop: {
    light: {
      green: "#8fdbe8",
      "green-soft": "#bfeef2",
      peach: "#f5d8c8",
      blush: "#d6edf7",
      bloom: "#72d2dc",
    },
    dark: {
      green: "rgb(42 152 178 / 0.42)",
      "green-soft": "rgb(32 110 156 / 0.24)",
      peach: "rgb(186 112 96 / 0.16)",
      blush: "rgb(62 188 196 / 0.16)",
      bloom: "rgb(56 202 204 / 0.32)",
    },
  },
};

export default {
  ...META,
  cast: extras.cast,
  sprites: SPRITES,
  plantFamilies: PLANT_FAMILIES,
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.45, 0.72], dark: [0.5, 0.75] },
  mature: MATURE,
  paint: {
    bommie,
    tableCoral,
    staghorn,
    boulderCoral,
    softCoral,
    seaFan,
    seagrass,
    anemone,
    giantClam,
    stylophora,
    goniopora,
    mushroom,
    organPipe,
    acroporaBush,
    softTree,
  },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      "....oooo....",
      "...oHHooo...",
      "...oHooooo..",
      "...ooeyooo..",
      "....oooo....",
      "...o.oo.o...",
      "..o.o..o.o..",
      ".o..o..o..o.",
      ".o.o....o.o.",
      "..o......o..",
      "............",
    ],
    colours: { o: "#a8503a", H: "#c9705a", e: "#1a1210", y: "#e9c65e" },
  },
};
