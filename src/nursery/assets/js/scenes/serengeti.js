// The Serengeti savanna at golden hour: flat-topped umbrella acacias and tall gold grass on
// red-brown soil, with blue-grey hills and a tall granite rock where a lion paces his ledge. Far
// off, the great migration streams along the horizon, wildebeest in single file. Elephants with a
// calf, a giraffe that browses the acacias, zebras, a secretary bird and three lion cubs walk the
// plain, and by day a cheetah stalks through the grass and rests in it; a roller and a flamingo fly
// over. At night it is an indigo savanna under a moon.
// When a cub strays to an edge of the page, the lion roars from his ledge and calls it home.
import {
  elephantAt,
  felidAt,
  felidPoses,
  flamingoAt,
  giraffeAt,
  giraffeMuzzle,
  groundBirdAt,
  groundBirdStep,
  groundPoses,
  groundSpeed,
  zebraAt,
  zebraPoses,
} from "../kit/animals.js";
import { drawBody, STANCE } from "../kit/body.js";
import {
  circlingPair,
  enter,
  enterBehind,
  flyBy,
  follow,
  isNight,
  narrow,
  rest,
  settle,
  stride,
  walker,
  wander,
} from "../kit/critters.js";
import { mistAt, mistBand } from "../kit/effects.js";
import { LION_CUB, LION_CUB_UP } from "../kit/felid.js";
import { circlerAt, flyerAt } from "../kit/flyers.js";
import { circlerPerch, flyByPerch, goHome, unhidden } from "../kit/perch.js";
import {
  blob,
  clamp,
  clearing,
  foliage,
  frac,
  hash,
  makePlant,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
  stroke,
} from "../kit/pixel.js";
import { crossFlower } from "../kit/plants.js";
import { acaciaGeom, acaciaTree } from "../kit/widecanopy.js";

const KOPJE_ROWS = 20;
const PRIDE_ROWS = 56; // taller than any acacia (30 rows at scale 1, 39 at the most)
const PRIDE_TIP = 40; // how far the pride rock's ledge juts out in front of its face
const PRIDE_SHELF = -22; // where the ledge starts, back across the rock's face
const PRIDE_BACK = 56; // how far its shoulder and rubble reach behind it: no tree may stand there
const LION_HALF = 11; // half the walking lion's width: he keeps his whole body on the ledge
const LION_MID = 7; // from lionAt's x to the middle of the walking lion, the way he faces
const LION_FELID = 6; // from lionAt's x to the x felidAt draws the lion at, the way he faces
const LION_STRIDE = 8; // art px a second, walking to the end of the ledge to roar
const ROAR = 2.2; // seconds the roar lasts
const CUB_EDGE = 8; // a cub this near an edge of the page has strayed
const CUB_ARM = 30; // after it has been this far from both edges since it was last called
const CUB_HOME = 32; // where a called cub sits, out from the rock's x, under the ledge's tip
const CUB_BOUND = 26; // art px a second, bounding home, or faster so it takes at most 6 s
const QUIET = [50, 20]; // with no cub straying, the lion calls the farthest cub after 50-70 s
const CUB_STRIDE = [LION_CUB.stride / STANCE, 0.7]; // px a stride, seconds a stride to finish it
const BOUND_LEN = 14; // px a bound covers: one gather and one flight
const BOUND_GROUND = 0.25; // the share of a bound spent gathered on the ground
const BOUND_AIR = 2; // rows the cub rises at the top of a bound
const POUNCE = [0.5, 1.3, 2.2, 2.8]; // seconds: bow, wiggle, spring and land, stand again
const CUB_RISE = 0.4; // seconds a cub takes to get up out of a rest
const CUB_EASE = 0.25; // seconds a cub takes to ease into a stop
const CUB_RESTS = ["sit", "pounce"]; // what a stopped cub does: sit, or play
const ACACIA_MATURE = 3.5; // stages an acacia takes to reach full size
const ZEBRA_GAP = 17; // from the zebra's rump to its foal's: the foal's nose stops short of her tail
const BROWSE_REACH = 2; // rows above or below the leaves that the muzzle and its tongue still meet
const PUDDLE_FADE = 4; // seconds the giraffe's pool takes to dry after it walks away
const MISTS = 5;
const MOTES = 18;

const LIGHT = {
  acacia: ["#dcd47e", "#b8b25c", "#8d9440", "#66702e"],
  trunk: ["#6e5038", "#543a28"],
  groundShadow: "rgba(70, 50, 25, 0.22)", // the soft shadow every animal, plant and rock casts on the ground
  thorn: "#4a3420",
  scrub: ["#aaa25c", "#8d8646", "#6f6837", "#524e29"],
  hill: ["#b4c4d6", "#9bb1c8", "#8399b5"],
  rock: ["#e2b98e", "#c99770", "#a8765a", "#7e5544"],
  lichen: "#f2c25a",
  grass: ["#fbe08a", "#f0c25a", "#d89a3c"],
  mound: ["#dba56e", "#bf8650", "#9c6538"],
  dead: ["#ebdfc8", "#cfbfa0", "#9e8c70"],
  flower: ["#fff8e6", "#ffd23f", "#f08aa8", "#b78cf0"],
  stem: "#7d8a3a",
  elephant: ["#9a9089", "#746b65", "#d7a196", "#f6eedc", "#2b2623"],
  elephantRoar: "#6a5e56",
  elephantDust: "#c8a070",
  giraffe: ["#eab25c", "#b8762e", "#6d4520", "#fbeccb"],
  leaf: "#9aa648",
  zebra: ["#e9e4d8", "#262220", "#b3a998"],
  horseDust: "#d8bd8c",
  wildebeest: ["#5d524d", "#382f2b", "#cdbfae"],
  // The lion's four coat tones (H, T, S, U), far legs (F), pale, dark, the mane's four (g to k) and
  // his roar's rings of sound.
  lion: {
    H: "#eec078",
    T: "#d9a25a",
    S: "#bd7f44",
    U: "#96593a",
    F: "#a86a40",
    P: "#f4dcae",
    D: "#3a2014",
    E: "#8e5a2b",
    g: "#c4853a",
    m: "#9c5c28",
    n: "#6a3b1d",
    k: "#432519",
    roar: "#8e5a2b",
  },
  cheetah: { T: "#e2b464", S: "#bf8d48", P: "#f6e6c4", D: "#2e2218", e: "#2e2218" },
  secretary: ["#8f97a0", "#2b2f36", "#f08a3c", "#f6f2ea"],
  roller: ["#b9a0e8", "#2aa3a0", "#2f4fa6", "#1f2a3c"],
  rollerDepth: ["#7fd6cf", "#27306e", "#9c9a62"],
  flamingo: ["#f4a0bc", "#e56b8f", "#2a2630"],
  vultureAfrica: ["#3a2f2a", "#000000", "#000000", "#c8a8a0", "#a89a90"],
  dust: ["#fbe3a2", "#f2c46a"],
  sun: ["#ffd15a", "#ffe9a6"],
  mist: "#ffd98a",
  soil: ["#dca877", "#c48a5c", "#a8693f"],
  line: "rgba(255, 255, 255, 0.4)",
  wet: "#7a4a2a",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  haze: "#fff1d2",
};

