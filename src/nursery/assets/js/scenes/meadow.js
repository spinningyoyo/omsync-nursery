// The meadow scene: grass, flowers, round and pine trees, birches, flowering dogwoods and tall
// sequoias at the sides: California's Sierra. Behind it stands El Capitan's east face, flanked by
// sequoia groves, with Horsetail Fall pouring off its rim. At night the fall glows like embers,
// and every 25 to 40 seconds it flares into the firefall, when the setting sun lights the water and
// the wall beside it. A cottontail, a red fox that now and then leaps on a mouse in the grass, a
// bull elk, a black bear and cub share the meadow; by day a belted kingfisher, a golden eagle and
// butterflies fly over.
// A bobcat hunts the meadow edge and rests in the grass: sitting, lying, arching or stretching.
import { bearAt, bearPoses } from "../kit/bear.js";
import { hareAt, harePoses } from "../kit/beast.js";
import { canidAt, settleCanid } from "../kit/canid.js";
import { sequoiaTop as kitSequoiaTop } from "../kit/conifer.js";
import { enter, enterBehind, follow, isNight, rest, settle, stroll, walker, wander } from "../kit/critters.js";
import { cervidAt } from "../kit/deer.js";
import { felidAt, felidPoses } from "../kit/felid.js";
import { circlerAt, eagleFlyAt, flyerAt, kingfisherAt } from "../kit/flyers.js";
import { butterflyAt, butterflyPick } from "../kit/insect.js";
import { blobSpots, unhidden } from "../kit/perch.js";
import {
  blob,
  CLEARING,
  clamp,
  clearing,
  fade,
  foliage,
  grove,
  hash,
  makePlant,
  NARROW_COLS,
  placeLandmarks,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
  wind,
} from "../kit/pixel.js";
import { meadowFlower, meadowFlowerHead } from "../kit/plants.js";
import { ANIMAL_BOX, bird, butterfly, soarSprites, walk } from "../kit/poses.js";
import { circlerActor, crossingActor, drawStep, runCast, tickTimer, walkerActor } from "../kit/runner.js";
import { blendPose, perchedSmall } from "../kit/smallbird.js";
import { broadleafTree, coniferTree, sequoiaTree } from "../kit/trees.js";

const MATURE = { tuft: 1.5, flower: 2, bush: 2.5, tree: 3, sequoia: 4, mushroom: 1, hill: 2.5, elcap: 2.5 };
const TREE_ROWS = 34; // a full-grown tree at scale 1
const BUTTERFLY_MAX = 4;
const TREES = ["round", "round", "round", "pine", "pine", "pine", "birch", "dogwood"];
const CLIFF_ROWS = 72; // El Capitan's east face at scale 1
const CLIFF_HALF = 32;
const NOTCH = 0.6; // how far across the cliff the fall leaves the rim, where the face meets the East Buttress
const FIREFALL_SECONDS = 8;
const FALL_ROWS_PER_SECOND = 3; // slow, because the fall is a mile away
const STREAK_ROWS = 4;

const LIGHT = {
  bobcat: { T: "#b08a64", S: "#8a6a4a", P: "#f0e6d6", D: "#2e241e", e: "#2e241e" },
  leaf: ["#cdeaa4", "#a3d675", "#78bb5c", "#559c4a"],
  pine: ["#b4dcae", "#86c392", "#5ca67a", "#43876a"],
  bloom: "#ffffff",
  bloomCentre: "#fcd668",
  trunk: ["#b58f6a", "#93714f"],
  birch: ["#f6f2ea", "#d4cdbf"],
  birchMark: "#7d746a",
  groundShadow: "rgba(60, 44, 20, 0.22)", // the soft shadow every animal, plant and rock casts on the ground
  sequoia: ["#4f8a5e", "#3a7450", "#2c6042", "#1f4a34"],
  sequoiaBark: ["#b1643f", "#8a4a2d"],
  sequoiaDepth: ["#d08a5e", "#5c3020"],
  flowers: ["#f9a98e", "#f7b9c8", "#fcd668", "#ffffff", "#b9a8f2"],
  centre: "#f2a93b",
  cap: "#ef8f80",
  capDot: "#ffffff",
  stem: "#f3ebdd",
  soil: ["#ecd5bb", "#e2c4a5", "#d3b08e"],
  line: "rgba(255, 255, 255, 0.34)",
  wet: "#5a341c",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  petal: "#fff0a0",
  body: "#6b5a4a",
  hill: ["#c8e69a", "#acda7a", "#92c866"],
  rabbit: ["#b89a78", "#8c7355", "#fdf6ea"],
  red: ["#e8742a", "#2b2420", "#fdf6ea", "#2b2420", "#fdf6ea"],
  canid: { R: "#6e2c2c", howl: "#5f6f84", dark: false },
  elk: ["#a07048", "#6b4a2e", "#e8d6b4", "#d9c29a", "#4a3220", "#7f5836"],
  bear: ["#322a27", "#4e4039", "#bc9d7c", "#141010", "#262020"],
  bearScent: "#8c8070",
  jay: {
    C: "#1f2a40",
    H: "#2a3a5a",
    E: "#f2f2f2",
    K: "#1a1a1a",
    T: "#3a6bb0",
    b: "#3a6bb0",
    B: "#3a6bb0",
    l: "#2d4f8c",
    t: "#3a6bb0",
    p: "#7aa6dc",
    d: "#1f3560",
  },
  kingfisher: ["#5b82a8", "#c8653a", "#2c2c34", "#f6f2ea"],
  eagleGolden: ["#4a3426", "#e0a93a", "#4a3426", "#f3eadb", "#7a5a44"],
  granite: ["#a99f8e", "#958c7d", "#7d766b", "#615c55"],
  snow: "#ffffff",
  // An object, not a list, so the distance fade leaves the water at full strength.
  horsetail: { water: ["#ffffff", "#cbe8f7", "#7fbde4"], wash: null, lamp: null },
  haze: "#ffffff",
};

