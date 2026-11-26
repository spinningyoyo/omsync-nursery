// The cats, one family built from parts on body.js's drawBody: the specs of the lion and his cub, the
// cheetah, the cougar, the clouded leopard, the bobcat and the house cat, the house cat's coats, and the
// members' tones. felidAt (below) places and poses them.
//
// A spec is a body outline, legs that bend (or, on the small cats, step through four drawn poses), a
// curved tail, a haunch, and a face whose mouth opens. Members differ in size, colour, markings, ears
// and tail. `mid` is the column of the spec drawn at the cat's x, and `shadow` the columns its ground
// shadow spans.
import { drawBody, roarAt, STANCE, shade, tones, yawnAt } from "./body.js";
import { clamp, hash, mix, shadowColour, smooth } from "./pixel.js";
import { blinkAt, breathAt, ease, feet, paintAt, sinceOf, tonesFor } from "./place.js";

// What every small cat shares at rest.
const SMALL_REST = { sitChest: 1, headLie: 1, bowRise: 1, archRise: 2 };

// The lion, the family's model: a heavy body, a J-shaped tail with a dark tuft, and a mane that
// darkens away from his face and lifts with his head. He roars (roarAt) rather than yawns.
const LION = {
  id: "lion",
  len: 16,
  top: [
    [0, 10],
    [1, 12],
    [2, 13],
    [6, 13],
    [8, 12],
    [11, 12],
    [13, 13],
    [15, 13],
  ],
  bottom: [
    [0, 8],
    [1, 6],
    [2, 7],
    [5, 7],
    [6, 7],
    [7, 7],
    [9, 7],
    [12, 6],
    [15, 6],
  ],
  lit: 1,
  litFrom: 2,
  under: 1,
  chest: [8, 11],
  bob: 1,
  hind: { root: [4, 6], a: 3, b: 2.6, bend: -1, foot: 3, w: [3, 2, 2], stand: [-1, 1] },
  fore: { root: [13, 6], a: 3.5, b: 2.2, bend: 1, foot: 14, w: [3, 2, 2], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 5,
  lift: 2,
  paw: { h: 1, back: 0, fwd: 1 },
  tail: {
    points: [
      [0, 10],
      [-1.5, 4],
      [-3, 4],
    ],
    w: 1,
    sway: 1,
    tuft: [
      [0, 0, "n"],
      [0, 1, "n"],
    ],
  },
  mane: [
    [13.5, 10.5, 4.6, 6],
    [15, 13.5, 3.4, 3.4],
    [16.5, 9, 2.4, 2.4],
  ],
  maneFace: [17, 12],
  maneReach: 8,
  ragged: 1,
  jitter: 0.06,
  face: { at: [16, 15], grid: [".TE...", "TTTHH.", "TTeTHH", "TTTTPD", "STTPP.", ".SSPP."], open: 2, hinge: 3 },
  headUp: 1,
  haunch: [3.6, 3],
  sitPaw: 4,
  sitChest: 2,
  pawReach: 4,
  headLie: 2,
  bowRise: 2,
  mid: 9,
  shadow: [-2, 18],
};

// A lion cub of a few months (after side and front photos of Panthera leo cubs), the lion in small: his
// four tones and J of tail with a dark tuft, but a head nearly as wide as the chest and as tall as the
// body, big round ears set wide, short thick legs with big paws, and faint rosettes that fade as it grows,
// and no mane. Four rows of body on three of leg, so the legs step through the four drawn poses. A
// blend between two poses can leave a one-pixel hole under them, which `closeHoles` fills. The far legs
// stand directly behind the near ones (farShift 0): four 2-px legs in an 8-px body leave no room to
// stand apart without pinholes.
const CUB_SPOTS = new Set(["1,2", "3,2"]);
export const LION_CUB = {
  id: "cub",
  closeHoles: true,
  len: 8,
  top: [
    [0, 5],
    [1, 6],
    [7, 6],
  ],
  bottom: [
    [0, 3],
    [7, 3],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [0, 1],
  bob: 1,
  drawnLegs: true,
  reach: 1,
  // A full thigh: the hind leg is three wide where it leaves the body and two below.
  hind: { root: [1, 3], w: [3, 2], stand: [0, 2] },
  fore: { root: [7, 3], w: [2, 2], stand: [1, -2], fore: true },
  farShift: 0,
  stride: 3,
  lift: 1,
  paw: { h: 1, back: 0, fwd: 1 },
  tail: {
    points: [
      [0, 5],
      [-1, 3],
      [-0.5, 2],
    ],
    w: 1,
    sway: 1,
    tuft: [
      [0, 0, "n"],
      [0, 1, "n"],
    ],
  },
  // Faint rosettes: the shade tone on the base, a few over the rump and flank that the head does not
  // cover, and one on the near hind leg.
  coat: (x, dh, _depth, key, pal) => {
    if (key === "H" || !CUB_SPOTS.has(`${x},${dh}`)) return null;
    return key === "T" ? pal.S : null;
  },
  legCoat: (x, h, far, pal) => (!far && h === 1 && (x === 0 || x === 8) ? pal.S : null),
  face: {
    at: [4, 8],
    grid: ["TE..ET", "THHHHT", "TTTeTT", "TTTTPD", ".STPPP", "..SSP."],
    open: 1,
    hinge: 2,
  },
  headUp: 1,
  haunch: [2.4, 2.4],
  sitPaw: 2,
  sitChest: 0,
  pawReach: 0,
  headLie: 1,
  bowRise: 1,
  archRise: 1,
  mid: 5,
  shadow: [-1, 9],
};
// The same cub looking up at the rock: the muzzle tips up, so the nose and eye sit a row higher on the
// face and the jaw and throat show below it. The scene swaps one spec for the other (their ids differ,
// for the build's cache), so the head, ears and the lift that comes with them stay one piece.
export const LION_CUB_UP = {
  ...LION_CUB,
  id: "cub-up",
  face: { ...LION_CUB.face, grid: ["TE..ET", "THHeTT", "TTTTPD", ".STPPP", "..SSPP", "...SS."] },
};

// The cheetah (on the scale, body 13 long): the cougar's body and legs, solid spots down to the near
// legs, a small head with the tear line from below the eye to the corner of the mouth, and a long tail
// ringed to a pale tip.
const CHEETAH = {
  id: "cheetah",
  len: 13, // on the scale: 1.25 m -> 12.3 (11 to 14)
  top: [
    [0, 10],
    [1, 11],
    [2, 12],
    [5, 12],
    [7, 11],
    [11, 11],
    [12, 11],
  ],
  bottom: [
    [0, 8],
    [1, 7],
    [2, 6],
    [4, 6],
    [6, 7],
    [8, 7],
    [10, 6],
    [12, 6],
  ],
  lit: 1,
  litFrom: 2,
  under: 1,
  chest: [8, 11],
  bob: 1,
  hind: { root: [3, 7], a: 3.4, b: 3, bend: -1, foot: 2, w: [3, 2, 2], stand: [-1, 1] },
  fore: { root: [11, 6], a: 3.2, b: 2.4, bend: 1, foot: 11, w: [3, 2, 2], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 5,
  lift: 2,
  paw: { h: 1, back: 0, fwd: 1 },
  tail: {
    points: [
      [0, 10],
      [-3, 1],
      [-6, 3],
    ],
    w: 1,
    sway: 1,
    colour: (t) => (t < 0.5 ? "T" : Math.floor(t * 14) % 2 ? "D" : "T"),
    tuft: [
      [0, 0, "P"],
      [0, 1, "P"],
    ],
  },
  coat: (x, dh, _depth, key, pal) => (key !== "U" && dh % 2 === 1 && (x + dh) % 3 === 0 ? pal.D : null),
  legCoat: (x, h, far, pal) => (!far && h >= 3 && h <= 5 && (x + h) % 3 === 0 ? pal.D : null),
  face: {
    at: [11, 13],
    grid: ["..T.T...", ".THHHH..", ".TTTTeT.", ".TTTTTPD", "..STTDPP", "...SSD.."],
    open: 2,
    hinge: 2,
  },
  headUp: 1,
  haunch: [3, 3],
  sitPaw: 3,
  sitChest: 2,
  pawReach: 3,
  headLie: 2,
  bowRise: 2,
  mid: 7,
  shadow: [-1, 14],
};

// The cougar: plain tawny, a small head on a long body, the hindquarters a little above the
// shoulders, a white muzzle and throat, and a heavy tail hanging low with a dark tip hooked up.
const COUGAR = {
  ...CHEETAH,
  id: "cougar",
  tail: {
    points: [
      [0, 10],
      [-4, 0],
      [-7, 3],
    ],
    w: 2,
    sway: 1,
    colour: (t, k) => (t > 0.86 ? "D" : k === 0 ? "S" : "T"),
    tuft: [
      [0, 0, "D"],
      [1, 0, "D"],
    ],
  },
  coat: undefined,
  legCoat: undefined,
  face: {
    at: [11, 13],
    grid: ["..T.T..", ".THHHH.", ".TTTTeT", ".TTTTTPD", "..STPPP", "...SPP."],
    open: 2,
    hinge: 2,
  },
  mid: 7,
  shadow: [-2, 14],
};

// The clouded leopard: long and low on short, thick legs, black-rimmed clouds, and a ringed tail as
// long as its body that sags and turns up at the dark tip.
const CLOUDED = {
  id: "clouded",
  ...SMALL_REST,
  len: 11,
  top: [
    [0, 5],
    [1, 6],
    [2, 7],
    [10, 7],
  ],
  bottom: [
    [0, 3],
    [2, 3],
    [10, 3],
  ],
  lit: 1,
  litFrom: 2,
  under: 1,
  chest: [7, 9],
  bob: 1,
  drawnLegs: true,
  reach: 1,
  hind: { root: [2, 3], w: [2, 2], stand: [0, 1] },
  fore: { root: [9, 3], w: [2, 2], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 4,
  lift: 1,
  paw: { h: 1, back: 0, fwd: 1 },
  tail: {
    points: [
      [0, 5],
      [-6, 0],
      [-12, 4],
    ],
    w: 2,
    thick: "h",
    sway: 1,
    colour: (t, k) => (t > 0.3 && Math.floor(t * 12) % 2 ? "D" : k === 1 ? "T" : "S"),
    tuft: [
      [0, 0, "D"],
      [0, 1, "D"],
    ],
  },
  coat: (x, dh, depth, key, pal) => {
    if (key === "U" || dh < 1 || dh >= depth || x < 2 || x > 9) return null;
    const band = Math.floor((dh - 1) / 2);
    const v = (dh - 1) % 2;
    const u = (x + band * 3) % 6;
    if (u === 0) return null;
    if (u === 1 || u === 5 || v === 1) return pal.D;
    return pal.S;
  },
  legCoat: (x, h, far, pal) => (!far && h === 1 && x % 2 === 0 ? pal.D : null),
  face: {
    at: [9, 9],
    grid: ["..T.T..", ".THHHH.", "TTDTeTT", "TTTTTPD", ".STTPP.", "..SSP.."],
    open: 1,
    hinge: 2,
  },
  headUp: 1,
  haunch: [2.4, 2.2],
  sitPaw: 3,
  pawReach: 3,
  mid: 6,
  shadow: [-3, 13],
};

// The bobcat: long in the leg with its rump a little high, ear tufts, a pale ruff, small spots, a
// white belly and a bobbed tail, black above and white below.
const BOBCAT = {
  id: "bobcat",
  ...SMALL_REST,
  len: 11,
  top: [
    [0, 7],
    [1, 8],
    [5, 8],
    [10, 7],
  ],
  bottom: [
    [0, 5],
    [1, 4],
    [9, 4],
    [10, 4],
  ],
  lit: 1,
  litFrom: 2,
  under: 1,
  chest: [6, 9],
  bob: 1,
  drawnLegs: true,
  reach: 2,
  hind: { root: [2, 4], w: [2, 1], stand: [0, 1] },
  fore: { root: [9, 4], w: [2, 1], stand: [1, -2], fore: true },
  farShift: 1,
  stride: 3,
  lift: 1,
  paw: { h: 1, back: 0, fwd: 0 },
  tail: {
    points: [
      [0, 7],
      [-1, 8],
      [-2, 8],
    ],
    w: 1,
    sway: 0.4,
    colour: (t) => (t > 0.5 ? "D" : "T"),
    tuft: [[0, -1, "P"]],
  },
  coat: (x, dh, _depth, key, pal) => (key !== "U" && key !== "H" && x > 0 && hash(x, dh, 3) < 0.16 ? pal.D : null),
  legCoat: (x, h, far, pal) => (!far && h === 2 && hash(x, h, 4) < 0.5 ? pal.D : null),
  face: {
    at: [9, 11],
    grid: ["..D.D..", "..T.T..", ".THHHT.", "PTTTeT.", "PPTTTPD", ".PPTPP."],
    open: 1,
    hinge: 2,
  },
  headUp: 1,
  haunch: [2.2, 2.2],
  sitPaw: 2,
  pawReach: 2,
  mid: 6,
  shadow: [-1, 13],
};

// The house cat: small, its tail held up with the tip curled forward, its coat picked from CAT_COATS
// when the scene loads. Its coat names regions: A ears, H the cap, M the face, K the tail, B a patch
// on the back, Y the haunch, the tabby's stripes W (X and Z where they cross the patches), and L and
// l the near and far legs.
const HOUSECAT = {
  id: "housecat",
  ...SMALL_REST,
  len: 8,
  top: [
    [0, 5],
    [1, 6],
    [7, 6],
  ],
  bottom: [
    [0, 3],
    [7, 3],
  ],
  lit: 1,
  litFrom: 2,
  under: 1,
  chest: [4, 6],
  bob: 1,
  coatLegs: true,
  drawnLegs: true,
  reach: 1,
  hind: { root: [1, 3], w: [1, 1], stand: [0, 1] },
  fore: { root: [6, 3], w: [1, 1], stand: [0, -2], fore: true },
  farShift: 1,
  stride: 2,
  lift: 1,
  paw: { h: 1, back: 0, fwd: 0 },
  tail: {
    points: [
      [0, 6],
      [-2, 7],
      [-1, 10],
    ],
    w: 1,
    sway: 0.6,
    colour: () => "K",
    tuft: [[1, 0, "K"]],
  },
  coat: (x, dh, depth, key, pal) => {
    if (key === "U") return null;
    const stripe = x % 2 === 1;
    let base = stripe ? pal.W : pal.T;
    if (x <= 2) base = stripe ? pal.Z : pal.Y;
    else if (x <= 5 && dh >= depth - 1) base = stripe ? pal.X : pal.B;
    return base === pal.T ? null : shade(base, key);
  },
  face: { at: [6, 8], grid: [".A.A", "HHHH", "HMeM", "MMMD", "MPPP"], eye: "e", lid: "M", open: 1, hinge: 2 },
  headUp: 1,
  haunch: [1.8, 1.8],
  sitPaw: 2,
  pawReach: 2,
  mid: 4,
  shadow: [-1, 10],
};

// The house cat's coats, after the owner's reference sheet; a scene picks one as it loads. Each names its colours: catCoat, shade
// (a grey edge on a white cat), pale chest and muzzle, nose, eye, and the regions the grid names.
const catCoat = ({ T, S, P = T, D, e, A = T, H = T, M = T, K = T, B = T, Y = T, stripe = T, L = T, l = S }) => ({
  T,
  S,
  P,
  D,
  e,
  A,
  H,
  M,
  K,
  B,
  Y,
  X: stripe === T ? B : stripe,
  Z: stripe === T ? Y : stripe,
  W: stripe,
  L,
  l,
});
const CAT_WHITE = "#f6f3ee";
const CAT_COATS = {
  white: catCoat({ T: CAT_WHITE, S: "#bdb8c0", D: "#d88f98", e: "#5a9ae0", A: "#e8b4ba" }),
  "silver-tabby": catCoat({
    T: "#a4a4aa",
    S: "#76767e",
    P: "#ecebe8",
    D: "#4a3a3a",
    e: "#c9b840",
    stripe: "#5c5c64",
    K: "#8a8a92",
  }),
  "orange-white": catCoat({
    T: CAT_WHITE,
    S: "#bdb8c0",
    D: "#d88f98",
    e: "#5a9a3a",
    A: "#e88a2a",
    H: "#e88a2a",
    K: "#e88a2a",
    Y: "#e88a2a",
  }),
  siamese: catCoat({
    T: "#dccbb6",
    S: "#b4a08a",
    P: "#ece0d0",
    D: "#3a2a28",
    e: "#4a8ad0",
    A: "#4e3e3a",
    H: "#4e3e3a",
    M: "#5e4a44",
    K: "#4e3e3a",
    L: "#5e4a44",
    l: "#46363a",
  }),
  black: catCoat({ T: "#24222a", S: "#16141a", D: "#3a3440", e: "#e2c43a" }),
  ginger: catCoat({
    T: "#f0a040",
    S: "#c87a28",
    P: "#f8dcb0",
    D: "#c87060",
    e: "#5a9a3a",
    stripe: "#d07a22",
    K: "#e08a30",
  }),
  calico: catCoat({
    T: CAT_WHITE,
    S: "#bdb8c0",
    D: "#d88f98",
    e: "#5a9a3a",
    A: "#2e2826",
    H: "#e07a2a",
    K: "#2e2826",
    B: "#2e2826",
    Y: "#e07a2a",
  }),
  grey: catCoat({ T: "#86868e", S: "#62626a", D: "#c88a92", e: "#e2c43a", A: "#a0a0a8" }),
  tortie: catCoat({
    T: "#2c2422",
    S: "#1c1614",
    D: "#3a2c2a",
    e: "#5a9a3a",
    H: "#b8641e",
    B: "#2c2422",
    Y: "#b8641e",
    stripe: "#8a4a1c",
    K: "#2c2422",
  }),
  tuxedo: catCoat({
    T: "#2a2a30",
    S: "#d8d6da",
    P: CAT_WHITE,
    D: "#d88f98",
    e: "#e2c43a",
    M: CAT_WHITE,
    L: CAT_WHITE,
    l: "#bdb8c0",
  }),
  "brown-tabby": catCoat({
    T: "#a8865e",
    S: "#86684a",
    P: "#ead8b6",
    D: "#3a2a22",
    e: "#5e8a3a",
    stripe: "#5a4230",
    K: "#7a5c3e",
  }),
};

export const FELIDS = {
  lion: LION,
  cub: LION_CUB,
  cheetah: CHEETAH,
  cougar: COUGAR,
  clouded: CLOUDED,
  bobcat: BOBCAT,
  housecat: HOUSECAT,
};
// The house cat's coat names, for a scene to pick from as it loads, and their palettes, keyed
// housecat-<name>, to spread into the scene's day and night palettes. At night the near-black coats
// are lifted off the dark page and every cat's eyes stay lit.
export const HOUSECAT_COAT_NAMES = Object.keys(CAT_COATS);
export const HOUSECAT_COATS = { light: {}, dark: {} };
for (const [name, pal] of Object.entries(CAT_COATS)) {
  HOUSECAT_COATS.light[`housecat-${name}`] = pal;
  const dark = Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, nightColour(v)]));
  for (const k of Object.keys(pal)) {
    if (["#24222a", "#2c2422", "#2a2a30", "#2e2826"].includes(pal[k])) dark[k] = "#3e3c4a";
  }
  dark.e = pal.e;
  HOUSECAT_COATS.dark[`housecat-${name}`] = dark;
}

// A coat colour at night: darkened and cooled toward the scenes' indigo.
function nightColour(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const cool = [58, 53, 96];
  const out = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * 0.62 + cool[i] * 0.22));
  return `#${out.map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("")}`;
}