const DARK = {
  acacia: ["#7c8a5a", "#606f4a", "#4a5a3c", "#34412c"],
  trunk: ["#5a4234", "#42302a"],
  groundShadow: "rgba(0, 0, 0, 0.3)",
  thorn: "#1e1610",
  scrub: ["#6a7048", "#525a38", "#3e4530", "#2e3424"],
  hill: ["#48577a", "#3c4a6a", "#2f3c58"],
  rock: ["#7d7478", "#666064", "#4f4a50", "#3a363c"],
  lichen: "#b08a4a",
  grass: ["#a88f4e", "#8c7440", "#6a5a34"],
  mound: ["#6a4d36", "#573f2c", "#43301f"],
  dead: ["#6c6058", "#544a43", "#3c3530"],
  flower: ["#e8e4f0", "#c9a84a", "#a87090", "#7e6cb0"],
  stem: "#4a5a3a",
  elephant: ["#4f4a5c", "#3a3646", "#8a6f7a", "#c9c2b0", "#15131c"],
  elephantRoar: "#e6dcc6",
  elephantDust: "#6a5a4c",
  giraffe: ["#9a7440", "#6a4a2a", "#3a2818", "#b8a478"],
  leaf: "#4a5a3c",
  zebra: ["#a9a7b4", "#1a1820", "#7c7a88"],
  horseDust: "#6a5a48",
  wildebeest: ["#3a3642", "#24212a", "#7c7a88"],
  lion: {
    H: "#b08e62",
    T: "#9c7a52",
    S: "#7e6040",
    U: "#5a4234",
    F: "#6a503a",
    P: "#c8b08a",
    D: "#221a16",
    E: "#5e4330",
    g: "#84633e",
    m: "#654830",
    n: "#463224",
    k: "#2e211c",
    roar: "#e8d4a8",
  },
  cheetah: { T: "#9e8058", S: "#866844", P: "#b8aa9a", D: "#2a2224", e: "#2a2224" },
  secretary: ["#5b6270", "#1e2026", "#c57532", "#b9bcc6"],
  roller: ["#7e6aa6", "#1f6e72", "#22346e", "#141a2a"],
  rollerDepth: ["#4a9c98", "#1a2150", "#6e6c48"],
  flamingo: ["#c77c98", "#a85a78", "#1c1a22"],
  vultureAfrica: ["#241d1a", "#000000", "#000000", "#8a6e68", "#6e645c"],
  dust: ["#6c6a92", "#55557e"],
  sun: ["#e4e4f6", "#5a5f9a"],
  mist: "#3a3560",
  soil: ["#4a3a36", "#3f302c", "#342724"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#14100c",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  haze: "#0d0c18",
};

// An umbrella thorn, on the wide-canopy family's build (kit/widecanopy.js): a thin trunk that forks into a
// fan of branches under a flat roof of leaf clumps, twice its height across. The kit's acaciaGeom gives
// the roof's rows and centre, which the giraffe's browse and the perches below read too.
function acacia(g, p, s, base) {
  acaciaTree(g, p, s, base);
}

// The top of a full-grown umbrella thorn's canopy, where a vulture's feet go: the roof's top row (acaciaGeom),
// swayed with the wind at `time`.
function acaciaTop(p, groundY, time) {
  const geom = acaciaGeom(p, 1, groundY + (p.layer < 1 ? 1 : p.depth), time);
  return { x: geom.cx, y: geom.top + 1 };
}

// Where a vulture may perch: the full-grown acacias.
function perchSpots(f) {
  const trees = f.plants.map((p, order) => ({ p, order })).filter(({ p }) => p.kind === "acacia");
  const spots = trees
    .filter(({ p }) => p.shown - p.born >= ACACIA_MATURE)
    .map(({ p, order }) => ({ x: p.x, order, top: (time) => acaciaTop(p, f.groundY, time) }));
  const covers = trees.map(({ p, order }) => ({
    x: p.x,
    order,
    y: acaciaTop(p, f.groundY, 0).y,
    reach: acaciaGeom(p, 1, 0, 0).half,
  }));
  return unhidden(spots, covers, f.time);
}

function kopjeRows(p, s) {
  return Math.max(4, Math.round(KOPJE_ROWS * p.scale * s));
}

// A granite kopje: a pile of rounded boulders, lichen spotted.
function kopje(g, p, s, base) {
  const { pal } = g;
  const h = kopjeRows(p, s);
  const w = Math.round(h * 1.5) + 4;
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.rock, p.seed, (dx, dy) =>
    hash(dx, dy, p.seed + 5) > 0.93 ? pal.lichen : null,
  );
  blob(g, p.x, base - Math.round(h * 0.6), w, Math.round(h * 0.6), shade);
  blob(g, p.x, base - h, Math.round(w * 0.55), Math.round(h * 0.6), shade);
  if (h >= 8) {
    const lw = Math.round(w * 0.36);
    const lh = Math.round(h * 0.42);
    blob(g, p.x - Math.round(w * 0.32), base - lh, lw, lh, shade);
  }
}

