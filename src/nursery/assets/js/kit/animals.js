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
// so a scene can keep two variants of one family apart. Each driver (an `...At` function) works out
// its pose and hands it to place.js's paintAt, which lays the build's cells on the page over the
// ground shadow, in the scene's groundShadow colour. The birds in the air are in flyers.js, their
// visits to a perch in perch.js, and the cats' specs and coats in felid.js.
import {
  STANCE as BEAR_STANCE,
  BLACK,
  bearTones,
  CUB,
  climbAt,
  drawBear,
  drawClimb,
  GRIZZLY,
  grizzlyTones,
} from "./bear.js";
import { BEASTS, beastFrame, beastTones, drawBeast, harePoses } from "./beast.js";
import { drawBody, roarAt, STANCE, yawnAt } from "./body.js";
import { BIGHORN, BISON, bisonTones, CALF, calfTones, drawBovid, RAM_TURN_HEAD, sheepTones } from "./bovid.js";
import {
  ARCTIC,
  STANCE as CANID_STANCE,
  COYOTE,
  dogTones,
  drawDog,
  howlAt,
  PUP,
  pounceAt,
  RED,
  WOLF,
  YEARLING,
} from "./canid.js";
import { castPose, castTones, drawCast, drawLooseBalloon, swarmAt as drawSwarm } from "./cast.js";
import { doing, stride } from "./critters.js";
import {
  boundRise,
  bugleAt,
  GAITS as DEER_GAITS,
  DEER_SPECS,
  drawDeer,
  elkTones,
  pronghornTones,
  reindeerTones,
  whitetailTones,
} from "./deer.js";
import {
  AFRICAN,
  AFRICAN_CALF,
  ASIAN,
  ASIAN_CALF,
  CURL,
  curlAt,
  DUST,
  drawElephant,
  dustAt,
  STANCE as ELEPHANT_STANCE,
  elephantTones,
  TRUMPET,
  trumpetAt,
} from "./elephant.js";
import { FELIDS, felidTones } from "./felid.js";
import { drawGiraffe, GIRAFFE, GAIT as GIRAFFE_GAIT, giraffeTones, muzzleAt } from "./giraffe.js";
import {
  CYCLE,
  drawBird as drawGroundBird,
  MEMBERS as GROUND_MEMBERS,
  groundTones,
  restPose,
  restPoses,
  STRUT,
  speedOf,
} from "./groundbird.js";
import {
  drawHorse,
  EEYORE,
  eeyoreTones,
  FOAL,
  GAIT as HORSE_GAIT,
  dustAt as horseDustAt,
  ZEBRA,
  zebraTones,
} from "./horse.js";
import {
  drawFlamingo,
  drawSwan,
  flamingoFly,
  flamingoRest,
  flamingoTones,
  flamingoWade,
  mixPose,
  ring,
  SWAN_RESTS,
  SWAN_SPEED,
  swanFly,
  swanRest,
  swanSwim,
  swanTones,
  swanWalk,
  wake,
} from "./longneck.js";
import { drawPig, legClock, restPose as pigRest, pigTones, walkPose as pigWalk, WALLOW_SECONDS } from "./pig.js";
import { hash, shadowColour, smooth } from "./pixel.js";
import { blinkAt, breathAt, ease, feetSpan, paintAt, plotter, sinceOf, tonesFor } from "./place.js";
import {
  CALL_SECONDS,
  drawPrimate,
  GIBBON,
  REACH as GIBBON_REACH,
  gibbonCallAt,
  gibbonLeap,
  gibbonSwing,
  gibbonTones,
  HOP,
  LANGUR,
  langurHop,
  langurPose,
  langurTones,
  MACAQUE,
  macaquePose,
  macaqueTones,
  REACH_SECONDS,
  reachAt,
} from "./primate.js";
import {
  baskAt,
  CRAB,
  CRAB_POSES,
  CRAWL,
  crabFrame,
  crabTones,
  crawlAt,
  drawBuzz,
  drawCrab,
  drawGrains,
  drawHatchling,
  drawHonu,
  drawSnake,
  drawTortoise,
  HATCHLING,
  HONU,
  hatchTones,
  honuTones,
  SNAKE_POSES,
  SNAKE_UNITS,
  snakeFrame,
  snakeTones,
  strokeAt,
  swimAt,
  TORTOISE,
  TORTOISE_POSES,
  tortoiseFrame,
  tortoiseTones,
} from "./shell.js";
import {
  BOUND_CYCLE,
  boundBeat,
  boundX,
  drawOtter,
  drawSeal,
  drawWhale,
  otterRest,
  otterTones,
  SEAL_CYCLE,
  SEAL_ROLL_SECONDS,
  sealCycle,
  sealRest,
  sealTones,
} from "./swimmer.js";

// The row an animal's feet stand on: the soil line, or a perch's top when it has a `y`.
const feet = (g, a) => a.y ?? g.groundY + 7;

// Bears

// Built from parts (bear.js): the black bear, the grizzly (kind "grizzly") and the cub (`cub` true).
// A bear walks with its feet planted, eases to a stop and rests in the pose rest() picked as it
// stopped (bearPoses: foraging with its head down and its whole front sloping to the ground, sitting
// up on its rump, lying, or reared up to sniff the air, or just standing and looking about); standing
// it breathes, blinks and now and then lifts its head. State "rear" is the sniff the scene times: it
// rears up (the nose lifting in bursts, faint wisps of air drifting in to it) and eases back down by
// the end of b.timer, the seconds it has left. b.since (settle, critters.js) is when its state
// changed; b.pose names a pose to show on demand (with since and timer set). A cub whose b.climb is
// { t, lead, up, hold, down, tail, height } (seconds into the climb, and the tree's height in px) is
// on a trunk: x is where the cub stood, and the bark is 7 px in front of it. Its palette is the
// scene's array under b.pal or "bear" ([coat, sheen, muzzle, nose, legs]) with the scene's groundShadow
// and bearScent beside it.
const BEAR_SPECS = { black: BLACK, grizzly: GRIZZLY };
const BEAR_EASE = 0.3; // seconds a walk takes to start or stop
const BEAR_POSE = 0.7; // seconds it takes to go down to a pose or come up from it
const BEAR_POSES = new Set(["stand", "forage", "sit", "lie", "rear"]);

// The poses a bear rests in as it stops (for rest(), critters.js): the cub does not lie or rear.
export const bearPoses = (b) =>
  b.cub ? ["stand", "forage", "sit"] : ["forage", "forage", "stand", "sit", "lie", "rear"];

export function bearAt(g, b, time = 0) {
  if (g.trace) return g.trace.draw(bearAt, g, b, time);
  const spec = b.cub ? CUB : (BEAR_SPECS[b.kind] ?? BLACK);
  const colours = g.pal[b.pal ?? "bear"];
  const grizzly = b.kind === "grizzly";
  const pal = tonesFor(colours, grizzly ? "grizzly" : "bear", () => (grizzly ? grizzlyTones : bearTones)(colours));
  pal.scent = g.pal.bearScent;
  const since = sinceOf(b, time);
  const walking = b.state === "walk";
  const left = b.timer ?? 100;
  const bodyX = b.x * b.dir;
  let pose = {
    phase: bodyX / (spec.stride / BEAR_STANCE),
    bodyX,
    amp: ease(walking, since, BEAR_EASE),
    breath: breathAt(time, 2.2, !walking),
    blink: blinkAt(time, b.phase ?? 0, 3.2),
  };
  let climbing = null;
  if (b.climb) {
    const c = climbAt(b.climb);
    if (c.rest) pose = { ...pose, bodyX: null, amp: 0, phase: 0, rest: c.rest, breath: 0 };
    else climbing = c;
  } else if (!walking) {
    const name = b.state === "rear" ? "rear" : BEAR_POSES.has(b.pose) ? b.pose : "stand";
    const u = Math.max(0, Math.min(1, (since - BEAR_EASE * 0.8) / BEAR_POSE, left / BEAR_POSE));
    if (name !== "stand") pose.rest = { from: "stand", to: name, u };
    const held = u >= 1;
    const burst = (t) => (t * 1.1) % 1 < 0.55 && Math.floor(t * 7) % 2 === 0;
    if (name === "rear" && held && left > 0.3) {
      pose.scent = since;
      pose.blink = false;
      pose.sniff = burst(time) ? 1 : 0;
    } else if (name === "forage" && held) pose.sniff = burst(time) ? -1 : 0;
    else if (name === "lie" && held && left > 0.8) pose.eyesShut = ((time + (b.phase ?? 0)) / 6) % 1 > 0.3;
    // Now and then it lifts its head to look about.
    else if (name === "stand" && since > 1 && since < 1.6) pose.headUp = 1;
  }
  paintAt(
    g,
    Math.round(b.x),
    feet(g, b),
    b.dir,
    (plot) => (climbing ? drawClimb(pal, plot, climbing) : drawBear(spec, pal, plot, pose)),
    climbing ? null : { colour: shadowColour(g.pal), span: feetSpan },
  );
}

// Dogs

// Built from parts (canid.js): the wolf and its yearling, the coyote, the red and arctic foxes, and
// a pup (any kind below scale 0.8). A dog walks with its feet planted, eases to a stop and rests in
// the pose settleCanid picked as it stopped (standing and looking about, sitting, or lying), and in
// a long stop may get up and stretch into the play bow before it walks on. c.state "howl" sits it
// up to howl, rings of sound leaving the raised muzzle; "pounce" (the red fox, held c.lift pixels
// off the ground) springs nose up and dives nose down, landing in a sit. c.since is when its state
// last changed (settleCanid); c.pose ("stand", "sit", "lie" or "bow") and c.actAt (seconds into a
// howl or pounce) show a pose on demand. Its palette is the scene's array under its kind (coat, dark,
// pale, eye, tail tip) with the scene's `canid` entry beside it (the mouth, the howl's sound,
// and dark at night), and its groundShadow.
const CANID_SPECS = { wolf: WOLF, coyote: COYOTE, red: RED, arctic: ARCTIC };
const CANID_SHADOW_COLUMNS = {
  wolf: [-3, 16],
  yearling: [-3, 15],
  coyote: [-3, 14],
  red: [-4, 13],
  arctic: [-3, 11],
  pup: [-2, 9],
};
const CANID_OWN = { R: "#6e2c2c", howl: "#5f6f84", dark: false };
const CANID_POSES = new Set(["stand", "sit", "lie", "bow"]);
const CANID_EASE = 0.25; // seconds a walk takes to start or stop
const CANID_SETTLE = 0.5; // seconds it takes to sit or lie down
const CANID_RISE = 0.5; // seconds it takes to get up
const CANID_SIT_TO_HOWL = 0.4;

function canidSpec(c) {
  const k = c.scale ?? 1;
  if (k < 0.8) return PUP;
  if (c.kind === "wolf" && k < 1) return YEARLING;
  return CANID_SPECS[c.kind];
}

