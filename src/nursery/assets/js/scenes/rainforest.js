// The Thai rainforest scene, after Khao Sok, one of the oldest rainforests on earth: emergent
// dipterocarps on plank buttresses, strangler figs on a lattice of roots with aerial roots hanging
// from their crowns, clumps of giant bamboo and wild banana, tree ferns and cycads, all under dark
// limestone karst towers threaded with mist. A great hornbill pair, a crested serpent eagle and
// kingfishers fly over; a gibbon swings through the canopy, a dusky langur sits on a branch, and a
// line of otters, a macaque and an elephant with her calf pass below. At night one tree of
// fireflies flashes in time.
import { elephantAt, flyerAt, kingfisherAt, raptorAt } from "../kit/animals.js";
import {
  doing,
  enter,
  enterBehind,
  fidget,
  flock,
  flyBy,
  follow,
  isNight,
  narrow,
  percher,
  stroll,
  walker,
  wander,
} from "../kit/critters.js";
import { mistAt, mistBand } from "../kit/effects.js";
import {
  CLEARING,
  blob,
  clamp,
  clearing,
  foliage,
  grove,
  hash,
  line,
  part,
  placeLandmarks,
  rect,
  row,
  scatter,
  sortPlants,
  sprite,
  stroke,
  wind,
} from "../kit/pixel.js";

const TREE_ROWS = 66; // a full-grown emergent dipterocarp at scale 1
const FIG_ROWS = 42;
const KARST_ROWS = 80;
const TREES = ["dipterocarp", "fig", "dipterocarp"];
const FIREFLIES = 26;
const MISTS = 8;

const LIGHT = {
  leaf: ["#7fae6e", "#5a9058", "#3e7346", "#2b5a3a"],
  fern: ["#8fbf78", "#649c5c", "#457d48", "#305f38"],
  bamboo: ["#c3d68a", "#8fb05a", "#6a8e42", "#4c6e30"],
  canopy: ["#6a9e72", "#4a815c", "#336649", "#234d38"],
  trunk: ["#b4a692", "#86786a", "#4c4038"],
  bud: ["#7a2e4a", "#a2465e"],
  cycad: ["#5f8a4a", "#3f6a36", "#6a5040"],
  liana: "#3a6e48",
  raff: ["#e24b26", "#f9d3b4", "#b73219", "#c98a5e", "#e2ab82", "#4a1710", "#f08a3a", "#ffd08a"],
  russula: ["#e8482f", "#c23220", "#f2ece0"],
  bolete: ["#a8743f", "#7d5230", "#ecdab4"],
  cup: ["#ee6a3a", "#c94a22"],
  coral: ["#f6bc45", "#e39a2a"],
  stink: ["#6e6c3c", "#f4f1e6", "#d0cbb8"],
  bracket: ["#e8863a", "#c4622a", "#f3c08a"],
  glow: ["#6ee27a", "#b9ffb0", "#eaffe2"],
  karst: ["#a3aeab", "#86928f", "#68746f"],
  soil: ["#8a5e40", "#74492f", "#5c3826"],
  litter: ["#b07a44", "#6e8a44"],
  line: "rgba(255, 255, 255, 0.34)",
  wet: "#4a2a15",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  fire: ["#f2b630", "#ffe58a"],
  monkey: ["#a69582", "#85735f", "#ecbfa6"],
  elephant: ["#9aa1a6", "#7c8389", "#b8979c", "#efe6d2", "#26262a"],
  hornbill: ["#26262c", "#f4f2ea", "#f2c230", "#e0862a"],
  serpent: ["#4a3626", "#000000", "#000000", "#e8c040", "#000000", "#f2efe6"],
  kingfisher: ["#2f7fc2", "#e8803a", "#2c2c34", "#f6f2ea"],
  gibbon: ["#b98a5c", "#2e2420", "#fdf6ea"],
  langur: ["#4e4c52", "#2a282c", "#f2efe8", "#8e8a90"],
  otter: ["#6e4e36", "#4a3424", "#c9ad8a"],
  mist: "#ffffff",
  haze: "#f4f7f2",
};

const DARK = {
  leaf: ["#5e8e5c", "#46784c", "#33603e", "#244a30"],
  fern: ["#6a9a62", "#4e8052", "#386644", "#284e34"],
  bamboo: ["#9fb46e", "#7a974c", "#5e7b3c", "#45602e"],
  canopy: ["#4f8462", "#3c6c52", "#2c5642", "#1e4232"],
  trunk: ["#8a7e70", "#665a4e", "#2e2620"],
  bud: ["#6a2840", "#8a3a52"],
  cycad: ["#4a7040", "#33562e", "#4e3a2e"],
  liana: "#2e5a3c",
  raff: ["#e8512b", "#f3cba8", "#b23a20", "#b27a52", "#d09a70", "#2a0d0a", "#f0903e", "#ffd896"],
  russula: ["#e8553a", "#c23f2a", "#e6dfd0"],
  bolete: ["#a8743f", "#7d5230", "#d8c59c"],
  cup: ["#f07448", "#c9532c"],
  coral: ["#f6bc45", "#e39a2a"],
  stink: ["#8a8848", "#e8e4d6", "#b8b3a0"],
  bracket: ["#e8863a", "#c4622a", "#f3c08a"],
  glow: ["#5ff27a", "#b9ffb0", "#eaffe2"],
  karst: ["#4f5c5c", "#404c4c", "#323d3d"],
  soil: ["#3e2a1e", "#332318", "#281b12"],
  litter: ["#6a4426", "#4a6230"],
  line: "rgba(255, 255, 255, 0.1)",
  wet: "#140a05",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  fire: ["#ffd24a", "#fff0a0"],
  monkey: ["#b3a28e", "#8e7d69", "#e8b49a"],
  elephant: ["#7c8388", "#61686d", "#94787c", "#d8d0bc", "#141416"],
  hornbill: ["#4a4a54", "#e6e4dc", "#e8b82a", "#d07a26"],
  serpent: ["#6a5644", "#000000", "#000000", "#e0b838", "#000000", "#e6e2d8"],
  kingfisher: ["#3a8ad0", "#e8803a", "#52525e", "#e6e2d8"],
  gibbon: ["#8f6a4a", "#1e1815", "#f2ebdd"],
  langur: ["#6a686e", "#3a383c", "#e8e4dc", "#9a969c"],
  otter: ["#7a5a42", "#56402e", "#c4a886"],
  mist: "#9fb4c8",
  haze: "#0b0b0b",
};