function prideRows(_p, s) {
  return Math.max(8, Math.round(PRIDE_ROWS * s));
}

// The ledge's top row sits this many rows above the ground: the lion's walk (see ledgeOf).
function prideLedge(p, s) {
  return Math.round(prideRows(p, s) * 0.36);
}

// The ledge juts toward the middle of the scene.
function prideDir(x, cols) {
  return x < cols / 2 ? 1 : -1;
}

// Pride Rock: a tall slab that leans back from a steep front face to a pointed peak, with a long
// angular shoulder sloping away behind it. Low on the front face a flat ledge juts out toward the
// middle of the scene, propped on a boulder, and runs on back across the face as a shelf, with a
// dark seam where the face meets it. A rubble stone lies behind.
function prideRock(g, p, s, base) {
  const { pal } = g;
  const rows = prideRows(p, s);
  const out = prideDir(p.x, g.cols);
  const ledge = prideLedge(p, s);
  const k = rows / PRIDE_ROWS;
  const sc = (n) => Math.round(n * k);
  const thick = Math.max(2, sc(5));
  const reach = sc(PRIDE_TIP);
  const shelf = sc(PRIDE_SHELF);
  // u counts pixels from p.x toward the ledge, h counts rows up from the ground.
  const front = (h) => sc(4) - Math.round((sc(10) * h) / rows);
  const back = (h) => {
    const t = h / rows;
    let u;
    if (t >= 0.78) u = -sc(20) + ((t - 0.78) / 0.22) * (front(rows) - 4 + sc(20));
    else if (t >= 0.35) u = -sc(20) - ((0.78 - t) / 0.43) * sc(24);
    else u = -sc(44) - ((0.35 - t) / 0.35) * sc(8);
    return Math.round(u) - (hash(h, p.seed, 2) < 0.3 ? 1 : 0);
  };
  for (let r = 0; r < rows; r += 1) {
    const h = rows - 1 - r;
    const onLedge = h >= ledge - thick && h < ledge;
    const uFront = onLedge ? Math.max(front(h), reach - (ledge - 1 - h)) : front(h);
    const xa = p.x + out * back(h);
    const xb = p.x + out * uFront;
    row(g, base - 1 - h, Math.min(xa, xb), Math.max(xa, xb), (x) => {
      const u = (x - p.x) * out;
      // Both ends of the ledge taper underneath.
      if (onLedge && (u > front(h) || u >= shelf + (ledge - 1 - h))) {
        if (h === ledge - 1) return hash(x, h, p.seed + 5) > 0.97 ? pal.lichen : pal.rock[0];
        return pal.rock[h === ledge - thick ? 3 : h > ledge - 3 ? 1 : 2];
      }
      if (h === ledge && u >= shelf) return pal.rock[3];
      const f = (front(h) - u) / Math.max(1, front(h) - back(h));
      const v = f + (hash(x, h, p.seed + 1) - 0.5) * 0.25;
      if (hash(x, h, p.seed + 5) > 0.992) return pal.lichen;
      if ((u + Math.floor(h * 0.3)) % 12 === 0 && hash(x, h, p.seed + 9) > 0.35) return pal.rock[3];
      return pal.rock[v < 0.3 ? 0 : v < 0.55 ? 1 : v < 0.82 ? 2 : 3];
    });
  }
  // The boulder that props the ledge: wider at the foot, it leans against the front face.
  const bx = p.x + out * sc(17);
  const bw = sc(10);
  const bh = ledge - thick;
  const boulder = foliage({ cx: bx, top: base - bh, w: bw * 2, h: bh }, pal.rock, p.seed + 11);
  for (let h = 0; h < bh; h += 1) {
    const half = Math.round(bw * (1.15 - (0.5 * h) / bh));
    row(g, base - 1 - h, bx - half, bx + half, boulder);
  }
  // Rubble behind the rock.
  const rx = p.x - out * sc(46);
  const rw = sc(16);
  const rh = sc(8);
  const rubble = foliage({ cx: rx, top: base - rh, w: rw, h: rh }, pal.rock, p.seed + 13);
  blob(g, rx, base - rh, rw, rh, rubble);
}

// Distant blue-grey hills, domed and hazier the farther they are.
function hills(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(3, Math.round(24 * p.scale * s));
  const width = Math.round(100 * p.scale);
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const half = Math.round((width / 2) * Math.sqrt(1 - f * f) + (hash(r, p.seed, 1) - 0.5) * 2);
    if (half < 1) break;
    row(g, base - 1 - r, p.x - half, p.x + half, (x) => {
      if (f > 0.8 && hash(x, r, p.seed) < 0.5) return pal.hill[0];
      return pal.hill[hash(x, r, p.seed + 3) < 0.15 ? 2 : 1];
    });
  }
}

// A low, dense bush with thorns scattered over it.
function scrub(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(3, Math.round(10 * p.scale * s));
  const h = Math.max(2, Math.round(w * 0.6));
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.scrub, p.seed, (dx, dy) =>
    hash(dx, dy, p.seed + 3) > 0.9 ? pal.thorn : null,
  );
  blob(g, p.x, base - h, w, h, shade);
}

// A termite mound: a tall cone, lit from the left.
function mound(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(3, Math.round(14 * p.scale * s));
  const w = Math.round(h * 1.1) + 2;
  for (let r = 0; r < h; r += 1) {
    const half = Math.round((w / 2) * (1 - r / h) ** 0.7 + (hash(r, p.seed, 4) - 0.5));
    if (half < 1) break;
    row(g, base - 1 - r, p.x - half, p.x + half, (x) => pal.mound[x < p.x ? 0 : x < p.x + half / 2 ? 1 : 2]);
  }
}

// A fallen dead tree: a bleached log with two broken stubs.
function deadTree(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(6, Math.round(16 * p.scale * s));
  const left = p.x - (w >> 1);
  rect(g, pal.dead[1], left, base - 2, w, 2);
  rect(g, pal.dead[0], left, base - 2, w, 1);
  rect(g, pal.dead[2], left + w - 1, base - 2, 1, 2);
  rect(g, pal.dead[2], left + 2, base - 4, 1, 2);
  rect(g, pal.dead[1], left + w - 4, base - 4, 1, 2);
}

