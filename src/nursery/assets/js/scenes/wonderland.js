// Wonderland, after Lewis Carroll's Alice's Adventures in Wonderland: a candy-bright garden of
// giant spotted mushrooms in many colours (red the most), painted roses, playing-card hedges,
// wildflowers, a tea table, great bare gnarled trees and a few leafless weeping willows, placed
// anew on each visit with the Cheshire Cat's tree kept out of the middle. At night the mushrooms
// glow under a grinning moon. The White Rabbit, the Dodo and two card soldiers walk through, and
// now and then a soldier plays a croquet stroke with a flamingo for a mallet and a hedgehog for a
// ball; Bread-and-butterflies, a flock of cards and the Umbrella Vulture fly over; the Hatter's hat
// hovers by the tea table, where the March Hare sips his tea; the Caterpillar and the Cheshire Cat
// fade in where they sit. The creatures are flat colour with a darker shade, like the other scenes.

import {
  circlingPair,
  enter,
  enterBehind,
  follow,
  isNight,
  settle,
  soarAt,
  stride,
  stroll,
  walker,
  wander,
} from "../kit/critters.js";
import { starField } from "../kit/effects.js";
import { flyerAt } from "../kit/flyers.js";
import { circlerPerch, goHome } from "../kit/perch.js";
import {
  blob,
  CLEARING,
  clamp,
  clearing,
  foliage,
  hash,
  makePlant,
  mix,
  placeLandmarks,
  rect,
  rng,
  row,
  scatter,
  shadowColour,
  smooth,
  sortPlants,
} from "../kit/pixel.js";
import { meadowFlower } from "../kit/plants.js";
import { ANIMAL_BOX, bird, walk } from "../kit/poses.js";
import { crossingActor, drawStep, runCast, walkerActor } from "../kit/runner.js";
import {
  bough,
  DODO_STRIDE,
  daySparkleAt,
  HARE_DASH_STRIDE,
  HARE_STRIDE,
  RABBIT_STRIDE,
  SOLDIER_STRIDE,
  SPARKLE_DAY,
  STRIDE_CYCLE,
  VULTURE_MOVES,
  wonderlandCatAt,
  wonderlandCaterpillarAt,
  wonderlandDodoAt,
  wonderlandFlockAt,
  wonderlandGrinAt,
  wonderlandHareAt,
  wonderlandHatAt,
  wonderlandRabbitAt,
  wonderlandSoldierAt,
  wonderlandTableAt,
  wonderlandTeaPartyAt,
  wonderlandVultureAt,
} from "../kit/wonderland.js";

const STARS = 40;
const CLOUDS = 3;
const BUBBLES = 14;
const BUTTERFLIES = 3;
const TEA_PARTY_SECONDS = 4;

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
  groundShadow: "rgba(50, 35, 70, 0.36)", // the soft shadow every animal, plant and rock casts on the ground
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
  hareCoat: ["#5b8c68", "#426e4e", "#2c4e36"],
  hareVest: ["#e2b868", "#c89a46"],
  collar: "#fffdf8",
  tie: "#8e3530",
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
  groundShadow: "rgba(0, 0, 0, 0.55)",
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
  hareCoat: ["#3d6448", "#2a4833", "#1b3022"],
  hareVest: ["#a88440", "#7a5c24"],
  collar: "#d9d5e6",
  tie: "#682a2a",
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

