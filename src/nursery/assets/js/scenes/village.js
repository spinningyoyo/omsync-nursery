// The rural village: Hil, in Qusar, Azerbaijan, the farmstead of the Country Life Vlog. A clearing at
// the edge of the beech, hornbeam and oak forest that climbs the foothills to the snowy Shahdag
// massif. In it stand a two-storey house of stone and whitewash with a wooden veranda under a
// corrugated iron roof; the domed brick bread oven, its fire alive in the mouth and smoke drifting
// from the chimney, the log store beside it and a bench with the copper kettle; an old walnut; an
// apple tree over two bee hives; vegetable beds behind a wattle fence; and a haystack. Each page
// load places them anew (placeLandmarks), as the Hundred Acre Wood places Pooh's house.
//
// The cast is farm cats, a rooster and his hen, and the birds. The cats keep their spots: one loafs on
// the log pile, two sleep under the kettle bench by the oven's warmth, one grooms on the doorstep,
// one sits on the veranda, one dozes along a walnut bough and one sits in the apple's fork, while a
// pair now and then plays (stalk, pounce, swats, a chase) and one wanders. Sparrows sit on the roof
// ridge; a barn swallow, a hooded crow and a golden eagle fly over, and a common buzzard circles. Every
// 30 to 50 s the rooster crows, and a sleeping cat near him startles awake. At night the chickens
// and day birds go in, the windows and the oven glow, and fireflies come out over the meadow.
import {
  catPlayAt,
  felidAt,
  felidPoses,
  groundBirdAt,
  groundBirdStep,
  groundPoses,
  groundSpeed,
  PLAY_SECONDS,
} from "../kit/animals.js";
import { broadleafLayout, broadleafTree, leafClump } from "../kit/broadleaf.js";
import {
  doing,
  enter,
  fidget,
  flyBy,
  isNight,
  narrow,
  percher,
  rest,
  soarer,
  walker,
  wander,
} from "../kit/critters.js";
import { HOUSECAT_COAT_NAMES, HOUSECAT_COATS } from "../kit/felid.js";
import { circlerAt, eagleFlyAt, flyerAt } from "../kit/flyers.js";
import { CROW_SECONDS } from "../kit/groundbird.js";
import { butterflyAt, butterflyPick, fireflyAt } from "../kit/insect.js";
import { peak, ridge } from "../kit/landforms.js";
import {
  CLEARING,
  clamp,
  clearing,
  grove,
  hash,
  makePlant,
  mix,
  placeLandmarks,
  rect,
  rgba,
  scatter,
  smooth,
  sortPlants,
} from "../kit/pixel.js";
import { meadowFlower, meadowFlowerHead } from "../kit/plants.js";
import { footOf, groundOf, movePose, perchedSmall, SPECIES as SMALL, SMALL_MOVES } from "../kit/smallbird.js";

const MATURE = {
  range: 2.5,
  hill: 2.5,
  tree: 3,
  walnut: 3,
  apple: 2.5,
  house: 1,
  oven: 1,
  hives: 1,
  beds: 1,
  hay: 1,
  bush: 2,
  tuft: 1,
  flower: 1.5,
  mushroom: 1,
};
const TREE_ROWS = 56; // a forest tree at scale 1
const PEAK_ROWS = 60; // a peak of the Shahdag massif at scale 1
const WALNUT = { rows: 58, from: 0.3, spread: 0.42, airy: 0.3 };
const APPLE = { rows: 32, from: 0.4, spread: 0.38, airy: 0.3 };
const BUTTERFLIES = 3;
const FIREFLIES = 14;
const CROW_EVERY = [30, 20]; // seconds between the rooster's crows: 30 plus up to 20
const STARTLE = 2.2; // seconds a startled cat stays up before it settles again
const PLAY_REST = [14, 16]; // seconds the pair rests between bouts of play: 14 plus up to 16

const px = (g, c, x, y) => rect(g, c, Math.round(x), Math.round(y), 1, 1);

const LIGHT = {
  ...HOUSECAT_COATS.light,
  night: 0,
  groundShadow: "rgba(70, 80, 40, 0.24)",
  soil: ["#a8c66c", "#8fb35a", "#76994a"],
  line: "rgba(255, 255, 255, 0.3)",
  wet: "#3e5a24",
  water: ["#46aae6", "#8fd3f6", "#ffffff"],
  haze: "#ffffff",
  grass: ["#a8c66c", "#8fb35a", "#76994a", "#5e7f3c"],
  leaf: ["#b4d47a", "#8cb85a", "#68983e", "#4a7a30"],
  flowers: ["#f8f6ee", "#f0d040", "#e8a0c0", "#f8f6ee"],
  centre: "#e8b030",
  body: "#4a3a2a",
  snow: ["#ffffff", "#e4ecf2", "#c4d2de"],
  peak: ["#a9b4c2", "#8d99aa", "#727e90"],
  hills: ["#9ab878", "#7a9c5e", "#5e804a"],
  stone: ["#d8ccb4", "#c4b598", "#a89878", "#8a7a5e"],
  plaster: ["#f4efe4", "#e2dccd"],
  wood: ["#b07a4a", "#8a5a34", "#6a4226", "#4a2c18"],
  roof: ["#c4664a", "#a44e38", "#843c2c", "#642c22"],
  glass: ["#9cc4d8", "#6e9cb8"],
  frame: "#3e7aa8",
  lamp: "#f8dc8a",
  brick: ["#d07a52", "#b4603e", "#924a30", "#6e3624"],
  mortar: "#e0cdb0",
  fire: ["#fff2a0", "#ffc040", "#f07828", "#c03a1c"],
  soot: "#2e2622",
  smoke: "#8e8a88",
  log: ["#e8c890", "#c49a62", "#7a5a3a", "#54402a"],
  copper: ["#e8a070", "#c07040", "#8a4a28"],
  fence: ["#a8865e", "#7e6244"],
  walnut: ["#a8c870", "#82aa52", "#5e8a40", "#426c32"],
  walnutBark: ["#b8b0a2", "#8e867a"],
  apple: ["#b4d47a", "#8cb85a", "#68983e", "#4a7a30"],
  appleBark: ["#8a6a4d", "#6a4f39"],
  fruit: "#d83a2a",
  hornbeam: ["#94b866", "#74a050", "#56823e", "#3e6430"],
  oak: ["#88a85a", "#6a8e46", "#4e7236", "#38562a"],
  beech: ["#a0c070", "#7ea852", "#5e8a3e", "#446a30"],
  beechBark: ["#9a958c", "#77726a"],
  hornbeamBark: ["#8a857c", "#66625a"],
  oakBark: ["#7a6a58", "#5a4c40"],
  hive: ["#e8dcc0", "#c8b898", "#9a8a6a"],
  hiveRoof: ["#6e8aa0", "#4e6a80"],
  bee: "#3a2a10",
  hay: ["#ecd690", "#d4b866", "#b0944a", "#8a7238"],
  cabbage: ["#c0dca0", "#98c47a", "#6ea05a"],
  beanPole: "#8a6a48",
  earth: ["#8a6a4a", "#6e5238"],
  cap: "#c8402a",
  stem: "#f0ead8",
  glow: ["#e8c860", "#fff4c0"],
  crowRing: "#5a4a3a",
  moa: ["#c9501c", "#23403a", "#e0242b", "#d9a62b"],
  hen: ["#b8743a", "#7a4a26", "#d83a2a", "#d9a62b"],
  sparrow: {
    C: "#8a8680",
    H: "#8a5a36",
    E: "#1a1a1a",
    K: "#3a3430",
    T: "#5a3e28",
    b: "#6a4a30",
    B: "#8a6040",
    l: "#d8d0c2",
    t: "#a07048",
    p: "#f0e8dc",
    d: "#7a5a3c",
  },
  swallow: {
    C: "#22305a",
    H: "#b8482a",
    E: "#141414",
    K: "#141414",
    T: "#1c2648",
    b: "#1c2648",
    B: "#2a3a6a",
    l: "#efe4d0",
    t: "#22305a",
    p: "#22305a",
    d: "#141c38",
  },
  crow: {
    C: "#1e1e22",
    H: "#1e1e22",
    E: "#1e1e22",
    K: "#141416",
    T: "#1e1e22",
    b: "#1e1e22",
    B: "#8e8c8a",
    l: "#a8a6a2",
    t: "#2a2a2e",
    p: "#2a2a2e",
    d: "#141416",
  },
  eagleGolden: ["#4a3426", "#e0a93a", "#4a3426", "#f3eadb", "#7a5a44"],
  hawk: ["#5a3e2a", "#e8dcc4", "#8a5a36", "#5a3e2a", "#1a1410", "#8a6a4a"],
};

