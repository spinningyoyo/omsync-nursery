// The pixel editor, in the centre, on one EditorSession (services/editor-session.js). Day and
// night are painted side by side, together; the strip below shows every frame the code draws,
// with a way to carry a fix to the others (the lion's tail); and the sprite stands on its scene's
// own soil at real scale. The palette and Save live in the side panel (editor-panel).
//
// Tools: pencil, eraser, colour picker and rectangle selection. A selection's pixels can be
// dragged or nudged with the arrow keys (day and night move together), or deleted at once. Every
// stroke, move and delete is one step of undo, in one history shared by all frames.
import { describeColour } from "../services/palette.js";
import { drawZoomed } from "../services/pixels.js";
import { act } from "../ui/action.js";
import { createRef, css, html, LitElement, nothing, ref } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const TOOLS = [
  { id: "pencil", icon: "pencil", name: "Pencil", keys: "P", hint: "Paint with the brush colour" },
  { id: "eraser", icon: "eraser", name: "Eraser", keys: "E", hint: "Clear pixels" },
  {
    id: "picker",
    icon: "pipette",
    name: "Pick a colour",
    keys: "I",
    hint: "Click a pixel to paint with its colour, or an empty one to erase",
  },
  {
    id: "select",
    icon: "square-dashed",
    name: "Select",
    keys: "M",
    hint: "Drag a box, then drag it or use the arrow keys to move it. Delete clears it, Enter drops it, Esc puts it back",
  },
];

const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

