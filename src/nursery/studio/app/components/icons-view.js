// The scene icons, in the centre: all ten side by side at the picker's real size and enlarged, on
// day and night, so each reads as its scene's best-known subject and no two share both a shape
// and a colour. The icons are each scene module's `icon` grid; Edit opens one in the pixel
// editor, like any sprite.
import { iconSvg } from "/js/kit/pixel.js";
import { SCENES } from "../services/scene-model.js";
import { act } from "../ui/action.js";
import { css, html, LitElement, unsafeSVG } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

// An icon's most-used colour, from its grid.
function mainColour(scene) {
  const counts = {};
  for (const line of scene.icon.grid) {
    for (const ch of line) if (scene.icon.colours[ch]) counts[ch] = (counts[ch] ?? 0) + 1;
  }
  const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return scene.icon.colours[top[0]];
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

// Pairs of icons whose main colours are close: they must then differ in shape. The check reads
// colour only; shape is for your eye.
function closePairs() {
  const out = [];
  SCENES.forEach((a, i) => {
    for (const b of SCENES.slice(i + 1)) {
      const d = distance(mainColour(a), mainColour(b));
      if (d < 40) out.push({ a, b, d: Math.round(d) });
    }
  });
  return out;
}

const sized = (scene, px) =>
  iconSvg(scene.icon.grid, scene.icon.colours).replace('width="36" height="36"', `width="${px}" height="${px}"`);

export class IconsView extends LitElement {
  static properties = { sid: {} };

  static styles = [
    shared,
    css`
      :host {
        display: block;
        overflow: auto;
        padding: var(--space-5);
        background: var(--bg);
      }
      .row {
        display: flex;
        gap: var(--space-2);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
        margin-bottom: var(--space-3);
        width: fit-content;
      }
      .row.day {
        background: #fff;
      }
      .row.night {
        background: #111;
      }
      .tile {
        display: grid;
        place-items: center;
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: var(--space-3);
        margin-top: var(--space-5);
      }
      .card {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
      }
      .card[aria-current="true"] {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent);
      }
      .big {
        display: flex;
        gap: var(--space-2);
      }
      .big div {
        display: grid;
        place-items: center;
        flex: 1;
        min-width: 0;
        padding: var(--space-2);
        border-radius: var(--radius-md);
      }
      /* Each enlarged icon shrinks with its card, up to 96 px. */
      .big svg {
        width: 100%;
        max-width: 96px;
        height: auto;
      }
      .line {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .checks {
        display: grid;
        gap: var(--space-2);
        max-width: 640px;
      }
      .check {
        display: flex;
        gap: var(--space-2);
        align-items: center;
      }
      .swatch {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
      }
    `,
  ];

  render() {
    return html`
      <div class="eyebrow" style="margin-bottom:8px">As the picker shows them</div>
      <div class="row day">${SCENES.map((s) => html`<div class="tile">${unsafeSVG(sized(s, 36))}</div>`)}</div>
      <div class="row night">${SCENES.map((s) => html`<div class="tile">${unsafeSVG(sized(s, 36))}</div>`)}</div>
      <div class="checks">
        <span class="eyebrow">Told apart at a glance: main colours</span>
        ${closePairs().map(
          (c) => html`<div class="check">
            <n-icon name="triangle-alert" style="color:var(--warn)"></n-icon>
            <span class="swatch" style="background:${mainColour(c.a)}"></span>
            <span class="swatch" style="background:${mainColour(c.b)}"></span>
            ${c.a.label} and ${c.b.label} share a main colour, so their shapes must differ
          </div>`,
        )}
        <div class="check">
          <n-icon name="circle-check" style="color:var(--ok)"></n-icon>
          Every other pair has its own main colour
        </div>
      </div>
      <div class="grid">
        ${SCENES.map(
          (s) => html`<div class="card" aria-current=${s.id === this.sid}>
            <div class="line"><strong>${s.label}</strong></div>
            <div class="big">
              <div class="checker">${unsafeSVG(sized(s, 96))}</div>
              <div class="night">${unsafeSVG(sized(s, 96))}</div>
            </div>
            <div class="line">
              <span class="muted">${s.icon.grid[0].length}×${s.icon.grid.length} px</span>
              <button class="btn" @click=${() => act(this, "edit", { sid: s.id, name: `${s.id}-icon` })}>
                <n-icon name="pencil"></n-icon>Edit
              </button>
            </div>
          </div>`,
        )}
      </div>
    `;
  }
}

customElements.define("icons-view", IconsView);
