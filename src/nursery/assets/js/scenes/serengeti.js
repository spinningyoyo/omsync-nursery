// The Serengeti savanna at golden hour: flat-topped umbrella acacias and tall gold grass on
// red-brown soil, with blue-grey hills and a tall granite rock where a lion paces his ledge. Far
// off, the great migration streams along the horizon, wildebeest in single file. Elephants with a
// calf, a giraffe that browses the acacias, zebras, a secretary bird and three lion cubs walk the
// plain, and by day a cheetah stalks through the grass and rests in it; a roller and a flamingo fly
// over. At night it is an indigo savanna under a moon.
// When a cub strays to an edge of the page, the lion roars from his ledge and calls it home.
import { elephantAt, felidAt, felidPoses, flamingoAt, flyerAt, groundBirdAt, raptorAt } from "../kit/animals.js";
import {
  circlingPair,
  enter,
  enterBehind,
  flyBy,
  follow,
  isNight,
  narrow,
  rest,
  soarAt,
  walker,
  wander,
} from "../kit/critters.js";
import { mistAt, mistBand } from "../kit/effects.js";
import {
  blob,
  clamp,
  clearing,
  foliage,
  hash,
  line,
  makePlant,
  part,
  rect,
  row,
  scatter,
  sortPlants,
  sprite,
  stroke,
  wind,
} from "../kit/pixel.js";
import { crossFlower } from "../kit/plants.js";

const ACACIA_ROWS = 30;
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
const MISTS = 5;
const MOTES = 18;