// A member's tones from its scene palette: the four coat tones, the far legs,
// and an open mouth's colours. The lion's scene gives his own tones; the cheetah's belly is near
// white, the bobcat's white, and a one-colour house cat takes a sheen toward white.
export function felidTones(kind, pal) {
  const mouth = { R: mix(pal.D, "#b84848", 0.6), f: mix(pal.P ?? pal.T, "#ffffff", 0.5) };
  let out;
  if (kind === "housecat") {
    const H = pal.P !== pal.T ? mix(pal.T, pal.P, 0.35) : mix(pal.T, "#ffffff", 0.15);
    out = { ...tones(pal, { H, U: mix(pal.S, "#000000", 0.15) }), ...mouth };
  } else if (pal.H) out = { ...pal, ...mouth };
  else if (kind === "cheetah")
    out = { ...tones(pal, { H: mix(pal.T, pal.P, 0.2), U: mix(pal.P, pal.S, 0.35) }), ...mouth };
  else if (kind === "bobcat") out = { ...tones(pal, { U: mix(pal.P, pal.S, 0.25) }), ...mouth };
  else out = { ...tones(pal), ...mouth };
  return out;
}

// Cats

// Built from parts (felid.js, on body.js): the lion, his cub, the cheetah, the cougar, the clouded
// leopard, the bobcat and the house cat. Each walks with a four-beat walk, its feet planted, and rests
// in one of its poses (felidPoses): sitting, the arched back (the smaller cats only), lying down and
// the long stretch, easing into each. At rest the cats yawn now and then; the lion roars when his scene
// calls for it.
// The arched back reads as a camel's hump on the long-bodied big cats, so only the smaller cats arch.
const FELID_ARCHES = new Set(["clouded", "bobcat", "housecat"]);

