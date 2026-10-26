// The families of the forest: every animal and tree belongs to one, and shares its design. A family
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
    differ: "mane, colour, markings",
    members: { serengeti: ["lion", "cub"] },
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
    id: "shelled-scaled",
    title: "Shelled and scaled",
    group: "Animals",
    differ: "shell, length",
    members: { desert: ["tortoise", "snake"], hawaii: ["honu", "crab"] },
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
      meadow: ["eagle"],
      yellowstone: ["eagle"],
      desert: ["hawk", "vulture"],
      serengeti: ["vulture"],
      rainforest: ["serpent"],
      smokies: ["eagle"],
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
      hawaii: ["gull", "iiwi"],
      iceland: ["puffin"],
      yellowstone: ["bluebird"],
      smokies: ["cardinal", "swift"],
    },
    storybook: { hundredacre: ["kessie"], wonderland: ["pigeon", "lory"] },
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
    differ: "trunk, height, clump layout",
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
];

const listed = (names, stem) =>
  (names ?? []).some((name) => stem === name || stem.startsWith(`${name}-`));

// Whether a scene's sprite belongs to the family, as "member", "storybook", or null.
export function roleIn(family, sid, name) {
  const stem = name.slice(sid.length + 1);
  if (listed(family.members[sid], stem)) return "member";
  return listed(family.storybook?.[sid], stem) ? "storybook" : null;
}

// Whether any family lists a scene's sprite.
export const hasFamily = (sid, name) => FAMILIES.some((family) => roleIn(family, sid, name));
