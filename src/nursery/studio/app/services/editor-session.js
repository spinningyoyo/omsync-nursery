// One editing session on one sprite: what the pixel editor (editor-view) shows and its side panel
// (editor-panel) changes. Pixels are edited in the sprite's own box, as the code draws it, so a
// saved patch keeps its offsets from the sprite's anchor. A session fires "change" whenever
// anything changes.
//
// Frames. Every edit (a stroke, an erase, moving or deleting a selection, resetting) applies to
// the frames being edited together: the frame on show plus any you link. Walk frames alternate,
// so a fix drawn on frame 0 often belongs on frame 2 and not on 1 or 3; "matching" finds the
// frames that draw the same pixels where you are working. Changes already made on one frame can
// be copied to chosen others, each with a preview of what it would change. Undo is one history
// for the whole sprite: each step remembers every frame it touched.
import { saveEdits } from "./edits.js";
import { brushes, brushFor } from "./palette.js";
import { bounds, clone, colourAt, differences, grow, same, setColour, union } from "./pixels.js";
import { renderKey } from "./scene-model.js";

const MARGIN = 6; // room around the drawing to add or move pixels into

const copyImages = (images) => Object.fromEntries(Object.entries(images).map(([t, img]) => [t, clone(img)]));

export class EditorSession extends EventTarget {
  constructor(model, job, { theme = "light", f } = {}) {
    super();
    this.model = model;
    this.job = job;
    this.f = job.frames.includes(f) ? f : job.frames[0];
    this.focus = job.themes.includes(theme) ? theme : "light";
    this.frames = new Map();
    this.linked = new Set(); // frames edited together with the one on show
    this.undoStack = []; // each step: Map(frame -> images before it)
    this.redoStack = [];
    this.tool = "pencil";
    this.link = true; // day and night painted together
    this.marks = true;
    this.grid = true;
    this.onion = false;
    this.showOriginal = false;
    this.sel = null; // {x, y, w, h} in the sprite's box
    this.floating = null; // Map(frame -> {theme: ImageData}) lifted out while a selection moves
    this.hover = null;
    this.saving = false;
    this.palette = brushes(job.pals);
    let crop = job.bbox;
    for (const fr of job.frames) {
      for (const t of job.themes) {
        const saved = this.edits().get(renderKey(job.name, t, fr));
        if (saved) crop = union(crop, bounds(saved.targetImg));
      }
    }
    this.crop = grow(crop ?? { x: 30, y: 30, w: 20, h: 20 }, MARGIN, job.box);
    for (const fr of job.frames) this.frameState(fr);
    this.brush = this.usedColours()[0] ?? this.palette[0] ?? { key: null, light: "#000000", dark: "#000000" };
  }

  // rev counts changes, so views of pixels edited in place know to redraw.
  changed() {
    this.rev = (this.rev ?? 0) + 1;
    this.dispatchEvent(new Event("change"));
  }

  edits() {
    return this.job.proposal ? this.model.proposalEdits : this.model.edits;
  }

  // A frame's original, its edited target, and what is saved: from a saved edit the code has not
  // taken yet, or from what the code draws now.
  frameState(f) {
    if (!this.frames.has(f)) {
      const original = {};
      const target = {};
      for (const theme of this.job.themes) {
        const saved = this.edits().get(renderKey(this.job.name, theme, f));
        const now = this.job.renders.get(`${theme}|${f}`);
        if (saved && this.model.editState(saved) !== "in code") {
          original[theme] = saved.originalImg;
          target[theme] = clone(saved.targetImg);
        } else {
          original[theme] = now;
          target[theme] = clone(now);
        }
      }
      this.frames.set(f, { original, target, saved: copyImages(target) });
    }
    return this.frames.get(f);
  }

  get state() {
    return this.frameState(this.f);
  }

  // The frames an edit applies to: the one on show and the linked ones.
  targets() {
    return [this.f, ...[...this.linked].filter((f) => f !== this.f)];
  }

  // A frame's target with its moving selection laid over it, without changing it.
  composed(theme, f = this.f) {
    const target = this.frameState(f).target[theme];
    const piece = this.floating?.get(f)?.[theme];
    if (!piece || !this.sel) return target;
    const out = clone(target);
    blit(out, piece, this.sel.x, this.sel.y);
    return out;
  }

  changedIndexes(theme, f = this.f) {
    return differences(this.frameState(f).original[theme], this.composed(theme, f));
  }

  changedCount(f = this.f) {
    const seen = new Set();
    for (const t of this.job.themes) for (const i of this.changedIndexes(t, f)) seen.add(i);
    return seen.size;
  }

  frameEdited(f) {
    return this.changedCount(f) > 0;
  }

