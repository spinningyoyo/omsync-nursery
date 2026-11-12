// Wonderland, after Lewis Carroll's Alice's Adventures in Wonderland: a candy-bright garden of
// giant spotted mushrooms in many colours (red the most), painted roses, playing-card hedges,
// wildflowers, a tea table, great bare gnarled trees and a few leafless weeping willows, placed
// anew on each visit with the Cheshire Cat's tree kept out of the middle. At night the mushrooms
// glow under a grinning moon. The White Rabbit, the Dodo and two card soldiers walk through, and
// now and then a soldier plays a croquet stroke with a flamingo for a mallet and a hedgehog for a
// ball; Bread-and-butterflies, a flock of cards and the Umbrella Vulture fly over; the Hatter's hat
// hovers by the tea table, where the March Hare sips his tea; the Caterpillar and the Cheshire Cat
// fade in where they sit. The creatures are flat colour with a darker shade, like the other scenes.
import { flyerAt } from "../kit/animals.js";
import {
  circlingPair,
  enter,
  enterBehind,
  flyBy,
  follow,
  isNight,
  soarAt,
  stroll,
  walker,
  wander,
} from "../kit/critters.js";
import { starField } from "../kit/effects.js";
import {
  blob,
  CLEARING,
  clamp,
  clearing,
  foliage,
  hash,
  makePlant,
  part,
  placeLandmarks,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
  sprite,
} from "../kit/pixel.js";
import { meadowFlower } from "../kit/plants.js";

const STARS = 40;
const CLOUDS = 3;
const BUBBLES = 14;
const BUTTERFLIES = 3;
const CROQUET_SECONDS = 3;
const SIP_EVERY = 6; // seconds between the March Hare's sips
const SIP_FOR = 1.6; // seconds his cup stays at his mouth
const BLINK_EVERY = 3.7; // the Cat may blink once in each of these spans, in seconds
const BLINK_FOR = 0.16;
const SWAY_EVERY = 7; // the Cat may swish his tail once in each of these spans, in seconds
const SWAY_FOR = 1.8;

// A mushroom's cap colour is its species; red is drawn most often.
const CAP_MIX = ["red", "red", "orange", "red", "purple", "red", "blue", "red", "yellow", "red"];
const CAPS = { red: "capRed", orange: "capOrange", purple: "capPurple", blue: "capBlue", yellow: "capYellow" };

const LIGHT = {
  soil: ["#d6c9ec", "#c3b6e2", "#a9c9d6"],
  fleck: ["#ffa6cb", "#a8ead2"],
  line: "rgba(255, 255, 255, 0.5)",
  wet: "#7d6a9a",
  water: ["#6fc3ff", "#b8e6ff", "#ffffff"],
  haze: "#f6f5ef",
  cloud: "#ffd9ea",
  hill: ["#ffa6cb", "#a8ead2"],
  capRed: ["#f2565a", "#dc3038", "#a81e28"],
  capOrange: ["#ffb066", "#f28a2e", "#c8651c"],
  capPurple: ["#c9a2f2", "#a674de", "#7c4cb4"],
  capBlue: ["#94d2f2", "#5fb0e0", "#3d86b8"],
  capYellow: ["#ffe27a", "#f5c63e", "#c99a20"],
  spot: "#fff8ef",
  stem: ["#fff4e0", "#e8d6b8"],
  leaf: ["#a6e9b8", "#6fcb8a", "#45a86b", "#2d7f52"],
  flowers: ["#f9a98e", "#f7b9c8", "#fcd668", "#b9a8f2"],
  centre: "#fcd668",
  body: "#6b5a3a",
  rose: ["#fffaf6", "#e0304f"],
  card: ["#fffdf6", "#7d7694", "#e0304f", "#2d2b3d"],
  lily: ["#ff9244", "#7a2f2a"],
  bread: ["#b0743c", "#f6e6a6", "#ffffff"],
  croquet: ["#f08aa8", "#7a5a40", "#c9a07a"],
  teaCloth: ["#fff8fb", "#d9c3ef"],
  wood: ["#c98e62", "#9b6a46"],
  teapot: ["#ffe9a8", "#d9b56a"],
  dormouse: "#9b948f",
  gnarl: ["#86739a", "#655475", "#483a58"],
  hollow: "#2a1d3d",
  bark: ["#8a6aa0", "#65497e"],
  whip: ["#a493c0", "#7d6a9a", "#e2d6f6"],
  hole: ["#4a3466", "#2a1d3d"],
  rim: "#c2b0e6",
  shadow: "#2a1d3d",
  rabbit: {
    w: "#fbf8f2",
    W: "#d4cce2",
    p: "#f2a6b4",
    e: "#d23a5a",
    n: "#f2a6b4",
    j: "#b8473c",
    J: "#8e3530",
    v: "#f2cf5a",
    y: "#d9a441",
  },
  dodo: {
    b: "#9d8e7d",
    B: "#7a6d60",
    g: "#7a6d60",
    k: "#e0b85a",
    K: "#b08a3a",
    w: "#efe8dc",
    e: "#2b2433",
    c: "#7a5634",
    l: "#d9a441",
  },
  hare: {
    f: "#b08060",
    F: "#8c6248",
    l: "#f2e6d2",
    s: "#e9c56a",
    e: "#2b2433",
    n: "#d88a8a",
    c: "#fbf8f2",
    C: "#f2a6b4",
  },
  caterpillar: { b: "#5fa8d9", B: "#3f7fb0", e: "#2b2433", y: "#e0b04a", Y: "#b08a3a", c: "#c9a46a" },
  cat: {
    t: "#a3967f",
    k: "#6e6354",
    T: "#857965",
    G: "#fbf8f2",
    m: "#4a3446",
    e: "#e8d24a",
    n: "#3a3026",
    p: "#e8a0a8",
  },
  hat: { H: "#3e3848", h: "#5e566c", R: "#d8343f", t: "#fbf8f2", T: "#3e3848", b: "#2a2532" },
  soldier: {
    W: "#fffdf6",
    c: "#cfc8dc",
    h: "#5a3e30",
    s: "#f2d2b5",
    e: "#2d2b3d",
    l: "#4d4658",
    y: "#a07a4a",
    Y: "#c9c4d4",
  },
  pigeon: {
    C: "#8f97a8",
    H: "#8f97a8",
    E: "#f0c040",
    K: "#d09a9a",
    T: "#6a7080",
    b: "#6a7080",
    B: "#8f97a8",
    l: "#c78a9a",
    t: "#8f97a8",
    p: "#e8eaf0",
    d: "#4a5060",
  },
  lory: {
    C: "#2f5fb0",
    H: "#d83a2f",
    E: "#14100a",
    K: "#f0a030",
    T: "#d83a2f",
    b: "#d83a2f",
    B: "#d83a2f",
    l: "#e85a4a",
    t: "#3a9a4a",
    p: "#7acc88",
    d: "#1f5a2a",
  },
  vulture: {
    K: "#2a2630",
    k: "#4d4658",
    i: "#3a2f48",
    H: "#f2c230",
    P: "#f28aa8",
    p: "#d8668c",
    e: "#2a2630",
    b: "#e9dcc4",
    w: "#d6cfe0",
  },
  smoke: "#b9a4dc",
  bubble: "#8fd0ea",
};

