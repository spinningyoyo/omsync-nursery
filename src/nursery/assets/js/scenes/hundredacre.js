// The Hundred Acre Wood from A. A. Milne's books, laid out after the map of the Forest: open heath on
// Ashdown's sandy soil, with heather, bracken and gorse, the Six Pine Trees (Scots pines), and the
// wood's broad beeches and oaks, tall slim trees and dark firs. Pooh's house, with Mr. Sanders over
// the door and honey pots by it; Piglet's beech, with TRESPASSERS W beside it; Owl's house; the Six
// Pine Trees; the Bee Tree, its bees buzzing round their nest; the Heffalump trap; and Eeyore's
// Gloomy Place, a bog among thistles with his house of sticks. Each visit finds them in new places,
// the tall ones kept out of the middle of the page, and somewhere a ring of Pooh's and Piglet's
// pawprints goes round and round, from the day they tracked the Woozle.
// Little birds cross the sky by day; at night there are stars, a moon and fireflies.
//
// Everything is drawn like the other scenes: flat colour and a darker shade, with no ink line. The
// characters are about the size of a macaque. Pooh wears the red shirt he was given after the
// books, and Roo a blue one. Owl and the bees come first, then Pooh, with Piglet trotting at his
// side, Eeyore, Rabbit, Tigger and Roo, who all walk and sit, and last the blue balloon, drifting
// loose across the sky. Once the wood is grown, Pooh and Piglet each take a balloon, Pooh's blue and
// Piglet's red, and float up to the Bee Tree to rob it, until the bees chase them off and the
// balloons give out. The first flight comes a little after the wood is grown; each one after that
// waits until Pooh has walked to the far edge of the page, the one opposite where he came in, and
// then to the other edge, back and forth.
import { flyerAt, owlAt } from "../kit/animals.js";
import { drift, enter, flyBy, isNight, walker, wander } from "../kit/critters.js";
import { starField } from "../kit/effects.js";
import {
  CLEARING,
  blob,
  clamp,
  clearing,
  foliage,
  hash,
  line,
  makePlant,
  part,
  placeLandmarks,
  rect,
  scatter,
  sortPlants,
  sprite,
  stroke,
} from "../kit/pixel.js";
import { broadleafTree, coniferTree } from "../kit/trees.js";

const PINE_ROWS = 72;
const TREE_ROWS = 50;
const SLIM_ROWS = 60;
const FIR_ROWS = 54;
const BEE_TREE_ROWS = 64;
const HIVE_BEES = 6;
const MOTES = 24;
const STARS = 36;
const BIRDS = 3;
const PIGLET_GAP = 11; // art pixels from Pooh's middle to Piglet's, on the side he is going

// The balloon flight, in seconds: the balloons swell, lift them straight up above the Six Pine Trees
// and carry them across to the hive, where they hover while the bees come out, then the bees chase
// them on and the balloons go limp as they land. The way up and across takes as long as it takes at a
// steady FLIGHT_SPEED, so a flight is longer or shorter by where Pooh starts.
const SWELL = 1;
const HOLD = 1;
const CHASE = 5;
const LAND = 3;
const FLIGHT_SPEED = 12; // art pixels a second along the way to the hive
const FLIGHT_EASE = 1.2; // seconds to reach that speed, and to slow from it at the hive
const CLEAR_PINES = 6; // art pixels Pooh's feet clear the tallest pine by
const DESCENT_RUN = 40; // how far across the last slope down to the hive runs
const FLIGHT_GAP = 14; // art pixels from Pooh to Piglet, who trails him in the air
const HOVER_OFF = 18; // art pixels from Pooh to the hive while he hovers by it
const CHASE_RUN = 60; // how far the bees drive them
const FLIGHT_MARGIN = 14; // art pixels kept clear of the page edge
const FLIGHT_EDGE = 12; // how close to the page edge Pooh must walk to set off a flight
const FLIGHT_ARM = 40; // how far from that edge he must have been since the last flight
const FLIGHT_LEAN = 0.85; // the chance each of his walks heads for that edge, once the first flight is done
// The balloon as it swells and goes limp: its rows' widths, and the length of the string below it.
const BALLOON_FRAMES = [
  { rows: [1, 3, 1], string: 2 },
  { rows: [3, 5, 5, 3, 1], string: 4 },
  { rows: [3, 5, 5, 5, 5, 3, 1], string: 7 },
  { rows: [3, 5, 3, 1], string: 3 },
];

const LIGHT = {
  haze: "#fbf6ea",
  ink: "#3b2f26",
  soil: ["#d9c29a", "#c6aa7e", "#a98b62"],
  grass: ["#a8bf7a", "#8aa65e", "#6e8a48"],
  line: "rgba(255, 255, 255, 0.45)",
  wet: "#7a6040",
  water: ["#8fbccc", "#bcdbe4", "#f4fbfc"],
  hills: ["#dfe3bf", "#cdd5a8", "#b9c490"],
  heather: ["#c79ac0", "#a87aa6", "#8a9a62"],
  bracken: ["#c9b46a", "#a8924c", "#7e6a30"],
  gorse: ["#7d9454", "#5f7a3e", "#46602e", "#34491f"],
  gorseFlower: ["#f2d65a", "#e0b83a"],
  thistle: ["#b98ad0", "#8f62a8"],
  leaf: "#7d9a4a",
  pineBark: ["#b8693e", "#8a4a2a"],
  pine: ["#7f9a5c", "#5f7c46", "#465f36", "#33472a"],
  beech: ["#b9cc86", "#98b06a", "#789550", "#5a733c"],
  oak: ["#a9b872", "#8a9c58", "#6c7e44", "#4f5f30"],
  trunk: ["#9a7652", "#76583a"],
  bark: ["#b3ada3", "#8d877e", "#665f57"],
  wood: ["#d8b98a", "#b08e60", "#7e6040"],
  stick: ["#a88a62", "#86684a", "#64492f"],
  bog: ["#8f8a6a", "#77735a"],
  sign: "#f6efda",
  door: "#4a3628",
  rim: "#9a7752",
  hole: ["#4a3424", "#2e2016"],
  hive: ["#e6b44c", "#b8842c", "#5a4126"],
  bee: ["#f2c230", "#2a1f12", "#f4f2ec"],
  balloon: ["#6f9fd6", "#c4dbf3", "#8a7a6a"],
  balloon2: ["#d65a4e", "#f3b0a8", "#8a7a6a"],
  mote: "#f4e27a",
  pooh: ["#e6bf73", "#c49a52", "#c8433a", "#3b2f26"],
  honey: ["#b8742e", "#8e5420", "#f6ead0", "#f2bd3e"],
  piglet: ["#f0bcb6", "#d6958f", "#7d9f63", "#5f7f4a", "#3b2f26"],
  eeyore: ["#a9a6ad", "#86838b", "#4d4a4f", "#cfccd2"],
  tigger: ["#eaa040", "#4a3220", "#f4e2c0"],
  rabbit: ["#bf9c72", "#9a7a54", "#f8f1e4", "#3b2f26"],
  roo: ["#c9a67c", "#a8835a", "#5b8fd0", "#3b2f26"],
  owl: ["#a5774b", "#7d5634", "#ecdcbc", "#3b2f26", "#e0a83a"],
  kessie: { C: "#3a6fc0", H: "#3a6fc0", E: "#14100a", K: "#e8a030", T: "#2f5fa8", b: "#2f5fa8", B: "#3a6fc0", l: "#f6f4ee", t: "#3a6fc0", p: "#9cc0ec", d: "#24478a" },
};