// Call after the scene's update has set w.state (wander, a howl, a pounce, or a leader's state for a
// pup or yearling, passed as `lead` so it rests as its leader does). Records when the state changed
// and, as a stop begins, the pose it rests in, when the stop ends, and whether it bows before it goes.
export function settleCanid(f, w, lead = null) {
  if (w.state === w.was) return;
  const prev = w.was;
  w.was = w.state;
  w.prev = prev;
  w.since = f.time;
  if (w.state === "walk") {
    w.lastPose = prev === "pounce" ? "dive" : prev && prev !== "walk" && !w.bows ? (w.pose ?? "sit") : null;
    w.pose = null;
    w.bows = false;
    return;
  }
  if (w.state !== "sit") return;
  if (prev === "pounce" || prev === "howl") {
    w.pose = "sit";
    w.bows = false;
    return;
  }
  const by = lead ?? w;
  w.stopEnd = f.time + Math.max(0, by.timer ?? 0);
  if (lead) {
    w.pose = lead.pose ?? "sit";
    w.bows = lead.bows ?? false;
    return;
  }
  const stop = w.stopEnd - f.time;
  const r = hash(Math.round(f.time * 100), Math.round(w.x), 3);
  w.pose = stop < 1.6 ? "stand" : stop >= 3 && r < 0.5 ? "lie" : "sit";
  w.bows = stop >= 4.5 && hash(Math.round(f.time * 100), Math.round(w.x), 4) < 0.5;
}

// The bow before it walks on: in the last 1.6 s of the stop it gets up, bows, holds and stands.
function canidBow(name, left) {
  if (left > 1.6 || left < 0) return null;
  if (left > 1.2) return { from: name, to: "stand", u: (1.6 - left) / 0.4 };
  if (left > 0.8) return { from: "stand", to: "bow", u: (1.2 - left) / 0.4 };
  if (left > 0.4) return { from: "bow", to: "bow", u: 0 };
  return { from: "bow", to: "stand", u: (0.4 - left) / 0.4 };
}

export function canidAt(g, c, time = 0) {
  if (g.trace) return g.trace.draw(canidAt, g, c, time);
  const spec = canidSpec(c);
  const own = g.pal.canid ?? CANID_OWN;
  const colours = g.pal[c.pal ?? c.kind];
  const pal = tonesFor(colours, "canid", () => dogTones(colours, own));
  const state = c.state;
  const walking = state === "walk";
  const since = sinceOf(c, time);
  const bodyX = c.x * c.dir;
  const phase = bodyX / (spec.stride / CANID_STANCE);
  const pose = {
    phase,
    bodyX,
    amp: ease(walking, since, CANID_EASE),
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.75 : Math.sin(time * 1.4) * 0.6,
    breath: breathAt(time, 2.2, !walking),
    blink: blinkAt(time, c.phase ?? 0, 3.1),
    headUp: 0,
  };
  let lift = 0;
  if (state === "pounce") {
    Object.assign(pose, { rest: pounceAt(c.actAt ?? since), amp: 0, blink: false });
    lift = Math.max(0, Math.round(c.lift ?? 0));
  } else if (state === "howl") {
    const h = c.actAt ?? since;
    const from = c.prev === "sit" && c.pose !== "stand" ? (c.pose ?? "sit") : "stand";
    pose.rest = { from, to: "sit", u: h / CANID_SIT_TO_HOWL };
    const act = howlAt(h - CANID_SIT_TO_HOWL);
    if (act) Object.assign(pose, act, { blink: false });
  } else if (walking) {
    if (c.lastPose && since < CANID_RISE) pose.rest = { from: c.lastPose, to: "stand", u: since / CANID_RISE };
  } else {
    const name = CANID_POSES.has(c.pose) ? c.pose : "sit";
    if (c.prev === "pounce") pose.rest = { from: "dive", to: "sit", u: since / 0.3 };
    else if (c.prev === "howl") pose.rest = { from: "sit", to: "sit", u: 0 };
    else if (name !== "stand") pose.rest = { from: "stand", to: name, u: (since - CANID_EASE * 0.6) / CANID_SETTLE };
    const bow = c.bows && c.stopEnd != null ? canidBow(name, c.stopEnd - time) : null;
    if (bow) pose.rest = bow;
    // Now and then it lifts its head to look about.
    else if (since > 1 && since < 2) pose.headUp = Math.min(1, (since - 1) / 0.25, (2 - since) / 0.25);
  }
  // The shadow stays on the ground, shorter the higher the dog is off it.
  const [s0, s1] = CANID_SHADOW_COLUMNS[spec.id];
  const shrink = Math.min(Math.floor((s1 - s0) / 2) - 1, Math.round(lift / 2));
  const shadow = { colour: shadowColour(g.pal), span: [s0 + shrink, s1 - 1 - shrink] };
  paintAt(g, Math.round(c.x), feet(g, c), c.dir, (plot) => drawDog(spec, pal, plot, pose), shadow, lift);
}

// Deer

// Built from parts (deer.js): the elk, the white-tailed deer, the wild reindeer and the pronghorn. A
// deer walks with its hooves planted (the pronghorn trots), eases to a stop, and while it stops
// (state "sit") lowers its head to graze, or in a long stop lies down and gets up again before it
// walks on; standing it breathes, blinks and flicks its tail. A white-tail running (state "run")
// bounds with its tail raised as a white flag; a bull elk bugling (state "bugle") tips his head up
// and his breath shows. d.since (settle, critters.js) is when its state last changed and d.timer the
// seconds its stop has left; d.hearSince and d.hearUntil (times) hold its head up to listen; d.pose "lie" lays it down and d.actAt sets how far into a bugle a
// still pose is. `sex` is "m" or "f": a cow elk wears no rack, a reindeer cow a small one. Its palette
// is the scene's array under its kind (or d.pal): elk [coat, dark, pale, antler, deep, shade],
// whitetail and reindeer [coat, dark, pale, antler], pronghorn [coat, dark, pale, horn, deep].
const DEER_BUILD = {
  elk: {
    m: [DEER_SPECS.ELK, [-1, 18]],
    f: [DEER_SPECS.ELK_COW, [-1, 17]],
    tones: (c, sex) => elkTones(c, sex === "f"),
  },
  whitetail: { m: [DEER_SPECS.WT_BUCK, [-1, 14]], f: [DEER_SPECS.WHITETAIL, [-1, 14]], tones: whitetailTones },
  reindeer: { m: [DEER_SPECS.RD_BULL, [-1, 16]], f: [DEER_SPECS.RD_COWDEER, [-1, 15]], tones: reindeerTones },
  pronghorn: { m: [DEER_SPECS.PRONGHORN, [-1, 14]], f: [DEER_SPECS.PRONGHORN, [-1, 14]], tones: pronghornTones },
};
const DEER_EASE = 0.3; // seconds a walk takes to start or stop
const DEER_GRAZE = 0.7; // seconds the head takes to go down to the grass or come up
const DEER_LIE = [0.6, 1.6]; // into a long stop: it lies down over this, and gets up as long before it ends
const DEER_BOUND = 0.5; // seconds a bound takes
const DEER_HEAR = 0.4; // seconds a deer takes to lift its head to listen, and to lower it
const DEER_LISTEN = 0.35; // how far the head lifts above its carriage while it listens

export function cervidAt(g, d, time = 0) {
  if (g.trace) return g.trace.draw(cervidAt, g, d, time);
  const build = DEER_BUILD[d.kind];
  const [spec, [s0, s1]] = build[d.sex === "f" ? "f" : "m"];
  const colours = g.pal[d.pal ?? d.kind];
  const pal = tonesFor(colours, `deer:${d.sex === "f" ? "f" : "m"}`, () => build.tones(colours, d.sex));
  // The state it came from, remembered for easing out of a run or a graze.
  if (d.seen !== d.state) {
    d.prev = d.seen;
    d.seen = d.state;
  }
  const since = sinceOf(d, time);
  const bodyX = d.x * d.dir;
  const running = d.state === "run";
  const gait = running ? "bound" : d.kind === "pronghorn" ? "trot" : "walk";
  const G = DEER_GAITS[gait];
  const moving = d.state === "walk" || running;
  const pose = {
    gait,
    bodyX: running ? null : bodyX,
    phase: running ? time / DEER_BOUND : bodyX / ((spec.stride * G.stride) / G.stance),
    amp: ease(moving, since, DEER_EASE),
    sway: Math.sin(time * 1.3) * 0.3,
    breath: breathAt(time),
    blink: blinkAt(time, d.phase ?? 0, 3.3),
  };
  if (d.state === "walk") pose.sway = Math.sin(pose.phase * 2 * Math.PI) * 0.6;
  if (running) {
    pose.amp = 1;
    pose.flag = Math.min(1, since / 0.25);
    pose.rise = boundRise(pose.phase);
  } else if (d.prev === "run" && since < 0.25) {
    pose.flag = 1 - since / 0.25;
  }
  if (d.state === "bugle") {
    const act = bugleAt(d.actAt ?? since);
    const from = d.prev === "sit" && (d.grazed ?? 0) > 0.5 ? "graze" : "stand";
    pose.rest = { from, to: "stand", u: Math.min(1, (d.actAt ?? since) / 0.5) };
    if (act) Object.assign(pose, act, { blink: false });
  } else if (d.state === "sit") {
    const stop = since + (d.timer ?? 100); // how long this stop lasts
    const r = hash(Math.round((d.since ?? 0) * 100), 3, 11);
    const [d0, d1] = DEER_LIE;
    if (d.pose === "lie") pose.rest = { from: "lie", to: "lie", u: 0 };
    else if (d.pose !== "graze" && stop >= 6 && r < 0.5 && since >= d0 && since < stop - d0) {
      if (since < d1) pose.rest = { from: "stand", to: "lie", u: (since - d0) / (d1 - d0) };
      else if (since < stop - d1) pose.rest = { from: "lie", to: "lie", u: 0 };
      else pose.rest = { from: "lie", to: "stand", u: (since - (stop - d1)) / (d1 - d0) };
    } else {
      const down =
        stop >= 2 ? Math.max(0, Math.min(1, (since - DEER_EASE) / DEER_GRAZE, (stop - since) / DEER_GRAZE)) : 0;
      d.grazed = down;
      pose.rest = { from: "stand", to: "graze", u: down };
    }
  } else if (d.state === "walk" && d.prev === "sit" && (d.grazed ?? 0) > 0 && since < DEER_GRAZE) {
    // A walk that starts before the head is up lifts it as the deer steps off.
    pose.rest = { from: "stand", to: "graze", u: d.grazed * (1 - since / DEER_GRAZE) };
  }
  if (d.hearSince != null) {
    // Listening to a bugle: still, the head up (the graze comes up with it), over 0.4 s each way.
    const u = smooth(
      Math.max(0, Math.min(1, (time - d.hearSince) / DEER_HEAR, ((d.hearUntil ?? time) - time) / DEER_HEAR)),
    );
    pose.head = (pose.head ?? 0) + DEER_LISTEN * u;
    if (pose.rest?.to === "graze") pose.rest = { ...pose.rest, u: pose.rest.u * (1 - u) };
  }
  if (d.state !== "sit" && since >= DEER_GRAZE) d.grazed = 0;
  const shadow = { colour: shadowColour(g.pal), span: [s0, s1 - 1] };
  paintAt(g, Math.round(d.x), feet(g, d), d.dir, (plot) => drawDeer(spec, pal, plot, pose), shadow);
}

