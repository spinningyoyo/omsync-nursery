// The Joshua Tree scene: Joshua trees, yucca, cholla and ocotillo on open sand, with a granite pile
// to each side where a desert bighorn stands watch. Rain brings a light superbloom. A roadrunner, a
// jackrabbit, a desert tortoise, a coyote and pup, now and then a snake, and a tumbleweed share the
// ground; a red-tailed hawk circles and once in a while stoops at the jackrabbit, and turkey vultures
// teeter past. In dark mode it is a late-summer desert night under the Milky Way: the day birds are
// gone, a great horned owl watches from a Joshua tree, the coyote sits up to howl, and the Perseids
// fall in two patterns, with quiet spells between.
// At night a pale desert bobcat comes out to hunt, and rests between prowls.
import { canidAt, felidAt, felidPoses, hareAt, owlAt, raptorAt, sheepAt, tortoiseAt } from "../kit/animals.js";
import {
  doing,
  enter,
  enterBehind,
  fidget,
  flock,
  flyBy,
  follow,
  isNight,
  narrow,
  percher,
  rest,
  walker,
  wander,
} from "../kit/critters.js";
import { bandPath, dithered, milkyWayCanvas, onBand, starAt, starField, starFieldAt } from "../kit/effects.js";
import {
  blob,
  CLEARING,
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
  wind,
} from "../kit/pixel.js";
import { crossFlower } from "../kit/plants.js";
import { trunk } from "../kit/trees.js";

const TREE_ROWS = 36;
const GRANITE_ROWS = 34; // a granite pile's height at scale 1
const STARS = 70;
// The Milky Way as it stands on an August or September evening: the core (Sagittarius) glows low
// over the horizon on the right, and the band climbs left through the Summer Triangle and leaves the
// sky toward Perseus (effects.js draws it).
// Bright stars named by where they sit: how far along the band (0 at the core) and how far across
// it, in band widths. Antares glows red beside the core; Altair, Vega and Deneb make the Summer
// Triangle.
const NAMED_STARS = [
  { along: 0.1, across: -1.25, colour: "#ff8a52" }, // Antares
  { along: 0.42, across: 1.25, colour: "#ffffff" }, // Altair
  { along: 0.66, across: -1.5, colour: "#dfe8ff" }, // Vega
  { along: 0.74, across: 0.15, colour: "#fff8ec" }, // Deneb
];
// The night sky's turns, in order, and how long each lasts in seconds. In a burst the Perseids fly
// out from a radiant high on the band, in Perseus, the way a wide-angle exposure catches them: short
// near the radiant and longer farther out, their trails lingering until a starburst fills the sky.
// In a rain they come from a radiant just past the top-left corner and cross the whole sky, now and
// then as a fireball.
const SHOWERS = [
  { mode: "burst", seconds: 30 },
  { mode: "quiet", seconds: 20 },
  { mode: "rain", seconds: 35 },
  { mode: "quiet", seconds: 20 },
];
// Flowering plants at this share of the old superbloom, so the desert stays open and calm.
const BLOOMS = 0.7;
// Small plants are sown at this share of their old number, so more open desert shows and the animals
// stand out. The Joshua trees are not counted among them.
const SMALL_PLANTS = 0.6;

const LIGHT = {
  bobcatDesert: { T: "#c8a67c", S: "#a0805c", P: "#f4ecdc", D: "#3a2e24", e: "#3a2e24" },
  joshua: ["#d4e28a", "#a9c262", "#7d9c4c"],
  trunk: ["#b19575", "#8a7058"],
  yucca: ["#c4da86", "#98b85c", "#6e9040"],
  cholla: ["#fbf1b8", "#e0cf78", "#aeb35c", "#84963f"],
  ocotillo: ["#8fa960", "#6d8a48"],
  tip: "#ee4a35",
  pad: ["#a5d283", "#80b668", "#5f9a54"],
  fruit: ["#e8508a", "#f27aa8"],
  rock: ["#ecdcc4", "#d6bd9f", "#b39874", "#8f765c"],
  sage: ["#d6e5cb", "#b0cca6", "#88ab88"],
  bloom: ["#ffd23f", "#b78cf0", "#ffffff"],
  stem: "#7fae62",
  soil: ["#f3e0b9", "#e8cd9b", "#d6b480"],
  pebble: "#bda07c",
  line: "rgba(255, 255, 255, 0.4)",
  wet: "#7a5a38",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  hawk: ["#5a3a26", "#f2e6cf", "#c0602e", "#5a3a26", "#000000", "#9a6a44"],
  vulture: ["#2e2622", "#000000", "#000000", "#c84a3a", "#a8a49c"],
  runner: ["#6b5446", "#d8c49a", "#4a8cc0", "#e0603a", "#2a2420", "#efe4cc", "#7e8a96"],
  rabbit: ["#c4ab88", "#98825f", "#f4e8d4"],
  snake: ["#e8c77a", "#6b4a2e"],
  coyote: ["#c4a072", "#8a7a64", "#eadcc0", "#2a2420", "#2a2420"],
  sheep: ["#b8a07e", "#efe4d0", "#c9ab72", "#6e5a46", "#94784c"],
  tortoise: ["#8a7652", "#5e4e36", "#a89a7e", "#3e3424"],
  owl: ["#8a6a4a", "#5a4330", "#d8c2a0", "#f2c230", "#2b2620"],
  tumble: ["#b99c6a", "#8a7248"],
  star: ["#ffffff", "#ffe9a8"],
  meteor: ["#a8ffcc", "#ffffff", "#ffe39a"],
  haze: "#ffffff",
};