// The poses a cat of `kind` rests in, for a walker to choose from when it stops.
// The house cat also loafs, curls up asleep, dozes with its head on its paws and grooms.
export const felidPoses = (kind) => {
  if (kind === "housecat") return ["sit", "arch", "lie", "bow", "loaf", "curl", "doze", "groom"];
  return FELID_ARCHES.has(kind) ? ["sit", "arch", "lie", "bow"] : ["sit", "lie", "bow"];
};

// The poses only play sets (catPlayAt): the swat, the stalking crouch and the leap.
const HOUSECAT_PLAY = ["swat", "crouch", "leap"];
const posesOf = (kind) => (kind === "housecat" ? [...felidPoses(kind), ...HOUSECAT_PLAY] : felidPoses(kind));
const ASLEEP = new Set(["curl", "doze"]);

// Grooming, g seconds in: four quick licks at the raised paw, then a pause.
function lickAt(g) {
  const u = g % 2.4;
  if (u >= 1.6) return { headUp: 0 };
  return { headUp: Math.floor(u * 5) % 2 ? 0.6 : 0, mouth: Math.floor(u * 5) % 2 ? 0 : 1, eyesShut: true };
}

// Two house cats at play, `t` seconds into a bout of PLAY_SECONDS, the first starting at x0 facing
// `dir` and the second 28 px on, facing it: the first creeps up in its crouch, wiggles, leaps; the two
// trade swats; then the second bolts and the first chases. Returns the two cats' fields (x, dir,
// state, pose, rest, lift, steps, and age, the seconds since that state began) for felidAt, the
// caller adding kind, coat, y and since (its clock less the age).
export const PLAY_SECONDS = 8;
export function catPlayAt(t, x0, dir = 1) {
  const swat = (u) => ({ from: "sit", to: "swat", u });
  const hold = (pose) => ({ from: pose, to: pose, u: 1 });
  const at = (dx) => x0 + dir * dx;
  const b = { x: at(28), dir: -dir, state: "rest", pose: "sit", age: 10 };
  let a;
  if (t < 2) a = { x: at(t * 4), dir, state: "walk", pose: "crouch", rest: hold("crouch"), age: 10 };
  else if (t < 3) {
    const wiggle = Math.round(Math.sin((t - 2) * 18) * 0.5);
    a = { x: at(8 + wiggle), dir, state: "rest", pose: "crouch", rest: hold("crouch"), age: 10 };
  } else if (t < 3.6) {
    const u = (t - 3) / 0.6;
    a = {
      x: at(8 + u * 10),
      dir,
      state: "rest",
      pose: "leap",
      rest: hold("leap"),
      lift: Math.round(Math.sin(Math.PI * u) * 6),
      steps: { fore: 0, hind: 2 },
      age: 10,
    };
    Object.assign(b, { pose: "swat", rest: swat(smooth(clamp((t - 3.2) / 0.3, 0, 1))) });
  } else if (t < 5.6) {
    const k = Math.sin((t - 3.6) * 7);
    a = { x: at(18), dir, state: "rest", pose: "swat", rest: swat(smooth(clamp(k, 0, 1))), age: 10 };
    Object.assign(b, { pose: "swat", rest: swat(smooth(clamp(-k, 0, 1))) });
  } else {
    const u = t - 5.6;
    a = { x: at(18 + Math.max(0, u - 0.4) * 9), dir, state: "walk", pose: "sit", age: u };
    Object.assign(b, { x: at(28 + u * 9), dir, state: "walk", age: u });
  }
  return [a, b];
}