// A giant spotted mushroom (Amanita muscaria), a sculpted dome cap on a stem, in its species'
// colour. At night it glows in that colour with a soft ambient aura.
function mushroom(g, p, s, base) {
  const { pal } = g;
  const capTones = pal[CAPS[p.species] || CAPS.red];
  const tLight = capTones[0];
  const tBody = capTones[1];
  const tShade = capTones[2];
  const tGills = mix(tShade, "#180c24", 0.45);

  const total = Math.max(4, Math.round(23 * p.scale * s));
  const capH = Math.max(3, Math.round(total * 0.54));
  const capW = Math.max(5, Math.round(total * 1.18));
  const top = base - total;
  p.size = s;
  p.top = top;

  const stemW = Math.max(2, Math.round(capW * 0.28));
  const stemTop = top + capH - 1;
  const stemHeight = base - stemTop;

  // 1. Soft cast ground shadow under stem
  g.ctx.fillStyle = shadowColour(pal);
  const shadowR = Math.max(2, Math.round(stemW * 0.9));
  g.ctx.fillRect(p.x - shadowR, base, shadowR * 2 + 1, 1);

  // 2. Bioluminescent soft round glow halo at night
  if (pal.glow) {
    g.ctx.globalAlpha = 0.22;
    blob(g, p.x, top - 2, capW + 8, capH + 6, () => tBody);
    g.ctx.globalAlpha = 0.12;
    blob(g, p.x, top - 4, capW + 14, capH + 10, () => tBody);
    g.ctx.globalAlpha = 1;
  }

  // 3. Stem: rounded cylindrical stalk with bulbous volva at ground and veil skirt (annulus)
  const [sLight, sShade] = pal.stem;
  for (let dy = 0; dy < stemHeight; dy += 1) {
    const y = base - 1 - dy;
    // Volva flare at the very base (first 2-3 pixels)
    const flare = dy < 2 ? (stemW >= 4 ? 2 : 1) : dy < 4 ? (stemW >= 5 ? 1 : 0) : 0;
    const curW = stemW + flare * 2;
    const curLeft = p.x - (curW >> 1);
    for (let i = 0; i < curW; i += 1) {
      const u = i / Math.max(1, curW - 1);
      const darkUnderCap = dy > stemHeight - 3 ? 0.2 : 0;
      const col = u < 0.4 ? sLight : sShade;
      rect(g, darkUnderCap ? mix(col, "#2a1d3d", darkUnderCap) : col, curLeft + i, y, 1, 1);
    }
  }

  // Veil skirt (annulus) just below the cap
  if (s >= 0.5 && stemHeight >= 6) {
    const skirtY = stemTop + Math.max(2, Math.round(stemHeight * 0.25));
    const skirtW = stemW + 2;
    const skirtLeft = p.x - (skirtW >> 1);
    rect(g, sLight, skirtLeft, skirtY, Math.round(skirtW * 0.6), 1);
    rect(g, sShade, skirtLeft + Math.round(skirtW * 0.6), skirtY, skirtW - Math.round(skirtW * 0.6), 1);
    rect(g, sLight, skirtLeft, skirtY + 1, 1, 1);
    rect(g, sShade, skirtLeft + skirtW - 1, skirtY + 1, 1, 1);
  }

  // 4. Underside Gills: visible along the bottom edge of the cap
  const gillY = top + capH - 1;
  const gillHalf = Math.round((capW / 2) * 0.88);
  row(g, gillY, p.x - gillHalf, p.x + gillHalf, (x) => {
    return Math.abs(x - p.x) % 2 === 0 ? tGills : tShade;
  });

  // 5. Cap Dome: smoothly curved Amanita dome with 4-tone overhead lighting
  for (let r = 0; r < capH - 1; r += 1) {
    const y = top + r;
    const f = r / (capH - 1); // 0 at crown, 1 at rim
    const half = Math.round((capW / 2) * Math.sqrt(Math.max(0, 1 - (1 - f) ** 2.4)));

    row(g, y, p.x - half, p.x + half, (x) => {
      const u = (x - p.x) / Math.max(1, half); // -1 (left) to +1 (right)

      // Organic Amanita veil flecks / warts:
      const isCrown = r <= Math.round(capH * 0.45);
      const spotNoise = hash(x >> 1, r, p.seed);
      const isSpot =
        (isCrown && spotNoise < 0.24 && Math.abs(u) < 0.8) || (!isCrown && spotNoise < 0.16 && r < capH - 2);

      if (isSpot) {
        return pal.spot;
      }

      // 4-Tone lighting: lit from top-left, shaded on bottom-right
      const lightScore = (1 - f) * 0.65 - u * 0.35;
      if (lightScore > 0.45) return tLight;
      if (lightScore > 0.05) return tBody;
      return tShade;
    });
  }

  // Crown highlight sheen on the very top of the dome
  const crownHalf = Math.max(1, Math.round(capW * 0.18));
  row(g, top, p.x - crownHalf, p.x + crownHalf, () => tLight);
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

// The tea-party table: a permanent storybook landmark with high-backed carved chairs, a draped
// linen tablecloth, teacups, and a quiet teapot resting in the center with the Dormouse tucked inside.
function teaTable(g, p, s, base) {
  p.size = s;
  wonderlandTableAt(g, p, base);
}

// A great bare gnarled tree, the kind witches live by: a massive trunk with spiraling grooves,
// muscular claw roots gripping the ground with soft cast shadows, a dark hollow, a sturdy central
// fork cradling the Cheshire Cat, and five tapering limbs reaching up and out with gapless stepping.
function witchTree(g, p, s, base) {
  const { pal } = g;
  p.size = s;
  const H = Math.max(8, Math.round(84 * p.scale * s));
  const tw = Math.max(3, Math.round(18 * p.scale * Math.max(s, 0.4)));
  const trunkH = Math.round(H * 0.42);
  const lean = (r) => Math.round(Math.sin(r * 0.11 + p.seed) * 3 * p.scale);

  // 4-Tone bark palette: [lit, base, shade, deepUnderFork]
  const B = [pal.gnarl[0], pal.gnarl[1], pal.gnarl[2], mix(pal.gnarl[2], "#000000", 0.38)];

  // 1. Soft ground shadow under trunk and claw roots
  g.ctx.fillStyle = shadowColour(pal);
  const shadowR = Math.max(4, Math.round(tw * 0.85 + 4));
  g.ctx.fillRect(p.x - shadowR, base, shadowR * 2 + 1, 1);
  g.ctx.fillRect(p.x - Math.round(shadowR * 0.6), base + 1, Math.round(shadowR * 1.2), 1);

  // 2. Muscular flaring claw roots
  const reach = Math.max(3, Math.round(13 * p.scale * Math.max(s, 0.4)));
  for (const dir of [-1, 1]) {
    for (let k = 0; k < reach; k += 1) {
      const x = p.x + lean(0) + dir * ((tw >> 1) + k);
      const rootH = Math.max(1, Math.round(((reach - k) / reach) ** 1.6 * 7 * p.scale));
      for (let j = 0; j < rootH; j += 1) {
        const u = j / rootH;
        const tone = dir < 0 ? (u > 0.6 ? B[0] : B[1]) : u > 0.7 ? B[1] : B[2];
        rect(g, tone, x, base - 1 - j, 1, 1);
      }
    }
  }

  // 3. Ancient massive trunk with spiraling grooves
  for (let r = 0; r < trunkH; r += 1) {
    const waist = Math.round(Math.sin((r / trunkH) * Math.PI) * -2 * p.scale);
    const fork = r > trunkH * 0.65 ? Math.round(((r - trunkH * 0.65) / (trunkH * 0.35)) * 7 * p.scale) : 0;
    const curW = tw + waist * 2 + fork * 2;
    const x0 = p.x + lean(r) - (curW >> 1);
    const y = base - 1 - r;

    for (let i = 0; i < curW; i += 1) {
      const u = i / Math.max(1, curW - 1);
      const twist = (i + Math.round(r * 0.38) + (p.seed % 3)) % 5;
      const fissure = twist === 0 || (twist === 1 && hash(i, r, p.seed) < 0.25);

      let tone;
      if (fissure) {
        tone = B[3];
      } else if (u < 0.28) {
        tone = B[0];
      } else if (u < 0.68) {
        tone = B[1];
      } else {
        tone = B[2];
      }
      rect(g, tone, x0 + i, y, 1, 1);
    }
  }

  // 4. Shadowy hollow in trunk
  const holeX = p.x + lean(Math.round(trunkH * 0.45)) - 2;
  const holeY = base - Math.round(trunkH * 0.45);
  if (s >= 0.4) {
    blob(g, holeX, holeY - Math.round(6 * p.scale), Math.round(8 * p.scale), Math.round(11 * p.scale), () => B[3]);
    blob(g, holeX, holeY - Math.round(5 * p.scale), Math.round(6 * p.scale), Math.round(9 * p.scale), () => pal.hollow);
  }

  // 5. Sturdy central fork (cradle for Cheshire Cat)
  const fx = p.x + lean(trunkH);
  const fy = base - trunkH;
  if (p.home) {
    p.limb = { x: fx, row: fy + 2 };
    p.grin = { x: holeX, y: holeY - 1 };
  }

  // Cradle shelf bark
  rect(g, B[0], fx - 5, fy + 1, 11, 1);
  rect(g, B[1], fx - 6, fy + 2, 13, 1);

  if (s < 0.3) return;

  // 6. Gnarled boughs reaching out and up with gapless line4 stepping
  const angles = [-1.35, -0.7, -0.15, 0.55, 1.3];
  angles.forEach((a, i) => {
    const length = H * (0.55 + 0.12 * hash(i, p.seed, 2)) * (1 - Math.abs(a) * 0.12);
    const startW = Math.max(2, Math.round((Math.abs(a) > 1 ? 4.5 : 3.8) * p.scale));
    const bx0 = fx + Math.round(a * tw * 0.38);
    const by0 = fy + 2;

    const midLen = length * 0.5;
    const midA = a + (hash(i, p.seed, 5) - 0.5) * 0.4;
    const mx = bx0 + Math.round(Math.sin(midA) * midLen);
    const my = by0 - Math.round(Math.cos(midA) * midLen);

    const curl = a < 0 ? -0.4 : 0.4;
    const tipA = midA + curl;
    const tx = mx + Math.round(Math.sin(tipA) * (length - midLen));
    const ty = my - Math.round(Math.cos(tipA) * (length - midLen));

    bough(g, B, bx0, by0, mx, my, startW, Math.max(1, startW - 1));
    bough(g, B, mx, my, tx, ty, Math.max(1, startW - 1), 1);

    if (length >= 18) {
      const sideA = a - curl * 1.2;
      const sx = mx + Math.round(Math.sin(sideA) * length * 0.38);
      const sy = my - Math.round(Math.cos(sideA) * length * 0.38);
      bough(g, B, mx, my, sx, sy, 1, 1);
    }
  });
}

// A leafless weeping willow, the magical kind: a gnarled trunk with flare and twist, arching boughs,
// and long bare whips hanging in calm curtains with sky breathing between them. At night the tips glow.
function willow(g, p, s, base) {
  const { pal } = g;
  const time = g.time ?? 0;
  p.size = s;
  const H = Math.max(6, Math.round(64 * p.scale * s));
  const tw = Math.max(2, Math.round(6 * p.scale * Math.max(s, 0.4)));
  const trunkH = Math.round(H * 0.44);

  // 4-Tone bark palette
  const B = [mix(pal.bark[0], "#ffffff", 0.22), pal.bark[0], pal.bark[1], mix(pal.bark[1], "#000000", 0.3)];

  // 1. Ground shadow
  g.ctx.fillStyle = shadowColour(pal);
  const shadowR = Math.max(3, Math.round(tw * 1.1 + 3));
  g.ctx.fillRect(p.x - shadowR, base, shadowR * 2 + 1, 1);

  // 2. Trunk with flare and twist
  const xAt = (r) => p.x + Math.round(Math.sin(r * 0.18 + p.seed) * 2 * p.scale);
  for (let r = 0; r < trunkH; r += 1) {
    const flare = r < 3 ? 3 - r : 0;
    const curW = tw + flare * 2 - (r > trunkH * 0.7 ? 1 : 0);
    const x0 = xAt(r) - (curW >> 1);
    const y = base - 1 - r;
    for (let i = 0; i < curW; i += 1) {
      const u = i / Math.max(1, curW - 1);
      const knot = hash(i + (r >> 2), r, p.seed) < 0.12;
      const twist = (i + Math.round(r * 0.4)) % 4 === 0;
      let tone;
      if (knot || twist) tone = B[2];
      else if (u < 0.35) tone = B[0];
      else tone = B[1];
      rect(g, tone, x0 + i, y, 1, 1);
    }
  }

  const tx = xAt(trunkH);
  const ty = base - trunkH;
  if (s < 0.3) return;

  // 3. Arching main boughs and weeping whip curtains
  // 5 graceful, well-spaced boughs
  const limbs = [-0.95, -0.55, -0.15, 0.45, 0.95];

  // Calm, slow wind drift (0.85 rad/s)
  const gentleSway = (k, phase) => Math.sin(time * 0.85 + k * 0.4 + phase + p.seed) * 1.5;

  limbs.forEach((spread, li) => {
    const reach = Math.round(H * 0.48 * Math.abs(spread) + 4);
    const lift = Math.round(H * (0.44 + 0.12 * hash(li, p.seed, 1)) * (1 - Math.abs(spread) * 0.32));
    const dir = spread < 0 ? -1 : 1;

    // Arching bough path
    const boughPts = [];
    for (let k = 0; k <= reach; k += 1) {
      const t = k / reach;
      const bx = tx + dir * k;
      const by = Math.round(ty - lift * (1 - (1 - t) ** 2) + lift * 0.3 * t ** 3);
      boughPts.push([bx, by]);
    }

    // Rasterize arching bough
    for (let i = 0; i < boughPts.length - 1; i += 1) {
      const [x0, y0] = boughPts[i];
      const [x1, y1] = boughPts[i + 1];
      const t = i / boughPts.length;
      bough(g, B, x0, y0, x1, y1, t < 0.35 ? 2 : 1, 1);
    }

    // Cascading weeping whips along bough:
    // Whips only sprout on outer boughs (t > 0.35), leaving the center airy and uncluttered
    const startIdx = Math.max(3, Math.round(boughPts.length * 0.35));
    // Spaced every 3 pixels so sky breathes through
    for (let k = startIdx; k < boughPts.length; k += 3) {
      const [bx, by] = boughPts[k];
      const whipLen = Math.round((base - by) * (0.45 + 0.35 * hash(k, li, p.seed)));
      let lastWx = bx;

      for (let d = 1; d <= whipLen; d += 1) {
        const dFrac = d / whipLen;
        // Natural bend concentrated in the lower tips (dFrac ** 1.8), top hangs calm and straight
        const bend = d > whipLen * 0.45 ? Math.round(gentleSway(k + li, dFrac * 1.5) * ((dFrac - 0.45) / 0.55)) : 0;
        const wx = bx + bend;
        const wy = by + d;

        // Smooth solid strand (no flickering noise)
        const minX = Math.min(lastWx, wx);
        const maxX = Math.max(lastWx, wx);
        const whipCol = d > whipLen - 2 ? pal.whip[1] : pal.whip[0];
        for (let cx = minX; cx <= maxX; cx += 1) {
          rect(g, whipCol, cx, wy, 1, 1);
        }
        lastWx = wx;
      }

      // Whip tip
      const tipY = by + whipLen;
      const tipX = lastWx;

      // In dark theme: soft bioluminescent glowing tips
      if (pal.glow && pal.whip[2]) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 1.8 + k * 0.7 + p.seed);
        if (pulse > 0.3) {
          rect(g, pal.whip[2], tipX, tipY, 1, 1);
        } else {
          rect(g, pal.whip[1], tipX, tipY, 1, 1);
        }
      } else {
        rect(g, pal.whip[1], tipX, tipY, 1, 1);
      }
    }
  });
}

