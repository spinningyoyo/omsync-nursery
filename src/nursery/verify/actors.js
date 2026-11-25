import { doing } from "../js/kit/critters.js";

// Which animal each traced driver draws: its family, what kind of mover it is and which member of
// the family it is. The family's size tier and predator or prey come from families.js, so the
// catalogue and the studio read the same tags. A driver missing here is reported as unclassified.
//
// role: "walker" stands or walks on the ground; "flyer" crosses the sky; "perch" is a bird that may
// sit on a plant or rock (its role is "perched" while it sits); "group" is several animals drawn
// together (a flock, a swarm); "climber" lives in the trees; "swimmer" lives in water; "prop" is
// something storybook that is not an animal.
const walker = (family, member) => ({ family, role: "walker", member });
const flyer = (family, member, day = true) => ({ family, role: "flyer", member, day });
const group = (family, member, day = false) => ({ family, role: "group", member, day });
const KIND = { african: "elephant-african", asian: "elephant-asian" };

export const DRIVERS = {
  bearAt: walker("bears", (a) => (a.cub ? "bear-cub" : a.kind === "grizzly" ? "grizzly" : "bear")),
  canidAt: walker("dogs", (a) => {
    if ((a.scale ?? 1) < 0.8) return "pup";
    return a.kind === "red" || a.kind === "arctic" ? "fox" : a.kind;
  }),
  felidAt: walker("cats", (a) => (a.kind === "clouded" ? "clouded-leopard" : a.kind === "housecat" ? "cat" : a.kind)),
  lionAt: walker("cats", () => "lion"),
  cubAt: walker("cats", () => "cub"),
  cervidAt: walker("deer", (a) => (a.kind === "whitetail" ? "deer" : a.kind === "reindeer" ? "stag" : a.kind)),
  zebraAt: walker("horses", () => "zebra"),
  giraffeAt: walker("giraffes", () => "giraffe"),
  bighornAt: walker("cattle-sheep", () => "bighorn"),
  bisonAt: walker("cattle-sheep", () => "bison"),
  elephantAt: walker("elephants", (a) => KIND[a.kind] ?? "elephant"),
  puaaAt: walker("pigs", () => "puaa"),
  hareAt: walker("hares-rodents", (a) => a.kind ?? "rabbit"),
  eeyoreAt: walker("horses", () => "eeyore"),
  poohAt: walker("bears", () => "pooh"),
  pigletAt: walker("pigs", () => "piglet"),
  tiggerAt: walker("cats", () => "tigger"),
  rabbitAt: walker("hares-rodents", () => "rabbit"),
  rooAt: walker("hares-rodents", () => "roo"),
  wonderlandRabbitAt: walker("hares-rodents", () => "rabbit"),
  wonderlandHareAt: walker("hares-rodents", () => "hare"),
  wonderlandDodoAt: walker("ground-birds", () => "dodo"),
  wonderlandSoldierAt: walker("storybook", () => "soldier"),
  roadrunnerAt: walker("ground-birds", () => "roadrunner"),
  turkeyAt: walker("ground-birds", () => "turkey"),
  secretaryAt: walker("ground-birds", () => "secretary"),
  moaAt: walker("ground-birds", () => "moa"),
  groundBirdAt: walker("ground-birds", (a) => a.kind ?? "ground bird"),
  sealAt: walker("swimmers", () => "seal"),
  otterAt: walker("swimmers", () => "otter"),
  crabAt: walker("shelled-scaled", () => "crab"),
  tortoiseAt: walker("shelled-scaled", () => "tortoise"),
  snakeAt: walker("shelled-scaled", () => "snake"),
  honuAshoreAt: walker("shelled-scaled", () => "honu"),
  swanAt: {
    family: "long-necked-birds",
    member: () => "swan",
    role: (a) => (a.pose === "fly" ? "flyer" : a.swimming ? "swimmer" : "walker"),
    day: (a, _args, scene) => scene === "yellowstone" || a?.pose === "fly",
  },
  flamingoAt: flyer("long-necked-birds", () => "flamingo"), // it only ever flies across
  honuAt: { family: "shelled-scaled", role: "swimmer", member: () => "honu" },
  honuShellAt: { family: "shelled-scaled", role: "swimmer", member: () => "honu" },
  whaleAt: { family: "swimmers", role: "swimmer", member: () => "whale" },
  // The reef. Mantle walks on its arms; jetting home it is off the sand on purpose (its lift).
  octopusAt: walker("cephalopods", () => "octopus"),
  inkAt: { family: "cephalopods", role: "prop", member: () => "ink" },
  epauletteAt: { ...walker("fish", () => "epaulette"), day: false },
  fishAt: {
    family: "fish",
    role: "swimmer",
    member: (_a, args) => args[0],
    // The blacktip hunts by night too; a day fish asleep (in its anemone, in its cocoon) is a night detail.
    day: (a, args) => args[0] !== "blacktip" && !a?.asleep,
  },
  schoolAt: group("fish", (_a, args) => `${args[0]} school`, true),
  mantaAt: { family: "rays", role: "swimmer", member: () => "manta", day: true },
  mantaShadow: { family: "rays", role: "prop", member: () => "manta shadow" },
  macaqueAt: { family: "primates", role: "climber", member: () => "monkey" },
  langurAt: { family: "primates", role: "climber", member: () => "langur" },
  gibbonAt: { family: "primates", role: "climber", member: () => "gibbon" },
  // Birds. A visit (flyByPerch) lands on a plant, sits and leaves: role "perched" in its perch mode.
  visitAt: { family: "small-flyers", member: (_a, args) => args[0], role: visitRole, day: true },
  smallVisitAt: { family: "small-flyers", member: (_a, args) => args[0], role: visitRole, day: true },
  flyerAt: {
    family: "small-flyers",
    member: (_a, args) => args[args.length - 1],
    role: visitRole,
    day: true,
  },
  kingfisherAt: { family: "small-flyers", member: () => "kingfisher", role: visitRole, day: true },
  tropicbirdAt: { family: "small-flyers", member: () => "tropicbird", role: visitRole, day: true },
  rollerAt: flyer("small-flyers", () => "roller"),
  kessieAt: flyer("small-flyers", () => "kessie"),
  puffinAt: flyer("small-flyers", () => "puffin"),
  hornbillAt: flyer("small-flyers", () => "hornbill"),
  eagleFlyAt: {
    family: "soaring-birds",
    member: (_a, args) => `eagle-${args[0]}`,
    role: visitRole,
    day: true,
  },
  circlerAt: { family: "soaring-birds", member: (_a, args) => `eagle-${args[0]}`, role: visitRole, day: true },
  glideAt: {
    family: "soaring-birds",
    member: (_a, args) => args[0],
    role: (a) => (a?.visit && a.visit.mode !== "wait" ? visitRole(a) : a?.members ? "group" : "flyer"),
    day: true,
  },
  hawkAt: flyer("soaring-birds", () => "hawk"),
  wonderlandVultureAt: flyer("soaring-birds", () => "vulture"),
  owlFlyAt: flyer("owls", () => "owl", false),
  owlPerchAt: { family: "owls", role: "perched", member: () => "owl", day: false },
  owlHomeAt: {
    family: "owls",
    role: (_a, args) => (args.some((x) => x?.glide) ? "flyer" : "perched"),
    member: () => "owl",
    day: false,
  },
  nesterAt: {
    family: "small-flyers",
    role: (a, args) => (a?.moves && doing(a, "fish", args[1] ?? 0) >= 0 ? "flyer" : "perched"),
    member: () => "puffin",
    day: false,
  },
  // Several animals drawn together: each is smaller than the group, so only the page edge matters.
  flockAt: group("small-flyers", () => "puffin flock", true),
  wonderlandFlockAt: group("storybook", () => "flock", false),
  pairAt: group("small-flyers", () => "hornbill pair", true),
  swarmAt: group("insects", () => "bees"),
  butterflyAt: { family: "insects", role: "insect", member: () => "butterfly" },
  fireflyAt: { family: "insects", role: "insect", member: () => "firefly" },
  balloonAt: { family: "storybook", role: "prop", member: () => "balloon" },
  wonderlandCatAt: { family: "cats", role: "prop", member: () => "cat" },
  wonderlandCaterpillarAt: { family: "insects", role: "prop", member: () => "caterpillar" },
  wonderlandHatAt: { family: "storybook", role: "prop", member: () => "hat" },
  wonderlandTeaPartyAt: { family: "storybook", role: "prop", member: () => "tea party" },
};