const DARK = {
  ...HOUSECAT_COATS.dark,
  night: 1,
  groundShadow: "rgba(0, 0, 0, 0.32)",
  soil: ["#3e5244", "#34483c", "#2a3c32"],
  line: "rgba(255, 255, 255, 0.08)",
  wet: "#141c14",
  water: ["#5cc0f2", "#a7defa", "#ffffff"],
  haze: "#0b0b0b",
  grass: ["#3e5244", "#34483c", "#2a3c32", "#22302a"],
  leaf: ["#4a5e46", "#3c4e3a", "#2e4030", "#243426"],
  flowers: ["#9a9cae", "#8a8456", "#8a6a80", "#9a9cae"],
  centre: "#8a7440",
  body: "#2a2420",
  snow: ["#b8c2d8", "#98a4c0", "#7a86a4"],
  peak: ["#4e566e", "#424a60", "#363e52"],
  hills: ["#3e5240", "#324436", "#28382c"],
  stone: ["#6e6a6c", "#5e5a5e", "#4e4a50", "#3e3a42"],
  plaster: ["#8a8a96", "#767682"],
  wood: ["#5e4a40", "#4a3a34", "#3a2c28", "#2a2020"],
  roof: ["#6e4446", "#5a383c", "#482e32", "#382428"],
  glass: ["#3a4a66", "#2e3c56"],
  frame: "#3a4e70",
  lamp: "#ffd070",
  brick: ["#7e5048", "#6a423c", "#563632", "#422a28"],
  mortar: "#7e7478",
  fire: ["#fff4b0", "#ffc848", "#f88030", "#d04420"],
  soot: "#1a1618",
  smoke: "#8a8a9c",
  log: ["#8e7a66", "#76624e", "#4e4038", "#3a302a"],
  copper: ["#9a6a52", "#7a5040", "#5a3a30"],
  fence: ["#5a4a40", "#463a34"],
  walnut: ["#4a5e48", "#3c4e3c", "#2e4032", "#243428"],
  walnutBark: ["#6a6670", "#56525c"],
  apple: ["#4a5e46", "#3c4e3a", "#2e4030", "#243426"],
  appleBark: ["#4a3e3a", "#3a302e"],
  fruit: "#8a3a36",
  hornbeam: ["#465a44", "#3a4c3a", "#2e3e30", "#243226"],
  oak: ["#42563e", "#364834", "#2a3a2c", "#202e24"],
  beech: ["#4a5e44", "#3c4e38", "#2e402e", "#243424"],
  beechBark: ["#56545c", "#46444c"],
  hornbeamBark: ["#4e4c54", "#3e3c44"],
  oakBark: ["#4a4040", "#3a3234"],
  hive: ["#7e7a7e", "#6a666c", "#56525a"],
  hiveRoof: ["#3e4a5e", "#323c4e"],
  bee: "#1a1a1a",
  hay: ["#8a8066", "#766c56", "#625a48", "#4e483c"],
  cabbage: ["#566a54", "#465a46", "#384a3a"],
  beanPole: "#4a3e38",
  earth: ["#3e3836", "#322e2e"],
  cap: "#7a3a36",
  stem: "#8a8690",
  glow: ["#e8c860", "#fff4c0"],
  crowRing: "#c8c4d0",
  moa: ["#d9622a", "#3f7566", "#ff4a4a", "#e8c04a"],
  hen: ["#a0683a", "#6a4a2e", "#c04a3a", "#c8a04a"],
  sparrow: {
    C: "#5a5860",
    H: "#5a4232",
    E: "#141414",
    K: "#2a2628",
    T: "#3e2e24",
    b: "#4a382c",
    B: "#5e4a3a",
    l: "#8a8690",
    t: "#6a5442",
    p: "#9a96a0",
    d: "#4e3e30",
  },
  swallow: {
    C: "#1c2440",
    H: "#6e3a30",
    E: "#101010",
    K: "#101010",
    T: "#181e36",
    b: "#181e36",
    B: "#222c4c",
    l: "#8a8690",
    t: "#1c2440",
    p: "#1c2440",
    d: "#10162a",
  },
  crow: {
    C: "#16161a",
    H: "#16161a",
    E: "#16161a",
    K: "#101012",
    T: "#16161a",
    b: "#16161a",
    B: "#5e5c62",
    l: "#6e6c72",
    t: "#202024",
    p: "#202024",
    d: "#101012",
  },
  eagleGolden: ["#7a5638", "#f2c25a", "#7a5638", "#f5efe4", "#5a4432"],
  hawk: ["#6e5442", "#b8ae9e", "#8a6a50", "#6e5442", "#1a1414", "#8a7460"],
};

