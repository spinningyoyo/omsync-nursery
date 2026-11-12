// The editor's side panel, on the same EditorSession as the editor: Save, the brush, the colours
// this sprite uses, and the scene's whole palette by key. Each swatch is one palette key, its day
// colour beside its night one, so a pixel painted by day gets the matching night colour.
// Choosing a colour hands over to the pencil.
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

export class EditorPanel extends LitElement {
  static properties = { state: { attribute: false } };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-rows: auto 1fr;
        min-height: 0;
      }
      .save {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-4);
        border-bottom: 1px solid var(--border);
      }
      .status {
        color: var(--muted);
        font-size: var(--text-sm);
        word-break: break-word;
      }
      .scroll {
        overflow-y: auto;
        padding: var(--space-3) var(--space-4) var(--space-4);
      }
      .current {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: var(--space-2) 0 var(--space-4);
      }
      .swatches {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 4px;
        margin: var(--space-2) 0 var(--space-4);
      }
      .swatch {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-width: 0;
        padding: 4px;
        border: 1px solid transparent;
        border-radius: var(--radius-sm);
        background: none;
        color: inherit;
        font: inherit;
        font-size: var(--text-sm);
        text-align: left;
        cursor: pointer;
      }
      .swatch:hover {
        background: var(--surface-2);
      }
      .swatch[aria-pressed="true"] {
        border-color: var(--accent);
        background: var(--accent-weak);
      }
      .chip-pair {
        display: flex;
        flex: none;
        width: 28px;
        height: 20px;
        border-radius: 4px;
        overflow: hidden;
        box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.12);
      }
      .chip-pair span {
        flex: 1;
      }
      .key {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--mono);
      }
      label.opt {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-top: var(--space-2);
      }
    `,
  ];

  constructor() {
    super();
    this.onChange = () => this.requestUpdate();
  }

  willUpdate(changed) {
    if (changed.has("state")) {
      changed.get("state")?.removeEventListener("change", this.onChange);
      this.state?.addEventListener("change", this.onChange);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.state?.removeEventListener("change", this.onChange);
  }

  render() {
    const s = this.state;
    if (!s) return html``;
    const same = (a, b) => a && b && (a.key ? a.key === b.key : !b.key && a.light === b.light && a.dark === b.dark);
    const swatch = (c) => html`<button
      class="swatch"
      aria-pressed=${!!same(s.brush, c)}
      @click=${() => s.setBrush(c)}
      title="${c.key ?? "Not a palette colour"}: ${c.light} by day, ${c.dark} by night"
    >
      <span class="chip-pair"><span style="background:${c.light}"></span><span style="background:${c.dark}"></span></span>
      <span class="key">${c.key ?? "not in the palette"}</span>
    </button>`;
    const count = s.changedCount();
    const folder = s.job.proposal ? `proposals/${s.job.proposal}.edits` : "edits";
    const toggle = (field) => (e) => {
      s[field] = e.target.checked;
      s.changed();
    };
    return html`
      <div class="save">
        <button class="btn primary block" ?disabled=${s.saving || !s.dirty()} @click=${() => this.save()}>
          <n-icon name="save"></n-icon>${s.saving ? "Saving…" : "Save edit"}
        </button>
        <span class="status">${count} px changed in this frame · saves to .nursery/${s.model.sid}/${folder}/</span>
      </div>
      <div class="scroll">
        <div class="eyebrow">Brush</div>
        <div class="current">${swatch(s.brush)}</div>
        <div class="eyebrow">In this sprite</div>
        <div class="swatches">${s.usedColours().map(swatch)}</div>
        <div class="eyebrow">Scene palette · ${s.palette.length} colours</div>
        <div class="swatches">${s.palette.map(swatch)}</div>
        ${s.job.themes.length > 1
          ? html`<label class="opt"><input type="checkbox" .checked=${s.link} @change=${toggle("link")} /> Paint day and night together</label>`
          : nothing}
        <label class="opt"><input type="checkbox" .checked=${s.marks} @change=${toggle("marks")} /> Mark changed pixels</label>
      </div>
    `;
  }

  async save() {
    await this.state.save();
    act(this, "saved");
  }
}

customElements.define("editor-panel", EditorPanel);
