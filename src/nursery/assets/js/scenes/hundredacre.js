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
// side, Eeyore, Rabbit, Tigger and Roo, who all walk and rest, and last the blue balloon, drifting
// loose across the sky. Once the wood is grown, Pooh and Piglet each take a balloon, Pooh's blue and
// Piglet's red, and float up to the Bee Tree to rob it, until the bees chase them off and the
// balloons give out. The first flight comes a little after the wood is grown; each one after that
// waits until Pooh has walked to the far edge of the page, the one opposite where he came in, and
// then to the other edge, back and forth.
import { drawLooseBalloon, eeyoreAt, pigletAt, poohAt, rabbitAt, rooAt, swarmAt, tiggerAt } from "../kit/animals.js";
import { broadleafLayout } from "../kit/broadleaf.js";
import { doing, enter, fidget, flyBy, isNight, percher, settle, walker, wander } from "../kit/critters.js";
import { starField } from "../kit/effects.js";
import { OWL_MOVES, owlPerchPose } from "../kit/flyers.js";
import { fireflyAt as glowAt, glowTones } from "../kit/insect.js";
import { drawFlight, drawPerch, SPECIES as OWL_SPECIES, flightPose as owlFlight, owlTones } from "../kit/owl.js";
import {
  blob,
  CLEARING,
  clamp,
  clearing,
  foliage,
  hash,
  lerp,
  line,
  makePlant,
  part,
  placeLandmarks,
  rect,
  scatter,
  smooth,
  sortPlants,
  stroke,
} from "../kit/pixel.js";
import {
  footOf,
  groundOf,
  movePose,
  perchedSmall,
  SMALL_MOVES,
  SPECIES as SMALL_SPECIES,
  transitBird,
} from "../kit/smallbird.js";
import { bookPine, broadleafTree, coniferTree } from "../kit/trees.js";

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
  groundShadow: "rgba(60, 50, 20, 0.22)", // the soft shadow every animal, plant and rock casts on the ground
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
  kessie: {
    C: "#3a6fc0",
    H: "#3a6fc0",
    E: "#14100a",
    K: "#e8a030",
    T: "#2f5fa8",
    b: "#2f5fa8",
    B: "#3a6fc0",
    l: "#f6f4ee",
    t: "#3a6fc0",
    p: "#9cc0ec",
    d: "#24478a",
  },
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
  groundShadow: "rgba(0, 0, 0, 0.32)",
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
  kessie: {
    C: "#27477a",
    H: "#27477a",
    E: "#100e0c",
    K: "#8f6523",
    T: "#203e6b",
    b: "#203e6b",
    B: "#27477a",
    l: "#989795",
    t: "#27477a",
    p: "#627894",
    d: "#1a2f59",
  },
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

// A broad tree of the wood, a beech or an oak, its full head on spreading boughs: the broadleaf
// family's build (kit/broadleaf.js), the oak wider and lower.
function tree(g, p, s, base) {
  const { pal } = g;
  const spec = { rows: TREE_ROWS, tones: pal[p.species], bark: pal.trunk };
  const shape = p.species === "oak" ? { from: 0.28, spread: 0.36, airy: 0.35 } : { from: 0.34, spread: 0.3, airy: 0.3 };
  broadleafTree(g, p, s, base, { ...spec, ...shape });
}

// A tall, slim tree from the map's edges: a long bare trunk under a narrow crown.
function slim(g, p, s, base) {
  const { pal } = g;
  const spec = { rows: SLIM_ROWS, tones: pal[p.species], bark: pal.trunk };
  broadleafTree(g, p, s, base, { ...spec, from: 0.52, spread: 0.14, airy: 0.5 });
}

// How tall a pine stands, grown to s.
const pineHeight = (p, s) => Math.max(4, Math.round(PINE_ROWS * p.scale * s));

// A Scots pine, as in the Six Pine Trees, kept as the book drew it: a tall, bare, leaning red-brown trunk
// and a flat, windswept crown of dark needles in tiers, on branches swept the same way (kit/conifer.js).
function pine(g, p, s, base) {
  bookPine(g, p, s, base, { rows: PINE_ROWS, tones: g.pal.pine, bark: g.pal.pineBark });
}

