// The families of the scenes: every animal and tree belongs to one, and shares its design. A family
// lists what its members may differ in, and its members by scene, as sprite names without the scene.
// A name covers its poses too: "fox" is also "fox-pounce". `storybook` members are shown with the
// family to compare, but keep their book's look and do not take the family's design.
export const FAMILIES = [
  {
    id: "bears",
    title: "Bears",
    group: "Animals",
    differ: "size, colour, hump",
    members: { meadow: ["bear"], smokies: ["bear"], yellowstone: ["grizzly"] },
    storybook: { hundredacre: ["pooh"] },
  },
  {
    id: "dogs",
    title: "Dogs",
    group: "Animals",
    differ: "size, colour, tail",
    members: { meadow: ["fox"], iceland: ["fox"], desert: ["coyote"], yellowstone: ["wolf"] },
  },
  {
    id: "cats",
    title: "Cats",
    group: "Animals",
    differ: "size, mane, colour, markings, ears, tail",
    members: {
      serengeti: ["lion", "cub", "cheetah"],
      yellowstone: ["cougar"],
      rainforest: ["clouded-leopard"],
      meadow: ["bobcat"],
      smokies: ["bobcat"],
      desert: ["bobcat"],
      hawaii: ["cat"],
      iceland: ["cat"],
    },
    storybook: { hundredacre: ["tigger"], wonderland: ["cat", "grin"] },
  },
  {
    id: "deer",
    title: "Deer",
    group: "Animals",
    differ: "size, antlers or horns, mane",
    members: {
      meadow: ["elk"],
      smokies: ["deer", "elk"],
      iceland: ["hind", "stag"],
      yellowstone: ["elk", "pronghorn"],
    },
  },
  {
    id: "horses",
    title: "Horses",
    group: "Animals",
    differ: "size, colour, stripes",
    members: { serengeti: ["zebra"] },
    storybook: { hundredacre: ["eeyore"] },
  },
  {
    id: "giraffes",
    title: "Giraffes",
    group: "Animals",
    differ: "size, pattern",
    members: { serengeti: ["giraffe"] },
  },
  {
    id: "cattle-sheep",
    title: "Wild cattle and sheep",
    group: "Animals",
    differ: "size, horns, hump",
    members: { desert: ["bighorn"], yellowstone: ["bighorn", "bison"] },
  },
  {
    id: "elephants",
    title: "Elephants",
    group: "Animals",
    differ: "size, ears",
    members: { serengeti: ["elephant"], rainforest: ["elephant"] },
  },
  {
    id: "pigs",
    title: "Pigs",
    group: "Animals",
    differ: "size, colour",
    members: { hawaii: ["puaa"] },
    storybook: { hundredacre: ["piglet"] },
  },
  {
    id: "hares-rodents",
    title: "Hares and rodents",
    group: "Animals",
    differ: "size, ears",
    members: { meadow: ["rabbit"], desert: ["rabbit"], smokies: ["groundhog"] },
    storybook: { hundredacre: ["rabbit", "roo"], wonderland: ["rabbit", "hare"] },
  },
  {
    id: "primates",
    title: "Primates",
    group: "Animals",
    differ: "size, colour, arm length",
    members: { rainforest: ["monkey", "langur", "gibbon"] },
  },
  {
    id: "swimmers",
    title: "Seals, otters and whales",
    group: "Animals",
    differ: "size, colour, flippers or paws",
    members: { hawaii: ["seal", "whale"], rainforest: ["otter"] },
  },
  {
    id: "fish",
    title: "Fish and sharks",
    group: "Animals",
    differ: "size, body profile, tail, fins, markings; the epaulette walks on its fins",
    members: {
      greatbarrier: ["clownfish", "chromis", "anthias", "wrasse", "parrotfish", "trevally", "blacktip", "epaulette"],
    },
  },
  {
    id: "rays",
    title: "Rays",
    group: "Animals",
    differ: "span, colour, belly spots",
    members: { greatbarrier: ["manta"] },
  },
  {
    id: "cephalopods",
    title: "Octopuses",
    group: "Animals",
    differ: "size, skin colour and its changes",
    members: { greatbarrier: ["mantle"] },
  },
  {
    id: "shelled-scaled",
    title: "Shelled and scaled",
    group: "Animals",
    differ: "shell, length",
    members: { desert: ["tortoise", "snake"], hawaii: ["honu", "crab"], greatbarrier: ["turtle"] },
  },
  {
    id: "insects",
    title: "Insects",
    group: "Animals",
    differ: "size, colour, glow",
    members: {
      meadow: ["butterfly"],
      rainforest: ["firefly"],
      hundredacre: ["firefly", "bees"],
    },
    storybook: { wonderland: ["caterpillar", "bread"] },
  },
  {
    id: "storybook",
    title: "Storybook people and things",
    group: "Animals",
    differ: "each follows its book",
    members: {},
    storybook: { wonderland: ["soldier", "hat", "flock"], hundredacre: ["balloon"] },
  },
  {
    id: "soaring-birds",
    title: "Soaring birds",
    group: "Birds",
    differ: "size, colour, head",
    members: {
      meadow: ["eagleGolden"],
      yellowstone: ["eagleBald"],
      desert: ["hawk", "vulture"],
      serengeti: ["vultureAfrica"],
      rainforest: ["serpent"],
      smokies: ["eagleGolden"],
    },
    storybook: { wonderland: ["vulture"] },
  },
  {
    id: "small-flyers",
    title: "Small flyers",
    group: "Birds",
    differ: "size, colour, bill",
    members: {
      meadow: ["kingfisher", "jay"],
      rainforest: ["kingfisher", "hornbill"],
      serengeti: ["roller"],
      hawaii: ["tropicbird", "iiwi"],
      iceland: ["puffin"],
      yellowstone: ["bluebird"],
      smokies: ["cardinal", "swift"],
      hundredacre: ["kessie"],
    },
    storybook: { wonderland: ["pigeon", "lory"] },
  },
  {
    id: "long-necked-birds",
    title: "Long-necked birds",
    group: "Birds",
    differ: "neck, colour, legs",
    members: { yellowstone: ["swan"], iceland: ["swan"], serengeti: ["flamingo"] },
  },
  {
    id: "owls",
    title: "Owls",
    group: "Birds",
    differ: "size, ear tufts",
    members: { desert: ["owl"], smokies: ["owl"], iceland: ["owl"], hundredacre: ["owl"] },
  },
  {
    id: "ground-birds",
    title: "Ground birds",
    group: "Birds",
    differ: "size, tail, legs",
    members: {
      desert: ["roadrunner"],
      smokies: ["turkey"],
      serengeti: ["secretary"],
      hawaii: ["moa"],
    },
    storybook: { wonderland: ["dodo"] },
  },
  {
    id: "broadleaf",
    title: "Broadleaf trees",
    group: "Trees",
    differ: "height, colour, bark, airiness",
    members: {
      meadow: ["tree-round", "tree-dogwood", "tree-birch"],
      hundredacre: ["tree-beech", "tree-oak", "slim", "beeTree"],
      smokies: [
        "tree-sugarMaple",
        "tree-hickory",
        "tree-beech",
        "tree-yellowBirch",
        "tree-redMaple",
        "tree-sourwood",
        "tree-tulip",
        "tree-blackGum",
      ],
      yellowstone: ["aspen"],
      hawaii: ["tree-plumeria"],
      iceland: ["birch"],
    },
    storybook: {
      hundredacre: ["owlHouse", "poohHouse", "pigletHouse"],
      wonderland: ["willow", "witchTree"],
    },
  },
  {
    id: "conifers",
    title: "Conifers",
    group: "Trees",
    differ: "height, colour, how wide and low the tiers reach, droop and hang",
    members: {
      meadow: ["sequoia", "tree-pine"],
      hundredacre: ["pine", "fir"],
      smokies: ["tree-hemlock"],
      yellowstone: ["lodgepole"],
    },
  },
  {
    id: "wide-canopy",
    title: "Wide-canopy trees",
    group: "Trees",
    differ: "flatness, roots, height",
    members: { serengeti: ["acacia"], rainforest: ["tree-fig", "tree-dipterocarp"] },
  },
  {
    id: "palm-like",
    title: "Palm-like trees",
    group: "Trees",
    differ: "frond shape, height",
    members: {
      hawaii: ["tree-coconut"],
      rainforest: ["treefern", "banana", "cycad", "bamboo"],
    },
  },
  {
    id: "desert-plants",
    title: "Desert trees and cactus",
    group: "Trees",
    differ: "arms, spines",
    members: { desert: ["tree", "yucca", "cholla", "ocotillo", "pad"] },
  },
  {
    id: "corals",
    title: "Corals and reef plants",
    group: "Trees",
    differ: "growth form (pillar, table, branching, boulder, soft, fan, blades), size, colour",
    members: {
      greatbarrier: [
        "bommie",
        "tableCoral",
        "staghorn",
        "boulderCoral",
        "softCoral",
        "seaFan",
        "seagrass",
        "anemone",
        "giantClam",
        "stylophora",
        "goniopora",
        "mushroom",
        "organPipe",
        "acroporaBush",
        "softTree",
      ],
    },
  },
];

