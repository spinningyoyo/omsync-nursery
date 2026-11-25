// The Hawaii beach scene: coconut palms and plumeria over golden sand, with fluted green sea
// cliffs behind. Watering brings the tide in. By day white-tailed tropicbirds (koaʻe kea) fly over,
// trailing their long streamers; a pale ghost crab (ʻōhiki) scuttles on the sand, a moa (feral
// chicken) pecks, a Hawaiian monk seal and her pup haul out and shuffle along, a honu swims with its
// hatchling (and now and then hauls out to bask on the sand), a pua'a (feral pig) trots, roots and now and then wallows in the mud, and a humpback whale spouts offshore. Where the waves
// break on the sand, spray flies up.

// A feral cat (pōpoki) prowls the sand; its coat is one of eleven, picked as the scene loads.
import {
  CRAWL,
  crabAt,
  crabPoses,
  crawlX,
  felidAt,
  felidPoses,
  groundBirdAt,
  groundBirdStep,
  groundPoses,
  groundSpeed,
  honuAshoreAt,
  honuShellAt,
  PUP_STRIDE,
  puaaAt,
  puaaPoses,
  SEAL_STRIDE,
  sealAt,
  sealPoses,
  whaleAt,
} from "../kit/animals.js";
import { enter, enterBehind, follow, isNight, narrow, rest, settle, stride, walker, wander } from "../kit/critters.js";
import { HOUSECAT_COAT_NAMES, HOUSECAT_COATS } from "../kit/felid.js";
import { flyerAt } from "../kit/flyers.js";
import { coconutPalm } from "../kit/palms.js";
import { blobSpots, flyByPerch, goHome, unhidden } from "../kit/perch.js";
import {
  blob,
  clamp,
  clearing,
  foliage,
  hash,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
  stroke,
  wind,
} from "../kit/pixel.js";
import { broadleafTree } from "../kit/trees.js";

const RIDGE_ROWS = 56;
const MATURE = { tree: 3, ridge: 3, hibiscus: 2, taro: 1.5, dune: 1.5, paradise: 2, shell: 1, surfboard: 1 };
const SEA_ROWS = 12; // the sea's height at full tide
const CRABS = 1;
// Small plants are sown at this share of the usual number, so more sand shows and the animals stand
// out. The trees are not counted among them.
const SMALL_PLANTS = 0.6;
const SPRAY_MAX = 60; // droplets at most
const GRAVITY = 60; // art pixels per second squared: a drop is in the air for up to 0.8 s
// The honu hauls out by day every 40 to 70 s: it swims to the shore end of the sea, crawls up the sand
// in two heaves, basks for 10 to 15 s, then crawls back down and swims off. While it is ashore the
// scene would hold six ground animals, so the pua'a walks off the page and returns after.
const HAUL_EVERY = [40, 30]; // seconds between hauls: 40 plus up to 30
const HAUL_BASK = [10, 5]; // seconds basking: 10 plus up to 5
const HAUL_HEAVES = 2; // heaves up the sand, and the same back down
const HAUL_DEPTH = 6; // rows down the sand it settles
const HAUL_SWIM = 6; // px/s on its way to the shore end
const HAUL_ROOM = 14; // px kept clear of other ground animals when it settles
const HAUL_SHY = 9; // an animal this close sends it back to the sea

const LIGHT = {
  groundShadow: "rgba(60, 50, 20, 0.22)", // the soft shadow every animal, plant and rock casts on the ground
  ...HOUSECAT_COATS.light,
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
  iiwi: {
    C: "#d8321e",
    H: "#d8321e",
    E: "#14100a",
    K: "#e8907a",
    T: "#1c1c20",
    b: "#1c1c20",
    B: "#d8321e",
    l: "#e8503a",
    t: "#1c1c20",
    p: "#3a3a44",
    d: "#101014",
  },
  crab: ["#ece0c4", "#bcae8e"],
  turtle: ["#9a6632", "#6b4423", "#d6c28a"],
  whale: ["#4a6d8c", "#8fb0c8"],
  seal: ["#6e767e", "#e6dcc6", "#1f2328"],
  moa: ["#c9501c", "#23403a", "#e0242b", "#d9a62b"],
  pig: ["#4a3b32", "#2a211c", "#b98f7f"],
  puaaMud: "#5a4231",
  puaaDust: "#d8c08a",
  soil: ["#f7e8c4", "#eed7a8", "#dfc28c"],
  line: "rgba(255, 255, 255, 0.4)",
  wet: "#8a6a3c",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  haze: "#ffffff",
};