// A tropical tree's crown: a wide, flattened cluster of blobs.
function crownBlobs(g, cx, top, w, h, tones, seed) {
  const shade = foliage({ cx, top, w, h }, tones, seed);
  blob(g, cx, top + Math.round(h * 0.25), w, Math.round(h * 0.75), shade);
  blob(g, cx - Math.round(w * 0.28), top + Math.round(h * 0.35), Math.round(w * 0.5), Math.round(h * 0.65), shade);
  blob(g, cx + Math.round(w * 0.28), top + Math.round(h * 0.35), Math.round(w * 0.5), Math.round(h * 0.65), shade);
  blob(g, cx + Math.round(w * 0.04), top, Math.round(w * 0.5), Math.round(h * 0.5), shade);
}

// Lianas hang from a crown in front of its trunk and sway a little at their tips.
function lianas(g, p, cx, w, bottom, sway) {
  const count = Math.max(2, Math.round(w / 9));
  for (let i = 0; i < count; i += 1) {
    const x = Math.round(cx - w / 2 + ((i + 0.5) / count) * w + (hash(i, p.seed, 3) - 0.5) * 3);
    const length = Math.round(5 + hash(i, p.seed, 4) * 14);
    rect(g, g.pal.liana, x, bottom - 2, 1, length);
    rect(g, g.pal.liana, x + sway, bottom - 2 + length, 1, 1);
    for (let y = 3; y < length; y += 4) rect(g, g.pal.leaf[1], x + (y % 8 ? 1 : -1), bottom - 2 + y, 1, 1);
  }
}

// Buttress roots: thin plank fins that flare from the foot of a giant's trunk and run out over the
// ground, two to a side, with a shadow between them.
function buttress(g, x, base, width, height, reach) {
  const [light, mid, dark] = g.pal.trunk;
  const left = x - (width >> 1);
  const right = left + width - 1;
  for (let r = 0; r < height; r += 1) {
    const u = 1 - r / height;
    const out = Math.round(reach * u * u);
    const inner = Math.round(reach * 0.55 * u * u * u);
    const y = base - 1 - r;
    if (out > 0) {
      rect(g, mid, left - out, y, out, 1);
      rect(g, dark, right + 1, y, out, 1);
      rect(g, light, left - out, y, 1, 1);
    }
    if (inner > 1) {
      rect(g, dark, left - inner, y, 1, 1);
      rect(g, light, right + inner, y, 1, 1);
    }
  }
}

// A dipterocarp, the emergent giant: a pale, straight trunk that rises clear above the canopy to a
// small cauliflower crown, a few bare limbs below it, lianas, and buttress roots at its foot.
function dipterocarp(g, p, s, base) {
  const { pal } = g;
  const total = Math.max(5, Math.round(TREE_ROWS * p.scale * s));
  const top = base - total;
  const sway = wind(g.time, p.x);
  const crownH = Math.max(3, Math.round(total * 0.2));
  const crownW = Math.round(total * 0.62) + 2;
  const width = total >= 52 ? 4 : total >= 34 ? 3 : total >= 16 ? 2 : 1;
  const trunkTop = top + Math.round(crownH * 0.6);
  const left = p.x - (width >> 1);
  for (let y = trunkTop; y < base; y += 1) {
    rect(g, pal.trunk[0], left, y, width, 1);
    if (width >= 2) rect(g, pal.trunk[1], left + width - 1, y, 1, 1);
    if (width >= 3 && hash(p.seed, y >> 2, 5) < 0.3) rect(g, pal.trunk[1], left + 1, y, 1, 1);
  }
  if (total >= 30) {
    const limb = trunkTop + Math.round((base - trunkTop) * 0.12);
    line(g, pal.trunk[1], p.x, limb + 4, p.x - Math.round(crownW * 0.3), limb);
    line(g, pal.trunk[1], p.x, limb + 2, p.x + Math.round(crownW * 0.32), limb - 2);
  }
  if (total >= 18) buttress(g, p.x, base, width, Math.round(total * 0.22), Math.round(total * 0.17));
  const cx = p.x + sway;
  crownBlobs(g, cx, top, crownW, crownH, pal.canopy, p.seed);
  p.crown = { cx, top, half: crownW >> 1, bottom: top + crownH };
  if (total >= 20) lianas(g, p, cx, crownW * 0.8, top + crownH, sway);
}

// A strangler fig: a massive trunk that is a lattice of fused roots, dark hollows showing between
// them where the host tree rotted away, roots flaring over the ground at its foot, aerial roots
// hanging from a broad crown.
function fig(g, p, s, base) {
  const { pal } = g;
  const [light, mid, dark] = pal.trunk;
  const total = Math.max(4, Math.round(FIG_ROWS * p.scale * s));
  const top = base - total;
  const sway = wind(g.time, p.x);
  const h = Math.max(3, Math.round(total * 0.42));
  const w = Math.round(total * 1.25);
  const crownBottom = top + h;
  const width = total >= 30 ? 9 : total >= 18 ? 6 : total >= 10 ? 3 : 1;
  const half = width >> 1;
  const strands = Math.max(1, Math.round(width / 2));
  for (let y = crownBottom - 2; y < base; y += 1) {
    if (width >= 6) rect(g, dark, p.x - half, y, width, 1);
    for (let k = 0; k < strands; k += 1) {
      const home = p.x - half + Math.round(((k + 0.5) / strands) * width);
      const x = home + Math.round(Math.sin(y * 0.35 + k * 2.3 + p.seed) * 1.2);
      rect(g, k % 2 ? mid : light, x - 1, y, width >= 6 ? 2 : 1, 1);
    }
  }
  if (width >= 6) {
    // Roots flaring over the ground: arcs that leave the trunk and run down to the soil.
    for (const side of [-1, 1]) {
      for (let k = 1; k <= 3; k += 1) {
        const reach = half + k * Math.round(width * 0.45);
        const rise = Math.round(width * 0.9) - k * 2;
        line(g, k % 2 ? mid : light, p.x + side * (half - 1), base - rise, p.x + side * reach, base - 1);
      }
    }
  }
  const cx = p.x + sway;
  crownBlobs(g, cx, top, w, h, pal.canopy, p.seed);
  p.crown = { cx, top, half: w >> 1, bottom: crownBottom };
  if (total >= 20) {
    const count = Math.round(w / 6);
    for (let i = 0; i < count; i += 1) {
      const x = Math.round(cx - w / 2 + 3 + ((i + 0.5) / count) * (w - 6));
      if (Math.abs(x - p.x) <= half + 1) continue;
      const length = Math.round((base - crownBottom) * (0.35 + hash(i, p.seed, 6) * 0.65));
      rect(g, mid, x, crownBottom - 1, 1, length);
    }
  }
}

