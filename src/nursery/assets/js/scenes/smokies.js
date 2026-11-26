// The Great Smoky Mountains in fall, its trees from the park's list of common species: sugar maples
// in orange above all, red maples and sourwood in scarlet, tall golden tulip poplars, hickories,
// copper beeches, crimson black gums, bronze-barked yellow birches and dark hemlocks, with red
// spruce standing in spires along the far crests. Rhododendron, mossy boulders and fallen logs fill
// the floor, and the blue ridges fade into the haze that gives the mountains their name. Leaves
// fall. A black bear and her cub, white-tailed deer, a bull elk in the fall rut, a groundhog, a
// turkey and a golden eagle, a cardinal and a chimney swift pass through; the bear rears up to sniff the air, the cub climbs a tree, the
// elk bugles. At night the Milky Way arches over the ridges as it does on an October evening, a
// barred owl watches from a branch, and the day birds have gone to roost.
// A bobcat, the park's only wild cat, prowls the floor and rests on it now and then.

import { bearAt, bearPoses } from "../kit/bear.js";
import { hareAt, harePoses } from "../kit/beast.js";
import {
  enter,
  enterBehind,
  fidget,
  follow,
  isNight,
  narrow,
  percher,
  rest,
  settle,
  stroll,
  walker,
  wander,
} from "../kit/critters.js";
import { cervidAt } from "../kit/deer.js";
import { bandPath, milkyWayCanvas, mistAt, mistBand, onBand, starAt, starField, starFieldAt } from "../kit/effects.js";
import { felidAt, felidPoses } from "../kit/felid.js";
import { circlerAt, eagleFlyAt, flyerAt, OWL_MOVES, owlPerchAt } from "../kit/flyers.js";
import { groundBirdAt, groundBirdStep, groundPoses, groundSpeed } from "../kit/groundbird.js";
import { ridge as softRidge } from "../kit/landforms.js";
import { unhidden } from "../kit/perch.js";
import {
  blob,
  CLEARING,
  clamp,
  clearing,
  foliage,
  hash,
  rect,
  rng,
  scatter,
  sortPlants,
  stroke,
  wind,
} from "../kit/pixel.js";
import { ANIMAL_BOX, bird, owlPerched, soarSprites, walk } from "../kit/poses.js";
import { circlerActor, crossingActor, drawStep, runCast, walkerActor } from "../kit/runner.js";
import { blendPose, perchedSmall } from "../kit/smallbird.js";
import { broadleafTree, coniferTree } from "../kit/trees.js";

const MATURE = { tree: 3, ridge: 2, rhodo: 2.5, fern: 1.5, flower: 2, boulder: 1.5, log: 1.5 };
const TREE_ROWS = 38;
const HEMLOCK_ROWS = TREE_ROWS * 1.1;
const MISTS = 7;
const STARS = 70;
// Bright stars named by where they sit on the Milky Way: how far along it (0 at the core) and how
// far across, in band widths. The Summer Triangle stands high on the core's side (Deneb in the band,
// Vega and Altair either side), Cassiopeia's W zig-zags along the band on its way down, and yellow
// Capella rises low beside its far end.
const NAMED_STARS = [
  { along: 0.3, across: 1.5, colour: "#ffffff", big: true }, // Altair
  { along: 0.42, across: -1.7, colour: "#dfe8ff", big: true }, // Vega
  { along: 0.5, across: 0.1, colour: "#fff8ec", big: true }, // Deneb
  { along: 0.68, across: -0.55, colour: "#f4f6ff" }, // Cassiopeia
  { along: 0.7, across: 0.35, colour: "#f4f6ff" },
  { along: 0.72, across: -0.15, colour: "#f4f6ff" },
  { along: 0.745, across: 0.45, colour: "#f4f6ff" },
  { along: 0.77, across: -0.4, colour: "#f4f6ff" },
  { along: 0.95, across: -1.3, colour: "#ffe9a8", big: true }, // Capella
];
const MAX_LEAVES = 90;
// The broadleaf species by how often they grow here, sugar maple the most, and the hemlock among
// them. Each species names its leaf tones.
const SPECIES = [
  "sugarMaple",
  "sugarMaple",
  "sugarMaple",
  "redMaple",
  "tulip",
  "hickory",
  "sourwood",
  "beech",
  "blackGum",
  "yellowBirch",
  "hemlock",
  "hemlock",
];
const TONES = {
  sugarMaple: "orange",
  redMaple: "red",
  tulip: "yellow",
  hickory: "yellow",
  sourwood: "red",
  beech: "copper",
  blackGum: "crimson",
  yellowBirch: "yellow",
  hemlock: "hemlock",
};

