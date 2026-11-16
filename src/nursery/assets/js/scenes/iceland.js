// Iceland: a moss-covered lava field under ice-capped mountains, with basalt outcrops, a waterfall
// off a cliff, a fjord and a basalt sea stack where three puffins nest. Arctic foxes, wild reindeer,
// a pair of whooper swans, a short-eared owl and a flock of puffins come by. By day it is summer:
// lupines bloom, the fox wears its brown coat and a puffin brings sand eels home to the stack. At
// night it is winter: two curtains of aurora hang over it, mirrored in the fjord and lighting the
// snow, the fox is white and the puffins on the stack sleep.
// A farm cat wanders the lava field; its coat is one of eleven, picked as the scene loads.
import {
  canidAt,
  cervidAt,
  felidAt,
  felidPoses,
  longNeckStep,
  SWAN_STRIDE,
  settleCanid,
  swanAt,
  swanPoses,
  swanSpeed,
} from "../kit/animals.js";
import {
  doing,
  drift,
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
  settle,
  walker,
  wander,
} from "../kit/critters.js";
import { mistAt, mistBand } from "../kit/effects.js";
import { HOUSECAT_COAT_NAMES, HOUSECAT_COATS } from "../kit/felid.js";
import { flyerAt, nesterAt, owlFlyAt } from "../kit/flyers.js";
import {
  blob,
  clamp,
  clearing,
  foliage,
  hash,
  makePlant,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
  stroke,
} from "../kit/pixel.js";
import { broadleafTree } from "../kit/trees.js";

const GLACIER_ROWS = 34;
const HILL_ROWS = 12;
const FALLS_ROWS = 26;
const STACK_ROWS = 30; // the sea stack's height at scale 1
const STACK_HALF = 7;
const STACK_MATURE = 2.5;
const PUFFINS = [-6, 0, 6]; // where the three nesting puffins stand on the stack, from its centre
const FJORD_ROWS = 16; // the fjord's height once the water has risen
const MISTS = 6;
const STARS = 60;
const AIRGLOW_ROWS = 64; // at most; never more than AIRGLOW_SHARE of the sky
const AIRGLOW_SHARE = 0.3;
const AIRGLOW_STEPS = 5;
const AURORA_EDGES = [0.06, 0.34, 0.58, 0.8]; // where a ray, measured up from its hem, changes tone

// The two curtains of aurora, the faint low one first. centre is the hem's height as a share of
// the soil line's; fold bunches the rays where the curtain turns away, and drift is how fast the
// folds travel; rise is the tallest ray; shimmer is how fast the rays flicker.
const CURTAINS = [
  { centre: 0.56, wave: 7, fold: 8, drift: 0.15, rise: 30, power: 0.7, shimmer: 0.3, seed: 23 },
  { centre: 0.42, wave: 9, fold: 14, drift: 0.12, rise: 46, power: 0.95, shimmer: 0.25, seed: 41 },
];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

const LIGHT = {
  ...HOUSECAT_COATS.light,
  snow: ["#f7fbfd", "#d6e5ef", "#a9c4d8"],
  basalt: ["#9a9fa6", "#7c8188", "#60656d", "#42474e"],
  moss: ["#a2cf6c", "#78ad55", "#5a8c45", "#42693a"],
  ochre: ["#dcbc68", "#c29c4c"],
  falls: ["#f4fcff", "#bde6f6", "#7cc3e8"],
  bush: ["#86b868", "#64a055", "#4a7f43", "#315c31"],
  birchStem: ["#7a5a42", "#5a4030"],
  groundShadow: "rgba(60, 50, 20, 0.22)", // the soft shadow every animal, plant and rock casts on the ground
  tussock: ["#dccb7e", "#b9ab58", "#8e8546"],
  stem: "#5d8f4a",
  flowers: ["#8e5cd9", "#a77be8", "#cdb2f5"],
  arctic: ["#7a6450", "#4e3f32", "#d9cbb6", "#1d1a18", "#7a6450"],
  canid: { R: "#6e2c2c", howl: "#5f6f84", dark: false },
  reindeer: ["#a07a54", "#5e4634", "#efe4d0", "#c9b494"],
  swan: ["#fbfdff", "#b9c4d0", "#f2c230", "#1f2226"],
  owl: ["#c99a5b", "#7a5532", "#efe2c4", "#e8b820", "#2b2620"],
  puffin: ["#23262d", "#fbfbfb", "#f5a524", "#e8572f", "#f08a3a"],
  eel: "#c8d2da",
  guano: "#eef0ec",
  fjord: ["#3f86ad", "#5fa6c9", "#f2fbff"],
  soil: ["#5a5450", "#4a4440", "#3b3531"],
  line: "rgba(255, 255, 255, 0.3)",
  wet: "#2b2622",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  mist: "#ffffff",
  haze: "#e9f3f9",
};