// A tree fern, a living fossil: a slender dark trunk under a crown of long fronds arching out and
// down, with a fiddlehead uncurling at the top.
function treefern(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(3, Math.round((12 + (p.seed % 7)) * p.scale * s));
  const sway = height > 8 ? wind(g.time, p.x) : 0;
  // A furry trunk two wide, shaded on one side and scarred where old fronds fell.
  rect(g, pal.trunk[1], p.x, base - height, 2, height);
  rect(g, pal.trunk[2], p.x + 1, base - height, 1, height);
  for (let y = base - height + 2; y < base - 1; y += 3) rect(g, pal.trunk[0], p.x, y, 1, 1);
  const x = p.x + sway;
  const y = base - height;
  const length = Math.max(2, Math.round(height * 0.62));
  // Fronds two wide, the lit green over a darker midrib, arching out and down.
  for (const [dx, dy, droop] of [[-1, -0.6, 0.9], [1, -0.6, 0.9], [-1, -0.1, 1.1], [1, -0.1, 1.1], [-0.5, -1, 0.6], [0.5, -1, 0.6]]) {
    stroke(g, x, y, dx, dy, length, droop, 2, [pal.fern[1], pal.fern[0]]);
  }
  // New fronds unrolling at the crown.
  if (s >= 0.8) {
    rect(g, pal.fern[1], x, y - 3, 2, 2);
    rect(g, pal.fern[0], x + 1, y - 3, 1, 1);
  }
}

// A cycad: a squat scaly trunk under a stiff rosette of comb-like fronds, unchanged since the
// dinosaurs grazed it.
function cycad(g, p, s, base) {
  const { pal } = g;
  const [green, dark, bark] = pal.cycad;
  const height = Math.max(1, Math.round((3 + (p.seed % 3)) * p.scale * s));
  rect(g, bark, p.x - 1, base - height, 3, height);
  for (let y = base - height + 1; y < base; y += 2) rect(g, dark, p.x - 1, y, 3, 1);
  const length = Math.max(2, Math.round(7 * p.scale * s));
  for (const [dx, dy] of [[-1, -0.35], [1, -0.35], [-0.7, -0.8], [0.7, -0.8], [0, -1]]) {
    for (let i = 1; i <= length; i += 1) {
      const fx = Math.round(p.x + dx * i);
      const fy = Math.round(base - height + dy * i + (i * i) / (length * 3));
      rect(g, green, fx, fy, 1, 1);
      if (i > 1 && i % 2 === 0) rect(g, dark, fx, fy - 1, 1, 1);
    }
  }
}

function bamboo(g, p, s, base) {
  const { pal } = g;
  const sway = wind(g.time, p.x);
  const culms = 3 + (p.seed % 3);
  const offsets = [-3, 0, 3, -1, 2];
  for (let i = 0; i < culms; i += 1) {
    const height = Math.max(3, Math.round((24 + hash(i, p.seed, 9) * 20) * p.scale * s));
    const width = height > 16 ? 2 : 1;
    const x0 = p.x + offsets[i];
    let tipX = x0;
    for (let r = 0; r < height; r += 1) {
      const bend = Math.round(sway * Math.pow(r / height, 2) * 2);
      const x = x0 + bend;
      const y = base - 1 - r;
      if (r % 6 === 5) rect(g, pal.bamboo[0], x, y, width, 1);
      else if (width === 2) {
        rect(g, pal.bamboo[1], x, y, 1, 1);
        rect(g, pal.bamboo[2], x + 1, y, 1, 1);
      } else rect(g, pal.bamboo[2], x, y, 1, 1);
      tipX = x;
    }
    for (let k = 0; k < 3 && height > 10; k += 1) {
      const ny = base - 1 - (height - 1 - k * 6);
      const leaf = pal.leaf[1 + (k % 2)];
      rect(g, leaf, tipX - 2, ny + 1, 1, 1);
      rect(g, leaf, tipX - 1, ny, 1, 1);
      rect(g, leaf, tipX + width, ny, 1, 1);
      rect(g, leaf, tipX + width + 1, ny + 1, 1, 1);
    }
  }
}

// A wild banana: a thick green stem under broad paddle leaves, the old ones drooping, a young one
// rolled upright. A grown one hangs its purple flower bud below the leaves.
function banana(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(3, Math.round((14 + (p.seed % 6)) * p.scale * s));
  const sway = wind(g.time, p.x);
  const x = p.x + (height > 6 ? sway : 0);
  const w = height >= 10 ? 2 : 1;
  rect(g, pal.leaf[2], p.x, base - height, w, height);
  if (w > 1) rect(g, pal.leaf[3], p.x + 1, base - height, 1, height); // the shaded side
  const length = Math.round(height * 0.7) + 2;
  const wide = height >= 12 ? 3 : 2;
  for (const [dx, dy, droop] of [[-1, -0.9, 0.3], [1, -0.9, 0.3], [-1, -0.2, 0.9], [1, -0.2, 0.9], [-1, -0.5, 0.6]]) {
    stroke(g, x, base - height, dx, dy, length, droop, wide, [pal.leaf[2], pal.leaf[0]]);
  }
  stroke(g, x, base - height, 0, -1, Math.max(2, length >> 1), 0, 1, [pal.leaf[1], pal.leaf[0]]);
  if (s >= 1 && p.seed % 3 === 0) {
    line(g, pal.leaf[3], x + 1, base - height + 1, x + 3, base - height + 4);
    rect(g, pal.bud[0], x + 3, base - height + 4, 2, 3);
    rect(g, pal.bud[1], x + 3, base - height + 4, 1, 1);
  }
}

function fern(g, p, s, base) {
  const { pal } = g;
  const length = Math.max(2, Math.round((4 + (p.seed % 4)) * p.scale * s) + 1);
  for (const [dx, dy, droop] of [
    [-1, -0.3, 0.8],
    [-0.8, -0.7, 0.6],
    [-0.4, -1, 0.5],
    [0, -1, 0.25],
    [0.4, -1, 0.5],
    [0.8, -0.7, 0.6],
    [1, -0.3, 0.8],
  ]) {
    stroke(g, p.x, base - 1, dx, dy, length, droop, 1, [pal.fern[2], pal.fern[0]]);
  }
}