const LIGHT = {
  bobcat: { T: "#b08a64", S: "#8a6a4a", P: "#f0e6d6", D: "#2e241e", e: "#2e241e" },
  red: ["#fb9a6a", "#ea5a34", "#c93e2a", "#9c2c22"],
  orange: ["#ffc874", "#f9a040", "#dd7b2c", "#b45a21"],
  yellow: ["#fff3aa", "#ffd95e", "#ebb83c", "#c99629"],
  rust: ["#e8aa7c", "#cc8250", "#a95f38", "#85452b"],
  copper: ["#e9a86a", "#cf8648", "#ad6634", "#844b26"],
  crimson: ["#e46a6a", "#c63c46", "#9c2a36", "#741e2a"],
  hemlock: ["#6e9a86", "#4a7a66", "#34604f", "#244a3c"],
  bark: ["#b8b2a6", "#948e84"],
  bronze: ["#c8a070", "#9a7650"],
  spray: "#f4ecd2",
  shag: "#68635c", // a hickory's curling bark strips
  groundShadow: "rgba(60, 44, 20, 0.22)", // the soft shadow every animal, plant and rock casts on the ground
  rhodo: ["#6aa27a", "#4a8660", "#356a4a", "#265239"],
  trunk: ["#a2866f", "#7c6653"],
  fern: ["#dccb82", "#bda55a", "#9b8444"],
  flowers: ["#b79af0", "#ffd23f", "#ffffff", "#f08acb"],
  rock: ["#d8dbd4", "#b9beb4", "#959c90", "#767e72"],
  moss: ["#9bc474", "#74a05a"],
  litter: ["#e0602a", "#f59a3c", "#ffd95e", "#a15a35"],
  soil: ["#dcc19b", "#caa97c", "#b38e62"],
  ridge: ["#a9bccf", "#91a8c0", "#7a93b0"],
  mist: "#ffffff",
  whitetail: ["#b4865a", "#6e4e33", "#f6ecda", "#d9c8a4"],
  elk: ["#a87648", "#4e3420", "#e6d2ae", "#dccaa2", "#3a2616", "#86592f"],
  bear: ["#2e2724", "#4a3d36", "#bc9d7c", "#141010", "#262020"],
  bearScent: "#8c8070",
  owl: ["#9a8a78", "#6a5a4a", "#e6dccb", "#2a2220", "#e8c060"],
  groundhog: ["#8a6a4c", "#43321f", "#c4a882"],
  turkey: ["#72502f", "#a97d4d", "#c93c3c", "#3c70ab", "#2e2218"],
  eagleGolden: ["#4a3426", "#e0a93a", "#4a3426", "#f3eadb", "#7a5a44"],
  cardinal: {
    C: "#c8321f",
    H: "#b02a1a",
    E: "#14100a",
    K: "#f0a030",
    T: "#a02818",
    b: "#a02818",
    B: "#c8321f",
    l: "#d8503a",
    t: "#c8321f",
    p: "#e0705a",
    d: "#8a1f14",
  },
  swift: {
    C: "#2e2e36",
    H: "#2e2e36",
    E: "#9a9aa4",
    K: "#1a1a1a",
    T: "#2a2a30",
    b: "#2a2a30",
    B: "#3a3a44",
    l: "#5a5a64",
    t: "#3a3a44",
    p: "#5a5a64",
    d: "#22222a",
  },
  star: ["#ffffff", "#ffe9a8"],
  line: "rgba(255, 255, 255, 0.38)",
  wet: "#4f3320",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  haze: "#ffffff",
};