// A quick tail flick now and then, a few seconds apart for each cat: the sway it adds.
const flickAt = (time, seed) => {
  const u = (time + seed * 7.3) % 5.5;
  return u < 0.6 ? Math.sin(u * 21) * 1.6 : 0;
};

// A member's tones, made once per palette and kind (felidTones, felid.js).
function tonesOf(kind, pal) {
  return tonesFor(pal, `felid:${kind}`, () => felidTones(kind, pal));
}

const EASE = 0.25; // seconds a walk takes to start or stop
const SETTLE = 0.5; // seconds a cat takes to settle into a rest pose, after it stops
const RISE = 0.4; // seconds it takes to get up again
const YAWN_EVERY = 9; // seconds between yawns at rest, the first a few seconds after it settles

// A cat of `kind` (lion, cheetah, cougar, clouded, bobcat or housecat), x at the middle of its body.
// It walks, stands, or rests in c.pose ("sit" when none is set) while its state is not "walk",
// easing between them from c.since (the time its state last changed; see settle in critters.js),
// out of c.lastPose as it gets up. At rest it breathes, blinks and yawns now and then; while c.roar
// holds the seconds into a roar, it stands and roars. A scene can also set c.rest ({ from, to, u }, a
// blend it times itself), c.lift (px off the ground, its shadow left below) and c.steps (the legs
// held in drawn poses, see drawBody). A lively cat (c.lively, every house cat unless it says no)
// flicks its tail and twitches an ear now and then; asleep (curl, doze) it shuts its eyes and breathes slow, and grooming it licks its paw.
export function felidAt(g, c, time) {
  if (g.trace) return g.trace.draw(felidAt, g, c, time);
  const spec = FELIDS[c.kind];
  const pal = tonesOf(c.kind, g.pal[c.pal ?? c.kind]);
  const dir = c.dir;
  const since = sinceOf(c, time);
  const walking = c.state === "walk";
  const resting = !walking && c.state !== "stand" && c.roar == null;
  const name = posesOf(c.kind).includes(c.pose) ? c.pose : "sit";
  const asleep = resting && ASLEEP.has(name);
  let rest = null;
  if (c.rest) rest = c.rest;
  else if (resting) rest = { from: "stand", to: name, u: (since - EASE * 0.6) / SETTLE };
  else if (walking && c.lastPose && since < RISE) rest = { from: c.lastPose, to: "stand", u: since / RISE };
  let act = null;
  if (c.roar != null) act = roarAt(c.roar);
  else if (asleep) act = { eyesShut: true };
  else if (resting && name === "groom" && since > SETTLE) act = lickAt(since - SETTLE);
  else if (resting && since > 3) act = yawnAt((since - 3) % YAWN_EVERY);
  const seed = c.seed ?? 0;
  const lively = c.lively ?? c.kind === "housecat";
  const flick = lively && !walking && !asleep ? flickAt(time, seed) : 0;
  const earFlick = lively && (time + seed * 3.1) % 4.3 < 0.2;
  const phase = walking ? (c.x * dir) / (spec.stride / STANCE) : 0;
  const pose = {
    phase,
    amp: ease(walking, since, EASE),
    bodyX: c.x * dir,
    rest,
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.75 : asleep ? 0 : Math.sin(time * 1.4) * 0.6 + flick,
    breath: breathAt(time, asleep ? 1.1 : 2.2, !walking),
    blink: !act && blinkAt(time, c.since ?? 0, 3.3),
    headUp: 0,
    earFlick,
    steps: c.steps ?? null,
    ...(act ?? {}),
  };
  // spec.mid is the column at its x. Its shadow covers the columns from s0 up to s1 facing right, and
  // the same edges mirrored (from s0 + 1 to s1) facing left.
  const [s0, s1] = spec.shadow;
  const shadow = { colour: shadowColour(g.pal), span: dir > 0 ? [s0, s1 - 1] : [s0 + 1, s1] };
  const x = Math.round(c.x) - dir * spec.mid;
  paintAt(g, x, feet(g, c), dir, (plot) => drawBody(spec, pal, plot, pose), shadow, c.lift ?? 0);
}

export const FAMILY = {
  id: "cats",
  title: "Cats",
  group: "Animals",
  differ: "size, mane, colour, markings, ears, tail",
  members: {
    cat: { spec: FELIDS.housecat, realLength: 0.46, predator: true },
    bobcat: { spec: FELIDS.bobcat, realLength: 0.8, predator: true },
    "clouded-leopard": { spec: FELIDS.clouded, realLength: 0.9, predator: true },
    cheetah: { spec: FELIDS.cheetah, realLength: 1.25, predator: true },
    cougar: { spec: FELIDS.cougar, realLength: 1.3, predator: true },
    lion: { spec: FELIDS.lion, realLength: 2.0, predator: true },
  },
  drivers: {
    felidAt: {
      role: "walker",
      member: (a) => (a.kind === "clouded" ? "clouded-leopard" : a.kind === "housecat" ? "cat" : a.kind),
    },
    lionAt: { role: "walker", member: () => "lion" },
    cubAt: { role: "walker", member: () => "cub" },
  },
};