// Pigs

// Built from parts (pig.js): the pua'a, a feral pig. It trots with its feet planted (the stride is the
// scene's 6 px/s over 3.6 px a cycle), settles its legs one after the other into a stop and rests in the
// pose rest() picked as it stopped (puaaPoses): "stand" (breathing, blinking, a look up), "root" (the head
// eases down and the snout digs in strokes, soil flying up) or, in a stop long enough, "wallow", its
// signature: a wet patch, it kneels fore end first, rolls onto its back and kicks, rises, shakes mud off
// and dries. p.since (settle, critters.js) is when its state last changed, p.timer the seconds its stop
// has left, p.sinceX and p.prevX where it changed; p.pose shows a pose on demand. Its palette is the
// scene's pig ([body, dark, snout]) with puaaMud, puaaDust and groundShadow beside it.
export const puaaPoses = (p) =>
  (p.timer ?? 0) >= WALLOW_SECONDS
    ? ["root", "root", "stand", "wallow", "wallow", "wallow"]
    : ["root", "root", "stand"];

// The pig's tones, made for each tenth of mud on its coat.
const pigTonesFor = (g, mud) => {
  const key = Math.round(mud * 10);
  return tonesFor(g.pal, `pig:${key}`, () => pigTones(g, key / 10));
};

export function puaaAt(g, p, time = 0) {
  if (g.trace) return g.trace.draw(puaaAt, g, p, time);
  const since = sinceOf(p, time);
  const walking = p.state === "walk";
  const fy = feet(g, p);
  let pose;
  if (walking) {
    const d = p.sinceX == null ? (p.phase ?? 0) * 1.2 : Math.abs(p.x - p.sinceX);
    pose = pigWalk(legClock(d, 0), legClock(d, 0.5), true);
  } else {
    const d = p.sinceX == null || p.prevX == null ? 0 : Math.abs(p.sinceX - p.prevX);
    const total = since + (p.timer ?? 0);
    pose = {
      ...pigWalk(legClock(d, 0, since), legClock(d, 0.5, since), false),
      ...pigRest(p.pose ?? "stand", since, total),
    };
  }
  if (walking) pose.blink = blinkAt(time, 0, 3.7);
  drawPig(g, Math.round(p.x), fy, p.dir, pose, pigTonesFor(g, pose.mud ?? 0));
}

// Seals, otters and whales

// Built from parts (swimmer.js): the Hawaiian monk seal, her pup (scale below 0.8), the Asian
// small-clawed otter and the humpback whale. A walker's s.c (critters.js stride) is its stride clock, so
// the seal's belly and flipper and the otter's paws hold still on the ground; its x is the centre of the
// body. SEAL_STRIDE and OTTER_STRIDE are [px a stride, seconds a stride] for stride(): the seal hitches
// 3 px (the pup 2.3) in 0.75 s (0.575), the otter bounds 5 px in 0.5 s. A stopped animal rests in the
// pose rest() picked (sealPoses, "lie" or "roll"; the lead otter "stand" or "stay"); s.still is the
// seconds it has been at rest and s.timer the seconds its stop has left, as the sprites show it.
export const SEAL_STRIDE = [3, SEAL_CYCLE];
export const PUP_STRIDE = [2.3, 0.575];
export const OTTER_STRIDE = [5, BOUND_CYCLE];
export const sealPoses = (s) => ((s.timer ?? 0) >= SEAL_ROLL_SECONDS ? ["lie", "lie", "roll", "roll"] : ["lie"]);

// Seconds it has been at rest: a.still when the scene keeps it, else since its state changed.
const stillOf = (a, time) => a.still ?? sinceOf(a, time);

export function sealAt(g, s, time = 0) {
  if (g.trace) return g.trace.draw(sealAt, g, s, time);
  const pup = (s.scale ?? 1) < 0.8;
  const k = pup ? 0.7 : 1;
  const [px] = pup ? PUP_STRIDE : SEAL_STRIDE;
  const c = s.c ?? (s.phase ?? 0) * 0.3;
  const dir = s.dir;
  let pose;
  let off = 0;
  if ((s.moving ?? s.state === "walk") || c - Math.floor(c) > 1e-6) {
    const w = sealCycle(c, { k, reach: px / k, base: 17 });
    pose = { ...w.pose, breath: 0, blink: (time / 3.7 + (s.phase ?? 0)) % 1 < 0.04 };
    off = w.rear - c * px;
  } else {
    const still = stillOf(s, time);
    const e = smooth(Math.min(1, still / 0.35));
    pose = { k, len: 17 + e, ...sealRest(s.pose ?? "lie", still, still + (s.timer ?? 0), pup) };
    if (e < 1) Object.assign(pose, { fore: "push", ftip: 3.4 - 2.6 * e, lift: 0 });
  }
  const half = Math.round(9 * k);
  const tones = tonesFor(g.pal, pup ? "seal:pup" : "seal", () => sealTones(g, pup ? 0.3 : 0));
  drawSeal(g, Math.round(s.x - dir * half + dir * off), s.y ?? g.groundY + 7, dir, pose, tones);
}

export function otterAt(g, o, time = 0) {
  if (g.trace) return g.trace.draw(otterAt, g, o, time);
  const dir = o.dir;
  const c = o.c ?? (o.phase ?? 0) * 0.3;
  let pose;
  let off = 0;
  let shift = 0;
  if ((o.moving ?? o.state === "walk") || c - Math.floor(c) > 1e-6) {
    const b = boundBeat(c);
    pose = {
      legs: b.legs,
      arch: b.arch,
      ext: b.ext,
      air: b.air,
      tl: b.tl,
      blink: (time / 3.1 + (o.phase ?? 0)) % 1 < 0.04,
    };
    off = boundX(c) - c * OTTER_STRIDE[0];
  } else {
    const still = stillOf(o, time);
    const e = smooth(Math.min(1, still / 0.35));
    const b = boundBeat(c);
    pose = otterRest(o.pose === "stand", still, still + (o.timer ?? 0));
    if (e < 1)
      Object.assign(pose, {
        arch: b.arch * (1 - e),
        ext: b.ext * (1 - e),
        tl: b.tl * (1 - e),
        legs: e < 0.5 ? b.legs : undefined,
      });
    if (pose.up > 0.2) shift = 2;
  }
  drawOtter(
    g,
    Math.round(o.x - dir * 7 + dir * (off + shift)),
    o.y ?? g.groundY + 6,
    dir,
    pose,
    tonesFor(g.pal, "otter", () => otterTones(g)),
  );
}

// The whale's surfacing: w.start the time it came up, w.x the middle of its back, w.dir the way it faces
// and w.dive whether this one dives with its flukes. wy is the water line's row.
export function whaleAt(g, w, wy, time = 0) {
  if (g.trace) return g.trace.draw(whaleAt, g, w, wy, time);
  const dir = w.dir ?? 1;
  drawWhale(g, Math.round(w.x) - dir * 7, wy, dir, time - w.start, { fluke: !!w.dive });
}

// Wild cattle and sheep

// Built from parts (bovid.js, on the horse build): the American bison, its calf (scale below 0.8) and the
// bighorn ram. b.since (settle, critters.js) is when a walker's state last changed and b.timer the seconds
// its stop has left. A stopped bison rests in the pose rest() picked as it stopped (bisonPoses): "graze"
// (the neck swings down, the hump and shoulders dip with it), "stand" (breathing, a tail flick, a look
// up) or "wallow", its signature: it lies down fore end first, rolls onto its back with the legs kicking
// and dust coming off the ground, rolls back, rises rump first and shakes a cloud of dust from its coat.
// A calf grazes beside a grazing mother, lies down in a long stop, and else stands; b.pose or b.act with
// b.actAt seconds in shows one on demand. Palettes: the scene's bison ([dark, tan, horn, beard, throat])
// with bisonShade, calf ([tan, dark]), and groundShadow and bisonDust beside them.
//
// The ram is a percher (critters.js) that stays where it was put. Its moves (s.moves) are "look" (the head
// lifts and turns three-quarters to face out, the horns showing either side), "graze", "lie" (chewing its
// cud), "chew" and "stamp"; s.act with s.actAt seconds in, and s.actLasts, shows one on demand. Its
// palette is sheep: [coat, pale, horn, dark, horn shade], with groundShadow.
const BOVID_BUILD = { bison: [BISON, [-1, 26]], calf: [CALF, [-1, 15]], bighorn: [BIGHORN, [-1, 17]] };
const BOVID_EASE = 0.3; // seconds a walk takes to start or stop
const BISON_REST = 5.2; // the stop a calf lies down in
const WALLOW_STOP = 9.3; // the stop a wallow needs: 8.8 s from the first step down to the shake

// The poses a bison may rest in for a stop of b.timer seconds (for rest(), critters.js): the wallow
// only when the stop is long enough to finish it.
export const bisonPoses = (b) => {
  const poses = ["graze", "graze", "stand"];
  if ((b.timer ?? 0) >= WALLOW_STOP) poses.push("wallow", "wallow");
  return poses;
};

const WALLOW_LOOP = [
  [0, 0.4, "stand", "stand"],
  [0.4, 1.7, "stand", "lie"],
  [1.7, 2.3, "lie", "lie"],
  [2.3, 3.2, "lie", "back"],
  [3.2, 5.4, "back", "back"],
  [5.4, 6.2, "back", "lie"],
  [6.2, 6.7, "lie", "lie"],
  [6.7, 7.9, "lie", "stand"],
];
const WALLOW_KICK = [3.2, 5.4];
const WALLOW_SHAKE = [7.9, 8.8];

const easeIn = (a, b) => smooth(Math.min(1, Math.max(0, a / b)));
const bovidTones = (g, key, make) => tonesFor(g.pal[key], "bovid", () => make(g.pal[key]));

// Places a bovid over its ground shadow, which spans the build's columns [s0, s1).
function drawBovidAt(g, spec, pal, [s0, s1], x, fy, dir, pose) {
  const shadow = { colour: shadowColour(g.pal), span: [s0, s1 - 1] };
  paintAt(g, x, fy, dir, (plot) => drawBovid(spec, pal, plot, pose), shadow);
}