const DARK = {
  bobcat: { T: "#7a6153", S: "#624d43", P: "#a29a9a", D: "#292228", e: "#292228" },
  red: ["#f27a52", "#d4482e", "#aa3426", "#7e2620"],
  orange: ["#f5b060", "#e48c36", "#c26a28", "#964c1e"],
  yellow: ["#f2e08a", "#e2c04e", "#c9a233", "#a38024"],
  rust: ["#c88a60", "#ac6a42", "#8a4e30", "#693a26"],
  copper: ["#d49058", "#b8723c", "#94582c", "#6e4020"],
  crimson: ["#d45a5e", "#b2363e", "#8a2632", "#621a26"],
  hemlock: ["#55806e", "#3e6656", "#2e5244", "#203e34"],
  bark: ["#8e897f", "#6e6a62"],
  bronze: ["#a07e58", "#7c6044"],
  spray: "#d8d0b8",
  shag: "#4d4a45", // a hickory's curling bark strips
  groundShadow: "rgba(0, 0, 0, 0.3)",
  rhodo: ["#4f8a62", "#3b7050", "#2d5840", "#204430"],
  trunk: ["#8a705c", "#6a5546"],
  fern: ["#c4b36e", "#a38f4c", "#82703a"],
  flowers: ["#b79af0", "#ffd23f", "#f5f5f5", "#f08acb"],
  rock: ["#9ba097", "#7f857a", "#636a60", "#4b524a"],
  moss: ["#7aa458", "#5d8445"],
  litter: ["#c8501f", "#d98630", "#e8c050", "#7e4630"],
  soil: ["#4a3b2c", "#3e3125", "#32271e"],
  ridge: ["#566a82", "#46596f", "#384a5e"],
  mist: "#9fb4c8",
  whitetail: ["#a87c52", "#6a4c32", "#eadfca", "#c8b894"],
  elk: ["#9a6c44", "#4a321e", "#d8c4a0", "#c8b692", "#342316", "#7a5430"],
  bear: ["#4a3e39", "#665650", "#bc9d7c", "#1a1414", "#3a302c"],
  bearScent: "#d8d0c0",
  owl: ["#8a7c6c", "#5e5042", "#d4cab8", "#1e1816", "#d8b050"],
  groundhog: ["#9c7a58", "#2a1f15", "#d2b898"],
  turkey: ["#8a6440", "#b88a58", "#d84a4a", "#5a90cc", "#3a2c20"],
  eagleGolden: ["#7a5638", "#f2c25a", "#7a5638", "#f5efe4", "#5a4432"],
  cardinal: {
    C: "#7c2319",
    H: "#6e1e16",
    E: "#100e0c",
    K: "#946523",
    T: "#641d15",
    b: "#641d15",
    B: "#7c2319",
    l: "#863529",
    t: "#7c2319",
    p: "#8a483c",
    d: "#571712",
  },
  swift: {
    C: "#202027",
    H: "#202027",
    E: "#606169",
    K: "#141416",
    T: "#1d1e23",
    b: "#1d1e23",
    B: "#27282f",
    l: "#3a3b42",
    t: "#27282f",
    p: "#3a3b42",
    d: "#181920",
  },
  star: ["#ffffff", "#ffe9a8"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#140c06",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  haze: "#0b0b0b",
};

// Each species by its shape: the maples' dense ovals, the tulip poplar's tall straight bole and
// narrow crown, the beech's broad low dome, the black gum's wide crown, the yellow birch's bronze
// peeling bark, the sourwood's lean and its drooping cream seed sprays, and the hemlock's dark tiers.
function tree(g, p, s, base) {
  const { pal } = g;
  const tones = pal[TONES[p.species]];
  // The broadleaf family's build (kit/broadleaf.js): each species by its height, colour, bark and
  // how open its crown is.
  const spec = { rows: TREE_ROWS, tones, bark: pal.bark };
  switch (p.species) {
    case "hemlock":
      return coniferTree(g, p, s, base, {
        rows: HEMLOCK_ROWS,
        tones,
        trunkTones: pal.trunk,
        tiers: 9,
        spread: 0.34,
        clear: 0.12,
        droop: 1.3,
        hang: 1,
        nod: 1,
        taper: 0.5,
        h: 0.1,
        u0: 0.2,
        wide: 1.2,
      });
    case "sugarMaple":
      return broadleafTree(g, p, s, base, { ...spec, from: 0.3, spread: 0.3, airy: 0.25 });
    case "redMaple":
      return broadleafTree(g, p, s, base, { ...spec, from: 0.3, spread: 0.28, airy: 0.3 });
    case "hickory":
      // Shagbark: strips of bark curling off the trunk.
      return broadleafTree(g, p, s, base, {
        ...spec,
        from: 0.34,
        spread: 0.3,
        airy: 0.42,
        mark: (r, i, _w, seed) => (i > 0 && hash(r >> 1, i, seed) < 0.3 ? pal.shag : null),
      });
    case "tulip":
      return broadleafTree(g, p, s, base, { ...spec, rows: TREE_ROWS * 1.35, from: 0.52, spread: 0.17, airy: 0.42 });
    case "beech":
      return broadleafTree(g, p, s, base, { ...spec, rows: TREE_ROWS * 0.9, from: 0.24, spread: 0.38, airy: 0.28 });
    case "blackGum":
      return broadleafTree(g, p, s, base, { ...spec, from: 0.32, spread: 0.3, airy: 0.32 });
    case "yellowBirch":
      return broadleafTree(g, p, s, base, {
        ...spec,
        bark: pal.bronze,
        mark: pal.spray,
        from: 0.42,
        spread: 0.24,
        airy: 0.45,
      });
    case "sourwood": {
      broadleafTree(g, p, s, base, { ...spec, rows: TREE_ROWS * 0.85, from: 0.36, spread: 0.3, airy: 0.5, lean: 4 });
      if (s < 0.9) return;
      // Drooping sprays of cream seed hung under every other clump, so they swing with it.
      (p.clumps ?? []).forEach((c, k) => {
        if (k % 2 || c.w < 5) return;
        const x = c.cx + Math.round((hash(k, p.seed, 3) - 0.5) * c.w * 0.5);
        const y = Math.round(c.cy + c.h * 0.42);
        rect(g, pal.spray, x, y, 1, 2);
        if (c.w >= 7) rect(g, pal.spray, x + 1, y + 2, 1, 1);
      });
      return;
    }
    default:
      return broadleafTree(g, p, s, base, { ...spec, from: 0.32, spread: 0.3, airy: 0.4 });
  }
}

// The leader of a full-grown hemlock, where the golden eagle's feet go: the conifer build (kit/conifer.js) draws the spire from the
// same numbers and sways it with the wind at `time`.
function hemlockTop(p, groundY, time) {
  const total = Math.max(3, Math.round(HEMLOCK_ROWS * p.scale));
  return { x: p.x + wind(time, p.x), y: groundY + (p.layer < 1 ? 1 : p.depth) - total + 3 };
}

// Where the eagle may perch: the full-grown hemlocks.
// A small bird (`strict`) wants a top that no other tree's crown, drawn earlier or later, surrounds.
function perchSpots(f, strict = false) {
  const trees = f.plants.map((p, order) => ({ p, order })).filter(({ p }) => p.kind === "tree");
  const spots = trees
    .filter(({ p }) => p.species === "hemlock" && p.shown - p.born >= MATURE.tree)
    .map(({ p, order }) => ({ x: p.x, order, top: (time) => hemlockTop(p, f.groundY, time) }));
  // Any tree drawn later may cover a hemlock's top: the tulip tree stands tallest.
  const covers = trees.map(({ p, order }) => {
    const rows = TREE_ROWS * (p.species === "hemlock" ? 1.1 : p.species === "tulip" ? 1.35 : 0.9) * p.scale;
    return {
      x: p.x,
      order: strict && p.species !== "hemlock" ? 1e9 : order,
      y: f.groundY + (p.layer < 1 ? 1 : p.depth) - Math.round(rows),
      reach: Math.round((strict ? 0.34 : 0.25) * rows),
    };
  });
  return unhidden(spots, covers, f.time);
}

function rhododendron(g, p, s, base) {
  const h = Math.max(2, Math.round((6 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 2.4);
  blob(g, p.x, base - h, w, h, foliage({ cx: p.x, top: base - h, w, h }, g.pal.rhodo, p.seed));
}

// Bracken, gone gold.
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
    stroke(g, p.x, base - 1, dx, dy, length, droop, 1, [pal.fern[1], pal.fern[0]]);
  }
}

// Asters and goldenrod.
function wildflower(g, p, s, base) {
  const { pal } = g;
  const stem = Math.max(2, Math.round((5 + (p.seed % 4)) * p.scale * s));
  const colour = pal.flowers[p.seed % pal.flowers.length];
  rect(g, pal.rhodo[1], p.x, base - stem, 1, stem);
  if (s < 0.5) return rect(g, colour, p.x, base - stem - 1, 1, 1);
  rect(g, colour, p.x - 1, base - stem - 1, 3, 1);
  rect(g, colour, p.x, base - stem - 2, 1, 3);
  rect(g, pal.flowers[1], p.x, base - stem - 1, 1, 1);
}

function boulder(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(4, Math.round((9 + (p.seed % 5)) * p.scale * s));
  const h = Math.max(3, Math.round(w * 0.6));
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.rock, p.seed, (dx, dy) =>
    dy < h * 0.35 && hash(dx, dy, p.seed + 2) < 0.7 - dy * 0.1 ? pal.moss[hash(dx, dy, 9) < 0.5 ? 0 : 1] : null,
  );
  blob(g, p.x, base - h, w, h, shade);
}