const DARK = {
  ...HOUSECAT_COATS.dark,
  snow: ["#8294a8", "#63758b", "#4a5a70"],
  basalt: ["#3b3f47", "#2c3038", "#21242a", "#16181c"],
  moss: ["#5f8c5a", "#4c7549", "#3d6040", "#2f4d33"],
  ochre: ["#8e7a48", "#76653c"],
  falls: ["#c6e7f6", "#7fb6d4", "#4f86ab"],
  bush: ["#4f7c51", "#3f6a44", "#31563a", "#25432d"],
  birchStem: ["#5a4634", "#463628"],
  groundShadow: "rgba(0, 0, 0, 0.32)",
  tussock: ["#7b8456", "#646d46", "#4f5837"],
  stem: "#4a6e44",
  flowers: ["#7a52b8", "#9775cf", "#bfa6e6"],
  arctic: ["#e7ecf0", "#9aa5b0", "#ffffff", "#14171b", "#e7ecf0"],
  canid: { R: "#3a2226", howl: "#e4ecf8", dark: true },
  reindeer: ["#7d634a", "#4a3b2f", "#c9bfae", "#a89878"],
  swan: ["#dfe6ee", "#97a5b5", "#d9ac30", "#111418"],
  owl: ["#a88050", "#6a4a2c", "#d9cdb0", "#e8b820", "#1a1612"],
  puffin: ["#1b1d24", "#d9dfe6", "#e09a3c", "#d24c30", "#d8783a"],
  eel: "#9fb0bf",
  guano: "#8a96a3",
  fjord: ["#22405a", "#2c4f68", "#8fb8d0"],
  aurora: ["#e2fff0", "#5ff2a8", "#2ccf8e", "#3aa6b8", "#8f78f2"], // from the hem up
  airglow: "#1f8a62",
  star: "#ffffff",
  soil: ["#2b2a2e", "#242328", "#1c1b20"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#0c0b0e",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  mist: "#9fb4c8",
  haze: "#0b0c12",
};

// An ice-capped range: a ridgeline of several peaks, snow above a ragged snow line and dark rock
// below it, lit on the slopes that face left and shaded on the others. It stands at its full height
// from the start and fades in as it grows, so the mountains do not swell with each watering.
function glacier(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(4, Math.round(GLACIER_ROWS * p.scale));
  const half = Math.round(height * 1.7);
  const ridge = (x) => {
    const u = (x - p.x) / half;
    if (Math.abs(u) >= 1) return 0;
    const peaks = 0.62 + 0.24 * Math.sin(u * 6 + p.seed) + 0.14 * Math.sin(u * 13 + p.seed * 3);
    return Math.max(0, Math.round(height * (1 - u * u) * peaks));
  };
  g.ctx.globalAlpha = s;
  for (let x = p.x - half; x <= p.x + half; x += 1) {
    const h = ridge(x);
    const lit = ridge(x + 1) >= ridge(x - 1);
    const snowLine = Math.round(height * 0.42 + (hash(x >> 1, p.seed, 4) - 0.5) * 6);
    for (let r = 0; r < h; r += 1) {
      let colour;
      if (r >= snowLine) {
        colour = hash(x, r, p.seed) < 0.03 ? pal.snow[2] : lit ? pal.snow[0] : pal.snow[1];
      } else if (r >= snowLine - 2 && hash(x, r, p.seed + 1) < 0.5) {
        colour = pal.snow[1];
      } else {
        colour = hash(x, r, p.seed + 2) < 0.05 ? pal.basalt[3] : lit ? pal.basalt[1] : pal.basalt[2];
      }
      rect(g, colour, x, base - 1 - r, 1, 1);
    }
  }
  g.ctx.globalAlpha = 1;
}

// Rolling hills of moss, with ochre where the moss is thin.
function hill(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(3, Math.round(HILL_ROWS * p.scale * s));
  const width = Math.round(90 * p.scale);
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const half = Math.round((width / 2) * Math.sqrt(1 - f * f) + (hash(r, p.seed, 1) - 0.5) * 2);
    if (half < 1) break;
    row(g, base - 1 - r, p.x - half, p.x + half, (x) => {
      if (hash(x, r, p.seed) < 0.08 + f * 0.1) return pal.ochre[hash(x, r, 9) < 0.5 ? 0 : 1];
      return pal.moss[f < 0.35 ? 0 : hash(x, r, p.seed + 3) < 0.45 ? 1 : 2];
    });
  }
}