export function bisonAt(g, b, time = 0) {
  if (g.trace) return g.trace.draw(bisonAt, g, b, time);
  const calf = (b.scale ?? 1) < 0.8;
  const [spec, shadow] = BOVID_BUILD[calf ? "calf" : "bison"];
  const pal = calf
    ? bovidTones(g, "calf", calfTones)
    : bovidTones(g, "bison", ([dark, tan, horn, beard, throat]) =>
        bisonTones([dark, tan, horn, beard, throat], g.pal.bisonShade),
      );
  const dir = b.dir;
  const x = Math.round(b.x);
  const bodyX = b.x * dir;
  const walking = b.state === "walk" && !b.act;
  const since = sinceOf(b, time);
  const stop = since + (b.timer ?? 0);
  const phase = bodyX / (spec.stride / HORSE_GAIT.stance);
  const pose = {
    phase,
    bodyX,
    amp: ease(walking, since, BOVID_EASE),
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.6 : Math.sin(time * 1.3) * 0.3,
    breath: breathAt(time, 2, !walking),
    blink: blinkAt(time, b.phase ?? 0, 3.7),
  };
  let wallowing = null;
  if (!walking && (since >= BOVID_EASE || b.act)) {
    const name = b.act ?? b.pose ?? "stand";
    const at = b.actAt ?? since;
    let loop = null;
    if (calf) {
      if (name === "graze") loop = grazingLoop(stop);
      else if (name === "wallow" || name === "lie" || stop >= BISON_REST) loop = lyingLoop(stop);
    } else if (name === "graze") {
      loop = grazingLoop(stop);
      if (at > 2.3 && at < 2.8) pose.ear = 1;
    } else if (name === "wallow") {
      loop = WALLOW_LOOP;
      const [k0, k1] = WALLOW_KICK;
      if (at >= k0 && at < k1) {
        pose.kick = Math.sin((at - k0) * 7) * easeIn(at - k0, 0.6) * easeIn(k1 - at, 0.6);
        pose.sway = Math.sin(time * 5) * 0.8;
      }
      if (at >= WALLOW_SHAKE[0] && at < WALLOW_SHAKE[1]) {
        const u = (at - WALLOW_SHAKE[0]) / (WALLOW_SHAKE[1] - WALLOW_SHAKE[0]);
        pose.shake = Math.sin((at - WALLOW_SHAKE[0]) * 28) * 1.2 * (1 - u);
      }
      wallowing = at;
    } else if (name === "lie") loop = lyingLoop(stop);
    else {
      // Standing: a tail flick and, now and then, the head comes up.
      const s = at - 1.6;
      if (s > 0 && s < 1.2) pose.sway = Math.sin(s * 8) * 0.8;
      pose.head = 0.3 * easeIn(Math.sin(at * 0.8) * 3, 1);
      pose.ear = pose.head > 0.15 ? 1 : 0;
    }
    if (loop) pose.rest = loopAt(loop, at);
  }
  drawBovidAt(g, spec, pal, shadow, x, feet(g, b), dir, pose);
  if (wallowing !== null) {
    // A cloud at the back as it rolls, a bigger one off the coat as it shakes.
    const fy = feet(g, b);
    const span = (lo, hi) => (dir > 0 ? { x0: x + lo, x1: x + hi } : { x0: x - hi, x1: x - lo });
    const [k0, k1] = WALLOW_KICK;
    if (wallowing >= k0 + 0.2 && wallowing < k1 + 0.8) {
      horseDustAt(g, 0, fy, ((wallowing - k0 - 0.2) * 1.2) % 1, {
        ...span(-2, 22),
        count: 18,
        life: 1,
        rise: 7,
        colour: "bisonDust",
      });
    }
    horseDustAt(g, 0, fy, wallowing - (WALLOW_SHAKE[0] - 0.1), {
      ...span(1, 20),
      count: 34,
      life: 1.5,
      rise: 13,
      colour: "bisonDust",
    });
  }
}

// A bighorn ram: the move it is in as [name, seconds into it, seconds it lasts], from its percher moves
// (the first of these under way) or from s.act on demand.
const RAM_MOVES = ["lie", "graze", "look", "stamp", "chew"];
const RAM_LASTS = { lie: 7, graze: 3.6, look: 5, stamp: 0.4, chew: 1.5 };
function ramMove(s, time) {
  if (s.act) return [s.act, s.actAt ?? 1, s.actLasts ?? RAM_LASTS[s.act] ?? 3];
  for (const name of RAM_MOVES) {
    const u = s.moves?.[name] ? doing(s, name, time) : -1;
    if (u >= 0) return [name, u * s.moves[name].lasts, s.moves[name].lasts];
  }
  return ["stand", 0, 0];
}

export function bighornAt(g, s, time = 0) {
  if (g.trace) return g.trace.draw(bighornAt, g, s, time);
  const [spec, shadow] = BOVID_BUILD.bighorn;
  const pal = bovidTones(g, s.pal ?? "sheep", sheepTones);
  const [name, at, lasts] = ramMove(s, time);
  const pose = {
    amp: 0,
    phase: 0,
    sway: Math.sin(time * 1.6) * 0.35,
    breath: breathAt(time, 2.4),
    blink: blinkAt(time, s.phase ?? 0, 3.1, 0.045),
  };
  const chewing = (a, b) => at >= a && at < b && Math.sin(at * 11) > 0;
  if (name === "graze") {
    pose.rest = loopAt(grazingLoop(lasts), at);
    pose.mouth = chewing(lasts - 1.4, lasts - 0.3) ? 1 : 0;
  } else if (name === "lie") {
    pose.rest = loopAt(lyingLoop(lasts), at);
    pose.mouth = chewing(1.8, lasts - 1.8) ? 1 : 0;
    pose.ear = at > 4 && at < 4.4 ? 1 : 0;
  } else if (name === "look") {
    // The head comes up and turns to face out over almost a second, holds, and turns back.
    const turn = easeIn(Math.min(at, lasts - at), 0.9);
    pose.head = turn * 0.9;
    if (turn > 0.5) pose.headGrid = RAM_TURN_HEAD;
  } else if (name === "stamp") pose.stamp = easeIn(Math.min(at, lasts - at), 0.12);
  else if (name === "chew") pose.mouth = Math.sin(time * 11) > 0 ? 1 : 0;
  drawBovidAt(g, spec, pal, shadow, Math.round(s.x), feet(g, s), s.dir, pose);
}

// Elephants

// Built from parts (elephant.js), a calf (scale below 0.8) drawn on its own. An elephant walks an
// amble with its feet planted, stands breathing and blinking and now and then flaps an ear, and in a
// long stop does one thing: curls its trunk to test the air, trumpets (rings of sound leave the
// trunk) or takes a dust bath. A calf in a long stop lies down to sleep and gets up before the herd
// moves on. e.since (settle, critters.js) is when its state last changed and e.timer the seconds its
// stop has left, so an action is only chosen when it fits (e.act, "curl", "trumpet" or "dust", with
// e.actAt seconds in, shows one on demand; e.pose "lie" lays a calf down). Its palette is the scene's `elephant`
// array (body, shade, skin, tusk, eye) with elephantRoar and elephantDust beside it.
const ELEPHANTS = { african: AFRICAN, asian: ASIAN, africanCalf: AFRICAN_CALF, asianCalf: ASIAN_CALF };
const ELEPHANT_SHADOW_COLUMNS = { african: [-1, 29], africanCalf: [0, 15], asian: [-1, 25], asianCalf: [0, 15] };
const ELEPHANT_ACTIONS = [
  [curlAt, CURL],
  [trumpetAt, TRUMPET],
  [dustAt, DUST],
];
const ELEPHANT_ACT_AT = 1.2; // seconds into a stop before it acts
const ELEPHANT_EASE = 0.4; // seconds a walk takes to start or stop
const ELEPHANT_ACT_BY_NAME = { curl: curlAt, trumpet: trumpetAt, dust: dustAt };

export function elephantAt(g, e, time) {
  if (g.trace) return g.trace.draw(elephantAt, g, e, time);
  const calf = (e.scale ?? 1) < 0.8;
  const kind = e.kind === "asian" ? "asian" : "african";
  const name = calf ? `${kind}Calf` : kind;
  const spec = ELEPHANTS[name];
  const colours = g.pal[e.pal ?? "elephant"];
  const pal = tonesFor(colours, "elephant", () =>
    elephantTones(colours, { roar: g.pal.elephantRoar, dust: g.pal.elephantDust }),
  );
  const walking = e.state === "walk";
  const since = sinceOf(e, time);
  const bodyX = e.x * e.dir;
  const phase = bodyX / (spec.stride / ELEPHANT_STANCE);
  const stride = Math.sin(phase * 2 * Math.PI);
  const pose = {
    phase,
    bodyX,
    amp: ease(walking, since, ELEPHANT_EASE),
    sway: walking ? stride * 0.7 : Math.sin(time * 1.3) * 0.5,
    swing: walking ? stride * 0.16 : Math.sin(time * 0.9) * 0.06,
    breath: breathAt(time, 1.6),
    blink: blinkAt(time, (e.phase ?? 0) * 1.7, 3.7, 0.035),
  };
  if (!walking && since > ELEPHANT_EASE) {
    const stop = since + (e.timer ?? 0); // how long this stop lasts
    const at = since - ELEPHANT_ACT_AT;
    if (calf) {
      // A long stop: lie down, sleep, and be up before the walk.
      const [d0, d1, u0, u1] = [0.8, 1.8, stop - 1.6, stop - 0.6];
      if (e.pose === "lie") {
        Object.assign(pose, { rest: { from: "lie", to: "lie", u: 0 }, swing: 0, eyesShut: true, blink: false });
      } else if (stop >= 5.4 && since >= d0 && since < u1) {
        if (since < d1) pose.rest = { from: "stand", to: "lie", u: (since - d0) / (d1 - d0) };
        else if (since < u0) pose.rest = { from: "lie", to: "lie", u: 0 };
        else pose.rest = { from: "lie", to: "stand", u: (since - u0) / (u1 - u0) };
        pose.swing = 0;
        pose.eyesShut = since >= d1 + 0.4 && since < u0;
        if (pose.eyesShut) pose.blink = false;
      }
    } else {
      const r = hash(Math.round((e.since ?? 0) * 100), Math.round(e.x), kind === "asian" ? 1 : 2);
      const fits = ELEPHANT_ACTIONS.filter(([, length]) => stop >= ELEPHANT_ACT_AT + length + 0.8);
      const act = e.act
        ? ELEPHANT_ACT_BY_NAME[e.act](spec, e.actAt ?? 0)
        : fits.length && r < 0.8
          ? fits[Math.floor((r / 0.8) * fits.length)][0](spec, at)
          : null;
      if (act) {
        Object.assign(pose, act, { swing: 0, blink: false });
      } else if (since >= 2.4 && since < 3.6) {
        pose.ear = Math.sin((Math.PI * (since - 2.4)) / 0.6) ** 2; // two slow ear flaps
      }
    }
  }
  const [s0, s1] = ELEPHANT_SHADOW_COLUMNS[name];
  const shadow = { colour: shadowColour(g.pal), span: [s0, s1 - 1] };
  // Its feet stand a row lower than the other families'.
  paintAt(g, Math.round(e.x), feet(g, e) + 1, e.dir, (plot) => drawElephant(spec, pal, plot, pose), shadow);
}

// Zebras and giraffes

