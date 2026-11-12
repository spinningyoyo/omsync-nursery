// The Hawaii beach scene: coconut palms and plumeria over golden sand, with fluted green sea
// cliffs behind. Watering brings the tide in. By day white-tailed tropicbirds (koaʻe kea) fly over,
// trailing their long streamers; a pale ghost crab (ʻōhiki) scuttles on the sand, a moa (feral
// chicken) pecks, a Hawaiian monk seal and her pup haul out and shuffle along, a honu swims with its
// hatchling, a pua'a (feral pig) roots about, and a humpback whale spouts offshore. Where the waves
// break on the sand, spray flies up.
import { enter, enterBehind, flyBy, follow, isNight, wander, walker } from "../kit/critters.js";
import {
  blob,
  clamp,
  clearing,
  foliage,
  hash,
  part,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
  sprite,
  stroke,
  wind,
} from "../kit/pixel.js";
import { crabAt, flyerAt, groundBirdAt, honuShellAt } from "../kit/animals.js";
import { broadleafTree } from "../kit/trees.js";

const PALM_ROWS = 40;
const RIDGE_ROWS = 56;
const SEA_ROWS = 12; // the sea's height at full tide
const CRABS = 1;
// Small plants are sown at this share of their old number, so more sand shows and the animals stand
// out. The trees are not counted among them.
const SMALL_PLANTS = 0.6;
const SPRAY_MAX = 60; // droplets at most
const GRAVITY = 60; // art pixels per second squared: a drop is in the air for up to 0.8 s

const LIGHT = {
  leaf: ["#bfe6a0", "#8bd070", "#58b45e", "#3a9150"],
  trunk: ["#b99672", "#957452"],
  coconut: "#6b4a2f",
  flowers: ["#f2506e", "#ffd54a", "#ffffff", "#ff8ab3", "#ff9a3c"],
  grass: ["#ece6a0", "#d2d77e", "#adbd5e"],
  shell: ["#fff4ea", "#f6b5b0", "#ff9a5c"],
  surf: ["#ff6f61", "#ffd54a", "#4cc9f0", "#ffffff"],
  ridge: ["#6cb888", "#4a9570", "#347658"],
  sea: ["#8fe0e6", "#4cb8d8", "#2f8fc0", "#ffffff"],
  tropicbird: ["#ffffff", "#2a2a30", "#f2a52a", "#aab4be"],
  iiwi: { C: "#d8321e", H: "#d8321e", E: "#14100a", K: "#e8907a", T: "#1c1c20", b: "#1c1c20", B: "#d8321e", l: "#e8503a", t: "#1c1c20", p: "#3a3a44", d: "#101014" },
  crab: ["#ece0c4", "#bcae8e"],
  turtle: ["#9a6632", "#6b4423", "#d6c28a"],
  whale: ["#4a6d8c", "#8fb0c8"],
  seal: ["#6e767e", "#e6dcc6", "#1f2328"],
  moa: ["#c9501c", "#23403a", "#e0242b", "#d9a62b"],
  pig: ["#4a3b32", "#2a211c", "#b98f7f"],
  soil: ["#f7e8c4", "#eed7a8", "#dfc28c"],
  line: "rgba(255, 255, 255, 0.4)",
  wet: "#8a6a3c",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  haze: "#ffffff",
};