// Tall grass: a tuft of blades that bend in the wind.
function grass(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(2, Math.round((6 + (p.seed % 4)) * p.scale * s));
  const blades = [
    [-0.6, -1, 0.5],
    [-0.2, -1, 0.3],
    [0.2, -1, 0.35],
    [0.6, -1, 0.5],
  ];
  for (const [dx, dy, droop] of blades) {
    stroke(g, p.x, base - 1, dx, dy, length, droop, 1, [pal.grass[1], pal.grass[0]]);
  }
}

// Small wildflowers, yellow, white, pink and violet.
function wildflower(g, p, s, base) {
  const { pal } = g;
  const stem = Math.max(2, Math.round((4 + (p.seed % 4)) * p.scale * s));
  const colour = pal.flower[p.seed % pal.flower.length];
  crossFlower(g, p, base, { stem, stemTone: pal.stem, colour, bud: s < 0.5 });
}

function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const prideX = Math.round(cols * (rand() < 0.5 ? 0.2 : 0.8));
  scatter(plants, ctx, { kind: "hills", count: Math.round(cols / 50), born: [1, 2], scale: [1.1, 1.6], layer: -1 });
  scatter(plants, ctx, { kind: "kopje", count: Math.round(cols / 45), born: [1, 3], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, {
    kind: "acacia",
    count: Math.round(cols / 22),
    born: [1, 4],
    scale: [0.55, 1.3],
    depth: [2, 12],
  });
  scatter(plants, ctx, {
    kind: "scrub",
    count: Math.round(cols / 14),
    born: [2, 5],
    scale: [0.8, 1.3],
    depth: [1, 13],
  });
  scatter(plants, ctx, {
    kind: "mound",
    count: Math.round(cols / 40),
    born: [2, 6],
    scale: [0.8, 1.2],
    depth: [3, 13],
  });
  scatter(plants, ctx, { kind: "dead", count: Math.round(cols / 50), born: [3, 6], scale: [0.9, 1.3], depth: [4, 13] });
  scatter(plants, ctx, { kind: "grass", count: Math.round(cols / 4), born: [0, 3], scale: [0.8, 1.3], depth: [0, 15] });
  scatter(plants, ctx, {
    kind: "flower",
    count: Math.round(cols / 9),
    born: [1, 5],
    scale: [0.8, 1.3],
    depth: [0, 14],
  });
  plants.push(makePlant(rand, "pride", prideX, { born: 1, depth: 1 }));
  plants.push(makePlant(rand, "migration", 0, { layer: 0, born: 3, herd: Math.round(cols / 18) }));
  for (const p of plants) {
    if (["kopje", "acacia", "scrub", "mound", "dead"].includes(p.kind)) {
      p.scale *= clearing(p.x, cols);
    }
  }
  // Nothing stands in front of the pride rock, and no crown overhangs it or its shoulder.
  const crown = (p) => (p.kind === "acacia" ? acaciaGeom(p, 1, 0, 0).half + 4 : 3);
  const clear = ["kopje", "acacia", "scrub", "mound", "dead"];
  const out = prideDir(prideX, cols);
  const lo = prideX - (out > 0 ? PRIDE_BACK : PRIDE_TIP);
  const hi = prideX + (out > 0 ? PRIDE_TIP : PRIDE_BACK);
  const kept = plants.filter((p) => !clear.includes(p.kind) || p.x <= lo - crown(p) || p.x >= hi + crown(p));
  sortPlants(kept);
  return kept;
}