// A mossy cliff with a waterfall: a broad basalt face, grass along its ragged top and down its
// sides, and a ribbon of water that shimmers as it falls into a white plunge of spray. Like the
// glaciers it stands at its full height and fades in.
function falls(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(6, Math.round(FALLS_ROWS * p.scale));
  const half = Math.max(6, Math.round(18 * p.scale));
  const flow = Math.floor(g.time * 12);
  g.ctx.globalAlpha = s;
  for (let x = p.x - half; x <= p.x + half; x += 1) {
    const edge = Math.min(x - (p.x - half), p.x + half - x);
    const top = base - height + Math.round(hash(x >> 1, p.seed, 2) * 3) + Math.max(0, 4 - edge) * 2;
    for (let y = top; y < base - 1; y += 1) {
      const c = x - p.x;
      let colour;
      if (Math.abs(c) <= 1 && y > base - height + 2) {
        const n = hash(c, y - flow, p.seed);
        colour = n > 0.66 ? pal.falls[0] : n > 0.33 ? pal.falls[1] : pal.falls[2];
      } else if (y - top < 2 || (edge < 3 && hash(x, y, p.seed + 3) < 0.5)) {
        colour = pal.moss[y - top < 1 ? 0 : 1];
      } else {
        colour = pal.basalt[(Math.floor((x - p.x + half) / 3) + p.seed) % 3];
      }
      rect(g, colour, x, y, 1, 1);
    }
  }
  for (let i = 0; i < 9; i += 1) {
    const dx = Math.round((hash(i, flow >> 2, p.seed) - 0.5) * 8);
    rect(g, pal.falls[0], p.x + dx, base - 2 - (i % 3), 1, 1);
  }
  rect(g, pal.falls[2], p.x - 6, base - 1, 13, 1);
  g.ctx.globalAlpha = 1;
}

// Black basalt: a cluster of prismatic columns, or a rounded boulder.
function basalt(g, p, s, base) {
  const { pal } = g;
  if (p.seed % 2) {
    const w = Math.max(5, Math.round((10 + (p.seed % 5)) * p.scale * s));
    const h = Math.max(3, Math.round(w * 0.55));
    blob(g, p.x, base - h, w, h, foliage({ cx: p.x, top: base - h, w, h }, pal.basalt, p.seed));
    return;
  }
  for (let i = 0; i < 3; i += 1) {
    const x = p.x + (i - 1) * 4;
    const h = Math.max(3, Math.round((8 + hash(i, p.seed, 3) * 9) * p.scale * s));
    const w = Math.max(3, Math.round(4 * p.scale * s));
    const left = x - (w >> 1);
    rect(g, pal.basalt[1], left, base - h, w, h);
    rect(g, pal.basalt[0], left, base - h, 1, h);
    rect(g, pal.basalt[3], left + w - 1, base - h, 1, h);
    rect(g, pal.basalt[0], left, base - h, w, 1);
  }
}

// A dwarf birch: a low, round shrub of small leaves, the broadleaf family's build (kit/broadleaf.js)
// at its smallest and fullest.
function dwarfBirch(g, p, s, base) {
  const { pal } = g;
  const rows = (5 + (p.seed % 3)) * 1.6;
  broadleafTree(g, p, s, base, { rows, tones: pal.bush, bark: pal.birchStem, from: 0.15, spread: 0.42, airy: 0.05 });
}

// A grass tussock: a clump of long blades that arch over.
function tussock(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(2, Math.round((4 + (p.seed % 4)) * p.scale * s) + 1);
  const blades = [
    [-1, -0.4, 0.7],
    [-0.6, -0.9, 0.5],
    [-0.2, -1, 0.3],
    [0.2, -1, 0.35],
    [0.6, -0.9, 0.5],
    [1, -0.4, 0.8],
  ];
  for (const [dx, dy, droop] of blades) {
    stroke(g, p.x, base - 1, dx, dy, length, droop, 1, [pal.tussock[1], pal.tussock[0]]);
  }
}

