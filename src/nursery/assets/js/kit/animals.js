// Animal sprites shared by the scenes, one design per family with a variant per habitat. Each is
// drawn in its own coordinates, facing right and mirrored by `dir`, from the painter `g` and the
// animal's state. Animals that move are walkers (critters.js); the scene decides when to draw them.
//
// Sizes follow tiers shared by every wildlife scene, in art pixels at scale 1: S (rabbits, small
// birds) 7-11 wide, M (foxes, coyotes, raptors) 12-17, L (deer, black bears, wolves, bighorn) 17-23,
// XL (elk, grizzlies, Asian elephants) 23-28, XXL (African elephants) 28-31. A young animal is the
// same sprite at a smaller scale.
//
// A family's palette is read from g.pal under the animal's `pal` field, or the family's own name,
// so a scene can keep two variants of one family apart.
import { part, scaledPart, sprite } from "./pixel.js";

// The row an animal's feet stand on: the soil line, or a perch's top when it has a `y`.
const feet = (g, a) => a.y ?? g.groundY + 7;

// Walking legs: the diagonal pairs lift in turn. Returns whether the leg at index i is lifted.
const lifted = (a, i) => a.state === "walk" && (Math.floor(a.phase) % 2 === 0) === (i === 0 || i === 3);

// Bears

// One bear, in two sizes. Both have a flat back, two ears raised on the crown, a tan muzzle and a
// sheen on the back. The grizzly is the larger, its coat paler under the belly and chest. B is the
// coat, S its sheen or silver, M the muzzle and N the nose.
const BEARS = {
  black: {
    leg: 4,
    legs: [2, 4, 10, 12],
    body: [
      "..BBBBBBBBB....B..B.",
      ".BBBBBBBBBBBBBBBBBB.",
      "BBBSSSSSBBBBBBBBBBB.",
      "BBBBBBBBBBBBBBBBBBMM",
      "BBBBBBBBBBBBBBBBBMMN",
      "BBBBBBBBBBBBBBBB....",
      ".BBBBBBBBBBBBBB.....",
      "..BBBB....BBBB......",
    ],
  },
  grizzly: {
    leg: 5,
    legs: [2, 4, 12, 14],
    body: [
      ".....BBBBBBBBBB...B..B.",
      "..BBBBBBBBBBBBBBBBBBBB.",
      ".BBBSSSBBBBBBBBBBBBBBB.",
      "BBBBBBBBBBBBBBBBBBBBBMM",
      "BBBBBBBBBBBBBBBBBBBBMMN",
      "BBBBBBBBBBBBBBBBBBB....",
      "BBBBBBBBBBBBBBBBBS.....",
      ".BBBBBBSSSSBBBBBSS.....",
      "..BBBBS....SBBBSS......",
    ],
  },
};

// A cub, drawn on its own rather than shrunk from its mother: a smaller, rounder head with one
// small ear showing side on, a rounded back that runs over to the front legs and into the head,
// and short legs.
const BEAR_CUB = ["..BBBBB..B..", ".BBBBBBBBBB.", "BBBBBBBBBBBM", "BBBBBBBBBBMN", ".BBBBBBBB..."];
const CUB_LEGS = [1, 2, 6, 7];

// Reared up on its hind legs to sniff the air.
const BEAR_STAND = [
  "....B.B..",
  "....BBB..",
  "....BBBMM",
  "....BBBMN",
  "...BBBB..",
  "..BBBBBB.",
  "..BSBBBBB",
  "..BBBBB.B",
  "..BBBBB..",
  ".BBBBBB..",
  ".BBBBBB..",
  ".BSBBBB..",
  "BBBBBBB..",
  "BBBBBBB..",
  ".BB..BB..",
  ".BB..BB..",
  "BBB.BBB..",
];

// A bear walking, or reared up when its state is "rear". A cub (`cub` true) walks as its own
// sprite; reared up, as when it climbs, it is the adult's pose at its scale. Its palette is bear:
// [coat, sheen, muzzle, nose, legs].
export function bearAt(g, b) {
  const [coat, sheen, muzzle, nose, legs] = g.pal[b.pal ?? "bear"];
  const colours = { B: coat, S: sheen, M: muzzle, N: nose };
  const k = b.scale ?? 1;
  const x = Math.round(b.x);
  const y = feet(g, b);
  if (b.state === "rear") {
    sprite(g, BEAR_STAND, colours, x, y, b.dir, 2, BEAR_STAND.length, k);
    return;
  }
  if (b.cub) {
    CUB_LEGS.forEach((dx, i) => {
      part(g, legs, x, y, b.dir, dx, -2, 1, lifted(b, i) ? 1 : 2);
    });
    sprite(g, BEAR_CUB, colours, x, y, b.dir, 0, BEAR_CUB.length + 2);
    return;
  }
  const kind = BEARS[b.kind ?? "black"];
  const px = scaledPart(g, x, y, b.dir, k);
  kind.legs.forEach((dx, i) => {
    px(legs, dx, -kind.leg, 2, lifted(b, i) ? kind.leg - 1 : kind.leg);
  });
  sprite(g, kind.body, colours, x, y, b.dir, 0, kind.body.length + kind.leg, k);
}

// Dogs

// Foxes, coyotes and wolves share one build: a trunk on four thin legs, a head with a pointed
// muzzle and ears, and a tail. They differ in length, leg height and tail: the fox's brush is long
// and level, the wolf's hangs. A red fox wears black stockings and ears; a wolf has a thick neck ruff
// and a deep pale chest. The far legs take the darker shade.
const CANIDS = {
  red: { body: 7, high: 3, leg: 3, tail: 4, ear: 2, hang: 0, stockings: true },
  arctic: { body: 6, high: 3, leg: 2, tail: 3, ear: 1, hang: 0, stockings: false },
  coyote: { body: 8, high: 3, leg: 4, tail: 4, ear: 2, hang: 1, stockings: false },
  wolf: { body: 9, high: 4, leg: 5, tail: 4, ear: 2, hang: 2, stockings: false, ruff: true },
};

// C is the coat, E the eye and nose, L the pale cheek; the head's top-left cell sits on the neck.
const CANID_HEAD = ["CCC..", "CECCE", ".LLL."];
const CANID_HOWL = ["...E", "..CC", ".CCC", "CEC.", "LL.."];
const CANID_DOWN = ["CCC..", "CECC.", ".LLCE"];

// A pup (scale below 0.8) is drawn on its own, not shrunk from its parent: two pointed ears, a short
// back, and a short tail with a dark tip. C is the coat, D the dark, L the pale, E the nose and T the
// tail's tip. A grid's `cx` and `cy` are the cell that stands on the pup's feet. The walking pup's legs
// are drawn apart from it, near ones in the coat and far ones in the dark.
const PUP_WALK = {
  grid: [".....C.C..", ".....CCC..", "....CCCLLE", "TCCCCCL...", "..CLLLL..."],
  cx: 2,
  cy: 7,
};
const CANID_PUPS = {
  coyote: {
    walk: PUP_WALK,
    sit: {
      grid: [
        ".....C.C..",
        ".....CCC..",
        ".....CCCCE",
        "....CCCLL.",
        "....CCL...",
        "..CCCCL...",
        "..CCCDC...",
        "TCCCCDC...",
      ],
      cx: 2,
      cy: 8,
    },
    howl: {
      grid: [
        ".......E.",
        ".......CL",
        "....CCCCL",
        ".....CCL.",
        "....CCL..",
        "....CCL..",
        "..CCCCL..",
        "..CCCDC..",
        "TCCCCDC..",
      ],
      cx: 2,
      cy: 9,
    },
  },
  arctic: {
    walk: PUP_WALK,
    sit: {
      grid: ["...C.C.", "...CCCE", "..CCCL.", ".CCLL..", ".CCLL..", "CCCDC.."],
      cx: 1,
      cy: 6,
    },
  },
};

