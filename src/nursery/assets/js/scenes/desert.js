// The Joshua Tree scene: Joshua trees, yucca, cholla and ocotillo on open sand, with a granite pile
// to each side where a desert bighorn stands watch. Rain brings a light superbloom. A roadrunner, a
// jackrabbit, a desert tortoise, a coyote and pup, now and then a snake, and a tumbleweed share the
// ground; a red-tailed hawk circles and once in a while stoops at the jackrabbit, and turkey vultures
// teeter past. In dark mode it is a late-summer desert night under the Milky Way: the day birds are
// gone, a great horned owl watches from a Joshua tree, the coyote sits up to howl, and the Perseids
// fall in two patterns, with quiet spells between.
// At night a pale desert bobcat comes out to hunt, and rests between prowls.

import { hareAt, harePoses } from "../kit/beast.js";
import { bighornAt } from "../kit/bovid.js";
import { canidAt, settleCanid } from "../kit/canid.js";
import {
  enter,
  enterBehind,
  fidget,
  flock,
  follow,
  isNight,
  narrow,
  percher,
  rest,
  soarAt,
  soarer,
  walker,
  wander,
} from "../kit/critters.js";
import {
  cholla as chollaPlant,
  joshuaGeom,
  joshua as joshuaTree,
  ocotillo as ocotilloPlant,
  pad as padPlant,
  yucca as yuccaPlant,
} from "../kit/desert.js";
import { bandPath, dithered, milkyWayCanvas, onBand, starAt, starField, starFieldAt } from "../kit/effects.js";
import { felidAt, felidPoses } from "../kit/felid.js";
import { glideAt, hawkAt, OWL_MOVES, owlPerchAt } from "../kit/flyers.js";
import { groundBirdAt, groundBirdStep, groundPoses, groundSpeed } from "../kit/groundbird.js";
import { circlerPerch, goHome, unhidden } from "../kit/perch.js";
import {
  blob,
  CLEARING,
  clamp,
  clearing,
  foliage,
  hash,
  makePlant,
  placeLandmarks,
  rect,
  rng,
  scatter,
  sortPlants,
} from "../kit/pixel.js";
import { crossFlower } from "../kit/plants.js";
import { ANIMAL_BOX, bird, owlPerched, soarSprites, walk } from "../kit/poses.js";
import { crossingActor, drawStep, runCast, walkerActor } from "../kit/runner.js";
import { snakeAt, snakePoses, tortoiseAt, tortoisePoses } from "../kit/shell.js";

const MATURE = {
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
};
const ROCKPILE_ROWS = 30; // a distant rock pile's height at scale 1
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
// Flowering plants at this share of a full superbloom, so the desert stays open and calm.
const BLOOMS = 0.7;
// Small plants are sown at this share of the usual number, so more open desert shows and the animals
// stand out. The Joshua trees are not counted among them.
const SMALL_PLANTS = 0.6;

const LIGHT = {
  bobcatDesert: { T: "#c8a67c", S: "#a0805c", P: "#f4ecdc", D: "#3a2e24", e: "#3a2e24" },
  groundShadow: "rgba(88, 60, 20, 0.22)", // the soft shadow every animal, plant and rock casts on the ground
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
  snakeTongue: "#b8323c",
  snakeBuzz: "#8a6446",
  coyote: ["#c4a072", "#8a7a64", "#eadcc0", "#2a2420", "#2a2420"],
  canid: { R: "#6e2c2c", howl: "#5f6f84", dark: false },
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
  groundShadow: "rgba(0, 0, 0, 0.3)",
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
  snakeTongue: "#a04050",
  snakeBuzz: "#e8d4a8",
  coyote: ["#cbab7c", "#948470", "#e6d8bc", "#1e1a16", "#1e1a16"],
  canid: { R: "#3a2226", howl: "#e4ecf8", dark: true },
  sheep: ["#a08a6c", "#d8ccb8", "#b89c68", "#5a4a3a", "#86704a"],
  tortoise: ["#7a6a4c", "#54462f", "#988c72", "#2e271c"],
  owl: ["#8a6a4a", "#5a4330", "#c8b290", "#f2c230", "#1a1612"],
  tumble: ["#a08a60", "#7a6840"],
  star: ["#ffffff", "#ffe9a8"],
  meteor: ["#a8ffcc", "#ffffff", "#ffe39a"],
  haze: "#0b0b0b",
};