const DARK = {
  haze: "#1c1a20",
  ink: "#0e0b09",
  soil: ["#4a4030", "#3e3628", "#322b20"],
  grass: ["#45583a", "#3a4a30", "#2f3d27"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#140c06",
  water: ["#3f6f80", "#5b8a9a", "#9cc0c8"],
  hills: ["#3a3d34", "#33362e", "#2c2f28"],
  heather: ["#6e5470", "#5a445c", "#4a5638"],
  bracken: ["#6e6236", "#5a4f2a", "#433b20"],
  gorse: ["#3e5030", "#324226", "#28351f", "#1f2a18"],
  gorseFlower: ["#9a8a3a", "#857530"],
  thistle: ["#6e5480", "#58406a"],
  leaf: "#45583a",
  pineBark: ["#6a3e26", "#4e2c1a"],
  pine: ["#40553a", "#33452e", "#283824", "#1e2a1b"],
  beech: ["#56663e", "#465634", "#38462a", "#2b3720"],
  oak: ["#525c38", "#434c2e", "#363e25", "#2a301c"],
  trunk: ["#5a4632", "#463626"],
  bark: ["#5e5a55", "#4a4642", "#36332f"],
  wood: ["#6e5a42", "#544430", "#3a2e20"],
  stick: ["#5e4c36", "#4a3a28", "#33281c"],
  bog: ["#3a3a2e", "#2e2e24"],
  sign: "#9a9384",
  door: "#1a120c",
  rim: "#3e3226",
  hole: ["#1a130d", "#120d08"],
  hive: ["#a8822e", "#7e5e1e", "#2a1e12"],
  bee: ["#c8a028", "#14100a", "#8a8f96"],
  balloon: ["#4f7fbf", "#8fb0d8", "#5a4c40"],
  balloon2: ["#a8453c", "#d98e86", "#5a4c40"],
  mote: "#f4f08a",
  star: ["#ffffff", "#ffe9a8"],
  disc: ["#fff1c8", "#f0dc9a", "#c9b06a"],
  pooh: ["#b58e52", "#8f6c3a", "#9a3a32", "#0e0b09"],
  honey: ["#8e5a24", "#6a3e16", "#c8bca0", "#c8902e"],
  piglet: ["#bf918c", "#9c706c", "#5a7a46", "#435e35", "#0e0b09"],
  eeyore: ["#8a878e", "#6a676f", "#2e2c30", "#a8a5ab"],
  tigger: ["#b87a34", "#22180e", "#c8b494"],
  rabbit: ["#8c704e", "#6a5238", "#c8c0b2", "#0e0b09"],
  roo: ["#8e7350", "#6e5638", "#3f6aa8", "#0e0b09"],
  owl: ["#7a5838", "#5a3e26", "#b8a888", "#0e0b09", "#b88a30"],
  kessie: { C: "#27477a", H: "#27477a", E: "#100e0c", K: "#8f6523", T: "#203e6b", b: "#203e6b", B: "#27477a", l: "#989795", t: "#27477a", p: "#627894", d: "#1a2f59" },
};

// Painters. Land forms (the hills) stand at full size and fade in; trees and plants grow. Like the
// other scenes, nothing here has an ink line: each part is flat colour with a darker shade.

// Rolling heath on the skyline, its folds a little darker, fading in.
function hills(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(3, Math.round(16 * p.scale));
  const half = Math.round(90 * p.scale);
  g.ctx.globalAlpha = s;
  for (let x = p.x - half; x <= p.x + half; x += 1) {
    const swell = 0.55 + 0.45 * Math.sin((x - p.x) * 0.045 + p.seed);
    const top = base - 1 - Math.max(1, Math.round(height * swell));
    rect(g, pal.hills[0], x, top, 1, 1);
    rect(g, hash(x, 2, p.seed) < 0.25 ? pal.hills[2] : pal.hills[1], x, top + 1, 1, base - top - 1);
  }
  g.ctx.globalAlpha = 1;
}

// A crown of separate rounded clumps, each lit on top and darker beneath.
function clumps(g, cx, top, w, h, tones, seed, count) {
  for (let i = 0; i < count; i += 1) {
    const a = hash(i, seed, 1) * Math.PI * 2;
    const rr = Math.sqrt(hash(i, seed, 2));
    const x = cx + Math.round(Math.cos(a) * rr * w * 0.36);
    const y = top + Math.round(h * 0.5 + Math.sin(a) * rr * h * 0.3);
    const cw = Math.max(3, Math.round(w * (0.34 + 0.14 * hash(i, seed, 3))));
    const ch = Math.max(3, Math.round(cw * 0.7));
    const box = { cx: x, top: y - (ch >> 1), w: cw, h: ch };
    blob(g, x, box.top, cw, ch, foliage(box, tones, seed + i));
  }
}

// A broad tree of the wood, a beech or an oak, its full head on spreading boughs.
function tree(g, p, s, base) {
  const { pal } = g;
  const spec = { rows: TREE_ROWS, tones: pal[p.species], trunkTones: pal.trunk, dome: true };
  const shape = p.species === "oak" ? { wide: 1.15, lift: -0.06 } : {};
  broadleafTree(g, p, s, base, { ...spec, ...shape });
}

// A tall, slim tree from the map's edges: a long bare trunk under a narrow crown.
function slim(g, p, s, base) {
  const { pal } = g;
  const spec = { rows: SLIM_ROWS, tones: pal[p.species], trunkTones: pal.trunk };
  broadleafTree(g, p, s, base, { ...spec, wide: 0.45, lift: 0.16 });
}

// How tall a pine stands, grown to s.
const pineHeight = (p, s) => Math.max(4, Math.round(PINE_ROWS * p.scale * s));

// A Scots pine, as in the Six Pine Trees: a tall, bare, leaning red-brown trunk and a flat,
// windswept crown of dark needles in tiers, on branches swept the same way.
function pine(g, p, s, base) {
  const { pal } = g;
  const height = pineHeight(p, s);
  const lean = (p.seed % 2 ? 1 : -1) * (0.04 + (p.seed % 4) * 0.02);
  const sweep = p.seed % 3 === 0 ? -1 : 1;
  const xAt = (r) => p.x + Math.round(r * lean);
  for (let r = 0; r < height; r += 1) {
    const w = r < 3 ? 4 : r < height * 0.5 ? 3 : 2;
    const x = xAt(r) - (w >> 1);
    rect(g, pal.pineBark[0], x, base - 1 - r, w, 1);
    rect(g, pal.pineBark[1], x + w - 1, base - 1 - r, 1, 1);
  }
  if (s < 0.3) return;
  const tiers = [
    [1.0, 0.1, 0.7],
    [0.92, -0.4, 1],
    [0.83, 0.6, 1.1],
    [0.74, -0.2, 0.85],
    [0.66, 0.5, 0.6],
  ];
  for (const [at, side, size] of tiers) {
    const r = Math.round(height * at);
    const cx = xAt(r) + Math.round((side + sweep * 0.5) * 14 * p.scale * s);
    const cy = base - 1 - r;
    const w = Math.max(3, Math.round(24 * p.scale * size * s));
    const h = Math.max(2, Math.round(6 * p.scale * size * s));
    line(g, pal.pineBark[1], xAt(r), cy + 1, cx, cy + 1);
    const box = { cx, top: cy - (h >> 1), w, h };
    blob(g, cx, box.top, w, h, foliage(box, pal.pine, p.seed + r));
  }
}

// A fir from the map: full and low, its dark tiers tapering to a point.
function fir(g, p, s, base) {
  const spec = { rows: FIR_ROWS, tones: g.pal.pine, trunkTones: g.pal.trunk };
  coniferTree(g, p, s, base, { ...spec, tiers: 9, spread: 0.28, clear: 0.08 });
}

// The Bee Tree's branches, each [height along the trunk, side, reach, rise] as shares of the tree.
const BEE_BRANCHES = [[0.42, 1, 14, -0.25], [0.55, -1, 12, -0.5], [0.68, 1, 11, -0.6], [0.8, -1, 9, -0.7], [0.92, 1, 6, -0.8]];

// Where a branch of the Bee Tree starts and ends, grown to s, on a trunk standing on `base`.
function branchEnds(p, s, base, [at, dir, reach, rise]) {
  const height = Math.max(4, Math.round(BEE_TREE_ROWS * p.scale * s));
  const r = Math.round(height * at);
  const x0 = p.x + Math.round(r * 0.06);
  const y0 = base - 1 - r;
  return [x0, y0, x0 + dir * Math.round(reach * s), y0 + Math.round(rise * reach * s)];
}

// The top of the nest, hung from the lowest branch.
function hiveSpot(p, s, base) {
  const [x0, y0, x1, y1] = branchEnds(p, s, base, BEE_BRANCHES[0]);
  return { x: Math.round(x0 + (x1 - x0) * 0.6), y: Math.round(y0 + (y1 - y0) * 0.6) + 1 };
}

// The Bee Tree: a tall, thin tree with a few long branches and sparse leaves. Its nest is the `hive`
// plant, painted after every other.
function beeTree(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(4, Math.round(BEE_TREE_ROWS * p.scale * s));
  const xAt = (r) => p.x + Math.round(r * 0.06);
  for (let r = 0; r < height; r += 1) {
    const w = r < 2 ? 4 : r < height * 0.6 ? 2 : 1;
    rect(g, pal.trunk[0], xAt(r) - (w >> 1), base - 1 - r, w, 1);
    if (w > 1) rect(g, pal.trunk[1], xAt(r) - (w >> 1) + w - 1, base - 1 - r, 1, 1);
  }
  if (s < 0.3) return;
  for (const branch of BEE_BRANCHES) {
    const [x0, y0, x1, y1] = branchEnds(p, s, base, branch);
    line(g, pal.trunk[1], x0, y0, x1, y1);
    for (let k = 0; k < 3; k += 1) {
      const t = 0.45 + k * 0.27;
      const box = { cx: Math.round(x0 + (x1 - x0) * t), top: Math.round(y0 + (y1 - y0) * t) - 2, w: 5, h: 3 };
      blob(g, box.cx, box.top, 5, 3, foliage(box, pal.beech, p.seed + k + Math.round(branch[0] * 10)));
    }
  }
  const crown = { cx: xAt(height), top: base - height - 3, w: 7, h: 5 };
  blob(g, crown.cx, crown.top, 7, 5, foliage(crown, pal.beech, p.seed));
}

// The wild bees' nest hanging from the Bee Tree's lowest branch, with honey dripping from it and bees
// buzzing round it. It stands at the same x and grows in step with the tree, but sorts in front of
// every plant, so no tree nearer the page hides it; `tree` is the Bee Tree's depth.
function hive(g, p, s, base) {
  if (s < 0.9) return;
  const { x: hx, y: hy } = hiveSpot(p, s, base - p.depth + p.tree);
  hiveAt(g, hx, hy);
  hiveBeesAt(g, hx, hy + 4, p.seed);
}

// A wild bees' nest: a rounded hive in honey-gold bands with a dark way in, and a drop of honey
// that lengthens and falls.
function hiveAt(g, x, y) {
  const [gold, band, dark] = g.pal.hive;
  rect(g, band, x, y, 1, 1);
  rect(g, gold, x - 1, y + 1, 3, 1);
  rect(g, gold, x - 2, y + 2, 5, 5);
  rect(g, band, x - 2, y + 3, 5, 1);
  rect(g, band, x - 2, y + 5, 5, 1);
  rect(g, gold, x - 1, y + 7, 3, 1);
  rect(g, dark, x, y + 4, 1, 1);
  rect(g, g.pal.honey[3], x + 1, y + 8, 1, 1 + (Math.floor(g.time * 0.7) % 3));
}

// Bees buzzing round the hive on little loops, each a dark and a yellow pixel. Still under reduced
// motion, when the painter's time stands at 0.
function hiveBeesAt(g, x, y, seed) {
  for (let i = 0; i < HIVE_BEES; i += 1) {
    const a = g.time * (1.6 + i * 0.25) + i * 1.05 + seed;
    const bx = x + Math.round(Math.cos(a) * (5 + (i % 3) * 2));
    const by = y + Math.round(Math.sin(a * 1.3) * (3 + (i % 2) * 2));
    beeAt(g, bx, by, Math.sin(a * 3) > 0);
  }
}

// One bee: a striped dark-yellow-dark body with a pale wing blurring to and fro on its back.
function beeAt(g, x, y, up) {
  const [yellow, dark, wing] = g.pal.bee;
  rect(g, dark, x, y, 1, 1);
  rect(g, yellow, x + 1, y, 1, 1);
  rect(g, dark, x + 2, y, 1, 1);
  rect(g, wing, x + (up ? 1 : 2), y - 1, 1, 1);
}

// A notice board: pale boards in a wooden frame, with a few strokes of lettering in brown.
function board(g, x, y, w) {
  const { pal } = g;
  rect(g, pal.wood[1], x - 1, y - 1, w + 2, 5);
  rect(g, pal.sign, x, y, w, 3);
  for (let i = 1; i < w - 1; i += 1) {
    if (hash(i, y, x) < 0.55) rect(g, pal.wood[2], x + i, y + 1, 1, 1);
  }
}

// A house tree's broad trunk, in the beech's grey bark, with a few vertical strokes of shade and a
// foot that flares out over the ground.
function houseTrunk(g, x, base, height, width) {
  const { pal } = g;
  const left = x - (width >> 1);
  for (let r = 0; r < height; r += 1) {
    const flare = r < 3 ? 3 - r : 0;
    const x0 = left - flare;
    const w = width + 2 * flare;
    rect(g, pal.bark[0], x0, base - 1 - r, w, 1);
    for (let i = 1; i < w - 1; i += 1) {
      if ((i + (r >> 3)) % 4 === 0 && hash(i, r >> 1, x) < 0.6) rect(g, pal.bark[1], x0 + i, base - 1 - r, 1, 1);
    }
    rect(g, pal.bark[2], x0 + w - 1, base - 1 - r, 1, 1);
  }
}

// A big tree to live in: the broad trunk forking into limbs under a cloudy crown. Returns the
// trunk's width and the row its crown starts on.
function houseTree(g, p, s, base, { rows, width, tones }) {
  const { pal } = g;
  const height = Math.max(4, Math.round(rows * p.scale * s));
  const trunkRows = Math.round(height * 0.5);
  const tw = Math.max(1, Math.round(width * p.scale * Math.max(s, 0.4)));
  const top = base - height;
  const crownH = height - trunkRows + Math.round(height * 0.15);
  const crownW = Math.round(crownH * 1.6);
  for (const at of [-0.32, -0.1, 0.14, 0.34]) {
    const tx = p.x + Math.round(at * crownW);
    const ty = top + Math.round(crownH * (0.35 + Math.abs(at) * 0.4));
    line(g, pal.bark[1], p.x + Math.round(at * tw), base - trunkRows, tx, ty);
  }
  houseTrunk(g, p.x, base, trunkRows, tw);
  if (s >= 0.25) clumps(g, p.x, top, crownW, crownH, tones, p.seed, 11);
  return { tw, crown: base - trunkRows };
}

// Pooh's house: a big oak with a door at its foot, the board reading Mr. Sanders over it, a
// bell-rope beside the door and a log to sit on in front.
function poohHouse(g, p, s, base) {
  const { pal } = g;
  const { tw } = houseTree(g, p, s, base, { rows: 58, width: 12, tones: pal.oak });
  if (s < 0.8) return;
  const doorW = Math.max(3, Math.round(tw * 0.4));
  const doorH = Math.round(doorW * 1.8);
  const dx = p.x - (doorW >> 1);
  rect(g, pal.bark[2], dx - 1, base - doorH - 1, doorW + 2, doorH + 1);
  rect(g, pal.door, dx, base - doorH, doorW, doorH);
  rect(g, pal.honey[3], dx + doorW - 2, base - (doorH >> 1), 1, 1);
  board(g, dx - 2, base - doorH - 6, doorW + 4);
  line(g, pal.wood[2], dx - 3, base - doorH - 3, dx - 3, base - doorH + 5);
  rect(g, pal.wood[1], dx - 4, base - doorH + 5, 2, 2);
  const logX = p.x + (tw >> 1) + 2;
  rect(g, pal.trunk[0], logX, base - 3, 10, 3);
  rect(g, pal.trunk[1], logX, base - 1, 10, 1);
  rect(g, pal.wood[0], logX + 9, base - 3, 2, 3);
  rect(g, pal.wood[1], logX + 10, base - 2, 1, 1);
}

// Piglet's house: a very big beech, its roots spreading over the ground, with a small door and a
// window, and the broken board TRESPASSERS W on a post beside it.
function pigletHouse(g, p, s, base) {
  const { pal } = g;
  const { tw } = houseTree(g, p, s, base, { rows: 62, width: 14, tones: pal.beech });
  for (const dir of [-1, 1]) {
    for (let i = 0; i < Math.round(6 * s) + 1; i += 1) {
      rect(g, pal.bark[i % 3 === 2 ? 1 : 0], p.x + dir * ((tw >> 1) + 2 + i), base - 2 + Math.floor(i / 3), 1, 1);
    }
  }
  if (s < 0.8) return;
  rect(g, pal.bark[2], p.x - 2, base - 7, 5, 7);
  rect(g, pal.door, p.x - 1, base - 6, 3, 6);
  const sill = base - Math.round(tw * 1.3);
  rect(g, pal.bark[2], p.x - 2, sill - 1, 5, 5);
  rect(g, pal.haze, p.x - 1, sill, 3, 3);
  rect(g, pal.bark[2], p.x, sill, 1, 3);
  const post = p.x + (tw >> 1) + 6;
  rect(g, pal.wood[2], post, base - 16, 1, 16);
  board(g, post - 3, base - 16, 9);
  rect(g, pal.wood[1], post + 1, base - 10, 5, 3);
  rect(g, pal.sign, post + 2, base - 9, 3, 1);
}

// Owl's house, The Chestnuts: a tall tree with a door high in its trunk, a knocker, and a branch
// outside to land on.
function owlHouse(g, p, s, base) {
  const { pal } = g;
  const { tw, crown } = houseTree(g, p, s, base, { rows: 66, width: 7, tones: pal.oak });
  if (s < 0.8) return;
  const doorY = crown + 3;
  rect(g, pal.bark[2], p.x - 3, doorY - 1, 6, 8);
  rect(g, pal.door, p.x - 2, doorY, 4, 7);
  rect(g, pal.wood[1], p.x + (tw >> 1), doorY + 7, 6, 1);
  rect(g, pal.honey[3], p.x + 1, doorY + 3, 1, 1);
}

// Honey pots on the ground by Pooh's door, two standing and one tipped over with its honey run out.
// They do not grow: each one appears in turn as the scene does.
function honeyPots(g, p, s, base) {
  if (s >= 0.3) potAt(g, p.x, base, 1, 0);
  if (s >= 0.6) potAt(g, p.x, base, 1, 6);
  if (s >= 1) tippedPotAt(g, p.x + 13, base, 1);
}

// Eeyore's Gloomy Place: a boggy patch with pools of standing water, and his house of sticks leaned
// together into a rough tent with a dark way in. The thistles round it are sown on their own.
function gloomyPlace(g, p, s, base) {
  const { pal } = g;
  blob(g, p.x, base - 2, 40, 3, (x, y) => (hash(x, y, p.seed) < 0.3 ? pal.bog[1] : pal.bog[0]));
  rect(g, pal.water[0], p.x - 16, base - 1, 6, 1);
  rect(g, pal.water[1], p.x - 15, base - 1, 3, 1);
  rect(g, pal.water[0], p.x + 13, base - 1, 4, 1);
  if (s < 0.4) return;
  const apex = p.x + 2;
  const top = base - 1 - Math.round(19 * Math.min(1, s * 1.2));
  [-16, -13, -11, -8, -6, -4, 5, 7, 9, 12, 14, 17].forEach((foot, i) => {
    const tip = apex + (foot < 0 ? 2 : -2) + (i % 2);
    line(g, pal.stick[i % 3], apex + foot, base - 1, tip, top - (i % 3));
  });
  for (let r = 0; r < 9; r += 1) {
    const half = Math.min(3, r >> 1);
    rect(g, pal.hole[0], apex - half, base - 10 + r, 2 * half + 1, 1);
  }
}

// Heather in a low cushion, purple flowers over green.
function heather(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round((3 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 3);
  blob(g, p.x, base - h, w, h, (x, y) => {
    const n = hash(x, y, p.seed);
    if (y === base - h && n < 0.5) return pal.heather[0];
    return n < 0.45 ? pal.heather[0] : n < 0.75 ? pal.heather[1] : pal.heather[2];
  });
}

// Gorse: a spiky dark-green mound flecked with yellow.
function gorse(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round((5 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 2.4);
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.gorse, p.seed, (dx, dy) =>
    hash(dx, dy, p.seed + 5) < 0.12 ? pal.gorseFlower[hash(dx, dy, 9) < 0.5 ? 0 : 1] : null,
  );
  blob(g, p.x, base - h, w, h, shade);
}

// Bracken: a clump of arching fronds.
function bracken(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(2, Math.round((4 + (p.seed % 4)) * p.scale * s) + 1);
  const colours = [pal.bracken[1], pal.bracken[0]];
  const fronds = [[-1, -0.3, 0.8], [-0.6, -0.8, 0.6], [-0.2, -1, 0.4], [0.3, -1, 0.5], [0.8, -0.6, 0.7]];
  for (const [dx, dy, droop] of fronds) stroke(g, p.x, base - 1, dx, dy, length, droop, 1, colours);
}

// Thistles in Eeyore's Gloomy Place: a stiff stem with a spiky purple head.
function thistle(g, p, s, base) {
  const { pal } = g;
  const stem = Math.max(2, Math.round((5 + (p.seed % 4)) * p.scale * s));
  rect(g, pal.leaf, p.x, base - stem, 1, stem);
  rect(g, pal.leaf, p.x - 2, base - (stem >> 1), 2, 1);
  rect(g, pal.leaf, p.x + 1, base - (stem >> 1) - 1, 2, 1);
  rect(g, pal.thistle[1], p.x - 1, base - stem - 1, 3, 2);
  if (s >= 0.5) rect(g, pal.thistle[0], p.x - 1, base - stem - 2, 3, 1);
}

// The Woozle's tracks: a ring of pawprints going round and round in the soil, big ones (Pooh's)
// and small ones (Piglet's), the way they followed their own footprints round the spinney.
function tracks(g, p, s, base) {
  if (s < 1) return;
  const prints = 14;
  for (let i = 0; i < prints; i += 1) {
    const a = (i / prints) * Math.PI * 2;
    const x = Math.round(p.x + Math.cos(a) * 11);
    const y = Math.round(base + 2 + Math.sin(a) * 2);
    rect(g, g.pal.hole[0], x, y, i % 2 ? 1 : 2, 1);
  }
}

// The Heffalump trap: a pit dug into the soil, with a rim of spoil round the dark hole.
function pit(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(3, Math.round(9 * s));
  blob(g, p.x, base - 1, w + 2, 1, () => pal.rim);
  blob(g, p.x, base, w, 2, (x, y) => (y === base ? pal.hole[1] : pal.hole[0]));
}

// The Forest: its landmarks placed anew on each visit, apart from one another, the tall ones (the
// houses, the Six Pine Trees, the Bee Tree) out of the middle of the page, where the sign-in card
// sits, and the low ones (the Gloomy Place, the Heffalump trap) anywhere. Broad and slim trees of the
// wood, firs, heath and thistles fill the gaps.
function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const tall = CLEARING + 20;
  const spots = placeLandmarks(ctx, [
    { key: "piglet", half: 22, away: tall },
    { key: "pooh", half: 22, away: tall },
    { key: "owl", half: 14, away: tall },
    { key: "pines", half: 18, away: tall },
    { key: "bee", half: 10, away: tall },
    { key: "gloomy", half: 16, away: 0 },
    { key: "pit", half: 7, away: 0 },
    { key: "tracks", half: 12, away: 0 },
  ]);
  const { pooh: poohX, piglet: pigletX, gloomy: gloomyX, bee: beeX, owl: owlX, pines: pinesX } = spots;
  const away = (x) =>
    Math.abs(x - poohX) > 16 &&
    Math.abs(x - pigletX) > 18 &&
    Math.abs(x - gloomyX) > 24 &&
    Math.abs(x - beeX) > 12 &&
    Math.abs(x - pinesX) > 20 &&
    Math.abs(x - owlX) > 10;
  scatter(plants, ctx, { kind: "hills", count: Math.round(cols / 90), born: [1, 2], scale: [1.1, 1.5], layer: -1 });
  for (let i = 0; i < 6; i += 1) {
    const x = pinesX - 15 + i * 6 + Math.round(rand() * 3);
    const scale = (0.85 + rand() * 0.25) * clearing(x, cols);
    plants.push(makePlant(rand, "pine", x, { born: 1 + (i % 2), depth: 1 + (i % 3), scale }));
  }
  scatter(plants, ctx, {
    kind: "fir", count: Math.round(cols / 40), born: [1, 3], scale: [0.6, 0.9], layer: 0,
    keep: (x) => (x < cols * 0.3 || x > cols * 0.7) && Math.abs(x - owlX) > 14,
  });
  scatter(plants, ctx, {
    kind: "tree", count: Math.round(cols / 50), born: [2, 4], scale: [0.6, 0.85], layer: 0,
    species: ["beech", "oak"], keep: (x) => (x > cols * 0.75 || x < cols * 0.12) && Math.abs(x - owlX) > 14,
  });
  scatter(plants, ctx, {
    kind: "tree", count: Math.round(cols / 45), born: [2, 5], scale: [0.7, 1], depth: [3, 8],
    species: ["beech", "oak", "beech"], keep: away,
  });
  scatter(plants, ctx, {
    kind: "slim", count: Math.round(cols / 40), born: [2, 5], scale: [0.7, 1], depth: [1, 6],
    species: ["beech", "oak"], keep: away,
  });
  scatter(plants, ctx, { kind: "gorse", count: Math.round(cols / 22), born: [2, 5], scale: [0.8, 1.2], depth: [2, 12], keep: away });
  scatter(plants, ctx, { kind: "heather", count: Math.round(cols / 9), born: [0, 3], scale: [0.8, 1.3], depth: [0, 14], keep: away });
  scatter(plants, ctx, { kind: "bracken", count: Math.round(cols / 9), born: [0, 3], scale: [0.8, 1.3], depth: [0, 14], keep: away });
  scatter(plants, ctx, {
    kind: "thistle", count: Math.round(cols / 18), born: [3, 6], scale: [0.9, 1.3], depth: [6, 12],
    keep: (x) => Math.abs(x - gloomyX) > 20 && Math.abs(x - gloomyX) < 30,
  });
  for (const p of plants) {
    if (p.kind === "tree" || p.kind === "slim" || p.kind === "gorse") p.scale *= clearing(p.x, cols);
  }
  const potSide = poohX < cols / 2 ? 1 : -1;
  plants.push(makePlant(rand, "owlHouse", owlX, { layer: 0, born: 3, scale: 0.9 * clearing(owlX, cols) }));
  plants.push(makePlant(rand, "poohHouse", poohX, { born: 2, depth: 6, scale: clearing(poohX, cols) }));
  plants.push(makePlant(rand, "honeyPots", poohX + potSide * 22, { born: 3, depth: 8 }));
  plants.push(makePlant(rand, "pigletHouse", pigletX, { born: 3, depth: 7, scale: clearing(pigletX, cols) }));
  plants.push(makePlant(rand, "gloomyPlace", gloomyX, { born: 4, depth: 5 }));
  plants.push(makePlant(rand, "beeTree", beeX, { born: 4, depth: 4, scale: clearing(beeX, cols) }));
  plants.push(makePlant(rand, "hive", beeX, { born: 4, depth: 15, tree: 4, scale: clearing(beeX, cols) }));
  plants.push(makePlant(rand, "pit", spots.pit, { born: 5, depth: 4 }));
  plants.push(makePlant(rand, "tracks", spots.tracks, { born: 5, depth: 1 }));
  sortPlants(plants);
  return plants;
}

// Ashdown's pale sandy soil, with grass creeping over its top edge as the scene grows.
function soil(pal, x, y, depth, turf) {
  if (y < 3 && hash(x, y, 21) < turf * (0.9 - y * 0.25)) return pal.grass[Math.floor(hash(x, y, 22) * 3)];
  const n = hash(x, y, 11);
  if (n < 0.1 + depth * 0.2) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures. Like the other scenes' animals, each is a few flat rectangles in its colour, one shade
// and a dark eye, with no ink line, facing right and mirrored by dir. Walkers stand with their feet
// on the row above groundY + 8.

// Draws a rectangle at (dx, dy) from a creature's anchor at (x, y), mirrored when it faces left.
function pen(g, x, y, dir) {
  return (colour, dx, dy, w, h) => part(g, colour, x, y, dir, dx, dy, w, h);
}

// A honey pot standing with its base on the row above y, dx along from x: a round-bellied jar with a
// dark rim and foot and a pale label. The small one, in Pooh's lap, shows its honey.
function potAt(g, x, y, dir, dx, small = false) {
  const [pot, rim, label, honey] = g.pal.honey;
  const px = pen(g, x, y, dir);
  if (small) {
    px(pot, dx, -4, 4, 3);
    px(label, dx + 1, -3, 2, 1);
    px(rim, dx + 1, -5, 2, 1);
    px(honey, dx + 1, -6, 1, 1);
    return;
  }
  px(rim, dx + 1, -1, 3, 1);
  px(pot, dx, -4, 5, 3);
  px(label, dx + 1, -3, 3, 1);
  px(pot, dx + 1, -5, 3, 1);
  px(rim, dx + 1, -6, 3, 1);
}

// A honey pot on its side, its mouth toward dir and its honey run out onto the ground.
function tippedPotAt(g, x, y, dir) {
  const [pot, rim, label, honey] = g.pal.honey;
  const px = pen(g, x, y, dir);
  px(rim, 0, -4, 1, 3);
  px(pot, 1, -5, 3, 5);
  px(label, 2, -4, 1, 3);
  px(pot, 4, -4, 1, 3);
  px(rim, 5, -4, 1, 3);
  px(honey, 5, -1, 4, 1);
}

// Pooh: a round head with two small ears and a short snout, his red shirt riding up over a round
// tummy, and short legs. Sitting, he has a honey pot in his lap and now and then a paw to his mouth.
function poohAt(g, b, time) {
  const [fur, shade, shirt, dark] = g.pal.pooh;
  const x = Math.round(b.x);
  const y = g.groundY + 8 - b.lift;
  const px = pen(g, x, y, b.dir);
  if (b.state === "sit") {
    px(fur, 1, -6, 6, 6);
    px(shade, 1, -6, 1, 6);
    px(shirt, 1, -6, 6, 2);
    px(fur, 6, -2, 4, 2);
    px(shade, 9, -1, 1, 1);
    potAt(g, x, y, b.dir, 6, true);
    px(fur, 3, -11, 4, 1);
    px(fur, 2, -10, 6, 3);
    px(fur, 8, -8, 1, 1);
    px(fur, 3, -7, 4, 1);
    px(dark, 8, -9, 1, 1);
    px(dark, 6, -10, 1, 1);
    px(shade, 2, -12, 1, 1);
    px(shade, 6, -12, 1, 1);
    if (Math.floor(time * 0.8 + b.phase) % 4 === 0) px(fur, 7, -7, 2, 1);
    else px(fur, 6, -6, 1, 2);
    return;
  }
  const step = b.state === "walk" ? Math.floor(b.phase) % 2 : 0;
  px(shade, 2 + step, -2, 2, 2);
  px(fur, 5 - step, -2, 2, 2);
  px(fur, 1, -7, 7, 5);
  px(fur, 8, -5, 1, 2);
  px(shade, 1, -6, 1, 4);
  px(shirt, 1, -7, 7, 2);
  px(fur, 5, -6, 1, 3);
  px(fur, 3, -12, 4, 1);
  px(fur, 2, -11, 6, 3);
  px(fur, 8, -9, 1, 1);
  px(fur, 3, -8, 4, 1);
  px(dark, 8, -10, 1, 1);
  px(dark, 6, -11, 1, 1);
  px(shade, 2, -13, 1, 1);
  px(shade, 6, -13, 1, 1);
  if (b.held) {
    px(fur, 0, -10, 1, 4);
    px(g.pal.balloon[2], 0, -12, 1, 2); // the string runs on down into his paw
    heldBalloon(g, x, y - 13, b.dir, b.held, g.pal.balloon);
  }
}

// Piglet: very small and pink, with two upright ears, a pointed snout and a green jumper with a band.
function pigletAt(g, p) {
  const [pink, shade, jumper, band, dark] = g.pal.piglet;
  const x = Math.round(p.x);
  const y = g.groundY + 8 - p.lift;
  const px = pen(g, x, y, p.dir);
  const step = p.state === "walk" ? Math.floor(p.phase) % 2 : 0;
  px(shade, 1 + step, -1, 1, 1);
  px(pink, 3 - step, -1, 1, 1);
  px(jumper, 0, -4, 5, 3);
  px(band, 0, -3, 5, 1);
  px(pink, 1, -7, 4, 3);
  px(shade, 5, -6, 1, 1);
  px(dark, 3, -6, 1, 1);
  px(pink, 1, -8, 1, 1);
  px(shade, 3, -8, 1, 1);
  if (p.held) {
    px(pink, 0, -8, 1, 4);
    heldBalloon(g, x, y - 9, p.dir, p.held, g.pal.balloon2);
  }
}

// A balloon held up on its string in a raised paw at (x, y), leaning back from the way its holder faces.
// It swells and goes limp through BALLOON_FRAMES.
function heldBalloon(g, x, y, dir, frame, colours) {
  const { rows, string } = BALLOON_FRAMES[frame];
  const [body, shine, cord] = colours;
  const knotX = x - dir;
  const knotY = y - string;
  line(g, cord, x, y, knotX, knotY);
  rows.forEach((w, i) => rect(g, body, knotX - (w >> 1), knotY - (rows.length - 1 - i), w, 1));
  if (rows.length > 5) rect(g, shine, knotX - (rows[2] >> 1) + 1, knotY - rows.length + 4, 1, 2);
}

// Eeyore: a grey barrel on thin legs, his head hung low on a sloping neck, his long ears laid back,
// a dark mane, and a thin tail with a dark tuft. He sits back on his haunches, head still down.
// Eeyore sitting back on his haunches, head hung low and his mane along his neck.
const EEYORE_SITTING = [
  "........DDDDDD...",
  ".......GGGGGGDD..",
  ".......GGGGGSGDD.",
  ".....GGGGGGSSGGD.",
  ".....GGGGGGGGGDG.",
  "...GGGGGGGGG.GGG.",
  "...GGGGGGS.S.GGMM",
  "...GGGGGGS.S...MM",
  "...GGGGGGS.S.....",
  "DGGSSSSSSS.S.....",
];
const EEYORE_WALKING = [
  "........DD.....",
  "......DDDDDD...",
  ".GGGGGGGGGGGD..",
  "GGGGGGGGGGSGGD.",
  "GGGGGGGGGSSGGG.",
  "GGGGGGGGGGGGDG.",
  "DGSSSSSSSSSGGG.",
  "D..........GGMM",
  ".............MM",
];

function eeyoreAt(g, e) {
  const [grey, shade, dark, muzzle] = g.pal.eeyore;
  if (e.state !== "sit") {
    const px = pen(g, Math.round(e.x), g.groundY + 8, e.dir);
    const step = e.state === "walk" ? Math.floor(e.phase) % 2 : 0;
    const leg = (dx, up) => px(shade, dx, -4, 1, up ? 3 : 4);
    leg(1, step === 0);
    leg(3, step === 1);
    leg(7, step === 1);
    leg(9, step === 0);
    const colours = { G: grey, S: shade, D: dark, M: muzzle };
    sprite(g, EEYORE_WALKING, colours, Math.round(e.x), g.groundY + 8, e.dir, 1, 11);
    return;
  }
  const colours = { G: grey, S: shade, D: dark, M: muzzle };
  sprite(g, EEYORE_SITTING, colours, Math.round(e.x), g.groundY + 8, e.dir, 3, EEYORE_SITTING.length);
}

// Tigger: orange with dark stripes, a big round head with a pale muzzle, and a long tail with a dark
// tip. He walks on all fours and sits up, flicking his tail now and then.
function tiggerAt(g, t, time) {
  const [orange, stripe, cream] = g.pal.tigger;
  const px = pen(g, Math.round(t.x), g.groundY + 8, t.dir);
  if (t.state === "sit") {
    const flick = Math.floor(time * 2 + t.phase) % 5 === 0;
    px(orange, 0, -6, 5, 6);
    px(cream, 3, -5, 2, 4);
    px(stripe, 0, -5, 1, 1);
    px(stripe, 1, -3, 1, 1);
    px(stripe, 0, -1, 1, 1);
    px(cream, 3, -1, 3, 1);
    px(orange, 1, -11, 5, 5);
    px(stripe, 2, -11, 1, 2);
    px(stripe, 4, -11, 1, 1);
    px(cream, 5, -8, 2, 2);
    px(stripe, 6, -8, 1, 1);
    px(stripe, 4, -9, 1, 1);
    px(orange, 1, -12, 1, 1);
    px(orange, 4, -12, 1, 1);
    px(orange, -1, -2, 1, 2);
    px(orange, -2, flick ? -7 : -6, 1, flick ? 5 : 4);
    px(stripe, -2, flick ? -8 : -7, 1, 1);
    return;
  }
  const step = t.state === "walk" ? Math.floor(t.phase) % 2 : 0;
  px(orange, 1 + step, -2, 1, 2);
  px(orange, 3 - step, -2, 1, 2);
  px(orange, 6 + step, -2, 1, 2);
  px(orange, 8 - step, -2, 1, 2);
  px(orange, 0, -6, 9, 4);
  px(cream, 1, -3, 7, 1);
  px(stripe, 2, -6, 1, 2);
  px(stripe, 4, -6, 1, 2);
  px(stripe, 6, -6, 1, 2);
  px(orange, 8, -9, 4, 4);
  px(stripe, 9, -9, 1, 1);
  px(cream, 11, -7, 2, 2);
  px(stripe, 12, -7, 1, 1);
  px(stripe, 10, -8, 1, 1);
  px(orange, 8, -10, 1, 1);
  px(orange, 10, -10, 1, 1);
  px(orange, -1, -7, 1, 3);
  px(orange, -2, -10, 1, 4);
  px(stripe, -2, -11, 1, 1);
}

// Rabbit: upright on long hind feet, two tall ears, and a white scut. He hops as he goes.
function rabbitAt(g, r) {
  const [fur, shade, white, dark] = g.pal.rabbit;
  const hop = r.state === "walk" ? Math.round(Math.abs(Math.sin(r.phase * 0.6)) * 3) : 0;
  const px = pen(g, Math.round(r.x), g.groundY + 8 - hop, r.dir);
  px(shade, 1, -1, 4, 1);
  px(fur, 0, -5, 4, 4);
  px(white, 3, -4, 1, 2);
  px(white, -1, -4, 1, 2);
  px(fur, 1, -8, 4, 3);
  px(fur, 5, -7, 1, 1);
  px(dark, 3, -7, 1, 1);
  px(fur, 1, -12, 1, 4);
  px(shade, 3, -11, 1, 3);
}

// Roo: a joey about Piglet's size, in a blue shirt, with long ears, long feet and a thin tail. He
// hops as he goes.
function rooAt(g, r) {
  const [fur, shade, shirt, dark] = g.pal.roo;
  const air = r.state === "walk" ? Math.max(0, Math.sin(r.phase * 0.9)) : 0;
  const px = pen(g, Math.round(r.x), g.groundY + 8 - Math.round(air * 3), r.dir);
  px(shade, -3, -2, 3, 1);
  px(shade, 0, -1, 4, 1);
  px(shirt, 0, -4, 4, 3);
  px(fur, 1, -7, 4, 3);
  px(fur, 5, -6, 1, 1);
  px(dark, 3, -6, 1, 1);
  px(fur, 1, -9, 1, 2);
  px(shade, 3, -9, 1, 2);
}

// The blue balloon, loose, drifting across the sky and bobbing, its string swaying below it.
function balloonAt(g, b, time) {
  const [blue, shine, string] = g.pal.balloon;
  const x = Math.round(b.x);
  const y = Math.round(b.y + Math.sin(time * 1.3 + b.phase) * 1.5);
  rect(g, blue, x - 1, y - 7, 3, 1);
  rect(g, blue, x - 2, y - 6, 5, 4);
  rect(g, blue, x - 1, y - 2, 3, 1);
  rect(g, blue, x, y - 1, 1, 1);
  rect(g, shine, x - 1, y - 5, 1, 2);
  const sway = Math.round(Math.sin(time * 2 + b.phase) * 1.5);
  line(g, string, x, y, x + sway, y + 3);
  line(g, string, x + sway, y + 3, x - sway, y + 6);
}

// A swarm of bees: five dots, dark and yellow, that buzz about as the swarm crosses the page.
function beesAt(g, s, time) {
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  for (let i = 0; i < 5; i += 1) {
    const bx = x - s.dir * i * 4 + Math.round(Math.sin(time * 9 + i * 2.1) * 2);
    const by = y + Math.round(Math.cos(time * 11 + i * 1.7) * 2);
    beeAt(g, bx, by, i % 2 === Math.floor(time * 8) % 2);
  }
}

// Day: Shepard's little birds, a few ink ticks drifting across the sky. Still under reduced motion.
function birdsAt(g, f) {
  for (const b of f.extra.birds) {
    const x = Math.round((b.x + g.time * b.speed) % (f.cols + 20)) - 10;
    const y = Math.round(b.y + Math.sin(g.time * 0.8 + b.phase) * 2);
    const up = Math.floor(g.time * 3 + b.phase) % 2 === 0;
    rect(g, g.pal.ink, x - 1, y - (up ? 1 : 0), 1, 1);
    rect(g, g.pal.ink, x, y, 1, 1);
    rect(g, g.pal.ink, x + 1, y - (up ? 1 : 0), 1, 1);
  }
}

// Night: stars that twinkle, and a moon high on the right. Still under reduced motion.
function skyAt(g, f) {
  const { pal } = g;
  for (const star of f.extra.stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(g.time * star.rate + star.phase);
    g.ctx.globalAlpha = 0.35 + 0.65 * twinkle;
    rect(g, pal.star[star.big ? 1 : 0], star.x, star.y, 1, 1);
    if (star.big) {
      rect(g, pal.star[1], star.x - 1, star.y, 3, 1);
      rect(g, pal.star[1], star.x, star.y - 1, 1, 3);
    }
  }
  g.ctx.globalAlpha = 1;
  const cx = Math.round(f.cols * 0.8);
  const cy = Math.round(f.groundY * 0.2);
  blob(g, cx, cy - 8, 16, 16, (x, y) => {
    if (hash(x, y, 3) < 0.08) return pal.disc[2];
    return x < cx ? pal.disc[0] : pal.disc[1];
  });
}

// Fireflies at night, each glowing and fading.
function firefliesAt(g, f) {
  for (const m of f.extra.motes) {
    const x = Math.round(m.x);
    const y = Math.round(m.y);
    const glowing = 0.5 + 0.5 * Math.sin(f.time * 2 + m.phase);
    g.ctx.globalAlpha = 0.2 * glowing;
    rect(g, g.pal.mote, x - 1, y - 1, 3, 3);
    g.ctx.globalAlpha = glowing;
    rect(g, g.pal.mote, x, y, 1, 1);
  }
  g.ctx.globalAlpha = 1;
}

// Piglet keeps close by Pooh's side, a little ahead of him, and walks when he walks.
function besidePooh(piglet, pooh, dt) {
  if (!piglet.active) return;
  piglet.dir = pooh.dir;
  piglet.state = pooh.state;
  piglet.x += (pooh.x + pooh.dir * PIGLET_GAP - piglet.x) * Math.min(1, dt * 3);
  if (pooh.state === "walk") piglet.phase += dt * 9;
}

const ease = (u) => u * u * (3 - 2 * u);

// The way to the hive as points of [x, lift]: straight up to clear the pines, across, then down the
// slope to the hover. `time` is how long it takes at FLIGHT_SPEED, easing in and out of it.
function flightPath(f, from, hover, hoverLift) {
  const pines = f.plants.filter((p) => p.kind === "pine");
  const tallest = Math.max(0, ...pines.map((p) => pineHeight(p, 1) + p.depth + 3));
  const ceiling = f.groundY + 8 - 30; // Pooh, his string and balloon stand about 27 above his feet
  const cruise = Math.min(ceiling, Math.max(tallest + 8 + CLEAR_PINES, hoverLift + 6));
  const across = hover - from;
  const points = [[from, 0], [from, cruise], [hover - Math.sign(across) * Math.min(DESCENT_RUN, Math.abs(across)), cruise], [hover, hoverLift]];
  const length = points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i][0], y - points[i][1]), 0);
  return { points, length, time: length / FLIGHT_SPEED + FLIGHT_EASE };
}

