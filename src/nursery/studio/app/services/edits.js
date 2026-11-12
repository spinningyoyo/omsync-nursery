// Saving pixel edits as patches the agents apply to the drawing code: every changed pixel with its
// offsets from the sprite's anchor and its palette keys, both whole renders run-length encoded, and
// a picture of original, edit and changed pixels. Saved files and `nursery check` read this
// format, so it must not change.
import { api, keyPath } from "./api.js";
import { keysFor } from "./palette.js";
import { bounds, colourAt, differences, encode, grow, same, sheet, union } from "./pixels.js";
import { FRAMES, renderKey } from "./scene-model.js";

const PAD = 2;

function patchFor(model, job, theme, f, original, target, linked) {
  const key = renderKey(job.name, theme, f);
  const indexes = differences(original, target);
  const pixels = indexes.map((i) => {
    const x = i % original.width;
    const y = Math.floor(i / original.width);
    const before = colourAt(original, x, y);
    const after = colourAt(target, x, y);
    return {
      x,
      y,
      dx: x - 40,
      dy: y - job.feet,
      before,
      beforeKeys: keysFor(job.pals, theme, before),
      after,
      afterKeys: keysFor(job.pals, theme, after),
    };
  });
  const crop = grow(union(bounds(original), bounds(target)) ?? { x: 0, y: 0, w: 1, h: 1 }, PAD, job.box);
  const bg = model.scene.palettes[theme].haze;
  const w = job.item?.where;
  return {
    key,
    scene: model.sid,
    sprite: job.name,
    element: job.item?.label,
    pose: job.title,
    theme,
    sameInBothThemes: job.same,
    frame: f,
    frameAt: job.proposal ? { time: f / job.fps } : FRAMES[f],
    ...(job.proposal
      ? { proposal: `.nursery/${model.sid}/proposals/${job.proposal}.js`, variant: job.title }
      : job.icon
        ? { drawnBy: `the icon grid in ${w?.path}`, note_icon: "x and y are cells of the icon grid" }
        : {
            drawnBy: w ? `${w.fn ? `${w.fn} at ` : ""}${w.path}:${w.line}` : null,
            pose_in_sprites_js: `src/nursery/studio/shared/sprites.js SPRITES.${model.sid}["${job.name}"]`,
          }),
    box: { w: job.box.w, h: job.box.h },
    anchor: { x: 40, feet: job.feet },
    note:
      "x and y are art pixels in the sprite's box. dx is x - 40, the x a sprite is posed at. " +
      "dy is y - feet, the row under the original's lowest pixel, where a walker's feet " +
      "stand, so dx and dy are the offsets a painter's part() takes. Keys name the palette " +
      "entries a colour matches; an empty after is an erased pixel.",
    linkedThemes: linked && !job.same,
    pixels,
    original: encode(original),
    target: encode(target),
    picture: sheet([["original", original], ["edit", target], ["changed", target, true]], crop, bg, indexes),
    saved: new Date().toISOString(),
  };
}

// Saves every frame that differs from its original, and drops a saved edit whose frame is back
// to the original. Returns how many edits were written.
export async function saveEdits(model, job, frames, linked) {
  const edits = job.proposal ? model.proposalEdits : model.edits;
  const writes = [];
  for (const [f, { original, target }] of frames) {
    for (const theme of Object.keys(target)) {
      const key = renderKey(job.name, theme, f);
      if (!same(original[theme], target[theme])) {
        writes.push(["PUT", key, patchFor(model, job, theme, f, original[theme], target[theme], linked)]);
      } else if (edits.has(key) && model.editState(edits.get(key)) !== "in code") {
        writes.push(["DELETE", key]);
      }
    }
  }
  if (!job.proposal && writes.some(([method]) => method === "PUT")) await model.saveBaseline();
  const route = job.proposal ? `proposal-edit/${model.sid}/${job.proposal}` : `edit/${model.sid}`;
  for (const [method, key, body] of writes) await api(method, `/api/${route}/${keyPath(key)}`, body);
  await model.refresh();
  return writes.filter(([method]) => method === "PUT").length;
}

export async function discardEdit(model, key) {
  await api("DELETE", `/api/edit/${model.sid}/${keyPath(key)}`);
  await model.refresh();
}

// Accept and clear: forgets the scene's edits and baseline. Proposals and reviews stay.
export async function acceptAndClear(model) {
  await api("DELETE", `/api/edits/${model.sid}`);
  await model.refresh();
}
