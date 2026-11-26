// The birds in the air, built from parts: the birds of prey (soaring.js), the small flyers (smallbird.js
// and a simple flying build of their own), the puffins on their stack, and the night owls (owl.js).
// Each is drawn in its own coordinates, facing right and mirrored by `dir`, from the painter `g` and its
// state; a bird on a visit to a perch (perch.js) is drawn there.
import { doing } from "./critters.js";
import { drawFlight, drawPerch, flightPose, owlTones, SPECIES } from "./owl.js";
import { circlePose, rockOf, slowFlap, smallVisitAt, visitAt } from "./perch.js";
import { clamp, smooth, sprite } from "./pixel.js";
import { blendPose, flyingBird, movePose, puffinStand, SPECIES as SMALL } from "./smallbird.js";
import { frontBird, paint, SIDE_ORIGIN, sideBird, stoopPose } from "./soaring.js";

// Birds of prey

// The soaring birds, built from parts (soaring.js): the golden and bald eagles (kinds "golden" and "bald"),
// the red-tailed hawk ("hawk"), the turkey and African vultures ("vulture", "vultureAf") and the crested
// serpent eagle ("serpent"). An eagle crosses the page side-on (eagleFlyAt), gliding with a slow flap now and
// then. The others circle in one part of the sky, seen from below (circlerAt): they bank into each turn and
// ease level along the straight, and the vultures only rock from side to side, never flapping. The hawk now
// and then folds its wings and stoops (hawkAt). A bird of any of these kinds may end a flight by landing on a
// perch the scene offers (perch.js): it glides down with its wings open and its feet
// forward, perches for a while (looking about, blinking, preening, stretching a wing), then takes off and
// flies on, or rejoins its circle. Palettes: see soaring.js.
// A side-on eagle crossing the page: `b` is { x, y, dir, phase } from flyBy.
export function eagleFlyAt(g, kind, b, time) {
  if (g.trace) return g.trace.draw(eagleFlyAt, g, kind, b, time);
  if (b.visit && b.visit.mode !== "wait") return visitAt(g, kind, b, time);
  const calm = clamp((time - (b.calm ?? -Infinity)) / 2, 0, 1);
  const y = b.y + Math.sin(time * 1.2 + b.phase) * 2 * calm;
  paint(g, sideBird(g, kind, slowFlap(time, b.phase)), b.x, y, b.dir, SIDE_ORIGIN);
}

// A bird circling in one part of the sky, or perched or on its way to a perch.
export function circlerAt(g, kind, s, time) {
  if (g.trace) return g.trace.draw(circlerAt, g, kind, s, time);
  if (s.visit) return visitAt(g, kind, s, time);
  const c = circlePose(kind, s, time);
  paint(g, frontBird(g, kind, c.pose), c.x, c.y);
}

// A vulture or a few gliding together on a fly-by (a flock's members): each rocks on its own beat.
export function glideAt(g, kind, b, time) {
  if (g.trace) return g.trace.draw(glideAt, g, kind, b, time);
  if (b.visit && b.visit.mode !== "wait") return visitAt(g, kind, b, time);
  for (const m of b.members) {
    const y = b.y + m.up + Math.round(Math.sin(time * 0.9 + m.phase) * 2);
    paint(g, frontBird(g, kind, { bank: rockOf(time, m.phase) }), b.x - b.dir * m.back, y);
  }
}