// Where an Umbrella Vulture may perch: an arching bough of a full-grown weeping willow, clear of whips.
function willowPerchSpot(p, groundY) {
  const base = groundY + (p.layer < 1 ? 1 : p.depth);
  const s = p.size ?? 1;
  const H = Math.max(6, Math.round(64 * p.scale * s));
  const trunkH = Math.round(H * 0.44);
  const tx = p.x + Math.round(Math.sin(trunkH * 0.18 + p.seed) * 2 * p.scale);
  const ty = base - trunkH;
  const spread = p.seed & 1 ? 0.45 : -0.55;
  const reach = Math.round(H * 0.48 * Math.abs(spread) + 4);
  const lift = Math.round(H * 0.46 * (1 - Math.abs(spread) * 0.32));
  const dir = spread < 0 ? -1 : 1;
  const k = Math.round(reach * 0.3);
  const bx = tx + dir * k;
  const by = Math.round(ty - lift * (1 - (1 - 0.3) ** 2) + lift * 0.3 * 0.3 ** 3);
  return { x: bx, y: by, dir };
}

function willowSpots(f) {
  const willows = f.plants.map((p, order) => ({ p, order })).filter(({ p }) => p.kind === "willow");
  return willows
    .filter(({ p }) => (p.shown ?? 0) - p.born >= 3)
    .map(({ p, order }) => {
      const spot = willowPerchSpot(p, f.groundY);
      return { x: spot.x, order, dir: spot.dir, top: () => spot };
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

// Draws a whole sprite at an alpha, which is how a creature fades in.
function fadedAt(g, alpha, draw) {
  g.ctx.globalAlpha = alpha;
  draw();
  g.ctx.globalAlpha = 1;
}

function rabbitAt(g, r, time = g.time ?? 0) {
  wonderlandRabbitAt(g, r, time);
}

function caterpillarAt(g, perch, time = g.time ?? 0) {
  wonderlandCaterpillarAt(g, perch, time);
}

// The March Hare, in his tweed coat and waistcoat, walking through the meadow or sipping at the table.
function hareAt(g, p, sipping = false, time = g.time ?? 0) {
  wonderlandHareAt(g, p, sipping, time);
}

// The hat drifts to and fro over the Hatter's side of the table, bobbing, its shadow on the ground.
function hatAt(g, p, time = g.time ?? 0) {
  wonderlandHatAt(g, p, time);
}

function dodoAt(g, d, time = g.time ?? 0) {
  wonderlandDodoAt(g, d, time);
}

function soldierAt(g, s, time = g.time ?? 0) {
  wonderlandSoldierAt(g, s, time);
}

// The Umbrella Vulture in flight or perched on a willow bough: an umbrella for a body,
// golden crook handle, and bald pink vulture head with fluffy white ruff.
function vultureAt(g, b, time = g.time ?? 0) {
  wonderlandVultureAt(g, b, time);
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

// The Mad Tea-Party timed wow event:
// A theatrical 4-second sequence at the tea table with our storybook cast:
// Dormouse pops up out of the teapot with steam puffs; Hatter's 10/6 hat tips and bobs manicly;
// the clothed March Hare leaps up with tea droplets flying before tucking the Dormouse back into
// the pot with his saucer.
function teaPartyAt(g, tea, stroke, time = g.time ?? 0) {
  wonderlandTeaPartyAt(g, tea, stroke, time);
}

// A flock of playing cards tumbling in 3D perspective with distinct suits and scarlet backs.
function flockAt(g, b, time = g.time ?? 0) {
  wonderlandFlockAt(g, b, time);
}

// The Cheshire Cat sits in the fork of his tree, his tail hanging down over the bark, breathing
// gently, with periodic eye blinks and swishing striped tail.
function catAt(g, limb, time = g.time ?? 0) {
  wonderlandCatAt(g, limb, time);
}

// The grin alone, in the dark of the hollow, before the Cat appears.
function grinAt(g, grin) {
  wonderlandGrinAt(g, grin);
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

// A daytime twinkle: slot `i` of the sky, eased in and out in place (a pale dot opening to a star).
function sparkleAt(g, i, time, cols, bottom) {
  daySparkleAt(g, i, time, { w: cols, top: 0, bottom });
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
  plants.push(makePlant(rand, "teaTable", table, { born: 0, depth: 7 }));
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

const extras = runCast(
  [
    drawStep(
      "sky",
      (g, f) => {
        if (f.theme === "dark") nightAt(g, f);
        else for (const c of f.extra.clouds) cloudAt(g, c);
      },
      { back: true },
    ),
    drawStep("sky-things", (g, f) => {
      const x = f.extra;
      if (f.theme === "dark") for (const b of x.bubbles) bubbleAt(g, b);
      else if (f.stage >= 2) {
        for (let i = 0; i < SPARKLE_DAY.count; i += 1) sparkleAt(g, i, f.time, f.cols, Math.round(f.groundY * 0.7));
      }
      for (const r of x.rings) ringAt(g, r);
      for (const fly of x.flies) {
        if (f.time >= fly.from) breadAt(g, fly, f.time);
      }
    }),
    crossingActor({
      id: "flock",
      label: "flock of cards",
      kind: "bird",
      family: "storybook",
      storybook: true,
      sprites: ["flock"],
      arrives: 6,
      first: 0,
      every: [5, 7],
      speed: 10,
      spawn: (f) => ({ y: 26 + f.rand() * 30 }),
      draw: (g, b, f) => flockAt(g, b, f.time),
    }),
    drawStep("vultures", (g, f) => {
      const x = f.extra;
      for (const [i, v] of x.vultures.entries()) {
        if (!v.active) continue;
        const c = soarAt(f.time, v);
        vultureAt(g, { x: c.x, y: c.y, dir: c.dir, phase: i * 2, ...v }, f.time);
      }
    }),
    crossingActor({
      id: "pigeon",
      label: "the Pigeon",
      kind: "bird",
      family: "small-flyers",
      storybook: true,
      sprites: ["pigeon"],
      arrives: 4,
      when: "day",
      first: 4,
      every: [6, 6],
      speed: 22,
      spawn: (f) => ({ y: f.groundY - 62 - f.rand() * 20 }),
      draw: (g, b, f) => flyerAt(g, b, f.time, "pigeon"),
    }),
    crossingActor({
      id: "lory",
      label: "the Lory",
      kind: "bird",
      family: "small-flyers",
      storybook: true,
      sprites: ["lory"],
      arrives: 7,
      when: "day",
      first: 8,
      every: [8, 8],
      speed: 38,
      spawn: (f) => ({ y: f.groundY - 40 - f.rand() * 20 }),
      draw: (g, b, f) => flyerAt(g, b, f.time, "lory"),
    }),
    drawStep("cat-caterpillar-tea-hare", (g, f) => {
      const x = f.extra;
      const { perch, tea, tree } = x;
      if (x.cat.grin > 0 && tree.grin) fadedAt(g, x.cat.grin, () => grinAt(g, tree.grin));
      if (x.cat.alpha > 0 && tree.limb) fadedAt(g, x.cat.alpha, () => catAt(g, tree.limb, f.time));
      if (x.caterpillar.alpha > 0) {
        fadedAt(g, x.caterpillar.alpha, () => caterpillarAt(g, perch));
      }
      const stroke = f.time - x.teaParty.start;
      if (x.teaParty.active && !x.teaParty.rushing && stroke <= TEA_PARTY_SECONDS && tea) {
        teaPartyAt(g, tea, stroke, f.time);
      } else {
        if (x.hat.alpha > 0 && tea) fadedAt(g, x.hat.alpha, () => hatAt(g, tea, f.time));
      }
      if (x.hare.active && (!x.teaParty.active || x.teaParty.rushing)) {
        hareAt(g, x.hare);
      }
    }),
    walkerActor({
      id: "dodo",
      label: "dodo",
      kind: "animal",
      family: "ground-birds",
      storybook: true,
      sprites: ["dodo"],
      arrives: 5,
      move: { speed: 7, stride: 6, sit: [3, 6], walk: [3, 6] },
      strideSpec: [DODO_STRIDE, STRIDE_CYCLE],
      draw: (g, w) => dodoAt(g, w),
    }),
    drawStep("soldiers", (g, f) => {
      const x = f.extra;
      for (const s of x.soldiers) if (s.active) soldierAt(g, s);
    }),
    walkerActor({
      id: "rabbit",
      label: "White Rabbit",
      kind: "animal",
      family: "hares-rodents",
      storybook: true,
      sprites: ["rabbit"],
      arrives: 1,
      move: { speed: 16, stride: 12, sit: [2, 5], walk: [2, 4] },
      strideSpec: [RABBIT_STRIDE, STRIDE_CYCLE],
      draw: (g, w) => rabbitAt(g, w),
    }),
    {
      label: "caterpillar",
      kind: "animal",
      family: "insects",
      storybook: true,
      arrives: 3,
      sprites: ["caterpillar"],
    },
    {
      label: "the Hatter's hat, hovering",
      kind: "animal",
      family: "storybook",
      storybook: true,
      arrives: 4,
      sprites: ["hat"],
    },
    {
      label: "March Hare",
      kind: "animal",
      family: "hares-rodents",
      storybook: true,
      presence: ["hare"],
      sprites: ["hare", "hare-sipping"],
    },
    {
      label: "card soldiers",
      kind: "animal",
      family: "storybook",
      storybook: true,
      presence: ["soldiers[0]", "soldiers[1]"],
      sprites: ["soldier", "soldier-red"],
    },
    {
      label: "Umbrella Vulture",
      kind: "bird",
      family: "soaring-birds",
      storybook: true,
      presence: ["vultures[0]", "vultures[1]"],
      sprites: ["vulture", "vulture-open", "vulture-landing", "vulture-perched"],
    },
    {
      label: "Bread-and-butterflies",
      kind: "animal",
      family: "insects",
      storybook: true,
      arrives: 3,
      fixed: `up to ${BUTTERFLIES}`,
      sprites: ["bread"],
    },
    {
      label: "Cheshire Cat",
      kind: "animal",
      family: "cats",
      storybook: true,
      arrives: 6,
      sprites: ["cat", "grin"],
    },
    {
      label: "hookah smoke rings",
      kind: "effect",
      arrives: 3,
      fixed: "a new one every 2.2 s, each up to 4 s",
      sprites: ["ring"],
    },
    {
      label: "soap bubbles (dark theme)",
      kind: "effect",
      arrives: 2,
      fixed: `up to ${BUBBLES} at once`,
      sprites: ["bubble"],
    },
    {
      label: "daytime sparkles (light theme)",
      kind: "effect",
      arrives: 2,
      fixed: "5 twinkles, each eased in and out in place",
      sprites: ["sparkle"],
    },
    {
      label: "clouds (light theme)",
      kind: "effect",
      layer: "behind the plants (drawBack, light theme only)",
      arrives: 0,
      fixed: `${CLOUDS} clouds`,
      sprites: ["cloud"],
    },
    {
      label: "stars and a moon (dark theme)",
      kind: "effect",
      layer: "behind the plants (drawBack, dark theme only)",
      arrives: 0,
      fixed: `${STARS} stars and a moon`,
      sprites: ["sky"],
    },
    {
      label: "The Mad Tea-Party",
      kind: "effect",
      arrives: 4,
      fixed: "a mad tea rush about every 35 s",
      sprites: ["tea-party"],
    },
  ],
  {
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
        soldiers: [
          { ...walker(f), suit: "spade" },
          { ...walker(f), suit: "heart" },
        ],
        teaParty: {
          active: false,
          start: -100,
          goal: 0,
          armed: false,
          rushing: false,
          first: true,
          next: 10 + f.rand() * 6,
        },
        vultures: circlingPair(f, 46 + f.rand() * 8, { rate: 0.2, gap: 8 }),
        caterpillar: { alpha: 0 },
        hat: { alpha: 0 },
        hare: walker(f),
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
      if (f.stage >= 4) enter(f, x.hare);
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
      const catUp = (f.stage >= 6 || f.theme === "dark") && sizeOf(f, tree) >= 0.9;
      x.cat.grin = toward(x.cat.grin, catUp, dt);
      x.cat.alpha = toward(x.cat.alpha, catUp && x.cat.grin >= 1, dt);

      // Each walker's stride clock w.c grows with the ground it covers (the poses read it), so a
      // planted foot holds its spot. The wander stride below only keeps w.phase ticking.
      // The soldiers march in step, the second a pace behind the first.
      const [lead, mate] = x.soldiers;
      const leadX = lead.x;
      stroll(f, lead, dt, 8);
      follow(mate, lead, dt, 11);
      stride(lead, leadX, dt, SOLDIER_STRIDE, STRIDE_CYCLE);
      mate.c = lead.c;
      settle(f, lead);
      settle(f, mate);

      // March Hare & Tea Party Event Logic (triggered when the Hare wanders to either edge)
      const TEA_ARM = 36;
      const TEA_EDGE = 14;
      const targetSeat = tea?.seats ? tea.seats[1] : tea ? tea.x + 14 : f.cols / 2;

      const hareX = x.hare.x;
      if (f.stage >= 4 && x.hare.active && tea) {
        if (!x.teaParty.active) {
          if (!x.teaParty.goal) x.teaParty.goal = x.hare.x < f.cols / 2 ? 1 : -1;
          if (x.teaParty.first && f.time >= x.teaParty.next) {
            x.teaParty.armed = true;
          }
          const gap = x.teaParty.goal > 0 ? f.cols - x.hare.x : x.hare.x;
          if (gap > TEA_ARM) x.teaParty.armed = true;

          if (x.teaParty.armed && gap <= TEA_EDGE) {
            // Trigger the Mad Tea-Party!
            x.teaParty.active = true;
            x.teaParty.rushing = true;
            x.teaParty.armed = false;
            x.teaParty.goal = -x.teaParty.goal;
            x.teaParty.first = false;
          }
        }

        if (x.teaParty.rushing) {
          // Hare dashes across the meadow to his chair!
          const dx = targetSeat - x.hare.x;
          if (Math.abs(dx) <= 2) {
            x.hare.x = targetSeat;
            x.hare.dir = -1;
            x.hare.state = "sit";
            x.teaParty.rushing = false;
            x.teaParty.start = f.time;
            tea.partyActive = true;
          } else {
            x.hare.dir = Math.sign(dx);
            x.hare.state = "walk";
            x.hare.x += x.hare.dir * 26 * dt;
          }
        } else if (x.teaParty.active) {
          const stroke = f.time - x.teaParty.start;
          tea.partyActive = stroke <= TEA_PARTY_SECONDS;
          if (stroke > TEA_PARTY_SECONDS) {
            x.teaParty.active = false;
            tea.partyActive = false;
            x.teaParty.next = f.time + 20 + f.rand() * 10;
            x.hare.state = "sit";
            x.hare.timer = 2.5;
          }
        } else {
          const lean = { dir: x.teaParty.goal, odds: 0.72 };
          wander(f, x.hare, dt, { speed: 12, stride: 9, sit: [2.5, 5], walk: [2, 4], lean });
          settle(f, x.hare);
        }
      }
      stride(x.hare, hareX, dt, x.teaParty.rushing ? HARE_DASH_STRIDE : HARE_STRIDE, STRIDE_CYCLE);

      for (const v of x.vultures) {
        v.active = f.stage >= 8 && !isNight(f);
        if (v.active) {
          circlerPerch(f, v, dt, {
            first: [15, 25],
            every: [45, 35],
            stay: [12, 22],
            spots: willowSpots,
            moves: VULTURE_MOVES,
          });
        } else {
          goHome(f, v);
        }
      }

      // Soap bubbles drift up at night; by day the sky has eased twinkles instead (see draw).
      if (f.stage >= 2 && f.theme === "dark" && x.bubbles.length < BUBBLES && f.rand() < dt * 0.5) {
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
  },
);

const SPRITES = {
  rabbit: (g, frame) => rabbitAt(g, walk(frame)),
  caterpillar: (g) => caterpillarAt(g, { x: 40, top: 46 }, 0),
  hat: (g) => hatAt(g, { x: 52, seatRow: 46 }, 0),
  hare: (g) => hareAt(g, { seats: [40, 40], seatRow: 46 }, false),
  "hare-sipping": (g) => hareAt(g, { seats: [40, 40], seatRow: 46 }, true),
  dodo: (g, frame) => dodoAt(g, walk(frame)),
  soldier: (g, frame) => soldierAt(g, walk(frame, { suit: "spade" })),
  "soldier-red": (g, frame) => soldierAt(g, walk(frame, { suit: "heart" })),
  pigeon: (g, frame) => flyerAt(g, bird(frame), 0, "pigeon"),
  lory: (g, frame) => flyerAt(g, bird(frame), 0, "lory"),
  vulture: (g, frame) => vultureAt(g, bird(frame), 0),
  "vulture-open": (g, frame) => vultureAt(g, bird(frame), Math.PI / 4),
  "vulture-perched": (g, frame) =>
    vultureAt(
      g,
      {
        ...bird(frame),
        x: 40,
        y: 30,
        visit: {
          mode: "perch",
          t: 1,
          T: 0,
          dir: 1,
          spot: { top: () => ({ x: 40, y: 46 }) },
          p: { phase: 0, moves: {} },
        },
      },
      0,
    ),
  "vulture-landing": (g, frame) =>
    vultureAt(
      g,
      {
        ...bird(frame),
        x: 40,
        y: 20,
        visit: {
          mode: "land",
          t: 0.92,
          T: 1,
          dir: 1,
          spot: { top: () => ({ x: 40, y: 46 }) },
          p: { phase: 0, moves: {} },
        },
      },
      0,
    ),
  bread: (g) => breadAt(g, { homeX: 40, homeY: 30, phase: 0, speed: 0 }, 0),
  "tea-party": (g) => {
    teaPartyAt(g, { x: 40, w: 28, seatRow: 46, seats: [26, 54] }, 2.0, 2.0);
  },
  flock: (g, frame) => flockAt(g, bird(frame), 0),
  cat: (g) => catAt(g, { x: 36, row: 44 }, 1),
  grin: (g) => grinAt(g, { x: 40, y: 30 }),
  ring: (g) => ringAt(g, { x: 36, y: 30, age: 1 }),
  bubble: (g) => bubbleAt(g, { x: 40, y: 30, phase: 0 }),
  sparkle: (g) => {
    for (let i = 0; i < 5; i += 1) sparkleAt(g, i, 2.5, ANIMAL_BOX.w, ANIMAL_BOX.ground - 12);
  },
  cloud: (g) => cloudAt(g, { x: 30, y: 24, w: 40 }),
  sky: (g) => {
    g.pal = DARK;
    const extra = extras.init({
      rand: rng(3),
      cols: ANIMAL_BOX.w,
      groundY: ANIMAL_BOX.ground,
      plants: [],
    });
    nightAt(g, { cols: ANIMAL_BOX.w, extra });
  },
};

const PLANT_FAMILIES = {
  willow: "broadleaf",
  witchTree: "broadleaf",
};

export const META = {
  id: "wonderland",
  label: "Wonderland",
  group: "storybook",
  tint: ["#f3d6f0", "rgb(120 90 170)"],
  backdrop: {
    light: {
      green: "#a6e9b8",
      "green-soft": "#d6f5e1",
      peach: "#ffc2b8",
      blush: "#ffd6ea",
      bloom: "#ffa6cb",
    },
    dark: {
      green: "rgb(110 200 150 / 0.36)",
      "green-soft": "rgb(150 120 220 / 0.2)",
      peach: "rgb(230 110 150 / 0.2)",
      blush: "rgb(120 90 170 / 0.16)",
      bloom: "rgb(255 120 190 / 0.3)",
    },
  },
};

export default {
  ...META,
  cast: extras.cast,
  sprites: SPRITES,
  plantFamilies: PLANT_FAMILIES,
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