const listed = (names, stem) => (names ?? []).some((name) => stem === name || stem.startsWith(`${name}-`));

// Whether a scene's sprite belongs to the family, as "member", "storybook", or null.
export function roleIn(family, sid, name) {
  const stem = name.slice(sid.length + 1);
  if (listed(family.members[sid], stem)) return "member";
  return listed(family.storybook?.[sid], stem) ? "storybook" : null;
}

// Whether any family lists a scene's sprite.
export const hasFamily = (sid, name) => FAMILIES.some((family) => roleIn(family, sid, name));

// ---- Tags the checks read: the scale, predators and how crowded a scene may be ----------------------

// The scale (the nursery-scene skill's Size rule). An adult's body is drawn `len` px long (its build's
// spec), following its real head-and-body length in metres, compressed: px = a x metres^k, within
// `tolerance` (and at least `least` px either way). a and k were fitted to the cast on 2026-11-16,
// leaving out the five that stood far off it (the cheetah, cougar, both bears, the clouded leopard).
export const SCALE = { a: 11.3, k: 0.39, tolerance: 0.15, least: 2 };

// Each adult build's real head-and-body length in metres: a typical adult, a male where the build is
// one. Keys are "family/member" as the checks name them. Left off: the young, the storybook cast, the
// birds and small animals whose builds have no body length yet, and the giraffe (its head-and-body
// length is mostly neck, which its body length leaves out).
export const REAL_LENGTH = {
  "cats/cat": 0.46,
  "cats/bobcat": 0.8,
  "cats/clouded-leopard": 0.9,
  "cats/cheetah": 1.25,
  "cats/cougar": 1.3,
  "cats/lion": 2.0,
  "dogs/arctic-fox": 0.55,
  "dogs/fox": 0.65,
  "dogs/coyote": 0.9,
  "dogs/wolf": 1.2,
  "bears/bear": 1.6,
  "bears/grizzly": 2.1,
  "deer/pronghorn": 1.4,
  "deer/deer": 1.6,
  "deer/deer-buck": 1.9,
  "deer/stag-cow": 1.7,
  "deer/stag": 2.0,
  "deer/elk-cow": 2.1,
  "deer/elk": 2.4,
  "cattle-sheep/bighorn": 1.6,
  "cattle-sheep/bison": 3.0,
  "horses/zebra": 2.3,
  "elephants/elephant-asian": 5.5,
  "elephants/elephant-african": 6.0,
  "fish/chromis": 0.07,
  "fish/clownfish": 0.08,
  "fish/anthias": 0.1,
  "fish/wrasse": 0.1,
  "fish/parrotfish": 0.6,
  "fish/trevally": 1.2,
  "fish/blacktip": 1.4,
  "fish/epaulette": 0.7,
  "cephalopods/octopus": 0.16,
};

// The body length the scale gives for a real length, and the range it allows.
export function scaleOf(metres) {
  const target = SCALE.a * metres ** SCALE.k;
  const room = Math.max(target * SCALE.tolerance, SCALE.least);
  return { target, low: target - room, high: target + room };
}

// Predators; every other animal in a scene is prey (the food chain needs both).
export const PREDATORS = new Set([
  "bears/bear",
  "bears/grizzly",
  "dogs/fox",
  "dogs/coyote",
  "dogs/wolf",
  "cats/lion",
  "cats/cheetah",
  "cats/cougar",
  "cats/bobcat",
  "cats/clouded-leopard",
  "cats/cat",
  "soaring-birds/hawk",
  "soaring-birds/eagle-golden",
  "soaring-birds/eagle-bald",
  "soaring-birds/vulture",
  "ground-birds/secretary",
  "ground-birds/roadrunner",
  "owls/owl",
  "fish/blacktip",
  "fish/trevally",
  "fish/epaulette",
]);

// Open scenes keep at most 5 ground animals and one flyer at a time; every other scene is dense, at
// most 8 (the skill's feel and density).
export const OPEN_SCENES = new Set(["desert", "hawaii", "serengeti"]);