// Where the flight is `t` seconds along its path.
function pathAt({ points, length, time }, t) {
  const a = FLIGHT_EASE;
  const v = FLIGHT_SPEED;
  t = Math.max(0, t);
  const gone = t >= time ? length : t < a ? (v * t * t) / (2 * a) : t < time - a ? (v * a) / 2 + v * (t - a) : length - (v * (time - t) ** 2) / (2 * a);
  let left = gone;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (left <= len || i === points.length - 1) {
      const u = len ? Math.min(1, left / len) : 1;
      return { x: x0 + (x1 - x0) * u, lift: y0 + (y1 - y0) * u };
    }
    left -= len;
  }
}

// Starts a flight: Pooh floats up from the side he is on and across to hover
// level with the hive, and is chased on past it, or back the way he came when there is no room.
function beginFlight(f, fl) {
  const { pooh } = f.extra;
  const tree = f.plants.find((p) => p.kind === "beeTree");
  if (!tree) return;
  const hive = hiveSpot(tree, 1, f.groundY + tree.depth);
  const fits = (side) => hive.x - side * HOVER_OFF > FLIGHT_MARGIN && hive.x - side * HOVER_OFF < f.cols - FLIGHT_MARGIN;
  let side = pooh.x < hive.x ? 1 : -1;
  if (!fits(side)) side = -side;
  const hover = clamp(hive.x - side * HOVER_OFF, FLIGHT_MARGIN, f.cols - FLIGHT_MARGIN);
  const room = (dir) => (dir > 0 ? f.cols - FLIGHT_MARGIN - hover : hover - FLIGHT_MARGIN);
  const away = room(side) >= CHASE_RUN ? side : -side;
  const lift = Math.max(6, f.groundY - hive.y - 7);
  Object.assign(fl, {
    t: 0, hive, side, away, hover, lift,
    path: flightPath(f, pooh.x, hover, lift),
    run: Math.min(CHASE_RUN, room(away)),
    released: false,
    bees: null,
  });
  if (!fl.first) fl.goal = -fl.goal;
  fl.first = false;
  fl.armed = false;
}

