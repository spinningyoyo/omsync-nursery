// Yellowstone National Park in Wyoming: sagebrush steppe and lodgepole pines under the snowy
// Absaroka peaks, with a geyser cone that erupts every 25 to 40 seconds beside a hot spring. Bison
// graze, elk (the park's most common large animal, and the wolves' prey) and pronghorn roam the
// valley, a pair of wolves trots after them, a grizzly forages, and a bighorn ram keeps watch from a
// rocky crag; by day a bald eagle and a trumpeter swan fly over. The dark theme is a starry night:
// the cold air condenses far more of the hot spring's steam, and after each eruption it stacks into
// a moonlit tower that climbs past the peaks.
import { bearAt, canidAt, cervidAt, flyerAt, raptorAt, sheepAt, swanAt } from "../kit/animals.js";
import {
  doing,
  enter,
  enterBehind,
  fidget,
  flyBy,
  follow,
  isNight,
  narrow,
  percher,
  soarAt,
  soarer,
  walker,
  wander,
} from "../kit/critters.js";
import { dithered, starField, starFieldAt } from "../kit/effects.js";
import {
  blob,
  clamp,
  clearing,
  foliage,
  hash,
  makePlant,
  part,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
  sprite,
} from "../kit/pixel.js";
import { broadleafTree, coniferTree } from "../kit/trees.js";

const LODGEPOLE_ROWS = 40;
const ASPEN_ROWS = 30;
const RANGE_ROWS = 64;
const CONE_ROWS = 11;
const CRAG_ROWS = 24; // the bighorn's crag at scale 1
const CONE_DEPTH = 15; // the cone stands in front of every other near plant
const COLUMN_ROWS = 34; // the eruption's height at full size
const GRAVITY = 40; // art pixels per second squared, for the falling spray
const SPRAY_RATE = 30; // spray drops per second while erupting
const FLUFF_RATE = 4; // seeds released per second
const MAX_FLUFF = 40;
const STARS = 70;
const STEAM_LEVELS = [0.12, 0.35, 0.75]; // field strengths of thin, body and dense steam
const STEAM_ALPHA = { day: [0.4, 0.75, 0.95], night: [0.22, 0.5, 0.8] }; // and their opacity
const TINT_ALPHA = 0.5; // the pool's colours in the steam, as a share of its opacity
const STEAM_REACH = 120; // art pixels to each side of the spring that the steam may drift
const STEAM_ROWS = 120; // and above the soil
const BANK_DAY = 20; // how high the billows over the spring climb by day
const BANK_NIGHT = 30; // and at night
const BILLOWS = 14;
const SURGE_PUFFS = 30;
const SURGE_LENGTH = 16.5; // seconds from the surge's first puff until its last has faded

const LIGHT = {
  range: ["#8ea7c0", "#7b95b0", "#64829f"],
  snow: "#ffffff",
  pine: ["#4d7460", "#3b5f4e", "#2b4a3d", "#1f3b30"],
  pineTrunk: ["#7d6250", "#5f4a3c"],
  aspen: ["#c6cf5a", "#a9b64a", "#8c9d3c", "#6e7f2c"],
  aspenTrunk: ["#f2eee4", "#cfc8b6"],
  sage: ["#b9c6a8", "#a2b393", "#8a9c7c", "#6f8163"],
  balsam: ["#f7c52e", "#e9a21c", "#b8741a"],
  lupine: ["#9b74e0", "#7550c0", "#5a3c9a"],
  stem: ["#7c9462", "#5f7a4b"],
  rock: ["#d3cdbf", "#b8b1a0", "#948d7e", "#72695c"],
  log: ["#9b7a5a", "#7a5e43", "#5e4733"],
  cone: ["#f6f4ec", "#e2dfd3", "#c4c0b2", "#959182"],
  crater: ["#8cc3de", "#4f8fb8"],
  spring: ["#1d4e96", "#2a9ac4", "#3cc2b0", "#b8d84e", "#eba335", "#dd6a2c"],
  grass: ["#cfc690", "#b3ae70"],
  soil: ["#dccba4", "#cbb791", "#b59f78"],
  spout: ["#7fb6d4", "#b7dcee", "#ffffff"],
  steam: "#c8dde8",
  steamTones: ["#ffffff", "#d6e0ea", "#96a8bc"],
  fluff: "#9d988a",
  bison: ["#4a3426", "#b98a5a", "#e7dcc0", "#2a1d15"],
  bisonShade: "#94693f",
  calf: ["#d28a52", "#8a5a36"],
  bear: ["#6e4a32", "#a88868", "#c9a07c", "#2e221c", "#4e3424"],
  wolf: ["#8a8f96", "#5a5f66", "#c8a878", "#222222", "#4a4f56"],
  pronghorn: ["#c39a64", "#94744a", "#f5f0e6", "#5a4330", "#5a4330"],
  sheep: ["#7a6a58", "#e4dccb", "#c9b48a", "#4a3c30", "#97845e"],
  elk: ["#a87648", "#4e3420", "#e6d2ae", "#dccaa2", "#3a2616", "#86592f"],
  eagle: ["#4a3426", "#f6f2ea", "#f6f2ea", "#e2a52e", "#7a5a44"],
  bluebird: { C: "#4a9ae0", H: "#4a9ae0", E: "#14202c", K: "#1a1a1a", T: "#2f6fb0", b: "#2f6fb0", B: "#4a9ae0", l: "#a7d2f0", t: "#4a9ae0", p: "#cfe8fa", d: "#2f6fb0" },
  swan: ["#f0ebdc", "#8a8578", "#1f1f1f", "#1f1f1f"],
  wet: "#8a7455",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  line: "rgba(255, 255, 255, 0.4)",
  haze: "#ffffff",
};