const DARK = {
  bobcatDesert: { T: "#897362", S: "#705b4e", P: "#a49e9e", D: "#31282b", e: "#31282b" },
  joshua: ["#a8c46a", "#84a04e", "#628038"],
  trunk: ["#8c7358", "#6c5742"],
  yucca: ["#9dbb68", "#7a9a4a", "#587a36"],
  cholla: ["#fff0b0", "#d8c870", "#9aa050", "#748a3a"],
  ocotillo: ["#7e9a56", "#5e7a3c"],
  tip: "#ff5a40",
  pad: ["#86b86a", "#68a057", "#4c8644"],
  fruit: ["#f0609a", "#f78ab4"],
  rock: ["#a89a8c", "#8a7e72", "#6a6058", "#4c453f"],
  sage: ["#9cb494", "#7c9a7c", "#5e7e66"],
  bloom: ["#ffd23f", "#b78cf0", "#f5f5f5"],
  stem: "#5e9248",
  soil: ["#5a4a3c", "#4c3e32", "#3e3228"],
  pebble: "#7a6a58",
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#140c06",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  hawk: ["#8a6a52", "#f0e4d0", "#d4694a", "#8a6a52", "#000000", "#b08460"],
  vulture: ["#4a3c34", "#000000", "#000000", "#e0553a", "#c8ccd4"],
  runner: ["#8a7262", "#e0d0ae", "#5aa0d8", "#e8704a", "#3a3430", "#efe4cc", "#9aa6b2"],
  rabbit: ["#b49c7a", "#8c7656", "#f4e8d4"],
  snake: ["#f0d48a", "#8a6446"],
  coyote: ["#cbab7c", "#948470", "#e6d8bc", "#1e1a16", "#1e1a16"],
  sheep: ["#a08a6c", "#d8ccb8", "#b89c68", "#5a4a3a", "#86704a"],
  tortoise: ["#7a6a4c", "#54462f", "#988c72", "#2e271c"],
  owl: ["#8a6a4a", "#5a4330", "#c8b290", "#f2c230", "#1a1612"],
  tumble: ["#a08a60", "#7a6840"],
  star: ["#ffffff", "#ffe9a8"],
  meteor: ["#a8ffcc", "#ffffff", "#ffe39a"],
  haze: "#0b0b0b",
};

// A burst of stiff leaves, like a starburst, round a dark heart.
function spikyTuft(g, cx, cy, r, tones) {
  const length = r + 2;
  for (const [dx, dy] of [
    [-1, -0.3],
    [-0.7, -0.8],
    [-0.2, -1],
    [0.2, -1],
    [0.7, -0.8],
    [1, -0.3],
    [-1, 0.3],
    [1, 0.3],
  ]) {
    stroke(g, cx, cy, dx, dy, length, 0, 1, [tones[1], tones[0]]);
  }
  rect(g, tones[2], cx - 1, cy - 1, 3, 2);
}

// A Joshua tree: a shaggy trunk that forks into a few thick arms, each ending in a spiky tuft.
function joshua(g, p, s, base) {
  const { pal } = g;
  const total = Math.max(5, Math.round(TREE_ROWS * p.scale * s));
  const sway = wind(g.time, p.x);
  const trunkRows = Math.max(3, Math.round(total * 0.45));
  const width = total >= 26 ? 3 : total >= 12 ? 2 : 1;
  trunk(g, p.x, base, trunkRows, width, pal.trunk);
  for (let y = base - trunkRows; y < base; y += 1) {
    if (hash(0, y, p.seed) < 0.3) rect(g, pal.trunk[1], p.x - (width >> 1), y, 1, 1);
  }
  const arms = 2 + (p.seed % 2);
  const length = total - trunkRows;
  const r = total >= 26 ? 3 : total >= 12 ? 2 : 1;
  for (let i = 0; i < arms; i += 1) {
    const lean = [-0.55, 0.55, 0.1][i];
    const reach = Math.max(2, Math.round(length * (0.75 + 0.25 * hash(i, p.seed, 6))));
    let x = p.x;
    let y = base - trunkRows;
    for (let k = 0; k < reach; k += 1) {
      x = p.x + Math.round(lean * k) + (k > reach * 0.6 ? sway : 0);
      y = base - trunkRows - k;
      rect(g, pal.trunk[k % 3 === 0 ? 1 : 0], x, y, Math.max(1, width - 1), 1);
    }
    spikyTuft(g, x, y, r, pal.joshua);
    if (i === arms - 1 && s >= 1) p.top = { x, y: y - r - 1 };
  }
}

function yucca(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(2, Math.round((5 + (p.seed % 4)) * p.scale * s));
  rect(g, pal.trunk[0], p.x, base - 2, 1, 2);
  for (const [dx, dy] of [
    [-1, -0.2],
    [-0.7, -0.7],
    [-0.3, -1],
    [0, -1],
    [0.3, -1],
    [0.7, -0.7],
    [1, -0.2],
  ]) {
    stroke(g, p.x, base - 2, dx, dy, length, 0.15, 1, [pal.yucca[1], pal.yucca[0]]);
  }
  if (p.seed % 3 === 0 && s >= 0.9) {
    const stalk = Math.round(length * 1.6);
    rect(g, pal.yucca[2], p.x, base - 2 - stalk, 1, stalk);
    blob(g, p.x, base - 2 - stalk - 4, 4, 5, (x, y) => (hash(x, y, p.seed) > 0.6 ? pal.bloom[2] : "#f4ecc0"));
  }
}