// A lupine: a green stem with a spike of purple flowers at its top.
function lupine(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(3, Math.round((9 + (p.seed % 6)) * p.scale * s));
  rect(g, pal.stem, p.x, base - h, 1, h);
  stroke(g, p.x, base - 1, -1, -0.5, 3, 0.2, 1, [pal.stem, pal.bush[1]]);
  stroke(g, p.x, base - 1, 1, -0.5, 3, 0.2, 1, [pal.stem, pal.bush[1]]);
  if (s < 0.5) return;
  const spike = Math.max(2, Math.round(h * 0.5));
  for (let i = 0; i < spike; i += 1) {
    rect(g, pal.flowers[(i + p.seed) % pal.flowers.length], p.x - 1 + (i % 2), base - h + i, 2, 1);
  }
}

// A low carpet of moss over the lava, with the odd ochre patch.
function moss(g, p, s, base) {
  const { pal } = g;
  const w = Math.max(4, Math.round((7 + (p.seed % 6)) * p.scale * s));
  const h = Math.max(2, Math.round(w * 0.3));
  const extra = (dx, dy) => (hash(dx, dy, p.seed + 5) < 0.08 ? pal.ochre[0] : null);
  blob(g, p.x, base - h, w, h, foliage({ cx: p.x, top: base - h, w, h }, pal.moss, p.seed, extra));
}

// A basalt sea stack at the fjord's edge, where the puffins nest: a tower of grey columns with a
// cap of grass on its flat top, streaked white below the burrows. It stands at its full height and
// fades in, like the glaciers.
function stack(g, p, s, base) {
  const { pal } = g;
  const height = stackHeight(p);
  const half = Math.max(3, Math.round(STACK_HALF * p.scale));
  g.ctx.globalAlpha = s;
  for (let x = p.x - half; x <= p.x + half; x += 1) {
    const edge = Math.min(x - (p.x - half), p.x + half - x);
    const top = base - height + (edge < 2 ? 2 - edge : 0);
    const column = Math.floor((x - p.x + half) / 2);
    const drip = hash(x, 7, p.seed) < 0.3 ? 2 + Math.floor(hash(x, 8, p.seed) * 4) : 0;
    for (let y = top; y < base; y += 1) {
      let colour = pal.basalt[(column + p.seed) % 3];
      if (y - top < 2) colour = pal.moss[y - top];
      else if (y - top < 2 + drip) colour = pal.guano;
      else if ((y + column * 3) % 7 === 0) colour = pal.basalt[3];
      rect(g, colour, x, y, 1, 1);
    }
  }
  g.ctx.globalAlpha = 1;
}

function stackHeight(p) {
  return Math.max(8, Math.round(STACK_ROWS * p.scale));
}

function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const stackX = Math.round(cols * (rand() < 0.5 ? 0.08 : 0.92));
  const far = (x) => Math.abs(x - cols / 2) > cols / 5 && Math.abs(x - stackX) > 30;
  scatter(plants, ctx, {
    kind: "glacier",
    count: Math.round(cols / 60),
    born: [1, 2],
    scale: [1.1, 1.5],
    layer: -1,
  });
  scatter(plants, ctx, {
    kind: "glacier",
    count: Math.round(cols / 44),
    born: [1, 3],
    scale: [0.6, 0.9],
    layer: 0,
  });
  scatter(plants, ctx, {
    kind: "hill",
    count: Math.round(cols / 36),
    born: [1, 3],
    scale: [0.6, 0.9],
    layer: 0,
  });
  scatter(plants, ctx, {
    kind: "falls",
    count: 2,
    born: [3, 4],
    scale: [0.9, 1.2],
    layer: 0,
    keep: far,
  });
  scatter(plants, ctx, {
    kind: "basalt",
    count: Math.round(cols / 24),
    born: [0, 3],
    scale: [0.8, 1.4],
    depth: [3, 14],
  });
  scatter(plants, ctx, {
    kind: "birch",
    count: Math.round(cols / 14),
    born: [2, 4],
    scale: [0.8, 1.2],
    depth: [2, 13],
  });
  scatter(plants, ctx, {
    kind: "tussock",
    count: Math.round(cols / 9),
    born: [0, 3],
    scale: [0.8, 1.3],
    depth: [0, 14],
  });
  scatter(plants, ctx, {
    kind: "lupine",
    count: Math.round(cols / 12),
    born: [2, 5],
    scale: [0.8, 1.2],
    depth: [1, 14],
  });
  scatter(plants, ctx, {
    kind: "moss",
    count: Math.round(cols / 7),
    born: [0, 2],
    scale: [0.8, 1.5],
    depth: [0, 15],
  });
  const tall = ["glacier", "hill", "falls", "basalt", "birch"];
  for (const p of plants) {
    if (tall.includes(p.kind)) p.scale *= clearing(p.x, cols);
  }
  plants.push(makePlant(rand, "stack", stackX, { born: 2, depth: 2, scale: clearing(stackX, cols) }));
  sortPlants(plants);
  return plants;
}