// Whether a flight is due. The first comes at a set time. Each one after waits for Pooh to walk to the
// edge of the page he has not been to, having first been away from it, so that landing by an edge
// does not set off another flight at once.
function due(f, fl) {
  const { pooh, piglet } = f.extra;
  if (f.stage < 8 || !pooh.active || !piglet.active) return false;
  if (fl.first) return f.time >= fl.next;
  const gap = fl.goal > 0 ? f.cols - pooh.x : pooh.x;
  if (gap > FLIGHT_ARM) fl.armed = true;
  return fl.armed && gap <= FLIGHT_EDGE;
}

// One flight: Pooh and Piglet stop and a balloon swells in each paw, lifts them and carries them to
// the Bee Tree. Level with the hive they hover while the swarm comes out, then the bees chase them on,
// the balloons go limp, and they float down. The bees go home last. Returns true while Pooh and Piglet
// are in the air, so that they do not wander.
function flight(f, dt) {
  const { flight: fl, pooh, piglet } = f.extra;
  if (fl.t === null) {
    if (due(f, fl)) beginFlight(f, fl);
    if (fl.t === null) return false;
  }
  fl.t += dt;
  const { t } = fl;
  const hold = SWELL + fl.path.time;
  const chase = hold + HOLD;
  const land = chase + CHASE;
  const end = land + LAND;
  const span = (a, b) => clamp((t - a) / (b - a), 0, 1);
  if (t < end) {
    const here = pathAt(fl.path, t - SWELL);
    const x = t < chase ? here.x : fl.hover + fl.away * fl.run * (1 - (1 - span(chase, end)) ** 2);
    let lift = here.lift * (1 - ease(span(land, end)));
    if (lift > 2) lift += Math.sin(t * 2.2) * 0.7;
    const frame = t < 0.4 ? 0 : t < 0.8 ? 1 : t < land ? 2 : span(land, end) < 0.8 ? 3 : 0;
    pooh.x = x;
    pooh.dir = t < chase ? fl.side : fl.away;
    pooh.lift = Math.round(lift);
    pooh.held = frame;
    pooh.state = lift > 1.5 ? "walk" : "stand";
    if (pooh.state === "walk") pooh.phase += dt * 2;
    if (t > SWELL) piglet.x += (x - pooh.dir * FLIGHT_GAP - piglet.x) * Math.min(1, dt * 2);
    piglet.x = clamp(piglet.x, 4, f.cols - 6);
    Object.assign(piglet, { dir: pooh.dir, lift: pooh.lift, held: frame, state: pooh.state, phase: pooh.phase + 1 });
  } else if (!fl.released) {
    fl.released = true;
    for (const w of [pooh, piglet]) Object.assign(w, { lift: 0, held: null, state: "stand", timer: 1.5 });
  }
  moveSwarm(f, fl, dt, hold, land);
  if (fl.released && !fl.bees) {
    fl.t = null;
  }
  return !fl.released;
}