// Teddy-bear cholla: fuzzy golden segments, each one glowing where the spines catch the light.
// The teddy-bear cholla: a dark stem with arms of fat, glowing joints, each one pale where the spines
// catch the light and darker at its base. Its palette is cholla: [glow, light, mid, stem].
function cholla(g, p, s, base) {
  const [glow, light, mid, stem] = g.pal.cholla;
  const joints = Math.max(1, Math.round((3 + (p.seed % 2)) * s));
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

function ocotillo(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(3, Math.round((16 + (p.seed % 8)) * p.scale * s));
  const sway = wind(g.time, p.x);
  for (let i = 0; i < 7; i += 1) {
    const dx = (i - 3) * 0.16;
    const jitter = 0.8 + 0.2 * hash(i, p.seed, 2);
    const len = Math.round(length * jitter);
    stroke(g, p.x + (i - 3) * 0.5, base - 1, dx, -1, len, 0, 1, pal.ocotillo);
    const tipX = Math.round(p.x + (i - 3) * 0.5 + dx * len + sway);
    if (s >= 0.8 && (i + p.seed) % 3 === 0) rect(g, pal.tip, tipX, base - 1 - len, 1, 2);
    for (let y = 3; y < len - 2; y += 4)
      rect(g, pal.joshua[2], Math.round(p.x + (i - 3) * 0.5 + dx * y) + 1, base - 1 - y, 1, 1);
  }
}

// A prickly pear: flat oval pads, each joined to the one below at its edge, lit on one side, with
// spines picked out and fruit along the top. Its palettes are pad: [light, mid, dark] and fruit.
function pad(g, p, s, base) {
  const { pal } = g;
  const count = Math.max(1, Math.round((3 + (p.seed % 2)) * s));
  const pads = [
    [0, 0],
    [3, -5],
    [-3, -6],
    [1, -10],
    [5, -10],
  ].slice(0, count);
  for (const [i, [dx, dy]] of pads.entries()) {
    const cx = p.x + dx;
    const top = base - 7 + dy;
    blob(g, cx, top, 6, 7, foliage({ cx, top, w: 6, h: 7 }, pal.pad, p.seed + i));
    rect(g, pal.pad[0], cx - 1, top + 2, 1, 1);
    rect(g, pal.pad[0], cx + 1, top + 4, 1, 1);
    if (i > 0 && s >= 0.8) rect(g, pal.fruit[i % 2], cx, top - 1, 1, 1);
  }
}

// Granite boulders: rounded, warm and pitted, stacked in a pile.
function boulders(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(5, Math.round((12 + (p.seed % 5)) * p.scale * s));
  const h = Math.max(3, Math.round(w * 0.62));
  const shade = foliage({ cx: p.x, top: base - h * 2, w, h: h * 2 }, pal.rock, p.seed);
  blob(g, p.x, base - h, w, h, shade);
  if (w >= 9) {
    blob(g, p.x - Math.round(w * 0.2), base - Math.round(h * 1.6), Math.round(w * 0.6), Math.round(h * 0.9), shade);
    blob(g, p.x + Math.round(w * 0.32), base - Math.round(h * 0.85), Math.round(w * 0.5), Math.round(h * 0.7), shade);
  }
}

// A granite pile, the park's signature: great rounded monzogranite boulders heaped high, with one
// flat-topped block crowning it where the bighorn stands.
function granite(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(4, Math.round(GRANITE_ROWS * p.scale * s));
  const w = Math.round(h * 1.5);
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.rock, p.seed);
  blob(g, p.x, base - Math.round(h * 0.42), w, Math.round(h * 0.42), shade);
  blob(g, p.x - Math.round(w * 0.24), base - Math.round(h * 0.7), Math.round(w * 0.5), Math.round(h * 0.38), shade);
  blob(g, p.x + Math.round(w * 0.22), base - Math.round(h * 0.66), Math.round(w * 0.46), Math.round(h * 0.36), shade);
  blob(g, p.x, base - h, Math.round(w * 0.44), Math.round(h * 0.42), shade);
  const capW = Math.max(3, Math.round(w * 0.3));
  rect(g, pal.rock[0], p.x - (capW >> 1), base - h, capW, 1);
}

// The flat top of a granite pile, where the bighorn's feet go.
function graniteTop(p, groundY) {
  return groundY + 1 - Math.max(4, Math.round(GRANITE_ROWS * p.scale));
}

// Distant rock formations, like Hidden Valley's: tall piles of rounded stone.
function rockpile(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(4, Math.round(30 * p.scale * s));
  const w = Math.round(h * 1.3);
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.rock, p.seed);
  blob(g, p.x, base - Math.round(h * 0.45), w, Math.round(h * 0.45), shade);
  blob(g, p.x - Math.round(w * 0.18), base - Math.round(h * 0.78), Math.round(w * 0.55), Math.round(h * 0.4), shade);
  blob(g, p.x + Math.round(w * 0.2), base - Math.round(h * 0.7), Math.round(w * 0.5), Math.round(h * 0.38), shade);
  blob(g, p.x, base - h, Math.round(w * 0.4), Math.round(h * 0.34), shade);
}