function log(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(5, Math.round(14 * p.scale * s));
  rect(g, pal.trunk[1], p.x - (w >> 1), base - 4, w, 4);
  rect(g, pal.trunk[0], p.x - (w >> 1), base - 4, w, 1);
  rect(g, pal.rock[3], p.x - (w >> 1), base - 3, 1, 3);
  for (let x = p.x - (w >> 1) + 2; x < p.x + (w >> 1) - 1; x += 1) {
    if (hash(x, 3, p.seed) < 0.55) rect(g, pal.moss[x % 2], x, base - 5, 1, 1);
  }
  if (s >= 0.9 && p.seed % 2) {
    rect(g, pal.orange[1], p.x + 1, base - 6, 3, 1);
    rect(g, pal.orange[2], p.x + 2, base - 7, 2, 1);
  }
}

// The Smokies' blue ridgelines: the landforms family's ridge (kit/landforms.js), hazier the farther
// they are. The highest carry a fringe of red spruce along their crests, dark spires against the sky.
function ridge(g, p, s, base) {
  softRidge(g, p, s, base, { tones: g.pal.ridge, fringe: p.spruce ? "spires" : null });
}

function generate(ctx) {
  const { cols } = ctx;
  const plants = [];
  scatter(plants, ctx, { kind: "ridge", count: Math.round(cols / 70), born: [1, 2], scale: [1.4, 1.9], layer: -1 });
  scatter(plants, ctx, { kind: "ridge", count: Math.round(cols / 90), born: [1, 2], scale: [1.1, 1.6], layer: -1 });
  scatter(plants, ctx, { kind: "ridge", count: Math.round(cols / 64), born: [2, 3], scale: [0.6, 0.95], layer: 0 });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 13),
    born: [1, 4],
    scale: [0.55, 0.85],
    layer: 0,
    species: SPECIES,
  });
  scatter(plants, ctx, { kind: "fern", count: Math.round(cols / 10), born: [0, 3], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 21),
    born: [1, 4],
    scale: [0.85, 1.35],
    depth: [3, 12],
    species: SPECIES,
  });
  scatter(plants, ctx, {
    kind: "rhodo",
    count: Math.round(cols / 22),
    born: [2, 5],
    scale: [0.8, 1.2],
    depth: [2, 13],
  });
  scatter(plants, ctx, {
    kind: "boulder",
    count: Math.round(cols / 30),
    born: [0, 3],
    scale: [0.8, 1.4],
    depth: [3, 14],
  });
  scatter(plants, ctx, { kind: "log", count: Math.round(cols / 56), born: [3, 6], scale: [0.9, 1.3], depth: [5, 13] });
  scatter(plants, ctx, { kind: "fern", count: Math.round(cols / 7), born: [0, 3], scale: [0.8, 1.3], depth: [0, 15] });
  scatter(plants, ctx, {
    kind: "flower",
    count: Math.round(cols / 12),
    born: [1, 5],
    scale: [0.8, 1.3],
    depth: [0, 14],
  });
  for (const p of plants) {
    if (p.kind === "ridge" && p.layer === 0) p.depth = 0;
    if (p.kind === "ridge" && p.layer < 0 && p.scale > 1.35) p.spruce = true;
    if (["tree", "rhodo", "boulder", "log"].includes(p.kind)) p.scale *= clearing(p.x, cols);
  }
  sortPlants(plants);
  return plants;
}

