// The scene icons, in the centre: all ten side by side at the picker's real size and enlarged, on
// day and night, so each reads as its scene's best-known subject and no two share both a shape
// and a colour. The icons are each scene module's `icon` grid; Edit opens one in the pixel
// editor, like any sprite. Below them is the brand: omsync's mascot (Edit opens it in the same
// editor), the favicons and the studio's mark, all built from the mascot's grid.
import { iconSvg } from "/js/kit/pixel.js";
import { acceptAndClear } from "../services/edits.js";
import { BRAND_ID, BRAND_PALETTES, SCENES, SceneModel } from "../services/scene-model.js";
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing, unsafeSVG } from "../ui/lit.js";
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

// How omsync draws the mascot by day and by night: the outline follows the text colour and the
// body its --mascot-body variable (brand.css).
const brandTile = (theme) =>
  `color:${BRAND_PALETTES[theme].ink};--mascot-body:${BRAND_PALETTES[theme].body};background:${theme === "light" ? "#fff" : "#111"}`;

export class IconsView extends LitElement {
  static properties = { sid: {}, mascot: { state: true }, brand: { state: true } };

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
      .brand-head {
        margin-top: var(--space-5);
      }
      .brand {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        margin-top: var(--space-2);
      }
      .brand .card {
        flex: 1 1 240px;
        align-content: start;
      }
      .brand .card.wide {
        flex: 2 1 440px;
      }
      .tiles {
        display: flex;
        gap: var(--space-2);
      }
      .tiles > div {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        flex: 1;
        min-width: 0;
        padding: var(--space-3);
        border-radius: var(--radius-md);
        border: 1px solid var(--border);
      }
      .tiles .mascot {
        width: 192px;
        max-width: 100%;
      }
      .tiles .mascot svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .mascot-body {
        fill: var(--mascot-body);
      }
      .tiles img {
        display: block;
        image-rendering: pixelated;
      }
      .follows {
        color: var(--muted);
      }
      .swatch {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.loadBrand();
  }

  // The built mascot (what omsync will serve) and the mascot's saved edits.
  async loadBrand() {
    const [mascot, model] = await Promise.all([
      fetch("/brand/mascot.svg").then((r) => r.text()),
      SceneModel.load(BRAND_ID),
    ]);
    await model.refresh();
    this.mascot = mascot;
    this.brand = model;
  }

  async clearBrandEdits() {
    await acceptAndClear(this.brand);
    this.requestUpdate();
  }

  renderBrand() {
    const edits = this.brand ? [...this.brand.edits.values()] : [];
    const waiting = edits.filter((e) => this.brand.editState(e) !== "in code").length;
    const tiles = (draw, themes = ["light", "dark"]) =>
      html`<div class="tiles">
        ${themes.map((theme) => html`<div style=${brandTile(theme)}>${draw(theme)}</div>`)}
      </div>`;
    return html`
      <div class="brand-head">
        <div class="eyebrow">Brand</div>
        <div class="muted">The mascot's grid is the one master. Every other brand file is built from it.</div>
      </div>
      <div class="brand">
        <div class="card wide">
          <div class="line"><strong>Mascot</strong><span class="muted">omsync's elephant, day and night</span></div>
          ${tiles(() => html`<div class="mascot">${unsafeSVG(this.mascot ?? "")}</div>`)}
          <div class="line">
            <span class="muted">32×22 px</span>
            <button class="btn" ?disabled=${!this.brand} @click=${() => act(this, "edit", { sid: BRAND_ID, name: "brand-mascot" })}>
              <n-icon name="pencil"></n-icon>Edit
            </button>
          </div>
          ${
            edits.length
              ? html`<div class="line">
                <span class="muted">${edits.length} saved ${edits.length === 1 ? "edit" : "edits"}: ${waiting ? `${waiting} waiting for the agent` : "all in the grid"}</span>
                <button class="btn" @click=${() => this.clearBrandEdits()}>Accept and clear</button>
              </div>`
              : nothing
          }
        </div>
        <div class="card">
          <div class="line"><strong>omsync favicon</strong><span class="follows">follows the mascot</span></div>
          ${tiles(
            (theme) => html`<img src="/brand/favicon.svg" width="32" height="32" alt="" />
              ${
                theme === "light"
                  ? html`<img src="/brand/favicon.svg" width="96" height="96" alt="" />`
                  : html`<img src="/brand/favicon-32.png" width="32" height="32" alt="" />
                    <img src="/brand/favicon-32.png" width="96" height="96" alt="" />`
              }`,
          )}
          <div class="muted">favicon.svg at 32 px and enlarged; favicon-32.png on the right</div>
        </div>
        <div class="card">
          <div class="line"><strong>Studio mark</strong><span class="follows">follows the mascot</span></div>
          ${tiles(() => html`<n-logo size="32"></n-logo><n-logo size="96"></n-logo>`)}
          <div class="muted">The sprout is vector (Lucide) and is not editable here.</div>
        </div>
        <div class="card">
          <div class="line"><strong>Studio favicon</strong><span class="follows">follows the mascot</span></div>
          ${tiles(
            () => html`<img src="/app/brand/favicon.svg" width="32" height="32" alt="" />
              <img src="/app/brand/favicon.svg" width="96" height="96" alt="" />`,
            ["light"],
          )}
          <div class="muted">The tab icon, at 32 px and enlarged</div>
        </div>
      </div>
    `;
  }

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
      ${this.renderBrand()}
    `;
  }
}

customElements.define("icons-view", IconsView);