function sage(g, p, s, base) {
  const w = Math.max(3, Math.round(9 * p.scale * s));
  const h = Math.max(2, Math.round(w * 0.45));
  blob(g, p.x, base - h, w, h, foliage({ cx: p.x, top: base - h, w, h }, g.pal.sage, p.seed));
}

// Which bloom colour a wildflower takes, by its seed: yellow and purple, with an odd white one.
const BLOOM_MIX = [0, 1, 0, 1, 2];

// The superbloom: a carpet of small wildflowers.
function wildflower(g, p, s, base) {
  const { pal } = g;
  const stem = Math.max(1, Math.round((2 + (p.seed % 3)) * s));
  const colour = pal.bloom[BLOOM_MIX[p.seed % BLOOM_MIX.length]];
  crossFlower(g, p, base, { stem, stemTone: pal.stem, colour });
}

// Open desert: Joshua trees and scattered small plants, a granite pile placed to each side of the
// page, and a light bloom of wildflowers.
function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const middle = (x) => Math.abs(x - cols / 2) > Math.min(70, cols / 2 - 24);
  const piles = placeLandmarks(ctx, [
    { key: "big", half: 22, away: CLEARING + 18, inside: true },
    { key: "small", half: 16, away: CLEARING + 10 },
  ]);
  scatter(plants, ctx, {
    kind: "rockpile",
    count: Math.round(cols / 55),
    born: [1, 3],
    scale: [0.8, 1.25],
    layer: -1,
    keep: middle,
  });
  scatter(plants, ctx, { kind: "tree", count: Math.round(cols / 20), born: [1, 4], scale: [0.55, 0.85], layer: 0 });
  scatter(plants, ctx, {
    kind: "yucca",
    count: Math.round((cols / 16) * SMALL_PLANTS),
    born: [0, 3],
    scale: [0.8, 1.2],
    layer: 0,
  });
  scatter(plants, ctx, {
    kind: "sage",
    count: Math.round((cols / 14) * SMALL_PLANTS),
    born: [0, 3],
    scale: [0.8, 1.2],
    layer: 0,
  });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 30),
    born: [1, 4],
    scale: [0.85, 1.3],
    depth: [3, 12],
  });
  scatter(plants, ctx, {
    kind: "boulders",
    count: Math.round(cols / 36),
    born: [0, 3],
    scale: [0.8, 1.4],
    depth: [2, 13],
  });
  scatter(plants, ctx, {
    kind: "cholla",
    count: Math.round((cols / 34) * SMALL_PLANTS),
    born: [1, 4],
    scale: [1, 1],
    depth: [3, 13],
  });
  scatter(plants, ctx, {
    kind: "ocotillo",
    count: Math.round((cols / 36) * SMALL_PLANTS),
    born: [1, 4],
    scale: [0.8, 1.2],
    depth: [3, 13],
  });
  scatter(plants, ctx, {
    kind: "pad",
    count: Math.round((cols / 36) * SMALL_PLANTS),
    born: [1, 4],
    scale: [1, 1],
    depth: [3, 13],
  });
  scatter(plants, ctx, {
    kind: "yucca",
    count: Math.round((cols / 22) * SMALL_PLANTS),
    born: [0, 3],
    scale: [0.9, 1.3],
    depth: [1, 14],
  });
  scatter(plants, ctx, {
    kind: "sage",
    count: Math.round((cols / 18) * SMALL_PLANTS),
    born: [0, 3],
    scale: [0.9, 1.3],
    depth: [1, 14],
  });
  scatter(plants, ctx, {
    kind: "wildflower",
    count: Math.round((cols / 10) * SMALL_PLANTS * BLOOMS),
    born: [2, 4],
    scale: [1, 1],
    depth: [0, 15],
  });
  scatter(plants, ctx, {
    kind: "wildflower",
    count: Math.round((cols / 6) * SMALL_PLANTS * BLOOMS),
    born: [4, 7],
    scale: [1, 1],
    depth: [0, 15],
  });
  scatter(plants, ctx, {
    kind: "wildflower",
    count: Math.round((cols / 8) * SMALL_PLANTS * BLOOMS),
    born: [3, 6],
    scale: [1, 1],
    layer: 0,
  });
  for (const p of plants) {
    if (["tree", "boulders", "cholla", "ocotillo", "pad"].includes(p.kind)) p.scale *= clearing(p.x, cols);
  }
  plants.push(
    makePlant(rand, "granite", piles.big, { depth: 1, born: 1, scale: 1.1 * clearing(piles.big, cols), home: true }),
  );
  plants.push(makePlant(rand, "granite", piles.small, { depth: 1, born: 2, scale: 0.8 * clearing(piles.small, cols) }));
  sortPlants(plants);
  return plants;
}