// Dark volcanic soil, with moss creeping over its top edge as the scene grows.
function soil(pal, x, y, depth, turf) {
  if (y < 3 && hash(x, y, 21) < turf * (0.85 - y * 0.2)) {
    return pal.moss[Math.floor(hash(x, y, 22) * 4)];
  }
  const n = hash(x, y, 11);
  if (hash(x, y, 31) < 0.012) return pal.basalt[0];
  if (n < 0.1 + depth * 0.22) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures

// A puffin in fast flight, its wings whirring and its striped beak bright. Its palette is puffin:
// [black, white, beak, beak tip, feet].
function puffinAt(g, p, time) {
  if (g.trace) return g.trace.draw(puffinAt, g, p, time);
  flyerAt(g, p, time, "puffin");
}

// A flock of puffins, the leader first and the others trailing behind.
function flockAt(g, bird, time) {
  if (g.trace) return g.trace.draw(flockAt, g, bird, time);
  for (const m of bird.members) {
    puffinAt(g, { x: bird.x - bird.dir * m.back, y: bird.y + m.up, dir: bird.dir, phase: m.phase }, time);
  }
}

// The stack once it has grown, or null.
function grownStack(f) {
  const p = f.plants.find((plant) => plant.kind === "stack");
  if (!p || p.shown - p.born < STACK_MATURE) return null;
  return p;
}

// The fjord lies between the hills and the glaciers. Its water rises over the first waterings.
function fjordLevel(f) {
  return smooth(clamp((f.stage - 2) / 3, 0, 1)) * FJORD_ROWS;
}

// Smooth 1-D value noise in [0, 1).
function noise(x, seed) {
  const i = Math.floor(x);
  const u = smooth(x - i);
  return hash(i, 0, seed) * (1 - u) + hash(i + 1, 0, seed) * u;
}

// The alpha for a pixel of aurora at strength a: one of four fixed steps, and below a quarter a
// dithered scatter at the faintest step, so the glow stays pixel art. 0 means leave it out.
function glowAlpha(a, x, y) {
  if (a <= 0.03) return 0;
  if (a < 0.25) return dither(x, y) > a / 0.25 ? 0 : 0.2;
  return (Math.ceil(a * 4) / 4) * 0.82;
}

// A ray of aurora climbing `height` rows from its hem at y0, bright at the hem and fading as it
// passes through the tones. Runs of one tone and alpha are drawn as one rectangle.
function ray(g, x, y0, height, bright) {
  const { ctx, pal } = g;
  let run = null;
  const flush = () => {
    if (!run) return;
    ctx.globalAlpha = run.alpha;
    rect(g, run.colour, x, run.top, 1, run.bottom - run.top + 1);
    run = null;
  };
  for (let r = 0; r <= height; r += 1) {
    const u = r / Math.max(1, height);
    const y = y0 - r;
    const alpha = glowAlpha(r < 1 ? bright : bright * (1 - u) ** 1.25, x, y);
    const tone = AURORA_EDGES.findIndex((edge) => u < edge);
    const colour = pal.aurora[tone < 0 ? AURORA_EDGES.length : tone];
    if (run && (!alpha || run.alpha !== alpha || run.colour !== colour)) flush();
    if (!alpha) continue;
    if (run) run.top = y;
    else run = { colour, alpha, top: y, bottom: y };
  }
  flush();
}

// One curtain: a ray per column under a wavy hem. Shifting each ray sideways by fold * sin(...)
// bunches the rays where the curtain turns away, and the stacked alpha brightens it there.
function curtain(g, f, c, time) {
  const { lum } = f.extra;
  for (let s = -40; s < f.cols + 40; s += 1) {
    const x = Math.round(s + c.fold * Math.sin(s * 0.045 + time * c.drift + c.seed));
    if (x < 0 || x >= f.cols) continue;
    const hem = Math.round(
      f.groundY * c.centre +
        (noise(s * 0.012 + time * 0.05, c.seed) - 0.5) * 2 * c.wave +
        3 * Math.sin(s * 0.045 - time * 0.3 + c.seed),
    );
    const streak = noise(s * 0.55 + time * c.shimmer, c.seed + 1);
    const patch = 0.35 + 0.65 * noise(s * 0.02 - time * 0.1, c.seed + 2);
    const pulse = 0.7 + 0.3 * Math.sin(s * 0.06 - time * 1.2);
    const bright = clamp(c.power * (0.2 + 0.8 * streak * streak) * patch * pulse * 1.5, 0, 1);
    const reach = (0.35 + 0.65 * noise(s * 0.12 + time * 0.2, c.seed + 3)) * (0.6 + 0.4 * streak);
    ray(g, x, hem, Math.round(c.rise * reach), bright);
    lum[x] = Math.max(lum[x], bright * c.power);
  }
}

// A green airglow rising from the horizon in steps of strength, dithered from one step to the
// next. It never moves, so it is drawn once into its own canvas.
function airglow(pal, cols, rows) {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = pal.airglow;
  for (let y = 0; y < rows; y += 1) {
    const level = (AIRGLOW_STEPS * y) / rows;
    const step = Math.floor(level);
    ctx.globalAlpha = 0.03 * step;
    if (step > 0) ctx.fillRect(0, y, cols, 1);
    ctx.globalAlpha = 0.03 * (step + 1);
    for (let x = 0; x < cols; x += 1) {
      if (dither(x, y) < level - step) ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// Dark mode's sky: the airglow, twinkling stars and the two curtains of aurora. It notes how
// bright the aurora is over each column, for the fjord and the snow to echo. Under reduced motion
// it holds still.
function night(g, f) {
  const x = f.extra;
  const glowRows = Math.max(1, Math.round(Math.min(AIRGLOW_ROWS, f.groundY * AIRGLOW_SHARE)));
  x.airglow ??= airglow(g.pal, f.cols, glowRows);
  g.ctx.drawImage(x.airglow, 0, f.groundY - x.airglow.height);
  for (const star of x.stars) {
    const pulse = 0.5 + 0.5 * Math.sin(g.time * star.rate + star.phase);
    g.ctx.globalAlpha = (0.35 + pulse * 0.65) * 0.75;
    rect(g, g.pal.star, star.x, star.y, 1, 1);
  }
  x.lum.fill(0);
  const time = f.reduced ? 0 : f.time;
  for (const c of CURTAINS) curtain(g, f, c, time);
  g.ctx.globalAlpha = 1;
}

// The aurora mirrored in the fjord: broken glints under each bright column, rippling and fading
// with depth.
function reflection(g, f) {
  const rows = Math.round(f.extra.fjord);
  if (rows < 3) return;
  const { lum } = f.extra;
  const [hem, green] = g.pal.aurora;
  const top = f.groundY - rows;
  const time = f.reduced ? 0 : f.time;
  const tick = Math.floor(time * 5);
  for (let r = 2; r < rows; r += 1) {
    const sway = Math.round(Math.sin(r * 1.7 + time * 1.6) * 1.5);
    const depth = 1 - r / rows;
    for (let x = 0; x < f.cols; x += 1) {
      const l = lum[clamp(x + sway, 0, f.cols - 1)] * 1.4 * depth;
      if (l < 0.12 || hash(x >> 1, r, tick) > l * 0.6) continue;
      const alpha = glowAlpha(l * 0.75, x, top + r);
      if (!alpha) continue;
      g.ctx.globalAlpha = alpha;
      rect(g, r < 4 ? hem : green, x, top + r, 1, 1);
    }
  }
  g.ctx.globalAlpha = 1;
}

// Snow, rock and moss catch the aurora: a green wash over what is already drawn, strongest on the
// peaks and under the brightest part of the sky.
function auroraLight(g, f) {
  const { ctx } = g;
  const { lum } = f.extra;
  const top = f.groundY - 56;
  ctx.globalCompositeOperation = "source-atop";
  for (let x = 0; x < f.cols; x += 4) {
    let l = 0;
    for (let i = x; i < Math.min(x + 4, f.cols); i += 1) l = Math.max(l, lum[i]);
    for (let band = 0; band < 4; band += 1) {
      ctx.globalAlpha = 1.8 * l * (0.16 - band * 0.035);
      rect(g, g.pal.aurora[1], x, top + band * 16, 4, 16);
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// The fjord's water, drawn behind the hills, with glints on its surface.
function fjord(g, f) {
  const rows = Math.round(f.extra.fjord);
  if (rows < 2) return;
  const [deep, mid, glint] = g.pal.fjord;
  const top = f.groundY - rows;
  const split = Math.max(1, Math.round(rows / 2));
  rect(g, deep, 0, top, f.cols, split);
  rect(g, mid, 0, top + split, f.cols, rows - split);
  rect(g, glint, 0, top, f.cols, 1);
  for (let x = 0; x < f.cols; x += 1) {
    if (hash(x, Math.floor(g.time * 2), 7) < 0.02) {
      rect(g, glint, x, top + 2 + (x % Math.max(1, rows - 3)), 1, 1);
    }
  }
}

const extras = {
  init(f) {
    const stars = Array.from({ length: STARS }, () => ({
      x: Math.floor(f.rand() * f.cols),
      y: 2 + Math.floor(f.rand() * Math.max(10, f.groundY * 0.55)),
      phase: f.rand() * 6.28,
      rate: 0.6 + f.rand() * 1.6,
    }));
    return {
      cat: { ...walker(f), pal: `housecat-${HOUSECAT_COAT_NAMES[Math.floor(f.rand() * HOUSECAT_COAT_NAMES.length)]}` },
      fjord: 0,
      stars,
      lum: new Float32Array(f.cols), // how bright the aurora is over each column
      airglow: null,
      mists: Array.from({ length: MISTS }, () => mistBand(f, 14, 12)),
      owl: { next: 2, bird: null },
      flyingSwan: { next: 6, bird: null },
      puffins: { next: 3, bird: null },
      nesters: null,
      fox: { ...walker(f), kind: "arctic" },
      pup: { ...walker(f, 0.6), kind: "arctic" },
      swan: walker(f),
      mate: walker(f),
      stag: { ...walker(f), kind: "reindeer", sex: "m" },
      hind: { ...walker(f, 0.9), kind: "reindeer", sex: "f" },
    };
  },

  // The fjord rises over the first waterings, and jumps to its level under reduced motion.
  onGrow(f) {
    if (f.stage >= 3 && !narrow(f)) enter(f, f.extra.cat);
    const x = f.extra;
    if (f.reduced) x.fjord = fjordLevel(f);
    if (f.stage >= 1) {
      enter(f, x.fox);
      enterBehind(f, x.pup, x.fox, 12);
    }
    if (f.stage >= 3) {
      enter(f, x.swan);
      enterBehind(f, x.mate, x.swan, 13);
    }
    if (f.stage >= 7) enter(f, x.stag);
    if (f.stage >= 8) enterBehind(f, x.hind, x.stag, 16);
  },

  busy: () => true,

  update(f, dt) {
    wander(f, f.extra.cat, dt, { speed: 7, stride: 7, sit: [4, 9], walk: [3, 6] });
    rest(f, f.extra.cat, felidPoses("housecat"));
    const x = f.extra;
    x.fjord += (fjordLevel(f) - x.fjord) * Math.min(1, dt * 0.8);
    if (f.stage >= 2) {
      drift(f, x.owl, dt, {
        every: [9, 5],
        speed: 15,
        spawn: () => ({ y: f.groundY - 22 - f.rand() * 10 }),
      });
    }
    if (f.stage >= 4 && !isNight(f)) {
      flyBy(f, x.flyingSwan, dt, { every: [9, 7], speed: 12, spawn: () => ({ y: f.groundY - 62 - f.rand() * 16 }) });
    }
    // Puffins are at sea through the winter nights, so the flock flies by day only.
    if (f.stage >= 3 && !isNight(f)) {
      flyBy(f, x.puffins, dt, {
        every: [5, 6],
        speed: 36,
        margin: 40,
        spawn: () => ({ y: f.groundY - 46 - f.rand() * 24, members: flock(f, 3, 9) }),
      });
    }
    const stack = grownStack(f);
    if (stack && !x.nesters) {
      const top = f.groundY + stack.depth - stackHeight(stack);
      x.nesters = PUFFINS.map((dx, i) =>
        percher(f, stack.x + dx, top, i === 0 ? 1 : -1, {
          look: { every: [4, 8], lasts: 1.8 },
          blink: { every: [2, 5], lasts: 0.3 },
          bob: { every: [3, 7], lasts: 0.8 },
          preen: { every: [8, 14], lasts: 2.4 },
          stretch: { every: [8, 16], lasts: 1.6 },
          turn: { every: [8, 14], lasts: 2.6 },
          ...(i === 1 ? { fish: { every: [30, 45], lasts: 10 } } : {}),
        }),
      );
      for (const n of x.nesters) n.carrying = -1;
    }
    for (const n of x.nesters ?? []) {
      const wasFishing = doing(n, "fish", f.time) >= 0;
      fidget(f, n);
      if (wasFishing && doing(n, "fish", f.time + dt) < 0) n.carrying = f.time + 6;
    }
    wander(f, x.fox, dt, { speed: 9, stride: 8, sit: [3, 6], walk: [3, 6] });
    follow(x.pup, x.fox, dt, 12);
    x.pup.state = x.fox.state;
    x.pup.phase = x.fox.phase;
    settleCanid(f, x.fox);
    settleCanid(f, x.pup, x.fox);
    const swanX = x.swan.x;
    const mateX = x.mate.x;
    wander(f, x.swan, dt, { speed: swanSpeed, sit: [4, 7], walk: [2, 4] });
    follow(x.mate, x.swan, dt, 13);
    x.mate.state = x.swan.state;
    x.mate.timer = x.swan.timer;
    rest(f, x.swan, swanPoses(x.swan));
    rest(f, x.mate, swanPoses(x.mate));
    longNeckStep(x.swan, swanX, dt, SWAN_STRIDE);
    longNeckStep(x.mate, mateX, dt, SWAN_STRIDE);
    wander(f, x.stag, dt, { speed: 7, stride: 6, sit: [4, 8], walk: [3, 6] });
    follow(x.hind, x.stag, dt, 16);
    x.hind.state = x.stag.state;
    x.hind.phase = x.stag.phase;
    x.hind.timer = x.stag.timer;
    settle(f, x.stag);
    settle(f, x.hind);
  },

  // Behind the plants: the night sky in dark mode, then the fjord with the aurora mirrored in it.
  // All of it is still under reduced motion.
  drawBack(g, f) {
    const dark = f.theme === "dark";
    if (dark) night(g, f);
    fjord(g, f);
    if (dark) reflection(g, f);
  },

  draw(g, f) {
    if (f.extra.cat.active) felidAt(g, { ...f.extra.cat, kind: "housecat" }, f.time);
    const x = f.extra;
    if (f.theme === "dark") auroraLight(g, f);
    if (f.stage >= 1) {
      for (const m of x.mists) mistAt(g, m, f.time, f.cols);
    }
    if (x.owl.bird) owlFlyAt(g, x.owl.bird, f.time, "shortEared", isNight(f));
    if (x.puffins.bird && !isNight(f)) flockAt(g, x.puffins.bird, f.time);
    for (const n of x.nesters ?? []) nesterAt(g, n, f.time, isNight(f));
    for (const s of [x.swan, x.mate]) if (s.active) swanAt(g, s, f.time);
    if (x.flyingSwan.bird && !isNight(f)) swanAt(g, { ...x.flyingSwan.bird, pose: "fly" }, f.time);
    if (x.stag.active) cervidAt(g, x.stag, f.time);
    if (x.hind.active) cervidAt(g, x.hind, f.time);
    if (x.fox.active) canidAt(g, x.fox, f.time);
    if (x.pup.active) canidAt(g, x.pup, f.time);
  },
};

export default {
  id: "iceland",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.35, 0.6], dark: [0.45, 0.68] },
  mature: {
    glacier: 2.5,
    hill: 2.5,
    falls: 3,
    basalt: 1.5,
    birch: 2,
    tussock: 1.5,
    lupine: 2,
    moss: 1.2,
    stack: STACK_MATURE,
  },
  paint: { glacier, hill, falls, basalt, birch: dwarfBirch, tussock, lupine, moss, stack },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      "...kkkk.....",
      "..kwwwwk....",
      "..kwkwwoo...",
      "..kwwwworr..",
      "..kwwwwoo...",
      ".kkkkkk.....",
      "kkkkwwwg....",
      "kkkwwwwwg...",
      ".kkwwwwwg...",
      "..kkwwwg....",
      "...oo.oo....",
    ],
    colours: { k: "#23262d", w: "#eceff1", g: "#b8bec6", o: "#f5a524", r: "#e8572f" },
  },
};