// The red-tailed hawk: `h` is a circler with `stoop` ({ t, ... }, from desert.js) while it dives, where
// h.x and h.y are its place. The stoop closes its wings, falls, opens them at the bottom and beats back up.
export function hawkAt(g, h, time) {
  if (g.trace) return g.trace.draw(hawkAt, g, h, time);
  if (h.stoop) paint(g, frontBird(g, "hawk", stoopPose(h.stoop.t)), h.x, h.y);
  else circlerAt(g, "hawk", h, time);
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

const FLYERS = {
  pigeon: smallFlyer(8, [1.5, 2]),
  lory: smallFlyer(10, [1.7, 2]),
  crow: smallFlyer(6, [1.2, 2]),
};

// The small flyers on the bird build (smallbird.js): the kingfishers, jay, cardinal, bluebird, ʻiʻiwi and swift
// bound (a burst of flaps, then the wings fold and it glides over the top of an arc), the roller and tropicbird
// (its two streamers trailing) beat steadily, the hornbill beats slowly with fingered wings and the puffin whirs.
// The steady ones also rise and fall slowly as they go: [speed, reach].
const STEADY_SWAY = { roller: [1.6, 2], tropicbird: [1.4, 3], hornbill: [1.5, 2], puffin: [3, 2] };

// A small flyer of `kind` crossing the page ({ x, y, dir, phase }), or on a visit to a perch.
export function flyerAt(g, b, time, kind) {
  if (g.trace) return g.trace.draw(flyerAt, g, b, time, kind);
  if (SMALL[kind]) {
    if (b.visit && b.visit.mode !== "wait") return smallVisitAt(g, kind, b, time);
    const [speed, reach] = STEADY_SWAY[kind] ?? [0, 0];
    const phase = b.phase ?? 0;
    flyingBird(g, kind, b.x, b.y + Math.sin(time * speed + phase) * reach, b.dir, time, phase);
    return;
  }
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
  if (g.trace) return g.trace.draw(kingfisherAt, g, b, time);
  flyerAt(g, b, time, "kingfisher");
}

// The puffins' stack

// One nesting puffin (smallbird.js's template): `n` is a percher with the moves look, blink, bob, preen,
// stretch, turn (a hop round and back) and, on one of them, fish: it flies out over the fjord and comes
// back with a sand eel (`n.carrying`, the time it holds it until). At night it sleeps, head tucked. Its
// palette is puffin, with the sand eel's colour in eel.
export function nesterAt(g, n, time, night) {
  if (g.trace) return g.trace.draw(nesterAt, g, n, time, night);
  const y = n.y;
  const x = Math.round(n.x);
  if (night) {
    puffinStand(g, x, y, time, blendPose({ sleep: 1 }), { sleeping: true, dir: n.dir });
    return;
  }
  const trip = doing(n, "fish", time);
  if (trip >= 0) {
    // Out over the fjord and back: it leaves the stack, is gone a while, then lands.
    const away = trip < 0.15 ? trip / 0.15 : trip > 0.85 ? (1 - trip) / 0.15 : -1;
    if (away < 0) return;
    const out = smooth(away);
    const back = trip >= 0.5;
    flyingBird(
      g,
      "puffin",
      x + n.dir * out * 40,
      y - 6 - out * 18,
      back ? -n.dir : n.dir,
      time,
      0,
      back ? g.pal.eel : null,
    );
    return;
  }
  const moves = movePose({
    look: doing(n, "look", time),
    blink: doing(n, "blink", time),
    bob: doing(n, "bob", time),
    preen: doing(n, "preen", time),
    stretch: doing(n, "stretch", time),
    hop: doing(n, "turn", time),
  });
  const dir = moves.turned ? -n.dir : n.dir;
  puffinStand(g, x, y, time, moves.pose, { dir, eel: time < n.carrying ? g.pal.eel : null });
}

// Owls

// The night owls (owl.js): the great horned owl ("horned", the desert), the barred owl ("barred", the
// Smokies) and the short-eared owl ("shortEared", Iceland). A perched owl is a percher with the moves
// swivel (5.2 s), blink (0.7 s) and fluff (1.6 s); the pose is eased from how far through each it is,
// and it breathes all the while. Its palette is the scene's owl: [brown, shade, face, eyes, beak]; they
// only show at night, so the tones are the night ones.
export const OWL_MOVES = {
  swivel: { every: [4, 8], lasts: 5.2 },
  blink: { every: [2, 5], lasts: 0.7 },
  fluff: { every: [14, 26], lasts: 1.6 },
};
const owlRamp = (t, a, b) => smooth(clamp((t - a) / (b - a), 0, 1));

// The perched owl's pose { s, blink, fluff, shiver, breath } at `time`.
export function owlPerchPose(o, time) {
  const sw = doing(o, "swivel", time);
  const t = sw * OWL_MOVES.swivel.lasts;
  // Look to one side, swing across the face to the other, then come back to the front.
  const way = o.look ?? 1;
  const s = sw < 0 ? 0 : way * (0.9 * owlRamp(t, 0, 0.9) - 1.8 * owlRamp(t, 2.2, 3.5) + 0.9 * owlRamp(t, 4.2, 5.0));
  const bl = doing(o, "blink", time);
  const fl = doing(o, "fluff", time);
  const ft = fl * OWL_MOVES.fluff.lasts;
  const fluff = fl < 0 ? 0 : owlRamp(ft, 0, 0.3) * (1 - owlRamp(ft, 1.3, 1.6));
  return {
    s,
    blink: bl < 0 ? 0 : Math.sin(Math.PI * bl),
    fluff,
    shiver: fluff > 0.5 && ft < 1.4 ? Math.floor((ft - 0.3) * 14) + 1 : 0,
    breath: Math.sin(time * 2.2 + (o.phase ?? 0)) > 0.3 ? 1 : 0,
  };
}

export function owlPerchAt(g, o, time) {
  if (g.trace) return g.trace.draw(owlPerchAt, g, o, time);
  const t = owlTones(g.pal[o.pal ?? "owl"]);
  drawPerch(g, Math.round(o.x), Math.round(o.y), 1, t, SPECIES[o.species ?? "barred"], owlPerchPose(o, time));
}

// A flying owl from drift(): `b` is { x, y, dir, phase }; one soft beat, then a long glide.
export function owlFlyAt(g, b, time, species = "shortEared", night = true) {
  if (g.trace) return g.trace.draw(owlFlyAt, g, b, time, species, night);
  const sp = SPECIES[species];
  const t = owlTones(g.pal[b.pal ?? "owl"], night ? "dark" : "light");
  drawFlight(g, Math.round(b.x), Math.round(b.y), b.dir ?? 1, t, sp, flightPose(time + (b.phase ?? 0), sp));
}

const visitRole = (a) => (a?.visit?.mode === "perch" ? "perched" : "flyer");

export const FAMILIES = [
  {
    id: "soaring-birds",
    title: "Soaring birds",
    group: "Birds",
    differ: "size, colour, head",
    members: {
      hawk: { predator: true },
      "eagle-golden": { predator: true },
      "eagle-bald": { predator: true },
      vulture: { predator: true },
    },
    drivers: {
      eagleFlyAt: { member: (_a, args) => `eagle-${args[0]}`, role: visitRole, day: true },
      circlerAt: { member: (_a, args) => `eagle-${args[0]}`, role: visitRole, day: true },
      glideAt: {
        member: (_a, args) => args[0],
        role: (a) => (a?.visit && a.visit.mode !== "wait" ? visitRole(a) : a?.members ? "group" : "flyer"),
        day: true,
      },
      hawkAt: { role: "flyer", member: () => "hawk", day: true },
    },
  },
  {
    id: "small-flyers",
    title: "Small flyers",
    group: "Birds",
    differ: "size, colour, bill",
    drivers: {
      visitAt: { member: (_a, args) => args[0], role: visitRole, day: true },
      smallVisitAt: { member: (_a, args) => args[0], role: visitRole, day: true },
      flyerAt: { member: (_a, args) => args[args.length - 1], role: visitRole, day: true },
      kingfisherAt: { member: () => "kingfisher", role: visitRole, day: true },
      tropicbirdAt: { member: () => "tropicbird", role: visitRole, day: true },
      rollerAt: { role: "flyer", member: () => "roller", day: true },
      kessieAt: { role: "flyer", member: () => "kessie", day: true },
      puffinAt: { role: "flyer", member: () => "puffin", day: true },
      hornbillAt: { role: "flyer", member: () => "hornbill", day: true },
      nesterAt: {
        role: (a, args) => (a?.moves && doing(a, "fish", args[1] ?? 0) >= 0 ? "flyer" : "perched"),
        member: () => "puffin",
        day: false,
      },
      flockAt: { role: "group", member: () => "puffin flock", day: true },
      pairAt: { role: "group", member: () => "hornbill pair", day: true },
    },
  },
  {
    id: "owls",
    title: "Owls",
    group: "Birds",
    differ: "size, ear tufts",
    members: {
      owl: { predator: true },
    },
    drivers: {
      owlFlyAt: { role: "flyer", member: () => "owl", day: false },
      owlPerchAt: { role: "perched", member: () => "owl", day: false },
      owlHomeAt: {
        role: (_a, args) => (args.some((x) => x?.glide) ? "flyer" : "perched"),
        member: () => "owl",
        day: false,
      },
    },
  },
];
