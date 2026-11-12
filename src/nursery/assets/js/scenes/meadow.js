// The meadow scene: grass, flowers, round and pine trees, birches, flowering dogwoods and tall
// sequoias at the sides: California's Sierra. Behind it stands El Capitan's east face, flanked by
// sequoia groves, with Horsetail Fall pouring off its rim. At night the fall glows like embers,
// and every 25 to 40 seconds it flares into the firefall, when the setting sun lights the water and
// the wall beside it. A cottontail, a red fox that now and then leaps on a mouse in the grass, a
// bull elk, a black bear and cub share the meadow; by day a belted kingfisher, a golden eagle and
// butterflies fly over.
import { bearAt, canidAt, cervidAt, flyerAt, hareAt, kingfisherAt, raptorAt } from "../kit/animals.js";
import { enter, enterBehind, flyBy, follow, isNight, soarAt, soarer, stroll, walker, wander } from "../kit/critters.js";
import { broadleafTree, clump, coniferTree } from "../kit/trees.js";
import {
  CLEARING,
  NARROW_COLS,
  blob,
  clamp,
  clearing,
  foliage,
  grove,
  hash,
  line,
  makePlant,
  placeLandmarks,
  rect,
  row,
  scatter,
  smooth,
  sortPlants,
  wind,
} from "../kit/pixel.js";

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
  leaf: ["#cdeaa4", "#a3d675", "#78bb5c", "#559c4a"],
  pine: ["#b4dcae", "#86c392", "#5ca67a", "#43876a"],
  bloom: "#ffffff",
  bloomCentre: "#fcd668",
  trunk: ["#b58f6a", "#93714f"],
  birch: ["#f6f2ea", "#d4cdbf"],
  birchMark: "#7d746a",
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
  elk: ["#a07048", "#6b4a2e", "#e8d6b4", "#d9c29a", "#4a3220", "#7f5836"],
  bear: ["#322a27", "#4e4039", "#bc9d7c", "#141010", "#262020"],
  jay: { C: "#1f2a40", H: "#2a3a5a", E: "#f2f2f2", K: "#1a1a1a", T: "#3a6bb0", b: "#3a6bb0", B: "#3a6bb0", l: "#2d4f8c", t: "#3a6bb0", p: "#7aa6dc", d: "#1f3560" },
  kingfisher: ["#5b82a8", "#c8653a", "#2c2c34", "#f6f2ea"],
  eagle: ["#4a3426", "#e0a93a", "#4a3426", "#f3eadb", "#7a5a44"],
  granite: ["#a99f8e", "#958c7d", "#7d766b", "#615c55"],
  snow: "#ffffff",
  // An object, not a list, so the distance fade leaves the water at full strength.
  horsetail: { water: ["#ffffff", "#cbe8f7", "#7fbde4"], wash: null, lamp: null },
  haze: "#ffffff",
};

const DARK = {
  leaf: ["#8fc272", "#6ba455", "#4c8541", "#356a35"],
  pine: ["#6fae8a", "#52926f", "#3c7658", "#2b5d46"],
  bloom: "#f5f5f5",
  bloomCentre: "#fcd668",
  trunk: ["#8a6a4d", "#6a4f39"],
  birch: ["#d9d4c8", "#a8a194"],
  birchMark: "#4b463f",
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
  elk: ["#b07c50", "#7a5636", "#e0cdaa", "#d9c29a", "#543924", "#8c6240"],
  bear: ["#5a4c46", "#76645a", "#bc9d7c", "#1a1414", "#3a302c"],
  jay: { C: "#171e2d", H: "#1d283c", E: "#959698", K: "#141416", T: "#274570", b: "#274570", B: "#274570", l: "#1f345a", t: "#274570", p: "#4d688a", d: "#172540" },
  kingfisher: ["#6a90b8", "#c8653a", "#52525e", "#f0ece4"],
  eagle: ["#7a5638", "#f2c25a", "#7a5638", "#f5efe4", "#5a4432"],
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
  const { pal } = g;
  const stem = Math.max(2, Math.round((5 + (p.seed % 5)) * p.scale * s));
  const sway = stem >= 5 ? wind(g.time, p.x) : 0;
  rect(g, pal.leaf[2], p.x, base - stem, 1, stem);
  if (stem >= 4) {
    rect(g, pal.leaf[1], p.x - 1, base - 2, 1, 1);
    rect(g, pal.leaf[1], p.x + 1, base - 3, 1, 1);
  }
  const colour = pal.flowers[p.seed % pal.flowers.length];
  const x = p.x + sway;
  const y = base - stem;
  if (s <= 0.5) {
    rect(g, colour, x, y - 1, 1, 1);
    return;
  }
  rect(g, colour, x, y - 2, 1, 1);
  rect(g, colour, x - 1, y - 1, 3, 1);
  rect(g, colour, x, y, 1, 1);
  rect(g, colour === pal.flowers[2] ? pal.flowers[3] : pal.centre, x, y - 1, 1, 1);
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
    return coniferTree(g, p, s, base, { ...spec, tones: pal.pine, tiers: 8, spread: 0.3, clear: 0.14 });
  }
  if (p.species === "birch") {
    const bark = { trunkTones: pal.birch, mark: pal.birchMark };
    return broadleafTree(g, p, s, base, { ...spec, ...bark, wide: 0.55, lift: 0.14 });
  }
  const bloom = p.species === "dogwood" ? clamp((p.shown - 5) / 3, 0, 1) : 0;
  return broadleafTree(g, p, s, base, {
    ...spec,
    extra: (dx, dy) => {
      if (bloom <= 0 || hash(dx, dy, p.seed + 7) >= bloom * 0.9) return null;
      return hash(dx, dy, p.seed + 8) < 0.25 ? pal.bloomCentre : pal.bloom;
    },
  });
}