// ---- Plants --------------------------------------------------------------------------------------

// A built thing (the house, the oven, the hives) is all there or not yet there: it appears whole once
// nearly grown, as the Hundred Acre Wood's houses do.
function whole(s, draw) {
  if (s >= 0.8) draw();
}

// The Shahdag massif: the landforms family's peak (kit/landforms.js, Yellowstone's build), sown
// several along the far rows, snow on its upper slopes.
function range(g, p, s, base) {
  peak(g, p, s, base, { rows: PEAK_ROWS, tones: g.pal.peak, snow: g.pal.snow[0] });
}

// The foothills: the landforms family's ridge (the Smokies' build), forested, with a fringe of round
// beech, hornbeam and oak crowns along the crest.
function hill(g, p, s, base) {
  ridge(g, p, s, base, { tones: g.pal.hills, fringe: "crowns" });
}

// A forest tree, the broadleaf family's build: beech (tall, smooth grey bark), hornbeam (grey, a
// narrower crown) or oak (darker bark, wide boughs).
function tree(g, p, s, base) {
  const { pal } = g;
  const kind = p.species;
  broadleafTree(g, p, s, base, {
    rows: TREE_ROWS,
    tones: pal[kind],
    bark: pal[`${kind}Bark`],
    from: kind === "beech" ? 0.38 : 0.32,
    spread: kind === "oak" ? 0.42 : 0.3,
    airy: kind === "oak" ? 0.35 : 0.25,
  });
}

// The old walnut over the yard: pale grey bark and a wide, open crown.
function walnut(g, p, s, base) {
  broadleafTree(g, p, s, base, { ...WALNUT, tones: g.pal.walnut, bark: g.pal.walnutBark });
}

// The apple tree by the hives, its fruit coming as it grows.
function apple(g, p, s, base) {
  const { pal } = g;
  broadleafTree(g, p, s, base, {
    ...APPLE,
    tones: pal.apple,
    bark: pal.appleBark,
    extra: (dx, dy, tone) => (s > 0.8 && tone < 3 && hash(dx, dy, 41) < 0.07 ? pal.fruit : null),
  });
}

// The house: a dressed-stone ground floor with the door and a window; a whitewashed upper floor behind
// an open wooden veranda (the eyvan) on posts; a low hipped roof of rusty corrugated iron. At night
// the windows are lit. x is its middle; it is 45 px wide and 40 rows tall.
function house(g, p, s, base) {
  const { pal } = g;
  const x0 = p.x - 22;
  const x1 = x0 + 44;
  const y = (r) => base - 80 + r; // rows as drawn on an 80-row ground
  whole(s, () => {
    for (let r = 66; r < 80; r += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const course = Math.floor((r - 66) / 2);
        const joint = (r - 66) % 2 === 1 || (x + course * 3) % 6 === 0;
        const k = x > x1 - 3 || r > 76 ? 2 : 1;
        px(g, joint ? pal.stone[3] : hash(x >> 1, course, 5) < 0.3 ? pal.stone[0] : pal.stone[k], x, y(r));
      }
    }
    rect(g, pal.wood[3], x0 + 7, y(71), 6, 9);
    rect(g, pal.wood[1], x0 + 8, y(72), 4, 8);
    rect(g, pal.wood[2], x0 + 10, y(72), 1, 8);
    houseWindow(g, x0 + 26, y(70));
    rect(g, pal.plaster[0], x0 + 1, y(54), x1 - x0 - 1, 11);
    rect(g, pal.plaster[1], x0 + 1, y(54), x1 - x0 - 1, 2);
    houseWindow(g, x0 + 16, y(56));
    houseWindow(g, x0 + 30, y(56));
    rect(g, pal.wood[2], x0 - 1, y(65), x1 - x0 + 3, 1);
    for (let x = x0; x <= x1; x += 11) rect(g, pal.wood[1], x, y(52), 2, 13);
    rect(g, pal.wood[0], x0, y(60), x1 - x0 + 1, 1);
    for (let x = x0 + 2; x < x1; x += 2) if ((x - x0) % 11 > 1) rect(g, pal.wood[2], x, y(61), 1, 3);
    for (let r = 0; r < 12; r += 1) {
      const a = x0 - 4 + r * 2;
      const b = x1 + 4 - r * 2;
      for (let x = a; x <= b; x += 1) {
        const rib = (x - x0) % 2 === 0;
        const k = r === 0 ? 3 : r > 9 ? 0 : rib ? 1 : 2;
        px(g, x < a + 2 && r > 0 ? pal.roof[0] : x > b - 2 && r > 0 ? pal.roof[3] : pal.roof[k], x, y(52 - r));
      }
    }
  });
}

function houseWindow(g, x, y) {
  const { pal } = g;
  rect(g, pal.frame, x, y, 6, 5);
  const lit = pal.night ? pal.lamp : null;
  rect(g, lit ?? pal.glass[0], x + 1, y + 1, 2, 3);
  rect(g, lit ?? pal.glass[1], x + 3, y + 1, 2, 3);
  if (lit) rect(g, rgba(pal.lamp, 0.25), x - 1, y + 5, 8, 2);
}

// Where the house's sparrows, its veranda cat and its doorstep cat stand, for a house at x on base.
const houseSpots = (x, base) => ({
  ridge: [x - 3, x + 5],
  ridgeTop: base - 39,
  veranda: { x: x + 6, y: base - 15 },
  step: { x: x - 5, y: base + 2 },
});