// The mode of a bird's visit: sitting on a plant ("perched") or in the air.
function visitRole(a) {
  return a?.visit?.mode === "perch" ? "perched" : "flyer";
}

// States in which a walker's feet are off the ground on purpose: a pounce, a bound, a leap, a climb.
export function airborne(a) {
  if (!a) return false;
  return (
    (a.lift ?? 0) > 0 ||
    Boolean(a.climb) ||
    ["pounce", "run", "leap", "jump", "bound", "hop", "fly"].includes(a.state) ||
    // a roll in the dust (zebra) or a wallow (bison) rocks the body on its back
    ["bound", "pounce", "fly", "flap", "up", "roll", "wallow"].includes(a.pose)
  );
}

export function classify(driver, actor, args, scene) {
  const entry = DRIVERS[driver];
  if (!entry) return { family: null, role: "unclassified", member: driver, day: false };
  const rest = args.filter((a) => typeof a !== "object" || a === null);
  const member = entry.member(actor ?? {}, rest.length ? rest : args);
  const role = typeof entry.role === "function" ? entry.role(actor, args) : entry.role;
  const young = (actor?.scale ?? 1) < 0.8 || Boolean(actor?.cub) || member === "pup" || member === "cub";
  return {
    family: entry.family,
    role,
    member,
    young,
    day: typeof entry.day === "function" ? Boolean(entry.day(actor, args, scene)) : Boolean(entry.day),
    state: actor?.state ?? actor?.visit?.mode ?? null,
  };
}