// Built from parts (horse.js): the plains zebra, and its foal (scale below 1), drawn on its own. A
// zebra walks the four-beat walk with its hooves planted, eases to a stop and spends the stop in the
// pose rest() picked as it stopped (zebraPoses): grazing with its head in the grass, a tail swish with
// its ears flicking, lying down on its chest, or rolling in the dust (it goes down fore end first,
// rolls onto its back with its legs waving, rolls back, gets up rump first and shakes, a cloud of dust
// leaving its coat). Standing it breathes, blinks and flicks its tail. A foal in a long stop lies
// down (or grazes beside a grazing mother). z.since (settle, critters.js) is when its state last
// changed, z.timer the seconds its stop has left, and z.pose the pose to show on demand ("graze",
// "swish", "lie", "roll"; z.actAt seconds in, for the roll). Its palette is the scene's `zebra` array
// ([white, black, belly]), with the scene's groundShadow and horseDust beside it.
const HORSE_BUILD = { zebra: [ZEBRA, [-1, 19]], foal: [FOAL, [-1, 13]] };
const HORSE_EASE = 0.3; // seconds a walk takes to start or stop
const HORSE_REST = [5.2, 4.4]; // the stop a foal lies down in, and a zebra
const HORSE_ROLL = 8; // the stop a roll needs: about 7.8 s from the first step down to the shake

// The poses a zebra may rest in for a stop of z.timer seconds (for rest(), critters.js): the long ones
// only when the stop is long enough to finish.
export const zebraPoses = (z) => {
  const left = z.timer ?? 0;
  const poses = ["graze", "swish"];
  if (left >= HORSE_REST[1]) poses.push("lie");
  if (left >= HORSE_ROLL) poses.push("roll");
  return poses;
};

// A stop as holds and moves: [start, end, from, to] in seconds into it.
const lyingLoop = (stop) => [
  [0, 0.4, "stand", "stand"],
  [0.4, 1.5, "stand", "lie"],
  [1.5, stop - 1.5, "lie", "lie"],
  [stop - 1.5, stop - 0.3, "lie", "stand"],
];
const grazingLoop = (stop) => [
  [0, 0.3, "stand", "stand"],
  [0.3, 1.1, "stand", "graze"],
  [1.1, stop - 0.8, "graze", "graze"],
  [stop - 0.8, stop - 0.1, "graze", "stand"],
];
const ROLL_LOOP = [
  [0, 0.4, "stand", "stand"],
  [0.4, 1.5, "stand", "lie"],
  [1.5, 2.0, "lie", "lie"],
  [2.0, 2.7, "lie", "back"],
  [2.7, 4.7, "back", "back"],
  [4.7, 5.4, "back", "lie"],
  [5.4, 5.8, "lie", "lie"],
  [5.8, 6.9, "lie", "stand"],
];
const ROLL_KICK = [2.7, 4.7];
const ROLL_SHAKE = [6.9, 7.7];

function loopAt(loop, t) {
  const seg = loop.find(([a, b]) => t >= a && t < b) ?? loop[loop.length - 1];
  const [a, b, from, to] = seg;
  return { from, to, u: from === to ? 0 : Math.min(1, Math.max(0, (t - a) / (b - a))) };
}

export function zebraAt(g, z, time = 0) {
  if (g.trace) return g.trace.draw(zebraAt, g, z, time);
  const foal = (z.scale ?? 1) < 1;
  const [spec, [s0, s1]] = HORSE_BUILD[foal ? "foal" : "zebra"];
  const colours = g.pal[z.pal ?? "zebra"];
  const pal = tonesFor(colours, foal ? "foal" : "zebra", () => zebraTones(colours, foal));
  const dir = z.dir;
  const x = Math.round(z.x);
  const bodyX = z.x * dir;
  const walking = z.state === "walk";
  const since = sinceOf(z, time);
  const stop = since + (z.timer ?? 0);
  const phase = bodyX / (spec.stride / HORSE_GAIT.stance);
  const pose = {
    phase,
    bodyX,
    amp: ease(walking, since, HORSE_EASE),
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.6 : Math.sin(time * 1.3) * 0.25,
    breath: breathAt(time, 2.2, !walking),
    blink: blinkAt(time, z.phase ?? 0, 3.3),
  };
  let rolling = null;
  if (!walking && since >= HORSE_EASE) {
    const name = z.pose ?? "stand";
    const at = z.actAt ?? since;
    let loop = null;
    if (foal) {
      // The foal grazes beside a grazing mother, lies down in a long stop, and else stands.
      if (name === "graze") loop = grazingLoop(stop);
      else if (stop >= HORSE_REST[0] || name === "lie") loop = lyingLoop(stop);
    } else if (name === "graze") {
      loop = grazingLoop(stop);
      if (at > 2.3 && at < 2.8) pose.ear = 1;
    } else if (name === "swish") {
      const s = at - 0.8;
      if (s > 0 && s < 1.4) {
        pose.sway = Math.sin(s * 11);
        pose.ear = s > 0.2 && s < 1.2 ? 1 : 0;
      }
    } else if (name === "lie") loop = lyingLoop(stop);
    else if (name === "roll") {
      loop = ROLL_LOOP;
      const [k0, k1] = ROLL_KICK;
      if (at >= k0 && at < k1) {
        const ease = (a, b) => smooth(Math.min(1, Math.max(0, a / b)));
        pose.kick = Math.sin((at - k0) * 8) * ease(at - k0, 0.5) * ease(k1 - at, 0.4);
        pose.sway = Math.sin(time * 6) * 0.8;
      }
      if (at >= ROLL_SHAKE[0] && at < ROLL_SHAKE[1]) {
        const u = (at - ROLL_SHAKE[0]) / (ROLL_SHAKE[1] - ROLL_SHAKE[0]);
        pose.shake = Math.sin((at - ROLL_SHAKE[0]) * 32) * 1.2 * (1 - u);
      }
      rolling = at;
    }
    if (loop) pose.rest = loopAt(loop, at);
  }
  const fy = feet(g, z);
  const shadow = { colour: shadowColour(g.pal), span: [s0, s1 - 1] };
  paintAt(g, x, fy, dir, (plot) => drawHorse(spec, pal, plot, pose), shadow);
  if (rolling !== null) {
    // A cloud at the back as it rolls, a bigger one off the coat as it shakes.
    const span = (lo, hi) => (dir > 0 ? { x0: x + lo, x1: x + hi } : { x0: x - hi, x1: x - lo });
    const [k0, k1] = ROLL_KICK;
    if (rolling >= k0 + 0.2 && rolling < k1 + 0.8) {
      horseDustAt(g, 0, fy, ((rolling - k0 - 0.2) * 1.2) % 1, { ...span(-1, 15), count: 10, life: 1, rise: 5 });
    }
    horseDustAt(g, 0, fy, rolling - (ROLL_SHAKE[0] - 0.1), { ...span(1, 15), count: 18, life: 0.9, rise: 11 });
  }
}

// Built from parts (giraffe.js): a Masai giraffe that paces with its feet planted (each side's hooves
// step almost together), eases to a stop and spends the stop in the pose rest() picked as it stopped:
// "browse" (the neck leans forward and the head reaches into an acacia's leaves, the tongue curling
// round a twig, then a leaf at its lips as it munches), "drink" (the fore legs splay, the shoulders
// sink and the neck curves down to the water, now and then lifting the head to watch the plain) or
// "chew" (standing, the jaw working and an ear flicking). Standing it breathes, blinks and swishes
// its tail. n.since (settle, critters.js) is when its state last changed and n.timer the seconds its
// stop has left. giraffeMuzzle(pose) says where the muzzle is in a still pose, as [px from x in the
// way it faces, px above the hooves], so the scene can tell whether a tree is in reach and where the
// water is. Its palette is the scene's `giraffe` array ([fur, patch, dark, muzzle]) with the scene's
// groundShadow and leaf beside it.
const GIRAFFE_EASE = 0.3; // seconds a walk takes to start or stop
// Its shadow: a row from 3 px behind its x to 18 ahead, and a fainter one 2 px shorter at each end below.
const GIRAFFE_SHADOW = { span: [-3, 18], rows: [[2, 0.5]] };
export const giraffeMuzzle = (pose) => muzzleAt(GIRAFFE, pose);

const within = (t, a, b) => t >= a && t < b;
const bump = (t, a, b, rise) => smooth(Math.max(0, Math.min(1, Math.min((t - a) / rise, (b - t) / rise))));

export function giraffeAt(g, n, time = 0) {
  if (g.trace) return g.trace.draw(giraffeAt, g, n, time);
  const colours = g.pal[n.pal ?? "giraffe"];
  const pal = tonesFor(colours, "giraffe", () => giraffeTones(colours));
  pal.leaf = g.pal.leaf;
  const bodyX = n.x * n.dir;
  const walking = n.state === "walk";
  const since = sinceOf(n, time);
  const stop = since + (n.timer ?? 0);
  const phase = bodyX / (GIRAFFE.stride / GIRAFFE_GAIT.stance);
  const pose = {
    phase,
    bodyX,
    amp: ease(walking, since, GIRAFFE_EASE),
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.9 : Math.sin(time * 1.3) * 0.5,
    breath: breathAt(time, 2.2, !walking),
    blink: blinkAt(time, n.phase ?? 0, 2.9, 0.07),
  };
  if (!walking && since >= GIRAFFE_EASE) {
    const name = n.pose === "browse" || n.pose === "drink" ? n.pose : "stand";
    const hold = [1.5, stop - 1.7];
    if (name !== "stand") {
      pose.rest = loopAt(
        [
          [0, 0.4, "stand", "stand"],
          [0.4, hold[0], "stand", name],
          [hold[0], hold[1], name, name],
          [hold[1], stop - 0.3, name, "stand"],
        ],
        since,
      );
    }
    const held = within(since, hold[0], hold[1]);
    if (name === "browse" && held) {
      // The tongue reaches round a twig, the giraffe munches with a leaf at its lips, and reaches again.
      const c = (since - hold[0] - 0.2) % 2.8;
      if (c >= 0 && c < 0.7) pose.tongue = Math.sin((Math.PI * c) / 0.7) ** 0.6;
      else if (c >= 0.7 && c < 1.4) Object.assign(pose, { leaf: c < 1.15, chew: Math.floor(time * 6) % 2 === 0 });
      else if (c >= 1.4 && c < 2.1) pose.tongue = Math.sin((Math.PI * (c - 1.4)) / 0.7) ** 0.6;
      else if (c >= 2.1) pose.chew = Math.floor(time * 6) % 2 === 0;
    } else if (name === "drink" && held) {
      // It dips to sip, and lifts its head for a moment to watch the plain.
      const mid = (hold[0] + hold[1]) / 2;
      const sip = 1.2 * Math.sin((since - hold[0]) * 2.6) ** 2;
      const watch = hold[1] - hold[0] > 2.4 ? bump(since, mid - 0.4, mid + 0.4, 0.3) * 26 : 0;
      pose.head = watch - sip;
    } else if (name === "stand") {
      // Chewing, with an ear flick or two, and now and then a look up.
      pose.chew = since > 0.6 && Math.floor(time * 6) % 2 === 0;
      const flick = [1.4, 2.8, 4.4].find((a) => within(since, a, a + 0.35));
      if (flick !== undefined) pose.ear = Math.sin((Math.PI * (since - flick)) / 0.35);
      if (since > 5.4) pose.head = bump(since, 5.4, 6.2, 0.3) * 9;
    }
  }
  const shadow = { ...GIRAFFE_SHADOW, colour: shadowColour(g.pal) };
  paintAt(g, Math.round(n.x), feet(g, n), n.dir, (plot) => drawGiraffe(GIRAFFE, pal, plot, pose), shadow);
}