// The oven group, centred on x: the log store (split oak stacked end-on under a plank lean-to), the
// domed brick bread oven on its stone plinth with its brick chimney, the fire alive in its arched
// mouth and smoke drifting east from the flue, and a plank bench with the copper kettle. At night
// the fire glows on the ground in front.
function oven(g, p, s, base) {
  const { pal } = g;
  const t = g.time;
  const y = (r) => base - 80 + r;
  whole(s, () => {
    logStore(g, p.x - 32, y);
    const cx = p.x + 2;
    for (let r = 75; r < 80; r += 1) {
      for (let x = cx - 11; x <= cx + 11; x += 1) {
        px(g, (r - 75) % 2 && (x + r) % 5 === 0 ? pal.stone[3] : pal.stone[r > 77 ? 2 : 1], x, y(r));
      }
    }
    for (let r = 64; r < 75; r += 1) {
      const d = 75 - r;
      const half = Math.round(Math.sqrt(Math.max(0, 110 - (d - 0.5) ** 2)));
      for (let x = cx - half; x <= cx + half; x += 1) {
        const course = Math.floor(d / 2);
        const joint = d % 2 === 0 || (x + course * 2) % 4 === 0;
        const lit = (x - cx) / 10 - d / 11;
        const k = lit < -0.6 ? 0 : lit < 0.1 ? 1 : lit < 0.6 ? 2 : 3;
        px(g, joint ? mix(pal.mortar, pal.brick[k], 0.55) : pal.brick[k], x, y(r));
      }
    }
    for (let r = 54; r < 66; r += 1) {
      for (let x = cx + 4; x <= cx + 7; x += 1) {
        const joint = r % 2 === 0 || (x + (r >> 1)) % 3 === 0;
        px(g, joint ? mix(pal.mortar, pal.brick[2], 0.55) : pal.brick[x === cx + 4 ? 1 : 2], x, y(r));
      }
    }
    rect(g, pal.brick[3], cx + 3, y(54), 6, 1);
    for (let r = 69; r < 75; r += 1) {
      const half = r < 70 ? 1 : r < 71 ? 2 : 3;
      rect(g, pal.soot, cx - half, y(r), half * 2 + 1, 1);
    }
    {
      const tick = Math.floor(t * 8);
      for (let x = cx - 3; x <= cx + 3; x += 1) {
        const flame = Math.round(2 + hash(x, tick, 7) * 3 - Math.abs(x - cx) * 0.6);
        for (let h = 0; h < flame; h += 1) {
          const k = h === 0 ? 3 : h >= flame - 1 ? 0 : hash(x, h + tick, 3) < 0.5 ? 1 : 2;
          px(g, pal.fire[k], x, y(74) - h);
        }
      }
      rect(g, pal.fire[3], cx - 3, y(74), 7, 1);
      if (pal.night) {
        for (let r = 74; r < 84; r += 1) {
          for (let x = cx - 16; x <= cx + 16; x += 1) {
            const d = Math.hypot((x - cx) / 16, (r - 75) / 7);
            if (d < 1 && hash(x, r, 11) < (1 - d) * 0.6) px(g, rgba(pal.fire[1], 0.22 * (1 - d) + 0.06), x, y(r));
          }
        }
      }
      smoke(g, cx + 5.5, y(53), t);
    }
    bench(g, p.x + 16, y);
  });
}

// Smoke from the flue: puffs that rise, widen and drift east on the wind, fading as they go.
function smoke(g, fx, fy, t) {
  const { pal } = g;
  for (let i = 0; i < 7; i += 1) {
    const u = (t / 4 + i / 7) % 1;
    const sy = fy - u * 34;
    const sx = fx + u * u * 22 + Math.sin(u * 7 + i) * 1.4;
    const r = 0.8 + u * 3;
    const a = (pal.night ? 0.55 : 0.9) * (1 - u) ** 0.7;
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx += 1) {
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy += 1) {
        if (dx * dx + dy * dy > r * r) continue;
        px(g, rgba(mix(pal.smoke, "#ffffff", dy < 0 ? 0.12 : 0), a), sx + dx, sy + dy);
      }
    }
  }
}

function logStore(g, x0, y) {
  const { pal } = g;
  const x1 = x0 + 16;
  rect(g, pal.wood[2], x0, y(58), 1, 22);
  rect(g, pal.wood[2], x1, y(60), 1, 20);
  for (let x = x0 - 2; x <= x1 + 2; x += 1) {
    const r = 57 + Math.round(((x - x0 + 2) / (x1 - x0 + 4)) * 3);
    px(g, pal.wood[0], x, y(r));
    px(g, pal.wood[2], x, y(r + 1));
  }
  for (let row = 0; row < 4; row += 1) {
    const r = 77 - row * 3;
    for (let k = 0; k < 5; k += 1) {
      const x = x0 + 1 + k * 3 + (row % 2);
      if (x + 2 > x1) continue;
      rect(g, pal.log[3], x, y(r), 3, 3);
      rect(g, pal.log[hash(k, row, 5) < 0.5 ? 0 : 1], x, y(r), 2, 2);
      px(g, pal.log[2], x + 1, y(r + 1));
    }
  }
}

function bench(g, x0, y) {
  const { pal } = g;
  rect(g, pal.wood[0], x0, y(73), 14, 1);
  rect(g, pal.wood[2], x0, y(74), 14, 1);
  rect(g, pal.wood[2], x0 + 1, y(75), 1, 5);
  rect(g, pal.wood[2], x0 + 12, y(75), 1, 5);
  rect(g, pal.copper[1], x0 + 3, y(69), 4, 4);
  rect(g, pal.copper[0], x0 + 3, y(69), 2, 2);
  rect(g, pal.copper[2], x0 + 6, y(70), 1, 3);
  px(g, pal.copper[1], x0 + 7, y(70));
  px(g, pal.copper[2], x0 + 4, y(68));
}

// Where the oven group's cats lie, for an oven group at x on base: on the log pile, and two under the
// kettle bench.
const ovenSpots = (x, base) => ({ logs: { x: x - 24, y: base - 12 }, bench: [x + 19, x + 27] });

// Two box hives on a plank, bees busy round them by day (Qusar is honey country).
function hives(g, p, s, base) {
  const { pal } = g;
  whole(s, () => {
    for (const x of [p.x - 8, p.x + 1]) {
      rect(g, pal.wood[2], x - 1, base - 2, 9, 2);
      rect(g, pal.hive[1], x, base - 9, 7, 7);
      rect(g, pal.hive[0], x, base - 9, 3, 7);
      rect(g, pal.hive[2], x + 6, base - 9, 1, 7);
      rect(g, pal.hive[2], x, base - 6, 7, 1);
      rect(g, pal.hiveRoof[0], x - 1, base - 11, 9, 1);
      rect(g, pal.hiveRoof[1], x - 1, base - 10, 9, 1);
      rect(g, pal.soot, x + 3, base - 4, 2, 1);
    }
  });
  if (pal.night || s < 0.8) return;
  for (let i = 0; i < 6; i += 1) {
    const a = g.time * (2.2 + i * 0.3) + i * 1.7;
    px(g, pal.bee, p.x + Math.cos(a) * (5 + i * 1.5), base - 10 + Math.sin(a * 1.3) * 4 - (i % 3));
  }
}