// Pale sand with pebbles, and a little dry grass along the top edge.
function soil(pal, x, y, depth, turf) {
  if (y === 0 && hash(x, 0, 5) < turf * 0.5) return pal.joshua[2];
  const n = hash(x, y, 11);
  if (hash(x, y, 41) < 0.025) return pal.pebble;
  if (n < 0.1 + depth * 0.22) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures

// The red-tailed hawk circles high over the desert by day, banking at each end of its circle. Once
// in a while it folds its wings and stoops at the jackrabbit, then opens them at the bottom and
// beats its way back up to its circle.
const HAWK_STOOP = [".BB.", "BLLB", "BLLB", ".RR.", ".RR."];
const HAWK_DIVE = 1.1;
const HAWK_BEATS = ["up", "level", "down", "level"];
const HAWK_BEAT_FPS = 14;

function hawkAt(g, h) {
  if (h.stoop) {
    if (h.stoop.t >= HAWK_DIVE) {
      const beat = Math.floor((h.stoop.t - HAWK_DIVE) * HAWK_BEAT_FPS) % HAWK_BEATS.length;
      raptorAt(g, { kind: "hawk", x: h.x, y: h.y, dir: h.dir }, { pose: HAWK_BEATS[beat] });
      return;
    }
    const [dark, pale, tail] = g.pal.hawk;
    sprite(g, HAWK_STOOP, { B: dark, L: pale, R: tail }, Math.round(h.x), Math.round(h.y), 1, 2, 4);
    return;
  }
  raptorAt(g, { kind: "hawk", x: h.x, y: h.y, dir: h.dir }, { bank: h.bank });
}

// Where the hawk is on its circle at `f.time`.
function hawkCircle(f, h) {
  const t = f.time * 0.22 + h.phase;
  return {
    x: h.cx + Math.cos(t) * h.reach,
    y: h.cy + Math.sin(t * 2) * 5,
    dir: Math.sin(t) > 0 ? -1 : 1,
    bank: Math.abs(Math.sin(t)) < 0.3,
  };
}

function moveHawk(f, h, rabbit, dt) {
  if (h.stoop) {
    h.stoop.t += dt;
    const { t, from, to } = h.stoop;
    if (t < HAWK_DIVE) {
      const ease = (t / HAWK_DIVE) ** 2;
      h.x = from.x + (to.x - from.x) * ease;
      h.y = from.y + (to.y - from.y) * ease;
      return;
    }
    // At the bottom it pulls out, then swoops back to wherever its circle has got to, so the
    // hand-back to the circle does not jump.
    const up = Math.min(1, Math.max(0, (t - 1.3) / 1.6));
    const ease = up * up * (3 - 2 * up);
    const circle = hawkCircle(f, h);
    h.x = to.x + (circle.x - to.x) * ease;
    h.y = to.y + (circle.y - to.y) * ease;
    if (t >= 2.9) {
      Object.assign(h, circle, { stoop: null, next: f.time + 40 + f.rand() * 20 });
      rabbit.frozen = 0;
    }
    return;
  }
  Object.assign(h, hawkCircle(f, h));
  if (f.stage >= 7 && rabbit.active && f.time >= h.next && rabbit.x > 10 && rabbit.x < f.cols - 10) {
    h.stoop = { t: 0, from: { x: h.x, y: h.y }, to: { x: rabbit.x, y: f.groundY - 10 } };
    rabbit.frozen = 3;
    rabbit.state = "sit";
  }
}

// Turkey vultures glide past on wings held in a shallow V, never flapping, teetering from side to
// side as they ride the air. In time a second joins the first.
function vulturesAt(g, bird, time) {
  for (const m of bird.members) {
    const tilt = Math.floor(time / 0.8 + m.phase) % 2 === 1;
    const drift = Math.round(Math.sin(time * 0.9 + m.phase) * 2);
    raptorAt(
      g,
      { kind: "vulture", x: bird.x - bird.dir * m.back, y: bird.y + m.up + drift, dir: bird.dir },
      { bank: tilt },
    );
  }
}

// A greater roadrunner: brown with buff streaks, a shaggy crest, blue and red skin behind the eye, a
// dark bill and blue-grey legs. Standing, its tail is cocked high; running, it lowers its head and
// tail and its legs blur through three frames. Its palette is runner: [brown, buff, blue, red,
// bill, belly, legs].
const RUNNER_STAND = [
  "B.............",
  "BB.......BB...",
  ".BB.....BBBB..",
  "..BB....BbrBKK",
  "...BBBSBBBB...",
  "....BSBSBBB...",
  ".....CCCCC....",
];
const RUNNER_RUN = [
  "..............",
  "........BBB...",
  ".......BBbrBKK",
  "BBBBBBSBBBB...",
  ".BBBSBSBBB....",
  "...BSBSBB.....",
  "....CCCCC.....",
];
const RUNNER_LEGS = [
  [
    [6, -3],
    [5, -2],
    [4, -1],
    [8, -3],
    [9, -2],
    [10, -1],
  ],
  [
    [6, -3],
    [6, -2],
    [6, -1],
    [8, -3],
    [8, -2],
    [8, -1],
  ],
  [
    [6, -3],
    [7, -2],
    [8, -1],
    [8, -3],
    [7, -2],
    [6, -1],
  ],
];

function roadrunnerAt(g, r) {
  const [brown, buff, blue, red, bill, belly, legs] = g.pal.runner;
  const colours = { B: brown, S: buff, b: blue, r: red, K: bill, C: belly };
  const x = Math.round(r.x);
  const y = g.groundY + 6;
  const running = r.state === "walk";
  sprite(g, running ? RUNNER_RUN : RUNNER_STAND, colours, x, y, r.dir, 6, 10);
  const frame = running ? RUNNER_LEGS[Math.floor(r.phase * 1.5) % 3] : RUNNER_LEGS[1];
  for (const [dx, dy] of frame) part(g, legs, x, y, r.dir, dx - 6, dy, 1, 1);
}

// A desert tortoise: a high domed shell with dark scute lines, plodding on stumpy legs. When it
// stops it pulls its head in. Its palette is tortoise: [shell, scutes, skin, dark].

// A snake sliding along the sand in an S, its body banded sand and brown. The wave runs along it
// as it moves. Its palette is snake: [sand, brown].
// A snake: a two-row body with a banded back and a darker belly, a wider head with an eye, and a tail
// that thins to one row, rippling side to side. Its palette is snake: [sand, brown].
function snakeAt(g, s) {
  const [sand, brown] = g.pal.snake;
  const x = Math.round(s.x);
  const y = g.groundY + 6;
  const px = (colour, dx, dy, w, h) => part(g, colour, x, y, s.dir, dx, dy, w, h);
  const wave = (i) => Math.round(Math.sin(i * 0.7 - s.phase * 0.5) * 1.2);
  px(brown, 0, wave(0) - 1, 1, 1);
  for (let i = 1; i < 13; i += 1) {
    px(Math.floor(i / 2) % 2 ? brown : sand, i, wave(i) - 2, 1, 1);
    px(brown, i, wave(i) - 1, 1, 1);
    if (wave(i) !== wave(i - 1)) px(brown, i, Math.min(wave(i), wave(i - 1)) - 1, 1, 2);
  }
  const h = wave(12);
  px(sand, 13, h - 3, 3, 2);
  px(brown, 13, h - 1, 3, 1);
  px(brown, 15, h - 2, 1, 1);
}

function tumbleAt(g, t, time) {
  const [light, dark] = g.pal.tumble;
  const x = Math.round(t.x);
  const y = g.groundY + 6 - Math.round(Math.abs(Math.sin(time * 5)) * 2);
  const turn = Math.floor(time * 6) % 2;
  blob(g, x, y - 7, 7, 7, (px, py) => (hash(px + turn * 3, py, 5) > 0.55 ? dark : light));
  rect(g, light, x - 1 + turn, y - 4, 3, 1);
}

// The band's centre line runs from the core, just under the horizon on the right, to where it
// leaves the sky top-left. It narrows as it climbs, swells round the core and is brightest there.
function milkyWay(f) {
  const thin = narrow(f);
  const w = clamp(f.cols * 0.05, 9, 15);
  return {
    points: bandPath({ x: f.cols * (thin ? 0.74 : 0.8), y: f.groundY + 1 }, { x: f.cols * (thin ? 0 : 0.06), y: -14 }),
    width: (along) => w * (1 - 0.45 * along) + 12 * Math.exp(-((along / 0.14) ** 2)),
    glow: (along) => 0.42 + 0.58 * Math.exp(-along * 2.6),
    core: (along) => 0.75 * Math.exp(-((along / 0.09) ** 2)),
    rift: 0.72,
    warm: 0.3,
  };
}

function skyAt(g, f, time) {
  const sky = f.extra;
  sky.milky ??= milkyWayCanvas(f.cols, f.groundY, sky.band);
  g.ctx.drawImage(sky.milky, 0, 0);
  starFieldAt(g, sky.stars, time);
  for (const star of NAMED_STARS) {
    const { x, y } = onBand(sky.band, star.along, star.across);
    starAt(g, star.colour, x, y, 0.85 + 0.15 * Math.sin(time * 1.3 + x), true);
  }
  g.ctx.globalAlpha = 1;
}

// Meteors. Each starts green at its head, as the Perseids do, turns white and fades to yellow down
// its tail. Its glow steps down through a few fixed strengths and, at its faintest, scatters into a
// dither, like the aurora's, so it stays pixel art. Once it burns out its train lingers at `keep` of
// its strength; a burst's trains hold on and then go, like a long exposure's. A fireball is two
// pixels wide at its head and leaves a green train.
function spawnMeteor(f, sky) {
  if (sky.mode === "burst") {
    let tx;
    let ty;
    let dist;
    do {
      tx = f.rand() * f.cols;
      ty = f.groundY * (0.02 + f.rand() * 0.85);
      dist = Math.hypot(tx - sky.rx, ty - sky.ry);
    } while (dist < 6);
    const dx = (tx - sky.rx) / dist;
    const dy = (ty - sky.ry) / dist;
    const length = Math.min(46, 3 + dist * 0.3);
    return {
      x: tx - dx * length * 0.6,
      y: ty - dy * length * 0.6,
      dx,
      dy,
      speed: 30 + dist * 0.5,
      length,
      age: 0,
      life: 0.45 + f.rand() * 0.3,
      linger: 3.5,
      keep: 0.8,
      slow: true,
    };
  }
  const tx = f.cols * (0.04 + f.rand() * 0.96);
  const ty = f.groundY * (0.04 + f.rand() * 0.72);
  const dist = Math.hypot(tx - sky.rx, ty - sky.ry);
  const dx = (tx - sky.rx) / dist;
  const dy = (ty - sky.ry) / dist;
  const fire = f.rand() < 0.125;
  const length = fire ? 45 + f.rand() * 15 : 20 + f.rand() * 20;
  return {
    x: tx - dx * length * 0.5,
    y: ty - dy * length * 0.5,
    dx,
    dy,
    speed: fire ? 75 : 85 + f.rand() * 40,
    length,
    age: 0,
    life: fire ? 0.8 : 0.4 + f.rand() * 0.35,
    linger: fire ? 2.2 : 0.6,
    keep: fire ? 0.6 : 0.5,
    fire,
  };
}

function moveSky(f, sky, dt) {
  if (f.time >= sky.until) {
    sky.turn = (sky.turn + 1) % SHOWERS.length;
    const { mode, seconds } = SHOWERS[sky.turn];
    sky.mode = mode;
    sky.until = f.time + seconds;
    sky.next = f.time + 1;
    const radiant = mode === "burst" ? onBand(f.extra.band, 0.82, -0.2) : { x: -f.cols * 0.04, y: -10 };
    sky.rx = radiant.x;
    sky.ry = radiant.y;
  }
  if (sky.mode !== "quiet" && f.time >= sky.next) {
    sky.meteors.push(spawnMeteor(f, sky));
    sky.next = f.time + (sky.mode === "burst" ? 0.2 + f.rand() * 0.25 : 0.12 + f.rand() * 0.25);
  }
  for (const m of sky.meteors) m.age += dt;
  sky.meteors = sky.meteors.filter((m) => m.age < m.life + m.linger);
}

function meteorDot(g, colour, x, y, a) {
  const alpha = a < 0.25 ? (dithered(x, y, a / 0.25) ? 0.25 : 0) : Math.ceil(a * 4) / 4;
  if (!alpha) return;
  g.ctx.globalAlpha = alpha;
  rect(g, colour, x, y, 1, 1);
}

function meteorAt(g, m) {
  const [green, white, gold] = g.pal.meteor;
  const t = Math.min(m.age, m.life);
  const grown = Math.min(1, t / 0.15) * m.length;
  const hx = m.x + m.dx * m.speed * t;
  const hy = m.y + m.dy * m.speed * t;
  const burning = m.age < m.life;
  const gone = (m.age - m.life) / m.linger;
  const fade = burning ? 1 : m.keep * (m.slow ? 1 - gone * gone : 1 - gone);
  for (let k = 0; k <= grown; k += 1) {
    const x = Math.round(hx - m.dx * k);
    const y = Math.round(hy - m.dy * k);
    const a = (1 - k / Math.max(1, grown)) * fade;
    meteorDot(g, burning && k < 2 ? green : k < grown * 0.55 ? white : gold, x, y, a);
    if (m.fire && k < grown * 0.4) {
      meteorDot(g, burning ? white : green, x + Math.round(-m.dy), y + Math.round(m.dx), a * 0.6);
    }
  }
  if (m.fire && burning) {
    g.ctx.globalAlpha = 1;
    rect(g, white, Math.round(hx), Math.round(hy), 1, 1);
  }
  g.ctx.globalAlpha = 1;
}

const extras = {
  init(f) {
    return {
      cat: walker(f),
      stars: starField(f, STARS, 70),
      band: milkyWay(f),
      milky: null,
      hawk: {
        cx: f.cols * (0.25 + f.rand() * 0.5),
        cy: 44 + f.rand() * 20,
        reach: Math.max(30, f.cols * 0.22),
        phase: f.rand() * 6,
        next: 30 + f.rand() * 20,
        stoop: null,
        x: 0,
        y: 0,
        dir: 1,
      },
      runner: walker(f),
      rabbit: { ...walker(f), kind: "jackrabbit", frozen: 0 },
      tortoise: walker(f),
      snake: walker(f),
      snakeShows: f.rand() < 0.4,
      coyotes: [
        { ...walker(f), kind: "coyote" },
        { ...walker(f, 0.6), kind: "coyote" },
      ],
      howl: { next: 8 + f.rand() * 10, until: -1 },
      tumble: { next: 5, bird: null },
      vultures: { next: 0, bird: null },
      sheep: null,
      owl: null,
      sky: { turn: Math.floor(f.rand() * SHOWERS.length), mode: "quiet", until: 0, next: 0, rx: 0, ry: 0, meteors: [] },
    };
  },

  // The jackrabbit comes at stage 1, a roadrunner at 3, the tortoise at 4, a coyote with its pup at
  // 5; the snake shows itself on some visits only. The hawk stoops at the jackrabbit from stage 7.
  onGrow(f) {
    if (f.stage >= 7 && !narrow(f)) enter(f, f.extra.cat);
    const x = f.extra;
    if (f.stage >= 3) enter(f, x.runner);
    if (f.stage >= 4 && !narrow(f)) enter(f, x.tortoise);
    if (f.stage >= 5) {
      const [coyote, pup] = x.coyotes;
      enter(f, coyote);
      if (!narrow(f)) enterBehind(f, pup, coyote, 13);
    }
    if (f.stage >= 6 && x.snakeShows) enter(f, x.snake);
    if (f.stage >= 1) enter(f, x.rabbit);
  },

  busy: () => true,

  update(f, dt) {
    // The cat wanders, and when it stops it rests in one of its poses, by night only.
    if (isNight(f)) {
      wander(f, f.extra.cat, dt, { speed: 8, stride: 7, sit: [4, 9], walk: [3, 6] });
      rest(f, f.extra.cat, felidPoses("bobcat"));
    }
    const x = f.extra;
    const night = isNight(f);
    wander(f, x.runner, dt, { speed: 26, stride: 12, sit: [1, 3], walk: [1.5, 4] });
    if (x.rabbit.frozen > 0) x.rabbit.frozen -= dt;
    else wander(f, x.rabbit, dt, { speed: 14, stride: 10, sit: [2, 5], walk: [1.5, 3] });
    wander(f, x.tortoise, dt, { speed: 1.5, stride: 2, sit: [4, 9], walk: [5, 10] });
    wander(f, x.snake, dt, { speed: 4, stride: 4, sit: [4, 8], walk: [3, 6] });
    const [coyote, pup] = x.coyotes;
    // At night the coyote sits up and howls now and then; the pup sits with it.
    if (night && coyote.active && f.time >= x.howl.next) {
      x.howl.until = f.time + 3.5;
      x.howl.next = f.time + 25 + f.rand() * 15;
    }
    if (f.time < x.howl.until) {
      coyote.state = "howl";
      pup.state = "sit";
    } else {
      if (coyote.state === "howl") coyote.state = "sit";
      wander(f, coyote, dt, { speed: 13, stride: 9, sit: [2, 5], walk: [2, 5] });
      follow(pup, coyote, dt, 13);
      pup.state = coyote.state;
      pup.phase = coyote.phase;
    }
    if (f.stage >= 2 && !night) moveHawk(f, x.hawk, x.rabbit, dt);
    if (f.stage >= 4) flyBy(f, x.tumble, dt, { every: [8, 8], speed: 30, spawn: () => ({}) });
    if (f.stage >= 6 && !night) {
      flyBy(f, x.vultures, dt, {
        every: [8, 3],
        speed: 18,
        margin: 30,
        spawn: () => ({ y: 20 + f.rand() * 35, members: flock(f, f.stage >= 8 ? 2 : 1, 12, 5) }),
      });
    }
    const pile = f.plants.find((p) => p.kind === "granite" && p.home);
    if (!x.sheep && pile && pile.shown - pile.born >= 3) {
      const dir = pile.x < f.cols / 2 ? 1 : -1;
      x.sheep = percher(f, pile.x - dir * 7, graniteTop(pile, f.groundY), dir, {
        look: { every: [4, 8], lasts: 2.5 },
        chew: { every: [2, 5], lasts: 1.5 },
        stamp: { every: [9, 16], lasts: 0.4 },
      });
      x.sheep.pal = "sheep";
    }
    if (x.sheep) fidget(f, x.sheep);
    if (!x.owl) {
      const trees = f.plants.filter(
        (p) => p.kind === "tree" && p.layer === 1 && p.top && Math.abs(p.x - f.cols / 2) > CLEARING,
      );
      if (trees.length) {
        const tree = trees.reduce((tall, p) => (p.top.y < tall.top.y ? p : tall));
        x.owl = percher(f, tree.top.x, tree.top.y, 1, {
          look: { every: [3, 6], lasts: 1.8 },
          blink: { every: [2, 4], lasts: 0.2 },
        });
        x.owl.pose = "perch";
        x.owl.tufts = true;
      }
    }
    if (x.owl) fidget(f, x.owl);
    if (night && f.stage >= 3) moveSky(f, x.sky, dt);
    else x.sky.meteors = [];
  },

  // At night the sky has stars and the Milky Way. It is drawn still under reduced motion.
  drawBack(g, f) {
    if (f.theme !== "dark") return;
    skyAt(g, f, g.time);
    if (!f.reduced) for (const m of f.extra.sky.meteors) meteorAt(g, m);
  },

  draw(g, f) {
    if (f.extra.cat.active && isNight(f)) felidAt(g, { ...f.extra.cat, kind: "bobcat", pal: "bobcatDesert" }, f.time);
    const x = f.extra;
    const night = isNight(f);
    if (f.stage >= 2 && !night) hawkAt(g, x.hawk);
    if (x.vultures.bird && !night) vulturesAt(g, x.vultures.bird, f.time);
    if (x.tumble.bird) tumbleAt(g, x.tumble.bird, f.time);
    if (x.sheep) {
      sheepAt(g, x.sheep, {
        look: doing(x.sheep, "look", f.time) >= 0,
        chew: doing(x.sheep, "chew", f.time) >= 0 && Math.floor(f.time * 6) % 2 === 0,
        stamp: doing(x.sheep, "stamp", f.time) >= 0,
      });
    }
    if (x.owl && night) {
      const look = doing(x.owl, "look", f.time) >= 0 ? (x.owl.x < f.cols / 2 ? 1 : -1) : 0;
      owlAt(g, x.owl, f.time, { look, blink: doing(x.owl, "blink", f.time) >= 0 });
    }
    if (x.tortoise.active) tortoiseAt(g, x.tortoise, g.groundY + 6);
    for (const c of x.coyotes) if (c.active) canidAt(g, c);
    if (x.snake.active) snakeAt(g, x.snake);
    if (x.rabbit.active) hareAt(g, x.rabbit);
    if (x.runner.active) roadrunnerAt(g, x.runner);
  },
};

export default {
  id: "desert",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.4, 0.6], dark: [0.5, 0.7] },
  mature: {
    tree: 3,
    rockpile: 3,
    granite: 3,
    boulders: 1.5,
    yucca: 2,
    sage: 2,
    cholla: 2.5,
    ocotillo: 2.5,
    pad: 2,
    wildflower: 1.2,
  },
  paint: { tree: joshua, rockpile, granite, boulders, yucca, sage, cholla, ocotillo, pad, wildflower },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "....y.y.....",
      "....ggg.y.y.",
      "y.y.ygy.ggg.",
      "ggg..t..ygy.",
      "ygy..t...t..",
      ".tt..t..t...",
      "..tt.t.tt...",
      "...ttttt....",
      "....ttt.....",
      "....tdt.....",
      "....ttt.....",
      "...ttttt....",
    ],
    colours: { y: "#d4e28a", g: "#7d9c4c", t: "#b19575", d: "#8a7058" },
  },
};