function bush(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round((6 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 2.4);
  const box = { cx: p.x, top: base - h, w, h };
  blob(g, p.x, base - h, w, h, foliage(box, pal.leaf, p.seed));
}

// Rafflesia, seen as in the photographs: five bumpy, spotted lobes round a tan ring, with a dark
// hole and a spiked disc inside it. It lies flat on the forest floor.
function rafflesia(g, p, s, base) {
  const { pal } = g;
  const [petal, dot, shadow, rim, rimLight, hole, disc, spike] = pal.raff;
  const w = Math.max(5, Math.round(18 * s * p.scale));
  const h = Math.max(3, Math.round(w * 0.4));
  if (s < 0.45) {
    blob(g, p.x, base - 3, 5, 3, () => shadow);
    blob(g, p.x, base - 4, 3, 2, () => petal);
    return;
  }
  const lobe = (cx, top, lw, lh) =>
    blob(g, cx, top, lw, lh, (x, y) => {
      const n = hash(x, y, p.seed);
      if (n > 0.8) return dot;
      return n + ((y - top) / lh) * 0.5 > 0.95 ? shadow : petal;
    });
  const top = base - h;
  const lw = Math.round(w * 0.36);
  lobe(p.x - Math.round(w * 0.3), top, lw, Math.round(h * 0.62));
  lobe(p.x, top, lw, Math.round(h * 0.62));
  lobe(p.x + Math.round(w * 0.3), top, lw, Math.round(h * 0.62));
  lobe(p.x - Math.round(w * 0.4), top + Math.round(h * 0.3), Math.round(w * 0.3), Math.round(h * 0.6));
  lobe(p.x + Math.round(w * 0.4), top + Math.round(h * 0.3), Math.round(w * 0.3), Math.round(h * 0.6));
  const ringTop = top + Math.round(h * 0.04);
  const ringH = Math.max(4, Math.round(h * 0.8));
  const ringW = Math.round(w * 0.56);
  blob(g, p.x, ringTop, ringW, ringH, (x, y) => (y < ringTop + ringH * 0.3 ? rimLight : rim));
  blob(g, p.x, ringTop + 1, Math.round(ringW * 0.72), Math.max(2, ringH - 2), () => hole);
  blob(g, p.x, ringTop + 2, Math.round(ringW * 0.5), Math.max(1, ringH - 4), (x) => ((x - p.x) % 2 === 0 ? spike : disc));
  lobe(p.x, base - Math.round(h * 0.34), Math.round(w * 0.4), Math.round(h * 0.34));
}

// The mushrooms of the field guide, one painter each. The glowing ones pulse softly.
const FUNGI = ["russula", "russula", "bolete", "bolete", "cup", "coral", "stinkhorn", "bracket", "glow", "glow"];

function cap(g, colours, x, y, w) {
  rect(g, colours[0], x - (w >> 1) + 1, y, w - 2, 1);
  rect(g, colours[0], x - (w >> 1), y + 1, w, 1);
  rect(g, colours[1], x - (w >> 1), y + 2, w, 1);
}

const FUNGUS = {
  russula(g, p, s, base) {
    const { pal } = g;
    const w = Math.max(3, Math.round((5 + (p.seed % 3)) * p.scale * s) | 1);
    const stem = Math.max(1, Math.round(3 * p.scale * s));
    rect(g, pal.russula[2], p.x, base - stem, 1 + (w > 5 ? 1 : 0), stem);
    cap(g, pal.russula, p.x, base - stem - 2, w);
  },

  bolete(g, p, s, base) {
    const { pal } = g;
    const w = Math.max(3, Math.round((7 + (p.seed % 3)) * p.scale * s) | 1);
    const stem = Math.max(1, Math.round(3 * p.scale * s));
    rect(g, pal.bolete[2], p.x - (w > 5 ? 1 : 0), base - stem, w > 5 ? 3 : 2, stem);
    cap(g, pal.bolete, p.x, base - stem - 2, w);
  },

  cup(g, p, s, base) {
    const { pal } = g;
    [[-3, 4], [0, 6], [3, 3]].forEach(([dx, tall], i) => {
      const h = Math.max(2, Math.round(tall * s));
      rect(g, pal.stink[2], p.x + dx, base - h, 1, h);
      rect(g, pal.cup[0], p.x + dx - 1, base - h - 1, 3, 1);
      rect(g, pal.cup[1], p.x + dx - 1 + (i % 2), base - h, 2, 1);
    });
  },

  coral(g, p, s, base) {
    const { pal } = g;
    const length = Math.max(2, Math.round(5 * p.scale * s));
    for (const [dx, dy] of [[-0.7, -1], [-0.3, -1], [0, -1], [0.3, -1], [0.7, -1]]) {
      stroke(g, p.x, base - 1, dx, dy, length, 0, 1, [pal.coral[0], pal.coral[1]]);
    }
  },

  stinkhorn(g, p, s, base) {
    const { pal } = g;
    const h = Math.max(3, Math.round(8 * p.scale * s));
    rect(g, pal.stink[1], p.x, base - h, 1, h);
    rect(g, pal.stink[0], p.x - (h > 5 ? 1 : 0), base - h - 1, h > 5 ? 3 : 2, 2);
    if (h > 5) {
      for (let r = 0; r < 3; r += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if ((dx + r) % 2 === 0) rect(g, pal.stink[1], p.x + dx, base - h + 1 + r, 1, 1);
        }
      }
    }
  },

  bracket(g, p, s, base) {
    const { pal } = g;
    rect(g, pal.trunk[1], p.x - 4, base - 3, 9, 3);
    rect(g, pal.trunk[0], p.x - 4, base - 3, 9, 1);
    if (s < 0.5) return;
    rect(g, pal.bracket[0], p.x - 3, base - 4, 6, 1);
    rect(g, pal.bracket[1], p.x - 2, base - 5, 4, 1);
    rect(g, pal.bracket[2], p.x - 1, base - 6, 2, 1);
  },

  glow(g, p, s, base) {
    const { pal } = g;
    const pulse = 0.55 + 0.45 * Math.sin(g.time * 1.8 + p.seed);
    g.ctx.globalAlpha = 0.16 + pulse * 0.2;
    blob(g, p.x, base - 10, 13, 10, () => pal.glow[1]);
    g.ctx.globalAlpha = 1;
    [[-3, 3], [0, 5], [3, 4]].forEach(([dx, tall]) => {
      const h = Math.max(1, Math.round(tall * s));
      rect(g, pal.glow[1], p.x + dx, base - h, 1, h);
      rect(g, pal.glow[0], p.x + dx - 1, base - h - 1, 3, 1);
      rect(g, pal.glow[2], p.x + dx, base - h - 1, 1, 1);
    });
  },
};