// The bees come out of the hive as the pair hovers by it, chase them, and fly home when the balloons go.
function moveSwarm(f, fl, dt, hold, land) {
  const { pooh } = f.extra;
  if (!fl.bees && fl.t >= hold && fl.t < land) fl.bees = { x: fl.hive.x, y: fl.hive.y + 6, dir: -fl.side };
  const bees = fl.bees;
  if (!bees) return;
  if (fl.t < land) {
    const tx = pooh.x - pooh.dir * 6;
    const ty = f.groundY + 8 - pooh.lift - 11;
    const rate = Math.min(1, dt * 1.6);
    bees.dir = Math.abs(tx - bees.x) > 3 ? Math.sign(tx - bees.x) : pooh.dir;
    bees.x += (tx - bees.x) * rate;
    bees.y += (ty - bees.y) * rate;
    return;
  }
  const dx = fl.hive.x - bees.x;
  const dy = fl.hive.y + 6 - bees.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) {
    fl.bees = null;
    return;
  }
  bees.dir = Math.sign(dx) || bees.dir;
  bees.x += (dx / dist) * 16 * dt;
  bees.y += (dy / dist) * 16 * dt;
}

const extras = {
  init(f) {
    return {
      motes: Array.from({ length: MOTES }, () => ({
        x: f.rand() * f.cols,
        y: f.groundY - 6 - f.rand() * 90,
        phase: f.rand() * 6.28,
      })),
      stars: starField(f, STARS, 70),
      birds: Array.from({ length: BIRDS }, () => ({
        x: f.rand() * f.cols,
        y: 12 + f.rand() * 40,
        speed: 3 + f.rand() * 3,
        phase: f.rand() * 6.28,
      })),
      owl: { next: 3, bird: null },
      kessie: { next: 6, bird: null },
      bees: { next: 5, bird: null },
      balloon: { next: 2, bird: null },
      pooh: { ...walker(f), lift: 0, held: null },
      piglet: { ...walker(f), lift: 0, held: null },
      flight: { next: Infinity, t: null, first: true, goal: 0, armed: false },
      eeyore: walker(f),
      rabbit: walker(f),
      tigger: walker(f),
      roo: walker(f),
    };
  },

  // Rabbit at stage 1, Owl and the bees from stage 2, then Pooh, Piglet at his side, Eeyore, Tigger
  // and Roo, and last the blue balloon and, a little after it, the first balloon flight.
  onGrow(f) {
    const x = f.extra;
    if (f.stage >= 1) enter(f, x.rabbit);
    if (f.stage >= 3) enter(f, x.pooh);
    if (x.pooh.active && !x.flight.goal) x.flight.goal = x.pooh.x < f.cols / 2 ? 1 : -1;
    if (f.stage >= 4 && x.pooh.active && !x.piglet.active) {
      x.piglet.active = true;
      x.piglet.x = x.pooh.x + x.pooh.dir * PIGLET_GAP;
    }
    if (f.stage >= 5) enter(f, x.eeyore);
    if (f.stage >= 7) {
      enter(f, x.tigger);
      enter(f, x.roo);
    }
    if (f.stage >= 8 && x.flight.next === Infinity) x.flight.next = f.time + 12;
  },

  busy: () => true,

  update(f, dt) {
    const x = f.extra;
    if (f.stage >= 2) {
      drift(f, x.owl, dt, { every: [5, 7], speed: 14, spawn: () => ({ y: 24 + f.rand() * 28 }) });
      if (!isNight(f)) {
        flyBy(f, x.kessie, dt, { every: [7, 7], speed: 22, spawn: () => ({ y: f.groundY - 66 - f.rand() * 24 }) });
      }
      flyBy(f, x.bees, dt, { every: [5, 6], speed: 9, spawn: () => ({ y: 40 + f.rand() * 40 }) });
    }
    if (f.stage >= 8) {
      flyBy(f, x.balloon, dt, { every: [6, 8], speed: 5, spawn: () => ({ y: 16 + f.rand() * 30 }) });
    }
    if (!flight(f, dt)) {
      const lean = x.flight.first ? null : { dir: x.flight.goal, odds: FLIGHT_LEAN };
      wander(f, x.pooh, dt, { speed: 5, stride: 5, sit: [4, 8], walk: [3, 6], lean });
      besidePooh(x.piglet, x.pooh, dt);
    }
    wander(f, x.eeyore, dt, { speed: 3, stride: 3, sit: [5, 9], walk: [3, 5] });
    wander(f, x.rabbit, dt, { speed: 12, stride: 10, sit: [2, 4], walk: [1.5, 3] });
    wander(f, x.tigger, dt, { speed: 10 });
    wander(f, x.roo, dt, { speed: 9, stride: 9, sit: [2, 5], walk: [2, 4] });
    if (f.theme === "dark") {
      for (const m of x.motes) {
        m.x += Math.sin(f.time * 0.9 + m.phase) * 5 * dt;
        m.y += Math.cos(f.time * 0.7 + m.phase) * 3 * dt;
        m.x = ((m.x % (f.cols + 4)) + f.cols + 4) % (f.cols + 4);
        m.y = clamp(m.y, f.groundY - 100, f.groundY + 2);
      }
    }
  },

  drawBack(g, f) {
    if (f.theme === "dark") skyAt(g, f);
    else birdsAt(g, f);
  },

  draw(g, f) {
    const x = f.extra;
    if (x.owl.bird) owlAt(g, x.owl.bird, f.time);
    if (x.kessie.bird && !isNight(f)) flyerAt(g, x.kessie.bird, f.time, "kessie");
    if (x.bees.bird) beesAt(g, x.bees.bird, f.time);
    if (x.balloon.bird) balloonAt(g, x.balloon.bird, f.time);
    if (x.flight.bees) beesAt(g, x.flight.bees, f.time);
    if (x.eeyore.active) eeyoreAt(g, x.eeyore);
    if (x.rabbit.active) rabbitAt(g, x.rabbit);
    if (x.tigger.active) tiggerAt(g, x.tigger, f.time);
    if (x.roo.active) rooAt(g, x.roo);
    if (x.pooh.active) poohAt(g, x.pooh, f.time);
    if (x.piglet.active) pigletAt(g, x.piglet);
    if (f.theme === "dark") firefliesAt(g, f);
  },
};

export default {
  id: "hundredacre",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.45, 0.65], dark: [0.45, 0.62] },
  mature: {
    hills: 1.5, pine: 3, fir: 3, tree: 3, slim: 3, beeTree: 3, hive: 3, poohHouse: 3, pigletHouse: 3, owlHouse: 3, tracks: 1,
    gloomyPlace: 2, heather: 1.5, gorse: 2, bracken: 1.5, thistle: 2, pit: 1.5, honeyPots: 2,
  },
  paint: {
    hills, pine, fir, tree, slim, beeTree, hive, poohHouse, pigletHouse, owlHouse, gloomyPlace, heather, gorse, tracks,
    bracken, thistle, pit, honeyPots,
  },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "....hhhh....",
      "..dhhhhhhd..",
      "..ddhddddd..",
      "...phpppp...",
      "..pphppppp..",
      ".pppppppppp.",
      ".pllllllllp.",
      ".pllllllllp.",
      ".pppppppppp.",
      ".pppppppppp.",
      "..dpppppdd..",
      "...dddddd...",
    ],
    colours: { p: "#b8742e", d: "#8e5420", l: "#f6ead0", h: "#f2bd3e" },
  },
};