const DARK = {
  range: ["#2c3d57", "#22334b", "#1a283d"],
  snow: "#c7d2e4",
  pine: ["#34594a", "#2a4a3c", "#213b30", "#183027"],
  pineTrunk: ["#6e5848", "#544338"],
  aspen: ["#b7bd62", "#9ea653", "#858f46", "#6b7539"],
  aspenTrunk: ["#c5c1b5", "#9d9a8f"],
  sage: ["#7d8b72", "#6a7a61", "#56674f", "#43523f"],
  balsam: ["#e3c04a", "#c69a2e", "#a57a22"],
  lupine: ["#8a6cc6", "#6b4fa6", "#533b82"],
  stem: ["#5f7650", "#4a5d3d"],
  rock: ["#7d8178", "#6a6f67", "#575c55", "#44483f"],
  log: ["#6e5846", "#56443a", "#41332b"],
  cone: ["#c3c5c0", "#a8aba6", "#8c8f8b", "#6e716e"],
  crater: ["#5f94b6", "#346b90"],
  spring: ["#16397a", "#207aa8", "#2f9e98", "#8fae3e", "#c9982c", "#b8541f"],
  grass: ["#8e8a58", "#76733f"],
  soil: ["#4a4132", "#41392d", "#352e23"],
  spout: ["#8fcde4", "#c4e8f6", "#ffffff"],
  steam: "#aebcd0",
  steamTones: ["#e2e9f3", "#aebcd0", "#7a8aa3"],
  fluff: "#e9e6da",
  bison: ["#4a3426", "#8f6a44", "#cbbf9e", "#1d140e"],
  bisonShade: "#6f5234",
  calf: ["#c17a45", "#6e4329"],
  bear: ["#5a3f2c", "#8d7054", "#b08862", "#241c16", "#3e2c20"],
  wolf: ["#6f7680", "#464c55", "#a8926a", "#161616", "#3a3f46"],
  pronghorn: ["#a58156", "#7a5f3e", "#d8d0c0", "#42321f", "#42321f"],
  sheep: ["#625347", "#b9ad93", "#b7a57f", "#332a22", "#857552"],
  elk: ["#94683e", "#46301e", "#d2c09c", "#c4b48e", "#342316", "#74502c"],
  eagle: ["#33241a", "#e6e3d8", "#e6e3d8", "#c99326", "#5a4432"],
  bluebird: { C: "#30618d", H: "#30618d", E: "#101821", K: "#141416", T: "#204770", b: "#204770", B: "#30618d", l: "#688396", t: "#30618d", p: "#80909c", d: "#204770" },
  swan: ["#e9e6dc", "#7a766c", "#161616", "#161616"],
  star: ["#9fb4d8", "#ffffff"],
  wet: "#1b140d",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  line: "rgba(255, 255, 255, 0.1)",
  haze: "#0b0b0b",
};

// The Absaroka peaks: a jagged mountain, lit on the left, with snow on its upper slopes.
function mountain(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(4, Math.round(RANGE_ROWS * p.scale * s));
  const width = Math.round(height * 1.5);
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const bulge = (hash(r, p.seed, 1) - 0.5) * 2;
    const half = Math.round((width / 2) * Math.pow(1 - f, 0.9) + bulge);
    if (half < 1) break;
    row(g, base - 1 - r, p.x - half, p.x + half, (x) => {
      if (f > 0.7 + (hash(x, 0, p.seed) - 0.5) * 0.14) return pal.snow;
      const u = (x - p.x) / half;
      return pal.range[u < -0.3 ? 0 : u < 0.3 ? 1 : 2];
    });
  }
}

// Lodgepole pines: slender conifers on long bare trunks, in dense stands.
function lodgepole(g, p, s, base) {
  const { pal } = g;
  const spec = { rows: LODGEPOLE_ROWS, tones: pal.pine, trunkTones: pal.pineTrunk };
  coniferTree(g, p, s, base, { ...spec, tiers: 6, spread: 0.15, clear: 0.46 });
}

// Quaking aspens: slim white trunks under high, narrow, yellow-green crowns.
function aspen(g, p, s, base) {
  const { pal } = g;
  const [bark, mark] = pal.aspenTrunk;
  const spec = { rows: ASPEN_ROWS, tones: pal.aspen, trunkTones: [bark, mark], mark };
  broadleafTree(g, p, s, base, { ...spec, wide: 0.45, lift: 0.18 });
}