const DARK = {
  soil: ["#2d2a4a", "#26335a", "#1f3b48"],
  fleck: ["#b56ad0", "#4fb5a0"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#0f0b1e",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  haze: "#14102a",
  hill: ["#7a4f9a", "#3f5a78"],
  capRed: ["#ff6a70", "#e0384a", "#a82238"],
  capOrange: ["#ffae6a", "#e8843a", "#b05a24"],
  capPurple: ["#c49af0", "#9a68d8", "#6c44a8"],
  capBlue: ["#8ad6ff", "#58b0e8", "#3a7ab8"],
  capYellow: ["#ffe88a", "#f0c848", "#b89028"],
  glow: true, // the mushrooms glow, each in its cap colour
  spot: "#ffe8ff",
  stem: ["#e9e4ff", "#b8b0d8"],
  leaf: ["#4fa98a", "#3b8a72", "#2c6d5c", "#1f5049"],
  flowers: ["#f9a98e", "#f7b9c8", "#fcd668", "#b9a8f2"],
  centre: "#fcd668",
  body: "#3a3026",
  rose: ["#e9e4f0", "#ff5a7a"],
  card: ["#e8e6f2", "#5b5878", "#ff5a7a", "#17151f"],
  lily: ["#ff9a5a", "#4a1f3a"],
  bread: ["#9a6634", "#e6d690", "#e8e8f0"],
  croquet: ["#e07a98", "#6a4c34", "#b08a66"],
  teaCloth: ["#e5e0f5", "#8d7ac2"],
  wood: ["#7a5a6e", "#5b4256"],
  teapot: ["#f6e7a6", "#c4a85a"],
  dormouse: "#8a8698",
  gnarl: ["#54446a", "#3e3152", "#2a2139"],
  hollow: "#0c0715",
  bark: ["#5a4170", "#3f2d52"],
  whip: ["#6e5a92", "#54447a", "#ff9ae0"],
  hole: ["#1f1530", "#0c0715"],
  rim: "#4b3d68",
  shadow: "#000000",
  rabbit: {
    w: "#d9d3e6",
    W: "#a59cb8",
    p: "#c07a90",
    e: "#ff7aa0",
    n: "#c07a90",
    j: "#8a3a3a",
    J: "#682a2a",
    v: "#c8a84a",
    y: "#d9a441",
  },
  dodo: {
    b: "#6d6470",
    B: "#4f4854",
    g: "#4a4450",
    k: "#c9a85a",
    K: "#8a7238",
    w: "#c8c2cc",
    e: "#0c0912",
    c: "#5a4030",
    l: "#b08a3a",
  },
  hare: {
    f: "#8a6a58",
    F: "#6a4e40",
    l: "#d8cdb8",
    s: "#c4a050",
    e: "#0c0912",
    n: "#a86a6a",
    c: "#d9d6e6",
    C: "#c07a90",
  },
  caterpillar: { b: "#3f86b8", B: "#2a5f8a", e: "#0c0912", y: "#c9a040", Y: "#8a7238", c: "#9a7e52" },
  cat: {
    t: "#7e7568",
    k: "#4c463e",
    T: "#615a50",
    G: "#e8e6f2",
    m: "#241a2a",
    e: "#f0dc5a",
    n: "#1a1520",
    p: "#b07888",
  },
  hat: { H: "#433b55", h: "#615778", R: "#c8304a", t: "#d9d5e6", T: "#433b55", b: "#2e2840" },
  soldier: {
    W: "#e8e6f2",
    c: "#9a94b0",
    h: "#3e2a22",
    s: "#e9c3a6",
    e: "#17151f",
    l: "#3a3348",
    y: "#7a5e3a",
    Y: "#a7a2b8",
  },
  pigeon: {
    C: "#5a5f6b",
    H: "#5a5f6b",
    E: "#94782d",
    K: "#816163",
    T: "#444853",
    b: "#444853",
    B: "#5a5f6b",
    l: "#7b5863",
    t: "#5a5f6b",
    p: "#8f9196",
    d: "#303540",
  },
  lory: {
    C: "#203e70",
    H: "#862823",
    E: "#100e0c",
    K: "#946523",
    T: "#862823",
    b: "#862823",
    B: "#862823",
    l: "#8f3b33",
    t: "#276133",
    p: "#4d7f58",
    d: "#173b20",
  },
  vulture: {
    K: "#3a3350",
    k: "#544a6e",
    i: "#2a2440",
    H: "#e0b028",
    P: "#e77aa0",
    p: "#b85078",
    e: "#100c18",
    b: "#cfc2aa",
    w: "#a59cb8",
  },
  smoke: "#c9bff0",
  bubble: "#9fe6ff",
  star: ["#cfd6ff", "#ffffff"],
  moon: "#f6efd2",
  moonGrin: "#7d6e4a",
};

// Plant painters. Each takes the painter `g`, the plant `p`, its size `s` (0..1) and its base row.

// Candy-striped hills on the distant row, a dome of pink and mint stripes.
function hill(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(3, Math.round(26 * p.scale * s));
  const half = Math.round(44 * p.scale);
  for (let r = 0; r < height; r += 1) {
    const k = r / height;
    const w = Math.round(half * Math.sqrt(Math.max(0, 1 - k * k)));
    row(g, base - 1 - r, p.x - w, p.x + w, (x) => pal.hill[((x + p.seed) >> 2) & 1]);
  }
}

// A hedge of playing cards standing on their edges, each with a suit pip.
function cardHedge(g, p, s, base) {
  const { pal } = g;
  const cards = 4 + (p.seed % 3);
  const h = Math.max(3, Math.round(10 * p.scale * s));
  const left = p.x - ((cards * 4) >> 1);
  for (let i = 0; i < cards; i += 1) {
    const x = left + i * 4;
    const top = base - h;
    rect(g, pal.card[1], x, top, 4, h);
    rect(g, pal.card[0], x + 1, top + 1, 2, h - 2);
    if (h >= 6) rect(g, hash(i, p.seed, 3) < 0.5 ? pal.card[2] : pal.card[3], x + 1, top + 2, 2, 2);
  }
}

// A round rose bush with roses in it, some white and painted red.
function rose(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(3, Math.round((7 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 1.8);
  const top = base - h;
  blob(g, p.x, top, w, h, foliage({ cx: p.x, top, w, h }, pal.leaf, p.seed));
  if (s < 0.6) return;
  for (let i = 0; i < 4; i += 1) {
    const x = p.x + Math.round((hash(i, p.seed, 1) - 0.5) * (w - 4));
    const y = top + 1 + Math.round(hash(i, p.seed, 2) * (h - 4));
    rect(g, pal.rose[0], x, y, 2, 2);
    if (hash(i, p.seed, 4) < 0.6) rect(g, pal.rose[1], x, y, 1, 1);
  }
}

// A giant spotted mushroom, a cap on a stem, its cap in its species' colour. At night it glows in
// that colour.
function mushroom(g, p, s, base) {
  const { pal } = g;
  const cap = pal[CAPS[p.species] || CAPS.red];
  const total = Math.max(3, Math.round(22 * p.scale * s));
  const capH = Math.max(2, Math.round(total * 0.6));
  const capW = Math.max(4, Math.round(total * 1.1));
  const top = base - total;
  const stemW = Math.max(1, Math.round(capW * 0.3));
  p.size = s;
  p.top = top;
  if (pal.glow) {
    g.ctx.globalAlpha = 0.3;
    blob(g, p.x, top - 2, capW + 8, capH + 6, () => cap[1]);
    g.ctx.globalAlpha = 1;
  }
  rect(g, pal.stem[0], p.x - (stemW >> 1), top + capH - 1, stemW, base - top - capH + 1);
  for (let r = 0; r < capH; r += 1) {
    const f = r / (capH - 1);
    const half = Math.round((capW / 2) * (1 - 0.25 * (1 - f) ** 2));
    row(g, top + r, p.x - half, p.x + half, (x) => {
      if (r > 0 && hash(x >> 1, r >> 1, p.seed) < 0.22) return pal.spot;
      if (r === capH - 1) return cap[2];
      return x < p.x - capW / 6 ? cap[0] : cap[1];
    });
  }
}

// A tiger lily, oversized: a star of orange petals, spotted, on a tall stem with a leaf.
function tigerLily(g, p, s, base) {
  const { pal } = g;
  const stem = Math.max(3, Math.round((12 + (p.seed % 5)) * p.scale * s));
  rect(g, pal.leaf[2], p.x, base - stem, 1, stem);
  rect(g, pal.leaf[1], p.x - 2, base - Math.round(stem * 0.5), 2, 1);
  if (s < 0.45) return;
  const y = base - stem - 2;
  rect(g, pal.lily[0], p.x - 2, y - 1, 5, 3);
  rect(g, pal.lily[0], p.x - 1, y - 2, 3, 5);
  rect(g, pal.lily[1], p.x - 1, y - 1, 1, 1);
  rect(g, pal.lily[1], p.x + 1, y + 1, 1, 1);
}

// The meadow's wildflower, as it is; this palette's flowers leave out its white one.
function wildflower(g, p, s, base) {
  meadowFlower(g, p, s, base);
}

// The tea-party table. It sprouts from the soil, then gets its teapot (with the Dormouse peeping
// out of it), its cups and two chairs: the March Hare sits on the right one, the left one is the
// Hatter's, empty now but for his hat hovering nearby.
function teaTable(g, p, s, base) {
  const { pal } = g;
  p.size = s;
  if (s < 0.25) return;
  const top = base - Math.max(3, Math.round(9 * s));
  rect(g, pal.wood[1], p.x - 1, top + 2, 2, base - top - 2);
  rect(g, pal.wood[1], p.x - 3, base - 1, 7, 1);
  rect(g, pal.teaCloth[0], p.x - 7, top, 15, 2);
  rect(g, pal.teaCloth[1], p.x - 7, top + 1, 15, 1);
  rect(g, pal.teapot[0], p.x - 2, top - 3, 5, 3);
  rect(g, pal.teapot[1], p.x + 3, top - 2, 2, 1);
  rect(g, pal.teapot[0], p.x - 1, top - 4, 3, 1);
  rect(g, pal.dormouse, p.x - 1, top - 6, 3, 2);
  rect(g, pal.dormouse, p.x - 1, top - 7, 1, 1);
  rect(g, pal.dormouse, p.x + 1, top - 7, 1, 1);
  rect(g, pal.teapot[0], p.x - 6, top - 2, 2, 2);
  rect(g, pal.teapot[0], p.x + 4, top - 2, 2, 2);
  if (s < 0.9) return;
  p.seats = [p.x - 12, p.x + 12];
  p.seatRow = base - 4;
  rect(g, pal.teaCloth[1], p.x - 16, base - 1, 33, 1);
  // Each chair's back is on its outer side, away from the table.
  for (const sx of p.seats) {
    rect(g, pal.wood[0], sx - 4, base - 4, 8, 1);
    rect(g, pal.wood[1], sx - 3, base - 3, 1, 3);
    rect(g, pal.wood[1], sx + 2, base - 3, 1, 3);
    rect(g, pal.wood[1], sx < p.x ? sx - 4 : sx + 3, base - 9, 1, 6);
  }
}

// One limb of a gnarled tree: it kinks every few pixels, tapers, and hooks over at its tip like a
// finger. Halfway along it throws a side branch, and at its end it splits, `depth` times over.
function gnarlLimb(g, x, y, angle, length, width, depth, seed) {
  const { pal } = g;
  let cx = x;
  let cy = y;
  let a = angle;
  const curl = angle < 0 ? -1 : 1;
  const steps = Math.round(length);
  for (let k = 0; k < steps; k += 1) {
    const t = k / steps;
    if (k % 5 === 4) a += (hash(k, seed, 3) - 0.5) * 0.9;
    if (t > 0.7) a += (curl * 1.3) / (0.3 * steps);
    cx += Math.sin(a);
    cy -= Math.cos(a);
    const w = Math.max(1, Math.round(width * (1 - t * 0.8)));
    const px = Math.round(cx) - (w >> 1);
    const py = Math.round(cy);
    for (let i = 0; i < w; i += 1) {
      const tone = w === 1 ? 1 : i === 0 ? 0 : i >= w - 1 ? 2 : 1;
      rect(g, pal.gnarl[tone], px + i, py, 1, w > 1 ? 2 : 1);
    }
    if (depth > 0 && k === Math.round(steps * 0.45)) {
      gnarlLimb(g, cx, cy, a - curl * 0.8, length * 0.45, width * 0.45, depth - 1, seed + 3);
    }
  }
  if (depth > 0) {
    gnarlLimb(g, cx, cy, a + curl * 0.7, length * 0.4, Math.max(1, width * 0.3), depth - 1, seed + 7);
  }
}

// A great bare gnarled tree, the kind witches live by: a huge trunk with its grooves twisting
// round it, claw roots gripping the ground, a dark hollow, and a fork from which five thick limbs
// reach up and out. The Cat's tree keeps his seat in the fork and his grin in the hollow.
function witchTree(g, p, s, base) {
  const { pal } = g;
  p.size = s;
  const H = Math.max(8, Math.round(84 * p.scale * s));
  const tw = Math.max(3, Math.round(18 * p.scale * Math.max(s, 0.4)));
  const trunkH = Math.round(H * 0.4);
  const lean = (r) => Math.round(Math.sin(r * 0.11 + p.seed) * 3 * p.scale);
  const reach = Math.max(2, Math.round(12 * p.scale * Math.max(s, 0.4)));
  for (const dir of [-1, 1]) {
    for (let k = 0; k < reach; k += 1) {
      const x = p.x + lean(0) + dir * ((tw >> 1) + k);
      const h = Math.max(1, Math.round(((reach - k) / reach) ** 1.5 * 6 * p.scale));
      for (let j = 0; j < h; j += 1) {
        const tone = dir > 0 ? 2 : j === h - 1 ? 0 : 1;
        rect(g, pal.gnarl[tone], x, base - 1 - j, 1, 1);
      }
    }
  }
  for (let r = 0; r < trunkH; r += 1) {
    const waist = Math.round(Math.sin((r / trunkH) * Math.PI) * -2 * p.scale);
    const fork = r > trunkH * 0.7 ? Math.round(((r - trunkH * 0.7) / (trunkH * 0.3)) * 6 * p.scale) : 0;
    const w = tw + waist * 2 + fork * 2;
    const x0 = p.x + lean(r) - (w >> 1);
    for (let i = 0; i < w; i += 1) {
      const u = i / (w - 1);
      const twist = (i + Math.round(r * 0.35)) % 5;
      const groove = twist === 0 || (twist === 1 && hash(i, r, p.seed) < 0.3);
      const tone = Math.min(2, (u < 0.25 ? 0 : u > 0.65 ? 2 : 1) + (groove ? 1 : 0));
      rect(g, pal.gnarl[tone], x0 + i, base - 1 - r, 1, 1);
    }
  }
  const holeX = p.x + lean(Math.round(trunkH * 0.45)) - 2;
  const holeY = base - Math.round(trunkH * 0.45);
  if (s >= 0.4)
    blob(
      g,
      holeX,
      holeY - Math.round(5 * p.scale),
      Math.round(7 * p.scale),
      Math.round(10 * p.scale),
      () => pal.hollow,
    );
  const fx = p.x + lean(trunkH);
  const fy = base - trunkH;
  if (p.home) {
    p.limb = { x: fx, row: fy + 2 };
    p.grin = { x: holeX, y: holeY - 1 };
  }
  if (s < 0.3) return;
  [-1.35, -0.7, -0.15, 0.55, 1.3].forEach((a, i) => {
    const length = H * (0.55 + 0.12 * hash(i, p.seed, 2)) * (1 - Math.abs(a) * 0.12);
    const width = (Math.abs(a) > 1 ? 7 : 6) * p.scale;
    gnarlLimb(g, fx + Math.round(a * tw * 0.4), fy + 2, a, length, width, 2, p.seed + i * 13);
  });
}

// A leafless weeping willow, the magical kind: a gnarled trunk that twists as it rises and splits
// into limbs arching up and out, and from them long bare whips hanging in curtains, curling at their
// tips and swaying a little. At night the tips glow.
function willow(g, p, s, base) {
  const { pal } = g;
  p.size = s;
  const H = Math.max(6, Math.round(64 * p.scale * s));
  const tw = Math.max(2, Math.round(6 * p.scale * Math.max(s, 0.4)));
  const trunkH = Math.round(H * 0.42);
  const xAt = (r) => p.x + Math.round(Math.sin(r * 0.18 + p.seed) * 2 * p.scale);
  for (let r = 0; r < trunkH; r += 1) {
    const flare = r < 3 ? 3 - r : 0;
    const w = tw + 2 * flare - (r > trunkH * 0.7 ? 1 : 0);
    const x0 = xAt(r) - (w >> 1);
    for (let i = 0; i < w; i += 1) {
      const knot = hash(i + (r >> 2), r, p.seed) < 0.12;
      const twist = (i + Math.round(r * 0.4)) % 4 === 0;
      rect(g, knot || twist ? pal.bark[1] : pal.bark[0], x0 + i, base - 1 - r, 1, 1);
    }
  }
  const tx = xAt(trunkH);
  const ty = base - trunkH;
  if (s < 0.3) return;
  const limbs = [-1, -0.55, -0.15, 0.25, 0.65, 1];
  const sway = (k) => Math.round(Math.sin(g.time * 0.9 + k * 0.7 + p.seed) * 1.2);
  limbs.forEach((spread, li) => {
    const reach = Math.round(H * 0.5 * Math.abs(spread) + 4);
    const lift = Math.round(H * (0.45 + 0.15 * hash(li, p.seed, 1)) * (1 - Math.abs(spread) * 0.35));
    const dir = spread < 0 ? -1 : 1;
    let lastY = ty;
    for (let k = 0; k <= reach; k += 1) {
      const t = k / reach;
      const x = tx + dir * k;
      const y = Math.round(ty - lift * (1 - (1 - t) * (1 - t)) + lift * 0.35 * t * t * t);
      for (let yy = Math.min(lastY, y); yy <= Math.max(lastY, y); yy += 1) {
        rect(g, pal.bark[t < 0.4 ? 0 : 1], x, yy, t < 0.3 ? 2 : 1, 1);
      }
      lastY = y;
      if (t > 0.3 && k % 2 === 0) {
        const length = Math.round((base - y) * (0.45 + 0.4 * hash(k, li, p.seed)));
        for (let d = 1; d <= length; d += 1) {
          const bend = d > length * 0.5 ? sway(k + li) : 0;
          rect(g, hash(k, d, li) < 0.2 ? pal.whip[1] : pal.whip[0], x + bend, y + d, 1, 1);
        }
        const tip = x + sway(k + li) + dir;
        rect(g, pal.whip[1], tip, y + length, 1, 1);
        rect(g, pal.whip[2], tip + dir, y + length - 1, 1, 1);
      }
    }
  });
}

// A rabbit hole's mouth in a bank of soil, with a lilac rim.
function rabbitHole(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(3, Math.round(12 * s));
  const h = Math.max(2, Math.round(5 * s));
  blob(g, p.x, base - h - 1, w + 4, h + 2, () => pal.rim);
  blob(g, p.x, base - h, w, h, (_x, y) => (y < base - h / 2 ? pal.hole[1] : pal.hole[0]));
}

// Creatures. Each is a character grid facing right, drawn by sprite() in flat colour with a darker
// shade on its back and lower edges, no outline. A second walking frame swaps the bottom rows for
// other legs. Each palette has a colour map per creature, keyed by its grid's letters.

function stepping(grid, legs) {
  return grid.slice(0, grid.length - legs.length).concat(legs);
}

// Draws a grid with its bottom row on y - 1 and its middle column on x, facing dir.
function standAt(g, grid, colours, x, y, dir) {
  const wide = Math.max(...grid.map((line) => line.length));
  sprite(g, grid, colours, x, y - 1, dir, wide >> 1, grid.length - 1);
}

// Draws a whole sprite at an alpha, which is how a creature fades in.
function fadedAt(g, alpha, draw) {
  g.ctx.globalAlpha = alpha;
  draw();
  g.ctx.globalAlpha = 1;
}

// The White Rabbit: white, pink-eyed, upright in his jacket and waistcoat, with his watch. A lilac
// shade on his back edge keeps him off the pale sky.
const RABBIT = [
  "...ww.ww.....",
  "...wp.wp.....",
  "...wp.wp.....",
  "...wp.wp.....",
  "...Wp.Wp.....",
  "...WwwWw.....",
  "..Wwwwwwww...",
  "..Wwwwwwewn..",
  "..Wwwwwwwwww.",
  "...Wwwwwwwn..",
  "....WWwww....",
  "...jjjvvj....",
  "..Jjjjvyvj...",
  "..Jjjjvvvjww.",
  "..Jjjjvvvjyy.",
  "..JJjjjjjj.y.",
  "...JJjjjjj...",
  "...ww..ww....",
  "...Ww..Ww....",
  "..WWw.WWww...",
];
const RABBIT_STEP = stepping(RABBIT, ["....wwww.....", "...Ww..ww....", "..WWw...WWw.."]);

// A card soldier: a playing card with a head on top, thin arms and legs, and a spear. The card's
// shaded edge carries it. Its pip is a heart or a spade: 'A' is lit on a heart, 'B' on a spade.
const SOLDIER = [
  "..........Y..",
  "...hhh...YYY.",
  "..hhhhh...y..",
  "..hhsss...y..",
  "...ssess..y..",
  "....ss....y..",
  ".cWWWWWWW.y..",
  ".cKWWWWWWlyl.",
  ".cWWWWWWW.y..",
  ".cWWABAWW.y..",
  ".cWWKKKWW.y..",
  ".cWWBKBWW.y..",
  ".cWWWBWWW.y..",
  ".cWWWWWKW.y..",
  ".ccccccccc.y.",
  "...l...l..y..",
  "...l...l..y..",
  "..ll..ll.....",
];
const SOLDIER_STEP = stepping(SOLDIER, ["...l..l...y..", "..l....l..y..", ".ll....ll...."]);

// The Dodo: big and round, with a hooked beak, a curl of white tail feathers, and a walking cane.
const DODO = [
  "..........bbbb.....",
  ".........bbbbbb....",
  ".........bbebbkk...",
  ".........bbbbkkkkk.",
  "..........bbbkkkKK.",
  "..........bbb...KK.",
  "..ww.....bbbb...c..",
  ".wwww...bbbbb...c..",
  ".wwwwbbbbbbbbb..c..",
  "..wwbbbbbbbbbbb.c..",
  "..bbbbbbbbbbbbb.c..",
  "..bbbbbggggbbbbcc..",
  "..Bbbbbbggggbbbbc..",
  "...BbbbbbbbbbbBcc..",
  "....BBbbbbbbbB..c..",
  "......BBBBBB....c..",
  "......ll..ll....c..",
  "......ll..ll....c..",
  "......ll..ll....c..",
  ".....lll.lll....c..",
];
const DODO_STEP = stepping(DODO, ["......ll...ll...c..", ".....ll...ll....c..", "....lll..lll....c.."]);

// The March Hare, seated at the table with straw stuck about his head: his cup down by the table,
// then raised to his mouth for a sip.
const HARE = [
  "...ff.ff......",
  "...fF.fF......",
  "...fF.fF......",
  "..sfF.fF......",
  "...fFffFf.....",
  "..sffffffff...",
  "..Ffffffefff..",
  "..Fffffffffnn.",
  "...Fffffffff..",
  "....Ffffff....",
  "...Fffllf.....",
  "..Fffllllf....",
  "..Fffllllff...",
  "..Fffllllfff..",
  "..Fffllllf.cCc",
  "..FFfffffff.c.",
  "...FFFFffffff.",
  "..........ff..",
  "..........ff..",
  ".........Fff..",
];
const HARE_SIP = [
  ...HARE.slice(0, 7),
  "..FfffffffcCc.",
  "...Fffffffcc..",
  "....Ffffffff..",
  "...Fffllfff...",
  "..Fffllllf....",
  "..Fffllllf....",
  "..Fffllllf....",
  "..Fffllllf....",
  ...HARE.slice(15),
];

// The Hatter's hat, on its own: tall, a little flared at the crown, a red band with the "10/6"
// ticket tucked in it.
const HAT = [".hHHHHH.", "..HHHHtt", "..HHHHtT", "..RRRR..", "..hHHH..", "hHHHHHHh", ".bbbbbb."];

// The Cheshire Cat, sitting in the fork of his tree, facing out: a tabby with his wide grin.
const CAT = [
  ".t.........t.",
  ".tt.......tt.",
  ".tptkkkkktpt.",
  "ttttttktttttt",
  "ttenetttenett",
  "kttttttttttk.",
  "tGGGGGGGGGGGt",
  "tGmGmGmGmGmGt",
  ".tGGGGGGGGGt.",
  "..ttttttttt..",
  ".tttkttktttt.",
  "tttktttttkttt",
  "Tttkttttttktt",
  "TTTTTTTTTTTTT",
];
const CAT_BLINK = CAT.map((line, i) => (i === 4 ? "ttkkktttkkktt" : line));

// The Caterpillar: blue, sitting up on his mushroom, with his hookah.
const CATERPILLAR = [
  "..............B..B...",
  "..............B..B...",
  ".............bbbbbb..",
  "............bbbbbbbb.",
  "............bbbbbebb.",
  "............Bbbbbbbbb",
  "......y.....Bbbbbbbb.",
  ".....yyy....cBbbbbb..",
  "....yyyYcccc.BbBbb...",
  "....yyyY....bBbBbB...",
  "....YyyY...bBbBbBb...",
  "..YYYYYYYbBbBbBbBb...",
  "bBbBbBbBbBbBbBbBb....",
  "BBBBBBBBBBBBBBBBB....",
];

// The Umbrella Vulture's head: bald and pink, a hooked beak, a pale ruff where it meets the
// umbrella.
const VULTURE_HEAD = [".pPP..", "pPPPP.", "PPePbb", "wPPP.b", "ww...."];

function rabbitAt(g, r) {
  const grid = r.state === "walk" && Math.floor(r.phase) % 2 ? RABBIT_STEP : RABBIT;
  standAt(g, grid, g.pal.rabbit, Math.round(r.x), g.groundY + 7, r.dir);
}

function caterpillarAt(g, p) {
  standAt(g, CATERPILLAR, g.pal.caterpillar, p.x, p.top + 1, 1);
}

// The March Hare sits on the right chair facing the table, his feet on the ground four rows below
// the seat.
function hareAt(g, p, sipping) {
  standAt(g, sipping ? HARE_SIP : HARE, g.pal.hare, p.seats[1], p.seatRow + 4, -1);
}

// The hat drifts to and fro over the Hatter's side of the table, bobbing, its shadow on the ground.
function hatAt(g, p, time) {
  const x = Math.round(p.x - 12 + Math.sin(time * 0.45) * 10);
  const y = Math.round(p.seatRow - 10 + Math.sin(time * 1.6) * 1.5);
  g.ctx.globalAlpha *= 0.18;
  rect(g, g.pal.shadow, x - 3, p.seatRow + 3, 7, 1);
  g.ctx.globalAlpha /= 0.18;
  standAt(g, HAT, g.pal.hat, x, y, 1);
}

function dodoAt(g, d) {
  const grid = d.state === "walk" && Math.floor(d.phase) % 2 ? DODO_STEP : DODO;
  standAt(g, grid, g.pal.dodo, Math.round(d.x), g.groundY + 7, d.dir);
}

function soldierAt(g, s) {
  const { card } = g.pal;
  const pip = s.suit === "heart" ? card[2] : card[3];
  const colours = {
    ...g.pal.soldier,
    K: pip,
    A: s.suit === "heart" ? pip : g.pal.soldier.W,
    B: s.suit === "spade" ? pip : g.pal.soldier.W,
  };
  const grid = Math.floor(s.phase) % 2 ? SOLDIER_STEP : SOLDIER;
  standAt(g, grid, colours, Math.round(s.x), g.groundY + 7, s.dir);
}

// The Umbrella Vulture in flight: a black umbrella for a body, its yellow crook handle trailing as
// a tail, the pink head on the front. The umbrella opening and closing is his wingbeat: shut, it
// is a furled spindle; open, a dome from the tip back to a scalloped rim. He flies high, at the
// height of the flock of cards, bobbing up and down as he goes.

function vultureAt(g, b, time) {
  const c = g.pal.vulture;
  const x = Math.round(b.x);
  const y = Math.round(b.y + Math.sin(time * 3 + b.phase) * 3);
  const at = (colour, dx, dy) => part(g, colour, x, y, b.dir, dx, dy, 1, 1);
  const open = 0.5 - 0.5 * Math.cos(time * 4 + b.phase);
  const RIM = 9;
  for (let k = 0; k <= RIM; k += 1) {
    const shut = Math.round(1.2 * Math.sin((Math.PI * (k + 1)) / (RIM + 2)));
    const h = Math.max(shut, Math.round(open * 4 * Math.sqrt(k / RIM)));
    for (let dy = -h; dy <= h; dy += 1) {
      if (k === RIM && h > 2 && (dy + h) % 3 === 1) continue;
      const inside = k >= RIM - 1 && h > 2 && Math.abs(dy) < h - 1;
      at(inside ? c.i : dy > 0 ? c.k : c.K, -k, dy);
    }
  }
  at(c.K, 1, 0);
  for (let k = RIM + 1; k <= RIM + 2; k += 1) at(c.K, -k, 0);
  for (let k = RIM + 3; k <= RIM + 4; k += 1) at(c.H, -k, 0);
  for (let dy = 0; dy <= 1; dy += 1) at(c.H, -(RIM + 5), dy);
  at(c.H, -(RIM + 4), 2);
  sprite(g, VULTURE_HEAD, c, x, y, b.dir, -1, 4);
}

// A Bread-and-butterfly, from Through the Looking-Glass: wings of thin bread-and-butter with brown
// crusts, a body of crust and a head that is a lump of sugar. It flutters about its home. Its
// palette is bread: [crust, butter, sugar].
function breadAt(g, b, time) {
  const [crust, butter, sugar] = g.pal.bread;
  const x = Math.round(b.homeX + Math.sin(time * b.speed + b.phase) * 10);
  const y = Math.round(b.homeY + Math.sin(time * b.speed * 1.7 + b.phase * 2) * 5);
  const open = Math.floor(time * 7 + b.phase) % 2 === 0;
  if (open) {
    rect(g, crust, x - 3, y - 1, 2, 3);
    rect(g, crust, x + 2, y - 1, 2, 3);
    rect(g, butter, x - 2, y, 1, 1);
    rect(g, butter, x + 2, y, 1, 1);
  } else {
    rect(g, crust, x - 1, y - 3, 1, 3);
    rect(g, crust, x + 1, y - 3, 1, 3);
  }
  rect(g, crust, x, y, 1, 2);
  rect(g, sugar, x, y - 1, 1, 1);
}

// A croquet stroke, the Queen's way: a card soldier holds a flamingo upside down by its legs and
// swings its head at a hedgehog rolled up as the ball, which trundles off across the lawn. Its
// palette is croquet: [flamingo, hedgehog, hedgehog face]. `t` is seconds into the stroke.
function croquetAt(g, s, t) {
  const [pink, hog, face] = g.pal.croquet;
  const x = Math.round(s.x);
  const y = g.groundY + 6;
  const swing = t < 0.8 ? -2 : t < 1 ? 0 : 2;
  part(g, pink, x, y, s.dir, 5, -12, 1, 2);
  for (let k = 0; k < 8; k += 1) part(g, pink, x, y, s.dir, 6 + Math.round((k * swing) / 8), -10 + k, 1, 1);
  part(g, pink, x, y, s.dir, 5 + swing, -3, 3, 2);
  part(g, pink, x, y, s.dir, 4 + swing, -1, 1, 1);
  const rolled = t < 1 ? 0 : Math.min(40, (t - 1) * 30);
  const bx = 9 + Math.round(rolled);
  const turn = Math.floor(rolled / 2) % 2;
  part(g, hog, x, y, s.dir, bx, -3, 3, 3);
  part(g, face, x, y, s.dir, bx + (turn ? 2 : 0), -1, 1, 1);
  part(g, hog, x, y, s.dir, bx + 1, -4, 1, 1);
}

// A flock of playing cards, fluttering across together.
function flockAt(g, b, time) {
  const [face, edge, red] = g.pal.card;
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  for (let i = 0; i < 4; i += 1) {
    const dx = i * 5 - 8;
    const dy = Math.round(Math.sin(time * 4 + b.phase + i * 1.7) * 2) - (i % 2) * 3;
    part(g, edge, x, y, b.dir, dx - 1, dy - 1, 5, 6);
    part(g, face, x, y, b.dir, dx, dy, 3, 4);
    part(g, red, x, y, b.dir, dx + 1, dy + 1, 1, 1);
  }
}

// The Cheshire Cat sits in the fork of his tree, his tail hanging down over the bark. Now and then
// he blinks, and now and then his tail swishes side to side, more at its tip.
function catAt(g, limb, time) {
  const c = g.pal.cat;
  const span = Math.floor(time / BLINK_EVERY);
  const blink = time - span * BLINK_EVERY < BLINK_FOR && hash(span, 1, 7) < 0.7;
  standAt(g, blink ? CAT_BLINK : CAT, c, limb.x, limb.row, 1);
  const turn = Math.floor(time / SWAY_EVERY);
  const into = time - turn * SWAY_EVERY;
  const swish = into < SWAY_FOR && hash(turn, 2, 7) < 0.75 ? Math.sin((into / SWAY_FOR) * Math.PI * 3) : 0;
  let last = 0;
  for (let d = 0; d < 9; d += 1) {
    const dx = (d > 6 ? 1 : 0) + Math.round(swish * 2.5 * (d / 8) ** 1.5);
    // Where the tail bends more than a pixel, it runs sideways too, so it stays joined.
    const from = Math.min(last, dx);
    rect(g, d % 3 === 2 ? c.k : c.t, limb.x + 7 + from, limb.row - 2 + d, Math.abs(dx - last) + 1, 1);
    last = dx;
  }
}

// The grin alone, in the dark of the hollow, before the Cat appears.
function grinAt(g, grin) {
  rect(g, g.pal.cat.G, grin.x - 2, grin.y, 5, 1);
  rect(g, g.pal.cat.G, grin.x - 1, grin.y + 1, 3, 1);
}

// A soap bubble drifting up, a small ring of colour.
function bubbleAt(g, b) {
  const x = Math.round(b.x + Math.sin(b.phase + g.time * 1.2) * 1.5);
  const y = Math.round(b.y);
  rect(g, g.pal.bubble, x + 1, y, 1, 1);
  rect(g, g.pal.bubble, x, y + 1, 1, 1);
  rect(g, g.pal.bubble, x + 2, y + 1, 1, 1);
  rect(g, g.pal.bubble, x + 1, y + 2, 1, 1);
}

// A hookah smoke ring rising and fading.
function ringAt(g, r) {
  const { ctx, pal } = g;
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  ctx.globalAlpha = 0.7 * (1 - r.age / 4);
  rect(g, pal.smoke, x + 1, y, 3, 1);
  rect(g, pal.smoke, x, y + 1, 1, 1);
  rect(g, pal.smoke, x + 4, y + 1, 1, 1);
  rect(g, pal.smoke, x + 1, y + 2, 3, 1);
  ctx.globalAlpha = 1;
}

// The night sky: stars, and a crescent moon with a grin on its lit side.
function nightAt(g, f) {
  const { pal } = g;
  for (const star of f.extra.stars) {
    const pulse = 0.5 + 0.5 * Math.sin(g.time * star.rate + star.phase);
    g.ctx.globalAlpha = 0.35 + pulse * 0.65;
    rect(g, pal.star[star.big ? 1 : 0], star.x, star.y, 1, 1);
  }
  g.ctx.globalAlpha = 1;
  const cx = Math.round(f.cols * 0.84);
  for (let y = 4; y <= 15; y += 1) {
    for (let x = cx - 6; x <= cx + 6; x += 1) {
      const inside = (x - cx) ** 2 + (y - 10) ** 2 <= 30;
      const cut = (x - cx - 3) ** 2 + (y - 9) ** 2 <= 26;
      if (inside && !cut) rect(g, pal.moon, x, y, 1, 1);
    }
  }
  rect(g, pal.moonGrin, cx - 5, 11, 1, 1);
  rect(g, pal.moonGrin, cx - 2, 11, 1, 1);
  rect(g, pal.moonGrin, cx - 5, 12, 4, 1);
}

// A pastel cloud, two puffs of colour in the sky.
function cloudAt(g, c) {
  blob(g, c.x, c.y, c.w, 6, () => g.pal.cloud);
  blob(g, c.x + Math.round(c.w / 4), c.y - 3, Math.round(c.w / 2), 5, () => g.pal.cloud);
}

// Eases a value toward 1 while `on`, or toward 0 otherwise, over about a second and a half.
function toward(value, on, dt) {
  return clamp(value + (on ? dt : -dt) * 0.7, 0, 1);
}

// How grown a hand-placed plant is, 0..1, from its stage (the painter's own size, so the update
// step does not depend on the plant having been drawn).
function sizeOf(f, p) {
  return smooth(clamp((p.shown - p.born) / f.scene.mature[p.kind], 0, 1));
}

// Plants, sown with literal calls. The Caterpillar's mushroom, the Cat's tree, the tea table, the
// rabbit hole and the other great trees are placed anew on each visit, apart from one another; the
// Cat's tree and the Caterpillar's mushroom stand clear of the middle of the page, where the
// sign-in card sits. Hedges, roses and lilies fill in round them.
function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const spots = placeLandmarks(ctx, [
    { key: "tree", half: 22, away: CLEARING + 20, inside: true },
    { key: "perch", half: 16, away: CLEARING + 4 },
    { key: "table", half: 16, away: CLEARING * 0.5 },
    { key: "hole", half: 8, away: 0 },
    { key: "witch", half: 18, away: CLEARING },
    { key: "willow", half: 18, away: CLEARING },
    { key: "witch2", half: 16, away: 0 },
    { key: "willow2", half: 16, away: 0 },
  ]);
  const { perch, table, tree, hole } = spots;
  const clear = (x) =>
    Math.abs(x - perch) > 12 && Math.abs(x - table) > 14 && Math.abs(x - tree) > 16 && Math.abs(x - hole) > 6;
  scatter(plants, ctx, {
    kind: "hill",
    count: Math.round(cols / 70),
    born: [1, 2],
    scale: [1.1, 1.6],
    layer: -1,
  });
  scatter(plants, ctx, {
    kind: "cardHedge",
    count: Math.round(cols / 30),
    born: [1, 3],
    scale: [0.8, 1.1],
    layer: 0,
  });
  scatter(plants, ctx, {
    kind: "mushroom",
    count: Math.round(cols / 26),
    born: [0, 2],
    scale: [0.5, 1.2],
    depth: [1, 4],
    species: CAP_MIX,
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "rose",
    count: Math.round(cols / 28),
    born: [1, 3],
    scale: [0.8, 1.2],
    depth: [1, 4],
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "tigerLily",
    count: Math.round(cols / 28),
    born: [2, 4],
    scale: [0.8, 1.4],
    depth: [1, 5],
    keep: clear,
  });
  scatter(plants, ctx, {
    kind: "wildflower",
    count: Math.round(cols / 22),
    born: [1, 4],
    scale: [0.8, 1.2],
    depth: [0, 6],
    keep: clear,
  });
  plants.push(makePlant(rand, "mushroom", perch, { born: 1, depth: 2, scale: 1.6, perch: true, species: "red" }));
  plants.push(makePlant(rand, "teaTable", table, { born: 3, depth: 2 }));
  plants.push(makePlant(rand, "witchTree", tree, { born: 3, depth: 2, home: true }));
  for (const x of [spots.witch, spots.witch2]) {
    plants.push(makePlant(rand, "witchTree", x, { born: 2, layer: 0, scale: 0.8 * clearing(x, cols) }));
  }
  for (const x of [spots.willow, spots.willow2]) {
    plants.push(makePlant(rand, "willow", x, { born: 2, layer: 0, scale: 1.1 * clearing(x, cols) }));
  }
  plants.push(makePlant(rand, "rabbitHole", hole, { born: 1, depth: 3 }));
  for (const p of plants) {
    if (!p.perch && ["mushroom", "rose", "tigerLily", "cardHedge"].includes(p.kind)) {
      p.scale *= clearing(p.x, cols);
    }
  }
  sortPlants(plants);
  return plants;
}

// Soft lilac earth, teal in its shade, with a few candy flecks near the top.
function soil(pal, x, y, depth, turf) {
  const n = hash(x, y, 11);
  if (y < 5 && hash(x, y, 21) < 0.04 + turf * 0.14) {
    return pal.fleck[Math.floor(hash(x, y, 22) * 2)];
  }
  if (n < 0.1 + depth * 0.22) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

const extras = {
  init(f) {
    return {
      clouds: Array.from({ length: CLOUDS }, () => ({
        x: Math.floor(f.rand() * f.cols),
        y: 10 + Math.floor(f.rand() * 24),
        w: 22 + Math.floor(f.rand() * 14),
      })),
      stars: starField(f, STARS, 70, 0.15),
      flies: Array.from({ length: BUTTERFLIES }, (_, i) => ({
        homeX: (0.12 + 0.76 * ((i + f.rand() * 0.8) / BUTTERFLIES)) * f.cols,
        homeY: f.groundY - 14 - f.rand() * 26,
        phase: f.rand() * 6.28,
        speed: 0.5 + f.rand() * 0.4,
        from: Infinity,
      })),
      rabbit: walker(f),
      dodo: walker(f),
      soldiers: [
        { ...walker(f), suit: "spade" },
        { ...walker(f), suit: "heart" },
      ],
      flock: { next: 0, bird: null },
      croquet: { next: 20 + f.rand() * 10, start: -10 },
      vultures: circlingPair(f, 46 + f.rand() * 8, { rate: 0.2, gap: 8 }),
      pigeon: { next: 4, bird: null },
      lory: { next: 8, bird: null },
      caterpillar: { alpha: 0 },
      hat: { alpha: 0 },
      hare: { alpha: 0 },
      cat: { grin: 0, alpha: 0 },
      bubbles: [],
      rings: [],
      ringNext: 1,
      perch: f.plants.find((p) => p.perch),
      tea: f.plants.find((p) => p.kind === "teaTable"),
      tree: f.plants.find((p) => p.home),
    };
  },

  // The White Rabbit comes at stage 1, the Dodo at 5, the two soldiers together at 6. The
  // Bread-and-butterflies arrive one per watering from stage 3.
  onGrow(f) {
    const x = f.extra;
    if (f.stage >= 1) enter(f, x.rabbit);
    if (f.stage >= 5) enter(f, x.dodo);
    if (f.stage >= 6) {
      const [lead, mate] = x.soldiers;
      enter(f, lead);
      enterBehind(f, mate, lead, 11);
    }
    x.flies.forEach((fly, i) => {
      if (i < f.stage - 2 && fly.from === Infinity) fly.from = f.time + (f.reduced ? 0 : 2.2);
    });
  },

  busy: () => true,

  update(f, dt) {
    const x = f.extra;
    const { perch, tea, tree } = x;
    x.caterpillar.alpha = toward(x.caterpillar.alpha, f.stage >= 3 && sizeOf(f, perch) >= 0.9, dt);
    const teaUp = f.stage >= 4 && sizeOf(f, tea) >= 0.9;
    x.hat.alpha = toward(x.hat.alpha, teaUp, dt);
    x.hare.alpha = toward(x.hare.alpha, teaUp, dt);
    const catUp = (f.stage >= 6 || f.theme === "dark") && sizeOf(f, tree) >= 0.9;
    x.cat.grin = toward(x.cat.grin, catUp, dt);
    x.cat.alpha = toward(x.cat.alpha, catUp && x.cat.grin >= 1, dt);

    wander(f, x.rabbit, dt, { speed: 17, stride: 14, sit: [1, 2], walk: [3, 5] });
    wander(f, x.dodo, dt, { speed: 6, stride: 5, sit: [3, 6], walk: [3, 6] });
    // The soldiers march in step, the second a pace behind the first.
    // Every so often they halt and the lead soldier plays a croquet stroke.
    const [lead, mate] = x.soldiers;
    if (lead.active && f.time >= x.croquet.next && lead.x > 20 && lead.x < f.cols - 20) {
      x.croquet.start = f.time;
      x.croquet.next = f.time + 28 + f.rand() * 12;
    }
    if (f.time - x.croquet.start > CROQUET_SECONDS) {
      stroll(f, lead, dt, 8);
      follow(mate, lead, dt, 11);
      lead.phase += dt * 9;
      mate.phase = lead.phase;
    }

    if (f.stage >= 6) {
      flyBy(f, x.flock, dt, { every: [5, 7], speed: 10, spawn: () => ({ y: 26 + f.rand() * 30 }) });
    }
    if (f.stage >= 4 && !isNight(f)) {
      flyBy(f, x.pigeon, dt, { every: [6, 6], speed: 22, spawn: () => ({ y: f.groundY - 62 - f.rand() * 20 }) });
    }
    if (f.stage >= 7 && !isNight(f)) {
      flyBy(f, x.lory, dt, { every: [8, 8], speed: 38, spawn: () => ({ y: f.groundY - 40 - f.rand() * 20 }) });
    }
    for (const v of x.vultures) v.active = f.stage >= 8;

    if (f.stage >= 2 && x.bubbles.length < BUBBLES && f.rand() < dt * 0.5) {
      x.bubbles.push({ x: f.rand() * f.cols, y: f.groundY, phase: f.rand() * 6.28 });
    }
    for (const b of x.bubbles) b.y -= dt * 4;
    x.bubbles = x.bubbles.filter((b) => b.y > -4);

    if (x.caterpillar.alpha > 0.6 && perch.top !== undefined) {
      x.ringNext -= dt;
      if (x.ringNext <= 0) {
        x.rings.push({ x: perch.x, y: perch.top - 10, age: 0 });
        x.ringNext = 2.2;
      }
    }
    for (const r of x.rings) {
      r.age += dt;
      r.y -= dt * 3;
      r.x += dt * 1.5;
    }
    x.rings = x.rings.filter((r) => r.age < 4);
  },

  drawBack(g, f) {
    if (f.theme === "dark") nightAt(g, f);
    else for (const c of f.extra.clouds) cloudAt(g, c);
  },

  draw(g, f) {
    const x = f.extra;
    const { perch, tea, tree } = x;
    for (const b of x.bubbles) bubbleAt(g, b);
    for (const r of x.rings) ringAt(g, r);
    for (const fly of x.flies) {
      if (f.time >= fly.from) breadAt(g, fly, f.time);
    }
    if (x.flock.bird) flockAt(g, x.flock.bird, f.time);
    for (const [i, v] of x.vultures.entries()) {
      if (!v.active) continue;
      const c = soarAt(f.time, v);
      vultureAt(g, { x: c.x, y: c.y, dir: c.dir, phase: i * 2 }, f.time);
    }
    if (x.pigeon.bird && !isNight(f)) flyerAt(g, x.pigeon.bird, f.time, "pigeon");
    if (x.lory.bird && !isNight(f)) flyerAt(g, x.lory.bird, f.time, "lory");
    if (x.cat.grin > 0 && tree.grin) fadedAt(g, x.cat.grin, () => grinAt(g, tree.grin));
    if (x.cat.alpha > 0 && tree.limb) fadedAt(g, x.cat.alpha, () => catAt(g, tree.limb, f.time));
    if (x.caterpillar.alpha > 0) {
      fadedAt(g, x.caterpillar.alpha, () => caterpillarAt(g, perch));
    }
    if (x.hat.alpha > 0) fadedAt(g, x.hat.alpha, () => hatAt(g, tea, f.time));
    const sipping = f.time % SIP_EVERY < SIP_FOR;
    if (x.hare.alpha > 0) fadedAt(g, x.hare.alpha, () => hareAt(g, tea, sipping));
    if (x.dodo.active) dodoAt(g, x.dodo);
    for (const s of x.soldiers) if (s.active) soldierAt(g, s);
    const stroke = f.time - x.croquet.start;
    if (stroke <= CROQUET_SECONDS && x.soldiers[0].active) croquetAt(g, x.soldiers[0], stroke);
    if (x.rabbit.active) rabbitAt(g, x.rabbit);
  },
};

export default {
  id: "wonderland",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.3, 0.5], dark: [0.4, 0.6] },
  mature: {
    hill: 2,
    cardHedge: 2.5,
    mushroom: 2,
    rose: 2.5,
    tigerLily: 2,
    wildflower: 2,
    teaTable: 1.2,
    witchTree: 3,
    willow: 3,
    rabbitHole: 1,
  },
  paint: {
    hill,
    cardHedge,
    mushroom,
    rose,
    tigerLily,
    wildflower,
    teaTable,
    witchTree,
    willow,
    rabbitHole,
  },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      "..lhhhhhhh..",
      "...lhhhhh...",
      "...lhhhhhcc.",
      "...lhhhhhcc.",
      "...rrrrrrcc.",
      "...rrrrrr...",
      "...lhhhhh...",
      ".lhhhhhhhhh.",
      "..ssssssss..",
      "............",
      "............",
    ],
    colours: { h: "#4a4357", l: "#6b6380", s: "#2a2532", r: "#d8343f", c: "#fbf8f2" },
  },
};