// Touch-ups to the wolf and its yearling, as extra coat pixels [dx, dy] from the feet: a smoother line
// from the neck to the back, an ear and a tail. Keyed by kind and scale, then walking or sitting.
const CANID_PATCHES = {
  "wolf-1": {
    walk: [
      [7, -12],
      [5, -11],
      [1, -10],
      [2, -10],
      [3, -10],
      [-1, -8],
    ],
    sit: [
      [7, -13],
      [6, -12],
      [7, -12],
      [5, -11],
      [4, -10],
      [3, -9],
      [2, -8],
      [3, -8],
      [2, -7],
      [3, -7],
    ],
  },
  "wolf-0.9": {
    walk: [
      [6, -11],
      [2, -9],
      [3, -9],
      [-1, -7],
    ],
    sit: [
      [6, -11],
      [4, -9],
      [3, -8],
      [2, -7],
      [3, -7],
      [2, -6],
      [3, -6],
    ],
  },
};

// A fox, coyote or wolf, walking, sitting (`sit`), howling (`howl`) or mid-pounce (`pounce`, held
// `lift` pixels off the ground, nose down). Its palette is [coat, dark, pale, eye, tail tip].
function canidBase(g, c) {
  const s = CANIDS[c.kind];
  const [coat, dark, pale, eye, tip] = g.pal[c.pal ?? c.kind];
  const colours = { C: coat, E: eye, L: pale };
  const k = c.scale ?? 1;
  const x = Math.round(c.x);
  const y = feet(g, c) - Math.round(c.lift ?? 0);
  const px = scaledPart(g, x, y, c.dir, k);
  const legs = s.stockings ? dark : coat;
  const top = s.leg + s.high;
  const pups = k < 0.8 ? (CANID_PUPS[c.kind] ?? CANID_PUPS.coyote) : null;
  const pose = c.state === "sit" ? pups?.sit : c.state === "howl" ? pups?.howl : pups?.walk;
  if (pose && c.state !== "pounce") {
    if (pose === pups.walk) {
      [1, 2, 3, 4].forEach((dx, i) => {
        const far = i === 1 || i === 2;
        part(g, far ? dark : legs, x, y, c.dir, dx, -2, 1, lifted(c, i) ? 1 : 2);
      });
    }
    const colours = { C: coat, D: dark, L: pale, E: eye, T: tip };
    sprite(g, pose.grid, colours, x, y, c.dir, pose.cx, pose.cy);
    return;
  }
  const head = (grid, dx, dy) => sprite(g, grid, colours, x, y, c.dir, -dx, -dy, k);
  const ears = (dx, dy) => {
    px(s.stockings ? dark : coat, dx, dy - s.ear, 1, s.ear);
    px(s.stockings ? dark : coat, dx + 2, dy - s.ear, 1, s.ear);
  };
  if (c.state === "sit" || c.state === "howl") {
    px(coat, -s.tail + 1, -2, s.tail, 2);
    px(tip, -s.tail + 1, -2, 1, 2);
    px(coat, 0, -s.high - 2, s.body - 3, s.high + 2);
    px(coat, s.body - 4, -top - 1, 4, top + 1 - s.leg);
    px(pale, s.body - 2, -top, 2, s.high);
    px(dark, s.body - 3, -s.leg, 1, s.leg);
    px(legs, s.body - 1, -s.leg, 1, s.leg);
    if (c.state === "howl") {
      head(CANID_HOWL, s.body - 2, -top - 5);
      px(s.stockings ? dark : coat, s.body - 3, -top - 3, 2, 1); // one ear laid back
    } else {
      px(coat, s.body - 2, -top - 2, 2, 1); // the back of the neck, up into the head
      if (s.ruff) {
        px(coat, s.body - 5, -top, 1, 3);
        px(coat, s.body - 3, -top - 2, 1, 1);
        px(pale, s.body, -top - 1, 1, 2);
      }
      head(CANID_HEAD, s.body - 1, -top - 4);
      ears(s.body - 1, -top - 4);
    }
    return;
  }
  const pounce = c.state === "pounce";
  [1, 3, s.body - 3, s.body - 1].forEach((dx, i) => {
    const colour = i === 1 || i === 2 ? dark : legs;
    if (pounce) px(colour, i < 2 ? dx - 2 : dx + 1, -s.leg, 2, 1);
    else px(colour, dx, -s.leg, 1, lifted(c, i) ? s.leg - 1 : s.leg);
  });
  px(coat, 0, -top, s.body, s.high);
  px(pale, 2, -s.leg - 1, s.body - 4, 1);
  px(pale, s.body - 2, -top + 1, 2, s.high - 1);
  px(coat, -s.tail, -top + s.hang, s.tail, 2);
  px(tip, -s.tail, -top + s.hang, 1, 2);
  if (pounce) {
    head(CANID_DOWN, s.body - 1, -top);
    ears(s.body - 1, -top);
    return;
  }
  px(coat, s.body - 2, -top - 1, 3, 1);
  if (s.ruff) {
    px(coat, s.body - 5, -top - 1, 3, 1);
    px(coat, s.body - 3, -top - 2, 2, 1);
    px(pale, s.body, -top, 1, 2);
  }
  head(CANID_HEAD, s.body - 1, -top - 3);
  ears(s.body - 1, -top - 3);
}

export function canidAt(g, c) {
  canidBase(g, c);
  const pose = c.state === "sit" ? "sit" : c.state === "howl" || c.state === "pounce" ? null : "walk";
  const patch = pose && CANID_PATCHES[`${c.kind}-${c.scale ?? 1}`]?.[pose];
  if (!patch) return;
  const x = Math.round(c.x);
  const y = feet(g, c) - Math.round(c.lift ?? 0);
  for (const [dx, dy] of patch) part(g, g.pal[c.pal ?? c.kind][0], x, y, c.dir, dx, dy, 1, 1);
}

// Deer