// A sequoia's boughs, low to high, on alternating sides: [height on the tree, side, reach, clump
// width, clump height], the last four as fractions of the tree's height.
const SEQUOIA_BOUGHS = [
  [0.46, -1, 0.09, 0.15, 0.07],
  [0.5, 1, 0.1, 0.16, 0.07],
  [0.57, -1, 0.11, 0.18, 0.09],
  [0.62, 1, 0.11, 0.18, 0.09],
  [0.69, -1, 0.1, 0.18, 0.09],
  [0.74, 1, 0.1, 0.17, 0.09],
  [0.81, -1, 0.08, 0.16, 0.09],
  [0.86, 1, 0.07, 0.15, 0.08],
  [0.91, -1, 0.04, 0.13, 0.08],
];
const SEQUOIA_GIRTH = 0.13; // the trunk's width at the foot, as a fraction of the tree's height

// One row of furrowed bark, lit on the left and shaded on the right. Its grooves are set from the
// tree's centre line, so they run on unbroken as the trunk tapers.
function sequoiaBark(g, cx, left, width, y, seed) {
  const [mid, shade] = g.pal.sequoiaBark;
  const [lit, deep] = g.pal.sequoiaDepth;
  for (let i = 0; i < width; i += 1) {
    const u = i / Math.max(1, width - 1);
    const off = left + i - cx;
    const groove = Math.round(Math.sin(y * 0.2 + off * 1.3 + seed) * 0.9);
    const furrow = (off + groove + 60) % 3 === 0 && width >= 5;
    const tone = u < 0.3 ? lit : u < 0.7 ? mid : shade;
    rect(g, furrow ? (u < 0.3 ? mid : deep) : tone, left + i, y, 1, 1);
  }
}