const DARK = {
  groundShadow: "rgba(0, 0, 0, 0.3)",
  ...HOUSECAT_COATS.dark,
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
  iiwi: {
    C: "#862318",
    H: "#862318",
    E: "#100e0c",
    K: "#8f5b50",
    T: "#15161a",
    b: "#15161a",
    B: "#862318",
    l: "#8f3529",
    t: "#15161a",
    p: "#27282f",
    d: "#0e0e12",
  },
  crab: ["#d8ccb0", "#a89a7c"],
  turtle: ["#a8743a", "#7a4f28", "#dac790"],
  whale: ["#5a7d9c", "#9fc0d8"],
  seal: ["#7d8790", "#cfc6b2", "#15181c"],
  moa: ["#d9622a", "#3f7566", "#ff4a4a", "#e8c04a"],
  pig: ["#a37c62", "#6a4a38", "#e8bfa8"],
  puaaMud: "#4a362b",
  puaaDust: "#8a7466",
  soil: ["#6a5a3c", "#5c4d33", "#4c3f2a"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#1c1408",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  haze: "#0b0b0b",
};

// A coconut palm: the palm-like family's build in kit/palms.js.
function coconut(g, p, s, base) {
  coconutPalm(g, p, s, base);
}

function plumeria(g, p, s, base) {
  const { pal } = g;
  // The broadleaf family's build (kit/broadleaf.js): thick boughs forking low, with white and pink
  // flowers on the sunlit side of its clumps.
  broadleafTree(g, p, s, base, {
    rows: 22,
    tones: pal.leaf,
    bark: pal.trunk,
    from: 0.3,
    spread: 0.42,
    airy: 0.45,
    thick: true,
    extra: (dx, dy, tone) => {
      if (tone > 1) return null;
      const n = hash(dx, dy, p.seed + 4);
      return n > 0.82 ? pal.flowers[2] : n > 0.74 ? pal.flowers[3] : null;
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
  for (const [dx, lift] of [
    [-4, 0],
    [4, 1],
    [0, 3],
  ]) {
    const lw = Math.max(3, Math.round(7 * s));
    const lh = Math.max(2, Math.round(5 * s));
    blob(
      g,
      p.x + dx + sway,
      base - h - lift - lh + 1,
      lw,
      lh,
      foliage({ cx: p.x + dx, top: base - h - lift - lh, w: lw, h: lh }, pal.leaf, p.seed + dx),
    );
  }
}

function dune(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(2, Math.round((5 + (p.seed % 4)) * p.scale * s));
  for (const [dx, dy, droop] of [
    [-0.8, -1, 0.5],
    [-0.3, -1, 0.35],
    [0.2, -1, 0.4],
    [0.7, -1, 0.55],
  ]) {
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

function shell(g, p, _s, base) {
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
    const half = Math.round((width / 2) * (1 - f) ** 0.8 + (hash(r, p.seed, 1) - 0.5) * 1.2);
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
  scatter(plants, ctx, {
    kind: "ridge",
    count: Math.round(cols / 58),
    born: [1, 3],
    scale: [0.8, 1.2],
    layer: -1,
    keep: middle,
  });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 18),
    born: [1, 4],
    scale: [0.55, 0.85],
    layer: 0,
    species: palms,
  });
  scatter(plants, ctx, {
    kind: "dune",
    count: Math.round((cols / 9) * SMALL_PLANTS),
    born: [0, 3],
    scale: [0.8, 1.2],
    layer: 0,
  });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 28),
    born: [1, 4],
    scale: [0.85, 1.3],
    depth: [3, 12],
    species: palms,
  });
  scatter(plants, ctx, {
    kind: "hibiscus",
    count: Math.round((cols / 26) * SMALL_PLANTS),
    born: [2, 5],
    scale: [0.8, 1.2],
    depth: [2, 13],
  });
  scatter(plants, ctx, {
    kind: "taro",
    count: Math.round((cols / 34) * SMALL_PLANTS),
    born: [1, 4],
    scale: [0.8, 1.2],
    depth: [2, 13],
  });
  scatter(plants, ctx, {
    kind: "dune",
    count: Math.round((cols / 6) * SMALL_PLANTS),
    born: [0, 3],
    scale: [0.8, 1.3],
    depth: [0, 15],
  });
  scatter(plants, ctx, {
    kind: "paradise",
    count: Math.round((cols / 30) * SMALL_PLANTS),
    born: [2, 5],
    scale: [0.9, 1.3],
    depth: [1, 13],
  });
  scatter(plants, ctx, {
    kind: "shell",
    count: Math.round(cols / 16),
    born: [1, 5],
    depth: [3, 14],
    species: ["starfish", "conch", "conch", "dollar"],
  });
  scatter(plants, ctx, {
    kind: "surfboard",
    count: Math.max(1, Math.round((cols / 90) * 0.4)),
    born: [4, 6],
    depth: [6, 12],
  });
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
// across the wing, a yellow bill, and two long tail streamers that wave behind it (the kit's small flyer,
// smallbird.js). Its palette is tropicbird: [white, black, bill, shade].
function tropicbirdAt(g, b, time) {
  if (g.trace) return g.trace.draw(tropicbirdAt, g, b, time);
  flyerAt(g, b, time, "tropicbird");
}

// The top of a full-grown sea cliff, where a tropicbird alights: ridge() draws the spire from the same numbers,
// so this is its highest row that is still five cells wide.
function cliffTop(p, groundY) {
  const height = Math.max(4, Math.round(RIDGE_ROWS * p.scale));
  const width = Math.round(height * 0.7) + 6;
  let top = 0;
  for (let r = 0; r < height; r += 1) {
    const half = Math.round((width / 2) * (1 - r / height) ** 0.8 + (hash(r, p.seed, 1) - 0.5) * 1.2);
    if (half < 1) break;
    if (half >= 2) top = r;
  }
  return { x: p.x, y: groundY - top };
}

// Where a tropicbird may perch: the full-grown sea cliffs.
function cliffSpots(f) {
  const cliffs = f.plants.map((p, order) => ({ p, order })).filter(({ p }) => p.kind === "ridge");
  const spots = cliffs
    .filter(({ p }) => p.shown - p.born >= MATURE.ridge)
    .map(({ p, order }) => {
      const at = cliffTop(p, f.groundY);
      return { x: p.x, order, top: () => at };
    });
  const covers = cliffs.map(({ p, order }) => ({
    x: p.x,
    order,
    y: cliffTop(p, f.groundY).y,
    reach: Math.round((Math.round(RIDGE_ROWS * p.scale) * 0.7 + 6) / 4),
  }));
  return unhidden(spots, covers, f.time);
}

// Where the ʻiʻiwi may perch: the tops of the full-grown hibiscus, drawn in hibiscus() from the same numbers.
function hibiscusSpots(f) {
  return blobSpots(f, "hibiscus", MATURE.hibiscus, (p) => {
    const h = Math.max(2, Math.round((6 + (p.seed % 3)) * p.scale));
    return { cx: p.x, top: f.groundY + (p.layer < 1 ? 1 : p.depth) - h, w: Math.round(h * 2.2), h };
  });
}

// An ʻōhiki, the pale ghost crab of the sand, up on its legs with its stalked eyes raised. Its
// palette is crab: [shell, dark].

// A sea turtle, or its hatchling when its scale is below 1.
// `t.land` (0 to 1) brings it down to the shore end of the sea band.
function honuAt(g, t, time, seaTop, seaBottom) {
  if (g.trace) return g.trace.draw(honuAt, g, t, time, seaTop, seaBottom);
  const swim = clamp(seaTop + (seaBottom - seaTop) * 0.55, seaTop + 3, seaBottom - 3);
  const land = smooth(t.land ?? 0);
  const y = Math.round(swim + Math.sin(time * 1.2) * 1.5 * (1 - land) + (seaBottom - 2 - swim) * land);
  honuShellAt(g, t, y + 1, time, t.scale);
}

// A moa, a feral red junglefowl rooster, built from parts (kit/groundbird.js). It struts while it walks;
// stopped, it pecks in threes, scratches, preens or flaps. Its palette is moa: [body, tail, comb, legs],
// with groundShadow beside it.
function moaAt(g, m, time) {
  if (g.trace) return g.trace.draw(moaAt, g, m, time);
  groundBirdAt(g, m, "moa", time);
}

// The honu hauling out (x.haulOut.state): idle, clear (waiting for the beach to be clear), to (swimming
// to the shore end), crawl, bask, back, then leave (swimming off). Every other animal on the sand.
function sandAnimals(f) {
  const x = f.extra;
  return [x.cat, ...x.crabs, x.moa, ...x.seals, x.puaa].filter((a) => a.active);
}

// Whether the sand from `s` to where it crawls (`dir` the way it faces) is clear of other animals.
function beachClear(f, s, dir, room = HAUL_ROOM) {
  const far = s + dir * HAUL_HEAVES * 3;
  return sandAnimals(f).every((a) => a.x < Math.min(s, far) - room || a.x > Math.max(s, far) + room);
}

// The clear stretch of beach nearest the honu, or null.
function pickBeach(f, from) {
  let best = null;
  for (let s = 18; s <= f.cols - 18; s += 4) {
    const dir = s >= from ? 1 : -1;
    if (beachClear(f, s, dir) && (best === null || Math.abs(s - from) < Math.abs(best - from))) best = s;
  }
  return best;
}

function haulNext(f, ho) {
  ho.state = "idle";
  ho.next = f.time + HAUL_EVERY[0] + f.rand() * HAUL_EVERY[1];
}

// Runs the haul-out; returns true while it moves the honu (so it does not swim about as usual).
function haulOut(f, x, dt) {
  const ho = x.haulOut;
  const h = x.honu;
  const age = f.time - ho.since;
  const night = isNight(f);
  const go = (state) => {
    ho.state = state;
    ho.since = f.time;
  };
  const leave = () => {
    go("leave");
    x.puaa.leaving = false;
    if (ho.pigAway) {
      ho.pigAway = false;
      enter(f, x.puaa);
    }
  };
  if (ho.state === "idle") {
    if (f.time < ho.next || night || f.reduced || seaRows(f) < 8) return false;
    ho.next = Number.POSITIVE_INFINITY; // waits until it is over
    go("clear");
    return false;
  }
  if (ho.state === "clear") {
    if (night) {
      leave();
      haulNext(f, ho);
      return false;
    }
    if (x.puaa.active) {
      // A pua'a in the mud finishes its wallow first, then walks off.
      if (!(x.puaa.state === "sit" && x.puaa.pose === "wallow")) x.puaa.leaving = true;
      return false;
    }
    ho.target = pickBeach(f, h.x);
    if (ho.target !== null) go("to");
    return false;
  }
  if (ho.state === "to") {
    if (night || age > 45) {
      leave();
      return false;
    }
    const dir = ho.target >= h.x ? 1 : -1;
    if (!beachClear(f, ho.target, dir)) ho.target = pickBeach(f, h.x) ?? ho.target;
    const dx = ho.target - h.x;
    if (Math.abs(dx) > 0.5) {
      h.dir = dx > 0 ? 1 : -1;
      h.x += h.dir * Math.min(Math.abs(dx), HAUL_SWIM * dt);
    }
    h.land = Math.min(1, h.land + dt / 3);
    if (Math.abs(dx) <= 0.5 && h.land >= 1 && beachClear(f, h.x, h.dir)) {
      ho.x0 = h.x;
      go("crawl");
    }
    return true;
  }
  if (ho.state === "crawl" || ho.state === "back") {
    const p = Math.min(HAUL_HEAVES, age / CRAWL);
    h.x = ho.x0 + h.dir * crawlX(p);
    ho.drop = ho.state === "crawl" ? p / HAUL_HEAVES : 1 - p / HAUL_HEAVES;
    if (p >= HAUL_HEAVES) {
      if (ho.state === "crawl") {
        ho.bask = HAUL_BASK[0] + f.rand() * HAUL_BASK[1];
        go("bask");
      } else {
        leave();
      }
    }
    return true;
  }
  if (ho.state === "bask") {
    const startled = sandAnimals(f).some((a) => Math.abs(a.x - h.x) < HAUL_SHY);
    if (age >= ho.bask || night || startled) {
      h.dir *= -1;
      ho.x0 = h.x;
      go("back");
    }
    return true;
  }
  // leave: it swims off as it did before, coming up out of the shallows.
  h.land = Math.max(0, h.land - dt / 3);
  if (h.land <= 0) haulNext(f, ho);
  return false;
}

// The pua'a walks off the nearer edge of the page, so the beach holds five animals while the honu is
// ashore.
function walkOff(f, w, dt) {
  w.state = "walk";
  const dir = w.x < f.cols / 2 ? -1 : 1;
  if (dir !== w.dir) {
    w.dir = dir;
    w.sinceX = w.x; // its stride starts again from where it turned
  }
  w.x += w.dir * 6 * dt; // the trot's pace, so its feet stay planted
  w.phase += dt * 5;
  if (w.x < -12 || w.x > f.cols + 12) {
    w.active = false;
    w.leaving = false;
    f.extra.haulOut.pigAway = true;
  }
}

function tide(f) {
  return smooth(clamp(f.stage / 3, 0, 1)) * SEA_ROWS;
}

// Whether the honu is up on the sand (and drawn in front of the plants, with the other animals).
function ashore(f) {
  const state = f.extra.haulOut?.state;
  return state === "crawl" || state === "bask" || state === "back";
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
      cat: { ...walker(f), pal: `housecat-${HOUSECAT_COAT_NAMES[Math.floor(f.rand() * HOUSECAT_COAT_NAMES.length)]}` },
      sea: 0,
      tropicbirds: [
        { next: 3, bird: null },
        { next: 9, bird: null },
      ],
      iiwi: { next: 5, bird: null },
      crabs: Array.from({ length: CRABS }, (_, i) => ({ ...walker(f), lane: i * 3 })),
      moa: walker(f),
      seals: [walker(f), walker(f, 0.55)],
      puaa: walker(f),
      honu: { x: f.cols * 0.3, dir: 1, scale: 1, land: 0 },
      hatchling: { ...walker(f, 0.5), land: 0 },
      haulOut: {
        next: 25 + f.rand() * 20,
        state: "idle",
        since: 0,
        target: 0,
        x0: 0,
        drop: 0,
        bask: 0,
        pigAway: false,
      },
      whale: { next: 6, start: -10, x: 0, dir: 1, dive: false },
      spray: { next: 0, drops: [] },
    };
  },

  // The tide eases in while the scene animates, and jumps to its level under reduced motion.
  onGrow(f) {
    if (f.stage >= 4 && !narrow(f)) enter(f, f.extra.cat);
    const x = f.extra;
    if (f.reduced) x.sea = tide(f);
    x.crabs.forEach((crab, i) => {
      if (f.stage >= 1 + i * 3) enter(f, crab);
    });
    if (f.stage >= 3) enter(f, x.moa);
    if (f.stage >= 4) {
      const [seal, pup] = x.seals;
      enter(f, seal);
      enterBehind(f, pup, seal, 20);
    }
    if (f.stage >= 8 && !x.haulOut.pigAway) {
      // Not while the honu is on its way to the sand or ashore: the pua'a comes when it is back at sea.
      if (["to", "crawl", "bask", "back"].includes(x.haulOut.state)) x.haulOut.pigAway = true;
      else enter(f, x.puaa);
    }
    if (f.stage >= 5 && !x.hatchling.active) {
      enterBehind(f, x.hatchling, x.honu, 10);
    }
  },

  busy: () => true,

  update(f, dt) {
    wander(f, f.extra.cat, dt, { speed: 7, stride: 7, sit: [4, 9], walk: [3, 6] });
    rest(f, f.extra.cat, felidPoses("housecat"));
    const x = f.extra;
    x.sea += (tide(f) - x.sea) * Math.min(1, dt * 0.8);
    // Now and then a tropicbird alights on a sea cliff and the ʻiʻiwi on a hibiscus, then they fly on.
    const day = !isNight(f);
    const slots = [
      [
        f.stage >= 2,
        x.tropicbirds[0],
        { every: [4, 6], speed: 12, spawn: () => ({ y: 20 + f.rand() * 40 }), spots: cliffSpots, small: "tropicbird" },
      ],
      [
        f.stage >= 4,
        x.iiwi,
        {
          every: [6, 6],
          speed: 22,
          spawn: () => ({ y: f.groundY - 56 - f.rand() * 24 }),
          spots: hibiscusSpots,
          small: "iiwi",
        },
      ],
      [
        f.stage >= 6,
        x.tropicbirds[1],
        { every: [5, 7], speed: 38, spawn: () => ({ y: 40 + f.rand() * 40 }), spots: cliffSpots, small: "tropicbird" },
      ],
    ];
    for (const [on, slot, o] of slots) {
      if (on && day) flyByPerch(f, slot, dt, { ...o, odds: 0.3, stay: [8, 16] });
      else if (slot.bird?.visit) goHome(f, slot.bird);
    }
    for (const c of x.crabs) {
      wander(f, c, dt, { speed: 9, sit: [1, 3], walk: [1, 3] });
      rest(f, c, crabPoses);
    }
    const moaX = x.moa.x;
    wander(f, x.moa, dt, { speed: groundSpeed("moa"), stride: 1, sit: [2.6, 6], walk: [1.5, 3] });
    rest(f, x.moa, groundPoses(x.moa, "moa"));
    groundBirdStep(f, x.moa, dt, "moa", moaX);
    if (x.puaa.leaving) walkOff(f, x.puaa, dt);
    else wander(f, x.puaa, dt, { speed: 6, stride: 5, sit: [3, 18], walk: [3, 6] });
    rest(f, x.puaa, puaaPoses(x.puaa));
    // The seal hitches along at 4 px/s, 3 px a stride (1.33 strides a second); her pup keeps behind her and
    // rests beside her, lifting her head when her mother does.
    const [seal, pup] = x.seals;
    const sealX = seal.x;
    const pupX = pup.x;
    wander(f, seal, dt, { speed: 4, stride: 1.33, sit: [3, 12], walk: [2, 4] });
    rest(f, seal, sealPoses(seal));
    stride(seal, sealX, dt, SEAL_STRIDE[0], SEAL_STRIDE[1]);
    follow(pup, seal, dt, 20);
    pup.state = seal.state;
    pup.timer = seal.timer;
    settle(f, pup);
    pup.pose = seal.pose;
    stride(pup, pupX, dt, PUP_STRIDE[0], PUP_STRIDE[1]);
    if (f.stage >= 5) {
      if (!haulOut(f, x, dt)) {
        x.honu.x += x.honu.dir * 4 * dt;
        if (x.honu.x < 10 || x.honu.x > f.cols - 10) x.honu.dir *= -1;
      }
      // The hatchling follows to the water's edge and waits there while the honu is ashore.
      const ho = x.haulOut;
      const waiting = ho.state === "to" || ho.state === "crawl" || ho.state === "bask" || ho.state === "back";
      x.hatchling.land += ((waiting ? 1 : 0) - x.hatchling.land) * Math.min(1, dt * 0.8);
      if (!(ho.state === "crawl" || ho.state === "bask" || ho.state === "back")) follow(x.hatchling, x.honu, dt, 10);
    }
    if (f.stage >= 7 && f.time >= x.whale.next) {
      x.whale.start = f.time;
      x.whale.x = 15 + f.rand() * (f.cols - 30);
      x.whale.dir = f.rand() < 0.5 ? 1 : -1;
      x.whale.dive = f.rand() < 0.4; // some surfacings end in a dive with the flukes
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
    const bands = [
      [deep, 0.35],
      [mid, 0.4],
      [shallow, 0.25],
    ];
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
      if (!ashore(f)) honuAt(g, f.extra.honu, g.time, top, f.groundY);
      if (f.extra.hatchling.active) honuAt(g, f.extra.hatchling, g.time, top, f.groundY);
    }
    const w = f.extra.whale;
    if (!f.reduced) whaleAt(g, w, top + 2, f.time);
  },

  draw(g, f) {
    if (f.stage >= 5 && !f.reduced && ashore(f)) {
      const ho = f.extra.haulOut;
      const mode = ho.state === "bask" ? "bask" : "crawl";
      honuAshoreAt(g, { ...f.extra.honu, mode, age: f.time - ho.since }, f.groundY + Math.round(HAUL_DEPTH * ho.drop));
    }
    if (f.extra.cat.active) felidAt(g, { ...f.extra.cat, kind: "housecat" }, f.time);
    for (const bird of f.extra.tropicbirds) if (bird.bird && !isNight(f)) tropicbirdAt(g, bird.bird, f.time);
    if (f.extra.iiwi.bird && !isNight(f)) flyerAt(g, f.extra.iiwi.bird, f.time, "iiwi");
    for (const c of f.extra.crabs) if (c.active) crabAt(g, c, g.groundY + 5 + c.lane, f.time);
    for (const s of f.extra.seals) if (s.active) sealAt(g, s, f.time);
    if (f.extra.moa.active) moaAt(g, f.extra.moa, f.time);
    if (f.extra.puaa.active) puaaAt(g, f.extra.puaa, f.time);
  },
};

export default {
  id: "hawaii",
  label: "Waikiki Beach",
  group: "coastal",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.4, 0.62], dark: [0.5, 0.7] },
  mature: MATURE,
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