// One build for the family, facing right as written: a level trunk, a neck rising forward, a long
// head and a pale rump. They differ in size and traits: the elk's dark mane and big rack, the
// white-tail's white throat and belly and the flag it raises to run, the reindeer's pale neck ruff
// and short legs, and the pronghorn's white bands and short black horns. C is the coat, S its darker
// shade, D dark, P pale, R the rump and e the eye and nose.
const ELK_HEAD = [
  ".................CC.....",
  "................DCCCCCC.",
  "................DCeCCCCe",
  "..............DDDDCCCC..",
];
// The elk's grazing head and neck, as the studio edit left them (meadow-elk-sitting). Cells are
// final pixels: column 0 is 16 px in front of the feet's x, row 0 is 13 px above the feet's row.
const ELK_SIT_HEAD = [
  "DDD..........",
  "DDDD.........",
  "DDDDD....P...",
  "DDDDDD..PP...",
  "DDDDDDD.P.PP.",
  "S.DDDDDPPP...",
  "D..DDDPP..PPP",
  "D..DDDPD.PP..",
  "D..DCCCCP....",
  "D...CeCC.....",
  "D...CCCCC....",
  "D....CCCC....",
  "D......Ce....",
];
// The bugling head, raised and thrown forward, as the studio edit drew it (smokies-elk-bugle).
const ELK_BUGLE = [
  "..................CCe...",
  ".................CCCC...",
  "................CCCCC...",
  "...............CCCeC....",
  "..............DDDCCC....",
];
// Where the rack sits while bugling: forward and down from where the standing head carries it,
// [cells forward, cells down], to follow the raised head.
const BUGLE_RACK = [4, 4];
// The bull's breath while he bugles, one exhale in eight frames (4 per second): a plume leaves the
// muzzle, widens as it rises, trails a puff and breaks up. Each part is [dx, dy, w, h] from the
// pose x and the feet row, as part() takes them.
const ELK_BREATH = [
  [[21, -21, 2, 1]],
  [
    [21, -21, 2, 2],
    [23, -22, 1, 1],
  ],
  [
    [21, -21, 2, 1],
    [22, -22, 3, 1],
    [24, -23, 2, 2],
    [23, -21, 1, 1],
  ],
  [
    [22, -22, 2, 1],
    [23, -23, 3, 1],
    [25, -24, 3, 2],
    [24, -21, 1, 1],
  ],
  [
    [24, -23, 2, 1],
    [25, -24, 2, 1],
    [26, -25, 2, 2],
    [23, -22, 1, 1],
  ],
  [
    [25, -24, 2, 1],
    [27, -25, 1, 1],
    [26, -26, 1, 1],
  ],
  [[27, -26, 1, 1]],
  [],
];
const ELK_BODY = [
  ".............DDDDDD.....",
  ".............DDDDDD.....",
  "............DDDDDD......",
  ".CCCCCCCCCCCDDDDDD......",
  "RRCCCCCCCCCCCDDDDD......",
  "RRCCCCCCCCCCCCDDD.......",
  "RRCCCCCCCCCCCCDD........",
  ".RCCCCCCCCCCCCDD........",
  "..SSSSSSSSSSSSS.........",
];

// The elk's trunk while it grazes: the rump's top-right cell is removed, as the studio edit left it.
const ELK_SIT_TRUNK = [`${ELK_BODY[3].slice(0, 17)}.${ELK_BODY[3].slice(18)}`, ...ELK_BODY.slice(4)];

// `trunk` is the row the back starts on, `front` the shoulder's last column, `legs` the columns of
// the near hind, far hind, far fore and near fore legs, and `racks` what each sex wears: the set of
// RACKS, the column it stands on and how far it sinks into the crown.
const DEER = {
  elk: {
    grid: [...ELK_HEAD, ...ELK_BODY],
    trunk: 7,
    front: 15,
    leg: 6,
    legs: [2, 5, 11, 13],
    darkLegs: true,
    neck: "dark",
    racks: { m: ["elk", 12, 0] },
    sitTrunk: ELK_SIT_TRUNK,
    sitHead: { grid: ELK_SIT_HEAD, cx: -16, cy: 13 },
  },
  whitetail: {
    grid: [
      ".............CC...",
      "............CCCCCC",
      "............CeCCCe",
      "...........CCCP...",
      "..........CCCP....",
      ".........CCCCP....",
      ".CCCCCCCCCCCCP....",
      "RCCCCCCCCCCCC.....",
      "RCCCCCCCCCCCC.....",
      ".CSSSSSSSSSCC.....",
      "..PPPPPPPPPP......",
    ],
    trunk: 6,
    front: 11,
    leg: 5,
    legs: [2, 4, 9, 11],
    neck: "coat",
    racks: { m: ["whitetail", 10, 1] },
  },
  reindeer: {
    grid: [
      "...............CC...",
      "..............DCCCCC",
      "..............DCeCCe",
      "............PPPCCCC.",
      "...........PPPPP....",
      ".CCCCCCCCCCPPPPP....",
      "RRCCCCCCCCCCPPPP....",
      "RRCCCCCCCCCCCPPP....",
      "RRCCCCCCCCCCCPP.....",
      ".RCCCCCCCCCCCC......",
      "..SSSSSSSSSSS.......",
    ],
    trunk: 5,
    front: 14,
    leg: 5,
    legs: [2, 5, 9, 12],
    neck: "pale",
    racks: { m: ["reindeer", 11, 0], f: ["hind", 15, 0] },
  },
  pronghorn: {
    grid: [
      "............CCCCCC",
      "............CeCCCe",
      "...........CPPCC..",
      "..........CCPP....",
      ".........CCCCP....",
      "RCCCCCCCCCCPP.....",
      "RRCCCCCCCCCP......",
      "RRCCCCCCCCCC......",
      ".RPPPPPPPPPP......",
    ],
    trunk: 5,
    front: 10,
    leg: 5,
    legs: [2, 4, 8, 10],
    neck: "coat",
    racks: { m: ["pronghorn", 13, 0], f: ["pronghorn", 13, 0] },
  },
};

// Antlers and horns, standing on the crown and facing right. Every tine joins the beam.
const RACKS = {
  elk: ["A........", "AA..A....", ".A..A..A.", ".AA.AA.A.", "..AA.AAA.", "...AA.AA.", "....AAA.."],
  whitetail: ["..A.A..", "A.AAAA.", "AAA....", ".AA....", "..A...."],
  reindeer: ["A...A....", "AA..A....", ".A..AA.A.", ".AA..AAA.", "..AAAAA..", "...AAA..."],
  hind: ["A.A", "AAA", ".A."],
  pronghorn: ["A.A", "A.A", "A.A"],
};

// A deer walking, grazing (`sit`), running with its flag up (`run`) or, for a bull elk, bugling
// (`bugle`, `puff` the frame of its breath, 0 to 7 at 4 a second, or left out for none). `sex` is "m" or "f". Its palette is [coat, dark,
// pale, antler], with a deeper dark and a coat shade after them when it has its own.
export function cervidAt(g, d) {
  const s = DEER[d.kind];
  const [coat, dark, pale, antler, deep = dark, shade = dark] = g.pal[d.pal ?? d.kind];
  const colours = { C: coat, S: shade, D: dark, P: pale, R: pale, e: deep };
  const k = d.scale ?? 1;
  const x = Math.round(d.x);
  const y = feet(g, d);
  const px = scaledPart(g, x, y, d.dir, k);
  const moving = d.state === "walk" || d.state === "run";
  s.legs.forEach((dx, i) => {
    const far = i === 1 || i === 2;
    const colour = s.darkLegs ? (far ? deep : dark) : far ? dark : coat;
    const up = moving && lifted({ ...d, state: "walk" }, i);
    px(colour, dx, -s.leg, 2, up ? s.leg - 1 : s.leg);
  });
  if (d.state === "sit") {
    // Grazing: the neck slopes down and forward from the shoulder to a head in the grass.
    const trunk = s.sitTrunk ?? s.grid.slice(s.trunk);
    sprite(g, trunk, colours, x, y, d.dir, 0, trunk.length + s.leg, k);
    if (s.sitHead) {
      sprite(g, s.sitHead.grid, colours, x, y, d.dir, s.sitHead.cx, s.sitHead.cy);
      return;
    }
    const neck = { coat, dark, pale }[s.neck];
    let dx = s.front;
    for (let r = -s.leg - trunk.length + 2; r < -5; r += 2, dx += 1) px(neck, dx, r, 3, 2);
    px(coat, dx, -5, 2, 1);
    px(coat, dx, -4, 5, 2);
    px(deep, dx + 1, -4, 1, 1);
    return;
  }
  const bugling = d.state === "bugle";
  const grid = bugling ? [...ELK_BUGLE, ...ELK_BODY] : s.grid;
  sprite(g, grid, colours, x, y, d.dir, 0, grid.length + s.leg, k);
  if (d.state === "run" && d.kind === "whitetail") px(pale, -1, -s.leg - 7, 2, 3);
  if (bugling && Number.isInteger(d.puff)) {
    for (const [dx, dy, w, h] of ELK_BREATH[d.puff % ELK_BREATH.length] ?? []) px(pale, dx, dy, w, h);
  }
  const worn = s.racks[d.sex];
  if (worn) {
    const [set, crown, sink] = worn;
    const rack = RACKS[set];
    const cy = s.leg + grid.length + rack.length - sink;
    const [ahead, down] = bugling ? BUGLE_RACK : [0, 0];
    sprite(g, rack, { A: antler }, x, y, d.dir, -crown + ahead, cy - down, k);
  }
}