// A floor of fallen leaves; more of them lie along the top as the forest grows.
function soil(pal, x, y, depth, turf) {
  const n = hash(x, y, 11);
  if (y < 5 && hash(x, y, 21) < 0.12 + turf * 0.22) return pal.litter[Math.floor(hash(x, y, 22) * 4)];
  if (y >= 5 && hash(x, y, 23) < 0.03) return pal.litter[Math.floor(hash(x, y, 24) * 4)];
  if (n < 0.1 + depth * 0.22) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures

function turkeyAt(g, t, time) {
  if (g.trace) return g.trace.draw(turkeyAt, g, t, time);
  groundBirdAt(g, t, "turkey", time);
}

// The cub climbs the nearest tree now and then while its mother forages: it rears at the trunk
// (lead), climbs it paw and foot in turn (up), holds there looking round (hold), comes back down the
// same way (down), and drops to all fours (tail). Seconds.
const CLIMB = { lead: 1, up: 2.4, hold: 2.3, down: 2.4, tail: 1 };
const CLIMB_SECONDS = CLIMB.lead + CLIMB.up + CLIMB.hold + CLIMB.down + CLIMB.tail;
const BARK_COLUMN = 7; // the cub's own columns from where it stands to the bark it climbs

// The Milky Way on an October evening: the core (Sagittarius) is setting, warm and low over the
// ridges on the left, and the band arches overhead through Cygnus, whose star clouds are its
// brightest stretch, and comes down toward Perseus on the right. On a phone the sky is too narrow
// for the whole bow, so it sweeps up from the lower left and leaves past the right edge.
function milkyWay(f) {
  const w = clamp(f.cols * 0.045, 8, 13);
  const ground = f.groundY;
  return {
    points: narrow(f)
      ? bandPath(
          { x: 0, y: ground * 0.75 },
          { x: f.cols * 1.3, y: ground * 0.4 },
          { x: f.cols * 0.55, y: -ground * 0.25 },
        )
      : bandPath(
          { x: f.cols * 0.04, y: ground * 0.72 },
          { x: f.cols * 0.99, y: ground * 0.72 },
          { x: f.cols * 0.5, y: -ground * 0.45 },
        ),
    width: (along) => w * (1 - 0.25 * along) + 8 * Math.exp(-((along / 0.12) ** 2)),
    glow: (along) => 0.62 + 0.4 * Math.exp(-(((along - 0.5) / 0.14) ** 2)) - 0.25 * along,
    core: (along) => 0.9 * Math.exp(-((along / 0.1) ** 2)),
    rift: 0.6,
    warm: 0.22,
  };
}

const HEAR_AFTER = 0.8; // seconds the deer keep listening after the bull's bugle ends

const extras = runCast(
  [
    drawStep(
      "milky-way",
      (g, f) => {
        if (f.theme !== "dark") return;
        const x = f.extra;
        x.milky ??= milkyWayCanvas(f.cols, f.groundY, x.band);
        g.ctx.drawImage(x.milky, 0, 0);
        starFieldAt(g, x.stars, g.time);
        for (const star of NAMED_STARS) {
          const { x: sx, y } = onBand(x.band, star.along, star.across);
          starAt(g, star.colour, sx, y, star.big ? 0.9 : 0.95, star.big);
        }
        g.ctx.globalAlpha = 1;
      },
      { back: true },
    ),
    {
      label: "falling leaves",
      kind: "effect",
      arrives: 1,
      fixed: `up to ${MAX_LEAVES} at once`,
      sprites: ["leaf"],
    },
    walkerActor({
      id: "cat",
      label: "bobcat, the park's only wild cat",
      kind: "animal",
      family: "cats",
      sprites: ["bobcat", "bobcat-sitting", "bobcat-arching", "bobcat-lying", "bobcat-stretching"],
      arrives: 5,
      phone: "hide",
      move: { speed: 8, stride: 7, sit: [4, 9], walk: [3, 6] },
      poses: () => felidPoses("bobcat"),
      draw: (g, w, f) => felidAt(g, { ...w, kind: "bobcat" }, f.time),
    }),
    drawStep("mists", (g, f) => {
      for (const m of f.extra.mists) mistAt(g, m, f.time, f.cols);
    }),
    walkerActor({
      id: "turkey",
      label: "wild turkey",
      kind: "animal",
      family: "ground-birds",
      sprites: ["turkey", "turkey-displaying", "turkey-preening"],
      arrives: 3,
      move: { speed: groundSpeed("turkey"), stride: 1, sit: [3.5, 9], walk: [2, 5] },
      poses: (w) => groundPoses(w, "turkey"),
      step: (f, w, dt, x0) => groundBirdStep(f, w, dt, "turkey", x0),
      draw: (g, w, f) => turkeyAt(g, w, f.time),
    }),
    drawStep("deer-elk", (g, f) => {
      const x = f.extra;
      for (const d of x.deer) if (d.active) cervidAt(g, d, f.time);
      if (x.elk.active) cervidAt(g, x.elk, f.time);
    }),
    walkerActor({
      id: "groundhog",
      label: "groundhog",
      kind: "animal",
      family: "hares-rodents",
      sprites: ["groundhog", "groundhog-sitting", "groundhog-eating", "groundhog-sprawling"],
      arrives: 1,
      props: { kind: "groundhog" },
      move: { speed: 6, stride: 4, sit: [6, 12], walk: [2, 4] },
      poses: () => harePoses("groundhog"),
      draw: (g, w, f) => hareAt(g, w, f.time),
    }),
    drawStep("bears", (g, f) => {
      const [mother, cub] = f.extra.bears;
      if (mother.active) bearAt(g, mother, f.time);
      if (cub.climb) {
        const { start, x: cx, dir, height } = cub.climb;
        bearAt(g, { ...cub, x: cx, dir, climb: { ...CLIMB, t: f.time - start, height } }, f.time);
      } else if (cub.active) bearAt(g, cub, f.time);
    }),
    drawStep("owl", (g, f) => {
      const { owl } = f.extra;
      if (owl && isNight(f)) {
        rect(g, g.pal.trunk[1], owl.branch - 2, owl.y, 10, 1);
        owlPerchAt(g, owl, f.time);
      }
    }),
    crossingActor({
      id: "eagle",
      label: "golden eagle (slow flyby, side-on, perches now and then)",
      kind: "bird",
      sprites: [
        "eagle-side",
        "eagle-side-flapping",
        "eagle-landing",
        "eagle-takeoff",
        "eagle-perched",
        "eagle-perched-preening",
        "eagle-perched-stretching",
      ],
      arrives: 2,
      when: "day",
      first: 3,
      mode: "perch",
      every: [6, 5],
      speed: 13,
      spawn: (f) => ({ y: 22 + f.rand() * 30 }),
      spots: perchSpots,
      stay: [14, 28],
      clearOnOff: "perched",
      draw: (g, b, f) => eagleFlyAt(g, "golden", b, f.time),
    }),
    circlerActor({
      id: "soarer",
      label: "golden eagle (circling)",
      kind: "bird",
      sprites: ["eagle", "eagle-bank", "eagle-flapping"],
      phase: 1,
      arrives: 5,
      when: "day",
      cy: (f) => 48 + f.rand() * 10,
      draw: (g, s, f) => circlerAt(g, "golden", s, f.time),
    }),
    crossingActor({
      id: "cardinal",
      label: "northern cardinal",
      kind: "bird",
      family: "small-flyers",
      sprites: ["cardinal", "cardinal-perched"],
      arrives: 3,
      when: "day",
      first: 6,
      mode: "perch",
      every: [7, 6],
      speed: 24,
      spawn: (f) => ({ y: f.groundY - 56 - f.rand() * 24 }),
      spots: (g) => perchSpots(g, true),
      small: "cardinal",
      odds: 0.3,
      stay: [8, 16],
      draw: (g, b, f) => flyerAt(g, b, f.time, "cardinal"),
    }),
    crossingActor({
      id: "swift",
      label: "chimney swift",
      kind: "bird",
      family: "small-flyers",
      sprites: ["swift"],
      arrives: 4,
      when: "day",
      first: 2,
      every: [6, 8],
      speed: 46,
      spawn: (f) => ({ y: f.groundY - 80 - f.rand() * 24 }),
      draw: (g, b, f) => flyerAt(g, b, f.time, "swift"),
    }),
    drawStep("leaves", (g, f) => {
      for (const leaf of f.extra.leaves) {
        const tones = g.pal[leaf.tone];
        rect(g, tones[1 + (Math.round(leaf.x) % 2)], Math.round(leaf.x), Math.round(leaf.y), leaf.big ? 2 : 1, 1);
      }
    }),
    {
      label: "white-tailed deer",
      kind: "animal",
      family: "deer",
      presence: ["deer[0]", "deer[1]"],
      sprites: ["deer", "deer-antlered", "deer-flag", "deer-grazing", "deer-lying", "deer-listening"],
    },
    {
      label: "black bear and cub",
      kind: "animal",
      family: "bears",
      presence: ["bears[0]", "bears[1]"],
      sprites: [
        "bear",
        "bear-foraging",
        "bear-rearing",
        "bear-sitting",
        "bear-lying",
        "bear-cub",
        "bear-cub-sitting",
        "bear-cub-climbing",
      ],
    },
    {
      label: "mist bands",
      kind: "effect",
      arrives: 0,
      fixed: `${MISTS} bands, always`,
      sprites: ["mist"],
    },
    {
      label: "bull elk in the rut",
      kind: "animal",
      family: "deer",
      presence: ["elk"],
      sprites: ["elk", "elk-bugle"],
    },
    {
      label: "barred owl (night)",
      kind: "bird",
      family: "owls",
      arrives: 1,
      fixed: "1, perched under a crown at night",
      sprites: ["owl", "owl-swivel", "owl-fluff"],
    },
    {
      label: "stars and an arched Milky Way (dark theme)",
      kind: "effect",
      layer: "behind the plants (drawBack, dark theme only)",
      arrives: 0,
      fixed: `${STARS} stars and the Milky Way`,
      sprites: ["sky"],
    },
  ],
  {
    init(f) {
      return {
        stars: starField(f, STARS, 55),
        band: milkyWay(f),
        milky: null,
        leaves: [],
        mists: Array.from({ length: MISTS }, () => mistBand(f, 30, 26)),
        deer: [
          { ...walker(f), kind: "whitetail", sex: "f" },
          { ...walker(f), kind: "whitetail", sex: "m" },
        ],
        spook: { next: 20 + f.rand() * 15, until: -1 },
        elk: { ...walker(f), kind: "elk", sex: "m" },
        bugle: { next: 10 + f.rand() * 10, until: -1 },
        bears: [walker(f), { ...walker(f, 0.55), cub: true }],
        rear: { next: 14 + f.rand() * 10, until: -1 },
        owl: null,
      };
    },

    onGrow(f) {
      const x = f.extra;
      if (f.stage >= 4) enter(f, x.deer[0]);
      if (f.stage >= 7 && !narrow(f)) enterBehind(f, x.deer[1], x.deer[0], 22);
      if (f.stage >= 6) enter(f, x.bears[0]);
      if (f.stage >= 7) enter(f, x.elk);
      if (f.stage >= 8) enterBehind(f, x.bears[1], x.bears[0], 22);
    },

    busy: () => true,

    update(f, dt) {
      const x = f.extra;
      if (f.stage >= 1) {
        for (const p of f.plants) {
          if (!p.crown || p.kind !== "tree" || p.species === "hemlock" || x.leaves.length > MAX_LEAVES) continue;
          if (f.rand() > dt * 0.35) continue;
          const { cx, top, half, bottom } = p.crown;
          x.leaves.push({
            x: cx + (f.rand() * 2 - 1) * half,
            y: top + f.rand() * (bottom - top),
            vy: 7 + f.rand() * 6,
            phase: f.rand() * 6.28,
            tone: TONES[p.species],
            big: f.rand() < 0.3,
          });
        }
      }
      for (const leaf of x.leaves) {
        leaf.y += leaf.vy * dt;
        leaf.x += Math.sin(f.time * 2.4 + leaf.phase) * 9 * dt;
      }
      x.leaves = x.leaves.filter((leaf) => leaf.y < f.groundY + 12);
      // The deer browse, and now and then something startles them: they bound off with their white
      // tails raised as flags.
      const [doe, buck] = x.deer;
      if (doe.active && f.time >= x.spook.next) {
        x.spook.until = f.time + 2;
        x.spook.next = f.time + 25 + f.rand() * 20;
        doe.dir = f.rand() < 0.5 ? 1 : -1;
      }
      if (f.time < x.spook.until) {
        doe.state = "run";
        doe.x += doe.dir * 24 * dt;
        doe.phase += dt * 14;
        for (const d of x.deer) d.hearSince = null;
      } else {
        if (doe.state === "run") doe.state = "sit";
        if (x.elk.active && f.time < x.bugle.until + HEAR_AFTER) {
          // While the bull bugles the deer stop, face him and lift their heads to listen, and carry on
          // a moment after he finishes (cervidAt reads hearSince and hearUntil).
          doe.state = "sit";
          doe.timer = Math.max(doe.timer, 1);
          doe.dir = x.elk.x > doe.x ? 1 : -1;
          for (const d of x.deer) {
            d.hearSince ??= f.time;
            d.hearUntil = x.bugle.until + HEAR_AFTER;
          }
        } else {
          for (const d of x.deer) d.hearSince = null;
          wander(f, doe, dt, { speed: 8, sit: [3, 6], walk: [3, 6] });
        }
      }
      follow(buck, doe, dt, 22);
      buck.state = doe.state;
      buck.phase = doe.phase + 1;
      buck.timer = doe.timer;
      settle(f, doe);
      settle(f, buck);
      // The bull elk bugles in the rut: head up, a breath of mist.
      if (x.elk.active && f.time >= x.bugle.next) {
        x.bugle.until = f.time + 3;
        x.bugle.next = f.time + 25 + f.rand() * 15;
      }
      if (f.time < x.bugle.until) x.elk.state = "bugle";
      else {
        if (x.elk.state === "bugle") x.elk.state = "sit";
        wander(f, x.elk, dt, { speed: 5, stride: 5, sit: [4, 8], walk: [3, 6] });
      }
      // The bugle's pose and breath run from when it starts (cervidAt reads elk.since).
      settle(f, x.elk);
      // The mother bear forages along, and now and then rears up on her hind legs to sniff the air.
      const [mother, cub] = x.bears;
      if (mother.active && f.time >= x.rear.next) {
        x.rear.until = f.time + 3;
        x.rear.next = f.time + 22 + f.rand() * 12;
      }
      if (f.time < x.rear.until) {
        mother.state = "rear";
        mother.timer = x.rear.until - f.time;
      } else {
        if (mother.state === "rear") mother.state = "walk";
        stroll(f, mother, dt, 5);
      }
      settle(f, mother);
      if (cub.climb) {
        if (f.time - cub.climb.start > CLIMB_SECONDS) cub.climb = null;
      } else if (cub.active) {
        follow(cub, mother, dt, 22);
        cub.phase = mother.phase + 1;
        // The cub stands, forages or sits while its mother rears, then follows her on.
        cub.state = mother.state === "rear" ? "sit" : "walk";
        cub.timer = mother.timer;
        rest(f, cub, bearPoses(cub));
        if (f.rand() < dt * 0.04) {
          const near = f.plants.filter(
            (p) =>
              p.kind === "tree" && p.layer === 1 && p.crown && p.species !== "hemlock" && Math.abs(p.x - cub.x) < 20,
          );
          if (near.length) {
            const tree = near[0];
            const dir = tree.x >= cub.x ? 1 : -1;
            cub.climb = {
              start: f.time,
              dir,
              // Standing beside the trunk, facing it: its bark column lands on the trunk's near edge.
              x: dir > 0 ? tree.x - 2 - BARK_COLUMN : tree.x + 1 + BARK_COLUMN,
              height: Math.min(18, f.groundY + 7 - tree.crown.bottom),
            };
          }
        }
      }
      if (!x.owl) {
        const trees = f.plants.filter(
          (p) =>
            p.kind === "tree" &&
            p.layer === 1 &&
            p.crown &&
            p.species !== "hemlock" &&
            Math.abs(p.x - f.cols / 2) > CLEARING,
        );
        if (trees.length) {
          const tree = trees[0];
          x.owl = percher(f, tree.crown.cx + 3, tree.crown.bottom + 1, 1, OWL_MOVES);
          x.owl.species = "barred";
          x.owl.look = -1;
          x.owl.branch = tree.crown.cx;
        }
      }
      if (x.owl) fidget(f, x.owl);
    },
  },
);

const SPRITES = {
  ...soarSprites("eagle", "golden", { side: true }),
  bobcat: (g, frame) => felidAt(g, walk(frame, { kind: "bobcat" }), 0),
  "bobcat-sitting": (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", state: "sit", pose: "sit" }), 0),
  "bobcat-arching": (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", state: "sit", pose: "arch" }), 0),
  "bobcat-lying": (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", state: "sit", pose: "lie" }), 0),
  "bobcat-stretching": (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", state: "sit", pose: "bow" }), 0),
  cardinal: (g, frame) => flyerAt(g, bird(frame), 0, "cardinal"),
  "cardinal-perched": (g) => perchedSmall(g, "cardinal", 40, 40, 0, blendPose({})),
  swift: (g, frame) => flyerAt(g, bird(frame), 0, "swift"),
  turkey: (g, frame) => turkeyAt(g, walk(frame, { c: frame.phase * 0.25, amp: 1 }), 0),
  "turkey-displaying": (g, frame) =>
    turkeyAt(
      g,
      walk(frame, { state: "sit", pose: "display", since: 0, timer: 8, c: 0.3 + frame.phase * 0.1, amp: 1 }),
      3.2,
    ),
  "turkey-preening": (g, frame) =>
    turkeyAt(g, walk(frame, { state: "sit", pose: "preen", since: 0, timer: 6, amp: 0 }), 1.5),
  groundhog: (g, frame) => hareAt(g, walk(frame, { kind: "groundhog" }), 0),
  "groundhog-sitting": (g, frame) => hareAt(g, walk(frame, { kind: "groundhog", state: "sit" }), 0),
  "groundhog-eating": (g, frame) => hareAt(g, walk(frame, { kind: "groundhog", state: "sit", pose: "hunch" }), 0),
  "groundhog-sprawling": (g, frame) => hareAt(g, walk(frame, { kind: "groundhog", state: "sit", pose: "sprawl" }), 0),
  deer: (g, frame) => cervidAt(g, walk(frame, { kind: "whitetail", sex: "f" })),
  "deer-antlered": (g, frame) => cervidAt(g, walk(frame, { kind: "whitetail", sex: "m" })),
  "deer-flag": (g, frame) => cervidAt(g, walk(frame, { kind: "whitetail", sex: "f", state: "run" })),
  "deer-grazing": (g, frame) => cervidAt(g, walk(frame, { kind: "whitetail", sex: "f", state: "sit" })),
  "deer-lying": (g, frame) => cervidAt(g, walk(frame, { kind: "whitetail", sex: "m", state: "sit", pose: "lie" })),
  "deer-listening": (g, frame) =>
    cervidAt(g, walk(frame, { kind: "whitetail", sex: "f", state: "sit", hearSince: 0, hearUntil: 5 }), 1),
  elk: (g, frame) => cervidAt(g, walk(frame, { kind: "elk", sex: "m" })),
  "elk-bugle": (g, frame) => cervidAt(g, walk(frame, { kind: "elk", sex: "m", state: "bugle", actAt: 1.2 })),
  bear: (g, frame) => bearAt(g, walk(frame)),
  "bear-foraging": (g, frame) => bearAt(g, walk(frame, { state: "sit", pose: "forage", since: 0, timer: 30 }), 5),
  "bear-rearing": (g, frame) => bearAt(g, walk(frame, { state: "rear", since: 0, timer: 30 }), 5),
  "bear-sitting": (g, frame) => bearAt(g, walk(frame, { state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
  "bear-lying": (g, frame) => bearAt(g, walk(frame, { state: "sit", pose: "lie", since: 0, timer: 30 }), 5),
  "bear-cub": (g, frame) => bearAt(g, walk(frame, { scale: 0.55, cub: true })),
  "bear-cub-sitting": (g, frame) =>
    bearAt(g, walk(frame, { scale: 0.55, cub: true, state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
  "bear-cub-climbing": (g, frame) => {
    const y = g.groundY + 7;
    rect(g, g.pal.trunk[0], 47, y - 40, 2, 40);
    rect(g, g.pal.trunk[1], 49, y - 40, 2, 40);
    bearAt(
      g,
      walk(frame, { cub: true, climb: { lead: 1, up: 2.4, hold: 2.3, down: 2.4, tail: 1, t: 3.4, height: 12 } }),
      5,
    );
  },
  owl: (g) => owlPerched(DARK, g, "barred", { s: 0 }),
  "owl-swivel": (g) => owlPerched(DARK, g, "barred", { s: -0.9 }),
  "owl-fluff": (g) => owlPerched(DARK, g, "barred", { fluff: 1, shiver: 1 }),
  sky: (g) => {
    g.pal = DARK;
    const f = { rand: rng(3), cols: ANIMAL_BOX.w, groundY: ANIMAL_BOX.ground, theme: "dark" };
    extras.drawBack(g, { ...f, extra: extras.init(f) });
  },
  mist: (g) => mistAt(g, { x0: 90, y: 30, w: 40, h: 6, speed: 0 }, 0, 80),
  leaf: (g) => {
    [g.pal.red, g.pal.orange, g.pal.yellow, g.pal.copper].forEach((tones, i) => {
      for (let k = 0; k < 3; k += 1) {
        rect(g, tones[1 + ((i + k) % 2)], 5 + i * 18 + k * 5, 6 + ((k * 7 + i * 3) % 11), k % 2 ? 2 : 1, 1);
      }
    });
  },
};

const PLANT_FAMILIES = {
  "tree-sugarMaple": "broadleaf",
  "tree-hickory": "broadleaf",
  "tree-beech": "broadleaf",
  "tree-yellowBirch": "broadleaf",
  "tree-redMaple": "broadleaf",
  "tree-sourwood": "broadleaf",
  "tree-tulip": "broadleaf",
  "tree-blackGum": "broadleaf",
  "tree-hemlock": "conifers",
};

export const META = {
  id: "smokies",
  label: "Great Smoky Mountains",
  group: "woods",
  tint: ["#f9cf9c", "rgb(220 140 60)"],
  backdrop: {
    light: {
      green: "#f9cf9c",
      "green-soft": "#f4e1a4",
      peach: "#f4b9a0",
      blush: "#d8e4ec",
      bloom: "#f3b56f",
    },
    dark: {
      green: "rgb(220 140 60 / 0.38)",
      "green-soft": "rgb(200 160 60 / 0.18)",
      peach: "rgb(190 80 50 / 0.2)",
      blush: "rgb(80 120 160 / 0.16)",
      bloom: "rgb(230 140 50 / 0.3)",
    },
  },
};

export default {
  ...META,
  cast: extras.cast,
  sprites: SPRITES,
  plantFamilies: PLANT_FAMILIES,
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.35, 0.55], dark: [0.45, 0.62] },
  mature: MATURE,
  paint: { tree, ridge, rhodo: rhododendron, fern, flower: wildflower, boulder, log },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      "...a........",
      "..aaa....a..",
      ".aaaaa..aaa.",
      "aaaaaaaaaaaa",
      "aaammmmaaaaa",
      "mmmmmbbmmmmm",
      "mbbmbbbbbmmm",
      "bbbbbbbbbbbm",
      "bbbbmmmmbbbb",
      "ccmmmmcccccc",
      "cccccccccccc",
    ],
    colours: { a: "#a9bccf", b: "#7a93b0", c: "#4f6a8a", m: "#e3eaf1" },
  },
};