// A fir from the map: full and low, a dense spire of wide, drooping dark tiers that nearly meet.
function fir(g, p, s, base) {
  coniferTree(g, p, s, base, {
    rows: FIR_ROWS,
    tones: g.pal.pine,
    trunkTones: g.pal.trunk,
    tiers: 11,
    spread: 0.26,
    clear: 0.07,
    droop: 0.55,
    dense: true,
    wide: 1.3,
    taper: 0.45,
    h: 0.085,
  });
}

// The Bee Tree: the broadleaf family's airiest member, a tall, thin, leaning tree with a few long
// boughs and small clumps strung along them, and a round head. Its nest is the `hive` plant, painted
// after every other.
const beeSpec = (pal) => ({
  rows: BEE_TREE_ROWS,
  tones: pal.beech,
  bark: pal.trunk,
  from: 0.4,
  spread: 0.26,
  airy: 0.85,
  lean: 4,
});

// The top of the nest, hung 0.6 along the lowest bough at `time`, so it swings with the bough. The
// hive plant shares the tree's x, scale and seed, so it finds the same bough.
function hiveSpot(p, s, base, time = 0) {
  const b = broadleafLayout(p, s, base, beeSpec({}), time).boughs[0];
  if (!b) return { x: p.x, y: base - Math.round(BEE_TREE_ROWS * p.scale * s * 0.5) };
  return { x: Math.round(b.x0 + (b.x1 - b.x0) * 0.6), y: Math.round(b.y0 + (b.y1 - b.y0) * 0.6) + 1 };
}

function beeTree(g, p, s, base) {
  broadleafTree(g, p, s, base, beeSpec(g.pal));
}