// Wild sheep

// A mature ram's horn, curled in a full circle from the crown, back and round under the jaw. H is
// the horn and R its shade on the inner edge and underside. The side view is drawn from (8, -19);
// the front view shows one horn either side of the face, so FRONT is drawn once and mirrored.
const HORN_SIDE = ["..HHHH.", ".HHRRHH", "HHR....", "HR.....", "HR...H.", "HHR.RH.", ".HHRR.."];
const HORN_FRONT = [".HHH", "HHRH", "HRR.", "HRR.", "HHR.", ".HH."];
const HORN_FRONT_FAR = HORN_FRONT.map((row) => [...row].reverse().join(""));

// A bighorn: stocky, with a pale rump and muzzle and a heavy horn curled round beside its head. It
// mostly stands on a rock: `look` turns its head to face out, `chew` works its jaw and `stamp`
// lifts a foreleg. Its palette is sheep: [coat, pale, horn, dark, horn shade].
export function sheepAt(g, s, { look = false, chew = false, stamp = false } = {}) {
  const [coat, pale, horn, dark, shade] = g.pal[s.pal ?? "sheep"];
  const k = s.scale ?? 1;
  const x = Math.round(s.x);
  const y = feet(g, s);
  const px = scaledPart(g, x, y, s.dir, k);
  const horns = { H: horn, R: shade };
  [2, 4, 9, 11].forEach((dx, i) => {
    const up = lifted(s, i) || (stamp && i === 3);
    px(dark, dx, -5, 2, up ? 3 : 5);
  });
  px(coat, 1, -11, 12, 6);
  px(pale, 0, -10, 2, 3);
  px(pale, 3, -6, 8, 1);
  px(coat, 10, -14, 3, 4);
  if (look) {
    px(coat, 11, -16, 4, 4);
    px(pale, 12, -13, 2, 2 + (chew ? 1 : 0));
    px(dark, 11, -15, 1, 1);
    px(dark, 14, -15, 1, 1);
    sprite(g, HORN_FRONT, horns, x, y, s.dir, -8, 18, k);
    sprite(g, HORN_FRONT_FAR, horns, x, y, s.dir, -14, 18, k);
    return;
  }
  // The skull runs two pixels back from the neck so the curl's open middle sits on the head.
  px(coat, 11, -16, 1, 2);
  px(coat, 12, -17, 4, 4);
  px(coat, 16, -16, 1, 2);
  px(pale, 15, -14, 2, chew ? 3 : 2);
  sprite(g, HORN_SIDE, horns, x, y, s.dir, -8, 19, k);
  px(dark, 14, -16, 1, 1);
}

// Elephants

// One build, facing right as written: a rounded back, the head carried forward, the ear laid over the
// neck. The African has a great ear and tusks; the Asian a small ear and a twin-domed head, and tusks
// too. A calf (scale below 0.8) is drawn on its own: a big head held high, a
// short body and legs, a small trunk. B is the body, S its darker shade, K the ear's skin, T tusk and
// e eye. Legs, tail and the trunk below the grid are drawn on their own.
const AFRICAN_ELEPHANT = [
  "......BBBBBBBBBBBB...BBBB......",
  "....BBBBBBBBBBBBBBBBBBBBBB.....",
  "...BBBBBBBBBBBBSSSSSBBBBBBB....",
  "..BBBBBBBBBBBBSSSSSSSBBBBBBB...",
  ".BBBBBBBBBBBBKKKKSSSSBBBeBBB...",
  ".BBBBBBBBBBBBKKKKKSSSBBBBBBB...",
  ".BBBBBBBBBBBBBBKKKSSSBBBBBBBB..",
  ".BBBBBBBBBBBBBBBKSSSSBBBBBBBB..",
  ".BBBBBBBBBBBBBBBBSSSSBBBBBBBB.T",
  ".BBBBBBBBBBBBBBBBBSSSBBBBBTTTTT",
  ".BBBBBBBBBBBBBBBBBBBBBB..BBBB..",
  ".BBBBBBBBBBBBBBBBBBBBB....BBB..",
  ".SBBBBBBBBBBBBBBBBBBB......BB..",
  "..SSSSSSSSSSSSSSSSSS.......BB..",
];
const ASIAN_ELEPHANT = [
  ".......BBBBBBBB...BBBB....",
  ".....BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBSSBBBBBB...",
  "..BBBBBBBBBBBSSSSSBBeBB...",
  ".BBBBBBBBBBBBKKSSSBBBBBB..",
  ".BBBBBBBBBBBBBKSSSBBBBBB..",
  ".BBBBBBBBBBBBBBSSBBBBBBB.T",
  ".BBBBBBBBBBBBBBBBBBBBBTTTT",
  ".BBBBBBBBBBBBBBBBBBB.BBB..",
  ".BBBBBBBBBBBBBBBBBB...BB..",
  ".SBBBBBBBBBBBBBBBB....BB..",
  "..SSSSSSSSSSSSSSS.....BB..",
];
const AFRICAN_CALF = [
  ".......BBBB.....",
  "...BBBBBBBBBBB..",
  "..BBBBBBSSSBBBB.",
  ".BBBBBBKKSSBBeB.",
  ".BBBBBBKKKSBBBBB",
  ".BBBBBBBKSBBBBBB",
  ".BBBBBBBBBBBBBBB",
  "..SSSSSSSSSS..BB",
];
const ASIAN_CALF = [
  "................",
  "...BBBBBBBBBBB..",
  "..BBBBBBBBSSBBB.",
  ".BBBBBBBBSSSBeB.",
  ".BBBBBBBBKSSBBBB",
  ".BBBBBBBBBSBBBBB",
  ".BBBBBBBBBBBBBBB",
  "..SSSSSSSSSS..BB",
];
// Each build: its grid, leg height, its legs as [column, near?] in walking order (near hind, far
// hind, far fore, near fore), the trunk below the grid as [column, row, width, height] pieces, and
// the trunk curled up instead.
const ELEPHANTS = {
  african: {
    grid: AFRICAN_ELEPHANT,
    leg: 10,
    legs: [
      [3, true],
      [5, false],
      [17, false],
      [15, true],
    ],
    trunk: [
      [27, -10, 2, 6],
      [27, -4, 3, 1],
      [28, -3, 2, 1],
    ],
    curl: [
      [28, -10, 2, 2],
      [29, -12, 2, 2],
      [30, -13, 1, 1],
    ],
  },
  asian: {
    grid: ASIAN_ELEPHANT,
    leg: 8,
    legs: [
      [2, true],
      [4, false],
      [15, false],
      [13, true],
    ],
    trunk: [
      [22, -8, 2, 4],
      [22, -4, 3, 1],
      [23, -3, 2, 1],
    ],
    curl: [
      [23, -8, 2, 2],
      [24, -10, 2, 2],
      [25, -11, 1, 1],
    ],
  },
  africanCalf: {
    grid: AFRICAN_CALF,
    leg: 4,
    legs: [
      [2, true],
      [4, false],
      [10, false],
      [8, true],
    ],
    trunk: [
      [15, -4, 1, 2],
      [15, -2, 2, 1],
    ],
  },
  asianCalf: {
    grid: ASIAN_CALF,
    leg: 4,
    legs: [
      [2, true],
      [4, false],
      [10, false],
      [8, true],
    ],
    trunk: [
      [15, -4, 1, 2],
      [15, -2, 2, 1],
    ],
  },
};