// Eeyore, the Hundred Acre Wood's donkey, on the horse build with his own spec and no stripes (horse.js):
// a grey barrel on thin legs, his head hung low on a sloping neck, long ears laid back, a dark mane and a
// thin tail. He trudges the four-beat walk with his hooves planted; every stop he stands (breathing,
// blinking, sighing with his head lower, flicking an ear), sits back on his haunches gloomily and gets
// up again before he walks on. e.since (settle, critters.js) is when his state last changed and e.timer
// the seconds his stop has left. His palette is the scene's `eeyore` array ([grey, shade, dark, muzzle])
// with the scene's groundShadow beside it.
const EEYORE_EASE = 0.3; // seconds a walk takes to start or stop
const EEYORE_SHADOW = [-1, 11]; // the columns his shadow spans

export function eeyoreAt(g, e, time = 0) {
  if (g.trace) return g.trace.draw(eeyoreAt, g, e, time);
  const colours = g.pal[e.pal ?? "eeyore"];
  const pal = tonesFor(colours, "eeyore", () => eeyoreTones(colours));
  const bodyX = e.x * e.dir;
  const walking = e.state === "walk";
  const since = sinceOf(e, time);
  const stop = since + (e.timer ?? 0);
  const phase = bodyX / (EEYORE.stride / HORSE_GAIT.stance);
  const pose = {
    phase,
    bodyX,
    amp: ease(walking, since, EEYORE_EASE),
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.4 : Math.sin(time * 1.1) * 0.35,
    breath: breathAt(time, 2, !walking),
    blink: blinkAt(time, e.phase ?? 0, 3.1, 0.045),
    flop: walking ? Math.sin(phase * 2 * Math.PI + 1) : Math.sin(time * 1.5) * 0.3,
  };
  if (!walking && since >= EEYORE_EASE) {
    const at = e.actAt ?? since;
    const up = Math.max(3.2, stop - 1.4);
    // Standing he sighs (his head sinks lower) and flicks an ear; then he sits down, sighs again, and
    // rises before the walk.
    const loop =
      e.pose === "sit"
        ? [[0, Infinity, "sit", "sit"]]
        : [
            [0, 1.9, "stand", "stand"],
            [1.9, 3.0, "stand", "sit"],
            [3.0, up, "sit", "sit"],
            [up, stop - 0.2, "sit", "stand"],
          ];
    pose.rest = loopAt(loop, at);
    pose.head = -0.5 * bump(at, 0.5, 1.8, 0.4) - 0.4 * bump(at, 3.6, Math.max(3.8, up - 0.2), 0.4);
    pose.ear = bump(at, 1.0, 1.7, 0.2) + bump(at, 4.2, 4.9, 0.2) > 0.5 ? 1 : 0;
  }
  const shadow = { colour: shadowColour(g.pal), span: EEYORE_SHADOW };
  paintAt(g, Math.round(e.x), feet(g, e), e.dir, (plot) => drawHorse(EEYORE, pal, plot, pose), shadow);
}

// The Hundred Acre cast

// Built from parts (cast.js): Pooh, Piglet, Tigger, Rabbit and Roo, each walking its own way (Pooh waddles,
// Piglet trots, Tigger bounds on all fours, Rabbit and Roo hop) with its feet planted, easing into and out
// of a stop. Stopped, each stands, breathes, blinks and glances about, and when the stop is long enough
// Pooh, Piglet, Tigger and Roo sit and Rabbit relaxes, with a small habit (Pooh's paw to his mouth,
// Piglet's ear and tail, Tigger's flicking tail, Rabbit washing his face, Roo's ear). w.since (settle,
// critters.js) is when the walker's state last changed and w.timer the seconds its stop has left;
// w.pose "sit" or "stand" shows one on demand. Pooh and Piglet with w.held (a balloon frame, 0 to 3) hold
// a balloon up in a raised paw, and with w.lift > 1.5 (rows off the ground) hang from it. Their palettes
// are the scene's pooh, honey, piglet, tigger, rabbit, roo, balloon, balloon2 and bee arrays, and its
// groundShadow beside them.
function castAt(g, id, w, time) {
  if (g.trace) return g.trace.draw(castAt, g, id, w, time);
  drawCast(
    g,
    tonesFor(g.pal, "cast", () => castTones(g.pal)),
    id,
    castPose(id, w, time),
    Math.round(w.x),
    g.groundY + 8,
    Math.round(w.lift ?? 0),
    w.dir,
    id === "piglet" ? g.pal.balloon2 : g.pal.balloon,
  );
}

export function poohAt(g, w, time = 0) {
  if (g.trace) return g.trace.draw(poohAt, g, w, time);
  castAt(g, "pooh", w, time);
}
export function pigletAt(g, w, time = 0) {
  if (g.trace) return g.trace.draw(pigletAt, g, w, time);
  castAt(g, "piglet", w, time);
}

export function tiggerAt(g, w, time = 0) {
  if (g.trace) return g.trace.draw(tiggerAt, g, w, time);
  castAt(g, "tigger", w, time);
}

export function rabbitAt(g, w, time = 0) {
  if (g.trace) return g.trace.draw(rabbitAt, g, w, time);
  castAt(g, "rabbit", w, time);
}

export function rooAt(g, w, time = 0) {
  if (g.trace) return g.trace.draw(rooAt, g, w, time);
  castAt(g, "roo", w, time);
}

// The bees that swarm after Pooh and Piglet, and cross the sky on their own: a stream of seven from
// s = { x, y, dir } (cast.js), the scene's `bee` palette.
export function swarmAt(g, s, time = 0) {
  if (g.trace) return g.trace.draw(swarmAt, g, s, time);
  drawSwarm(g, s, time);
}

export { drawLooseBalloon };

// Primates

// Built from parts (primate.js): a macaque that walks the ground, a langur that sits on a branch and
// now and then hops to another, and a gibbon that brachiates under the crowns. Each palette is the
// scene's array under the animal's name (monkey, langur, gibbon) with the scene's `primate` entry
// beside it (the mouth, the call's song, and dark at night), and its groundShadow. Tones are cached per array.
const primateTones = (colours, make) => tonesFor(colours, "primate", make);

// A painter at origin (x0, base), own unit dx forward of it and h up.
const primatePlot = (g, x0, base, dir) => plotter(g, x0, base + 1, dir);

const MACAQUE_EASE = 0.25; // seconds a walk takes to start or stop
const MACAQUE_SIT = [0.3, 0.8]; // into a stop: it sits down over this
const MACAQUE_YAWN_AT = 1.6;
const MACAQUE_YAWN = 2.0;
const MACAQUE_SHADOW = [-2, 12]; // the columns its shadow spans

// The macaque walks on all fours with its feet planted (a diagonal-sequence walk), eases to a stop,
// sits down on its rump for a stop of 2 s or more and stands before it walks on, and in a long stop
// may yawn, showing its canines. Standing or sitting it breathes, blinks and looks up. m.since
// (settle, critters.js) is when its state last changed and m.timer the seconds its stop has left;
// m.pose "sit" sits it down and m.act "yawn" (with m.actAt seconds in) shows the yawn on demand. Its
// feet stand on m.y, or four rows below the soil line.
export function macaqueAt(g, m, time) {
  if (g.trace) return g.trace.draw(macaqueAt, g, m, time);
  const own = g.pal.primate;
  const pal = primateTones(g.pal.monkey, () => macaqueTones(g.pal.monkey, own));
  const walking = m.state === "walk";
  const since = sinceOf(m, time);
  const x = Math.round(m.x);
  const bodyX = m.x * m.dir;
  const phase = bodyX / (MACAQUE.stride / STANCE);
  const state = {
    phase,
    amp: ease(walking, since, MACAQUE_EASE),
    bodyX,
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.6 : Math.sin(time * 1.4) * 0.6,
    breath: breathAt(time, 2.2, !walking),
    blink: blinkAt(time, m.phase ?? 0, 3.1),
    headUp: 0,
  };
  if (!walking) {
    const stop = since + (m.timer ?? 0);
    const [d0, d1] = MACAQUE_SIT;
    let sit = 0;
    if (m.pose === "sit" || m.act) sit = 1;
    else if (stop >= 2) {
      const up = stop - 0.8;
      sit =
        since < d0 ? 0 : since < d1 ? (since - d0) / (d1 - d0) : since < up ? 1 : Math.max(0, 1 - (since - up) / 0.5);
    }
    state.rest = { from: "stand", to: "sit", u: sit };
    const r = hash(Math.round((m.since ?? 0) * 100), x, 7);
    const yawning =
      m.act === "yawn"
        ? (m.actAt ?? 0.8)
        : stop >= MACAQUE_YAWN_AT + MACAQUE_YAWN + 1.2 && r < 0.7
          ? since - MACAQUE_YAWN_AT
          : -1;
    const yawn = yawnAt(yawning);
    if (yawn) Object.assign(state, yawn, { blink: yawn.blink ?? false });
    else if (since > 1 && since < 2) state.headUp = Math.min(1, (since - 1) / 0.25, (2 - since) / 0.25);
  }
  // Its feet stand on m.y, or four rows below the soil line.
  const fy = (m.y ?? g.groundY + 4) + 1;
  const shadow = { colour: shadowColour(g.pal), span: MACAQUE_SHADOW };
  paintAt(g, x, fy, m.dir, (plot) => drawPrimate(MACAQUE, pal, plot, macaquePose(state)), shadow);
}

export const LANGUR_HOP_SECONDS = HOP[HOP.length - 1][1];

// A dusky langur sitting on a branch under a crown (l.x, its feet on the row above l.y, facing
// l.dir), its tail hanging behind the branch and swaying. Its reach move (l.moves.reach, see percher
// and fidget in critters.js) takes it up into the crown for a leaf that it eats. While l.hop
// ({ from, to, start }) runs, it rises onto all fours, leaps to the branch at `to` and sits there.
// The branch is drawn under each of l.perches (or l.x). Its palette is langur: [fur, face, white,
// belly], with the scene's leaf tones for the leaf.
export function langurAt(g, l, time) {
  if (g.trace) return g.trace.draw(langurAt, g, l, time);
  const own = g.pal.primate;
  const pal = primateTones(g.pal.langur, () => langurTones(g.pal.langur, [g.pal.leaf[1], g.pal.leaf[2]], own));
  let x = l.x;
  let lift = 0;
  let dir = l.dir;
  const state = {
    rest: { from: "sit", to: "sit", u: 0 },
    sway: Math.sin(time * 1.3 + (l.phase ?? 0)) * 1.5,
    breath: breathAt(time),
    blink: blinkAt(time, l.phase ?? 0, 3.3),
  };
  const hopping = l.hop && time >= l.hop.start && time < l.hop.start + LANGUR_HOP_SECONDS;
  if (hopping) {
    const hop = langurHop(time - l.hop.start, l.hop.from, l.hop.to);
    dir = l.hop.to > l.hop.from ? 1 : -1;
    x = hop.x;
    lift = hop.h;
    state.rest = hop.rest;
    if (hop.rest.from === "fly" || hop.rest.to === "fly") state.sway = 0;
    state.breath = hop.rest.from === "sit" && hop.rest.to === "sit" && state.breath;
  } else {
    const m = l.moves?.reach;
    const reach = m && time < m.until ? reachAt(m.lasts - (m.until - time)) : null;
    if (reach) Object.assign(state, reach);
  }
  // Own x 5 is the langur's middle, so it turns where it sits.
  const plot = primatePlot(g, Math.round(x) - dir * 5, l.y - 1 - lift, dir);
  const P = langurPose(state);
  drawPrimate(LANGUR, pal, plot, P, "back");
  for (const px of l.perches ?? [l.x]) {
    g.ctx.fillStyle = g.pal.trunk[0];
    g.ctx.fillRect(Math.round(px) - 8, l.y, 17, 1);
    g.ctx.fillStyle = g.pal.trunk[1];
    g.ctx.fillRect(Math.round(px) - 8, l.y + 1, 17, 1);
  }
  drawPrimate(LANGUR, pal, plot, P, "front");
}