// The desert plants are on one build (kit/desert.js): light from above in four tones, a soft ground shadow
// (palette key groundShadow), and a part that sways with what it grows from. The painters here are the kit's
// own; the kit's joshuaGeom gives a Joshua tree's rows and its top, which the perches below read.

// A Joshua tree: a shaggy trunk that forks into thick, bending arms, each ending in a spiky rosette.
function joshua(g, p, s, base) {
  joshuaTree(g, p, s, base);
}

// A yucca: a rosette of stiff sword leaves round a short trunk, and on some plants a flower stalk.
function yucca(g, p, s, base) {
  yuccaPlant(g, p, s, base);
}

// The teddy-bear cholla: a dark stem with arms of fat, glowing joints.
function cholla(g, p, s, base) {
  chollaPlant(g, p, s, base);
}

// An ocotillo: seven whip-like canes that arch out as they rise, a few ending in a red flower.
function ocotillo(g, p, s, base) {
  ocotilloPlant(g, p, s, base);
}

// A prickly pear: flat oval pads stacked on one another, with fruit on the top ones.
function pad(g, p, s, base) {
  padPlant(g, p, s, base);
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
  const h = Math.max(4, Math.round(ROCKPILE_ROWS * p.scale * s));
  const w = Math.round(h * 1.3);
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.rock, p.seed);
  blob(g, p.x, base - Math.round(h * 0.45), w, Math.round(h * 0.45), shade);
  blob(g, p.x - Math.round(w * 0.18), base - Math.round(h * 0.78), Math.round(w * 0.55), Math.round(h * 0.4), shade);
  blob(g, p.x + Math.round(w * 0.2), base - Math.round(h * 0.7), Math.round(w * 0.5), Math.round(h * 0.38), shade);
  blob(g, p.x, base - h, Math.round(w * 0.4), Math.round(h * 0.34), shade);
}

// The top of a full-grown rock pile, where the hawk's feet go: rockpile() draws its crowning boulder from the
// same numbers.
function rockpileTop(p, groundY) {
  return { x: p.x, y: groundY + 2 - Math.max(4, Math.round(ROCKPILE_ROWS * p.scale)) };
}

// The top of a full-grown Joshua tree, where a vulture's or the owl's feet go: its last arm's top row, from
// the kit's joshuaGeom (the numbers joshua() draws from) in the wind at `time`. Its base row is the one the
// engine paints it on.
function joshuaTop(p, groundY, time) {
  return joshuaGeom(p, 1, groundY + (p.layer < 1 ? 1 : p.depth), time).top;
}

// Where the hawk may perch: the full-grown rock piles. Where a vulture may: the top of a full-grown Joshua tree.
function hawkSpots(f) {
  return f.plants
    .filter((p) => p.kind === "rockpile" && p.shown - p.born >= MATURE.rockpile)
    .map((p) => ({ x: p.x, top: () => rockpileTop(p, f.groundY) }));
}