// The wild bees' nest hanging from the Bee Tree's lowest branch, with honey dripping from it and bees
// buzzing round it. It stands at the same x and grows in step with the tree, but sorts in front of
// every plant, so no tree nearer the page hides it; `tree` is the Bee Tree's depth.
function hive(g, p, s, base) {
  if (s < 0.9) return;
  const { x: hx, y: hy } = hiveSpot(p, s, base - p.depth + p.tree, g.time);
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

// How big a house tree is at growth s: its height, the rows of its trunk and the trunk's width.
function houseSize(p, s, rows, width) {
  const height = Math.max(4, Math.round(rows * p.scale * s));
  return {
    height,
    trunkRows: Math.round(height * 0.5),
    tw: Math.max(1, Math.round(width * p.scale * Math.max(s, 0.4))),
  };
}

// A big tree to live in: the broad trunk forking into limbs under a cloudy crown. Returns the
// trunk's width and the row its crown starts on.
function houseTree(g, p, s, base, { rows, width, tones }) {
  const { pal } = g;
  const { height, trunkRows, tw } = houseSize(p, s, rows, width);
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
const OWL_HOUSE = { rows: 66, width: 7 };
const LEDGE_AT = 0.8; // the door and its ledge are drawn from this growth on

// The ledge outside Owl's door, where his feet go: its left end and row, from the same numbers as the painter.
function owlLedge(p, s, base) {
  const { trunkRows, tw } = houseSize(p, s, OWL_HOUSE.rows, OWL_HOUSE.width);
  return { x: p.x + (tw >> 1), y: base - trunkRows + 3 + 7 };
}

function owlHouse(g, p, s, base) {
  const { pal } = g;
  const { crown } = houseTree(g, p, s, base, { ...OWL_HOUSE, tones: pal.oak });
  if (s < LEDGE_AT) return;
  const doorY = crown + 3;
  rect(g, pal.bark[2], p.x - 3, doorY - 1, 6, 8);
  rect(g, pal.door, p.x - 2, doorY, 4, 7);
  const ledge = owlLedge(p, s, base);
  rect(g, pal.wood[1], ledge.x, ledge.y, 6, 1);
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
const TENT_AT = 0.4; // the tent is drawn from this growth on
const tentTop = (s, base) => base - 1 - Math.round(19 * Math.min(1, s * 1.2));

// The highest sticks of Eeyore's tent, where Kessie's feet go: two tips stand two rows above its top, at its
// apex + 2 and apex + 3 (the painter's i % 3 = 2 sticks).
const tentPerch = (p, s, base) => ({ x: p.x + 2 + 2, y: tentTop(s, base) - 2 });

function gloomyPlace(g, p, s, base) {
  const { pal } = g;
  blob(g, p.x, base - 2, 40, 3, (x, y) => (hash(x, y, p.seed) < 0.3 ? pal.bog[1] : pal.bog[0]));
  rect(g, pal.water[0], p.x - 16, base - 1, 6, 1);
  rect(g, pal.water[1], p.x - 15, base - 1, 3, 1);
  rect(g, pal.water[0], p.x + 13, base - 1, 4, 1);
  if (s < TENT_AT) return;
  const apex = p.x + 2;
  const top = tentTop(s, base);
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
  const fronds = [
    [-1, -0.3, 0.8],
    [-0.6, -0.8, 0.6],
    [-0.2, -1, 0.4],
    [0.3, -1, 0.5],
    [0.8, -0.6, 0.7],
  ];
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
  blob(g, p.x, base, w, 2, (_x, y) => (y === base ? pal.hole[1] : pal.hole[0]));
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
    kind: "fir",
    count: Math.round(cols / 40),
    born: [1, 3],
    scale: [0.6, 0.9],
    layer: 0,
    keep: (x) => (x < cols * 0.3 || x > cols * 0.7) && Math.abs(x - owlX) > 14,
  });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 50),
    born: [2, 4],
    scale: [0.6, 0.85],
    layer: 0,
    species: ["beech", "oak"],
    keep: (x) => (x > cols * 0.75 || x < cols * 0.12) && Math.abs(x - owlX) > 14,
  });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 45),
    born: [2, 5],
    scale: [0.7, 1],
    depth: [3, 8],
    species: ["beech", "oak", "beech"],
    keep: away,
  });
  scatter(plants, ctx, {
    kind: "slim",
    count: Math.round(cols / 40),
    born: [2, 5],
    scale: [0.7, 1],
    depth: [1, 6],
    species: ["beech", "oak"],
    keep: away,
  });
  scatter(plants, ctx, {
    kind: "gorse",
    count: Math.round(cols / 22),
    born: [2, 5],
    scale: [0.8, 1.2],
    depth: [2, 12],
    keep: away,
  });
  scatter(plants, ctx, {
    kind: "heather",
    count: Math.round(cols / 9),
    born: [0, 3],
    scale: [0.8, 1.3],
    depth: [0, 14],
    keep: away,
  });
  scatter(plants, ctx, {
    kind: "bracken",
    count: Math.round(cols / 9),
    born: [0, 3],
    scale: [0.8, 1.3],
    depth: [0, 14],
    keep: away,
  });
  scatter(plants, ctx, {
    kind: "thistle",
    count: Math.round(cols / 18),
    born: [3, 6],
    scale: [0.9, 1.3],
    depth: [6, 12],
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
  const bee = makePlant(rand, "beeTree", beeX, { born: 4, depth: 4, scale: clearing(beeX, cols) });
  plants.push(bee);
  // The nest takes the tree's seed, so it hangs from the same bough (see hiveSpot).
  plants.push(makePlant(rand, "hive", beeX, { born: 4, depth: 15, tree: 4, scale: bee.scale, seed: bee.seed }));
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

// Creatures. Pooh, Piglet, Tigger, Rabbit and Roo are drawn from parts by the kit (kit/cast.js); Owl,
// Kessie and Eeyore are the kit's too. What is left here is the honey pots, the loose balloon, and the
// painters' own helpers. Walkers stand with their feet on the row above groundY + 8.

// Draws a rectangle at (dx, dy) from a creature's anchor at (x, y), mirrored when it faces left.
function pen(g, x, y, dir) {
  return (colour, dx, dy, w, h) => part(g, colour, x, y, dir, dx, dy, w, h);
}

// A honey pot standing with its base on the row above y, dx along from x: a round-bellied jar with a
// dark rim and foot and a pale label.
function potAt(g, x, y, dir, dx) {
  const [pot, rim, label] = g.pal.honey;
  const px = pen(g, x, y, dir);
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

// The blue balloon, loose, drifting across the sky and bobbing, its string swaying below it.
function balloonAt(g, b, time) {
  if (g.trace) return g.trace.draw(balloonAt, g, b, time);
  const sway = Math.round(Math.sin(time * 2 + b.phase) * 1.5);
  const x = Math.round(b.x);
  const y = Math.round(b.y + Math.sin(time * 1.3 + b.phase) * 1.5);
  drawLooseBalloon(g, x, y, g.pal.balloon, g.pal.ink, sway);
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
  const tones = glowTones(g.pal.mote);
  for (const m of f.extra.motes) glowAt(g, m.x, m.y, f.time, m.phase, tones);
}

// Piglet keeps close by Pooh's side, a little ahead of him, and walks when he walks.
function besidePooh(piglet, pooh, dt) {
  if (!piglet.active) return;
  piglet.dir = pooh.dir;
  piglet.state = pooh.state;
  piglet.timer = pooh.timer;
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
  const points = [
    [from, 0],
    [from, cruise],
    [hover - Math.sign(across) * Math.min(DESCENT_RUN, Math.abs(across)), cruise],
    [hover, hoverLift],
  ];
  const length = points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i][0], y - points[i][1]), 0);
  return { points, length, time: length / FLIGHT_SPEED + FLIGHT_EASE };
}