// An elephant walking or standing. Now and then it curls its trunk up, but only while standing: a
// walking elephant keeps it down. Its palette is elephant: [body, shade, ear skin, tusk, eye].
export function elephantAt(g, e, time) {
  const [body, shade, skin, tusk, eye] = g.pal[e.pal ?? "elephant"];
  const calf = (e.scale ?? 1) < 0.8;
  const kind = e.kind === "asian" ? "asian" : "african";
  const s = ELEPHANTS[calf ? `${kind}Calf` : kind];
  const x = Math.round(e.x);
  const y = feet(g, e) + 1;
  const px = (colour, dx, dy, w, h) => part(g, colour, x, y, e.dir, dx, dy, w, h);
  const rows = s.grid.length;
  px(shade, 0, -s.leg - rows + 5, 1, rows - 6); // the tail and its tuft
  px(eye, 0, -s.leg - 1, 1, 2);
  // Far legs first, in shade; each near leg stands just in front of its far one.
  for (const nearPass of [false, true]) {
    s.legs.forEach(([dx, near], i) => {
      if (near === nearPass) px(near ? body : shade, dx, -s.leg, 2, lifted(e, i) ? s.leg - 1 : s.leg);
    });
  }
  const tusks = !calf;
  sprite(g, s.grid, { B: body, S: shade, K: skin, T: tusks ? tusk : null, e: eye }, x, y, e.dir, 0, rows + s.leg);
  const curl = s.curl && e.state !== "walk" && Math.sin(time * 0.7 + e.phase * 3) > 0.85;
  for (const [dx, dy, w, h] of curl ? s.curl : s.trunk) px(body, dx, dy, w, h);
}

// Hares

// One round build, facing right as written: a round back, a head with a dark eye and nose, a pale
// scut and a darker belly. Its feet gather under the body, then stretch out as it hops. The cottontail
// has short ears, the jackrabbit long black-tipped ears and long legs, the groundhog a low body, tiny
// ears, a grizzled back and dark feet and tail. F fur, S its darker shade, D dark, W the scut, G the
// grizzled tips.
const HARES = {
  cottontail: {
    sit: [".....FF..", ".....FF..", "....FFFF.", ".FFFFFDFD", "WFFFFFFFF", "WFFFFFFF.", ".SSSSSS..", ".FFF.FF.."],
    hop: ["......FF.", "......FF.", ".....FFFF", "..FFFFFDF", "WFFFFFFFF", "WFFFFFFF.", ".SSSSSS..", "FF....FF."],
  },
  jackrabbit: {
    sit: [
      ".......D.D.",
      ".......F.F.",
      ".......F.F.",
      ".......F.F.",
      "......FFFF.",
      ".....FFFFFF",
      "..FFFFFFDFD",
      "WFFFFFFFFF.",
      "WFFFFFFFF..",
      ".SSSSSSSS..",
      ".FF....FF..",
      ".FFF...FF..",
    ],
    hop: [
      "........D.D",
      "........F.F",
      "........F.F",
      "........F.F",
      ".......FFFF",
      "......FFFFF",
      "..FFFFFFFDF",
      "WFFFFFFFFFD",
      "WFFFFFFFF..",
      ".SSSSSSSS..",
      "FFF.....FF.",
      "FF.......F.",
    ],
  },
  groundhog: {
    sit: ["......FFF..", ".GGGGFFFDF.", "DFFFFFFFFFD", "DFFFFFFFFF.", ".SSSSSSSS..", ".DD...DD..."],
    hop: ["......FFF..", ".GGGGFFFDF.", "DFFFFFFFFFD", "DFFFFFFFFF.", ".SSSSSSSS..", "DD.....DD.."],
  },
};

// A hare or rodent of `kind` (cottontail by default), hopping two pixels up mid-stride while it walks.
// Its palette is [fur, dark, white]; a groundhog's is [fur, dark, grizzle].
export function hareAt(g, r) {
  const [fur, dark, pale] = g.pal[r.pal ?? "rabbit"];
  const grids = HARES[r.kind ?? "cottontail"];
  const hop = r.state === "walk" && Math.floor(r.phase) % 2 === 1;
  const grid = hop ? grids.hop : grids.sit;
  const colours = { F: fur, S: dark, D: dark, W: pale, G: pale };
  sprite(g, grid, colours, Math.round(r.x), feet(g, r) - (hop ? 2 : 0), r.dir, 0, grid.length, r.scale ?? 1);
}

// Ground birds

// The roadrunner's build (desert.js), shared: an egg-shaped body, a small head with an eye, a tail and
// the wing laid along the side in a darker shade, on two thin legs that lift in turn. Each member's
// grids, its legs' [near, far] columns and height, and its colours from its palette.
const GROUND_BIRDS = {
  // A wild turkey: bronze, a blue head and red wattle; standing, it struts with its tail fanned.
  turkey: {
    walk: [
      "...........bb.",
      "..........bbbD",
      "..........brr.",
      "...BBBBBB.b...",
      "TBBBBBBBBBb...",
      "TBBWWWWBBBB...",
      "TBBBWWWWBBB...",
      ".BBBBBBBBB....",
      "...BBBBB......",
    ],
    sit: [
      "..TTTTT.......",
      ".TWTWTWT......",
      "TWTWTWTWT.....",
      "TWTBBBBTW.bb..",
      "TTBBBBBBBbbbD.",
      ".TBBWWWWBBrr..",
      "..BBBWWWWBb...",
      "..BBBBBBBB....",
      "....BBBBB.....",
    ],
    legs: [4, 6],
    tall: 2,
    colours: ([body, wing, red, blue, dark]) => [{ B: body, W: wing, T: wing, r: red, b: blue, D: dark }, dark, dark],
  },
  // A secretary bird: tall on long legs, black "trousers", a crest of quills and an orange face.
  secretary: {
    walk: [
      "..KK.K........",
      "...KKKK.......",
      "......GGG.....",
      "......GOGKK...",
      "......GGG.....",
      "......GGG.....",
      "....GGGGGG....",
      "KKGGGGGGGG....",
      ".WWKGGGGGG....",
      "...WKKKKKG....",
      ".....KKKK.....",
      ".....KK.K.....",
    ],
    shift: 1,
    legs: [5, 7],
    tall: 6,
    colours: ([grey, black, face, white]) => [{ G: grey, K: black, O: face, W: white }, face, black],
  },
  // A feral rooster, the moa: a red comb and a dark sickle tail. Standing, it pecks.
  moa: {
    walk: ["......cc..", ".....BBBY.", "T....BeB..", "TT..BBBc..", "TTTBBBBB..", ".TBBBBBB..", "..TBBBB..."],
    sit: ["...........", "...........", "T..........", "TT.........", "TTTBBBBBBcc", ".TBBBBBBBe.", "..TBBBB.cY."],
    legs: [4, 6],
    tall: 2,
    colours: ([body, tail, comb, legs]) => [{ B: body, T: tail, c: comb, e: tail, Y: legs }, legs, legs],
  },
};

// A ground bird of `kind`, walking or, standing (`sit`), in its standing pose. Its palette is named
// after its kind.
export function groundBirdAt(g, b, kind) {
  const s = GROUND_BIRDS[kind];
  const [colours, near, far] = s.colours(g.pal[b.pal ?? kind]);
  const x = Math.round(b.x);
  const y = feet(g, b);
  const walking = b.state === "walk";
  const step = Math.floor(b.phase) % 2;
  part(g, far, x, y, b.dir, s.legs[1], -s.tall, 1, walking && step === 1 ? s.tall - 1 : s.tall);
  part(g, near, x, y, b.dir, s.legs[0], -s.tall, 1, walking && step === 0 ? s.tall - 1 : s.tall);
  const grid = !walking && s.sit ? s.sit : s.walk;
  sprite(g, grid, colours, x, y - s.tall, b.dir, s.shift ?? 0, grid.length);
}