export const GIBBON_CALL_SECONDS = CALL_SECONDS;
export const LANGUR_REACH_SECONDS = REACH_SECONDS;

// A white-handed gibbon brachiating under the crowns: one hand holds (b.hx, b.hy) while its body
// swings under it like a pendulum (b.t from 0, behind, to 1, ahead), the hands taking turns (b.count
// swings so far) and the free one letting go of the last hold (when b.prevOk) and taking the next.
// b.leap ({ fromX, fromY, x, y }) flies it across a gap; b.call (seconds in) stops it for its great
// call, hanging by both hands. holdAt(x) is the row a hand can hold at x, or null; `pal` holds its
// gibbon array [fur, face, white] and the primate entry.
export function gibbonAt(g, b, pal, time = 0, holdAt = () => null) {
  if (g.trace) return g.trace.draw(gibbonAt, g, b, pal, time, holdAt);
  const tones = primateTones(pal.gibbon, () => gibbonTones(pal.gibbon, pal.primate));
  const near = (b.count ?? 0) % 2 === 0;
  let P;
  let x0 = b.hx;
  let base = b.hy;
  if (b.call != null) P = gibbonCallAt(b.call, { near, time });
  else if (b.leap) {
    x0 = b.leap.fromX;
    base = b.leap.fromY;
    P = gibbonLeap(b.t, Math.abs(b.leap.x - b.leap.fromX), b.leap.fromY - b.leap.y, { near });
  } else {
    const prevY = b.prevOk ? holdAt(b.hx - b.dir * GIBBON_REACH) : null;
    const nextY = holdAt(b.hx + b.dir * GIBBON_REACH);
    P = gibbonSwing(b.t, { prev: prevY === null ? null : b.hy - prevY, next: nextY === null ? 0 : b.hy - nextY, near });
    P.blink = blinkAt(time, 0, 2.9);
  }
  drawPrimate(GIBBON, tones, primatePlot(g, Math.round(x0), Math.round(base), b.dir), P);
}

// Hares and rodents

// Built from parts (beast.js): the cottontail (meadow), the jackrabbit (desert) and the groundhog
// (smokies). A hare hops in whole hops with its feet planted where they land (push off, stretch,
// land on the forefeet, hind feet swung forward); a groundhog walks on four short drawn legs. Stopped
// (state "sit") each gathers, then takes the pose r.pose names (harePoses(kind), picked by rest() in
// critters.js) and eases back before it moves on: a hare sits up tall (the jackrabbit stands to look
// out) with its ears turning, grazes, washes its face, loafs or lies out; a groundhog stands up to look
// about, sits to eat or sprawls in the sun. While r.frozen holds seconds (the desert hawk's stoop) a
// hare presses flat with its ears back. r.since and r.timer come from settle() and wander(); r.kind
// is "cottontail" (the default), "jackrabbit" or "groundhog". Its palette is [fur, dark, white], or
// for a groundhog [fur, dark, grizzle], with the scene's `groundShadow` beside it.
export { harePoses };

export function hareAt(g, r, time = 0) {
  if (g.trace) return g.trace.draw(hareAt, g, r, time);
  const kind = r.kind ?? "cottontail";
  const colours = g.pal[r.pal ?? (kind === "groundhog" ? "groundhog" : "rabbit")];
  const pal = tonesFor(colours, "beast", () => beastTones(colours, kind === "groundhog" ? { H: colours[2] } : {}));
  const f = beastFrame(kind, r, time);
  const [s0, s1] = f.shadow;
  const shadow = { colour: shadowColour(g.pal), span: [s0, s1 - 1] };
  // f.at is its origin in its own mirrored coordinates, so the page column is -f.at facing left.
  const ox = Math.round(f.at) * r.dir;
  paintAt(g, ox, feet(g, r), r.dir, (plot) => drawBeast(BEASTS[kind].spec, pal, plot, f.P, f.x), shadow);
}

// Ground birds

// Built from parts (groundbird.js): the roadrunner (desert), the wild turkey (Smokies), the secretary bird
// (Serengeti) and the moa, a feral rooster (Hawaii). A bird walks with its feet planted: its stride clock
// b.c (critters.js stride) grows with the ground it covers, GROUND_STRIDE[kind] being [px a stride, seconds
// a stride], and groundSpeed(kind) the speed that goes with it (the roadrunner runs, the others walk). It
// eases into a stop (b.amp, the share of walking still in its legs) and plays the pose rest() picked
// as it stopped (groundPoses): the roadrunner's tail pump, preen and wing stretch; the turkey's display (the
// fan spreads, it struts on slow steps, then folds) and preen; the secretary bird's stamping hunt, preen
// and stretch; the moa's pecks in threes, scratch, preen and wing flap. b.since (settle) is when its state
// changed and b.timer the seconds its stop has left. Call groundBirdStep() after wander() and rest() each
// update. A bird's palette is named after its kind, with the scene's groundShadow beside it.
export const groundSpeed = speedOf;
const GROUND_STRIDE = Object.fromEntries(
  Object.keys(CYCLE).map((kind) => [kind, [speedOf(kind) * CYCLE[kind], CYCLE[kind]]]),
);
export const groundPoses = (b, kind) => restPoses(kind, b.timer ?? 0);

export function groundBirdStep(f, b, dt, kind, x0) {
  if (!b.active) return;
  const strut = STRUT[kind];
  if (strut && b.state === "sit" && b.pose === strut.pose && b.x > 14 && b.x < f.cols - 14) {
    const since = f.time - (b.since ?? f.time);
    if (since > strut.from && since < strut.to) b.x += b.dir * strut.speed * dt;
  }
  const [px, cycle] = GROUND_STRIDE[kind];
  stride(b, x0, dt, px, cycle);
  const goal = b.moving ? 1 : 0;
  b.amp ??= goal;
  b.amp += (goal - b.amp) * Math.min(1, dt / (goal ? 0.1 : 0.12));
  if (Math.abs(goal - b.amp) < 0.01) b.amp = goal;
}

export function groundBirdAt(g, b, kind, time = 0) {
  if (g.trace) return g.trace.draw(groundBirdAt, g, b, kind, time);
  const spec = GROUND_MEMBERS[kind];
  const C = groundTones(spec, g.pal[b.pal ?? kind]);
  const walking = b.state === "walk";
  const amp = b.amp ?? (walking ? 1 : 0);
  const seed = (b.phase ?? 0) % 7;
  const since = sinceOf(b, time);
  const P = walking
    ? { ...restPose(kind, "stand", 0, time, seed), neckH: 0, neckX: 0 }
    : restPose(kind, b.pose ?? "stand", since, time, seed);
  const fan = P.fan ?? 0;
  const dir = b.dir;
  const bodyX = dir * b.x - spec.cx;
  Object.assign(P, {
    phase: b.c ?? (b.phase ?? 0) * 0.25,
    amp,
    run: kind === "runner" ? amp : 0,
    bob: amp * (1 - fan * 0.7),
    bodyX,
  });
  if (kind === "runner") {
    P.crest = P.crest === 0 ? 0 : amp > 0.5 ? 0.45 : 1;
    P.tailAng = (P.tailAng ?? 0) + amp * Math.sin(time * 5.1 + seed) * 7;
  }
  // The build draws its own shadow, as the cells on row -1. bodyX is its origin in its own mirrored
  // coordinates, and facing left it is mirrored about the edge between columns -1 and 0.
  const origin = Math.round(bodyX);
  const shade = shadowColour(g.pal);
  paintAt(g, dir > 0 ? origin : -origin - 1, feet(g, b), dir, (plot) =>
    drawGroundBird(spec, C, (u, h, colour) => plot(u, h, h < 0 ? shade : colour), P),
  );
}

// Shelled and scaled

// Built from parts (shell.js): a desert tortoise that plods in diagonal pairs with its shell rocking,
// a snake that slithers through bends fixed to the ground, a honu that swims on strokes of its fore
// flippers, and a ghost crab that scuttles sideways. Each palette is the scene's array under the
// animal's name (tortoise, snake, turtle, crab) with the scene's `groundShadow` beside it (and the
// snake's `snakeTongue` and `snakeBuzz`). Tones are made once per array and animal, so the honu and its
// hatchling, which share the turtle array, keep their own.
const shellTones = (colours, key, make) => tonesFor(colours, key, () => make(colours));

// Paints an animal whose own units are laid at origin `ox` (in its mirrored coordinates, so the animal
// faces `dir`), its feet on row y - 1, over a soft shadow on row y from column s0 to s1 (exclusive).
function shellAt(g, ox, y, dir, [s0, s1], draw) {
  paintAt(g, ox * dir, y, dir, draw, { colour: shadowColour(g.pal), span: [s0, s1 - 1] });
}

// A desert tortoise walking, or stopped: it pulls its head in and settles on its plastron (the
// default), grazes or lifts its head to look, as t.pose (TORTOISE_POSES) says. Its feet stand on row
// y - 1. Its palette is tortoise: [shell, seam, skin, rim].
export const tortoisePoses = TORTOISE_POSES;
export function tortoiseAt(g, t, y, time = 0) {
  if (g.trace) return g.trace.draw(tortoiseAt, g, t, y, time);
  const f = tortoiseFrame(t, time);
  const pal = shellTones(g.pal.tortoise, "tortoise", tortoiseTones);
  shellAt(g, Math.round(f.at), y, t.dir, TORTOISE.shadow, (plot) => drawTortoise(pal, plot, f.pose));
}

// A snake slithering, or stopped: stretched flicking its tongue, coiled, or reared with its rattle
// buzzing, as s.pose (SNAKE_POSES) says. Its palette is snake: [sand, brown].
export const snakePoses = SNAKE_POSES;
export function snakeAt(g, s, time = 0) {
  if (g.trace) return g.trace.draw(snakeAt, g, s, time);
  const f = snakeFrame(s, time);
  const pal = shellTones(g.pal.snake, "snake", (c) => snakeTones(c, g.pal.snakeTongue));
  shellAt(g, f.at, s.y ?? g.groundY + 6, s.dir, SNAKE_UNITS.shadow, (plot) => {
    drawSnake(pal, plot, f.nodes, f.pose);
    if (f.pose.buzz != null) drawBuzz(plot, g.pal.snakeBuzz, f.nodes[0], f.pose.buzz);
  });
}

