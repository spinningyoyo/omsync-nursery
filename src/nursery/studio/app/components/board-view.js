// Every pose of the scene at once, in the centre, all at one scale: for comparing sizes and
// colours across the whole scene. Clicking one selects its element in the side panel; with
// "Animate", walkers walk and birds flap.
import { act } from "../ui/action.js";
import { css, html, LitElement } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

export class BoardView extends LitElement {
  static properties = {
    model: { attribute: false },
    selected: {},
    zoom: { state: true },
    theme: { state: true },
    animate: { state: true },
    tick: { state: true },
  };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-rows: auto 1fr;
        min-height: 0;
        background: var(--bg);
      }
      .bar {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-4);
        border-bottom: 1px solid var(--border);
        background: var(--surface);
        color: var(--muted);
      }
      label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .body {
        overflow: auto;
        padding: var(--space-4);
      }
      h3 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: var(--space-4) 0 var(--space-2);
      }
      .grid {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: var(--space-3);
      }
      .cell {
        display: grid;
        gap: 4px;
        justify-items: center;
        padding: var(--space-2);
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        background: none;
        color: var(--muted);
        font: inherit;
        font-size: var(--text-sm);
        cursor: pointer;
      }
      .cell:hover {
        background: var(--surface);
        border-color: var(--border);
      }
      .cell[aria-current="true"] {
        border-color: var(--accent);
        background: var(--accent-weak);
        color: var(--text);
      }
    `,
  ];

  constructor() {
    super();
    this.zoom = 3;
    this.theme = "light";
    this.animate = false;
    this.tick = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this.timer = setInterval(() => {
      if (this.animate) this.tick += 1;
    }, 250);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.timer);
  }

  render() {
    if (!this.model) return html``;
    const frameOf = (job) => job.frames?.[this.tick % (job.frames?.length || 1)];
    return html`
      <div class="bar">
        <n-icon name="ruler"></n-icon>One scale for every sprite
        <div class="seg">
          ${[2, 3, 4].map((z) => html`<button aria-pressed=${this.zoom === z} @click=${() => (this.zoom = z)}>${z}×</button>`)}
        </div>
        <div class="seg">
          ${[
            ["light", "sun", "Day"],
            ["dark", "moon", "Night"],
          ].map(
            ([t, icon, label]) =>
              html`<button aria-pressed=${this.theme === t} @click=${() => (this.theme = t)}><n-icon name=${icon}></n-icon>${label}</button>`,
          )}
        </div>
        <label><input type="checkbox" .checked=${this.animate} @change=${(e) => (this.animate = e.target.checked)} /> Animate</label>
      </div>
      <div class="body">
        ${this.model.groups.map(
          (g) => html`
            <h3 class="eyebrow"><n-icon name=${g.icon} size="14"></n-icon>${g.title}</h3>
            <div class="grid">
              ${g.items.flatMap((item) =>
                item.jobs.map(
                  (job) => html`<button
                    class="cell"
                    aria-current=${this.selected === item.id}
                    @click=${() => act(this, "select", { element: item.id })}
                    title=${job.size ? `${job.size[0]}×${job.size[1]} px` : ""}
                  >
                    <n-sprite .job=${job} .zoom=${this.zoom} theme=${this.theme} .f=${frameOf(job)}></n-sprite>
                    ${job.title}
                  </button>`,
                ),
              )}
            </div>
          `,
        )}
      </div>
    `;
  }
}

customElements.define("board-view", BoardView);