// Sagebrush: low, silver-grey-green shrubs that cover the steppe.
function sagebrush(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round((4 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 2.4);
  blob(g, p.x, base - h, w, h, foliage({ cx: p.x, top: base - h, w, h }, pal.sage, p.seed));
}

// Balsamroot, a yellow daisy on a stalk, or a purple lupine spike; the seed picks which.
function wildflower(g, p, s, base) {
  const { pal } = g;
  const stem = Math.max(2, Math.round((6 + (p.seed % 4)) * p.scale * s));
  rect(g, pal.stem[1], p.x, base - stem, 1, stem);
  if (p.seed % 2 === 0) {
    if (s < 0.5) return rect(g, pal.balsam[0], p.x, base - stem - 1, 1, 1);
    rect(g, pal.balsam[0], p.x - 1, base - stem - 2, 3, 2);
    rect(g, pal.balsam[2], p.x, base - stem - 1, 1, 1);
  } else {
    if (s < 0.5) return rect(g, pal.lupine[0], p.x, base - stem - 1, 1, 1);
    rect(g, pal.lupine[1], p.x - 1, base - stem - 3, 3, 3);
    rect(g, pal.lupine[2], p.x, base - stem - 2, 1, 1);
  }
}

function boulder(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(4, Math.round((9 + (p.seed % 5)) * p.scale * s));
  const h = Math.max(3, Math.round(w * 0.6));
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.rock, p.seed, (dx, dy) =>
    hash(dx, dy, p.seed + 2) < 0.1 ? pal.sage[2] : null,
  );
  blob(g, p.x, base - h, w, h, shade);
}

// A fallen log on the soil, with a few patches of lichen on its back.
function log(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(5, Math.round(14 * p.scale * s));
  const left = p.x - (w >> 1);
  rect(g, pal.log[1], left, base - 4, w, 4);
  rect(g, pal.log[0], left, base - 4, w, 1);
  rect(g, pal.log[2], left, base - 3, 1, 3);
  for (let x = left + 2; x < left + w - 1; x += 1) {
    if (hash(x, 3, p.seed) < 0.5) rect(g, pal.sage[2], x, base - 5, 1, 1);
  }
}

// The geyser cone: grey-white sinter built up in terraces, with a blue pool in its crater.
function geyserCone(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round(CONE_ROWS * p.scale * s));
  const w = Math.round(h * 2.2) + 2;
  const cx = p.x;
  for (let r = 0; r < h; r += 1) {
    const half = Math.round((w / 2) * (1 - 0.6 * (r / h)));
    row(g, base - 1 - r, cx - half, cx + half, (x) => {
      if (x === cx - half || x === cx + half) return pal.cone[3];
      if (r % 3 === 0) return pal.cone[2];
      return pal.cone[x < cx ? 0 : 1];
    });
  }
  rect(g, pal.crater[0], cx - 1, base - h, 3, 1);
  rect(g, pal.crater[1], cx, base - h, 1, 1);
}

const springWidth = (g, p, s) => Math.max(10, Math.round(g.cols * 0.14 * p.scale * s));

// The hot spring: a pool with rings of colour, deep blue at the centre and orange at the rim.
function hotSpring(g, p, s, base) {
  const { pal } = g;
  const w = springWidth(g, p, s);
  const h = Math.max(3, Math.round(6 * s));
  const cy = base + (h - 1) / 2;
  blob(g, p.x, base, w, h, (x, y) => {
    const jitter = (hash(x, y, p.seed) - 0.5) * 0.12;
    const d = Math.hypot((x - p.x) / (w / 2), (y - cy) / (h / 2)) + jitter;
    const ring = d < 0.25 ? 0 : d < 0.45 ? 1 : d < 0.6 ? 2 : d < 0.75 ? 3 : d < 0.9 ? 4 : 5;
    return pal.spring[ring];
  });
}