// Vegetable beds behind a woven wattle fence: cabbages in a row and beans up hazel poles.
function beds(g, p, s, base) {
  const { pal } = g;
  const x0 = p.x - 15;
  whole(s, () => {
    for (let x = x0 - 3; x <= x0 + 33; x += 1) {
      const stake = (x - x0 + 3) % 9 === 0;
      for (let y = base - 7; y < base; y += 1) {
        if (stake) px(g, pal.fence[1], x, y - 1);
        else if ((y - base + 7 + ((x - x0) >> 1)) % 3 !== 0) px(g, (y - base) % 2 ? pal.fence[1] : pal.fence[0], x, y);
      }
    }
    rect(g, pal.earth[0], x0, base - 3, 30, 3);
    rect(g, pal.earth[1], x0, base - 1, 30, 1);
    for (let x = x0 + 2; x < x0 + 16; x += 4) {
      rect(g, pal.cabbage[2], x - 1, base - 4, 3, 2);
      rect(g, pal.cabbage[1], x - 1, base - 5, 3, 1);
      px(g, pal.cabbage[0], x, base - 5);
    }
    for (let x = x0 + 19; x < x0 + 30; x += 4) {
      rect(g, pal.beanPole, x, base - 14, 1, 11);
      for (let y = base - 13; y < base - 3; y += 1)
        if (hash(x, y, 12) < 0.6) px(g, pal.cabbage[1 + (y % 2 ? 1 : 0)], x + (y % 2 ? 1 : -1), y);
    }
  });
}

// A haystack round its pole, the kind every Qusar yard keeps for winter.
function hay(g, p, s, base) {
  const { pal } = g;
  whole(s, () => {
    rect(g, pal.wood[2], p.x, base - 26, 1, 6);
    for (let y = base - 22; y < base; y += 1) {
      const d = y - base + 22;
      const half = Math.round(Math.min(9, 2 + d * 0.7));
      for (let x = p.x - half; x <= p.x + half; x += 1) {
        const k = x < p.x - half / 3 ? 0 : x < p.x + half / 3 ? 1 : 2;
        px(g, hash(x, y, 13) < 0.15 ? pal.hay[k + 1] : pal.hay[d > 19 ? 3 : k], x, y);
      }
    }
  });
}

// A hawthorn or blackberry bush, a few berries on the blackberries.
function bush(g, p, s, base) {
  const { pal } = g;
  const h = Math.max(2, Math.round((4 + (p.seed % 3)) * p.scale * s));
  const w = Math.round(h * 1.8);
  const berries = p.species === "blackberry" && s >= 1;
  leafClump(g, p.x, base - Math.round(h / 2), w, h, pal.hornbeam, p.seed, {
    extra: berries ? (dx, dy, tone) => (tone < 3 && hash(dx, dy, p.seed) < 0.08 ? pal.fruit : null) : undefined,
  });
}

// Long grass: two to four blades, the outer ones leaning out, lit at the tips.
function tuft(g, p, s, base) {
  const { pal } = g;
  const tall = Math.max(1, Math.round((2 + (p.seed % 4)) * p.scale * s));
  for (let k = -1; k <= 1; k += 1) {
    const h = tall - (k === 0 ? 0 : 1);
    for (let r = 0; r < h; r += 1) {
      const lean = k * Math.floor((r + 1) / 2);
      px(g, r === h - 1 ? pal.grass[0] : r === 0 ? pal.grass[3] : pal.grass[2], p.x + lean, base - 1 - r);
    }
  }
}

// Clover, buttercups and a few pink campion: the meadow's flower.
function flower(g, p, s, base) {
  meadowFlower(g, p, s, base);
}

function mushroom(g, p, s, base) {
  const { pal } = g;
  if (s < 0.5) return;
  rect(g, pal.stem, p.x, base - 1, 1, 1);
  rect(g, pal.cap, p.x - 1, base - 2, 3, 1);
  px(g, pal.stem, p.x, base - 2);
}

// ---- The page ------------------------------------------------------------------------------------