// A giant sequoia: a flared foot and a tapering cinnamon trunk, short elbow boughs high up, and a
// narrow crown of foliage clumps with slits of sky between them.
function sequoia(g, p, s, base) {
  const { pal } = g;
  const total = Math.max(8, Math.round(TREE_ROWS * p.scale * s));
  const foot = Math.max(3, Math.round(total * SEQUOIA_GIRTH));
  const widthAt = (r) => Math.max(3, Math.round(foot * (1 - 0.6 * (r / total))));
  const flare = (r) => Math.round(Math.max(0, 1 - r / (total * 0.07)) ** 2 * foot * 0.35);
  for (let r = 0; r < Math.round(total * 0.9); r += 1) {
    const w = widthAt(r) + flare(r) * 2;
    sequoiaBark(g, p.x, p.x - (w >> 1), w, base - 1 - r, p.seed);
  }
  if (s < 0.3) return;
  const sway = wind(g.time, p.x);
  const boughs = SEQUOIA_BOUGHS.map(([at, side, reach, cw, ch], i) => {
    const r = Math.round(total * at);
    const trunkX = p.x + side * (widthAt(r) >> 1);
    const cx = trunkX + side * Math.round(total * reach) + sway;
    const cy = base - 1 - r - Math.round(total * reach * 0.5);
    return { trunkX, y: base - 1 - r, cx, cy, w: Math.round(total * cw), h: Math.max(3, Math.round(total * ch * 1.35)), i };
  });
  for (const b of boughs) {
    const thick = total >= 50 ? 2 : 1;
    for (let i = 0; i < thick; i += 1) {
      line(g, i === thick - 1 ? pal.sequoiaDepth[1] : pal.sequoiaBark[0], b.trunkX, b.y + i, b.cx, b.cy + 1 + i);
    }
  }
  // The crown closes over the tip, a little off centre, as an old tree's does.
  clump(g, p.x + sway + 1, base - total + Math.round(total * 0.06), Math.round(total * 0.22), Math.round(total * 0.12), pal.sequoia, p.seed + 99);
  for (const b of boughs) clump(g, b.cx, b.cy, b.w, b.h, pal.sequoia, p.seed + b.i * 7);
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
    const half = Math.round((width / 2) * Math.pow(1 - f, 0.55) + (hash(r, p.seed, 1) - 0.5) * 2);
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
  grove(plants, ctx, { ...sequoias, x: Math.max(capLeft + 2, 4), count: narrowPage ? 2 : 4, scale: [1.3 * capScale, 1.8 * capScale] });
  grove(plants, ctx, { ...sequoias, x: capX + capHalf - 4, count: narrowPage ? 2 : 3, scale: [1.1 * capScale, 1.6 * capScale] });
  scatter(plants, ctx, { kind: "tree", count: Math.round(cols / 13), born: [1, 4], scale: [0.55, 0.85], layer: 0, species: TREES, keep: open });
  scatter(plants, ctx, { kind: "bush", count: Math.round(cols / 22), born: [2, 5], scale: [0.6, 0.9], layer: 0 });
  scatter(plants, ctx, { kind: "flower", count: Math.round(cols / 18), born: [0, 4], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, { kind: "tuft", count: Math.round(cols / 8), born: [0, 3], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, { kind: "sequoia", count: Math.round(cols / 22), born: [2, 4], scale: [1.5, 1.9], layer: 0, keep: (x) => middle(x) && open(x) });
  scatter(plants, ctx, { kind: "tree", count: Math.round(cols / 22), born: [1, 4], scale: [0.85, 1.35], depth: [3, 12], species: TREES, keep: open });
  scatter(plants, ctx, { kind: "bush", count: Math.round(cols / 18), born: [2, 5], scale: [0.8, 1.2], depth: [2, 13] });
  scatter(plants, ctx, { kind: "flower", count: Math.round(cols / 8), born: [0, 4], scale: [0.8, 1.3], depth: [0, 14] });
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

// Wonderland borrows this butterfly; it reads pal.flowers and pal.body.
export function butterflyAt(g, b, time) {
  const { pal } = g;
  const x = Math.round(b.homeX + Math.sin(time * b.speed + b.phase) * 30 + Math.sin(time * 1.9 + b.phase) * 6);
  const y = Math.round(b.homeY + Math.sin(time * b.speed * 1.3 + b.phase * 2) * 10 + Math.sin(time * 3.1) * 2);
  const wings = pal.flowers[b.colour];
  rect(g, pal.body, x, y, 1, 2);
  if (Math.floor(time * 6 + b.phase) % 2) {
    rect(g, wings, x - 2, y - 1, 2, 2);
    rect(g, wings, x + 1, y - 1, 2, 2);
  } else {
    rect(g, wings, x - 1, y, 1, 2);
    rect(g, wings, x + 1, y, 1, 2);
  }
}

// Creatures

// The red fox hunts mice in the grass: it stops, listens, then leaps high and comes down nose
// first. `t` is seconds into the leap.
const POUNCE_SECONDS = 1.1;

function pounceLift(t) {
  return Math.sin(Math.PI * Math.min(1, t / POUNCE_SECONDS)) * 7;
}

const extras = {
  init(f) {
    const colours = [0, 1, 2, 4];
    return {
      petals: [],
      eagle: { next: 0, bird: null },
      soarer: soarer(f, 46 + f.rand() * 10),
      jay: { next: 5, bird: null },
      rabbit: walker(f),
      fox: { ...walker(f), kind: "red" },
      pounce: { next: 15 + f.rand() * 10, start: -10 },
      cliff: f.plants.find((p) => p.kind === "elcap"),
      firefall: { start: -Infinity, next: Infinity },
      elk: { ...walker(f, 1.1), kind: "elk", sex: "m" },
      bears: [walker(f), { ...walker(f, 0.55), cub: true }],
      rear: { next: 14 + f.rand() * 10, until: -1 },
      kingfisher: { next: 2, bird: null },
      flies: Array.from({ length: BUTTERFLY_MAX }, (_, i) => ({
        homeX: (0.12 + 0.76 * ((i + f.rand() * 0.8) / BUTTERFLY_MAX)) * f.cols,
        homeY: f.groundY - 14 - f.rand() * 26,
        phase: f.rand() * 6.28,
        speed: 0.5 + f.rand() * 0.4,
        colour: colours[i % colours.length],
        from: Infinity,
      })),
    };
  },

  // Butterflies arrive a little after the forest is old enough, one more per watering. A rabbit
  // comes at stage 3, a bear and cub at 4 (when El Capitan has grown in and the firefall starts),
  // a fox at 5 and an elk at 7.
  onGrow(f) {
    const { bears, firefall } = f.extra;
    if (f.stage >= 4 && firefall.next === Infinity) firefall.next = f.time + 3;
    if (f.stage >= 3) enter(f, f.extra.rabbit);
    if (f.stage >= 4) {
      const [bear, cub] = bears;
      enter(f, bear);
      enterBehind(f, cub, bear, 16);
    }
    if (f.stage >= 5) enter(f, f.extra.fox);
    if (f.stage >= 7) enter(f, f.extra.elk);
    f.extra.flies.forEach((fly, i) => {
      if (i < f.stage - 4 && fly.from === Infinity) fly.from = f.time + (f.reduced ? 0 : 2.2);
    });
  },

  busy: (f) => f.stage >= 2 || f.extra.petals.length > 0,

  update(f, dt) {
    const { petals, rabbit, fox, pounce, elk, bears, kingfisher, eagle, jay, soarer: circler, cliff, firefall } = f.extra;
    // The firefall: the sun catches Horsetail Fall for a few seconds, then slips away. It shows
    // only at night, when the fall glows.
    if (f.time >= firefall.next) {
      firefall.start = f.time;
      firefall.next = f.time + 25 + f.rand() * 15;
    }
    const age = f.time - firefall.start;
    cliff.flare = smooth(clamp(age / 1.5, 0, 1)) * smooth(clamp((FIREFALL_SECONDS - age) / 2.5, 0, 1));
    wander(f, rabbit, dt, { speed: 14, stride: 10, sit: [2, 5], walk: [1.5, 3] });
    if (fox.active && f.time >= pounce.next && fox.x > 16 && fox.x < f.cols - 16) {
      pounce.start = f.time;
      pounce.next = f.time + 20 + f.rand() * 10;
    }
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
    wander(f, elk, dt, { speed: 6, stride: 5, sit: [4, 8], walk: [4, 8] });
    // The mother bear forages along, and now and then rears up on her hind legs to sniff the air.
    const [bear, cub] = bears;
    const { rear } = f.extra;
    if (bear.active && f.time >= rear.next) {
      rear.until = f.time + 3;
      rear.next = f.time + 22 + f.rand() * 12;
    }
    if (f.time < rear.until) bear.state = "rear";
    else {
      if (bear.state === "rear") bear.state = "walk";
      stroll(f, bear, dt, 5);
    }
    follow(cub, bear, dt, 16);
    cub.phase = bear.phase + 1;
    const day = !isNight(f);
    if (f.stage >= 2 && day) flyBy(f, kingfisher, dt, { every: [4, 5], speed: 62, spawn: () => ({ y: f.groundY - 14 - f.rand() * 34 }) });
    if (f.stage >= 4 && day) flyBy(f, jay, dt, { every: [7, 5], speed: 24, spawn: () => ({ y: f.groundY - 50 - f.rand() * 30 }) });
    // The golden eagle crosses slowly; a second one circles over the meadow.
    if (f.stage >= 6 && day) flyBy(f, eagle, dt, { every: [8, 4], speed: 13, spawn: () => ({ y: 20 + f.rand() * 28 }) });
    circler.active = f.stage >= 7 && day;
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
    for (const petal of petals) {
      petal.y += petal.vy * dt;
      petal.x += Math.sin(f.time * 2 + petal.phase) * 5 * dt;
    }
    f.extra.petals = petals.filter((petal) => petal.y < f.groundY + 10);
  },

  draw(g, f) {
    const day = !isNight(f);
    for (const fly of f.extra.flies) {
      if (day && f.time >= fly.from) butterflyAt(g, fly, f.time);
    }
    for (const petal of f.extra.petals) rect(g, g.pal.petal, Math.round(petal.x), Math.round(petal.y), 1, 1);
    const { rabbit, fox, elk, bears, kingfisher, eagle, jay, soarer: circler } = f.extra;
    for (const b of bears) if (b.active) bearAt(g, b);
    if (eagle.bird && day) {
      const e = eagle.bird;
      const flap = Math.sin(f.time * 0.9 + e.phase) > 0.75;
      raptorAt(g, { kind: "eagleSide", pal: "eagle", x: e.x, y: e.y, dir: e.dir }, { bank: flap });
    }
    if (circler.active) {
      const c = soarAt(f.time, circler);
      raptorAt(g, { kind: "eagle", x: c.x, y: c.y, dir: c.dir }, { bank: c.bank });
    }
    if (jay.bird && day) flyerAt(g, jay.bird, f.time, "jay");
    if (kingfisher.bird && day) kingfisherAt(g, kingfisher.bird, f.time);
    if (elk.active) cervidAt(g, elk);
    if (fox.active) canidAt(g, fox);
    if (rabbit.active) hareAt(g, rabbit);
  },
};

export default {
  id: "meadow",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.5], dark: [0.55] },
  mature: { tuft: 1.5, flower: 2, bush: 2.5, tree: 3, sequoia: 4, mushroom: 1, hill: 2.5, elcap: 2.5 },
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