function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const coneLeft = rand() < 0.5;
  const poolX = Math.round(cols * (coneLeft ? 0.78 : 0.22));
  const poolClear = Math.round(cols * 0.07) + 6;
  const cragX = Math.round(cols * (coneLeft ? 0.06 : 0.94));
  const clear = (x) => Math.abs(x - poolX) > poolClear && Math.abs(x - cragX) > 14;
  scatter(plants, ctx, {
    kind: "range",
    count: Math.round(cols / 60),
    born: [1, 2],
    scale: [1.1, 1.6],
    layer: -1,
  });
  scatter(plants, ctx, {
    kind: "range",
    count: Math.round(cols / 40),
    born: [1, 3],
    scale: [0.7, 1],
    layer: 0,
  });
  scatter(plants, ctx, {
    kind: "lodgepole",
    count: Math.round(cols / 20),
    born: [1, 3],
    scale: [0.55, 0.8],
    layer: 0,
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "sagebrush",
    count: Math.round(cols / 6),
    born: [0, 2],
    scale: [0.7, 1],
    layer: 0,
  });
  scatter(plants, ctx, {
    kind: "lodgepole",
    count: Math.round(cols / 16),
    born: [1, 4],
    scale: [0.85, 1.25],
    depth: [3, 12],
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "aspen",
    count: Math.round(cols / 22),
    born: [2, 4],
    scale: [0.7, 1.1],
    depth: [2, 12],
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "sagebrush",
    count: Math.round(cols / 3),
    born: [0, 3],
    scale: [0.8, 1.25],
    depth: [0, 13],
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "wildflower",
    count: Math.round(cols / 9),
    born: [1, 5],
    scale: [0.8, 1.3],
    depth: [0, 13],
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "boulder",
    count: Math.round(cols / 30),
    born: [0, 3],
    scale: [0.8, 1.4],
    depth: [3, 13],
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "log",
    count: Math.round(cols / 56),
    born: [3, 6],
    scale: [0.9, 1.3],
    depth: [5, 13],
    keep: clear,
  });
  for (const p of plants) {
    if (p.kind === "lodgepole" || p.kind === "aspen") p.scale *= clearing(p.x, cols);
  }
  const coneX = Math.round(cols * (coneLeft ? 0.2 : 0.8));
  plants.push(makePlant(rand, "geyserCone", coneX, { born: 1, depth: CONE_DEPTH }));
  plants.push(makePlant(rand, "crag", cragX, { born: 2, depth: 12, scale: clearing(cragX, cols) }));
  plants.push(makePlant(rand, "hotSpring", poolX, { born: 1, depth: 1 }));
  sortPlants(plants);
  return plants;
}

// A rhyolite crag at the valley's edge: a stack of pale, blocky rock with a flat top where the
// bighorn ram stands.
function crag(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(4, Math.round(CRAG_ROWS * p.scale * s));
  const half = Math.max(4, Math.round(h * 0.55));
  for (let r = 0; r < h; r += 1) {
    const f = r / h;
    const w = Math.round(half * (1 - f * 0.55) + (hash(r >> 2, p.seed, 1) - 0.5) * 3);
    const y = base - 1 - r;
    row(g, y, p.x - w, p.x + w, (x) => {
      if (r === h - 1) return pal.rock[0];
      if ((r & 3) === 0 && hash(x, r, p.seed) < 0.6) return pal.rock[3];
      return pal.rock[x < p.x - w / 3 ? 0 : x < p.x + w / 3 ? 1 : 2];
    });
  }
}

function cragTop(p, groundY) {
  return groundY + p.depth - Math.max(4, Math.round(CRAG_ROWS * p.scale));
}