function mushroom(g, p, s, base) {
  FUNGUS[p.species](g, p, s, base);
}

// Limestone karsts: sheer grey towers that rise out of the mist, with forest clinging to their
// ledges and a cap of it on top. Their colours come from the farthest palette, so they read as
// distant.
function karst(g, p, s, base) {
  const { pal } = g;
  const height = Math.max(4, Math.round(KARST_ROWS * p.scale * s));
  const width = Math.round(height * 0.42) + 4;
  const ledges = [0.3, 0.52, 0.7].map((at, i) => Math.round(height * (at + (hash(i, p.seed, 7) - 0.5) * 0.1)));
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const half = Math.round((width / 2) * (1 - Math.pow(f, 5.5)) + (hash(r >> 1, p.seed, 1) - 0.5) * 2.4);
    if (half < 1) break;
    const y = base - 1 - r;
    const ledge = ledges.some((l) => r >= l && r < l + 2);
    row(g, y, p.x - half, p.x + half, (x) => {
      if (f > 0.76 && hash(x, r, p.seed + 1) < ((f - 0.76) / 0.24) * 0.85 + 0.35) return pal.canopy[1 + ((x + r) % 2)];
      if (ledge && hash(x, r, p.seed + 3) < 0.7) return pal.canopy[2 + (x % 2)];
      if (hash(x, r, p.seed + 2) > 0.95 - f * 0.08) return pal.canopy[2];
      const u = (x - p.x) / half;
      const streak = hash(x, 0, p.seed) < 0.25 ? 1 : 0;
      return pal.karst[Math.min(2, (u < -0.2 ? 0 : u < 0.4 ? 1 : 2) + streak)];
    });
  }
}

const PAINT = { dipterocarp, fig };

function tree(g, p, s, base) {
  PAINT[p.species](g, p, s, base);
}

// Two kinds of giant over a floor of ferns, tree ferns and cycads, with the bamboo and the bananas
// growing in clumps the way they do, placed apart from each other and away from the middle.
function generate(ctx) {
  const { cols } = ctx;
  const plants = [];
  const middle = (x) => Math.abs(x - cols / 2) > Math.min(70, cols / 2 - 24);
  const spots = placeLandmarks(ctx, [
    { key: "bamboo", half: 9, away: CLEARING + 14 },
    { key: "banana", half: 9, away: CLEARING + 4 },
    { key: "bamboo2", half: 8, away: CLEARING + 14 },
    { key: "banana2", half: 8, away: CLEARING + 4 },
  ]);
  const wide = cols >= 200;
  scatter(plants, ctx, { kind: "karst", count: Math.round(cols / 40), born: [1, 3], scale: [0.75, 1.2], layer: -1, keep: middle });
  scatter(plants, ctx, { kind: "tree", count: Math.round(cols / 16), born: [1, 4], scale: [0.5, 0.8], layer: 0, species: TREES });
  scatter(plants, ctx, { kind: "treefern", count: Math.round(cols / 30), born: [1, 3], scale: [0.8, 1.1], layer: 0 });
  scatter(plants, ctx, { kind: "fern", count: Math.round(cols / 10), born: [0, 3], scale: [0.8, 1.2], layer: 0 });
  scatter(plants, ctx, { kind: "tree", count: Math.round(cols / 30), born: [1, 4], scale: [0.85, 1.3], depth: [3, 12], species: TREES });
  grove(plants, ctx, { kind: "bamboo", x: spots.bamboo, count: 4, gap: 4, born: [1, 3], scale: [0.9, 1.25], depth: [3, 6] });
  grove(plants, ctx, { kind: "banana", x: spots.banana, count: 4, gap: 5, born: [1, 3], scale: [0.85, 1.15], depth: [4, 9] });
  if (wide) grove(plants, ctx, { kind: "bamboo", x: spots.bamboo2, count: 3, gap: 4, born: [2, 4], scale: [0.8, 1.1], depth: [2, 5] });
  if (wide) grove(plants, ctx, { kind: "banana", x: spots.banana2, count: 3, gap: 5, born: [2, 4], scale: [0.75, 1], depth: [5, 10] });
  scatter(plants, ctx, { kind: "treefern", count: Math.round(cols / 40), born: [2, 4], scale: [0.9, 1.3], depth: [3, 12] });
  scatter(plants, ctx, { kind: "cycad", count: Math.round(cols / 45), born: [1, 4], scale: [0.9, 1.3], depth: [6, 14] });
  scatter(plants, ctx, { kind: "bush", count: Math.round(cols / 26), born: [2, 5], scale: [0.8, 1.2], depth: [2, 13] });
  scatter(plants, ctx, { kind: "fern", count: Math.round(cols / 6), born: [0, 3], scale: [0.8, 1.3], depth: [0, 15] });
  scatter(plants, ctx, { kind: "mushroom", count: Math.round(cols / 24), born: [2, 6], scale: [1.3, 1.8], depth: [2, 14], species: FUNGI });
  scatter(plants, ctx, { kind: "rafflesia", count: Math.max(1, Math.round(cols / 110)), born: [3, 6], scale: [0.9, 1.3], depth: [5, 14], max: 2 });
  const tall = ["tree", "bamboo", "banana", "bush", "treefern"];
  for (const p of plants) {
    if (tall.includes(p.kind)) p.scale *= clearing(p.x, cols);
  }
  sortPlants(plants);
  return plants;
}