const LIGHT = {
  acacia: ["#dcd47e", "#b8b25c", "#8d9440", "#66702e"],
  trunk: ["#6e5038", "#543a28"],
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
  giraffe: ["#eab25c", "#b8762e", "#6d4520", "#fbeccb"],
  zebra: ["#e9e4d8", "#262220", "#b3a998"],
  wildebeest: ["#5d524d", "#382f2b", "#cdbfae"],
  lion: { T: "#d9a25a", S: "#b9803f", M: "#8e5a2b", N: "#6e4220", P: "#f2d59c", D: "#4e2d17", e: "#4e2d17" },
  cheetah: { T: "#e2b464", S: "#bf8d48", P: "#f6e6c4", D: "#2e2218", e: "#2e2218" },
  roar: "#8e5a2b",
  secretary: ["#8f97a0", "#2b2f36", "#f08a3c", "#f6f2ea"],
  roller: ["#b9a0e8", "#2aa3a0", "#2f4fa6", "#1f2a3c"],
  rollerDepth: ["#7fd6cf", "#27306e", "#9c9a62"],
  flamingo: ["#f4a0bc", "#e56b8f", "#2a2630"],
  vulture: ["#3a2f2a", "#000000", "#000000", "#c8a8a0", "#a89a90"],
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
  giraffe: ["#9a7440", "#6a4a2a", "#3a2818", "#b8a478"],
  zebra: ["#a9a7b4", "#1a1820", "#7c7a88"],
  wildebeest: ["#3a3642", "#24212a", "#7c7a88"],
  lion: { T: "#9c7a52", S: "#7e6040", M: "#5e4330", N: "#46311f", P: "#c8b08a", D: "#2a1f18", e: "#2a1f18" },
  cheetah: { T: "#9e8058", S: "#866844", P: "#b8aa9a", D: "#2a2224", e: "#2a2224" },
  roar: "#e8d4a8",
  secretary: ["#5b6270", "#1e2026", "#c57532", "#b9bcc6"],
  roller: ["#7e6aa6", "#1f6e72", "#22346e", "#141a2a"],
  rollerDepth: ["#4a9c98", "#1a2150", "#6e6c48"],
  flamingo: ["#c77c98", "#a85a78", "#1c1a22"],
  vulture: ["#241d1a", "#000000", "#000000", "#8a6e68", "#6e645c"],
  dust: ["#6c6a92", "#55557e"],
  sun: ["#e4e4f6", "#5a5f9a"],
  mist: "#3a3560",
  soil: ["#4a3a36", "#3f302c", "#342724"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#14100c",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  haze: "#0d0c18",
};

// An umbrella thorn, the wide-canopy family's build: short and very wide. A thick dark trunk forks
// low into three heavy limbs that rise to one canopy, flat beneath and semi-flat on top, with a
// feathery edge. Its canopy spans 62 to 92 percent of its height and twice its height across.
function acacia(g, p, s, base) {
  const { pal } = g;
  const total = Math.max(5, Math.round(ACACIA_ROWS * p.scale * s));
  const lean = p.seed & 1 ? 1 : -1;
  const fork = Math.round(total * 0.32);
  const foot = total >= 24 ? 3 : 2;
  for (let r = 0; r < fork; r += 1) {
    const x = p.x + Math.round(lean * (r / fork)) - (foot >> 1);
    // The original's bark: the lighter brown, with the darker one only on every third row.
    rect(g, pal.trunk[r % 3 === 0 ? 1 : 0], x, base - 1 - r, foot, 1);
  }
  const sway = wind(g.time, p.x);
  const forkX = p.x + lean;
  const forkY = base - fork;
  const under = base - Math.round(total * 0.62);
  const half = Math.round(total * 0.95);
  const cx = forkX + sway + lean;
  for (const f of [-0.6, 0, 0.55]) {
    const ex = cx + Math.round(half * f);
    const side = f > 0 ? 1 : -1;
    line(g, pal.trunk[0], forkX, forkY, ex, under);
    line(g, pal.trunk[0], forkX + side, forkY, ex + side, under); // two wide all the way up
  }
  // The canopy: a superellipse, flat beneath and flattened on top, its edge thinned to look feathery.
  const H = Math.max(3, Math.round(total * 0.3));
  const top = under - H + 1;
  // Lit from above across the whole canopy: only its lowest rows take the darker tones, as today's
  // thin crown did, so a canopy this wide keeps the pale, sunlit green of the savanna.
  const shade = foliage({ cx, top, w: half * 2, h: H * 3 }, pal.acacia, p.seed);
  for (let r = 0; r < H; r += 1) {
    const u = (H - r) / H;
    const w = Math.round(half * Math.max(0, 1 - u ** 3) ** (1 / 3));
    for (let x = cx - w; x <= cx + w; x += 1) {
      const edge = x - (cx - w) < 2 || cx + w - x < 2 || r === 0;
      if (edge && hash(x, r, p.seed) < 0.35) continue;
      rect(g, shade(x, top + r), x, top + r, 1, 1);
    }
  }
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
  const crown = (p) => (p.kind === "acacia" ? Math.round(ACACIA_ROWS * p.scale * 0.95) + 4 : 3);
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

// The standing lion's legs, for the roar: each leg's column and thigh width.
const LION_LEGS = { hindNear: [1, 3], hindFar: [5, 2], foreFar: [9, 2], foreNear: [12, 3] };
// Roaring, the standing lion lifts his head a row, the jaw starting to drop, then opens it wide. An
// ear shows in the mane behind his face.
const LION_RAISED = [
  "..............NNNN.....",
  ".............NMMMMMN...",
  "............NMMTMMMMN..",
  "...........NMMMTMTTTTT.",
  "...........NMMMMMTeTTTD",
  "...........NMMMMMTTTPPP",
  "...........NMMMMMTTPPP.",
  ".....TTTTTTNMMMMMSSDDD.",
  "...TTTTTTTTNMMMMMMPDD..",
  "..TTTTTTTTTNMMMMMMMPP..",
  ".TTTTTTTTTTTNMMMMMMN...",
  ".TTTTTTTTTTTTNMMMMN....",
  ".TSSSSSSSSSSSPPPTT.....",
];
const LION_ROAR = [
  ".............NNNNN.....",
  "............NMMMMMMN...",
  "...........NMMMTMMTTT..",
  "...........NMMMTMTTTTTD",
  "...........NMMMMMTeTTPP",
  "...........NMMMMMTTTPPP",
  "...........NMMMMMTTDDD.",
  ".....TTTTTTNMMMMMTDDDD.",
  "...TTTTTTTTNMMMMMMSPPP.",
  "..TTTTTTTTTNMMMMMMMNN..",
  ".TTTTTTTTTTTNMMMMMMN...",
  ".TTTTTTTTTTTTNMMMMN....",
  ".TSSSSSSSSSSSPPPTT.....",
];
// The mane bristling round its edge, every other beat of the roar.
const LION_BRISTLE = [
  "............N.....N....",
  "...........N...........",
  "..........N............",
  ".......................",
  "..........N............",
  ".......................",
  "..........N............",
];
const ROAR_RINGS = [0.3, 0.8, 1.3]; // when each ring leaves his mouth, in seconds into the roar

// A maned lion, drawn by the cat family's felidAt, or roaring. He paces his ledge and rests on it:
// his feet stand on the rock at row y. While l.roar holds the seconds into a roar, he stands and roars.
function lionAt(g, l, y, time) {
  if (l.roar != null) {
    roaringLionAt(g, l, y, g.pal.lion);
    return;
  }
  felidAt(g, { ...l, kind: "lion", x: l.x + l.dir * LION_FELID, y }, time);
}

// The lion standing four-square and roaring, l.roar seconds in: his head lifts, his mouth opens wide
// and his mane bristles while rings of sound spread from it, fading. His tail hangs at the rump.
function roaringLionAt(g, l, y, colours) {
  const x = Math.round(l.x);
  const r = l.roar;
  const px = (colour, dx, dy, w, h) => part(g, colour, x - 4, y, l.dir, dx, dy, w, h);
  px(colours.S, 0, -8, 1, 2);
  px(colours.N, -2, -7, 2, 2);
  const open = r >= 0.25 && r < 1.75;
  sprite(g, open ? LION_ROAR : LION_RAISED, colours, x - 4, y - 5, l.dir, 0, LION_ROAR.length);
  if (open && Math.floor(r * 4) % 2 === 0) {
    sprite(g, LION_BRISTLE, colours, x - 4, y - 5, l.dir, 0, LION_ROAR.length);
  }
  for (const [[dx, w], colour] of [
    [LION_LEGS.hindFar, colours.S],
    [LION_LEGS.foreFar, colours.S],
    [LION_LEGS.hindNear, colours.T],
    [LION_LEGS.foreNear, colours.T],
  ]) {
    px(colour, dx, -5, w, 2);
    px(colour, dx, -3, Math.max(2, w - 1), 3);
  }
  const mouth = x - 4 + l.dir * 23 + (l.dir > 0 ? 0 : 1);
  for (const start of ROAR_RINGS) {
    const u = (r - start) / 0.9;
    if (u >= 0 && u < 1) ringAt(g, mouth, y - 13, l.dir, 3 + u * 12, 0.9 * (1 - u));
  }
}

// One ring of the roar: an arc ahead of the mouth at (mx, my), tilted up a little.
function ringAt(g, mx, my, dir, radius, alpha) {
  const seen = new Set();
  g.ctx.globalAlpha = alpha;
  for (let a = -60; a <= 50; a += 4) {
    const rad = ((a - 15) * Math.PI) / 180;
    const x = mx + dir * Math.round(Math.cos(rad) * radius);
    const y = my + Math.round(Math.sin(rad) * radius);
    if (seen.has(`${x},${y}`)) continue;
    seen.add(`${x},${y}`);
    rect(g, g.pal.roar, x, y, 1, 1);
  }
  g.ctx.globalAlpha = 1;
}

// A lion cub, facing right as written, in the lion's palette: T tawny, S tawny shade, P pale, D dark,
// e eye. A big round head with big ears held above a short body. Rows 0 to 5 stand on legs that
// CUB_LEGS gives as each leg's column and width.
const CUB_WALK = [".....SS.SS.", ".....STTTT.", ".....TTTeTT", "TTTTTTTTTPD", "TTTTTTTTPPP", ".SSSSSPPP.."];
const CUB_LEGS = { hindNear: [1, 2], hindFar: [3, 1], foreFar: [6, 1], foreNear: [7, 2] };
const CUB_SWING = [-1, 0, 1, 0];
// Standing and looking up, as the lion roars: the muzzle tilts up and the ears lie back.
const CUB_STAND_UP = ["........TPD", "....STTTTPP", "....SSTeTT.", "TTTTTTTTTT.", "TTTTTTTTPP.", ".SSSSSPPP.."];
// Sitting on its haunches, forepaws together in front; and sitting, looking up.
const CUB_SIT = [
  "..SS.SS..",
  "..STTTT..",
  "..TTTeTT.",
  "..TTTTPD.",
  ".TTTTPP..",
  "TTTTTPP..",
  "TTTTTPT..",
  "SSTTSPTP.",
];
const CUB_SIT_UP = [
  ".....TPD.",
  ".STTTTPP.",
  ".SSTeTT..",
  "..TTTTP..",
  ".TTTTPP..",
  "TTTTTPP..",
  "TTTTTPT..",
  "SSTTSPTP.",
];
// Bounding home: stretched out in the air with the legs reaching, then gathered on the ground with
// the back arched. Legs included; the tail runs back and its tip flicks up.
const CUB_BOUND_OUT = [
  "......SS.SS.",
  "......STTTT.",
  "D.....TTTeTT",
  "SSTTTTTTTTPD",
  "..TTTTTTTPPP",
  ".TT.SSSPP.TT",
  "TT.........T",
];
const CUB_BOUND_IN = [
  "......SS.SS.",
  "......STTTT.",
  "D..TTTTTTeTT",
  "SSTTTTTTTTPD",
  "..TTTTTTTPP.",
  "...STTSPT...",
  "....TT.TT...",
];

// A lion cub on the plain, its middle at c.x. It walks, or sits when it stops, blinking now and
// then. While the lion calls, c.pose takes over: "stand", "up" (standing, looking up), "sitUp" or
// "bound".
function cubAt(g, c, time) {
  const { T: tawny, S: shade, D: dark, P: pale } = g.pal.lion;
  const y = g.groundY + 7;
  const x = Math.round(c.x) - c.dir * 5;
  const pose = c.pose ?? (c.state === "walk" ? "walk" : "sit");
  const blink = pose === "sit" && Math.floor(time * 4 + c.phase * 3) % 14 === 0;
  const colours = { T: tawny, S: shade, P: pale, D: dark, e: blink ? tawny : dark };
  const px = (colour, dx, dy, w, h) => part(g, colour, x, y, c.dir, dx, dy, w, h);
  if (pose === "sit" || pose === "sitUp") {
    px(shade, -1, -1, 1, 1);
    px(dark, -2, -1, 1, 1);
    sprite(g, pose === "sit" ? CUB_SIT : CUB_SIT_UP, colours, x, y, c.dir, 0, CUB_SIT.length);
    return;
  }
  if (pose === "bound") {
    const out = Math.floor(c.phase) % 2 === 0;
    const grid = out ? CUB_BOUND_OUT : CUB_BOUND_IN;
    sprite(g, grid, colours, x, y - (out ? 1 : 0), c.dir, out ? 0 : 1, grid.length);
    return;
  }
  px(shade, -2, -5, 2, 1);
  px(dark, -2, -6, 1, 1);
  sprite(g, pose === "up" ? CUB_STAND_UP : CUB_WALK, colours, x, y - 2, c.dir, 0, CUB_WALK.length);
  const walking = pose === "walk";
  const k = walking ? Math.floor(c.phase) % 4 : 0;
  const leg = (colour, [dx, w], phase) => {
    const foot = walking ? CUB_SWING[phase % 4] : 0;
    px(colour, dx, -2, w, 1);
    px(colour, dx + foot, -1, w, 1);
  };
  leg(shade, CUB_LEGS.hindFar, k + 2);
  leg(shade, CUB_LEGS.foreFar, k);
  leg(tawny, CUB_LEGS.hindNear, k);
  leg(tawny, CUB_LEGS.foreNear, k + 2);
}

// A giraffe, a head taller than anything else on the plain: long legs, a body sloping down to the
// rump, and a long neck rising at a steep slant with a dark mane, up to the ossicones. When it
// stops it browses, its head dipping into the acacia leaves. Its palette is giraffe: [fur, patch,
// dark, muzzle].
function giraffeAt(g, n, time) {
  const [fur, patch, dark, muzzle] = g.pal.giraffe;
  const x = Math.round(n.x);
  const y = g.groundY + 7;
  const step = Math.floor(n.phase) % 2;
  const walking = n.state === "walk";
  const px = (colour, dx, dy, w, h) => part(g, colour, x, y, n.dir, dx, dy, w, h);
  const leg = (dx, lift) => px(dark, dx, -12, 1, lift ? 10 : 12);
  leg(3, walking && step === 0);
  leg(5, walking && step === 1);
  leg(11, walking && step === 1);
  leg(13, walking && step === 0);
  px(fur, 2, -17, 13, 5);
  px(fur, 8, -18, 7, 1);
  px(fur, 11, -19, 4, 1);
  px(patch, 4, -16, 2, 2);
  px(patch, 8, -15, 2, 2);
  px(patch, 11, -17, 2, 2);
  px(patch, 6, -14, 1, 1);
  px(dark, 1, -16, 1, 5);
  const dip = !walking && Math.sin(time * 0.8 + n.phase) > 0.3 ? 1 : 0;
  for (let i = 0; i < 12; i += 1) {
    const nx = 12 + Math.round(i * 0.42);
    px(fur, nx, -20 - i, 3, 1);
    px(patch, nx - 1, -20 - i, 1, 1);
    if (i % 4 === 2) px(patch, nx + 1, -20 - i, 1, 1);
  }
  const hy = -34 + dip;
  px(fur, 16, hy, 4, 3);
  px(muzzle, 19, hy + 1, 2, 2);
  px(dark, 17, hy - 2, 1, 2);
  px(dark, 19, hy - 2, 1, 2);
  px(dark, 18, hy + 1, 1, 1);
}

// A plains zebra on the deer family's build, heavier: a thick neck with an upright black mane, a long
// head with a dark muzzle, chevron stripes that follow the body, a grey belly, banded near legs and
// grey far legs. The foal (scale below 1) is drawn on its own. W white, K black, S the belly's grey.
const ZEBRA = [
  "..............KK....",
  "............KKWWWW..",
  "...........KWKWKWW..",
  "..........KKWWWWWWWK",
  ".........KWWKWW..WKK",
  "........KWKWWKW.....",
  ".WWWWKWKWKWKWW......",
  "KKKKKKWKWKWWKW......",
  "KWWWWKWKWWKWKW......",
  "KWKKKWWWWWWWWW......",
  ".SSSSSSSSSSSSS......",
];
const ZEBRA_FOAL = [
  "........KK..",
  ".......KWWWK",
  "......KWKWWW",
  ".....KKWWW..",
  ".WWKWKWKW...",
  "KKWKWKWKW...",
  "KWWKWWWWW...",
  ".SSSSSSS....",
];
// Its palette is zebra: [white, black, belly].
function zebraAt(g, z, _time) {
  const [white, black, belly] = g.pal.zebra;
  const foal = z.scale < 1;
  const grid = foal ? ZEBRA_FOAL : ZEBRA;
  const tall = foal ? 4 : 6;
  const w = foal ? 1 : 2;
  const x = Math.round(z.x);
  const y = g.groundY + 7;
  const walking = z.state === "walk";
  (foal ? [2, 3, 6, 7] : [2, 4, 10, 12]).forEach((dx, i) => {
    const up = walking && (Math.floor(z.phase) % 2 === 0) === (i === 0 || i === 3);
    const h = up ? tall - 1 : tall;
    const far = i === 1 || i === 2;
    part(g, far ? belly : white, x, y, z.dir, dx, -tall, w, h);
    if (!far) for (let r = 1; r < h - 1; r += 2) part(g, black, x, y, z.dir, dx, -tall + r, w, 1);
    part(g, black, x, y, z.dir, dx, -tall + h - 1, w, 1);
  });
  sprite(g, grid, { W: white, K: black, S: belly }, x, y - tall, z.dir, 0, grid.length);
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

// A secretary bird, long-legged and crested, walking. Its palette is secretary: [grey, black,
// face, white].
function secretaryAt(g, b, _time) {
  groundBirdAt(g, b, "secretary");
}

// A lilac-breasted roller in flight, the small flyers' design in its own colours.
function rollerAt(g, r, time) {
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

const extras = {
  init(f) {
    return {
      motes: Array.from({ length: MOTES }, () => mote(f)),
      mists: Array.from({ length: MISTS }, () => mistBand(f, 26, 30)),
      ledge: ledgeOf(f),
      zebra: walker(f),
      foal: walker(f, 0.6),
      giraffe: walker(f),
      secretary: walker(f),
      elephant: walker(f),
      calf: walker(f, 0.5),
      lion: walker(f),
      cheetah: walker(f),
      cubs: Array.from({ length: 3 }, () => ({ ...walker(f), pose: null, armed: false })),
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
      if (!narrow(f)) enterBehind(f, x.foal, x.zebra, 9);
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
    wander(f, x.zebra, dt, { speed: 7, stride: 8, sit: [2, 5], walk: [3, 7] });
    follow(x.foal, x.zebra, dt, 9);
    x.foal.state = x.zebra.state;
    x.foal.phase = x.zebra.phase;
    wander(f, x.giraffe, dt, { speed: 5, stride: 5, sit: [4, 8], walk: [3, 6] });
    wander(f, x.secretary, dt, { speed: 6, stride: 8, sit: [2, 4], walk: [2, 4] });
    wander(f, x.elephant, dt, { speed: 4, stride: 4, sit: [4, 8], walk: [4, 8] });
    follow(x.calf, x.elephant, dt, 12);
    x.calf.state = x.elephant.state;
    x.calf.phase = x.elephant.phase;
    const called = call(f, dt);
    if (!called.includes(x.lion)) {
      pace(f, x.lion, dt);
      rest(f, x.lion, felidPoses("lion"));
    }
    // The cheetah stalks slowly, then lies up in the grass or stretches; it is out by day only.
    if (!isNight(f)) {
      wander(f, x.cheetah, dt, { speed: 9, stride: 7, sit: [4, 9], walk: [3, 6] });
      rest(f, x.cheetah, felidPoses("cheetah"));
    }
    for (const cub of x.cubs) {
      if (!called.includes(cub)) wander(f, cub, dt, { speed: 6, stride: 8, sit: [2, 6], walk: [2, 5] });
    }
    if (f.stage >= 3 && !isNight(f)) {
      const spawn = () => ({ y: 26 + f.rand() * 36 });
      flyBy(f, x.roller, dt, { every: [5, 6], speed: 20, spawn });
    }
    if (f.stage >= 6 && !isNight(f)) {
      const spawn = () => ({ y: 22 + f.rand() * 30 });
      flyBy(f, x.flamingo, dt, { every: [8, 9], speed: 13, spawn });
    }
    for (const v of x.vultures) v.active = f.stage >= 5 && !isNight(f);
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
      const c = soarAt(f.time, v);
      raptorAt(g, { kind: "vulture", x: c.x, y: c.y, dir: c.dir }, { bank: c.bank });
    }
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
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.4, 0.62], dark: [0.45, 0.66] },
  mature: {
    hills: 2,
    kopje: 2.5,
    pride: 2.5,
    acacia: 3.5,
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