function vultureSpots(f) {
  const spots = [];
  const covers = [];
  for (const [order, p] of f.plants.entries()) {
    if (p.kind === "tree" && p.shown - p.born >= MATURE.tree) {
      const at = joshuaTop(p, f.groundY, f.time);
      spots.push({
        x: at.x,
        order,
        top: (time) => {
          const t = joshuaTop(p, f.groundY, time);
          return { x: t.x, y: t.y + 1 };
        },
      });
      covers.push({ x: at.x, order, y: at.y, reach: 12 });
    } else if (p.kind === "granite") {
      const h = Math.max(4, Math.round(GRANITE_ROWS * p.scale));
      covers.push({ x: p.x, order, y: f.groundY + 1 - h, reach: Math.round(h * 0.75) + 2 });
    }
  }
  return unhidden(spots, covers, f.time);
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

// The red-tailed hawk circles high over the desert by day, banking at each end of its circle (kit/animals.js
// hawkAt draws it). Once in a while it folds its wings and stoops at the jackrabbit, then opens them at the
// bottom and beats its way back up to its circle. Now and then it comes down on a rock pile instead.
const HAWK_DIVE = 1.1;
const HAWK_STOOP_SECONDS = 3;

function moveHawk(f, h, rabbit, dt) {
  if (h.visit) return;
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
    const circle = soarAt(f.time, h);
    h.x = to.x + (circle.x - to.x) * ease;
    h.y = to.y + (circle.y - to.y) * ease;
    if (t >= HAWK_STOOP_SECONDS) {
      Object.assign(h, circle, { stoop: null, calm: f.time, next: f.time + 40 + f.rand() * 20 });
      rabbit.frozen = 0;
    }
    return;
  }
  Object.assign(h, soarAt(f.time, h));
  if (f.stage >= 7 && rabbit.active && f.time >= h.next && rabbit.x > 10 && rabbit.x < f.cols - 10) {
    h.stoop = { t: 0, from: { x: h.x, y: h.y }, to: { x: rabbit.x, y: f.groundY - 10 } };
    rabbit.frozen = 3;
    rabbit.state = "sit";
  }
}

// Turkey vultures glide past on wings held in a shallow V, never flapping, rocking from side to side as they
// ride the air (kit/animals.js glideAt). In time a second joins the first. Now and then a lone one comes down
// on a Joshua tree.