const DARK = {
  bobcat: { T: "#7a6153", S: "#624d43", P: "#a29a9a", D: "#292228", e: "#292228" },
  leaf: ["#8fc272", "#6ba455", "#4c8541", "#356a35"],
  pine: ["#6fae8a", "#52926f", "#3c7658", "#2b5d46"],
  bloom: "#f5f5f5",
  bloomCentre: "#fcd668",
  trunk: ["#8a6a4d", "#6a4f39"],
  birch: ["#d9d4c8", "#a8a194"],
  birchMark: "#4b463f",
  groundShadow: "rgba(0, 0, 0, 0.3)",
  sequoia: ["#5f9d70", "#4a8660", "#356a4a", "#265239"],
  sequoiaBark: ["#8f5a40", "#6e4330"],
  sequoiaDepth: ["#b0785a", "#46291c"],
  flowers: ["#f9a98e", "#f7b9c8", "#fcd668", "#f5f5f5", "#b9a8f2"],
  centre: "#f2a93b",
  cap: "#ef8f80",
  capDot: "#f5f5f5",
  stem: "#d8cfc0",
  soil: ["#4a392c", "#3f3025", "#33261d"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#1c0f07",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  petal: "#fff6c4",
  body: "#e8dccb",
  hill: ["#52814a", "#437040", "#355e35"],
  rabbit: ["#b89a78", "#8c7355", "#f0e8da"],
  red: ["#ee7c30", "#2b2420", "#f0e8da", "#2b2420", "#f0e8da"],
  canid: { R: "#3a2226", howl: "#e4ecf8", dark: true },
  elk: ["#b07c50", "#7a5636", "#e0cdaa", "#d9c29a", "#543924", "#8c6240"],
  bear: ["#5a4c46", "#76645a", "#bc9d7c", "#1a1414", "#3a302c"],
  bearScent: "#d8d0c0",
  jay: {
    C: "#171e2d",
    H: "#1d283c",
    E: "#959698",
    K: "#141416",
    T: "#274570",
    b: "#274570",
    B: "#274570",
    l: "#1f345a",
    t: "#274570",
    p: "#4d688a",
    d: "#172540",
  },
  kingfisher: ["#6a90b8", "#c8653a", "#52525e", "#f0ece4"],
  eagleGolden: ["#7a5638", "#f2c25a", "#7a5638", "#f5efe4", "#5a4432"],
  granite: ["#77726b", "#68635d", "#4a4642", "#3a3734"],
  snow: "#b9bdc4",
  horsetail: { water: ["#fff4c4", "#ffb444", "#f07a28"], wash: "#ff8a32", lamp: "#fff3d2" },
  haze: "#0b0b0b",
};

function tuft(g, p, s, base) {
  const { pal } = g;
  const tall = Math.max(1, Math.round((3 + (p.seed % 4)) * p.scale * s));
  const heights = [tall - 1, tall, tall - 1, tall - 2];
  const sway = wind(g.time, p.x);
  const blades = 3 + (p.seed & 1);
  for (let i = 0; i < blades; i += 1) {
    const h = Math.max(1, heights[i]);
    const x = p.x + i - 1;
    const colour = i % 2 ? pal.leaf[1] : pal.leaf[2];
    if (h > 1) rect(g, colour, x, base - h + 1, 1, h - 1);
    rect(g, pal.leaf[0], x + (h > 1 ? sway : 0), base - h, 1, 1);
  }
}

function flower(g, p, s, base) {
  meadowFlower(g, p, s, base);
}

// How grown a flower is, as the engine paints it (0..1).
function flowerSize(p) {
  return smooth(clamp((p.shown - p.born) / MATURE.flower, 0, 1));
}

// The top of a butterfly's flower as it is drawn this frame, or null while there is none.
function flowerHead(g, f, p) {
  const s = p ? flowerSize(p) : 0;
  return s > 0.5 ? meadowFlowerHead(g, p, s, f.groundY + (p.layer < 1 ? 1 : p.depth)) : null;
}

function bush(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round((5 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 2.3);
  const hump = Math.round(h * 0.3);
  const box = { cx: p.x, top: base - h - hump, w, h: h + hump };
  const berries = p.seed % 3 === 0 && s >= 1;
  const shade = foliage(box, pal.leaf, p.seed, (dx, dy) =>
    berries && hash(dx, dy, p.seed + 3) > 0.93 ? pal.flowers[p.seed % pal.flowers.length] : null,
  );
  blob(g, p.x, base - h, w, h, shade);
  blob(g, p.x + Math.round(w * 0.12), base - h - hump, Math.round(w * 0.55), Math.round(h * 0.7) + hump, shade);
}

function tree(g, p, s, base) {
  const { pal } = g;
  const spec = { rows: TREE_ROWS, tones: pal.leaf, trunkTones: pal.trunk };
  if (p.species === "pine") {
    // The conifer family's build (kit/conifer.js): a loose, pointed young pine.
    return coniferTree(g, p, s, base, {
      ...spec,
      tones: pal.pine,
      tiers: 8,
      spread: 0.3,
      clear: 0.14,
      droop: 0.5,
      wide: 1.25,
      h: 0.115,
      u0: 0.2,
    });
  }
  // The broadleaf family's build (kit/broadleaf.js): the round tree, the birch and the dogwood, a
  // smaller understory tree whose white bracts open over the last stages.
  if (p.species === "birch") {
    return broadleafTree(g, p, s, base, {
      ...spec,
      bark: pal.birch,
      mark: pal.birchMark,
      from: 0.48,
      spread: 0.18,
      airy: 0.45,
    });
  }
  if (p.species === "dogwood") {
    const bloom = clamp((p.shown - 5) / 3, 0, 1);
    return broadleafTree(g, p, s, base, {
      ...spec,
      rows: TREE_ROWS * (28 / 34),
      from: 0.3,
      spread: 0.36,
      airy: 0.55,
      extra: (dx, dy, tone) => {
        if (tone >= 3 || hash(dx, dy, p.seed + 7) >= bloom * 0.6) return null;
        return hash(dx, dy, p.seed + 8) < 0.1 ? pal.bloomCentre : pal.bloom;
      },
    });
  }
  return broadleafTree(g, p, s, base, { ...spec, from: 0.36, spread: 0.3, airy: 0.35 });
}

// A giant sequoia, from the conifer family's build (kit/conifer.js): a flared, fluted cinnamon trunk,
// short elbow boughs high up, and a narrow crown of foliage clumps with slits of sky between them.
function sequoia(g, p, s, base) {
  const { pal } = g;
  sequoiaTree(g, p, s, base, { rows: TREE_ROWS, tones: pal.sequoia, bark: pal.sequoiaBark, depth: pal.sequoiaDepth });
}

// The top of a full-grown sequoia's crown, where the golden eagle's feet go: the kit draws the crown's clump
// from the same numbers, and it sways with the wind at `time`.
function sequoiaTop(p, groundY, time) {
  return kitSequoiaTop(p, 1, groundY + 1, TREE_ROWS, time);
}

// Where the eagle may perch: the full-grown sequoias.
function perchSpots(f) {
  const sequoias = f.plants.map((p, order) => ({ p, order })).filter(({ p }) => p.kind === "sequoia");
  const spots = sequoias
    .filter(({ p }) => p.shown - p.born >= MATURE.sequoia)
    .map(({ p, order }) => ({ x: p.x, order, top: (time) => sequoiaTop(p, f.groundY, time) }));
  const covers = sequoias.map(({ p, order }) => ({
    x: p.x,
    order,
    y: sequoiaTop(p, f.groundY, 0).y,
    reach: Math.round(0.3 * TREE_ROWS * p.scale),
  }));
  return unhidden(spots, covers, f.time);
}

// Where the small birds may perch: the tops of the full-grown bushes (the kingfisher), drawn in bush() from the
// same numbers. The jay takes the sequoias' crowns (perchSpots).
function bushSpots(f) {
  return blobSpots(f, "bush", MATURE.bush, (p) => {
    const h = Math.max(2, Math.round((5 + (p.seed % 3)) * p.scale));
    const w = Math.round(h * 2.3);
    const hump = Math.round(h * 0.3);
    const base = f.groundY + (p.layer < 1 ? 1 : p.depth);
    return {
      cx: p.x + Math.round(w * 0.12),
      top: base - h - hump,
      w: Math.round(w * 0.55),
      h: Math.round(h * 0.7) + hump,
    };
  });
}

function mushroom(g, p, s, base) {
  const { pal } = g;
  rect(g, pal.stem, p.x, base - 2, 1, 2);
  rect(g, pal.cap, p.x - 1, base - 4, 3, 1);
  if (s >= 0.6) {
    rect(g, pal.cap, p.x - 2, base - 3, 5, 1);
    rect(g, pal.capDot, p.x - 1, base - 3, 1, 1);
    rect(g, pal.capDot, p.x + 1, base - 4, 1, 1);
  }
}

// Rolling hills: wide, soft and green, hazier the farther they are. They rise as the meadow grows.
function hill(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(3, Math.round(24 * p.scale * s));
  const width = Math.round(100 * p.scale);
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const half = Math.round((width / 2) * (1 - f) ** 0.55 + (hash(r, p.seed, 1) - 0.5) * 2);
    if (half < 1) break;
    row(g, base - 1 - r, p.x - half, p.x + half, (x) => {
      if (f > 0.85 && hash(x, r, p.seed) < 0.5) return pal.hill[0];
      const n = hash(x, r, p.seed + 3);
      return n < 0.1 ? pal.hill[2] : n > 0.96 ? pal.leaf[2] : pal.hill[1];
    });
  }
}

// The top of El Capitan's east face at u across it (0 west, 1 east), as a fraction of its height:
// the sheer face's flat top with a rounded west corner, the notch Horsetail Fall pours from, then
// the lower East Buttress stepping down.
function cliffRise(u) {
  if (u < 0.08) return 0.84 + 0.13 * Math.sin((Math.PI / 2) * (u / 0.08));
  if (u < NOTCH - 0.02) return 0.97 + 0.02 * (u / NOTCH);
  if (u < NOTCH + 0.02) return 0.95;
  if (u < 0.72) return 0.93;
  if (u < 0.78) return 0.93 - ((u - 0.72) / 0.06) * 0.1;
  if (u < 0.88) return 0.83 - ((u - 0.78) / 0.1) * 0.05;
  return 0.78 - ((u - 0.88) / 0.12) * 0.3;
}

// El Capitan's east face, as seen from the valley floor at the firefall: a sheer granite face on
// the west, the darker, snowy East Buttress on the east, pines along the rim, and Horsetail Fall
// dropping the full height from the notch between them, spreading like a horse's tail. In the dark
// palette the water glows, and the sun lights the face beside it, spreading across most of the
// face as p.flare (set by the firefall in extras) rises to 1. Climbers' headlamps show on the face
// at night. Like a mountain it stands at its full height and fades in.
function elcap(g, p, s, base) {
  const { pal } = g;
  const glow = pal.horsetail;
  const night = Boolean(glow.wash);
  const flare = p.flare ?? 0;
  const height = Math.round(CLIFF_ROWS * p.scale);
  const half = Math.round(CLIFF_HALF * p.scale);
  const left = p.x - half;
  const width = half * 2;
  const notch = left + Math.round(width * NOTCH);
  const tops = [];
  g.ctx.globalAlpha = s;
  for (let dx = 0; dx <= width; dx += 1) {
    const x = left + dx;
    const top = base - Math.round(height * cliffRise(dx / width));
    tops.push(top);
    const face = x < notch;
    const streak = hash(dx, p.seed, 3);
    const streakStart = top + Math.round(hash(dx, p.seed, 6) * height * 0.5);
    const streakEnd = streakStart + 5 + Math.round(hash(dx, p.seed, 4) * height * 0.4);
    for (let y = top; y < base; y += 1) {
      let colour;
      if (face) {
        colour = pal.granite[0];
        if (streak < 0.3 && y > streakStart && y < streakEnd) colour = pal.granite[1];
        if (x >= notch - 2) colour = pal.granite[2];
        if (y === top && hash(dx, 1, p.seed) < 0.6) colour = pal.snow;
      } else {
        colour = hash(dx >> 2, y >> 3, p.seed + 1) < 0.35 ? pal.granite[3] : pal.granite[2];
        // Snow lies on the buttress's ledges in short drifts.
        const ledge = hash(dx >> 2, y, p.seed + 2) < 0.08 && hash(dx, y, p.seed + 3) < 0.75;
        if (ledge || (y - top < 2 && hash(dx, 0, p.seed) < 0.8)) colour = pal.snow;
      }
      rect(g, colour, x, y, 1, 1);
    }
  }
  for (let i = 0; i < 6; i += 1) {
    const dx = Math.round(hash(i, p.seed, 7) * width);
    const tall = 2 + Math.round(hash(i, p.seed, 8) * 2);
    for (let r = 0; r < tall; r += 1) {
      rect(g, pal.pine[3], left + dx - (r >> 1), tops[dx] - tall + r, 1 + 2 * (r >> 1), 1);
    }
  }

  if (night) {
    const reach = 6 + flare * width * 0.55;
    for (let x = left; x < notch; x += 1) {
      const near = clamp(1 - (notch - x) / reach, 0, 1);
      if (near <= 0) continue;
      const lane = x >> 1;
      const offset = Math.round(hash(lane, 0, p.seed) * 9);
      for (let y = tops[x - left] + 1; y < base; y += 1) {
        const patch = 0.5 + 0.5 * hash(lane, (y + offset) >> 3, p.seed + 5);
        const a = (0.15 + 0.45 * flare) * near * patch;
        if (a < 0.03) continue;
        g.ctx.globalAlpha = s * clamp(a, 0, 1);
        rect(g, glow.wash, x, y, 1, 1);
      }
    }
    g.ctx.globalAlpha = s;
  }
  // Seen from across the valley the water slides down slowly in long streaks, over a faint still
  // texture, rather than sparkling.
  const flow = g.time * FALL_ROWS_PER_SECOND;
  const fallTop = tops[notch - left];
  for (let y = fallTop; y < base; y += 1) {
    const lower = (y - fallTop) / (base - fallTop);
    const w = Math.round((3 + 6 * lower ** 1.2) * p.scale);
    for (let c = 0; c < w; c += 1) {
      const x = notch + 1 - w + c;
      const edge = c === 0 || c === w - 1;
      const streak = Math.floor((y - flow + hash(x, 0, p.seed) * STREAK_ROWS) / STREAK_ROWS);
      const n = 0.75 * hash(x, streak, p.seed) + 0.25 * hash(x, y, p.seed + 1);
      if (edge && n < 0.45) continue;
      const bright = n + (night ? flare * 0.3 : 0) - (edge ? 0.25 : 0);
      rect(g, glow.water[bright > 0.68 ? 0 : bright > 0.36 ? 1 : 2], x, y, 1, 1);
    }
  }
  if (night) {
    for (const [k, h] of [0.36, 0.58].entries()) {
      if (k === 1 && Math.floor(g.time * 0.7 + p.seed) % 3 === 0) continue;
      rect(g, glow.lamp, left + Math.round(width * (0.14 + k * 0.08)), base - Math.round(height * h), 1, 1);
    }
  }
  g.ctx.globalAlpha = 1;
}

function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const middle = (x) => Math.abs(x - cols / 2) > Math.min(70, cols / 2 - 24);
  // Like the view from Tunnel View, El Capitan stands on the valley's west, the left.
  const narrowPage = cols < NARROW_COLS;
  const capScale = narrowPage ? 0.7 : 1;
  const capHalf = Math.round(CLIFF_HALF * capScale);
  // It keeps as far from the centre as the other sequoias, so its east grove stays clear of the card.
  const { elcap: placed } = placeLandmarks(ctx, [{ key: "elcap", half: capHalf, away: CLEARING + 14 + capHalf }]);
  // At most a quarter of it hangs off the page, so the face beside the fall stays in view.
  const capX = Math.max(Math.round(capHalf / 2), Math.min(placed, cols - placed));
  const capLeft = capX - capHalf;
  const fallX = capLeft + Math.round(capHalf * 2 * NOTCH) - 3;
  const open = (x) => Math.abs(x - fallX) > 8; // keeps tall trees out of the fall's way
  scatter(plants, ctx, { kind: "hill", count: Math.round(cols / 90), born: [1, 2], scale: [1.1, 1.6], layer: -1 });
  scatter(plants, ctx, { kind: "hill", count: Math.round(cols / 64), born: [2, 3], scale: [0.6, 0.95], layer: 0 });
  plants.push(makePlant(rand, "elcap", capX, { layer: -1, depth: 2, born: 1, scale: capScale }));
  // Sequoia groves stand at both ends of the cliff, so it does not rise bare out of the meadow.
  const sequoias = { kind: "sequoia", gap: 5, born: [2, 4], layer: 0 };
  grove(plants, ctx, {
    ...sequoias,
    x: Math.max(capLeft + 2, 4),
    count: narrowPage ? 2 : 4,
    scale: [1.3 * capScale, 1.8 * capScale],
  });
  grove(plants, ctx, {
    ...sequoias,
    x: capX + capHalf - 4,
    count: narrowPage ? 2 : 3,
    scale: [1.1 * capScale, 1.6 * capScale],
  });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 13),
    born: [1, 4],
    scale: [0.55, 0.85],
    layer: 0,
    species: TREES,
    keep: open,
  });
  scatter(plants, ctx, { kind: "bush", count: Math.round(cols / 22), born: [2, 5], scale: [0.6, 0.9], layer: 0 });
  scatter(plants, ctx, { kind: "flower", count: Math.round(cols / 18), born: [0, 4], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, { kind: "tuft", count: Math.round(cols / 8), born: [0, 3], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, {
    kind: "sequoia",
    count: Math.round(cols / 22),
    born: [2, 4],
    scale: [1.5, 1.9],
    layer: 0,
    keep: (x) => middle(x) && open(x),
  });
  scatter(plants, ctx, {
    kind: "tree",
    count: Math.round(cols / 22),
    born: [1, 4],
    scale: [0.85, 1.35],
    depth: [3, 12],
    species: TREES,
    keep: open,
  });
  scatter(plants, ctx, { kind: "bush", count: Math.round(cols / 18), born: [2, 5], scale: [0.8, 1.2], depth: [2, 13] });
  scatter(plants, ctx, {
    kind: "flower",
    count: Math.round(cols / 8),
    born: [0, 4],
    scale: [0.8, 1.3],
    depth: [0, 14],
  });
  scatter(plants, ctx, { kind: "tuft", count: Math.round(cols / 4), born: [0, 3], scale: [0.8, 1.2], depth: [0, 15] });
  scatter(plants, ctx, { kind: "mushroom", count: Math.round(cols / 45), born: [5, 7], depth: [4, 13] });
  for (const p of plants) {
    if (p.kind === "hill" && p.layer === 0) p.depth = 0;
    if (p.kind === "tree" || p.kind === "bush") p.scale *= clearing(p.x, cols);
  }
  sortPlants(plants);
  return plants;
}

// The turf along the soil's top edge thickens as the forest grows.
function soil(pal, x, y, depth, turf) {
  const n = hash(x, y, 11);
  if (y === 0 && hash(x, 0, 5) < turf) return pal.leaf[2];
  if (y === 1 && hash(x, 1, 5) < turf * 0.7) return pal.leaf[3];
  if (n < 0.1 + depth * 0.25) return pal.soil[2];
  if (n > 0.9 - (1 - depth) * 0.1) return pal.soil[0];
  return pal.soil[1];
}

// Creatures

// The red fox hunts mice in the grass: it stops, listens, then leaps high and comes down nose
// first. `t` is seconds into the leap.
const POUNCE_SECONDS = 1.1;

function pounceLift(t) {
  return Math.sin(Math.PI * Math.min(1, t / POUNCE_SECONDS)) * 7;
}

const extras = runCast(
  [
    {
      label: "butterfly",
      kind: "effect",
      family: "insects",
      arrives: 5,
      fixed: `up to ${BUTTERFLY_MAX}`,
      sprites: ["butterfly", "butterfly-settled"],
    },
    {
      label: "petals from dogwood trees",
      kind: "effect",
      arrives: 7,
      fixed: "up to 70 at once",
      sprites: ["petal"],
    },
    {
      label: "Horsetail Fall firefall",
      kind: "effect",
      layer: "on El Capitan, in the far row",
      arrives: 4,
      fixed: "one at a time, 8 s, every 25 to 40 s; seen at night",
      sprites: ["firefall"],
    },
    walkerActor({
      id: "cat",
      label: "bobcat, resting in the grass between prowls",
      kind: "animal",
      family: "cats",
      sprites: ["bobcat", "bobcat-sitting", "bobcat-arching", "bobcat-lying", "bobcat-stretching"],
      arrives: 6,
      phone: "hide",
      move: { speed: 8, stride: 7, sit: [4, 9], walk: [3, 6] },
      poses: () => felidPoses("bobcat"),
      draw: (g, w, f) => felidAt(g, { ...w, kind: "bobcat" }, f.time),
    }),
    drawStep("butterflies-petals", (g, f) => {
      const day = !isNight(f);
      for (const fly of f.extra.flies) {
        if (day && f.time >= fly.from) butterflyAt(g, fly, f.time, flowerHead(g, f, fly.flower));
      }
      for (const petal of f.extra.petals) rect(g, g.pal.petal, Math.round(petal.x), Math.round(petal.y), 1, 1);
    }),
    drawStep("bears", (g, f) => {
      for (const b of f.extra.bears) if (b.active) bearAt(g, b, f.time);
    }),
    {
      label: "bear and cub",
      kind: "animal",
      family: "bears",
      presence: ["bears[0]", "bears[1]"],
      sprites: ["bear", "bear-foraging", "bear-rearing", "bear-sitting", "bear-lying", "bear-cub", "bear-cub-sitting"],
    },
    crossingActor({
      id: "eagle",
      label: "golden eagle (slow flyby, side-on, perches now and then)",
      kind: "bird",
      sprites: [
        "eagle-side",
        "eagle-side-flapping",
        "eagle-landing",
        "eagle-takeoff",
        "eagle-perched",
        "eagle-perched-preening",
        "eagle-perched-stretching",
      ],
      arrives: 6,
      when: "day",
      first: 0,
      mode: "perch",
      every: [8, 4],
      speed: 13,
      spawn: (f) => ({ y: 20 + f.rand() * 28 }),
      spots: perchSpots,
      stay: [14, 28],
      clearOnOff: "perched",
      draw: (g, b, f) => eagleFlyAt(g, "golden", b, f.time),
    }),
    circlerActor({
      id: "soarer",
      label: "golden eagle (circling)",
      kind: "bird",
      sprites: ["eagle", "eagle-bank", "eagle-flapping"],
      arrives: 7,
      when: "day",
      cy: (f) => 46 + f.rand() * 10,
      draw: (g, s, f) => circlerAt(g, "golden", s, f.time),
    }),
    crossingActor({
      id: "jay",
      label: "Steller's jay",
      kind: "bird",
      family: "small-flyers",
      sprites: ["jay", "jay-perched"],
      arrives: 4,
      when: "day",
      first: 5,
      mode: "perch",
      every: [7, 5],
      speed: 24,
      spawn: (f) => ({ y: f.groundY - 50 - f.rand() * 30 }),
      spots: perchSpots,
      small: "jay",
      odds: 0.3,
      stay: [8, 16],
      draw: (g, b, f) => flyerAt(g, b, f.time, "jay"),
    }),
    crossingActor({
      id: "kingfisher",
      label: "kingfisher",
      kind: "bird",
      family: "small-flyers",
      sprites: ["kingfisher", "kingfisher-perched"],
      arrives: 2,
      when: "day",
      first: 2,
      mode: "perch",
      every: [4, 5],
      speed: 62,
      spawn: (f) => ({ y: f.groundY - 14 - f.rand() * 34 }),
      spots: bushSpots,
      small: "kingfisher",
      odds: 0.3,
      stay: [8, 16],
      draw: (g, b, f) => kingfisherAt(g, b, f.time),
    }),
    walkerActor({
      id: "elk",
      label: "bull elk",
      kind: "animal",
      family: "deer",
      sprites: ["elk", "elk-sitting", "elk-lying"],
      arrives: 7,
      scale: 1.1,
      props: { kind: "elk", sex: "m" },
      move: { speed: 6, stride: 5, sit: [4, 8], walk: [4, 8] },
      draw: (g, w, f) => cervidAt(g, w, f.time),
    }),
    drawStep("fox", (g, f) => {
      if (f.extra.fox.active) canidAt(g, f.extra.fox, f.time);
    }),
    {
      label: "red fox",
      kind: "animal",
      family: "dogs",
      presence: ["fox"],
      sprites: ["fox", "fox-pounce"],
    },
    walkerActor({
      id: "rabbit",
      label: "cottontail",
      kind: "animal",
      family: "hares-rodents",
      sprites: ["rabbit", "rabbit-sitting-up", "rabbit-grazing", "rabbit-washing", "rabbit-loafing", "rabbit-lying"],
      arrives: 1,
      move: { speed: 14, stride: 10, sit: [2, 5], walk: [1.5, 3] },
      poses: () => harePoses("cottontail"),
      draw: (g, w, f) => hareAt(g, w, f.time),
    }),
  ],
  {
    init(f) {
      const colours = [0, 1, 2, 4];
      return {
        petals: [],
        fox: { ...walker(f), kind: "red" },
        pounce: { next: 15 + f.rand() * 10, start: -10 },
        cliff: f.plants.find((p) => p.kind === "elcap"),
        firefall: { start: -Infinity, next: Infinity },
        bears: [walker(f), { ...walker(f, 0.55), cub: true }],
        rear: { next: 14 + f.rand() * 10, until: -1 },
        flies: Array.from({ length: BUTTERFLY_MAX }, (_, i) => ({
          homeX: (0.12 + 0.76 * ((i + f.rand() * 0.8) / BUTTERFLY_MAX)) * f.cols,
          homeY: f.groundY - 14 - f.rand() * 26,
          phase: f.rand() * 6.28,
          speed: 0.5 + f.rand() * 0.4,
          colour: colours[i % colours.length],
          cycle: 15 + f.rand() * 6,
          from: Infinity,
          at: Infinity,
          n: null,
          flower: null,
        })),
      };
    },

    onGrow(f) {
      const { bears, firefall } = f.extra;
      if (f.stage >= 4 && firefall.next === Infinity) firefall.next = f.time + 3;
      if (f.stage >= 4) {
        const [bear, cub] = bears;
        enter(f, bear);
        enterBehind(f, cub, bear, 16);
      }
      if (f.stage >= 5) enter(f, f.extra.fox);
      f.extra.flies.forEach((fly, i) => {
        if (i < f.stage - 4 && fly.from === Infinity) {
          fly.from = f.time + (f.reduced ? 0 : 2.2);
          fly.at = fly.from - fly.cycle * 0.6;
        }
      });
    },

    busy: (f) => f.stage >= 2 || f.extra.petals.length > 0,

    update(f, dt) {
      const { petals, fox, pounce, bears, cliff, firefall, rear } = f.extra;
      tickTimer(f, firefall, [25, 15], () => {
        firefall.start = f.time;
      });
      const age = f.time - firefall.start;
      cliff.flare = smooth(clamp(age / 1.5, 0, 1)) * smooth(clamp((FIREFALL_SECONDS - age) / 2.5, 0, 1));
      tickTimer(
        f,
        pounce,
        [20, 10],
        () => {
          pounce.start = f.time;
        },
        fox.active && fox.x > 16 && fox.x < f.cols - 16,
      );
      const leap = f.time - pounce.start;
      if (leap < POUNCE_SECONDS) {
        fox.state = "pounce";
        fox.lift = pounceLift(leap);
        fox.x += fox.dir * 9 * dt;
      } else {
        fox.lift = 0;
        if (fox.state === "pounce") fox.state = "sit";
        wander(f, fox, dt, { speed: 12, stride: 8, sit: [2, 4], walk: [3, 6] });
      }
      settleCanid(f, fox);
      const [bear, cub] = bears;
      tickTimer(
        f,
        rear,
        [22, 12],
        () => {
          rear.until = f.time + 3;
        },
        bear.active,
      );
      if (f.time < rear.until) {
        bear.state = "rear";
        bear.timer = rear.until - f.time;
      } else {
        if (bear.state === "rear") bear.state = "walk";
        stroll(f, bear, dt, 5);
      }
      settle(f, bear);
      follow(cub, bear, dt, 16);
      cub.phase = bear.phase + 1;
      cub.state = bear.state === "rear" ? "sit" : "walk";
      cub.timer = bear.timer;
      rest(f, cub, bearPoses(cub));
      if (f.stage >= 7) {
        for (const p of f.plants) {
          if (p.species !== "dogwood" || p.kind !== "tree" || !p.crown || petals.length > 70) continue;
          if (f.rand() > dt * 1.2) continue;
          const { cx, top, half, bottom } = p.crown;
          petals.push({
            x: cx + (f.rand() * 2 - 1) * half,
            y: top + f.rand() * (bottom - top),
            vy: 6 + f.rand() * 5,
            phase: f.rand() * 6.28,
          });
        }
      }
      const spots = f.plants.filter((p) => p.kind === "flower" && flowerSize(p) >= 0.9);
      for (const fly of f.extra.flies) {
        if (fly.at !== Infinity)
          butterflyPick(
            fly,
            f.time,
            spots,
            f.extra.flies.map((o) => o.flower).filter((o) => o && o !== fly.flower),
          );
      }
      for (const petal of petals) {
        petal.y += petal.vy * dt;
        petal.x += Math.sin(f.time * 2 + petal.phase) * 5 * dt;
      }
      f.extra.petals = petals.filter((petal) => petal.y < f.groundY + 10);
    },
  },
);

const SPRITES = {
  ...soarSprites("eagle", "golden", { side: true }),
  bobcat: (g, frame) => felidAt(g, walk(frame, { kind: "bobcat" }), 0),
  "bobcat-sitting": (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", state: "sit", pose: "sit" }), 0),
  "bobcat-arching": (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", state: "sit", pose: "arch" }), 0),
  "bobcat-lying": (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", state: "sit", pose: "lie" }), 0),
  "bobcat-stretching": (g, frame) => felidAt(g, walk(frame, { kind: "bobcat", state: "sit", pose: "bow" }), 0),
  rabbit: (g, frame) => hareAt(g, walk(frame)),
  "rabbit-sitting-up": (g, frame) => hareAt(g, walk(frame, { state: "sit", pose: "tall" }), 0),
  "rabbit-grazing": (g, frame) => hareAt(g, walk(frame, { state: "sit", pose: "graze" }), 0),
  "rabbit-washing": (g, frame) => hareAt(g, walk(frame, { state: "sit", pose: "groom" }), 0),
  "rabbit-loafing": (g, frame) => hareAt(g, walk(frame, { state: "sit", pose: "loaf" }), 0),
  "rabbit-lying": (g, frame) => hareAt(g, walk(frame, { state: "sit", pose: "lie" }), 0),
  fox: (g, frame) => canidAt(g, walk(frame, { kind: "red" })),
  "fox-pounce": (g, frame) => canidAt(g, walk(frame, { kind: "red", state: "pounce", lift: 6 })),
  elk: (g, frame) => cervidAt(g, walk(frame, { kind: "elk", sex: "m", scale: 1.1 })),
  "elk-sitting": (g, frame) => cervidAt(g, walk(frame, { kind: "elk", sex: "m", scale: 1.1, state: "sit" })),
  "elk-lying": (g, frame) => cervidAt(g, walk(frame, { kind: "elk", sex: "m", scale: 1.1, state: "sit", pose: "lie" })),
  jay: (g, frame) => flyerAt(g, bird(frame), 0, "jay"),
  "jay-perched": (g) => perchedSmall(g, "jay", 40, 40, 0, blendPose({})),
  butterfly: (g) => butterflyAt(g, butterfly(), 0),
  "butterfly-settled": (g) => {
    // Resting on a flower, the wings half open: 2.5 s into its round.
    const flower = { x: 40, seed: 2, scale: 1.2 };
    g.time = 0;
    meadowFlower(g, flower, 1, 44);
    butterflyAt(g, butterfly({ at: -2.5, n: 0 }), 0, meadowFlowerHead(g, flower, 1, 44));
  },
  bear: (g, frame) => bearAt(g, walk(frame)),
  "bear-foraging": (g, frame) => bearAt(g, walk(frame, { state: "sit", pose: "forage", since: 0, timer: 30 }), 5),
  "bear-rearing": (g, frame) => bearAt(g, walk(frame, { state: "rear", since: 0, timer: 30 }), 5),
  "bear-sitting": (g, frame) => bearAt(g, walk(frame, { state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
  "bear-lying": (g, frame) => bearAt(g, walk(frame, { state: "sit", pose: "lie", since: 0, timer: 30 }), 5),
  "bear-cub": (g, frame) => bearAt(g, walk(frame, { scale: 0.55, cub: true })),
  "bear-cub-sitting": (g, frame) =>
    bearAt(g, walk(frame, { scale: 0.55, cub: true, state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
  kingfisher: (g, frame) => kingfisherAt(g, bird(frame), 0),
  "kingfisher-perched": (g) => perchedSmall(g, "kingfisher", 40, 40, 0, blendPose({})),
  petal: (g) => {
    for (const [x, y] of [
      [6, 6],
      [12, 10],
      [18, 4],
      [25, 12],
      [31, 7],
      [36, 15],
    ]) {
      rect(g, g.pal.petal, x, y, 1, 1);
    }
  },
  // The firefall shows only at night, so its sprite is El Capitan's face in the dark palette.
  firefall: (g, _frame) =>
    elcap({ ...g, pal: fade(DARK, 0.55) }, { x: 40, scale: 0.6, seed: 7, flare: 1 }, 1, ANIMAL_BOX.ground),
};

const PLANT_FAMILIES = {
  "tree-round": "broadleaf",
  "tree-dogwood": "broadleaf",
  "tree-birch": "broadleaf",
  sequoia: "conifers",
  "tree-pine": "conifers",
};

export const META = {
  id: "meadow",
  label: "Yosemite Meadows",
  group: "woods",
  tint: ["#b7dc98", "rgb(96 160 84)"],
  backdrop: {
    light: {
      green: "#b7dc98",
      "green-soft": "#d3eac0",
      peach: "#fbdfc8",
      blush: "#fdeceb",
      bloom: "#cfeab4",
    },
    dark: {
      green: "rgb(96 160 84 / 0.4)",
      "green-soft": "rgb(96 160 84 / 0.2)",
      peach: "rgb(206 128 84 / 0.22)",
      blush: "rgb(196 96 120 / 0.14)",
      bloom: "rgb(110 178 92 / 0.34)",
    },
  },
};

export default {
  ...META,
  cast: extras.cast,
  sprites: SPRITES,
  plantFamilies: PLANT_FAMILIES,
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.5], dark: [0.55] },
  mature: MATURE,
  paint: { tuft, flower, bush, tree, sequoia, mushroom, hill, elcap },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      ".bb......bb.",
      ".bkb....bkb.",
      ".bbbbbbbbbb.",
      "bbbbbbbbbbbb",
      "bbbebbbbebbb",
      "bbbbmmmmbbbb",
      "bbbmmnnmmbbb",
      ".bbmmmmmmbb.",
      "..bbmmmmbb..",
      "...bbbbbb...",
      "............",
    ],
    colours: { b: "#8a5532", k: "#d9b48a", e: "#2a1d15", m: "#d9b48a", n: "#2a1d15" },
  },
};