// Shelled animals

// One build: a domed shell with dark seams and a dark rim, the head and legs in skin. The tortoise has
// a high dome and tucks its head in to rest; the sea turtle a flatter shell and a front flipper that
// sweeps up and down; the ghost crab eyes on stalks and raised claws. P shell, H seam, R rim, K skin,
// e eye, C claw.
const SHELLED = {
  tortoise: {
    walk: ["...PPPP....", "..PPHPPP...", ".PHPPPHPP..", ".PPPHPPPKKK", ".RRRRRRRKKe"],
    sit: ["...PPPP....", "..PPHPPP...", ".PHPPPHPP..", ".PPPHPPPK..", ".RRRRRRRK.."],
  },
  honu: ["...PPPPP....", ".PPHPPHPP...", "PPPHPPPHPPKK", "RRRRRRRRRKKe"],
  crab: ["..e...e..", "..P...P..", "C.PPPPP.C", "CPPPPPPPC", ".RRRRRRR."],
};
const FLIPPER = { up: ["....KKK", "...KK.."], down: ["...KK..", "....KKK"] };

// A desert tortoise walking, or resting with its head in. Its feet stand on row y. Its palette is
// tortoise: [shell, seam, skin, rim].
export function tortoiseAt(g, t, y) {
  const [shell, seam, skin, rim] = g.pal.tortoise;
  const x = Math.round(t.x);
  const walking = t.state === "walk";
  const step = walking ? Math.floor(t.phase) % 2 : 0;
  part(g, skin, x, y, t.dir, step ? 1 : 2, -2, 2, 2);
  part(g, skin, x, y, t.dir, step ? 6 : 5, -2, 2, 2);
  const grid = walking ? SHELLED.tortoise.walk : SHELLED.tortoise.sit;
  sprite(g, grid, { P: shell, H: seam, R: rim, K: skin, e: rim }, x, y - 2, t.dir, 0, grid.length);
}

// A sea turtle swimming with its shell's bottom row at y, or its hatchling at scale k. Its palette is
// turtle: [shell, dark, skin].
export function honuShellAt(g, t, y, time, k = 1) {
  const [shell, dark, skin] = g.pal.turtle;
  const colours = { P: shell, H: dark, R: dark, K: skin, e: dark };
  const x = Math.round(t.x);
  const up = Math.floor(time * 2) % 2;
  sprite(g, SHELLED.honu, colours, x, y, t.dir, 0, 3, k);
  const flipper = up ? FLIPPER.up : FLIPPER.down;
  sprite(g, flipper, colours, x, y, t.dir, 0, up ? 4 : 0, k);
  sprite(g, ["KK"], colours, x, y, t.dir, 1, 0, k);
}

// A ghost crab scuttling, its legs on row y. Its palette is crab: [shell, dark].
export function crabAt(g, c, y) {
  const [shell, dark] = g.pal.crab;
  const x = Math.round(c.x) - 4;
  const step = Math.floor(c.phase) % 2;
  for (const dx of [step ? 1 : 2, step ? 3 : 4, step ? 6 : 5, 7]) part(g, dark, x, y, 1, dx, 0, 1, 1);
  sprite(g, SHELLED.crab, { P: shell, R: dark, C: shell, e: "#1a1a1a" }, x, y, 1, 0, SHELLED.crab.length);
}

// Owls

// An owl flying straight at you, its wings rooted on its shoulders: B brown, S shade, F face, E eyes,
// K beak. Column 7 is the bird's centre; OWL_EYES is each pose's eye row.
const OWL_FLYING = {
  up: [
    "S.............S",
    "BB...........BB",
    ".BB..S...S..BB.",
    "..BBBFFFFFBBB..",
    "...BBFEFEFBB...",
    ".....FFKFF.....",
    ".....BBBBB.....",
    ".....BBBBB.....",
    "......SSS......",
  ],
  level: [
    ".....S...S.....",
    ".....FFFFF.....",
    ".BBBBFEFEFBBBB.",
    "BBSBBFFKFFBBSBB",
    "S....BBBBB....S",
    ".....BBBBB.....",
    "......SSS......",
  ],
  down: [
    ".....S...S.....",
    ".....FFFFF.....",
    "....BFEFEFB....",
    "..BBBFFKFFBBB..",
    ".BBSBBBBBBBSBB.",
    "BB...BBBBB...BB",
    "S.....SSS.....S",
  ],
};
const OWL_EYES = { up: 4, level: 2, down: 2 };
const OWL_BEAT = ["up", "level", "down", "level"];

// An owl flying straight at you: a pale face with two eyes, its wings beating up, level and down. `tufts`
// gives it ear tufts (a great horned owl). Perched (`perch`), it stands upright and now and then
// turns its head (`look` -1 or 1) or blinks. Its palette is owl: [brown, shade, face, eyes, beak].
export function owlAt(g, o, time, { look = 0, blink = false } = {}) {
  const [brown, shade, face, eyes, beak] = g.pal[o.pal ?? "owl"];
  const x = Math.round(o.x);
  const px = (colour, dx, dy, w, h) => part(g, colour, x, Math.round(o.y), 1, dx, dy, w, h);
  if (o.pose === "perch") {
    px(brown, -2, -8, 5, 8);
    px(shade, -2, -3, 1, 3);
    px(shade, 2, -3, 1, 3);
    px(shade, -1, -4, 1, 1);
    px(shade, 1, -2, 1, 1);
    px(face, -2 + look, -8, 5 - Math.abs(look), 3);
    if (!blink) {
      px(eyes, -1 + look, -7, 1, 1);
      if (look === 0) px(eyes, 1, -7, 1, 1);
    }
    px(beak, look, -6, 1, 1);
    if (o.tufts) {
      px(brown, -2, -9, 1, 1);
      px(brown, 2, -9, 1, 1);
    }
    px(beak, -1, 0, 1, 1);
    px(beak, 1, 0, 1, 1);
    return;
  }
  // Silent and unhurried: two slow wingbeats, then a glide.
  const u = (time + (o.phase ?? 0)) % 2;
  const pose = u < 1 ? OWL_BEAT[Math.floor(u / 0.125) % OWL_BEAT.length] : "level";
  const colours = { B: brown, S: shade, F: face, E: eyes, K: beak };
  sprite(g, OWL_FLYING[pose], colours, x, Math.round(o.y) - 1, 1, 7, OWL_EYES[pose]);
  if (o.tufts) {
    px(brown, -2, -4, 1, 1); // ear tufts over the ear marks
    px(brown, 2, -4, 1, 1);
  }
}

// Birds of prey