function generate(ctx) {
  const { cols, rand } = ctx;
  const plants = [];
  const tall = CLEARING + 20;
  const at = placeLandmarks(ctx, [
    { key: "house", half: 26, away: tall, inside: true },
    { key: "walnut", half: 18, away: tall },
    { key: "oven", half: 32, away: CLEARING, inside: true },
    { key: "hives", half: 22, away: 30, inside: true },
    { key: "beds", half: 18, away: 0, inside: true },
    { key: "hay", half: 10, away: 0 },
  ]);
  const away = (x, room = 12) =>
    Math.abs(x - at.house) > 26 + room &&
    Math.abs(x - at.oven) > 32 + room &&
    Math.abs(x - at.hives) > 22 + room &&
    Math.abs(x - at.beds) > 18 + room &&
    Math.abs(x - at.hay) > 10 + room &&
    Math.abs(x - at.walnut) > 10 + room;
  // The massif sits a layer behind the foothills, so no peak is painted over a hill.
  scatter(plants, ctx, { kind: "range", count: Math.round(cols / 50), born: [1, 2], scale: [1.1, 1.6], layer: -2 });
  scatter(plants, ctx, { kind: "hill", count: Math.round(cols / 70), born: [1, 2], scale: [1.4, 1.9], layer: -1 });
  scatter(plants, ctx, { kind: "hill", count: Math.round(cols / 64), born: [2, 3], scale: [0.6, 0.95], layer: 0 });
  // Groves at the meadow's far edge: clumps of two to four, tallest in the middle, with gaps between.
  const centres = [];
  for (let tries = 0; tries < 80 && centres.length < Math.round(cols / 70); tries += 1) {
    const x = Math.round(rand() * cols);
    if (centres.every((c) => Math.abs(c - x) > 55)) centres.push(x);
  }
  centres.forEach((x, i) => {
    grove(plants, ctx, {
      kind: "tree",
      x,
      count: 2 + Math.floor(rand() * 3),
      gap: 8,
      born: [1 + (i % 3), 3 + (i % 3)],
      scale: [0.45, 0.8],
      layer: 0,
      species: [["hornbeam", "oak", "beech"][i % 3]],
    });
  });
  // Tall trees close behind the house, and framing the clearing at both edges.
  const side = rand() < 0.5 ? -1 : 1;
  plants.push(makePlant(rand, "tree", at.house + side * 20, { born: 2, depth: 1, scale: 1.15, species: "beech" }));
  plants.push(
    makePlant(rand, "tree", 2 + Math.round(rand() * 6), { born: 5, depth: 2, scale: 1.25, species: "beech" }),
  );
  plants.push(
    makePlant(rand, "tree", cols - 2 - Math.round(rand() * 6), { born: 5, depth: 2, scale: 1.2, species: "oak" }),
  );
  // The landmarks.
  plants.push(makePlant(rand, "house", at.house, { born: 1, depth: 4 }));
  plants.push(makePlant(rand, "oven", at.oven, { born: 2, depth: 6 }));
  plants.push(makePlant(rand, "walnut", at.walnut, { born: 3, depth: 3, scale: clearing(at.walnut, cols) }));
  plants.push(makePlant(rand, "apple", at.hives - 14, { born: 3, depth: 3, scale: clearing(at.hives - 14, cols) }));
  plants.push(makePlant(rand, "hives", at.hives + 4, { born: 3, depth: 5 }));
  plants.push(makePlant(rand, "beds", at.beds, { born: 4, depth: 7 }));
  plants.push(makePlant(rand, "hay", at.hay, { born: 4, depth: 4 }));
  // The wild meadow: bushes in twos and threes, tufts of long grass and flowers in patches, mushrooms.
  scatter(plants, ctx, {
    kind: "bush",
    count: Math.round(cols / 16),
    born: [5, 5],
    scale: [0.8, 1.2],
    depth: [2, 5],
    species: ["hawthorn", "blackberry"],
    keep: (x) => away(x, 2),
  });
  for (let i = 0; i < Math.round(cols / 14); i += 1) {
    grove(plants, ctx, {
      kind: "tuft",
      x: Math.round(rand() * cols),
      count: 2 + Math.floor(rand() * 4),
      gap: 3,
      born: [0, 2],
      scale: [0.8, 1.3],
      depth: [2, 15],
    });
  }
  for (let i = 0; i < Math.round(cols / 40); i += 1) {
    grove(plants, ctx, {
      kind: "flower",
      x: Math.round(rand() * cols),
      count: 3 + Math.floor(rand() * 4),
      gap: 4,
      born: [0, 3],
      scale: [0.7, 1.1],
      depth: [3, 14],
    });
  }
  scatter(plants, ctx, { kind: "mushroom", count: Math.round(cols / 40), born: [5, 6], depth: [8, 14], max: 5 });
  for (const p of plants) if (p.kind === "tree" || p.kind === "bush") p.scale *= clearing(p.x, cols);
  sortPlants(plants);
  return plants;
}

// The yard's grass, its top edge tufted as the scene grows, clover here and there.
function soil(pal, x, y, depth, turf) {
  if (y === 0 && hash(x, 0, 5) < turf) return pal.grass[0];
  const n = hash(x, y, 11);
  if (hash(x, y, 31) < 0.01 * turf) return pal.flowers[0];
  if (n < 0.1 + depth * 0.2) return pal.soil[2];
  if (n > 0.92 - (1 - depth) * 0.08) return pal.soil[0];
  return pal.soil[1];
}

// ---- Creatures -----------------------------------------------------------------------------------

const landmark = (f, kind) => f.plants.find((p) => p.kind === kind);
const grown = (p) => p && p.shown - p.born >= MATURE[p.kind];
const baseOf = (f, p) => f.groundY + (p.layer < 1 ? 1 : p.depth);
const flowerSize = (p) => smooth(clamp((p.shown - p.born) / MATURE.flower, 0, 1));

// The walnut bough its cat lies along: the flattest of the three lowest, chosen once from the tree at
// rest, so the cat keeps to it and rides it in the wind.
function walnutBough(f, time) {
  const p = landmark(f, "walnut");
  if (!grown(p)) return null;
  const base = baseOf(f, p);
  const shape = { ...WALNUT, tones: [] };
  if (p.catBough == null) {
    const low = broadleafLayout(p, 1, base, shape, 0).boughs.slice(0, 3);
    const slope = (b) => Math.abs(b.y1 - b.y0) / Math.max(1, Math.abs(b.x1 - b.x0));
    p.catBough = low.reduce((best, b, i) => (slope(b) < slope(low[best]) ? i : best), 0);
  }
  const b = broadleafLayout(p, 1, base, shape, time).boughs[p.catBough];
  return { x: Math.round((b.x0 + b.x1) / 2), y: Math.round((b.y0 + b.y1) / 2), dir: Math.sign(b.x1 - b.x0) || 1 };
}

// The apple's fork, where the lowest bough leaves the trunk.
function appleFork(f, time) {
  const p = landmark(f, "apple");
  if (!grown(p)) return null;
  const b = broadleafLayout(p, 1, baseOf(f, p), { ...APPLE, tones: [] }, time).boughs[0];
  return { x: b.x0, y: b.y0, dir: 1 };
}

// The cats that keep a spot: [name, stage, on a phone too, pose, where (f, time) => { x, y, dir }].
const SPOT_CATS = [
  [
    "logs",
    3,
    true,
    "loaf",
    (f) => {
      const p = landmark(f, "oven");
      return grown(p) && { ...ovenSpots(p.x, baseOf(f, p)).logs, dir: 1 };
    },
  ],
  [
    "bench",
    3,
    true,
    "curl",
    (f) => {
      const p = landmark(f, "oven");
      return grown(p) && { x: ovenSpots(p.x, 0).bench[0], y: baseOf(f, p), dir: 1 };
    },
  ],
  [
    "bench2",
    6,
    false,
    "doze",
    (f) => {
      const p = landmark(f, "oven");
      return grown(p) && { x: ovenSpots(p.x, 0).bench[1], y: baseOf(f, p), dir: -1 };
    },
  ],
  ["walnut", 4, false, "doze", (f, time) => walnutBough(f, time)],
  ["apple", 4, false, "sit", (f, time) => appleFork(f, time)],
  [
    "step",
    7,
    false,
    "groom",
    (f) => {
      const p = landmark(f, "house");
      return grown(p) && { ...houseSpots(p.x, baseOf(f, p)).step, dir: 1 };
    },
  ],
  [
    "veranda",
    7,
    false,
    "sit",
    (f) => {
      const p = landmark(f, "house");
      return grown(p) && { ...houseSpots(p.x, baseOf(f, p)).veranda, dir: -1 };
    },
  ],
];

