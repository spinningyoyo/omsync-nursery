// Palette keys: which key a colour comes from, and a key's colour in day and night. Saved edits
// name the keys of every pixel they change, so agents paint with keys, not raw hex.

const isHex = (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);

// Every colour key of a palette, as "key" or "key[i]", with its value.
export function paletteEntries(pal) {
  const out = [];
  for (const [key, value] of Object.entries(pal)) {
    if (Array.isArray(value)) value.forEach((c, i) => isHex(c) && out.push([`${key}[${i}]`, c]));
    else if (isHex(value)) out.push([key, value]);
  }
  return out;
}

function valueAt(pal, path) {
  const match = /^(\w+)(?:\[(\d+)\])?$/.exec(path);
  if (!match) return null;
  const value = pal[match[1]];
  const colour = match[2] === undefined ? value : value?.[Number(match[2])];
  return isHex(colour) ? colour.toLowerCase() : null;
}

// The palette keys a colour can come from in a theme, then from the other theme marked with it
// (night-only sprites draw the dark palette in both). pals is { light, dark }.
export function keysFor(pals, theme, colour) {
  if (!colour || colour.length !== 7) return [];
  const own = paletteEntries(pals[theme])
    .filter(([, c]) => c.toLowerCase() === colour)
    .map(([k]) => k);
  if (own.length) return own;
  const other = theme === "light" ? "dark" : "light";
  return paletteEntries(pals[other])
    .filter(([, c]) => c.toLowerCase() === colour)
    .map(([k]) => `${other}:${k}`);
}

// A palette key with its colour in each theme: a brush.
export const keyed = (key, pals) => ({ key, light: valueAt(pals.light, key), dark: valueAt(pals.dark, key) });

// Every key of the palettes as a brush, in the day palette's order.
export const brushes = (pals) => paletteEntries(pals.light).map(([key]) => keyed(key, pals));

// The brush a picked pixel stands for: its palette key when its colour has one, otherwise its
// raw colours.
export function brushFor(pals, colours) {
  for (const theme of ["light", "dark"]) {
    const key = keysFor(pals, theme, colours[theme]).find((k) => !k.includes(":"));
    if (key) return keyed(key, pals);
  }
  return { key: null, light: colours.light ?? colours.dark, dark: colours.dark ?? colours.light };
}

export function describeColour(pals, theme, colour) {
  if (!colour) return "empty";
  const keys = keysFor(pals, theme, colour);
  return keys.length ? `${colour} (${keys.join(", ")})` : `${colour} (not a palette colour)`;
}