// Pale steppe soil, with bunchgrass along the top edge and a few pebbles.
function soil(pal, x, y, depth, turf) {
  if (y === 0 && hash(x, 0, 5) < turf * 0.6) return pal.grass[1];
  if (hash(x, y, 31) < 0.02) return pal.rock[1];
  const n = hash(x, y, 11);
  if (n < 0.1 + depth * 0.22) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures

// An American bison: a high shoulder hump, tan hindquarters with a darker underside, a dark woolly
// front, and a low head with a beard and short horns. Standing, it grazes, the hump sloping down to its
// head in the grass. The calf (scale below 1) is all orange-tan, drawn on its own. D is the dark wool,
// T tan, S its darker shade, H horn and eye, B the beard and far legs. Its palettes are bison: [dark,
// tan, horn, beard], bisonShade, and calf: [tan, dark].
const BISON = [
  "............DDDDD.........",
  "..........DDDDDDDDD.......",
  "........DDDDDDDDDDDD......",
  "......TTDDDDDDDDDDDDD.....",
  "...TTTTTDDDDDDDDDDDDDD....",
  ".TTTTTTTDDDDDDDDDDHDDD.H..",
  "TTTTTTTTDDDDDDDDDDHBBBBH..",
  "TTTTTTTTDDDDDDDDDDDBBBBBB.",
  "TTTTTTTTDDDDDDDDDDDDDHDDDD",
  "TTTTTTTDDDDDDDDDDDDDDDDDDD",
  "TTTTTTTDDDDDDDDDDDDDDDDDD.",
  "STTTTTDDDDDDDDDDDDDBBBBB..",
  ".SSSSSSDDDDDDDDDDDDBBBB...",
  "..SSSSS...DDDDDDDDD.BB....",
];
const BISON_GRAZING = [
  "........DDDDDDDDD.........",
  "......TTDDDDDDDDDD........",
  "...TTTTTDDDDDDDDDDD.......",
  ".TTTTTTTDDDDDDDDDDDD......",
  "TTTTTTTTDDDDDDDDDDDDD.....",
  "TTTTTTTTDDDDDDDDDDDDD.....",
  "TTTTTTTTDDDDDDDDDDDDDD....",
  "TTTTTTTDDDDDDDDDDDDDDD....",
  "TTTTTTTDDDDDDDDDDDDDDD....",
  "STTTTTDDDDDDDDDDDDHDDD.H..",
  ".SSSSSSDDDDDDDDDDDHBBBBH..",
  "..SSSSS...DDDDDDDDDBBBBBB.",
  ".................DDDDHDDDD",
  ".................DDDDDDDDD",
  ".................DDDDDDDD.",
  ".................DDBBBBB..",
  ".................DDBBBB...",
  ".................DD.BB....",
];
const BISON_CALF = [
  ".....TTTTTTT...",
  "...TTTTTTSTTT..",
  "TTTTTTTTTTTSSS.",
  "TTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTT",
  ".STTTTTTTTTSSST",
  "..SSSTTTTTTSSS.",
];
const BISON_LEG = 6;
const BISON_LEGS = [2, 5, 13, 16];
// The calf's legs, [column, width]: near hind, far hind, far fore, near fore.
const CALF_LEGS = [[1, 2], [3, 1], [7, 2], [9, 1]];

function bisonAt(g, b) {
  const [dark, tan, horn, beard] = g.pal.bison;
  const [calfTan, calfDark] = g.pal.calf;
  const x = Math.round(b.x);
  const y = g.groundY + 7;
  const px = (colour, dx, dy, w, h) => part(g, colour, x, y, b.dir, dx, dy, w, h);
  const walking = b.state === "walk";
  const up = (i) => walking && (Math.floor(b.phase) % 2 === 0) === (i === 0 || i === 3);
  if (b.scale < 1) {
    CALF_LEGS.forEach(([dx, w], i) => px(i === 1 || i === 2 ? calfDark : calfTan, dx, -3, w, up(i) ? 2 : 3));
    sprite(g, BISON_CALF, { T: calfTan, S: calfDark }, x, y, b.dir, 1, BISON_CALF.length + 3);
    return;
  }
  const colours = { D: dark, T: tan, S: g.pal.bisonShade, H: horn, B: beard };
  BISON_LEGS.forEach((dx, i) => {
    px(i === 1 || i === 2 ? beard : dark, dx, -BISON_LEG, 3, up(i) ? BISON_LEG - 2 : BISON_LEG);
  });
  px(dark, -1, -BISON_LEG - 8, 1, 4); // the tail
  if (walking) sprite(g, BISON, colours, x, y, b.dir, 0, BISON.length + BISON_LEG);
  else sprite(g, BISON_GRAZING, colours, x, y, b.dir, 0, BISON_GRAZING.length);
}

// The steam's strength at each pixel round the spring, reused from frame to frame.
const field = { d: new Float32Array(0), left: 0, top: 0, w: 0, h: 0 };

function clearField(g, cx) {
  field.left = Math.max(0, cx - STEAM_REACH);
  field.top = Math.max(0, g.groundY - STEAM_ROWS);
  field.w = Math.min(g.cols, cx + STEAM_REACH + 1) - field.left;
  field.h = g.groundY + 2 - field.top;
  if (field.d.length < field.w * field.h) field.d = new Float32Array(field.w * field.h);
  else field.d.fill(0, 0, field.w * field.h);
}

// A puff of steam centred at (x, y), rx by ry, adding strength a at its centre and less outward.
function puff(x, y, rx, ry, a) {
  const { d, left, top, w, h } = field;
  const x0 = Math.max(0, Math.floor(x - rx * 2 - left));
  const x1 = Math.min(w - 1, Math.ceil(x + rx * 2 - left));
  const y0 = Math.max(0, Math.floor(y - ry * 2 - top));
  const y1 = Math.min(h - 1, Math.ceil(y + ry * 2 - top));
  for (let py = y0; py <= y1; py += 1) {
    const v = ((py + top - y) / ry) ** 2;
    for (let px = x0; px <= x1; px += 1) {
      const e = v + ((px + left - x) / rx) ** 2;
      if (e < 4) d[py * w + px] += a * Math.exp(-e * 1.4);
    }
  }
}

// Draws the field in three strengths, dithered into each other. A pixel is lit where the steam
// thickens toward the lower right (the light comes from the upper left), shaded where it thins, and
// by day the steam's foot takes the pool's colours below it: the blue water's turquoise over the
// middle, then the microbial mats' gold and orange toward the rim. Its palette is steamTones: [lit,
// body, shade].
function drawField(g, cx, half, night) {
  const { d, left, top, w, h } = field;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  const tones = [...g.pal.steamTones, g.pal.spring[2], g.pal.spring[4], g.pal.spring[5]];
  const alpha = STEAM_ALPHA[night ? "night" : "day"];
  const key = (x, y) => {
    const s = at(x, y);
    const ax = x + left;
    const ay = y + top;
    let level = STEAM_LEVELS.findLastIndex((l) => s >= l);
    if (level < STEAM_LEVELS.length - 1) {
      const low = level < 0 ? STEAM_LEVELS[0] * 0.75 : STEAM_LEVELS[level];
      if (s > low && dithered(ax, ay, (s - low) / (STEAM_LEVELS[level + 1] - low))) level += 1;
    }
    if (level < 0) return -1;
    if (!night && dithered(ax, ay, 1 - (g.groundY - ay) / 9)) {
      const u = Math.abs(ax - cx) / half + (hash(ax, ay, 5) - 0.5) * 0.2;
      if (u < 1.15) return level * 8 + (u < 0.45 ? 3 : u < 0.8 ? 4 : 5);
    }
    const slope = at(x + 2, y + 2) - at(x - 2, y - 2);
    return level * 8 + (slope > 0.08 ? 0 : slope < -0.1 ? 2 : 1);
  };
  for (let y = 0; y < h; y += 1) {
    let start = 0;
    let run = key(0, y);
    for (let x = 1; x <= w; x += 1) {
      const next = x < w ? key(x, y) : -1;
      if (next === run) continue;
      if (run >= 0) {
        g.ctx.globalAlpha = alpha[run >> 3] * ((run & 7) > 2 ? TINT_ALPHA : 1);
        rect(g, tones[run & 7], left + start, top + y, x - start, 1);
      }
      start = x;
      run = next;
    }
  }
  g.ctx.globalAlpha = 1;
}

// The hot spring's steam: a low veil over the water, and billows that rise from across it, swell,
// lean downwind and fade. The wind blows away from the middle of the page, round the sign-in card,
// except on a phone, where the card spans the page and the steam would blow off its edge. The
// cold night air condenses more of it, so the billows climb higher at night. During a surge,
// `surge` seconds old, the steam stacks into a tower that climbs past the peaks, its head spreading
// downwind, then breaks away and thins.
function steamAt(g, spring, time, night, surge = -1) {
  const half = springWidth(g, spring, 1) / 2;
  const outward = spring.x < g.cols / 2 ? -1 : 1;
  const lean = narrow(g) ? -outward : outward;
  const ground = g.groundY;
  clearField(g, spring.x);
  for (let i = 0; i < 7; i += 1) {
    puff(spring.x + (i / 3 - 1) * half + Math.sin(time * 0.5 + i) * 2, ground - 2, 7, 2.5, 0.3);
  }
  const height = night ? BANK_NIGHT : BANK_DAY;
  for (let i = 0; i < BILLOWS; i += 1) {
    const life = 8 + hash(i, 1, 7) * 4;
    const t = ((time + hash(i, 2, 7) * life) % life) / life;
    const climb = height * t * (0.6 + 0.4 * hash(i, 4, 7));
    const sway = Math.sin(time * 0.7 + i) * 1.5;
    const x = spring.x + (hash(i, 3, 7) * 2 - 1) * half * 0.9 + (lean * climb * climb) / 90 + sway;
    const r = 3.5 + climb * 0.18;
    puff(x, ground - 3 - climb, r * 1.3, r, 0.7 * Math.min(1, t * 5) * (1 - t));
  }
  for (let j = 0; surge >= 0 && j < SURGE_PUFFS; j += 1) {
    const age = surge - (j / SURGE_PUFFS) * 7;
    const life = 6.5 + hash(j, 4, 9) * 3;
    if (age < 0 || age > life) continue;
    const climb = (60 + hash(j, 5, 9) * 18) * (1 - Math.exp(-age / 2.4));
    const u = (hash(j, 6, 9) * 2 - 1) * 0.6;
    const x = spring.x + u * half * (1 + climb / 50) + lean * ((climb * climb) / 260 + age * 0.6);
    const r = (4 + climb * 0.12) * (0.75 + 0.5 * hash(j, 7, 9));
    puff(x, ground - 3 - climb, r * 1.2, r, 0.6 * Math.min(1, age / 0.8) * (1 - age / life) ** 0.8);
  }
  drawField(g, spring.x, half, night);
}

// The eruption: a column of water and steam that rises from the crater, billows at the top and
// then falls back. Its height grows, holds, and shrinks at the end of the eruption.
function columnAt(g, cone, age, length, time) {
  const rise = smooth(clamp(age / 1.4, 0, 1));
  const fall = clamp((length - age) / 1.2, 0, 1);
  const rows = Math.round(
    COLUMN_ROWS * Math.min(rise, fall) * (0.93 + 0.07 * hash(0, Math.floor(time * 8), 9)),
  );
  const [body, light, white] = g.pal.spout;
  let sway = 0;
  for (let k = 0; k < rows; k += 1) {
    sway = Math.round(Math.sin(time * 1.1 + k * 0.3) * (k / 10));
    const half = 1 + Math.floor(k / 10);
    const tone = hash(k, Math.floor(time * 8), 4) < 0.3 ? light : body;
    const colour = k > rows - 6 ? white : tone;
    rect(g, colour, cone.x + sway - half, cone.top - 1 - k, half * 2 + 1, 1);
  }
  if (rows > 0) blob(g, cone.x + sway, cone.top - rows - 4, 13, 5, () => g.pal.steam);
}

const extras = {
  init(f) {
    const cone = f.plants.find((p) => p.kind === "geyserCone");
    const spring = f.plants.find((p) => p.kind === "hotSpring");
    return {
      stars: starField(f, STARS, 70),
      cone: { x: cone.x, top: f.groundY + cone.depth - CONE_ROWS },
      spring,
      geyser: { start: -Infinity, length: 6, next: Infinity, drops: [] },
      surge: -Infinity,
      fluff: [],
      eagle: { next: 0, bird: null },
      soarer: soarer(f, 44 + f.rand() * 10, 2),
      bluebird: { next: 4, bird: null },
      swan: { next: 0, bird: null },
      pronghorn: { ...walker(f), kind: "pronghorn", sex: "m" },
      bison: walker(f),
      calf: walker(f, 0.55),
      wolves: [{ ...walker(f), kind: "wolf" }, { ...walker(f, 0.9), kind: "wolf" }],
      bighorn: null,
      grizzly: { ...walker(f), kind: "grizzly" },
      elk: [
        { ...walker(f), kind: "elk", sex: "m" },
        { ...walker(f, 0.9), kind: "elk", sex: "f" },
      ],
    };
  },

  // The pronghorn comes at stage 3, the bison at 4, the wolves at 5 (the geyser starts erupting
  // then), the elk at 6, the grizzly at 7 and the bison calf at 8. The bighorn takes its crag once
  // the crag has grown.
  onGrow(f) {
    const x = f.extra;
    if (f.stage >= 3) enter(f, x.pronghorn);
    if (f.stage >= 4) enter(f, x.bison);
    if (f.stage >= 5) {
      enter(f, x.wolves[0]);
      enterBehind(f, x.wolves[1], x.wolves[0], 14);
      if (x.geyser.next === Infinity) x.geyser.next = f.time + 2;
    }
    if (f.stage >= 6) {
      enter(f, x.elk[0]);
      if (!narrow(f)) enterBehind(f, x.elk[1], x.elk[0], 20);
    }
    if (f.stage >= 7) enter(f, x.grizzly);
    if (f.stage >= 8 && !narrow(f)) enterBehind(f, x.calf, x.bison, 12);
  },

  busy: () => true,

  update(f, dt) {
    const x = f.extra;
    const g = x.geyser;
    if (f.stage >= 5 && f.time >= g.next) {
      g.start = f.time;
      g.length = 5 + f.rand() * 2;
      g.next = f.time + 25 + f.rand() * 15;
      // At night the steam surges in the quiet after each eruption, and has faded before the next.
      if (isNight(f)) x.surge = g.start + g.length + 0.5;
    }
    if (f.time - g.start < g.length && f.rand() < dt * SPRAY_RATE) {
      g.drops.push({
        x: x.cone.x + (f.rand() - 0.5) * 6,
        y: x.cone.top - COLUMN_ROWS,
        vx: (f.rand() - 0.5) * 16,
        vy: -(4 + f.rand() * 10),
      });
    }
    for (const d of g.drops) {
      d.vy += GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    g.drops = g.drops.filter((d) => d.y < x.cone.top);

    const aspens = f.plants.filter((p) => p.kind === "aspen" && p.crown);
    if (aspens.length && x.fluff.length < MAX_FLUFF && f.rand() < dt * FLUFF_RATE) {
      const { cx, top, half, bottom } = aspens[Math.floor(f.rand() * aspens.length)].crown;
      x.fluff.push({
        x: cx + (f.rand() * 2 - 1) * half,
        y: top + f.rand() * (bottom - top),
        vy: 1 + f.rand() * 2,
        phase: f.rand() * 6.28,
      });
    }
    for (const d of x.fluff) {
      d.x += (5 + Math.sin(f.time * 0.8 + d.phase) * 3) * dt;
      d.y += d.vy * dt;
    }
    x.fluff = x.fluff.filter((d) => d.y < f.groundY + 1 && d.x < f.cols + 2);

    wander(f, x.pronghorn, dt, { speed: 16, stride: 12, sit: [1, 2], walk: [3, 6] });
    wander(f, x.bison, dt, { speed: 4, stride: 3, sit: [5, 9], walk: [3, 6] });
    follow(x.calf, x.bison, dt, 12);
    x.calf.phase = x.bison.phase;
    x.calf.state = x.bison.state;
    const [wolf, yearling] = x.wolves;
    wander(f, wolf, dt, { speed: 11, stride: 9, sit: [2, 4], walk: [3, 6] });
    follow(yearling, wolf, dt, 14);
    yearling.phase = wolf.phase;
    yearling.state = wolf.state;
    const [bull, cow] = x.elk;
    wander(f, bull, dt, { speed: 6, stride: 5, sit: [4, 8], walk: [3, 5] });
    follow(cow, bull, dt, 20);
    cow.phase = bull.phase + 1;
    cow.state = bull.state;
    wander(f, x.grizzly, dt, { speed: 5, stride: 4, sit: [4, 8], walk: [3, 6] });
    const rock = f.plants.find((p) => p.kind === "crag");
    if (!x.bighorn && rock && rock.shown - rock.born >= 2.5) {
      const dir = rock.x < f.cols / 2 ? 1 : -1;
      x.bighorn = percher(f, rock.x - dir * 7, cragTop(rock, f.groundY), dir, {
        look: { every: [4, 8], lasts: 2.5 },
        chew: { every: [2, 5], lasts: 1.5 },
        stamp: { every: [9, 16], lasts: 0.4 },
      });
    }
    if (x.bighorn) fidget(f, x.bighorn);
    if (f.stage >= 2 && !isNight(f)) {
      const spawn = () => ({ y: f.groundY - 46 - f.rand() * 20 });
      flyBy(f, x.eagle, dt, { every: [5, 8], speed: 13, spawn });
    }
    x.soarer.active = f.stage >= 6 && !isNight(f);
    if (f.stage >= 6 && !isNight(f)) {
      const spawn = () => ({ y: f.groundY - 30 - f.rand() * 16 });
      flyBy(f, x.swan, dt, { every: [9, 12], speed: 22, spawn });
    }
    if (f.stage >= 3 && !isNight(f)) {
      const spawn = () => ({ y: f.groundY - 34 - f.rand() * 24 });
      flyBy(f, x.bluebird, dt, { every: [6, 8], speed: 42, spawn });
    }
  },

  // The night sky: stars that twinkle, behind the plants. Still under reduced motion.
  drawBack(g, f) {
    if (f.theme !== "dark") return;
    starFieldAt(g, f.extra.stars, g.time);
  },

  draw(g, f) {
    const x = f.extra;
    const night = isNight(f);
    if (x.spring.shown > 1) {
      const surge = f.time - x.surge;
      steamAt(g, x.spring, f.time, night, night && surge >= 0 && surge < SURGE_LENGTH ? surge : -1);
    }
    for (const d of x.fluff) rect(g, g.pal.fluff, Math.round(d.x), Math.round(d.y), 1, 1);
    const age = f.time - x.geyser.start;
    if (age >= 0 && age < x.geyser.length) columnAt(g, x.cone, age, x.geyser.length, g.time);
    for (const d of x.geyser.drops) {
      rect(g, g.pal.spout[1], Math.round(d.x), Math.round(d.y), 1, 1);
    }
    if (x.bighorn) {
      sheepAt(g, x.bighorn, {
        look: doing(x.bighorn, "look", f.time) >= 0,
        chew: doing(x.bighorn, "chew", f.time) >= 0 && Math.floor(f.time * 6) % 2 === 0,
        stamp: doing(x.bighorn, "stamp", f.time) >= 0,
      });
    }
    if (x.pronghorn.active) cervidAt(g, x.pronghorn);
    for (const e of x.elk) if (e.active) cervidAt(g, e);
    if (x.bison.active) bisonAt(g, x.bison);
    if (x.calf.active) bisonAt(g, x.calf);
    for (const w of x.wolves) if (w.active) canidAt(g, w);
    if (x.grizzly.active) bearAt(g, x.grizzly);
    if (x.eagle.bird && !night) {
      const e = x.eagle.bird;
      const y = e.y + Math.sin(f.time * 1.2 + e.phase) * 2;
      const flap = Math.sin(f.time * 0.9 + e.phase) > 0.75;
      raptorAt(g, { kind: "eagleSide", pal: "eagle", x: e.x, y, dir: e.dir }, { bank: flap });
    }
    if (x.soarer.active) {
      const c = soarAt(f.time, x.soarer);
      raptorAt(g, { kind: "eagle", x: c.x, y: c.y, dir: c.dir }, { bank: c.bank });
    }
    if (x.bluebird.bird && !night) flyerAt(g, x.bluebird.bird, f.time, "bluebird");
    if (x.swan.bird && !night) swanAt(g, { ...x.swan.bird, pose: "fly" }, f.time);
  },
};

export default {
  id: "yellowstone",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.35, 0.55], dark: [0.45, 0.62] },
  mature: {
    range: 2.5,
    lodgepole: 3,
    aspen: 3,
    sagebrush: 2,
    wildflower: 1.5,
    boulder: 1.5,
    log: 1.5,
    geyserCone: 3,
    hotSpring: 2.5,
    crag: 2.5,
  },
  paint: {
    range: mountain,
    lodgepole,
    aspen,
    sagebrush,
    wildflower,
    boulder,
    log,
    geyserCone,
    hotSpring,
    crag,
  },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      "....cccc....",
      "...cccccc...",
      ".bbcccccccc.",
      "bbbbcccccchd",
      "bbbbbccccddd",
      "bbbbbbcccddd",
      ".bbbbbbccdd.",
      ".bb.bb.cccd.",
      ".b..b...c.c.",
      ".b..b...d.d.",
      ".d..d...d.d.",
    ],
    colours: { b: "#6b4a33", c: "#b98a5a", d: "#4a3426", h: "#e7dcc0" },
  },
};