// Moss thickens along the top edge as the forest grows, over a floor of damp earth and litter.
function soil(pal, x, y, depth, turf) {
  if (y === 0 && hash(x, 0, 5) < turf) return pal.leaf[2];
  if (y === 1 && hash(x, 1, 5) < turf * 0.7) return pal.leaf[3];
  const n = hash(x, y, 11);
  if (y < 5 && hash(x, y, 21) < 0.04) return pal.litter[hash(x, y, 22) < 0.65 ? 0 : 1];
  if (n < 0.12 + depth * 0.25) return pal.soil[2];
  if (n > 0.92 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// Creatures. Each one is drawn in its own coordinates, facing right, and mirrored by `dir`.

// A great hornbill in flight, the biggest of the small flyers: a white tail crossed by a black band,
// a white bar on its wing, a huge yellow bill under its casque, and a slow, deep beat.
function hornbillAt(g, b, time) {
  flyerAt(g, b, time, "hornbill");
}

// The hornbill pair, the second a wingspan behind the first.
function pairAt(g, bird, time) {
  for (const m of bird.members) {
    hornbillAt(g, { x: bird.x - bird.dir * m.back, y: bird.y + m.up, dir: bird.dir, phase: m.phase }, time);
  }
}

// The crested serpent eagle circles high over the canopy and banks at each end of its circle. It is
// a day bird.
function serpentAt(g, e, f) {
  const t = f.time * 0.22 + e.phase;
  const x = e.cx + Math.cos(t) * e.r;
  const y = e.y + Math.sin(t * 2) * 3;
  const bank = Math.abs(Math.sin(t)) < 0.3;
  raptorAt(g, { kind: "serpent", x, y, dir: Math.sin(t) > 0 ? -1 : 1 }, { bank });
}

// The gibbon brachiates under the canopy of the near broadleaf trees. One hand holds a branch on a
// crown's underside while its body swings beneath it like a pendulum, from behind the hand to ahead
// of it. Then the free hand takes the next hold, one reach further on. Where the canopy breaks, it
// leaps to the next crown if one is close, or turns back. It needs grown crowns, which the trees
// record as they are painted, so it arrives once one is there.
const GIBBON_ARM = 4; // hand to shoulder, in art pixels
const GIBBON_BODY = 4; // shoulder to hip
const GIBBON_SWING = 0.9; // the widest angle of a swing from the vertical, in radians
const GIBBON_REACH = 9; // how far ahead the next hold is, so each swing ends under it
const GIBBON_SWING_SECONDS = 0.8;
const GIBBON_LEAP = 18; // the widest gap in the canopy it will leap
const GIBBON_LEAP_SECONDS = 0.6;
const GIBBON_CLEARANCE = 16; // how high a crown's underside must be, so the gibbon hangs clear of the ground

// The crowns a gibbon can hang from in one layer: broadleaf trees grown tall and wide enough to swing
// under.
function gibbonCrowns(f, layer) {
  return f.plants.filter(
    (p) =>
      p.kind === "tree" &&
      p.layer === layer &&
      p.crown &&
      p.crown.half >= 8 &&
      p.crown.bottom <= f.groundY - GIBBON_CLEARANCE,
  );
}

// Where a hand can hold at x in a layer: just inside the lowest crown underside above it, which
// curves up toward the crown's edge. Null where no crown reaches, or at the page's edges.
function gibbonHold(f, x, layer) {
  if (x < 4 || x > f.cols - 4) return null;
  let best = null;
  for (const { crown } of gibbonCrowns(f, layer)) {
    const t = (x - crown.cx) / crown.half;
    if (Math.abs(t) > 0.85) continue;
    const y = crown.bottom - 1 - Math.round(t * t * (crown.bottom - crown.top) * 0.4);
    if (best === null || y > best) best = y;
  }
  return best;
}

function moveGibbon(f, b, dt) {
  if (!b.active) {
    // It arrives in the widest crown once a tree has grown one high enough, in the near trees if
    // they have one and otherwise in the middle row, and it stays in that row.
    for (const layer of [1, 0]) {
      const crowns = gibbonCrowns(f, layer).map((p) => p.crown);
      if (!crowns.length) continue;
      const crown = crowns.reduce((widest, c) => (c.half > widest.half ? c : widest));
      // A crown at the page's edge is held at the nearest point inside the page.
      const x = clamp(crown.cx, 8, f.cols - 8);
      const y = gibbonHold(f, x, layer);
      if (y === null) continue;
      const dir = f.rand() < 0.5 ? 1 : -1;
      Object.assign(b, { active: true, layer, hx: x, hy: y, dir, t: 0, leap: null });
      return;
    }
    return;
  }
  if (b.leap) {
    b.t += dt / GIBBON_LEAP_SECONDS;
    if (b.t >= 1) {
      Object.assign(b, { hx: b.leap.x, hy: b.leap.y, t: 0, leap: null });
    }
    return;
  }
  b.t += dt / GIBBON_SWING_SECONDS;
  if (b.t < 1) return;
  b.t = 0;
  const next = b.hx + b.dir * GIBBON_REACH;
  const y = gibbonHold(f, next, b.layer);
  if (y !== null) {
    b.hx = next;
    b.hy = y;
    return;
  }
  for (let step = GIBBON_REACH + 1; step <= GIBBON_LEAP; step += 1) {
    const x = b.hx + b.dir * step;
    const landing = gibbonHold(f, x, b.layer);
    if (landing !== null) {
      b.leap = { fromX: b.hx, fromY: b.hy, x, y: landing };
      return;
    }
  }
  // Nothing within a leap: it swings back the way it came, from the same hold, which may have moved
  // as the crown grew. A hold that no longer exists, as after a resize, lets it arrive again.
  const here = gibbonHold(f, b.hx, b.layer);
  if (here === null) b.active = false;
  else b.hy = here;
  b.dir = -b.dir;
}

// A white-handed gibbon: buff fur, a small dark face in a white ring, white hands. Its limbs are
// drawn as lines from the holding hand, so the body swings at any angle. Its palette is gibbon:
// [fur, face, white].
function gibbonAt(g, b, pal) {
  const [fur, face, white] = pal.gibbon;
  let hx = b.hx;
  let hy = b.hy;
  let angle = -GIBBON_SWING * Math.cos(Math.PI * b.t);
  if (b.leap) {
    hx = b.leap.fromX + (b.leap.x - b.leap.fromX) * b.t;
    hy = b.leap.fromY + (b.leap.y - b.leap.fromY) * b.t - Math.sin(Math.PI * b.t) * 5;
    angle = -GIBBON_SWING * 0.5; // stretched toward the landing, body trailing
  }
  // Down the body from the hand: a positive angle puts the body ahead of the hand.
  const ux = Math.sin(angle) * b.dir;
  const uy = Math.cos(angle);
  const sx = hx + ux * GIBBON_ARM;
  const sy = hy + uy * GIBBON_ARM;
  const bx = sx + ux * GIBBON_BODY;
  const by = sy + uy * GIBBON_BODY;
  line(g, fur, hx, hy, sx, sy);
  line(g, fur, sx, sy, bx, by);
  line(g, fur, sx + 1, sy, bx + 1, by);
  // Legs tucked under the hips.
  rect(g, fur, Math.round(bx) - 1, Math.round(by) + 1, 1, 1);
  rect(g, fur, Math.round(bx) + 2, Math.round(by) + 1, 1, 1);
  // The free arm trails while the body is behind, and reaches for the next hold as it swings ahead.
  const reaching = angle > 0.25 || b.leap;
  const fx = reaching ? sx + b.dir * 4 : sx - b.dir * 2;
  const fy = reaching ? sy - 3 : sy + 3;
  line(g, fur, sx, sy, fx, fy);
  rect(g, white, Math.round(fx), Math.round(fy), 1, 1);
  rect(g, white, Math.round(hx), Math.round(hy), 1, 1);
  // The head leans the way the body swings, beside the shoulder and clear of the holding arm.
  const side = Math.abs(ux) < 0.2 ? b.dir : Math.sign(ux);
  const headX = Math.round(sx) + side * 2 - 1;
  const headY = Math.round(sy) - 2;
  rect(g, white, headX, headY, 3, 3);
  rect(g, face, headX + 1, headY + 1, 1, 1);
}

// A long-tailed macaque, the primates' build: a round head with a pale face and dark eye, a body that
// hunches to walk with its tail up, and sits upright and hunched. B fur, S its darker shade, F face, D
// dark. Its palette is monkey: [body, dark, face].
const MACAQUE = {
  walk: ["........BBB.", "D.......BFDF", "DDBBBBBBBFF.", ".DBBBBBBBB..", "..BSSSSSB..."],
  sit: ["..BBB..", "..BFDF.", "..BFF..", ".BBBB..", "BBBBBB.", "BBSSBB.", "D.BBBB.", "DDBB.BB"],
};

function monkeyAt(g, m, time) {
  const [body, dark, face] = g.pal.monkey;
  const colours = { B: body, S: dark, F: face, D: dark };
  const x = Math.round(m.x);
  const y = g.groundY + 5;
  if (m.state === "walk") {
    const step = Math.floor(m.phase) % 2;
    part(g, dark, x, y, m.dir, step ? 3 : 4, -2, 1, 2);
    part(g, dark, x, y, m.dir, step ? 7 : 6, -2, 1, 2);
    sprite(g, MACAQUE.walk, colours, x, y - 2, m.dir, 0, MACAQUE.walk.length);
    return;
  }
  sprite(g, MACAQUE.sit, colours, x, y, m.dir, 0, MACAQUE.sit.length);
}

// A dusky langur sitting on a branch under a crown: grey, with the white rings round its eyes and
// mouth that give it its other name, the spectacled langur, and a long tail hanging down that sways.
// Now and then it reaches up for leaves. Its palette is langur: [fur, face, white, belly].
function langurAt(g, l, time) {
  const [fur, face, white, belly] = g.pal.langur;
  const x = Math.round(l.x);
  const y = l.y;
  const px = (colour, dx, dy, w, h) => part(g, colour, x, y, l.dir, dx, dy, w, h);
  rect(g, g.pal.trunk[1], x - 6, y, 13, 1);
  const sway = Math.round(Math.sin(time * 1.3 + l.phase) * 1.5);
  px(fur, 1, 1, 1, 4);
  px(fur, 1 + sway, 5, 1, 4);
  px(fur, -1, -5, 4, 5);
  px(belly, 0, -4, 2, 3);
  px(fur, -1, -9, 4, 4);
  px(face, 0, -8, 3, 2);
  px(white, 0, -8, 1, 1);
  px(white, 2, -8, 1, 1);
  px(white, 1, -6, 1, 1);
  if (doing(l, "reach", time) >= 0) {
    px(fur, 3, -12, 1, 7);
    px(g.pal.leaf[1], 3, -13, 2, 1);
  } else {
    px(fur, 3, -4, 1, 3);
  }
}

// A small-clawed otter running in a family line, its back arching as it bounds. The one at the
// front now and then stops and stands up to look round. Its palette is otter: [brown, dark, pale].
// An Asian small-clawed otter, the swimmers' long build: a body tapering to the tail, a small head with
// a dark nose, a pale throat, dark paws. It arches its back as it runs and sits up tall on lookout.
// B brown, P pale, D dark, e eye.
const OTTER = {
  walk: ["........BBB..", "...BBBBBBBBeB", "BBBBBBBBBBPPD", "...BBBBBBBP.."],
  arch: ["....BBBB.BBB.", "...BBBBBBBBeB", "BBBBBBBBBBPPD", "....BBBBBBP.."],
  lookout: ["BBe", "BBB", "BPP", "BPP", "BBP", "BBB", "BBB", ".BB", "BBB"],
};

// Its palette is otter: [brown, dark, pale].
function otterAt(g, o) {
  const [brown, dark, pale] = g.pal.otter;
  const colours = { B: brown, D: dark, P: pale, e: dark };
  const x = Math.round(o.x);
  const y = g.groundY + 6;
  if (o.state === "sit" && o.lookout) {
    sprite(g, OTTER.lookout, colours, x, y, o.dir, 0, OTTER.lookout.length);
    return;
  }
  const arch = o.state === "walk" && Math.floor(o.phase) % 2 === 0;
  // The grid's first column, the tip of the tail, sits four pixels behind the otter's x.
  part(g, dark, x, y, o.dir, arch ? 1 : 0, -1, 1, 1);
  part(g, dark, x, y, o.dir, arch ? 5 : 3, -1, 1, 1);
  const grid = arch ? OTTER.arch : OTTER.walk;
  sprite(g, grid, colours, x, y - 1, o.dir, 4, grid.length);
}

// Fireflies come out at night. Most drift low over the floor, each blinking on its own; the rest
// gather in one tree and flash together, a ripple running through them from the middle out, as the
// river fireflies of southern Thailand do.
function fireflyAt(g, fly, time, tree) {
  let pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + fly.phase);
  let x = fly.homeX + Math.sin(time * fly.speed + fly.phase) * fly.reach;
  let y = fly.homeY + Math.sin(time * fly.speed * 1.4 + fly.phase * 2) * 7;
  if (tree) {
    x = tree.cx + fly.u * tree.half * 0.85 + Math.sin(time * 0.3 + fly.phase);
    y = tree.top + 2 + fly.v * (tree.bottom - tree.top - 3);
    const t = (time - Math.abs(fly.u) * 0.4) % 1.4;
    pulse = t < 0.25 ? 1 : t < 0.4 ? 1 - (t - 0.25) / 0.15 : 0;
  }
  if (pulse < 0.2) return;
  const [core, glow] = g.pal.fire;
  x = Math.round(x);
  y = Math.round(y);
  g.ctx.globalAlpha = pulse * 0.4;
  rect(g, glow, x - 1, y, 3, 1);
  rect(g, glow, x, y - 1, 1, 3);
  g.ctx.globalAlpha = pulse;
  rect(g, core, x, y, 1, 1);
  g.ctx.globalAlpha = 1;
}

// The widest grown crown of the near trees away from the middle, for the langur and the fireflies.
function bigCrown(f) {
  const crowns = gibbonCrowns(f, 1).filter((p) => Math.abs(p.crown.cx - f.cols / 2) > CLEARING * 0.6);
  if (!crowns.length) return null;
  return crowns.reduce((widest, p) => (p.crown.half > widest.crown.half ? p : widest));
}

const extras = {
  init(f) {
    return {
      flies: Array.from({ length: FIREFLIES }, (_, i) => ({
        homeX: ((i + f.rand()) / FIREFLIES) * f.cols,
        homeY: f.groundY - 6 - f.rand() * 30,
        phase: f.rand() * 6.28,
        speed: 0.3 + f.rand() * 0.4,
        reach: 6 + f.rand() * 10,
        u: f.rand() * 2 - 1,
        v: f.rand(),
      })),
      mists: [
        ...Array.from({ length: MISTS - 3 }, () => mistBand(f, 16, 40)),
        ...Array.from({ length: 3 }, () => mistBand(f, 2, 4)),
      ],
      hornbills: { next: 4, bird: null },
      kingfisher: { next: 2, bird: null },
      eagle: { cx: f.cols * (0.25 + f.rand() * 0.5), r: Math.min(60, f.cols * 0.3), y: 14 + f.rand() * 10, phase: f.rand() * 6 },
      gibbon: { active: false, layer: 1, hx: 0, hy: 0, dir: 1, t: 0, leap: null },
      langur: null,
      monkey: walker(f),
      otters: [walker(f), walker(f), walker(f)],
      elephants: [{ ...walker(f), kind: "asian" }, { ...walker(f, 0.55), kind: "asian" }],
    };
  },

  // Each stage brings something new: kingfishers, the hornbill pair, the gibbon, the
  // macaque, the langur, the otters, the elephants.
  onGrow(f) {
    const { monkey, otters, elephants } = f.extra;
    if (f.stage >= 4) enter(f, monkey);
    if (f.stage >= 7) {
      enter(f, otters[0]);
      enterBehind(f, otters[1], otters[0], 10);
      if (!narrow(f)) enterBehind(f, otters[2], otters[1], 10);
    }
    if (f.stage >= 6) enter(f, elephants[0]);
    if (f.stage >= 8) enterBehind(f, elephants[1], elephants[0], 17);
  },

  busy: (f) => f.stage >= 2,

  update(f, dt) {
    const x = f.extra;
    if (f.stage >= 3 && !isNight(f)) {
      flyBy(f, x.hornbills, dt, {
        every: [8, 8],
        speed: 18,
        margin: 34,
        spawn: () => ({ y: 18 + f.rand() * Math.max(10, f.groundY - 110), members: flock(f, 2, 16, 2) }),
      });
    }
    if (f.stage >= 2 && !isNight(f)) flyBy(f, x.kingfisher, dt, { every: [4, 5], speed: 62, spawn: () => ({ y: f.groundY - 14 - f.rand() * 34 }) });
    if (f.stage >= 5) moveGibbon(f, x.gibbon, dt);
    if (f.stage >= 6 && !x.langur) {
      const tree = bigCrown(f);
      if (tree) {
        const side = tree.crown.cx < f.cols / 2 ? 1 : -1;
        x.langur = percher(f, Math.round(tree.crown.cx + side * tree.crown.half * 0.4), tree.crown.bottom + 1, -side, {
          reach: { every: [4, 7], lasts: 1.2 },
        });
      }
    }
    if (x.langur) fidget(f, x.langur);
    wander(f, x.monkey, dt, { speed: 11 });
    const [lead, ...rest] = x.otters;
    wander(f, lead, dt, { speed: 9, stride: 3.5, sit: [2, 4], walk: [3, 6] });
    lead.lookout = true;
    let ahead = lead;
    for (const o of rest) {
      follow(o, ahead, dt, 10);
      o.state = lead.state;
      o.phase = lead.phase + 0.7;
      ahead = o;
    }
    const [mother, calf] = x.elephants;
    stroll(f, mother, dt, 7);
    follow(calf, mother, dt, 17);
    calf.state = mother.state;
    calf.phase = mother.phase + 1;
  },

  draw(g, f) {
    const x = f.extra;
    const night = isNight(f);
    if (f.stage >= 2) for (const m of x.mists) mistAt(g, m, f.time, f.cols);
    if (f.stage >= 4 && !night) serpentAt(g, x.eagle, f);
    for (const e of x.elephants) if (e.active) elephantAt(g, e, f.time);
    for (const o of x.otters) if (o.active) otterAt(g, o);
    if (x.monkey.active) monkeyAt(g, x.monkey, f.time);
    if (x.langur) langurAt(g, x.langur, f.time);
    if (night) {
      const tree = bigCrown(f)?.crown;
      const count = clamp(Math.round(f.stage * 3.3), 0, FIREFLIES);
      for (let i = 0; i < count; i += 1) fireflyAt(g, x.flies[i], f.time, i % 2 && tree ? tree : null);
    }
    // A gibbon in the middle row takes that row's faded colours, so it sits at the depth of its tree.
    if (x.gibbon.active) gibbonAt(g, x.gibbon, x.gibbon.layer === 0 ? f.pal.far : g.pal);
    if (x.hornbills.bird && !night) pairAt(g, x.hornbills.bird, f.time);
    if (x.kingfisher.bird && !night) kingfisherAt(g, x.kingfisher.bird, f.time);
  },
};

export default {
  id: "rainforest",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.38, 0.64], dark: [0.5, 0.75] },
  mature: {
    tree: 3,
    karst: 3,
    bamboo: 2.5,
    banana: 2,
    treefern: 2,
    cycad: 2,
    fern: 1.5,
    bush: 2.5,
    rafflesia: 1,
    mushroom: 1,
  },
  paint: { tree, karst, bamboo, banana, treefern, cycad, fern, bush, rafflesia, mushroom },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      "..ggg.gggg..",
      ".gggggggggg.",
      ".gegssggggg.",
      ".gggspgggggg",
      ".gggsggggggg",
      ".gw.gggggggs",
      "www.gggggggs",
      ".g..gg..gg.s",
      ".gg.gg..gg..",
      "....gg..gg..",
      "....dd..dd..",
    ],
    colours: { g: "#a2abb2", s: "#80898f", d: "#80898f", e: "#2c2c34", p: "#d9a6a0", w: "#efe6d2" },
  },
};