// A sea turtle swimming with its shell's bottom row at y, or its hatchling at scale k below 1. Its
// palette is turtle: [shell, dark, skin].
export function honuShellAt(g, t, y, time, k = 1) {
  if (g.trace) return g.trace.draw(honuShellAt, g, t, y, time, k);
  const hatch = k < 1;
  const unit = hatch ? HATCHLING : HONU;
  // Its shell's bottom row is y, the row its feet would stand on; its middle is at t.x.
  const x = Math.round(t.x) - t.dir * unit.mid;
  if (hatch) {
    const stroke = strokeAt(time / HATCHLING.cycle + 0.3 + (t.phase ?? 0) * 0.1).stroke;
    paintAt(g, x, y + 1, t.dir, (plot) =>
      drawHatchling(shellTones(g.pal.turtle, "hatchling", hatchTones), plot, stroke),
    );
  } else {
    const swim = swimAt(time);
    const pal = shellTones(g.pal.turtle, "honu", honuTones);
    paintAt(g, x, y + 1, t.dir, (plot) => drawHonu(pal, (px, h, colour) => plot(px, h + swim.bob, colour), swim.pose));
  }
}

// A honu hauled out on the sand with its feet on row y - 1: t.mode "crawl" heaves itself along on both
// fore flippers (t.age seconds in; the scene moves its x with crawlX), "bask" lies flat blinking,
// gasping and flicking sand onto its back (t.age seconds into the bask). Its palette is turtle:
// [shell, dark, skin], with sand grains of the scene's soil[2].
export { CRAWL, crawlX } from "./shell.js";
export function honuAshoreAt(g, t, y) {
  if (g.trace) return g.trace.draw(honuAshoreAt, g, t, y);
  const crawling = t.mode === "crawl";
  const pose = crawling ? crawlAt(t.age / CRAWL) : baskAt(t.age);
  const pal = shellTones(g.pal.turtle, "honu", honuTones);
  shellAt(g, Math.round(t.x) * t.dir - HONU.mid, y, t.dir, HONU.shadow, (plot) => {
    drawHonu(pal, plot, pose);
    if (!crawling) drawGrains(plot, g.pal.soil[2], t.age);
  });
}

// A ghost crab scuttling sideways, or stopped (alert, crouched or threatening with its claws raised,
// as c.pose says, CRAB_POSES), its legs on row y. Its palette is crab: [shell, dark].
export const crabPoses = CRAB_POSES;
export function crabAt(g, c, y, time = 0) {
  if (g.trace) return g.trace.draw(crabAt, g, c, y, time);
  const f = crabFrame(c, time);
  const pal = shellTones(g.pal.crab, "crab", crabTones);
  shellAt(g, Math.round(f.at), y + 1, c.dir ?? 1, CRAB.shadow, (plot) => drawCrab(pal, plot, f.pose));
}

// Long-necked birds

// Built from parts (longneck.js): the trumpeter and whooper swans (Yellowstone, Iceland) and the lesser
// flamingo (Serengeti). A swan walks with its feet planted: its stride clock s.c (critters.js stride) grows
// with the ground it covers, SWAN_STRIDE being [px a stride, seconds a stride] and SWAN_SPEED the speed that
// goes with it; swanStep() keeps it. It eases into a stop and plays the pose rest() picked from
// swanPoses(s): on land it stands, grazes with its neck bent to the grass (a stop with no pose
// grazes), looks about, preens or stretches and flaps; on the water (s.swimming, at the water line s.y)
// it glides with a wake, dabbles with its head under and its tail up, preens or flaps. A flyer (pose
// "fly") beats slow and deep with its neck stretched out and its feet trailing. A flamingo flies the
// same way, or, when it has a state (a walker), wades on slow high steps (b.water the depth of the
// water over its feet) and rests: it filters with its head down or stands on one leg. Palettes: swan [white, shade, bill base, bill tip] (the scene may name another, as `pal`)
// and flamingo [pink, wing, dark], with groundShadow, and pond (or fjord, or water) for the water.
export const SWAN_STRIDE = [SWAN_SPEED, 1.1];
export const swanSpeed = SWAN_SPEED / SWAN_STRIDE[1];
export const swanPoses = (s) => SWAN_RESTS[s.swimming ? "water" : "land"];

// Keeps a swan's or a flamingo's stride clock; call it after wander(), with x0 where it stood before.
export function longNeckStep(w, x0, dt, [px, cycle]) {
  stride(w, x0, dt, px, cycle);
}

// The swan's and the flamingo's shared gait and rest: the walking pose at stride c, or the rest pose
// the bird eased into once its feet stopped where they were.
function walkOrRest(s, time, { walkAt, rest, stand }) {
  const c = s.c ?? (s.phase ?? 0) * 0.25;
  const moving = s.moving ?? s.state === "walk";
  const held = s.c != null && c - Math.floor(c) > 1e-6;
  if (moving || held) {
    const w = walkAt(c);
    const since = s.since == null ? 1 : time - s.since;
    return moving && since < 0.3 ? mixPose(stand(w), w, smooth(since / 0.3)) : w;
  }
  const still = stillOf(s, time);
  const w = walkAt(Math.round(c));
  const r = rest(still, still + (s.timer ?? 60), w);
  return s.c == null ? r : mixPose(w, r, smooth(Math.min(1, still / 0.3)));
}

export function swanAt(g, s, time = 0) {
  if (g.trace) return g.trace.draw(swanAt, g, s, time);
  const T = swanTones(g, s.pal ?? "swan");
  const dir = s.dir;
  const phase = s.phase ?? 0;
  if (s.pose === "fly") {
    const c = time * 1.5 + phase * 0.37;
    const y = Math.round(s.y + Math.sin(time * 1.1 + phase));
    drawSwan(g, Math.round(s.x), y + 7, dir, swanFly(c), T, { time, drop: Math.sin(c * Math.PI * 2) * 0.4 });
    return;
  }
  const y = feet(g, s);
  const ox = Math.round(s.x) + dir * 3;
  const sit = s.state === "sit" ? (s.pose ?? "graze") : "stand";
  if (s.swimming) {
    const moving = s.moving ?? s.state === "walk";
    if (moving) {
      wake(g, ox, y, dir, time, { speed: 1 });
      drawSwan(g, ox, y, dir, swanSwim(time + phase), T, { time });
      return;
    }
    const still = stillOf(s, time);
    const total = still + (s.timer ?? 60);
    wake(g, ox, y, dir, time, { speed: 0.3 });
    drawSwan(g, ox, y, dir, swanRest(s.pose ?? "glide", still, total, { water: true, time }), T, { time });
    if (s.pose === "dabble") for (const a of [1.4, 2.2, 3]) ring(g, ox + dir * 4, y, (still - a) / 0.8, 6);
    return;
  }
  const p = walkOrRest(s, time, {
    walkAt: (c) => swanWalk(c),
    rest: (since, total, w) => swanRest(sit, since, total, { legs: [w.legs.n, w.legs.f], time }),
    stand: (w) => swanRest("stand", 1, 60, { legs: [w.legs.n, w.legs.f], time }),
  });
  drawSwan(g, ox, y, dir, p, T, { time });
}

// A flamingo in flight: a pale pink body, a red wing with black flight feathers, its neck held out
// ahead and its legs trailing. On the ground (b.state) it wades or rests. Its palette is flamingo:
// [pink, wing, dark].
export function flamingoAt(g, b, time = 0) {
  if (g.trace) return g.trace.draw(flamingoAt, g, b, time);
  const T = flamingoTones(g);
  const dir = b.dir;
  if (b.state == null || b.pose === "fly") {
    const c = time * 1.5 + (b.phase ?? 0) * 0.37 + 0.2;
    const y = Math.round(b.y + Math.sin(time * 1.2 + (b.phase ?? 0)) * 2);
    drawFlamingo(g, Math.round(b.x), y + 7, dir, flamingoFly(c), T, { time, drop: Math.sin(c * Math.PI * 2) * 0.4 });
    return;
  }
  const y = feet(g, b);
  const ox = Math.round(b.x) + dir * 2;
  const sit = b.state === "sit" ? (b.pose ?? "stand") : "stand";
  const keep = (w) => w.legs;
  const p = walkOrRest(b, time, {
    walkAt: (c) => flamingoWade(c),
    rest: (since, total, w) => flamingoRest(sit, since, total, { legs: keep(w), time }),
    stand: (w) => flamingoRest("stand", 1, 60, { legs: keep(w), time }),
  });
  drawFlamingo(g, ox, y, dir, { ...p, water: b.water ?? 0 }, T, { time });
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
export const felidPoses = (kind) => (FELID_ARCHES.has(kind) ? ["sit", "arch", "lie", "bow"] : ["sit", "lie", "bow"]);

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
// holds the seconds into a roar, it stands and roars.
export function felidAt(g, c, time) {
  if (g.trace) return g.trace.draw(felidAt, g, c, time);
  const spec = FELIDS[c.kind];
  const pal = tonesOf(c.kind, g.pal[c.pal ?? c.kind]);
  const dir = c.dir;
  const since = sinceOf(c, time);
  const walking = c.state === "walk";
  const resting = !walking && c.state !== "stand" && c.roar == null;
  const name = felidPoses(c.kind).includes(c.pose) ? c.pose : "sit";
  let rest = null;
  if (resting) rest = { from: "stand", to: name, u: (since - EASE * 0.6) / SETTLE };
  else if (walking && c.lastPose && since < RISE) rest = { from: c.lastPose, to: "stand", u: since / RISE };
  let act = null;
  if (c.roar != null) act = roarAt(c.roar);
  else if (resting && since > 3) act = yawnAt((since - 3) % YAWN_EVERY);
  const phase = walking ? (c.x * dir) / (spec.stride / STANCE) : 0;
  const pose = {
    phase,
    amp: ease(walking, since, EASE),
    bodyX: c.x * dir,
    rest,
    sway: walking ? Math.sin(phase * 2 * Math.PI) * 0.75 : Math.sin(time * 1.4) * 0.6,
    breath: breathAt(time, 2.2, !walking),
    blink: !act && blinkAt(time, c.since ?? 0, 3.3),
    headUp: 0,
    ...(act ?? {}),
  };
  // spec.mid is the column at its x. Its shadow covers the columns from s0 up to s1 facing right, and
  // the same edges mirrored (from s0 + 1 to s1) facing left.
  const [s0, s1] = spec.shadow;
  const shadow = { colour: shadowColour(g.pal), span: dir > 0 ? [s0, s1 - 1] : [s0 + 1, s1] };
  const x = Math.round(c.x) - dir * spec.mid;
  paintAt(g, x, feet(g, c), dir, (plot) => drawBody(spec, pal, plot, pose), shadow);
}