// A sleeping cat the rooster has woken: up into the arched back, then down to sleep again.
function startled(c, time) {
  const u = time - (c.startle ?? -99);
  if (u < 0 || u >= STARTLE) return null;
  if (u < 0.2) return { pose: "arch", rest: { from: c.pose, to: "arch", u: u / 0.2 } };
  if (u < STARTLE - 0.6) return { pose: "arch", rest: { from: "arch", to: "arch", u: 1 } };
  return { pose: "arch", rest: { from: "arch", to: c.pose, u: (u - STARTLE + 0.6) / 0.6 } };
}

// The pair at play. Between bouts both rest (one sits, one loafs); before a bout the second walks off
// to 28 px ahead of the first, toward the middle of the page; then catPlayAt plays the bout.
function playStep(f, pl, dt) {
  const [a, b] = pl.cats;
  if (pl.phase === "rest" && f.time >= pl.next) {
    pl.dir = a.x < f.cols / 2 ? 1 : -1;
    pl.phase = "reset";
  }
  if (pl.phase === "reset") {
    const goal = a.x + pl.dir * 28;
    const step = Math.sign(goal - b.x);
    b.dir = step || b.dir;
    b.state = "walk";
    b.x += step * Math.min(Math.abs(goal - b.x), 8 * dt);
    if (Math.abs(goal - b.x) < 0.5) {
      Object.assign(pl, { phase: "play", start: f.time, x0: a.x });
    }
  }
  if (pl.phase === "play") {
    const t = f.time - pl.start;
    if (t >= PLAY_SECONDS) {
      pl.phase = "rest";
      pl.next = f.time + PLAY_REST[0] + f.rand() * PLAY_REST[1];
      for (const [c, pose] of [
        [a, "sit"],
        [b, "loaf"],
      ]) {
        Object.assign(c, { state: "rest", pose, rest: null, lift: 0, steps: null, since: f.time });
      }
      b.dir = -pl.dir;
      return;
    }
    catPlayAt(t, pl.x0, pl.dir).forEach((fields, i) => {
      Object.assign(pl.cats[i], { rest: null, lift: 0, steps: null }, fields, { since: f.time - fields.age });
    });
  }
  if (pl.phase === "rest") {
    a.state = "rest";
    b.state = "rest";
  }
}

// The rooster's crow: three rings of sound leaving his open beak, fading as they spread.
function crowRings(g, r, time) {
  const u0 = time - r.crowAt - 1.4;
  if (u0 < 0 || u0 > 1.8) return;
  const mx = r.x + r.dir * 5;
  const my = r.y - 13;
  for (const start of [0, 0.5, 1]) {
    const u = (u0 - start) / 0.8;
    if (u < 0 || u >= 1) continue;
    const radius = 2 + u * 9;
    const colour = rgba(g.pal.crowRing, 0.8 * (1 - u));
    for (let a = -50; a <= 50; a += 6) {
      const rad = ((a + 20) * Math.PI) / 180;
      px(g, colour, mx + r.dir * Math.cos(rad) * radius, my - Math.sin(rad) * radius);
    }
  }
}