// Each is a pose grid. B is the dark plumage, L the pale underwing or head, R a rufous or white
// tail, K the beak or head, S silver flight feathers and W a white band.
const RAPTORS = {
  // A golden or bald eagle seen from the side, a slow flyer: a long wing angled up with fingered tips.
  // It mostly glides and now and then beats the wing down. L is the pale head, R the tail.
  eagleSide: {
    glide: [
      "B.B.B...........",
      ".BBBBB..........",
      "...BBBBB........",
      ".....BBBBB......",
      "RR...BBBBBBBLLKK",
      ".RBBBBBBBBBBB..K",
    ],
    flap: [
      "RR...BBBBBBBLLKK",
      ".RBBBBBBBBBBB..K",
      ".....BBBBB......",
      "...BBBBB........",
      ".BBBBB..........",
      "B.B.B...........",
    ],
    centre: [8, 4],
    flapCentre: [8, 0],
  },
  // A golden or bald eagle overhead: fingered wings, paler flight feathers, a fanned tail and the
  // head forward. It mostly glides and now and then beats its wings. A bald eagle's head (L) and tail
  // (R) are white.
  eagle: {
    glide: [
      "B.B.B...K...B.B.B",
      "BBBBBBBBLBBBBBBBB",
      ".SSBBBBBBBBBBBSS.",
      "...SSSBBBBBSSS...",
      ".......RRR.......",
      "......RRRRR......",
    ],
    flap: [
      "BB.............BB",
      "BSB...........BSB",
      ".BSB....K....BSB.",
      "..BSBBBBLBBBBSB..",
      "...BBBBBBBBBBB...",
      "....SSBBBBBSS....",
      ".......RRR.......",
      "......RRRRR......",
    ],
    centre: [8, 2],
    flapCentre: [8, 4],
  },
  // A red-tailed hawk soaring overhead, seen from below: the dark bar on the leading edge, pale
  // underwings, a streaked belly band and the rufous tail. It banks at the ends of its circle.
  hawk: {
    glide: [
      "B.............B",
      "BBLLBBBKBBBLLBB",
      ".BLLLLLLLLLLLB.",
      "..BLLLWWWLLLB..",
      "......RRR......",
      ".....RRRRR.....",
    ],
    bank: [
      "B..............",
      "BBLLBBBKBBB....",
      ".BLLLLLLLLLLBB.",
      "..BLLLWWWLLLLLB",
      "......RRR......",
      "......RRR......",
    ],
    centre: [7, 2],
    // The wingbeat, from the same view: wings up, level and swept down. The head and tail keep their
    // rows across all three, so the body holds still while the wings beat.
    up: [
      "BB...........BB",
      "BLB.........BLB",
      ".BLB.......BLB.",
      ".BLLBBBKBBBLLB.",
      "..BLLLLLLLLLB..",
      "...BLLWWWLLB...",
      "......RRR......",
      ".....RRRRR.....",
    ],
    level: [
      "...............",
      "...............",
      "...............",
      "BBBLLBBKBBLLBBB",
      ".BLLLLLLLLLLLB.",
      "..BLLLWWWLLLB..",
      "......RRR......",
      ".....RRRRR.....",
    ],
    down: [
      "...............",
      "...............",
      "...............",
      "....BBBKBBB....",
      "..BBLLLLLLLBB..",
      ".BLLLLWWWLLLLB.",
      "BL....RRR....LB",
      "B....RRRRR....B",
    ],
    poseCentre: [7, 4],
  },
  // A turkey vulture: wings held in a shallow V, black linings and silver flight feathers, a small
  // red head. It never flaps; it teeters from side to side.
  vulture: {
    glide: ["BB.............BB", "SSBB.........BBSS", "..SSBBB.K.BBBSS..", "....SSSBBBSSS....", ".......BBB......."],
    tilt: ["...............BB", "BB...........BBSS", "SSBBB...K.BBBSS..", "..SSSSSBBBSSS....", ".......BBB......."],
    centre: [8, 2],
  },
  // A crested serpent eagle soaring: dark, with a broad white band along the trailing edge of the
  // wings and across the tail.
  serpent: {
    glide: [
      "B...............B",
      "BBBBBBBBKBBBBBBBB",
      ".WWWWWWBBBWWWWWW.",
      "..B....BBB....B..",
      ".......WWW.......",
      "......BBBBB......",
    ],
    bank: [
      "B................",
      "BBBBBBBBKBBBBBB..",
      ".WWWWWWBBBWWWWBBB",
      "..B....BBB...WWW.",
      ".......WWW.......",
      "......BBBBB......",
    ],
    centre: [8, 2],
  },
};

// A bird of prey in flight, from `kind`'s grids. `bank` picks the second pose (a bank, a tilt or a
// wingbeat); `pose` names another of the kind's grids instead (the hawk's `up`, `level` and `down`).
// Its palette is [dark, pale, tail, beak or head, silver, white].
export function raptorAt(g, r, { bank = false, pose = null } = {}) {
  const set = RAPTORS[r.kind];
  const [dark, pale, tail, head, silver, white] = g.pal[r.pal ?? r.kind];
  const colours = { B: dark, L: pale, R: tail, K: head, S: silver, W: white };
  const second = set.flap ?? set.bank ?? set.tilt;
  const grid = pose ? set[pose] : bank ? second : set.glide;
  const [cx, cy] = pose ? (set.poseCentre ?? set.centre) : bank && set.flapCentre ? set.flapCentre : set.centre;
  sprite(g, grid, colours, Math.round(r.x), Math.round(r.y), r.dir, cx, cy);
}

// Long-necked birds

// One flying build, facing right as written, with the back on row 2. W is the body, S its under-shade,
// B and T the bill. The swan's neck is stretched out and up; the flamingo's is slimmer and lower, with
// a bent bill and L, its long legs trailing.
const SWAN_FLYING = [
  "................WWWBT",
  "............WWWWWW...",
  "..WWWWWWWWWWWWW......",
  "WWWWWWWWWWWWWW.......",
  "..SSSSSSSSSS.........",
];
const FLAMINGO_FLYING = [
  "................WWBT.",
  "............WWWWW..T.",
  "...WWWWWWWWWWW.......",
  "LLLLWWWWWWWWW........",
  "....SSSSSSSS.........",
];
const WING_SHOULDER = 9; // the body column a wing's `root` column sits on
// The wing they share through a beat: W along the leading edge, E along the trailing one. `rise` is
// how many rows above the back its top row sits; `root` is the wing column on the shoulder.
const WINGS = [
  {
    rise: 10,
    root: 5,
    grid: [
      "E........",
      "EE.......",
      "WEE......",
      "WWEE.....",
      ".WWWE....",
      ".WWWWW...",
      "..WWWWW..",
      "..WWWWWW.",
      "...WWWWW.",
      "...WWWWW.",
    ],
  },
  { rise: 4, root: 6, grid: ["EEEE......", "EWWWWWW...", ".EWWWWWW..", "..EWWWWW.."] },
  { rise: 1, root: 6, grid: ["EEWWWWWWW.", ".EEWWWWW.."] },
  {
    rise: -1,
    root: 6,
    grid: ["...WWWWWW.", "..EWWWWWW.", ".EEWWWWW..", "EEEWWW....", "EEEW......", "EE........"],
  },
];
const WING_BEAT = [0, 1, 2, 3, 2, 1]; // up, opening, level, down, level, rising
const WING_BOB = [1, 0, 0, -1, 0, 0]; // the body sinks as the wing lifts and rises on the downstroke

// A long-necked bird in flight at (x, y), its wing rooted on the shoulder through the whole beat.
function longNeckFlying(g, b, y, time, body, colours, wing) {
  const x = Math.round(b.x);
  const i = Math.floor(time * 6 + b.phase) % WING_BEAT.length;
  const { rise, root, grid } = WINGS[WING_BEAT[i]];
  const top = y + WING_BOB[i];
  sprite(g, body, colours, x, top, b.dir, WING_SHOULDER, 2);
  sprite(g, grid, wing, x, top - rise, b.dir, root, 0);
}