  // Whether anything changed since the last save (or since the editor opened).
  dirty() {
    if (this.floating) return true;
    return [...this.frames.values()].some((st) => this.job.themes.some((t) => !same(st.saved[t], st.target[t])));
  }

  // The colours the frame on show uses, as brushes: palette keys first.
  usedColours() {
    const st = this.state;
    const seen = new Map();
    const img = st.target.light;
    const night = st.target.dark ?? img;
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        const light = colourAt(img, x, y);
        if (!light) continue;
        const brush = brushFor(this.job.pals, { light, dark: colourAt(night, x, y) });
        const id = brush.key ?? `${brush.light}/${brush.dark}`;
        if (!seen.has(id)) seen.set(id, brush);
      }
    }
    return [...seen.values()].sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1));
  }

  // ---- Frames ----------------------------------------------------------------------------------

  setFrame(f) {
    this.dropSelection();
    this.linked.delete(f);
    this.f = f;
    this.changed();
  }

  toggleLinked(f) {
    if (f === this.f) return;
    this.dropSelection();
    if (this.linked.has(f)) this.linked.delete(f);
    else this.linked.add(f);
    this.changed();
  }

  // Where you are working: the pixels changed on this frame, or the selection, with a pixel
  // around it; the whole drawing when there is neither.
  workArea() {
    let area = this.sel ? { ...this.sel } : null;
    for (const t of this.job.themes) {
      for (const i of this.changedIndexes(t)) {
        const w = this.job.box.w;
        area = union(area, { x: i % w, y: Math.floor(i / w), w: 1, h: 1 });
      }
    }
    return area ? grow(area, 1, this.job.box) : this.crop;
  }

  // The other frames that draw the same pixels as this one in the work area, by the code's
  // drawing (the originals): where a fix here fits as it is.
  matchingFrames() {
    const area = this.workArea();
    const here = this.state.original;
    return this.job.frames.filter((f) => {
      if (f === this.f) return false;
      const there = this.frameState(f).original;
      return this.job.themes.every((t) => sameIn(here[t], there[t], area));
    });
  }

  linkMatching() {
    this.dropSelection();
    this.linked = new Set(this.matchingFrames());
    this.changed();
  }

  // What copying this frame's changes to frame f would do: how many pixels it changes, and how
  // many of those are over art that differs from this frame's (a likely mistake).
  copyPreview(f) {
    const here = this.state;
    const there = this.frameState(f);
    // A pixel counts once, though day and night may both change there.
    const change = new Set();
    const over = new Set();
    for (const t of this.job.themes) {
      for (const i of this.changedIndexes(t)) {
        const x = i % here.target[t].width;
        const y = Math.floor(i / here.target[t].width);
        if (colourAt(there.target[t], x, y) === colourAt(this.composed(t), x, y)) continue;
        change.add(i);
        if (colourAt(there.original[t], x, y) !== colourAt(here.original[t], x, y)) over.add(i);
      }
    }
    return { change: change.size, over: over.size };
  }

  // Copies the changes made on this frame to the same pixels of the chosen frames, as one step.
  copyChangesTo(frames) {
    this.dropSelection();
    const list = frames.filter((f) => f !== this.f);
    if (!list.length) return;
    this.remember(list);
    for (const t of this.job.themes) {
      const indexes = this.changedIndexes(t);
      const from = this.state.target[t];
      for (const f of list) {
        const to = this.frameState(f).target[t];
        for (const i of indexes) setColour(to, i % from.width, Math.floor(i / from.width), colourAt(from, i % from.width, Math.floor(i / from.width)));
      }
    }
    this.changed();
  }

  // ---- Tools -------------------------------------------------------------------------------------

  setTool(tool) {
    if (tool !== "select") this.dropSelection();
    this.tool = tool;
    this.changed();
  }

  // Choosing a colour hands over to the pencil.
  setBrush(brush) {
    this.dropSelection();
    this.brush = brush;
    this.tool = "pencil";
    this.changed();
  }

  // The picker takes the pixel's day and night colours and hands over to the pencil, or to the
  // eraser on an empty pixel.
  pick(x, y) {
    const st = this.state;
    const colours = Object.fromEntries(this.job.themes.map((t) => [t, colourAt(st.target[t], x, y)]));
    if (!Object.values(colours).some(Boolean)) {
      this.tool = "eraser";
      this.changed();
      return;
    }
    this.setBrush(brushFor(this.job.pals, { light: colours.light, dark: colours.dark ?? colours.light }));
  }

  // Starts a stroke: one undo step for every frame it will paint.
  beginStroke() {
    this.remember();
  }

  // One pixel with the pencil or the eraser, in every frame being edited; in both themes when
  // day and night are painted together.
  paint(theme, x, y) {
    const themes = this.link ? this.job.themes : [theme];
    for (const f of this.targets()) {
      const target = this.frameState(f).target;
      for (const t of themes) setColour(target[t], x, y, this.tool === "eraser" ? null : this.brush[t] ?? this.brush.light);
    }
  }

  resetFrames() {
    this.dropSelection();
    this.remember();
    for (const f of this.targets()) {
      const st = this.frameState(f);
      st.target = copyImages(st.original);
    }
    this.changed();
  }

  // ---- History -----------------------------------------------------------------------------------

  // Remembers the frames an edit is about to change, as one undo step.
  remember(frames = this.targets()) {
    this.undoStack.push(new Map(frames.map((f) => [f, copyImages(this.frameState(f).target)])));
    this.redoStack = [];
  }

  // Restores a step's frames and returns the step that undoes the restore.
  swap(step) {
    const back = new Map();
    for (const [f, images] of step) {
      const st = this.frameState(f);
      back.set(f, copyImages(st.target));
      st.target = images;
    }
    return back;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    this.dropSelection();
    if (!this.undoStack.length) return;
    this.redoStack.push(this.swap(this.undoStack.pop()));
    this.changed();
  }

  redo() {
    this.dropSelection();
    if (!this.redoStack.length) return;
    this.undoStack.push(this.swap(this.redoStack.pop()));
    this.changed();
  }

  // ---- Selection ---------------------------------------------------------------------------------

  // Lifts the selected pixels out of every frame being edited, so they move over it together.
  // One undo step.
  lift() {
    if (this.floating || !this.sel) return;
    this.remember();
    const { x, y, w, h } = this.sel;
    this.floating = new Map();
    for (const f of this.targets()) {
      const pieces = {};
      for (const t of this.job.themes) {
        const target = this.frameState(f).target[t];
        const piece = new ImageData(w, h);
        for (let yy = 0; yy < h; yy += 1) {
          for (let xx = 0; xx < w; xx += 1) {
            setColour(piece, xx, yy, colourAt(target, x + xx, y + yy));
            setColour(target, x + xx, y + yy, null);
          }
        }
        pieces[t] = piece;
      }
      this.floating.set(f, pieces);
    }
  }

  // Drops a moving selection where it is; pixels moved past the box's edge are cut off.
  commit() {
    if (!this.floating || !this.sel) return;
    for (const [f, pieces] of this.floating) {
      for (const t of this.job.themes) blit(this.frameState(f).target[t], pieces[t], this.sel.x, this.sel.y);
    }
    this.floating = null;
  }

  dropSelection() {
    this.commit();
    this.sel = null;
  }

  // Puts a moving selection back where it came from.
  cancelSelection() {
    if (this.floating) {
      this.swap(this.undoStack.pop());
      this.floating = null;
    }
    this.sel = null;
    this.changed();
  }

  deleteSelection() {
    if (!this.sel) return;
    if (this.floating) this.floating = null;
    else {
      this.remember();
      const { x, y, w, h } = this.sel;
      for (const f of this.targets()) {
        for (const t of this.job.themes) {
          const target = this.frameState(f).target[t];
          for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) setColour(target, xx, yy, null);
        }
      }
    }
    this.sel = null;
    this.changed();
  }

  moveSelection(x, y) {
    this.lift();
    this.sel = { ...this.sel, x, y };
    this.changed();
  }

  // ---- Save --------------------------------------------------------------------------------------

  async save() {
    this.dropSelection();
    this.saving = true;
    this.changed();
    try {
      const count = await saveEdits(this.model, this.job, this.frames, this.link);
      // The saved edits are now every frame's starting point; history starts again.
      this.frames = new Map();
      for (const f of this.job.frames) this.frameState(f);
      this.undoStack = [];
      this.redoStack = [];
      return count;
    } finally {
      this.saving = false;
      this.changed();
    }
  }
}

// Lays the drawn pixels of a piece over an image at (x, y); empty pixels leave what is under them.
function blit(img, piece, x, y) {
  for (let yy = 0; yy < piece.height; yy += 1) {
    for (let xx = 0; xx < piece.width; xx += 1) {
      const colour = colourAt(piece, xx, yy);
      if (colour) setColour(img, x + xx, y + yy, colour);
    }
  }
}

// Whether two renders draw the same pixels inside an area.
function sameIn(a, b, area) {
  for (let y = area.y; y < area.y + area.h; y += 1) {
    for (let x = area.x; x < area.x + area.w; x += 1) {
      if (colourAt(a, x, y) !== colourAt(b, x, y)) return false;
    }
  }
  return true;
}