const DARK = {
  leaf: ["#8cc278", "#66a85a", "#478844", "#336b36"],
  trunk: ["#8f7352", "#6e563d"],
  coconut: "#4a3220",
  flowers: ["#f2506e", "#ffd54a", "#f5f5f5", "#ff8ab3", "#ff9a3c"],
  grass: ["#c8c27a", "#a8ad5e", "#868f46"],
  shell: ["#f2e8dc", "#e8a39e", "#ff9a5c"],
  surf: ["#ff6f61", "#ffd54a", "#4cc9f0", "#f5f5f5"],
  ridge: ["#4a8f6a", "#367556", "#265a43"],
  sea: ["#2f9cb0", "#1f78a0", "#155a86", "#d8f0f4"],
  tropicbird: ["#e8eef2", "#1a1a20", "#f2a52a", "#8a96a2"],
  iiwi: { C: "#862318", H: "#862318", E: "#100e0c", K: "#8f5b50", T: "#15161a", b: "#15161a", B: "#862318", l: "#8f3529", t: "#15161a", p: "#27282f", d: "#0e0e12" },
  crab: ["#d8ccb0", "#a89a7c"],
  turtle: ["#a8743a", "#7a4f28", "#dac790"],
  whale: ["#5a7d9c", "#9fc0d8"],
  seal: ["#7d8790", "#cfc6b2", "#15181c"],
  moa: ["#d9622a", "#3f7566", "#ff4a4a", "#e8c04a"],
  pig: ["#a37c62", "#6a4a38", "#e8bfa8"],
  soil: ["#6a5a3c", "#5c4d33", "#4c3f2a"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#1c1408",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  haze: "#0b0b0b",
};

function coconut(g, p, s, base) {
  const { pal } = g;
  const total = Math.max(5, Math.round(PALM_ROWS * p.scale * s));
  const lean = p.seed & 1 ? 1 : -1;
  const reach = Math.round(total * 0.2) * lean;
  const sway = wind(g.time, p.x);
  const width = total >= 22 ? 2 : 1;
  for (let i = 0; i < total; i += 1) {
    const bend = Math.round(reach * Math.pow(i / total, 1.7) + sway * Math.pow(i / total, 2));
    rect(g, pal.trunk[i % 3 === 0 ? 1 : 0], p.x + bend - (width >> 1), base - 1 - i, width, 1);
  }
  const tx = p.x + reach + sway;
  const ty = base - total;
  const length = Math.max(3, Math.round(total * 0.42));
  const wide = total >= 22 ? 3 : total >= 12 ? 2 : 1;
  for (const [dx, dy, droop] of [[1, -0.9, 0.45], [1, -0.4, 0.7], [1, 0.05, 0.9], [1, 0.4, 1]]) {
    stroke(g, tx, ty, dx, dy, length, droop, wide, [pal.leaf[2], pal.leaf[0]]);
    stroke(g, tx, ty, -dx, dy, length, droop, wide, [pal.leaf[2], pal.leaf[0]]);
  }
  stroke(g, tx, ty, 0, -1, Math.max(2, length >> 1), 0, 1, [pal.leaf[1], pal.leaf[0]]);
  if (total >= 14) {
    rect(g, pal.coconut, tx - 1, ty + 1, 2, 2);
    rect(g, pal.coconut, tx + 1, ty + 2, 2, 2);
  }
}

function plumeria(g, p, s, base) {
  const { pal } = g;
  broadleafTree(g, p, s, base, {
    rows: 22,
    tones: pal.leaf,
    trunkTones: pal.trunk,
    extra: (dx, dy) => {
      const n = hash(dx, dy, p.seed + 4);
      return n > 0.9 ? pal.flowers[2] : n > 0.86 ? pal.flowers[3] : null;
    },
  });
}

function hibiscus(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round((6 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 2.2);
  const colour = pal.flowers[p.seed % 2 === 0 ? 0 : 4];
  const shade = foliage({ cx: p.x, top: base - h, w, h }, pal.leaf, p.seed, (dx, dy) =>
    s >= 0.7 && hash(dx, dy, p.seed + 3) > 0.92 ? colour : null,
  );
  blob(g, p.x, base - h, w, h, shade);
}

// Heart-leaved taro: a short stem under a few broad leaves.
function taro(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(3, Math.round(9 * p.scale * s));
  const sway = wind(g.time, p.x);
  rect(g, pal.leaf[3], p.x, base - h, 1, h);
  for (const [dx, lift] of [[-4, 0], [4, 1], [0, 3]]) {
    const lw = Math.max(3, Math.round(7 * s));
    const lh = Math.max(2, Math.round(5 * s));
    blob(g, p.x + dx + sway, base - h - lift - lh + 1, lw, lh, foliage({ cx: p.x + dx, top: base - h - lift - lh, w: lw, h: lh }, pal.leaf, p.seed + dx));
  }
}

function dune(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(2, Math.round((5 + (p.seed % 4)) * p.scale * s));
  for (const [dx, dy, droop] of [[-0.8, -1, 0.5], [-0.3, -1, 0.35], [0.2, -1, 0.4], [0.7, -1, 0.55]]) {
    stroke(g, p.x, base - 1, dx, dy, length, droop, 1, [pal.grass[1], pal.grass[0]]);
  }
}

function birdOfParadise(g, p, s, base) {
  const { pal } = g;
  const stem = Math.max(3, Math.round((9 + (p.seed % 4)) * p.scale * s));
  rect(g, pal.leaf[3], p.x, base - stem, 1, stem);
  stroke(g, p.x, base - 2, -1, -0.6, 4, 0.6, 2, [pal.leaf[2], pal.leaf[0]]);
  stroke(g, p.x, base - 3, 1, -0.6, 4, 0.6, 2, [pal.leaf[2], pal.leaf[0]]);
  if (s < 0.5) return;
  const y = base - stem;
  rect(g, pal.leaf[2], p.x - 1, y, 3, 1);
  stroke(g, p.x, y, 0, -1, 4, 0, 1, [pal.flowers[4], pal.flowers[1]]);
  stroke(g, p.x, y, -0.5, -1, 3, 0, 1, [pal.flowers[4], pal.flowers[1]]);
  stroke(g, p.x, y, 0.5, -1, 3, 0, 1, [pal.flowers[4], pal.flowers[1]]);
  rect(g, "#3a7fd0", p.x + 1, y - 1, 2, 1);
}

function shell(g, p, s, base) {
  const { pal } = g;
  if (p.species === "starfish") {
    rect(g, pal.shell[2], p.x - 1, base - 1, 3, 1);
    rect(g, pal.shell[2], p.x, base - 2, 1, 3);
    rect(g, pal.shell[2], p.x - 2, base - 2, 1, 1);
    rect(g, pal.shell[2], p.x + 2, base - 2, 1, 1);
  } else if (p.species === "conch") {
    rect(g, pal.shell[0], p.x - 2, base - 2, 4, 2);
    rect(g, pal.shell[1], p.x - 1, base - 3, 2, 1);
    rect(g, pal.shell[1], p.x - 2, base - 1, 1, 1);
  } else {
    blob(g, p.x, base - 3, 4, 3, () => pal.shell[0]);
    rect(g, pal.shell[1], p.x, base - 2, 1, 1);
  }
}

function surfboard(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(4, Math.round(14 * s));
  const colour = pal.surf[p.seed % 3];
  blob(g, p.x, base - h, 4, h, () => colour);
  rect(g, pal.surf[3], p.x - 1, base - Math.round(h * 0.6), 3, 1);
  rect(g, pal.surf[3], p.x, base - h + 1, 1, h - 2);
}

// Sea cliffs: steep green spires with fluted sides and a forest on top.
function ridge(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(4, Math.round(RIDGE_ROWS * p.scale * s));
  const width = Math.round(height * 0.7) + 6;
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const half = Math.round((width / 2) * Math.pow(1 - f, 0.8) + (hash(r, p.seed, 1) - 0.5) * 1.2);
    if (half < 1) break;
    row(g, base - 1 - r, p.x - half, p.x + half, (x) => {
      const flute = hash(x, 0, p.seed) < 0.3 ? 1 : 0;
      const u = (x - p.x) / half;
      return pal.ridge[Math.min(2, (u < -0.1 ? 0 : u < 0.5 ? 1 : 2) + flute)];
    });
  }
}

const PAINT = { coconut, plumeria };

function tree(g, p, s, base) {
  PAINT[p.species](g, p, s, base);
}

function generate(ctx) {
  const { cols } = ctx;
  const plants = [];
  const middle = (x) => Math.abs(x - cols / 2) > Math.min(70, cols / 2 - 24);
  const palms = ["coconut", "coconut", "coconut", "plumeria"];
  scatter(plants, ctx, { kind: "ridge", count: Math.round(cols / 58), born: [1, 3], scale: [0.8, 1.2], layer: -1, keep: middle });
  scatter(plants, ctx, { kind: "tree", count: Math.round(cols / 18), born: [1, 4], scale: [0.55, 0.85], layer: 0, species: palms });
  scatter(plants, ctx, { kind: "dune", count: Math.round((cols / 9) * SMALL_PLANTS), born: [0, 3], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, { kind: "tree", count: Math.round(cols / 28), born: [1, 4], scale: [0.85, 1.3], depth: [3, 12], species: palms });
  scatter(plants, ctx, { kind: "hibiscus", count: Math.round((cols / 26) * SMALL_PLANTS), born: [2, 5], scale: [0.8, 1.2], depth: [2, 13] });
  scatter(plants, ctx, { kind: "taro", count: Math.round((cols / 34) * SMALL_PLANTS), born: [1, 4], scale: [0.8, 1.2], depth: [2, 13] });
  scatter(plants, ctx, { kind: "dune", count: Math.round((cols / 6) * SMALL_PLANTS), born: [0, 3], scale: [0.8, 1.3], depth: [0, 15] });
  scatter(plants, ctx, { kind: "paradise", count: Math.round((cols / 30) * SMALL_PLANTS), born: [2, 5], scale: [0.9, 1.3], depth: [1, 13] });
  scatter(plants, ctx, { kind: "shell", count: Math.round(cols / 16), born: [1, 5], depth: [3, 14], species: ["starfish", "conch", "conch", "dollar"] });
  scatter(plants, ctx, { kind: "surfboard", count: Math.max(1, Math.round((cols / 90) * 0.4)), born: [4, 6], depth: [6, 12] });
  for (const p of plants) {
    if (["tree", "hibiscus", "taro", "paradise"].includes(p.kind)) p.scale *= clearing(p.x, cols);
  }
  sortPlants(plants);
  return plants;
}

// Dry golden sand, darker where the sea has been; beach grass seeds along the top edge.
function soil(pal, x, y, depth, turf) {
  if (y === 0 && hash(x, 0, 5) < turf * 0.6) return pal.grass[2];
  const n = hash(x, y, 11);
  if (hash(x, y, 31) < 0.012) return pal.shell[hash(x, y, 32) < 0.5 ? 0 : 1];
  if (n < 0.1 + depth * 0.2) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures

// A white-tailed tropicbird, the koaʻe kea: white, with a black bar through the eye and another
// across the wing, a yellow bill, and two long tail streamers that wave behind it. The body is the
// kit's tropicbird flyer; the streamers are drawn here. Its palette is
// tropicbird: [white, black, bill, shade].
function tropicbirdAt(g, b, time) {
  const [white, , , shade] = g.pal.tropicbird;
  flyerAt(g, b, time, "tropicbird");
  const x = Math.round(b.x) - b.dir * 5;
  const y = Math.round(b.y + Math.sin(time * 1.4 + b.phase) * 3);
  for (let i = 1; i <= 6; i += 1) {
    const wave = Math.round(Math.sin(time * 5 + b.phase - i * 0.7));
    part(g, i > 4 ? shade : white, x, y, b.dir, -i, wave, 1, 1);
  }
}

// An ʻōhiki, the pale ghost crab of the sand, up on its legs with its stalked eyes raised. Its
// palette is crab: [shell, dark].

// A sea turtle, or its hatchling when its scale is below 1.
function honuAt(g, t, time, seaTop, seaBottom) {
  const y = Math.round(clamp(seaTop + (seaBottom - seaTop) * 0.55, seaTop + 3, seaBottom - 3) + Math.sin(time * 1.2) * 1.5);
  honuShellAt(g, t, y + 1, time, t.scale);
}

// A Hawaiian monk seal hauled out on the sand: grey above and cream below, with no spots. On land
// it moves in hitches, hunching its back and heaving forward a few pixels at a time, and now and
// then it lifts its head. A pup is drawn at a smaller scale. Its palette is seal: [back, belly, eye].
// A Hawaiian monk seal, the swimmers' long build: a body tapering to the tail, a small round head
// with a dark nose, a pale belly and a dark fore flipper. It galumphs, its middle humping up as it
// pulls itself along. The pup (scale below 1) is drawn on its own. B body, P belly, D dark, e eye.
const SEAL = {
  flat: [
    "..............BBBB.",
    "....BBBBBBBBBBBBBeB",
    "..BBBBBBBBBBBBBBBBD",
    "BBBBBBBBBBBBBBBBB..",
    ".DPPPPPPPPPPPPBB...",
  ],
  hump: [
    "..............BBBB.",
    ".......BBBBBBBBBBeB",
    "....BBBBBBBBBBBBBBD",
    "BBBBBBBBBBBBBBBBB..",
    ".DPPPPPPPPPPPPBB...",
  ],
};
const SEAL_PUP = ["......BBB.", "..BBBBBBeB", "BBBBBBBBBD", ".PPPPPPB.."];

// Its palette is seal: [body, belly, eye].
function sealAt(g, s, time) {
  const [body, belly, eye] = g.pal.seal;
  const x = Math.round(s.x / 3) * 3;
  const hump = s.state === "walk" && Math.round(s.x / 3) % 2 === 0;
  const grid = s.scale < 1 ? SEAL_PUP : hump ? SEAL.hump : SEAL.flat;
  const lift = Math.floor(time * 2 + s.phase) % 3 === 0 ? 1 : 0;
  sprite(g, grid, { B: body, P: belly, D: eye, e: eye }, x, g.groundY + 7, s.dir, 9, grid.length);
  if (lift && grid !== SEAL_PUP) part(g, body, x, g.groundY + 7, s.dir, 6, -6, 2, 1); // the head lifts
}

// A moa, a feral red junglefowl rooster. It struts while it walks and pecks at the sand while it
// sits. Its palette is moa: [body, tail, comb, legs].
function moaAt(g, m, time) {
  groundBirdAt(g, m, "moa");
}

// A pua'a, a feral pig. It trots while it walks and roots at the sand while it sits. Its palette is
// pig: [body, dark, snout].
// A feral pig's build, from the wild boar: a high bristled shoulder sloping to the rump, a long head
// with a pale snout and upright ears, a thin tail. Standing, it roots with its snout in the earth.
// B body, D dark bristles and legs, P snout.
const PUAA = {
  walk: [
    "........DD.....",
    "..DDDDDDDBD....",
    ".DBBBBBBBBBBB..",
    "DBBBBBBBBBBDBB.",
    ".BBBBBBBBBBBBPP",
    ".BBBBBBBBBBBBPP",
    "..DDDDDDDDDDD..",
  ],
  root: [
    "...............",
    "..DDDDDDD......",
    ".DBBBBBBBDD....",
    "DBBBBBBBBBBBB..",
    ".BBBBBBBBBBDB..",
    ".BBBBBBBBBBBBB.",
    "..DDDDDDDDDBBPP",
  ],
};

function puaaAt(g, p, time) {
  const [body, dark, snout] = g.pal.pig;
  const x = Math.round(p.x);
  const y = g.groundY + 7;
  const walking = p.state === "walk";
  const rooting = p.state === "sit";
  [2, 4, 10, 12].forEach((dx, i) => {
    const up = walking && (Math.floor(p.phase) % 2 === 0) === (i === 0 || i === 3);
    part(g, dark, x, y, p.dir, dx, -3, 1, up ? 2 : 3);
  });
  const grid = rooting ? PUAA.root : PUAA.walk;
  sprite(g, grid, { B: body, D: dark, P: snout }, x, y - 3, p.dir, 0, grid.length);
  if (rooting) part(g, snout, x, y, p.dir, 13, -3, 2, 1);
}

function tide(f) {
  return smooth(clamp(f.stage / 3, 0, 1)) * SEA_ROWS;
}

function seaRows(f) {
  return Math.round(f.extra.sea);
}

// Surf spray: while the sea is up, bursts of droplets fly up from the waterline, fall back and fade.
function updateSpray(f, dt) {
  const spray = f.extra.spray;
  for (const d of spray.drops) {
    d.vy += GRAVITY * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.life -= dt * 1.25; // gone within 0.8 s
    if (d.y >= f.groundY - 1) d.life = 0;
  }
  spray.drops = spray.drops.filter((d) => d.life > 0);
  if (seaRows(f) < 2 || f.time < spray.next) return;
  spray.next = f.time + 0.25 + f.rand() * 0.25;
  const count = 3 + Math.floor(f.rand() * 4);
  if (spray.drops.length + count > SPRAY_MAX) return;
  const x0 = f.rand() * f.cols;
  for (let i = 0; i < count; i += 1) {
    spray.drops.push({
      x: x0 + (f.rand() - 0.5) * 3,
      y: f.groundY - 1,
      vx: (f.rand() - 0.5) * 12,
      vy: -(10 + f.rand() * 15),
      life: 1,
    });
  }
}

const extras = {
  init(f) {
    return {
      sea: 0,
      tropicbirds: [{ next: 3, bird: null }, { next: 9, bird: null }],
      iiwi: { next: 5, bird: null },
      crabs: Array.from({ length: CRABS }, (_, i) => ({ ...walker(f), lane: i * 3 })),
      moa: walker(f),
      seals: [walker(f), walker(f, 0.55)],
      puaa: walker(f),
      honu: { x: f.cols * 0.3, dir: 1, scale: 1 },
      hatchling: walker(f, 0.5),
      whale: { next: 6, start: -10, x: 0 },
      spray: { next: 0, drops: [] },
    };
  },

  // The tide eases in while the scene animates, and jumps to its level under reduced motion.
  onGrow(f) {
    const x = f.extra;
    if (f.reduced) x.sea = tide(f);
    x.crabs.forEach((crab, i) => {
      if (f.stage >= 3 + i * 3) enter(f, crab);
    });
    if (f.stage >= 3) enter(f, x.moa);
    if (f.stage >= 4) {
      const [seal, pup] = x.seals;
      enter(f, seal);
      enterBehind(f, pup, seal, 12);
    }
    if (f.stage >= 8) enter(f, x.puaa);
    if (f.stage >= 5 && !x.hatchling.active) {
      enterBehind(f, x.hatchling, x.honu, 10);
    }
  },

  busy: () => true,

  update(f, dt) {
    const x = f.extra;
    x.sea += (tide(f) - x.sea) * Math.min(1, dt * 0.8);
    if (f.stage >= 2 && !isNight(f)) flyBy(f, x.tropicbirds[0], dt, { every: [4, 6], speed: 12, spawn: () => ({ y: 20 + f.rand() * 40 }) });
    if (f.stage >= 4 && !isNight(f)) flyBy(f, x.iiwi, dt, { every: [6, 6], speed: 22, spawn: () => ({ y: f.groundY - 56 - f.rand() * 24 }) });
    if (f.stage >= 6 && !isNight(f)) flyBy(f, x.tropicbirds[1], dt, { every: [5, 7], speed: 38, spawn: () => ({ y: 40 + f.rand() * 40 }) });
    for (const c of x.crabs) wander(f, c, dt, { speed: 9, sit: [1, 3], walk: [1, 3] });
    wander(f, x.moa, dt, { speed: 11, stride: 9, sit: [1.5, 3.5], walk: [1.5, 3] });
    wander(f, x.puaa, dt, { speed: 6, stride: 5, sit: [3, 6], walk: [3, 6] });
    const [seal, pup] = x.seals;
    wander(f, seal, dt, { speed: 6, stride: 5, sit: [3, 6], walk: [2, 4] });
    follow(pup, seal, dt, 12);
    if (f.stage >= 5) {
      x.honu.x += x.honu.dir * 4 * dt;
      if (x.honu.x < 10 || x.honu.x > f.cols - 10) x.honu.dir *= -1;
      follow(x.hatchling, x.honu, dt, 10);
    }
    if (f.stage >= 7 && f.time >= x.whale.next) {
      x.whale.start = f.time;
      x.whale.x = 12 + f.rand() * (f.cols - 24);
      x.whale.next = f.time + 12 + f.rand() * 8;
    }
    updateSpray(f, dt);
  },

  // The sea lies behind the plants, between the horizon and the sand.
  drawBack(g, f) {
    const rows = seaRows(f);
    if (rows < 1) return;
    const [shallow, mid, deep, foam] = g.pal.sea;
    const top = f.groundY - rows;
    const bands = [[deep, 0.35], [mid, 0.4], [shallow, 0.25]];
    let y = top;
    bands.forEach(([colour, share], i) => {
      const h = i === bands.length - 1 ? f.groundY - y : Math.max(1, Math.round(rows * share));
      rect(g, colour, 0, y, f.cols, h);
      y += h;
    });
    rect(g, foam, 0, top, f.cols, 1);
    for (let x = 0; x < f.cols; x += 1) {
      const t = g.time;
      if (Math.sin(x * 0.28 + t * 1.6) > 0.55) rect(g, foam, x, f.groundY - 1, 1, 1);
      if (Math.sin(x * 0.19 - t * 1.1 + 2) > 0.78) rect(g, foam, x, f.groundY - 1 - Math.max(2, rows >> 2), 1, 1);
      if (hash(x, Math.floor(t * 2), 7) < 0.012) rect(g, foam, x, top + 1 + (x % Math.max(1, rows - 2)), 1, 1);
    }
    for (const d of f.extra.spray.drops) {
      g.ctx.globalAlpha = clamp(d.life, 0, 1);
      rect(g, foam, Math.round(d.x), Math.round(d.y), 1, 1);
    }
    g.ctx.globalAlpha = 1;
    if (f.stage >= 5 && !f.reduced) {
      honuAt(g, f.extra.honu, g.time, top, f.groundY);
      if (f.extra.hatchling.active) honuAt(g, f.extra.hatchling, g.time, top, f.groundY);
    }
    const w = f.extra.whale;
    const age = f.time - w.start;
    if (age >= 0 && age < 3 && !f.reduced) {
      const [back, light] = g.pal.whale;
      const y0 = top + 2;
      blob(g, Math.round(w.x), y0 - 2, 9, 5, (px, py) => (py < y0 ? back : light));
      const rise = Math.min(1, age / 0.6);
      const fadeOut = clamp(2.8 - age, 0, 1);
      g.ctx.globalAlpha = fadeOut;
      for (let i = 0; i < Math.round(12 * rise); i += 1) rect(g, foam, Math.round(w.x) + 1 + (i > 8 ? (i % 2 ? -1 : 2) : 0), y0 - 3 - i, 1, 1);
      g.ctx.globalAlpha = 1;
    }
  },

  draw(g, f) {
    for (const bird of f.extra.tropicbirds) if (bird.bird && !isNight(f)) tropicbirdAt(g, bird.bird, f.time);
    if (f.extra.iiwi.bird && !isNight(f)) flyerAt(g, f.extra.iiwi.bird, f.time, "iiwi");
    for (const c of f.extra.crabs) if (c.active) crabAt(g, c, g.groundY + 5 + c.lane);
    for (const s of f.extra.seals) if (s.active) sealAt(g, s, f.time);
    if (f.extra.moa.active) moaAt(g, f.extra.moa, f.time);
    if (f.extra.puaa.active) puaaAt(g, f.extra.puaa, f.time);
  },
};

export default {
  id: "hawaii",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.4, 0.62], dark: [0.5, 0.7] },
  mature: { tree: 3, ridge: 3, hibiscus: 2, taro: 1.5, dune: 1.5, paradise: 2, shell: 1, surfboard: 1 },
  paint: { tree, ridge, hibiscus, taro, dune, paradise: birdOfParadise, shell, surfboard },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      ".....hh.....",
      ".....hh.....",
      ".ff.ssss.ff.",
      "ff.ssllss.ff",
      "f.sslsslss.f",
      "..slssssls..",
      "..ssllllss..",
      "..slssssls..",
      ".fsslsslssf.",
      "ff.ssllss.ff",
      "....ssss....",
      ".....tt.....",
    ],
    colours: { s: "#5f7034", l: "#9fae5c", f: "#c8b88a", h: "#c8b88a", t: "#c8b88a" },
  },
};
