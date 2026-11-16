// Plant painters shared by the scenes. Each takes the painter `g`, a plant `p`, its size `s`
// (0..1) and its base row, like a scene's own painters, and reads the palette keys named above it.
import { rect, wind } from "./pixel.js";

// A wildflower on a stem `stem` rows tall, in the palette tone `stemTone`: a head of three pixels
// across with one on top, or only a one-pixel `bud` while the plant is small. The scene works out
// the stem height and the colour of this plant.
export function crossFlower(g, p, base, { stem, stemTone, colour, bud = false }) {
  rect(g, stemTone, p.x, base - stem, 1, stem);
  if (bud) {
    rect(g, colour, p.x, base - stem - 1, 1, 1);
    return;
  }
  rect(g, colour, p.x - 1, base - stem - 1, 3, 1);
  rect(g, colour, p.x, base - stem - 2, 1, 1);
}

// The meadow's flower: a leafy stem that sways in the wind, under a four-petalled head with a
// centre. Palette keys: leaf (three tones), flowers (four) and centre.
export function meadowFlower(g, p, s, base) {
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

// Where a meadow flower's head tops out, for something that perches on it: the top petal's pixel,
// swaying with the wind as `meadowFlower` draws it. Same arguments as `meadowFlower`.
export function meadowFlowerHead(g, p, s, base) {
  const stem = Math.max(2, Math.round((5 + (p.seed % 5)) * p.scale * s));
  const sway = stem >= 5 ? wind(g.time, p.x) : 0;
  return { x: p.x + sway, y: base - stem - (s <= 0.5 ? 1 : 2) };
}