// A greater roadrunner, built from parts (kit/groundbird.js): brown with buff streaks, a shaggy crest, blue
// and red skin behind the eye, a dark bill and blue-grey legs. It runs with its body level, its head
// forward and its tail streaming; stopped, it cocks its tail, pumps it, preens or stretches a wing. Its
// palette is runner: [brown, buff, blue, red, bill, belly, legs], with groundShadow beside it.
function roadrunnerAt(g, r, time) {
  if (g.trace) return g.trace.draw(roadrunnerAt, g, r, time);
  groundBirdAt(g, r, "runner", time);
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

const extras = runCast(
  [
    drawStep(
      "sky",
      (g, f) => {
        if (f.theme !== "dark") return;
        skyAt(g, f, g.time);
        if (!f.reduced) for (const m of f.extra.sky.meteors) meteorAt(g, m);
      },
      { back: true },
    ),
    walkerActor({
      id: "cat",
      label: "desert bobcat, out at night",
      kind: "animal",
      family: "cats",
      sprites: ["bobcat", "bobcat-sitting", "bobcat-arching", "bobcat-lying", "bobcat-stretching"],
      arrives: 7,
      when: "night",
      phone: "hide",
      move: { speed: 8, stride: 7, sit: [4, 9], walk: [3, 6] },
      poses: () => felidPoses("bobcat"),
      draw: (g, w, f) => felidAt(g, { ...w, kind: "bobcat", pal: "bobcatDesert" }, f.time),
    }),
    drawStep("hawk", (g, f) => {
      if (f.stage >= 2 && !isNight(f)) hawkAt(g, f.extra.hawk, f.time);
    }),
    crossingActor({
      id: "vultures",
      label: "turkey vultures (a lone one perches on a Joshua tree now and then)",
      kind: "bird",
      family: "soaring-birds",
      sprites: [
        "vulture",
        "vulture-rocking",
        "vulture-landing",
        "vulture-takeoff",
        "vulture-perched",
        "vulture-perched-preening",
        "vulture-perched-stretching",
      ],
      arrives: 6,
      when: "day",
      first: 0,
      mode: "perch",
      every: [8, 3],
      speed: 18,
      margin: 30,
      spawn: (f) => ({ y: 20 + f.rand() * 35, members: flock(f, f.stage >= 8 ? 2 : 1, 12, 5) }),
      spots: vultureSpots,
      stay: [14, 26],
      odds: 0.4,
      clearOnOff: "perched",
      onUpdate: (_f, slot) => {
        if (slot.bird?.visit) slot.bird.members = slot.bird.members.slice(0, 1);
      },
      draw: (g, b, f) => glideAt(g, "vulture", b, f.time),
    }),
    crossingActor({
      id: "tumble",
      label: "tumbleweed",
      kind: "effect",
      sprites: ["tumbleweed"],
      arrives: 4,
      first: 5,
      every: [8, 8],
      speed: 30,
      spawn: () => ({}),
      draw: (g, b, f) => tumbleAt(g, b, f.time),
    }),
    drawStep("bighorn-owl", (g, f) => {
      const { sheep, owl } = f.extra;
      if (sheep) bighornAt(g, sheep, f.time);
      if (owl && isNight(f)) owlPerchAt(g, owl, f.time);
    }),
    walkerActor({
      id: "tortoise",
      label: "desert tortoise",
      kind: "animal",
      family: "shelled-scaled",
      sprites: ["tortoise", "tortoise-resting", "tortoise-grazing", "tortoise-looking"],
      arrives: 4,
      phone: "hide",
      move: { speed: 1.5, stride: 2, sit: [4, 9], walk: [5, 10] },
      poses: () => tortoisePoses,
      draw: (g, w, f) => tortoiseAt(g, w, g.groundY + 6, f.time),
    }),
    drawStep("coyotes-snake-rabbit", (g, f) => {
      const x = f.extra;
      for (const c of x.coyotes) if (c.active) canidAt(g, c, f.time);
      if (x.snake.active) snakeAt(g, x.snake, f.time);
      if (x.rabbit.active) hareAt(g, x.rabbit, f.time);
    }),
    walkerActor({
      id: "runner",
      label: "roadrunner",
      kind: "animal",
      family: "ground-birds",
      sprites: [
        "roadrunner",
        "roadrunner-standing",
        "roadrunner-pumping",
        "roadrunner-preening",
        "roadrunner-stretching",
      ],
      arrives: 3,
      move: { speed: groundSpeed("runner"), stride: 1, sit: [2, 5.5], walk: [1.5, 4] },
      poses: (w) => groundPoses(w, "runner"),
      step: (f, w, dt, x0) => groundBirdStep(f, w, dt, "runner", x0),
      draw: (g, w, f) => roadrunnerAt(g, w, f.time),
    }),
    {
      label: "red-tailed hawk",
      kind: "bird",
      family: "soaring-birds",
      arrives: 2,
      fixed: "1, circling by day; stoops at the jackrabbit about once a minute; perches on a rock pile now and then",
      sprites: [
        "hawk",
        "hawk-bank",
        "hawk-flapping",
        "hawk-stoop",
        "hawk-pullout",
        "hawk-landing",
        "hawk-takeoff",
        "hawk-perched",
        "hawk-perched-preening",
        "hawk-perched-stretching",
      ],
    },
    {
      label: "snake",
      kind: "animal",
      family: "shelled-scaled",
      arrives: 6,
      fixed: "1, on about 4 visits in 10",
      sprites: ["snake", "snake-coiled", "snake-rearing"],
    },
    {
      label: "jackrabbit",
      kind: "animal",
      family: "hares-rodents",
      presence: ["rabbit"],
      sprites: ["rabbit", "rabbit-looking-out", "rabbit-freezing"],
    },
    {
      label: "coyote and pup",
      kind: "animal",
      family: "dogs",
      presence: ["coyotes[0]", "coyotes[1]"],
      sprites: ["coyote", "coyote-howl", "coyote-pup", "coyote-pup-sitting", "coyote-pup-howl"],
    },
    {
      label: "stars and the Milky Way (dark theme)",
      kind: "effect",
      layer: "behind the plants (drawBack, dark theme only)",
      arrives: 0,
      fixed: `${STARS} stars and the Milky Way`,
      sprites: ["sky"],
    },
    {
      label: "desert bighorn on its granite pile",
      kind: "animal",
      family: "cattle-sheep",
      arrives: 3,
      fixed: "1, perched",
      sprites: ["bighorn", "bighorn-look", "bighorn-grazing", "bighorn-lying"],
    },
    {
      label: "great horned owl (night)",
      kind: "bird",
      family: "owls",
      arrives: 1,
      fixed: "1, perched on a Joshua tree at night",
      sprites: ["owl", "owl-swivel", "owl-fluff"],
    },
    {
      label: "Perseid showers (night): a wide burst from Perseus, then a rain across the sky",
      kind: "effect",
      layer: "behind the plants (drawBack, dark theme only)",
      arrives: 3,
      fixed: "taking turns with quiet spells",
      sprites: ["meteors"],
    },
  ],
  {
    init(f) {
      return {
        stars: starField(f, STARS, 70),
        band: milkyWay(f),
        milky: null,
        hawk: {
          ...soarer(f, 44 + f.rand() * 20),
          next: 30 + f.rand() * 20,
          stoop: null,
          x: 0,
          y: 0,
          dir: 1,
        },
        rabbit: { ...walker(f), kind: "jackrabbit", frozen: 0 },
        snake: walker(f),
        snakeShows: f.rand() < 0.4,
        coyotes: [
          { ...walker(f), kind: "coyote" },
          { ...walker(f, 0.6), kind: "coyote" },
        ],
        howl: { next: 8 + f.rand() * 10, until: -1 },
        sheep: null,
        owl: null,
        sky: {
          turn: Math.floor(f.rand() * SHOWERS.length),
          mode: "quiet",
          until: 0,
          next: 0,
          rx: 0,
          ry: 0,
          meteors: [],
        },
      };
    },

    // The jackrabbit comes at stage 1, a roadrunner at 3, the tortoise at 4, a coyote with its pup at
    // 5; the snake shows itself on some visits only. The hawk stoops at the jackrabbit from stage 7.
    onGrow(f) {
      const x = f.extra;
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
      const x = f.extra;
      const night = isNight(f);
      if (x.rabbit.frozen > 0) x.rabbit.frozen -= dt;
      else wander(f, x.rabbit, dt, { speed: 14, stride: 10, sit: [2, 5], walk: [1.5, 3] });
      rest(f, x.rabbit, harePoses("jackrabbit"));
      wander(f, x.snake, dt, { speed: 4, stride: 4, sit: [4, 8], walk: [3, 6] });
      rest(f, x.snake, snakePoses);
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
      settleCanid(f, coyote);
      settleCanid(f, pup, coyote);
      if (f.stage >= 2 && !night) {
        const h = x.hawk;
        const away =
          !h.stoop && circlerPerch(f, h, dt, { first: [20, 20], every: [60, 40], stay: [14, 26], spots: hawkSpots });
        if (!away) moveHawk(f, h, x.rabbit, dt);
      } else goHome(f, x.hawk);
      const pile = f.plants.find((p) => p.kind === "granite" && p.home);
      if (!x.sheep && pile && pile.shown - pile.born >= 3) {
        const dir = pile.x < f.cols / 2 ? 1 : -1;
        x.sheep = percher(f, pile.x - dir * 7, graniteTop(pile, f.groundY), dir, {
          look: { every: [5, 10], lasts: 5 },
          chew: { every: [2, 5], lasts: 1.5 },
          stamp: { every: [9, 16], lasts: 0.4 },
          graze: { every: [10, 18], lasts: 3.6 },
          lie: { every: [20, 32], lasts: 7 },
        });
        x.sheep.pal = "sheep";
      }
      if (x.sheep) fidget(f, x.sheep);
      if (!x.owl) {
        const trees = f.plants
          .filter(
            (p) =>
              p.kind === "tree" &&
              p.layer === 1 &&
              p.shown - p.born >= MATURE.tree &&
              Math.abs(p.x - f.cols / 2) > CLEARING,
          )
          .map((p) => ({ p, top: joshuaTop(p, f.groundY, f.time) }));
        if (trees.length) {
          const { top } = trees.reduce((tall, t) => (t.top.y < tall.top.y ? t : tall));
          x.owl = percher(f, top.x, top.y, 1, OWL_MOVES);
          x.owl.species = "horned";
          x.owl.look = top.x < f.cols / 2 ? 1 : -1;
        }
      }
      if (x.owl) fidget(f, x.owl);
      if (night && f.stage >= 3) moveSky(f, x.sky, dt);
      else x.sky.meteors = [];
    },
  },
);

const SPRITES = {
  ...soarSprites("vulture", "vulture", { vulture: true }),
  ...soarSprites("hawk", "hawk", { stoop: true }),
  bobcat: (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", pal: "bobcatDesert" }), 0),
  "bobcat-sitting": (g, frame) =>
    felidAt(g, walk(frame, { kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "sit" }), 0),
  "bobcat-arching": (g, frame) =>
    felidAt(g, walk(frame, { kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "arch" }), 0),
  "bobcat-lying": (g, frame) =>
    felidAt(g, walk(frame, { kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "lie" }), 0),
  "bobcat-stretching": (g, frame) =>
    felidAt(g, walk(frame, { kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "bow" }), 0),
  roadrunner: (g, frame) => roadrunnerAt(g, walk(frame, { c: frame.phase * 0.25, amp: 1 }), 0),
  "roadrunner-standing": (g, frame) => roadrunnerAt(g, walk(frame, { state: "sit", amp: 0 }), 0),
  "roadrunner-pumping": (g, frame) =>
    roadrunnerAt(g, walk(frame, { state: "sit", pose: "pump", since: 0, timer: 6, amp: 0 }), 1.0),
  "roadrunner-preening": (g, frame) =>
    roadrunnerAt(g, walk(frame, { state: "sit", pose: "preen", since: 0, timer: 6, amp: 0 }), 2.0),
  "roadrunner-stretching": (g, frame) =>
    roadrunnerAt(g, walk(frame, { state: "sit", pose: "stretch", since: 0, timer: 6, amp: 0 }), 1.5),
  rabbit: (g, frame) => hareAt(g, walk(frame, { kind: "jackrabbit" })),
  "rabbit-looking-out": (g, frame) => hareAt(g, walk(frame, { kind: "jackrabbit", state: "sit", pose: "tall" }), 0),
  "rabbit-freezing": (g, frame) => hareAt(g, walk(frame, { kind: "jackrabbit", state: "sit", frozen: 1.5 }), 0),
  snake: (g, frame) => snakeAt(g, walk(frame), 0),
  "snake-coiled": (g, frame) => snakeAt(g, walk(frame, { state: "sit", pose: "coil", since: 0, timer: 30 }), 5),
  "snake-rearing": (g, frame) => snakeAt(g, walk(frame, { state: "sit", pose: "rear", since: 0, timer: 30 }), 5),
  tortoise: (g, frame) => tortoiseAt(g, walk(frame), g.groundY + 6),
  "tortoise-resting": (g, frame) =>
    tortoiseAt(g, walk(frame, { state: "sit", pose: "tuck", since: 0, timer: 30 }), g.groundY + 6, 4),
  "tortoise-grazing": (g, frame) =>
    tortoiseAt(g, walk(frame, { state: "sit", pose: "graze", since: 0, timer: 30 }), g.groundY + 6, 2),
  "tortoise-looking": (g, frame) =>
    tortoiseAt(g, walk(frame, { state: "sit", pose: "look", since: 0, timer: 30 }), g.groundY + 6, 2),
  coyote: (g, frame) => canidAt(g, walk(frame, { kind: "coyote" })),
  "coyote-howl": (g, frame) => canidAt(g, walk(frame, { kind: "coyote", state: "howl" })),
  "coyote-pup": (g, frame) => canidAt(g, walk(frame, { kind: "coyote", scale: 0.6 })),
  "coyote-pup-sitting": (g, frame) => canidAt(g, walk(frame, { kind: "coyote", scale: 0.6, state: "sit" })),
  "coyote-pup-howl": (g, frame) => canidAt(g, walk(frame, { kind: "coyote", scale: 0.6, state: "howl" })),
  bighorn: (g, frame) => bighornAt(g, walk(frame, { state: "sit" })),
  "bighorn-look": (g, frame) => bighornAt(g, walk(frame, { state: "sit", act: "look", actAt: 2.5 })),
  "bighorn-grazing": (g, frame) => bighornAt(g, walk(frame, { state: "sit", act: "graze", actAt: 1.8 })),
  "bighorn-lying": (g, frame) => bighornAt(g, walk(frame, { state: "sit", act: "lie", actAt: 3 })),
  owl: (g) => owlPerched(DARK, g, "horned", { s: 0 }),
  "owl-swivel": (g) => owlPerched(DARK, g, "horned", { s: 0.9 }),
  "owl-fluff": (g) => owlPerched(DARK, g, "horned", { fluff: 1, shiver: 1 }),
  meteors: (g) => {
    g.pal = DARK;
    // A burst round a radiant: short streaks near it, longer ones farther out.
    const rays = [
      [0, 1, 8],
      [0.8, 0.5, 14],
      [-0.8, 0.5, 10],
      [0.6, -0.5, 18],
      [-0.6, -0.5, 12],
    ];
    for (const [dx, dy, dist] of rays) {
      const m = { x: 40 + dx * dist, y: 28 + dy * dist, dx, dy, speed: 30 };
      meteorAt(g, { ...m, length: 3 + dist * 0.6, age: 0.3, life: 0.6, linger: 1, keep: 0.8 });
    }
  },
  tumbleweed: (g, frame) => tumbleAt(g, bird(frame), 0),
  sky: (g) => {
    const extra = extras.init({
      rand: rng(3),
      cols: ANIMAL_BOX.w,
      groundY: ANIMAL_BOX.ground,
    });
    skyAt(g, { cols: ANIMAL_BOX.w, groundY: ANIMAL_BOX.ground, extra }, 0);
  },
};

const PLANT_FAMILIES = {
  tree: "desert-plants",
  yucca: "desert-plants",
  cholla: "desert-plants",
  ocotillo: "desert-plants",
  pad: "desert-plants",
};

export const META = {
  id: "desert",
  label: "Joshua Tree Desert",
  group: "drylands",
  density: "open",
  tint: ["#fbcfa6", "rgb(220 110 80)"],
  backdrop: {
    light: {
      green: "#c9e0f2",
      "green-soft": "#f5deb0",
      peach: "#fbcfa6",
      blush: "#f8e0ea",
      bloom: "#f6bfd6",
    },
    dark: {
      green: "rgb(70 70 170 / 0.42)",
      "green-soft": "rgb(200 150 80 / 0.16)",
      peach: "rgb(220 110 80 / 0.2)",
      blush: "rgb(190 80 150 / 0.16)",
      bloom: "rgb(210 90 150 / 0.3)",
    },
  },
};

export default {
  ...META,
  cast: extras.cast,
  sprites: SPRITES,
  plantFamilies: PLANT_FAMILIES,
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.4, 0.6], dark: [0.5, 0.7] },
  mature: MATURE,
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