const extras = {
  init(f) {
    const coats = [...HOUSECAT_COAT_NAMES].sort(() => f.rand() - 0.5);
    const coat = (i) => `housecat-${coats[i % coats.length]}`;
    const restCat = (i) => ({
      kind: "housecat",
      pal: coat(i),
      x: 0,
      y: 0,
      dir: 1,
      state: "rest",
      since: -10,
      seed: i * 3.7,
    });
    const cats = {};
    SPOT_CATS.forEach(([name, , , pose], i) => {
      cats[name] = { ...restCat(i + 3), pose, startle: -99 };
    });
    const ax = f.cols * (0.15 + f.rand() * 0.2) + (f.rand() < 0.5 ? 0 : f.cols * 0.5);
    return {
      cat: { ...walker(f), pal: coat(0), seed: 1.3 },
      cats,
      play: {
        active: false,
        phase: "rest",
        next: f.time + 6,
        cats: [
          { ...restCat(1), x: ax, pose: "sit" },
          { ...restCat(2), x: ax + 28, dir: -1, pose: "loaf" },
        ],
      },
      rooster: { ...walker(f), crowAt: -99 },
      hen: walker(f),
      crowNext: 25 + f.rand() * 10,
      sparrows: [0, 1].map((i) => ({ ...percher(f, 0, 0, i ? -1 : 1, SMALL_MOVES), i })),
      swallow: { next: 2, bird: null },
      crow: { next: 8, bird: null },
      eagle: { next: 14, bird: null },
      buzzard: soarer(f, 40 + f.rand() * 14),
      flies: Array.from({ length: BUTTERFLIES }, (_, i) => ({
        homeX: (0.12 + 0.76 * ((i + f.rand() * 0.8) / BUTTERFLIES)) * f.cols,
        homeY: f.groundY - 10 - f.rand() * 16,
        phase: f.rand() * 6.28,
        speed: 0.5 + f.rand() * 0.4,
        colour: i % 2,
        cycle: 15 + f.rand() * 6,
        from: Infinity,
        at: Infinity,
        n: null,
      })),
      fireflies: Array.from({ length: FIREFLIES }, () => ({
        homeX: f.rand() * f.cols,
        homeY: f.groundY - 4 - f.rand() * 22,
        phase: f.rand() * 6.28,
        speed: 0.2 + f.rand() * 0.3,
        reach: 6 + f.rand() * 10,
      })),
    };
  },

  onGrow(f) {
    const x = f.extra;
    if (f.stage >= 1) enter(f, x.cat);
    if (f.stage >= 4) {
      enter(f, x.rooster);
      enter(f, x.hen);
    }
    if (f.stage >= 5 && !narrow(f)) x.play.active = true;
    x.buzzard.active = f.stage >= 7 && !narrow(f);
    x.flies.forEach((fly, i) => {
      if (f.stage >= 5 && fly.from === Infinity) {
        fly.from = f.time + i * 2;
        fly.at = fly.from;
      }
    });
  },

  busy: () => true,

  update(f, dt) {
    const x = f.extra;
    const day = !isNight(f);
    wander(f, x.cat, dt, { speed: 7, stride: 7, sit: [5, 12], walk: [3, 6] });
    rest(f, x.cat, felidPoses("housecat"));
    for (const [name, stage, phone] of SPOT_CATS) x.cats[name].active = f.stage >= stage && (phone || !narrow(f));
    if (x.play.active) playStep(f, x.play, dt);
    // The chickens peck about by day; the rooster crows every 30 to 50 s, and a sleeping cat near him
    // wakes with a start.
    for (const [b, kind] of [
      [x.rooster, "moa"],
      [x.hen, "hen"],
    ]) {
      const crowing = kind === "moa" && f.time - b.crowAt < CROW_SECONDS;
      const x0 = b.x;
      if (!crowing) {
        wander(f, b, dt, { speed: groundSpeed(kind), stride: 1, sit: [2.6, 6], walk: [1.5, 3] });
        rest(f, b, groundPoses(b, kind));
      }
      groundBirdStep(f, b, dt, kind, x0);
    }
    const r = x.rooster;
    if (r.active && day && f.stage >= 4 && f.time >= x.crowNext) {
      Object.assign(r, { state: "sit", was: "sit", pose: "crow", since: f.time, crowAt: f.time, timer: 1 });
      x.crowNext = f.time + CROW_EVERY[0] + f.rand() * CROW_EVERY[1];
      for (const c of Object.values(x.cats)) {
        if (c.active && (c.pose === "curl" || c.pose === "doze") && Math.abs(c.x - r.x) < 70) c.startle = f.time + 1.2;
      }
    }
    // The sparrows sit on the roof ridge once the house is up.
    const home = landmark(f, "house");
    for (const s of x.sparrows) {
      s.active = day && f.stage >= 2 && grown(home);
      if (s.active) fidget(f, s);
    }
    const flyers = [
      [f.stage >= 3, x.swallow, { every: [5, 7], speed: 40, spawn: () => ({ y: f.groundY - 30 - f.rand() * 30 }) }],
      [f.stage >= 4, x.crow, { every: [8, 8], speed: 22, spawn: () => ({ y: f.groundY - 60 - f.rand() * 30 }) }],
      [
        f.stage >= 6 && !narrow(f),
        x.eagle,
        { every: [12, 10], speed: 12, spawn: () => ({ y: f.groundY - 100 - f.rand() * 30 }) },
      ],
    ];
    for (const [on, slot, o] of flyers) if (on && day) flyBy(f, slot, dt, o);
    const spots = f.plants.filter((p) => p.kind === "flower" && flowerSize(p) >= 0.9);
    for (const fly of x.flies) {
      if (fly.at !== Infinity)
        butterflyPick(
          fly,
          f.time,
          spots,
          x.flies.map((o) => o.flower).filter((o) => o && o !== fly.flower),
        );
    }
  },

  draw(g, f) {
    const x = f.extra;
    const time = f.time;
    const day = !isNight(f);
    const home = landmark(f, "house");
    if (home && day) {
      const spot = houseSpots(home.x, baseOf(f, home));
      const foot = footOf(g, "sparrow");
      const gv = groundOf(SMALL.sparrow);
      x.sparrows.forEach((s, i) => {
        if (!s.active) return;
        const m = movePose(Object.fromEntries(Object.keys(SMALL_MOVES).map((k) => [k, doing(s, k, time)])));
        const dir = m.turned ? -s.dir : s.dir;
        const sx = spot.ridge[i];
        perchedSmall(
          g,
          "sparrow",
          Math.round(dir > 0 ? sx - foot.u : sx + foot.u + 1),
          spot.ridgeTop + foot.v - gv,
          time,
          m.pose,
          { dir },
        );
      });
    }
    for (const [name] of SPOT_CATS) {
      const c = x.cats[name];
      if (!c.active) continue;
      const at = SPOT_CATS.find((s) => s[0] === name)[4](f, g.time);
      if (!at) continue;
      felidAt(g, { ...c, ...at, ...(startled(c, time) ?? {}) }, time);
    }
    if (x.cat.active) felidAt(g, { ...x.cat, kind: "housecat" }, time);
    if (x.play.active) for (const c of x.play.cats) felidAt(g, { ...c, y: f.groundY + 8 }, time);
    if (day) {
      if (x.rooster.active) {
        groundBirdAt(g, x.rooster, "moa", time);
        crowRings(g, { ...x.rooster, y: g.groundY + 7 }, time);
      }
      if (x.hen.active) groundBirdAt(g, x.hen, "hen", time);
      for (const fly of x.flies) {
        if (time < fly.from) continue;
        const p = fly.flower;
        const s = p ? flowerSize(p) : 0;
        butterflyAt(g, fly, time, s > 0.5 ? meadowFlowerHead(g, p, s, baseOf(f, p)) : null);
      }
      if (x.swallow.bird) flyerAt(g, x.swallow.bird, time, "swallow");
      if (x.crow.bird) flyerAt(g, x.crow.bird, time, "crow");
      if (x.eagle.bird) eagleFlyAt(g, "golden", x.eagle.bird, time);
      if (x.buzzard.active) circlerAt(g, "hawk", x.buzzard, time);
    } else if (f.stage >= 2) {
      for (const fly of x.fireflies) {
        const fx = fly.homeX + Math.sin(time * fly.speed + fly.phase) * fly.reach;
        const fy = fly.homeY + Math.sin(time * fly.speed * 1.4 + fly.phase * 2) * 5;
        fireflyAt(g, fx, fy, time, fly.phase, g.pal.glow);
      }
    }
  },
};

export default {
  id: "village",
  label: "Rural Village",
  group: "woods",
  palettes: { light: LIGHT, dark: DARK },
  fade: { light: [0.35, 0.55], dark: [0.45, 0.65] },
  mature: MATURE,
  paint: { range, hill, tree, walnut, apple, house, oven, hives, beds, hay, bush, tuft, flower, mushroom },
  generate,
  soil,
  extras,
  icon: {
    grid: [
      "............",
      "....s.......",
      "...sas....t.",
      "..saaas..ttt",
      ".saaaaas.ttt",
      "taaaarrr.ttt",
      "ttaarrrrr.k.",
      "tttawwwwa.k.",
      "kttawdwwa...",
      "kgggwdwwgggg",
      "gggggggggggg",
      "gggggggggggg",
    ],
    colours: {
      s: "#e3eaf1",
      a: "#8d99aa",
      t: "#56823e",
      k: "#6a4f39",
      r: "#a44e38",
      w: "#e2dccd",
      d: "#4a2c18",
      g: "#8fb35a",
    },
  },
};