// Where the flight is `t` seconds along its path.
function pathAt({ points, length, time }, t) {
  const a = FLIGHT_EASE;
  const v = FLIGHT_SPEED;
  t = Math.max(0, t);
  const gone =
    t >= time
      ? length
      : t < a
        ? (v * t * t) / (2 * a)
        : t < time - a
          ? (v * a) / 2 + v * (t - a)
          : length - (v * (time - t) ** 2) / (2 * a);
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
  const fits = (side) =>
    hive.x - side * HOVER_OFF > FLIGHT_MARGIN && hive.x - side * HOVER_OFF < f.cols - FLIGHT_MARGIN;
  let side = pooh.x < hive.x ? 1 : -1;
  if (!fits(side)) side = -side;
  const hover = clamp(hive.x - side * HOVER_OFF, FLIGHT_MARGIN, f.cols - FLIGHT_MARGIN);
  const room = (dir) => (dir > 0 ? f.cols - FLIGHT_MARGIN - hover : hover - FLIGHT_MARGIN);
  const away = room(side) >= CHASE_RUN ? side : -side;
  const lift = Math.max(6, f.groundY - hive.y - 7);
  Object.assign(fl, {
    t: 0,
    hive,
    side,
    away,
    hover,
    lift,
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

const MATURE = {
  hills: 1.5,
  pine: 3,
  fir: 3,
  tree: 3,
  slim: 3,
  beeTree: 3,
  hive: 3,
  poohHouse: 3,
  pigletHouse: 3,
  owlHouse: 3,
  tracks: 1,
  gloomyPlace: 2,
  heather: 1.5,
  gorse: 2,
  bracken: 1.5,
  thistle: 2,
  pit: 1.5,
  honeyPots: 2,
};

// ---- Owl on his ledge and Kessie on the sticks

// How grown a plant is (the engine's own number) and the row its painter stands it on.
const growthOf = (p) => smooth(clamp((p.shown - p.born) / MATURE[p.kind], 0, 1));
const baseOf = (f, p) => f.groundY + (p.layer < 1 ? 1 : p.depth);

// The perches, worked out from the painters' own geometry each frame, so the feet sit on them at every
// growth stage; null until the door (or the tent) is drawn.
function ledgeSpot(f) {
  const p = f.plants.find((q) => q.kind === "owlHouse");
  const s = p ? growthOf(p) : 0;
  if (s < LEDGE_AT) return null;
  const at = owlLedge(p, s, baseOf(f, p));
  return { x: at.x + 3, toes: at.y - 1 }; // toes on the row above the ledge
}

function tentSpot(f) {
  const p = f.plants.find((q) => q.kind === "gloomyPlace");
  const s = p ? growthOf(p) : 0;
  return s < TENT_AT ? null : tentPerch(p, s, baseOf(f, p));
}

// Owl in the Hundred Acre Wood: he perches on the ledge outside his door at The Chestnuts, swivelling,
// blinking and fluffing; now and then he takes off and glides across the wood. Before his house is grown,
// he glides across the sky.
const OWL_SPEED = 14; // flight speed in art px/s
const OWL_STAY = [16, 26]; // seconds perched on the ledge
const OWL_AWAY = [14, 24]; // seconds away between flights

function owlStep(f, owl, dt) {
  if (f.stage < 2) return;
  owl.active = true;
  const spot = ledgeSpot(f);

  if (!owl.p) {
    owl.p = percher(f, spot ? spot.x : 0, spot ? spot.toes : 0, 1, OWL_MOVES);
    if (spot) {
      owl.mode = "perch";
      owl.glide = null;
      owl.stay = OWL_STAY[0] + f.rand() * (OWL_STAY[1] - OWL_STAY[0]);
    } else {
      owl.mode = "away";
      owl.glide = null;
      owl.next = f.time + 2 + f.rand() * 4;
    }
  }

  // If perched but the ledge is gone (e.g. stage reset or resize), become away
  if (owl.mode === "perch" && !spot) {
    owl.mode = "away";
    owl.glide = null;
    owl.next = f.time + 3;
    return;
  }

  // --- Perched at home on his ledge
  if (owl.mode === "perch") {
    owl.t += dt;
    owl.p.x = spot.x;
    owl.p.y = spot.toes;
    owl.p.look = spot.x < f.cols / 2 ? 1 : -1;
    fidget(f, owl.p);
    const busy = doing(owl.p, "swivel", f.time) >= 0 || doing(owl.p, "fluff", f.time) >= 0;
    if (owl.t >= owl.stay && !busy) {
      // Owl decides to glide! He pushes off in the direction with room
      const dir = spot.x < f.cols / 2 ? 1 : -1;
      owl.dir = dir;
      owl.x = spot.x;
      owl.y = spot.toes - 6;
      owl.cruiseY = 24 + f.rand() * 20;
      owl.t = 0;
      owl.takeoff = true;
      owl.landing = false;
      owl.mode = "glide";
      owl.glide = { dir };
      owl.phase = f.rand() * 6;
    }
    return;
  }

  // --- Away in the wider wood
  if (owl.mode === "away") {
    owl.glide = null;
    if (f.time < owl.next) return;
    if (spot) {
      const wantLand = f.rand() < 0.75;
      const fromLeft = spot.x > f.cols / 2;
      owl.dir = fromLeft ? 1 : -1;
      owl.x = owl.dir > 0 ? -12 : f.cols + 12;
      owl.cruiseY = 24 + f.rand() * 20;
      owl.y = owl.cruiseY;
      owl.t = 0;
      owl.takeoff = false;
      owl.landing = wantLand;
      owl.mode = "glide";
      owl.glide = { dir: owl.dir };
      owl.phase = f.rand() * 6;
    } else {
      const dir = f.rand() < 0.5 ? 1 : -1;
      owl.dir = dir;
      owl.x = dir > 0 ? -12 : f.cols + 12;
      owl.cruiseY = 24 + f.rand() * 28;
      owl.y = owl.cruiseY;
      owl.t = 0;
      owl.takeoff = false;
      owl.landing = false;
      owl.mode = "glide";
      owl.glide = { dir };
      owl.phase = f.rand() * 6;
    }
    return;
  }

  // --- Gliding in flight
  if (owl.mode === "glide") {
    owl.t += dt;
    owl.glide = { dir: owl.dir };

    if (owl.landing && spot) {
      const dist = (spot.x - owl.x) * owl.dir;
      if (dist <= 0) {
        owl.mode = "perch";
        owl.glide = null;
        owl.t = 0;
        owl.stay = OWL_STAY[0] + f.rand() * (OWL_STAY[1] - OWL_STAY[0]);
        return;
      }
      if (dist < 40) {
        const u = 1 - dist / 40;
        const targetY = spot.toes - 6;
        owl.y = lerp(owl.cruiseY, targetY, smooth(u));
      } else {
        owl.y = owl.cruiseY + 3 * Math.sin(owl.t * 0.9) + 2 * Math.sin(owl.t * 0.37 + owl.phase);
      }
      const slow = dist < 20 ? 0.6 + 0.4 * (dist / 20) : 1;
      owl.x += owl.dir * OWL_SPEED * slow * dt;
      return;
    }

    if (owl.takeoff && spot) {
      const u = clamp(owl.t / 2.2, 0, 1);
      const startY = spot.toes - 6;
      owl.y = lerp(startY, owl.cruiseY, smooth(u)) + 2 * Math.sin(owl.t * 0.9);
      if (u >= 1) owl.takeoff = false;
    } else {
      owl.y = owl.cruiseY + 4 * Math.sin(owl.t * 0.9) + 2 * Math.sin(owl.t * 0.37 + owl.phase);
    }
    const accel = owl.takeoff ? smooth(clamp(owl.t / 1.2, 0.3, 1)) : 1;
    owl.x += owl.dir * OWL_SPEED * accel * dt;

    if (owl.x < -14 || owl.x > f.cols + 14) {
      owl.mode = "away";
      owl.glide = null;
      owl.next = f.time + (spot ? OWL_AWAY[0] + f.rand() * (OWL_AWAY[1] - OWL_AWAY[0]) : 6 + f.rand() * 8);
    }
  }
}

function owlHomeAt(g, f, owl) {
  if (g.trace) return g.trace.draw(owlHomeAt, g, f, owl);
  if (!owl.active || owl.mode === "away") return;
  const tones = owlTones(g.pal.owl, isNight(f) ? "dark" : "light");
  const sp = OWL_SPECIES.horned;
  const spot = ledgeSpot(f);

  if (owl.mode === "perch") {
    if (!spot) return;
    drawPerch(g, spot.x, spot.toes, 1, tones, sp, owlPerchPose(owl.p, f.time));
    return;
  }

  let b;
  let vel = 0;
  if (owl.landing && spot) {
    const dist = (spot.x - owl.x) * owl.dir;
    if (dist < 18) {
      const u = clamp(1 - dist / 18, 0, 1);
      b = sp.glide + (0.95 - sp.glide) * smooth(u);
    } else {
      ({ b, vel } = owlFlight(f.time + owl.phase, sp));
    }
  } else if (owl.takeoff) {
    const u = clamp(owl.t / 0.8, 0, 1);
    b = -1 + (sp.glide + 1) * smooth(u);
  } else {
    ({ b, vel } = owlFlight(f.time + owl.phase, sp));
  }

  drawFlight(g, Math.round(owl.x), Math.round(owl.y), owl.dir, tones, sp, { b, vel });
}

// Kessie in the Hundred Acre Wood: she flies across the sky by day, and once Eeyore's tent is built,
// perches on the sticks, sits through her moves (look, blink, bob, preen, stretch, hop-turn) and flies off again.
const KESSIE_SPEED = 22; // flight speed in art px/s
const KESSIE_STAY = [14, 26]; // seconds perched on the tent
const KESSIE_AWAY = [12, 22]; // seconds away between visits

function kessieStep(f, k, dt) {
  if (f.stage < 2 || isNight(f)) {
    k.mode = "away";
    k.next = Math.max(k.next ?? 0, f.time + 3);
    return;
  }
  k.active = true;
  const spot = tentSpot(f);

  if (!k.p) {
    k.p = percher(f, spot ? spot.x : 0, spot ? spot.y : 0, 1, SMALL_MOVES);
    k.mode = "away";
    k.next = f.time + 3 + f.rand() * 4;
  }

  // If perched but the tent is gone (e.g. stage reset), become away
  if (k.mode === "perch" && !spot) {
    k.mode = "away";
    k.next = f.time + 3;
    return;
  }

  // --- Perched on Eeyore's tent
  if (k.mode === "perch") {
    k.t += dt;
    fidget(f, k.p);
    const busy = Object.keys(SMALL_MOVES).some((n) => doing(k.p, n, f.time) >= 0);
    if (k.t >= k.stay && !busy) {
      // Takes off!
      const dir = k.p.look ?? (spot.x < f.cols / 2 ? 1 : -1);
      k.dir = dir;
      k.x = spot.x;
      k.y = spot.y + 4;
      k.cruiseY = f.groundY - 66 - f.rand() * 20;
      k.t = 0;
      k.takeoff = true;
      k.landing = false;
      k.mode = "fly";
      k.phase = f.rand() * 6;
    }
    return;
  }

  // --- Away in the wider wood
  if (k.mode === "away") {
    if (f.time < k.next) return;
    if (spot) {
      const wantLand = f.rand() < 0.75;
      const fromLeft = spot.x > f.cols / 2;
      k.dir = fromLeft ? 1 : -1;
      k.x = k.dir > 0 ? -12 : f.cols + 12;
      k.cruiseY = f.groundY - 66 - f.rand() * 20;
      k.y = k.cruiseY;
      k.t = 0;
      k.takeoff = false;
      k.landing = wantLand;
      k.mode = "fly";
      k.phase = f.rand() * 6;
    } else {
      const dir = f.rand() < 0.5 ? 1 : -1;
      k.dir = dir;
      k.x = dir > 0 ? -12 : f.cols + 12;
      k.cruiseY = f.groundY - 66 - f.rand() * 20;
      k.y = k.cruiseY;
      k.t = 0;
      k.takeoff = false;
      k.landing = false;
      k.mode = "fly";
      k.phase = f.rand() * 6;
    }
    return;
  }

  // --- Flying in flight
  if (k.mode === "fly") {
    k.t += dt;

    if (k.landing && spot) {
      const dist = (spot.x - k.x) * k.dir;
      if (dist <= 0) {
        k.mode = "perch";
        k.t = 0;
        k.stay = KESSIE_STAY[0] + f.rand() * (KESSIE_STAY[1] - KESSIE_STAY[0]);
        k.p.look = k.dir;
        return;
      }
      if (dist < 40) {
        const u = 1 - dist / 40;
        const targetY = spot.y + 4;
        k.y = lerp(k.cruiseY, targetY, smooth(u));
      } else {
        k.y = k.cruiseY + Math.sin(f.time * 3 + k.phase) * 2;
      }
      const slow = dist < 20 ? 0.7 + 0.3 * (dist / 20) : 1;
      k.x += k.dir * KESSIE_SPEED * slow * dt;
      return;
    }

    if (k.takeoff && spot) {
      const u = clamp(k.t / 1.5, 0, 1);
      const startY = spot.y + 4;
      k.y = lerp(startY, k.cruiseY, smooth(u)) + Math.sin(f.time * 3 + k.phase) * 2;
      if (u >= 1) k.takeoff = false;
    } else {
      k.y = k.cruiseY + Math.sin(f.time * 3 + k.phase) * 2;
    }
    k.x += k.dir * KESSIE_SPEED * dt;

    if (k.x < -14 || k.x > f.cols + 14) {
      k.mode = "away";
      k.next = f.time + (spot ? KESSIE_AWAY[0] + f.rand() * (KESSIE_AWAY[1] - KESSIE_AWAY[0]) : 7 + f.rand() * 7);
    }
  }
}

function kessieAt(g, f, k) {
  if (g.trace) return g.trace.draw(kessieAt, g, f, k);
  if (!k.active || k.mode === "away" || isNight(f)) return;
  const spot = tentSpot(f);
  const foot = footOf(g, "kessie");
  const gv = groundOf(SMALL_SPECIES.kessie);
  const time = f.time;

  if (k.mode === "perch" && spot) {
    const anchor = (dir) => Math.round(dir > 0 ? spot.x - foot.u : spot.x + foot.u + 1);
    const m = movePose({
      look: doing(k.p, "look", time),
      blink: doing(k.p, "blink", time),
      bob: doing(k.p, "bob", time),
      preen: doing(k.p, "preen", time),
      stretch: doing(k.p, "stretch", time),
      hop: doing(k.p, "hop", time),
    });
    const dir = m.turned ? -k.dir : k.dir;
    perchedSmall(g, "kessie", anchor(dir), spot.y + foot.v - gv, time, m.pose, { dir });
    return;
  }

  let lift = 0;
  if (k.landing && spot) {
    const dist = (spot.x - k.x) * k.dir;
    if (dist < 20) lift = smooth(clamp(1 - dist / 20, 0, 1));
  } else if (k.takeoff) {
    lift = 1 - smooth(clamp(k.t / 0.8, 0, 1));
  }

  transitBird(g, "kessie", Math.round(k.x), Math.round(k.y), k.dir, time, lift, k.phase);
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
      owl: {
        active: false,
        mode: "away",
        p: null,
        t: 0,
        next: 0,
        x: 0,
        y: 0,
        dir: 1,
        cruiseY: 32,
        landing: false,
        takeoff: false,
        glide: null,
        phase: 0,
      },
      kessie: {
        active: false,
        mode: "away",
        p: null,
        t: 0,
        next: 0,
        x: 0,
        y: 0,
        dir: -1,
        cruiseY: 32,
        landing: false,
        takeoff: false,
        stay: 14,
        phase: 0,
      },
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

  // Rabbit at stage 1, Owl, Kessie and the bees from stage 2, then Pooh, Piglet at his side, Eeyore, Tigger
  // and Roo, and last the blue balloon and, a little after it, the first balloon flight.
  onGrow(f) {
    const x = f.extra;
    if (f.stage >= 1) enter(f, x.rabbit);
    if (f.stage >= 2) {
      x.owl.active = true;
      x.kessie.active = true;
    }
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
    owlStep(f, x.owl, dt);
    kessieStep(f, x.kessie, dt);
    if (f.stage >= 2) {
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
    settle(f, x.eeyore);
    wander(f, x.rabbit, dt, { speed: 12, stride: 10, sit: [3, 6], walk: [1.5, 3] });
    wander(f, x.tigger, dt, { speed: 10, sit: [3, 7] });
    wander(f, x.roo, dt, { speed: 9, stride: 9, sit: [3, 6], walk: [2, 4] });
    for (const w of [x.pooh, x.piglet, x.rabbit, x.tigger, x.roo]) settle(f, w);
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
    if (x.owl.active) owlHomeAt(g, f, x.owl);
    if (x.kessie.active && !isNight(f)) kessieAt(g, f, x.kessie);
    if (x.bees.bird) swarmAt(g, x.bees.bird, f.time);
    if (x.balloon.bird) balloonAt(g, x.balloon.bird, f.time);
    if (x.flight.bees) swarmAt(g, x.flight.bees, f.time);
    if (x.eeyore.active) eeyoreAt(g, x.eeyore, f.time);
    if (x.rabbit.active) rabbitAt(g, x.rabbit, f.time);
    if (x.tigger.active) tiggerAt(g, x.tigger, f.time);
    if (x.roo.active) rooAt(g, x.roo, f.time);
    if (x.pooh.active) poohAt(g, x.pooh, f.time);
    if (x.piglet.active) pigletAt(g, x.piglet, f.time);
    if (f.theme === "dark") firefliesAt(g, f);
  },
};

export default {
  id: "hundredacre",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.45, 0.65], dark: [0.45, 0.62] },
  mature: MATURE,
  paint: {
    hills,
    pine,
    fir,
    tree,
    slim,
    beeTree,
    hive,
    poohHouse,
    pigletHouse,
    owlHouse,
    gloomyPlace,
    heather,
    gorse,
    tracks,
    bracken,
    thistle,
    pit,
    honeyPots,
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