export class EditorView extends LitElement {
  static properties = {
    session: { attribute: false },
    leaving: { type: Boolean }, // set by <nursery-app> while an exit waits on the unsaved-edits choice
    flash: { state: true },
  };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-columns: 48px 1fr;
        min-height: 0;
        background: var(--bg);
      }
      .toolbar {
        position: relative;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: var(--space-3) 0;
        border-right: 1px solid var(--border);
        background: var(--surface);
      }
      .toolbar hr {
        width: 24px;
        border: 0;
        border-top: 1px solid var(--border);
        margin: 6px 0;
      }
      .icon-btn:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .icon-btn:disabled:hover {
        background: transparent;
        color: var(--muted);
      }
      /* The label beside a tool, shown at once on hover or keyboard focus. */
      .tipped {
        position: relative;
      }
      .tip {
        position: absolute;
        left: calc(100% + 10px);
        top: 50%;
        transform: translateY(-50%);
        display: grid;
        gap: 2px;
        width: max-content;
        max-width: 260px;
        padding: 6px 10px;
        border-radius: var(--radius-sm);
        background: var(--text);
        color: var(--bg);
        font-size: var(--text-sm);
        line-height: 1.35;
        text-align: left;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.1s;
        box-shadow: var(--shadow);
      }
      .tipped:hover .tip,
      .tipped:focus-visible .tip {
        opacity: 1;
      }
      .tip .name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      .tip kbd {
        padding: 0 5px;
        border-radius: 4px;
        background: color-mix(in srgb, var(--bg) 22%, transparent);
        font: inherit;
        font-size: var(--text-xs);
      }
      .tip .hint {
        opacity: 0.8;
      }
      .work {
        display: grid;
        grid-template-rows: auto 1fr auto;
        min-height: 0;
        min-width: 0;
      }
      .head {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }
      .crumbs {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
      }
      .crumbs .muted {
        font-weight: 450;
      }
      .grow {
        flex: 1;
      }
      .canvases {
        display: flex;
        gap: var(--space-5);
        justify-content: center;
        align-items: center;
        padding: var(--space-5);
        overflow: auto;
      }
      figure {
        display: grid;
        gap: var(--space-2);
        margin: 0;
        justify-items: center;
      }
      figcaption {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .paint {
        border-radius: var(--radius-md);
        border: 1px solid var(--border);
        cursor: crosshair;
        touch-action: none;
      }
      .paint.moving {
        cursor: move;
      }
      .strip {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--space-4);
        padding: var(--space-3) var(--space-4);
        border-top: 1px solid var(--border);
        background: var(--surface);
      }
      .frames {
        display: flex;
        align-items: end;
        gap: var(--space-2);
        overflow-x: auto;
      }
      .frame {
        display: grid;
        gap: 4px;
        justify-items: center;
        padding: 4px;
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        background: none;
        color: var(--muted);
        font: inherit;
        font-size: var(--text-sm);
        cursor: pointer;
      }
      .frame[aria-pressed="true"] {
        border-color: var(--accent);
        background: var(--accent-weak);
        color: var(--text);
      }
      .frame .edited {
        color: var(--danger);
      }
      .context {
        display: grid;
        gap: 4px;
        justify-items: end;
      }
      .soil {
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
      }
      .section-label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        font-size: var(--text-xs);
        font-weight: 650;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
    `,
    css`
      .unsaved {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        background: var(--warn-weak);
        color: var(--warn);
      }
      .status {
        min-height: 18px;
        color: var(--muted);
        font-size: var(--text-sm);
        font-variant-numeric: tabular-nums;
      }
      .flash {
        color: var(--ok);
        font-weight: 600;
      }
      .canvases-wrap {
        display: grid;
        grid-template-rows: 1fr auto;
        min-height: 0;
      }
      .status-row {
        padding: 0 var(--space-4) var(--space-2);
        text-align: center;
      }
    `,
  ];

  canvas = { light: createRef(), dark: createRef() };
  soil = createRef();
  viewport = createRef();

  constructor() {
    super();
    this.onChange = () => this.requestUpdate();
    this.onKey = (e) => this.key(e);
    this.onKeyUp = (e) => {
      if (e.key === "o" && this.session) {
        this.session.showOriginal = false;
        this.session.changed();
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKeyUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKeyUp);
    this.session?.removeEventListener("change", this.onChange);
  }

  willUpdate(changed) {
    if (changed.has("session")) {
      changed.get("session")?.removeEventListener("change", this.onChange);
      this.session?.addEventListener("change", this.onChange);
    }
  }

  tip(label, keys, hint) {
    return html`<span class="tip" role="tooltip">
      <span class="name">${label}${keys ? html`<kbd>${keys}</kbd>` : nothing}</span>
      ${hint ? html`<span class="hint">${hint}</span>` : nothing}
    </span>`;
  }

  render() {
    const s = this.session;
    if (!s) return html``;
    const job = s.job;
    const toggle = (field) => () => {
      s[field] = !s[field];
      s.changed();
    };
    return html`
      <div class="toolbar" role="toolbar" aria-label="Tools">
        ${TOOLS.map(
          (
            t,
          ) => html`<button class="icon-btn tipped" aria-label=${t.name} aria-pressed=${s.tool === t.id} @click=${() => s.setTool(t.id)}>
            <n-icon name=${t.icon}></n-icon>${this.tip(t.name, t.keys, t.hint)}
          </button>`,
        )}
        <hr />
        <button class="icon-btn tipped" aria-label="Undo" ?disabled=${!s.canUndo} @click=${() => s.undo()}>
          <n-icon name="undo-2"></n-icon>${this.tip("Undo", "⌘Z")}
        </button>
        <button class="icon-btn tipped" aria-label="Redo" ?disabled=${!s.canRedo} @click=${() => s.redo()}>
          <n-icon name="redo-2"></n-icon>${this.tip("Redo", "⇧⌘Z")}
        </button>
        <button class="icon-btn tipped" aria-label="Reset" @click=${() => s.resetFrames()}>
          <n-icon name="rotate-ccw"></n-icon>${this.tip("Reset", null, "Put back the code's drawing in the frames being edited")}
        </button>
        <hr />
        <button
          class="icon-btn tipped"
          aria-label="Compare with the original"
          aria-pressed=${s.showOriginal}
          @pointerdown=${() => {
            s.showOriginal = true;
            s.changed();
          }}
          @pointerup=${() => {
            s.showOriginal = false;
            s.changed();
          }}
          @pointerleave=${() => {
            if (!s.showOriginal) return;
            s.showOriginal = false;
            s.changed();
          }}
        >
          <n-icon name="eye"></n-icon>${this.tip("Compare with the original", "hold O", "Hold to see the sprite as it was before your edits")}
        </button>
        <button class="icon-btn tipped" aria-label="Pixel grid" aria-pressed=${s.grid} @click=${toggle("grid")}>
          <n-icon name="grid-3x3"></n-icon>${this.tip("Pixel grid", "G", "Lines between the pixels")}
        </button>
        ${
          job.frames.length > 1
            ? html`<button class="icon-btn tipped" aria-label="Onion skin" aria-pressed=${s.onion} @click=${toggle("onion")}>
              <n-icon name="layers"></n-icon>${this.tip("Onion skin", null, "Shows the next frame faintly underneath, to line up a walk or a flap")}
            </button>`
            : nothing
        }
      </div>
      <div class="work">
        <div>
          <div class="head">
            <span class="crumbs">
              <span class="muted">${s.model.scene.label}</span>
              <n-icon name="chevron-right" size="14"></n-icon>
              <span class="muted">${job.item?.label}</span>
              <n-icon name="chevron-right" size="14"></n-icon>
              ${job.title}${job.frames.length > 1 ? ` · frame ${s.f}${s.linked.size ? ` with ${[...s.linked].join(", ")}` : ""}` : ""}
            </span>
            <span class="grow"></span>
            ${this.flash ? html`<span class="flash">${this.flash}</span>` : nothing}
            <span class="muted">${s.changedCount()} px changed</span>
            <button class="btn ghost" @click=${() => act(this, "close-editor")}><n-icon name="x"></n-icon>Close</button>
          </div>
          ${
            this.leaving
              ? html`<div class="unsaved">
                <n-icon name="triangle-alert"></n-icon>
                <span class="grow">You have unsaved edits.</span>
                <button class="btn primary" @click=${this.saveAndClose}><n-icon name="save"></n-icon>Save and close</button>
                <button class="btn" @click=${() => act(this, "leave-editor", { choice: "go" })}>Discard</button>
                <button class="btn ghost" @click=${() => act(this, "leave-editor", { choice: "keep" })}>Keep editing</button>
              </div>`
              : nothing
          }
        </div>
        <div class="canvases-wrap">
          <div class="canvases" ${ref(this.viewport)}>
            ${job.themes.map(
              (theme) => html`<figure>
                <canvas
                  class="pixels paint ${theme === "light" ? "checker" : "night"} ${s.tool === "select" && s.sel ? "moving" : ""}"
                  ${ref(this.canvas[theme])}
                  @pointerdown=${(e) => this.down(e, theme)}
                  @pointermove=${(e) => this.move(e, theme)}
                  @pointerup=${() => this.up()}
                  @pointerleave=${() => {
                    s.hover = null;
                    s.changed();
                  }}
                ></canvas>
                <figcaption>
                  <n-icon name=${theme === "light" ? "sun" : "moon"} size="14"></n-icon>
                  ${job.same ? "Day and night (they draw the same)" : theme === "light" ? "Day" : s.link ? "Night, painted together with day" : "Night"}
                </figcaption>
              </figure>`,
            )}
          </div>
          <div class="status status-row">${this.status()}</div>
        </div>
        <div class="strip">
          <frame-strip .session=${s}></frame-strip>
          ${
            job.brand
              ? nothing
              : html`<div class="context">
                <div class="section-label"><n-icon name="ruler" size="12"></n-icon>On its soil, real scale</div>
                <canvas class="pixels soil" ${ref(this.soil)}></canvas>
              </div>`
          }
        </div>
      </div>
    `;
  }

  status() {
    const s = this.session;
    if (!s.hover) return "Hover a pixel to read its colour and offsets";
    const { theme, x, y } = s.hover;
    const now = s.composed(theme);
    const was = s.state.original[theme];
    const at = (img) => {
      const k = (y * img.width + x) * 4;
      const [r, g, b, a] = img.data.slice(k, k + 4);
      return a ? `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}` : null;
    };
    const nowC = at(now);
    const wasC = at(was);
    return `x ${x}, y ${y} · dx ${signed(x - 40)}, dy ${signed(y - s.job.feet)} · ${theme === "light" ? "day" : "night"}: ${describeColour(
      s.job.pals,
      theme,
      nowC,
    )}${nowC !== wasC ? ` · was ${describeColour(s.job.pals, theme, wasC)}` : ""}`;
  }

  // The largest whole-number zoom that fits the sprite's crop in the space, for each theme.
  zoom() {
    const s = this.session;
    const box = this.viewport.value?.getBoundingClientRect();
    const room = box ? Math.min((box.width - 48) / s.job.themes.length - 32, box.height - 48) : 400;
    return Math.max(4, Math.min(32, Math.floor(Math.min(room / s.crop.w, room / s.crop.h))));
  }

  updated() {
    const s = this.session;
    if (!s || !this.isConnected) return;
    const z = this.zoom();
    this.z = z;
    const { crop } = s;
    for (const theme of s.job.themes) {
      const canvas = this.canvas[theme].value;
      if (!canvas) continue;
      canvas.width = crop.w * z;
      canvas.height = crop.h * z;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (s.onion && !s.showOriginal) {
        const next = s.job.frames[(s.job.frames.indexOf(s.f) + 1) % s.job.frames.length];
        ctx.globalAlpha = 0.25;
        drawZoomed(ctx, s.frameState(next).target[theme], crop, z, null, 0, 0, true);
        ctx.globalAlpha = 1;
      }
      drawZoomed(ctx, s.showOriginal ? s.state.original[theme] : s.composed(theme), crop, z, null, 0, 0, true);
      if (s.showOriginal) continue;
      if (s.marks && !s.floating) {
        ctx.strokeStyle = "#e5484d";
        ctx.lineWidth = 2;
        const w = s.job.box.w;
        for (const i of s.changedIndexes(theme)) {
          ctx.strokeRect(((i % w) - crop.x) * z + 1, (Math.floor(i / w) - crop.y) * z + 1, z - 2, z - 2);
        }
      }
      if (s.grid) {
        ctx.strokeStyle = theme === "light" ? "rgb(0 0 0 / 0.08)" : "rgb(255 255 255 / 0.08)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= crop.w; x += 1) ctx.strokeRect(x * z, 0, 0, canvas.height);
        for (let y = 0; y <= crop.h; y += 1) ctx.strokeRect(0, y * z, canvas.width, 0);
      }
      if (s.sel) {
        const { x, y, w, h } = s.sel;
        ctx.lineWidth = 2;
        for (const [colour, offset] of [
          ["#111", 0],
          ["#fff", 4],
        ]) {
          ctx.strokeStyle = colour;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = offset;
          ctx.strokeRect((x - crop.x) * z + 1, (y - crop.y) * z + 1, w * z - 2, h * z - 2);
        }
        ctx.setLineDash([]);
      }
    }
    this.drawSoil();
  }

  // The day sprite standing on a strip of its scene's soil, at the sign-in page's scale.
  drawSoil() {
    const s = this.session;
    const scene = s.model.scene;
    const img = s.composed("light");
    const crop = s.crop;
    const soilRows = 6;
    const w = Math.max(64, crop.w + 16);
    const groundY = Math.min(crop.h, s.job.feet - crop.y);
    const c = this.soil.value;
    if (!c) return;
    const z = 2;
    c.width = w * z;
    c.height = (groundY + soilRows) * z;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--landing-green") || "#e8f3df";
    ctx.fillRect(0, 0, c.width, c.height);
    if (!s.job.icon) {
      const pal = scene.palettes.light;
      for (let y = 0; y < soilRows; y += 1) {
        for (let x = 0; x < w; x += 1) {
          ctx.fillStyle = scene.soil(pal, x, y, y / soilRows, 1); // turf 1: fully grown
          ctx.fillRect(x * z, (groundY + y) * z, z, z);
        }
      }
    }
    drawZoomed(ctx, img, { ...crop, h: groundY }, z, null, ((w - crop.w) / 2) * z, 0, true);
  }

  // ---- Pointer ---------------------------------------------------------------------------------

  cell(e) {
    const canvas = e.currentTarget;
    const box = canvas.getBoundingClientRect();
    const z = this.z;
    return {
      x: this.session.crop.x + Math.floor((((e.clientX - box.left) / box.width) * canvas.width) / z),
      y: this.session.crop.y + Math.floor((((e.clientY - box.top) / box.height) * canvas.height) / z),
    };
  }

  inside({ x, y }) {
    const sel = this.session.sel;
    return sel && x >= sel.x && x < sel.x + sel.w && y >= sel.y && y < sel.y + sel.h;
  }

  down(e, theme) {
    const s = this.session;
    if (s.showOriginal || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const at = this.cell(e);
    if (s.tool === "picker") {
      s.pick(at.x, at.y);
      return;
    }
    if (s.tool === "select") {
      if (this.inside(at)) this.drag = { mode: "move", from: at, origin: { x: s.sel.x, y: s.sel.y } };
      else {
        s.dropSelection();
        this.drag = { mode: "box", from: at, moved: false };
      }
      s.changed();
      return;
    }
    s.beginStroke();
    this.drag = { mode: "paint", last: at, theme };
    s.paint(theme, at.x, at.y);
    s.changed();
  }

  move(e, theme) {
    const s = this.session;
    const at = this.cell(e);
    s.hover = { theme, ...at };
    const d = this.drag;
    if (d?.mode === "paint") {
      // Fill the gap between two samples, so a fast stroke has no holes.
      const steps = Math.max(Math.abs(at.x - d.last.x), Math.abs(at.y - d.last.y));
      for (let i = 1; i <= steps; i += 1) {
        s.paint(
          d.theme,
          Math.round(d.last.x + ((at.x - d.last.x) * i) / steps),
          Math.round(d.last.y + ((at.y - d.last.y) * i) / steps),
        );
      }
      d.last = at;
    } else if (d?.mode === "box") {
      d.moved = true;
      const { box } = s.job;
      const clamp = (v, max) => Math.max(0, Math.min(max - 1, v));
      const [x0, x1] = [clamp(d.from.x, box.w), clamp(at.x, box.w)].sort((a, b) => a - b);
      const [y0, y1] = [clamp(d.from.y, box.h), clamp(at.y, box.h)].sort((a, b) => a - b);
      s.sel = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    } else if (d?.mode === "move") {
      s.moveSelection(d.origin.x + at.x - d.from.x, d.origin.y + at.y - d.from.y);
      return;
    }
    s.changed();
  }

  up() {
    const s = this.session;
    // A click outside the selection, without a drag, just deselects.
    if (this.drag?.mode === "box" && !this.drag.moved) s.sel = null;
    this.drag = null;
    s.changed();
  }

  // ---- Keys and closing --------------------------------------------------------------------------

  key(e) {
    const s = this.session;
    const typing = e
      .composedPath()
      .some((n) => n instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName));
    if (typing || !s) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === "z") {
      e.preventDefault();
      if (e.shiftKey) s.redo();
      else s.undo();
      return;
    }
    if (mod && k === "s") {
      e.preventDefault();
      this.save();
      return;
    }
    if (mod) return;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (s.sel && arrows[e.key]) {
      e.preventDefault();
      s.moveSelection(s.sel.x + arrows[e.key][0], s.sel.y + arrows[e.key][1]);
    } else if (s.sel && (e.key === "Delete" || e.key === "Backspace")) {
      e.preventDefault();
      s.deleteSelection();
    } else if (s.sel && e.key === "Enter") {
      s.dropSelection();
      s.changed();
    } else if (s.sel && e.key === "Escape") {
      s.cancelSelection();
    } else if (e.key === "Escape") {
      act(this, "close-editor");
    } else if (k === "p" || k === "b") s.setTool("pencil");
    else if (k === "e") s.setTool("eraser");
    else if (k === "i") s.setTool("picker");
    else if (k === "m") s.setTool("select");
    else if (k === "g") {
      s.grid = !s.grid;
      s.changed();
    } else if (k === "o" && !s.showOriginal) {
      s.showOriginal = true;
      s.changed();
    }
  }

  async save() {
    const count = await this.session.save();
    const folder = this.session.job.proposal ? `proposals/${this.session.job.proposal}.edits` : "edits";
    this.flash = count ? `Saved to .nursery/${this.session.model.sid}/${folder}/` : "Nothing to save";
    setTimeout(() => (this.flash = null), 3500);
    act(this, "saved");
  }

  // <nursery-app> decides whether an exit waits (it shows this bar through `leaving`); once the
  // edits are saved, "go" carries out the exit that was waiting.
  saveAndClose = async () => {
    await this.save();
    act(this, "leave-editor", { choice: "go" });
  };
}

customElements.define("editor-view", EditorView);