// A flamingo in flight: a pale pink body, a red wing with black flight feathers, its neck held out
// ahead and its legs trailing. Its palette is flamingo: [pink, wing, dark].
export function flamingoAt(g, b, time) {
  const [pink, wing, dark] = g.pal.flamingo;
  const y = Math.round(b.y + Math.sin(time * 1.2 + b.phase) * 2);
  const colours = { W: pink, S: wing, B: pink, T: dark, L: wing };
  longNeckFlying(g, b, y, time, FLAMINGO_FLYING, colours, { W: wing, E: dark });
}

// A swan standing or swimming (`stand`), feeding with its head down (`sit`) or flying (`fly`). A
// grey edge along its back keeps the white bird visible on a pale page. A whooper's bill is yellow
// at the base; a trumpeter's is all black. Its palette is swan: [white, shade, bill base, bill tip].
export function swanAt(g, s, time) {
  const [white, shade, base, tip] = g.pal[s.pal ?? "swan"];
  const x = Math.round(s.x);
  if (s.pose === "fly") {
    const y = Math.round(s.y + Math.sin(time * 1.1 + s.phase));
    const colours = { W: white, S: shade, B: base, T: tip };
    longNeckFlying(g, s, y, time, SWAN_FLYING, colours, { W: white, E: shade });
    return;
  }
  const y = feet(g, s);
  const step = Math.floor(s.phase) % 2;
  const px = (colour, dx, dy, w, h) => part(g, colour, x, y, s.dir, dx, dy, w, h);
  if (!s.swimming) {
    px(tip, 1 + step, -2, 1, 2);
    px(tip, 3 - step, -2, 1, 2);
  }
  px(white, 0, -6, 9, 4);
  px(shade, 1, -3, 7, 1);
  px(shade, 0, -7, 7, 1);
  px(white, -3, -7, 3, 2);
  px(shade, -3, -8, 2, 1);
  if (s.state === "sit") {
    px(white, 7, -7, 2, 3);
    px(white, 8, -5, 3, 2);
    px(base, 10, -5, 1, 1);
    px(tip, 11, -5, 1, 1);
    return;
  }
  px(white, 7, -11, 2, 5);
  px(shade, 7, -11, 1, 4);
  px(white, 8, -13, 3, 2);
  px(base, 10, -12, 1, 1);
  px(tip, 11, -12, 1, 1);
  px(tip, 9, -13, 1, 1);
}

// Small flyers

// One flying build, facing right as written, with the back on row 2 of each body, and one wing: teal
// or plain on the leading edge (t, p the pale patch), dark on the trailing one (d). `rise` is how many
// rows above the back a pose's top row sits; `root` is the wing column on the shoulder.
const FLYER_WINGS = [
  { rise: 5, root: 3, grid: ["d.....", "dd....", ".dt...", ".dpt..", "..ttt."] },
  { rise: 3, root: 4, grid: ["dd....", ".ddtt.", "..dptt"] },
  { rise: 1, root: 4, grid: ["dddtpt"] },
  { rise: -1, root: 3, grid: ["..tpt.", ".ddt..", "dd...."] },
];
const FLYER_BEAT = [0, 1, 2, 3, 2, 1]; // up, opening, level, down, level, rising
const FLYER_BOB = [1, 0, 0, -1, 0, 0]; // its body sinks as the wing lifts and rises on the downstroke

// Each member: its body and the column its wing roots on, its colours from its palette, how fast it
// beats, its wing's size (`k`), which poses it uses, and how it rises and falls as it goes.
// The generic small flyer: C crown, H head, E eye, K bill, T tail tip, b tail, B back and l breast, with
// the wing's t leading edge, p patch and d trailing edge, all from one palette object per kind.
const SMALL_BODY = ["........CC.", ".......HEHK", "TbbBBBBlll.", "...BBBBll.."];
const smallFlyer = (fps, sway) => ({
  body: SMALL_BODY,
  shoulder: 5,
  fps,
  sway,
  colours: (pal, kind) => [pal[kind], pal[kind]],
});

// Kessie's underside is white all the way along.
const KESSIE_BODY = ["........CC.", ".......HEHK", "TbbBBBBlll.", "...lllllll.."];

const FLYERS = {
  iiwi: smallFlyer(8, [1.8, 2]),
  kessie: { ...smallFlyer(8, [1.6, 2]), body: KESSIE_BODY },
  pigeon: smallFlyer(8, [1.5, 2]),
  lory: smallFlyer(10, [1.7, 2]),
  jay: smallFlyer(8, [1.7, 2]),
  bluebird: smallFlyer(8, [1.9, 2]),
  cardinal: smallFlyer(8, [1.6, 2]),
  swift: smallFlyer(12, [2.4, 2.5]),
  roller: {
    body: ["........aa.", ".......leaD", "Dbbttttlll.", "...ttttll.."],
    shoulder: 5,
    fps: 8,
    sway: [1.6, 2],
    colours: ({ roller: [lilac, teal, blue, dark], rollerDepth: [pale, deep, crown] }) => {
      const all = { l: lilac, t: teal, p: pale, b: blue, d: deep, a: crown, e: dark, D: dark };
      return [all, all];
    },
  },
  kingfisher: {
    body: ["........bb.", ".......bbeD", "bbbbbbbbww.", "...ooooo..."],
    shoulder: 5,
    fps: 8,
    sway: [9, 3],
    colours: ({ kingfisher: [blue, orange, bill, white] }) => [
      { b: blue, o: orange, D: bill, e: bill, w: white },
      { t: blue, p: white, d: bill },
    ],
  },
  tropicbird: {
    body: ["........ww.", ".......wkkY", "wwwwwwwwww.", "...sssss..."],
    shoulder: 5,
    fps: 8,
    sway: [1.4, 3],
    colours: ({ tropicbird: [white, black, bill, shade] }) => [
      { w: white, k: black, Y: bill, s: shade },
      { t: white, p: white, d: black },
    ],
  },
  puffin: {
    body: ["......kk..", ".....kwwYT", "kkkkkkwwY.", "..wwwww..."],
    shoulder: 4,
    fps: 16,
    beat: [2, 3],
    sway: [3, 2],
    colours: ({ puffin: [black, white, beak, tip] }) => [
      { k: black, w: white, Y: beak, T: tip },
      { t: black, p: black, d: black },
    ],
  },
  hornbill: {
    body: ["............ccy..", "..........wwkyyyy", "wwKwwkkkkkwwkk..y", "wwKwkkkkkkkkk...."],
    shoulder: 8,
    fps: 4,
    k: 1.3,
    sway: [4, 1.5],
    colours: ({ hornbill: [black, white, yellow, casque] }) => [
      { k: black, K: black, w: white, y: yellow, c: casque },
      { t: white, p: white, d: black },
    ],
  },
};

// A small flyer of `kind`, its wing rooted on the shoulder through the whole beat.
export function flyerAt(g, b, time, kind) {
  const f = FLYERS[kind];
  const phase = b.phase ?? 0;
  const [colours, wingColours] = f.colours(g.pal, kind);
  const beat = f.beat ?? FLYER_BEAT;
  const i = Math.floor(time * f.fps + phase) % beat.length;
  const wing = FLYER_WINGS[beat[i]];
  const k = f.k ?? 1;
  const [speed, reach] = f.sway;
  const x = Math.round(b.x);
  const y = Math.round(b.y + Math.sin(time * speed + phase) * reach) + FLYER_BOB[i];
  sprite(g, f.body, colours, x, y, b.dir, f.shoulder, 2);
  sprite(g, wing.grid, wingColours, x, y - Math.round(wing.rise * k), b.dir, wing.root, 0, k);
}

// A kingfisher in flight, blue over orange. Its palette is kingfisher: [blue, orange, bill, white].
export function kingfisherAt(g, b, time) {
  flyerAt(g, b, time, "kingfisher");
}