// Dry red-brown earth with tan patches; grass seeds along the top edge.
function soil(pal, x, y, depth, turf) {
  if (y === 0 && hash(x, 0, 5) < turf * 0.5) return pal.grass[2];
  const n = hash(x, y, 11);
  if (n < 0.1 + depth * 0.22) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures

// A maned lion, drawn by the cat family's felidAt: he paces his ledge and rests on it, his feet on the
// rock at row y. While l.roar holds the seconds into a roar, he stands and roars, his mane bristling
// and rings of sound leaving his mouth.
function lionAt(g, l, y, time) {
  if (g.trace) return g.trace.draw(lionAt, g, l, y, time);
  felidAt(g, { ...l, kind: "lion", x: l.x + l.dir * LION_FELID, y }, time);
}

// What the cub is doing: "bound", "walk" (feet moving, including a stride it is finishing), "stand",
// "sit" or "pounce" (the stopped poses).
function cubMode(c) {
  if (c.pose === "bound") return "bound";
  if (c.moving || (c.c ?? 0) - Math.floor(c.c ?? 0) > 1e-6) return "walk";
  if (c.pose === "stand" || c.pose === "up") return "stand";
  if (c.state === "sit") return c.pose === "pounce" ? "pounce" : "sit";
  return "stand";
}

const CUB_SHADOW = "rgba(40, 25, 10, 0.2)";

// A shape the build knows, for a rest pose name the scene uses.
const shapeOf = (name) =>
  name === "pounce" ? "bow" : ["stand", "sit", "lie", "bow", "arch"].includes(name) ? name : "sit";

// A lion cub, x at the middle of its body, in the lion's palette (g.pal.lion). Walking, standing, sitting,
// looking up, pouncing (c.pose "pounce", picked by rest() as a stop's pose) and bounding.
function cubAt(g, c, time) {
  if (g.trace) return g.trace.draw(cubAt, g, c, time);
  const pal = g.pal.lion;
  const dir = c.dir;
  const x = Math.round(c.x);
  const y = c.y ?? g.groundY + 7;
  const mode = cubMode(c);
  const spec = c.pose === "up" || c.pose === "sitUp" ? LION_CUB_UP : LION_CUB;
  const since = c.since == null ? 100 : time - c.since;
  const still = c.still ?? 0;
  let pose = {
    phase: 0,
    amp: 0,
    bodyX: c.x * dir,
    sway: Math.sin(time * 1.4 + (c.seed ?? 0) * 6) * 0.6,
    breath: Math.sin(time * 2.2) > 0.2 ? 1 : 0,
    blink: ((time + (c.seed ?? 0) * 7) / 3.3) % 1 < 0.04,
    headUp: c.look ?? 0,
    rest: null,
  };
  let air = 0;
  if (mode === "walk") {
    const phase = frac(c.c ?? 0);
    pose = { ...pose, phase, amp: c.amp ?? 1, sway: Math.sin(phase * 2 * Math.PI) * 0.75, breath: 0 };
    // Getting up out of a rest: the sit eases back to standing as the first step starts.
    if (c.lastPose && since < CUB_RISE) pose.rest = { from: shapeOf(c.lastPose), to: "stand", u: since / CUB_RISE };
  } else if (mode === "sit") {
    const from = c.wasPose === "pounce" ? POUNCE[3] : 0.1;
    pose.amp = Math.max(0, 1 - still / CUB_EASE);
    pose.rest = { from: "stand", to: "sit", u: (still - from) / 0.5 };
  } else if (mode === "stand") {
    pose.amp = Math.max(0, 1 - still / CUB_EASE);
  } else if (mode === "pounce") {
    const t = time - (c.poseAt ?? time);
    const [bow, wiggle, spring, land] = POUNCE;
    pose.amp = 0;
    if (t < bow) pose.rest = { from: "stand", to: "bow", u: t / bow };
    else if (t < wiggle) {
      pose.rest = { from: "stand", to: "bow", u: 1 };
      pose.sway = Math.sin((t - bow) * 22) * 0.9;
    } else if (t < spring) {
      const s = (t - wiggle) / (spring - wiggle);
      air = Math.round(BOUND_AIR * 1.5 * Math.sin(Math.PI * clamp(s * 1.6, 0, 1)));
      pose.amp = s < 0.65 ? 1 : 0;
      pose.phase = 0.85;
      pose.rest = { from: "bow", to: "stand", u: s < 0.65 ? s : 1 };
    } else if (t < land) pose.rest = { from: "bow", to: "stand", u: (t - spring) / (land - spring) };
  } else if (mode === "bound") {
    const u = frac(c.bd ?? 0);
    pose.sway = 1.2;
    pose.headUp = 0;
    if (u < BOUND_GROUND) {
      // Gathered: the back arched, the feet drawn in under it.
      pose.rest = { from: "stand", to: "arch", u: 1 };
    } else {
      // In the air: stretched, the forelegs reaching and the hind pushed back, rising and falling.
      const s = (u - BOUND_GROUND) / (1 - BOUND_GROUND);
      air = Math.round(BOUND_AIR * Math.sin(Math.PI * s));
      pose.amp = 1;
      pose.phase = 0.85;
      pose.rest = { from: "arch", to: "stand", u: clamp(s * 1.4, 0, 1) };
    }
  }
  const at = (dx) => (dir > 0 ? x - spec.mid + dx : x + spec.mid - dx);
  const [s0, s1] = spec.shadow;
  const lift = air > 0 ? 1 : 0;
  g.ctx.fillStyle = CUB_SHADOW;
  g.ctx.fillRect(Math.min(at(s0 + lift), at(s1 - lift)), y, Math.abs(s1 - s0) - 2 * lift, 1);
  drawBody(
    spec,
    pal,
    (dx, h, colour) => {
      g.ctx.fillStyle = colour;
      g.ctx.fillRect(at(dx), y - 1 - h - air, 1, 1);
    },
    pose,
  );
}

// The great migration, far off along the horizon: a long file of wildebeest, each a few pixels of
// hump, horns and legs, trotting across the page and round again. It is sown as one plant of the
// far row, so it walks in front of the hills and behind the far acacias in their faded colours, and
// it stands still under reduced motion.
function migration(g, p, s, base) {
  if (s < 1) return;
  const [dark, shade] = g.pal.wildebeest;
  const y = base - 1;
  const span = g.cols + 120;
  for (let i = 0; i < p.herd; i += 1) {
    const x = Math.round(((i * 7 + (i % 3) * 2 + g.time * 5) % span) - 60);
    const step = Math.floor(g.time * 4 + i) % 2;
    rect(g, dark, x, y - 3, 3, 2);
    rect(g, dark, x + 3, y - 3, 1, 1);
    rect(g, shade, x + 1, y - 4, 1, 1);
    rect(g, shade, x + (step ? 0 : 1), y - 1, 1, 1);
    rect(g, shade, x + (step ? 2 : 3), y - 1, 1, 1);
  }
}

// A secretary bird, long-legged and crested, built from parts (kit/groundbird.js): it walks, and
// stopped it stamps its prey, preens or stretches a wing. Its palette is secretary: [grey, black,
// face, white], with groundShadow beside it.
function secretaryAt(g, b, time) {
  if (g.trace) return g.trace.draw(secretaryAt, g, b, time);
  groundBirdAt(g, b, "secretary", time);
}

// A lilac-breasted roller in flight, the small flyers' design in its own colours.
function rollerAt(g, r, time) {
  if (g.trace) return g.trace.draw(rollerAt, g, r, time);
  flyerAt(g, r, time, "roller");
}

// A low sun at golden hour, or a moon at night, with a soft halo. Drawn still under reduced motion.
function sunAt(g, f) {
  const [disc, halo] = g.pal.sun;
  const cx = Math.round(f.cols * 0.72);
  const cy = f.groundY - 28;
  for (const [r, alpha] of [
    [14, 0.12],
    [9, 0.22],
  ]) {
    g.ctx.globalAlpha = alpha;
    blob(g, cx, cy - r, r * 2, r * 2, () => halo);
  }
  g.ctx.globalAlpha = 1;
  blob(g, cx, cy - 4, 8, 8, () => disc);
}

// A mote of dust drifting in the air, from the left edge to the right.
function mote(f) {
  return {
    x: f.rand() * f.cols,
    y: f.groundY - 4 - f.rand() * 46,
    vx: 1 + f.rand() * 2,
    phase: f.rand() * 6.28,
    tone: f.rand() < 0.5 ? 0 : 1,
  };
}

// Where the lion's middle may be on his ledge, and the row his feet stand on.
function ledgeOf(f) {
  const pride = f.plants.find((p) => p.kind === "pride");
  const out = prideDir(pride.x, f.cols);
  const ends = [pride.x + out * (PRIDE_SHELF + LION_HALF), pride.x + out * (PRIDE_TIP - LION_HALF)];
  return {
    span: [Math.min(...ends), Math.max(...ends)],
    y: f.groundY + 1 - prideLedge(pride, 1),
    out,
    home: pride.x + out * CUB_HOME,
  };
}

// The lion paces his ledge, turning back at either end.
function pace(f, lion, dt) {
  wander(f, lion, dt, { speed: 3, stride: 4, sit: [6, 12], walk: [2, 5] });
  if (!lion.active) return;
  const [lo, hi] = f.extra.ledge.span;
  const mid = lion.x + lion.dir * LION_MID;
  if (mid < lo || mid > hi) {
    lion.dir = mid < lo ? 1 : -1;
    lion.x = clamp(mid, lo, hi) - lion.dir * LION_MID;
  }
}

// Whether a cub has strayed to an edge of the page, having been well away from both since it was
// last called, so that a cub sent home near an edge does not set off another call at once.
function strayed(f, cub) {
  const gap = Math.min(cub.x, f.cols - cub.x);
  if (gap > CUB_ARM) cub.armed = true;
  return cub.armed && gap <= CUB_EDGE;
}

// Keeps a cub's clocks once a step: call it after wander() or call(), with x0 where the cub stood before
// them. c.c is the stride clock (critters.js stride): a foot planted on the ground stays put, and a
// cub that stops finishes its stride in CUB_STRIDE[1] s. c.amp eases the walk in and out. c.bd counts
// bounds as the cub covers ground (a bound is BOUND_LEN px, not a stride). c.look eases the head up.
function cubStep(f, c, x0, dt) {
  const bounding = c.pose === "bound";
  if (bounding) {
    c.c = Math.round(c.c ?? 0);
    c.moving = true;
    c.still = 0;
    c.bd = (c.bd ?? 0) + Math.abs(c.x - x0) / BOUND_LEN;
  } else {
    stride(c, x0, dt, CUB_STRIDE[0], CUB_STRIDE[1]);
  }
  const held = (c.c ?? 0) - Math.floor(c.c ?? 0) > 1e-6;
  const go = c.moving || held ? 1 : 0;
  c.amp ??= go;
  c.amp += (go - c.amp) * Math.min(1, dt / (go ? 0.08 : 0.12));
  if (Math.abs(go - c.amp) < 0.01) c.amp = go;
  settle(f, c);
  if (c.pose !== c.wasPose) {
    c.wasPose = c.pose;
    c.poseAt = f.time;
  }
  // The head: up while the lion roars (pose "up" or "sitUp"), and a glance up now and then when it
  // is stopped, a pixel or two, so a standing or sitting cub is never still.
  const stopped = !c.moving && !held;
  const glance = stopped && frac(f.time / 4.7 + (c.seed ?? 0)) < 0.17 ? 0.5 : 0;
  const goal = c.pose === "up" || c.pose === "sitUp" ? 1 : glance;
  c.look ??= goal;
  c.look += (goal - c.look) * Math.min(1, dt * 9);
  if (Math.abs(goal - c.look) < 0.02) c.look = goal;
}

// The lion calls a cub home. A cub straying to an edge sets it off, or, when the lion has been quiet
// a long while (x.roar.next), the cub farthest from the rock. The cub stops; the lion walks to the
// end of his ledge nearest it, turns to it and roars; the cub looks up, then bounds home to the foot
// of the rock under the ledge and sits; the other cubs stop and look up at the rock while he roars.
// Returns the animals the call is moving, which do not wander meanwhile.
function call(f, dt) {
  const x = f.extra;
  const { lion, ledge } = x;
  const cubs = x.cubs.filter((c) => c.active);
  if (!x.call) {
    if (!lion.active || !cubs.length) return [];
    const far = (a, b) => (Math.abs(b.x - ledge.home) > Math.abs(a.x - ledge.home) ? b : a);
    const cub = cubs.find((c) => strayed(f, c)) ?? (f.time >= x.roar.next ? cubs.reduce(far) : null);
    if (!cub) return [];
    const [lo, hi] = ledge.span;
    cub.armed = false;
    cub.pose = "stand";
    x.call = { cub, end: Math.abs(cub.x - lo) < Math.abs(cub.x - hi) ? lo : hi, roar: null, speed: 0 };
    x.roar.next = Infinity;
  }
  const c = x.call;
  const { cub } = c;
  const mid = lion.x + lion.dir * LION_MID;
  if (c.roar === null) {
    if (Math.abs(c.end - mid) > 1) {
      lion.state = "walk";
      lion.dir = Math.sign(c.end - mid);
      lion.x = mid + lion.dir * Math.min(LION_STRIDE * dt, Math.abs(c.end - mid)) - lion.dir * LION_MID;
      lion.phase += dt * 6;
    } else {
      lion.state = "stand";
      lion.dir = cub.x > mid ? 1 : -1;
      lion.x = c.end - lion.dir * LION_MID;
      c.roar = 0;
      cub.pose = "up";
      cub.dir = ledge.home > cub.x ? 1 : -1;
    }
    return [lion, cub];
  }
  c.roar += dt;
  lion.roar = c.roar < ROAR ? c.roar : null;
  const looking = c.roar >= 0.1 && c.roar < ROAR + 0.4;
  const others = cubs.filter((o) => o !== cub);
  for (const o of others) {
    o.pose = looking ? (o.state === "walk" ? "up" : "sitUp") : null;
    if (looking) o.dir = ledge.home > o.x ? 1 : -1;
  }
  if (cub.pose !== null && c.roar >= ROAR * 0.6) {
    const left = ledge.home - cub.x;
    c.speed ||= Math.max(CUB_BOUND, Math.abs(left) / 6);
    cub.pose = "bound";
    cub.dir = Math.sign(left) || cub.dir;
    cub.phase += dt * 8;
    if (Math.abs(left) > c.speed * dt) cub.x += cub.dir * c.speed * dt;
    else Object.assign(cub, { x: ledge.home, pose: null, state: "sit", timer: 4, dir: ledge.out });
  }
  if (cub.pose === null && !looking) {
    x.call = null;
    lion.state = "sit";
    lion.timer = 6;
    x.roar.next = f.time + QUIET[0] + f.rand() * QUIET[1];
  }
  return looking ? [lion, cub, ...others] : [lion, cub];
}

// The pool: it starts under the muzzle as the giraffe lowers its head to drink, and is left to dry once
// the giraffe walks on.
function drink(f, giraffe) {
  const x = f.extra;
  const drinking = giraffe.active && giraffe.state !== "walk" && giraffe.pose === "drink";
  if (drinking && !(x.puddle && x.puddle.end === null)) {
    const [reach] = giraffeMuzzle("drink");
    x.puddle = { x: Math.round(giraffe.x + giraffe.dir * reach), start: f.time, end: null };
  } else if (!drinking && x.puddle) {
    if (x.puddle.end === null) x.puddle.end = f.time;
    else if (f.time - x.puddle.end > PUDDLE_FADE) x.puddle = null;
  }
}

// Whether the browsing giraffe's head would be in an acacia's leaves where it stands, facing the way it
// goes: the muzzle has to be under the roof's width and at the height of its leaves, in the rows and on the
// centre acaciaGeom gives, which the painter draws from, at the tree's size now and in this frame's wind.
// Plants not yet grown draw smaller, as they do on the page.
function browsable(f, giraffe) {
  const [reach, high] = giraffeMuzzle("browse");
  const mx = giraffe.x + giraffe.dir * reach;
  const my = f.groundY + 7 - 1 - high;
  return f.plants.some((p) => {
    if (p.kind !== "acacia") return false;
    const s = smooth(clamp((p.shown - p.born) / ACACIA_MATURE, 0, 1));
    const geom = acaciaGeom(p, s, f.groundY + p.depth, f.time);
    if (geom.total < 20) return false;
    return (
      Math.abs(mx - geom.cx) <= geom.half * 0.7 && my <= geom.under + BROWSE_REACH && my >= geom.top - BROWSE_REACH
    );
  });
}

// What the giraffe does when it stops: browse if an acacia crown is in reach of its head, otherwise
// drink or stand chewing.
function giraffeStop(f, giraffe) {
  return browsable(f, giraffe) ? ["browse"] : ["drink", "chew"];
}

// The pool the giraffe drinks from, a little water on the ground under its muzzle. It appears as the
// giraffe starts to drink and dries after it has gone, with rings spreading from where it sips.
function puddleAt(g, p, time) {
  const [deep, light, white] = g.pal.water;
  const grow = smooth(clamp((time - p.start) / 1.2, 0, 1));
  const dry = p.end === null ? 1 : 1 - clamp((time - p.end) / PUDDLE_FADE, 0, 1);
  if (dry <= 0) return;
  const y = g.groundY + 7;
  g.ctx.globalAlpha = grow * dry * 0.9;
  rect(g, deep, p.x - 6, y, 13, 1);
  rect(g, deep, p.x - 5, y + 1, 11, 1);
  rect(g, light, p.x - 3, y, 7, 1);
  if (p.end === null) {
    const r = Math.floor(((time * 1.5) % 1) * 3);
    g.ctx.globalAlpha = grow * 0.75;
    rect(g, white, p.x - 1 - r, y, 1, 1);
    rect(g, white, p.x + 1 + r, y, 1, 1);
  }
  g.ctx.globalAlpha = 1;
}

const extras = {
  init(f) {
    return {
      motes: Array.from({ length: MOTES }, () => mote(f)),
      mists: Array.from({ length: MISTS }, () => mistBand(f, 26, 30)),
      ledge: ledgeOf(f),
      zebra: walker(f),
      foal: walker(f, 0.6),
      giraffe: walker(f),
      puddle: null,
      secretary: walker(f),
      elephant: walker(f),
      calf: walker(f, 0.5),
      lion: walker(f),
      cheetah: walker(f),
      cubs: Array.from({ length: 3 }, () => ({ ...walker(f), pose: null, armed: false, seed: f.rand() })),
      call: null,
      roar: { next: Infinity },
      roller: { next: 3, bird: null },
      flamingo: { next: 6, bird: null },
      vultures: circlingPair(f, 40 + f.rand() * 8, { rate: 0.18, gap: 6 }),
    };
  },

  // The secretary bird comes at stage 1. The lion comes on last, at stage 8, on the pride rock, and
  // his cubs with him (one on a phone); his first call comes a little after. The elephant pair
  // comes at 7. The cheetah comes at 6, by day and not on a phone: the plain is already full.
  onGrow(f) {
    const x = f.extra;
    if (f.stage >= 1) enter(f, x.secretary);
    if (f.stage >= 2) enter(f, x.zebra);
    if (f.stage >= 4) {
      enter(f, x.giraffe);
      if (!narrow(f)) enterBehind(f, x.foal, x.zebra, ZEBRA_GAP);
    }
    if (f.stage >= 6 && !narrow(f)) enter(f, x.cheetah);
    if (f.stage >= 7) {
      enter(f, x.elephant);
      enterBehind(f, x.calf, x.elephant, 12);
    }
    if (f.stage >= 8 && !x.lion.active) {
      const [lo, hi] = x.ledge.span;
      x.lion.active = true;
      x.lion.x = (lo + hi) / 2 - x.lion.dir * LION_MID;
      x.roar.next = f.time + 20;
    }
    if (f.stage >= 8) for (const cub of narrow(f) ? x.cubs.slice(0, 1) : x.cubs) enter(f, cub);
  },

  busy: () => true,

  update(f, dt) {
    const x = f.extra;
    for (const m of x.motes) {
      m.x += m.vx * dt;
      m.y += Math.sin(f.time * 0.6 + m.phase) * 2 * dt;
      if (m.x > f.cols + 2) {
        m.x = -2;
        m.y = f.groundY - 4 - f.rand() * 46;
      }
    }
    wander(f, x.zebra, dt, { speed: 7, stride: 8, sit: [4, 10], walk: [3, 7] });
    rest(f, x.zebra, zebraPoses(x.zebra));
    follow(x.foal, x.zebra, dt, ZEBRA_GAP);
    for (const k of ["state", "phase", "timer", "pose"]) x.foal[k] = x.zebra[k];
    settle(f, x.foal);
    const giraffe = x.giraffe;
    wander(f, giraffe, dt, { speed: 5, stride: 5, sit: [5, 9], walk: [3, 6] });
    rest(f, giraffe, giraffe.state !== "walk" && !giraffe.pose ? giraffeStop(f, giraffe) : []);
    drink(f, giraffe);
    const secretaryX = x.secretary.x;
    wander(f, x.secretary, dt, { speed: groundSpeed("secretary"), stride: 1, sit: [3.2, 8], walk: [2, 4] });
    rest(f, x.secretary, groundPoses(x.secretary, "secretary"));
    groundBirdStep(f, x.secretary, dt, "secretary", secretaryX);
    wander(f, x.elephant, dt, { speed: 4, stride: 4, sit: [4, 8], walk: [4, 8] });
    settle(f, x.elephant);
    follow(x.calf, x.elephant, dt, 12);
    x.calf.state = x.elephant.state;
    x.calf.phase = x.elephant.phase;
    x.calf.timer = x.elephant.timer;
    settle(f, x.calf);
    const before = new Map(x.cubs.map((c) => [c, c.x]));
    const called = call(f, dt);
    if (called.includes(x.lion)) settle(f, x.lion);
    else {
      pace(f, x.lion, dt);
      rest(f, x.lion, felidPoses("lion"));
    }
    // The cheetah stalks slowly, then lies up in the grass or stretches; it is out by day only.
    if (!isNight(f)) {
      wander(f, x.cheetah, dt, { speed: 9, stride: 7, sit: [4, 9], walk: [3, 6] });
      rest(f, x.cheetah, felidPoses("cheetah"));
    }
    for (const cub of x.cubs) {
      if (!cub.active) continue;
      if (!called.includes(cub)) {
        wander(f, cub, dt, { speed: 6, stride: 8, sit: [2, 6], walk: [2, 5] });
        rest(f, cub, CUB_RESTS);
      }
      cubStep(f, cub, before.get(cub), dt);
    }
    if (f.stage >= 3 && !isNight(f)) {
      // Now and then the roller stops on an acacia's crown, then flies on.
      const spawn = () => ({ y: 26 + f.rand() * 36 });
      flyByPerch(f, x.roller, dt, {
        every: [5, 6],
        speed: 20,
        spawn,
        spots: perchSpots,
        small: "roller",
        drop: 2,
        odds: 0.3,
        stay: [8, 16],
      });
    } else if (x.roller.bird?.visit) goHome(f, x.roller.bird);
    if (f.stage >= 6 && !isNight(f)) {
      const spawn = () => ({ y: 22 + f.rand() * 30 });
      flyBy(f, x.flamingo, dt, { every: [8, 9], speed: 13, spawn });
    }
    for (const v of x.vultures) {
      v.active = f.stage >= 5 && !isNight(f);
      if (v.active) circlerPerch(f, v, dt, { first: [15, 25], every: [50, 40], stay: [14, 26], spots: perchSpots });
      else goHome(f, v);
    }
  },

  // A low sun, or the moon at night, is in the sky behind everything.
  drawBack(g, f) {
    sunAt(g, f);
  },

  draw(g, f) {
    const x = f.extra;
    if (f.stage >= 1) {
      for (const m of x.mists) mistAt(g, m, f.time, f.cols);
      for (const m of x.motes) {
        g.ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(f.time * 1.5 + m.phase));
        rect(g, g.pal.dust[m.tone], Math.round(m.x), Math.round(m.y), 1, 1);
      }
      g.ctx.globalAlpha = 1;
    }
    if (x.roller.bird && !isNight(f)) rollerAt(g, x.roller.bird, f.time);
    if (x.flamingo.bird && !isNight(f)) flamingoAt(g, x.flamingo.bird, f.time);
    for (const v of x.vultures) {
      if (!v.active) continue;
      circlerAt(g, "vultureAf", v, f.time);
    }
    if (x.puddle) puddleAt(g, x.puddle, f.time);
    if (x.zebra.active) zebraAt(g, x.zebra, f.time);
    if (x.foal.active) zebraAt(g, x.foal, f.time);
    if (x.giraffe.active) giraffeAt(g, x.giraffe, f.time);
    if (x.secretary.active) secretaryAt(g, x.secretary, f.time);
    if (x.elephant.active) elephantAt(g, { ...x.elephant, kind: "african" }, f.time);
    if (x.calf.active) elephantAt(g, { ...x.calf, kind: "african" }, f.time);
    if (x.cheetah.active && !isNight(f)) felidAt(g, { ...x.cheetah, kind: "cheetah" }, f.time);
    if (x.lion.active) lionAt(g, x.lion, x.ledge.y, f.time);
    for (const c of x.cubs) if (c.active) cubAt(g, c, f.time);
  },
};

export default {
  id: "serengeti",
  label: "Serengeti Savanna",
  group: "drylands",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.4, 0.62], dark: [0.45, 0.66] },
  mature: {
    hills: 2,
    kopje: 2.5,
    pride: 2.5,
    acacia: ACACIA_MATURE,
    scrub: 2,
    mound: 2,
    dead: 1.5,
    grass: 1.5,
    flower: 1.5,
    migration: 1,
  },
  paint: { hills, kopje, pride: prideRock, acacia, scrub, mound, dead: deadTree, grass, flower: wildflower, migration },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "...mmmmmm...",
      ".mmmmmmmmmm.",
      ".mmffffffmm.",
      "mmffffffffmm",
      "mmfdffffdfmm",
      "mmffffffffmm",
      "mmfffllfffmm",
      "mmfflddlffmm",
      ".mmfllllfmm.",
      ".mmmfllfmmm.",
      "..mmmmmmmm..",
      "....mmmm....",
    ],
    colours: { m: "#8e5a2b", f: "#d9a25a", d: "#4e2d17", l: "#f2d59c" },
  },
};
