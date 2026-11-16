// The Verify view's side panel: the run's findings, filtered and grouped by animal and fault. A
// group opens to the scenes, themes and widths it shows in; picking one replays it in the centre.
// Each group carries the owner's triage mark.
import {
  actorName,
  RULES,
  ruleLabel,
  sceneLabel,
  sizeLabel,
  themeLabel,
  uidOf,
  verdictOf,
} from "../services/verify-session.js";
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

export class VerifyPanel extends LitElement {
  static properties = { session: { attribute: false } };

  static styles = [
    shared,
    css`
      :host {
        display: block;
        padding: var(--space-3) var(--space-3) var(--space-4);
      }
      .filters {
        display: grid;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        align-items: center;
      }
      select {
        height: 28px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface);
        color: var(--text);
        font: inherit;
        padding: 0 6px;
      }
      .chip[aria-pressed="true"] {
        border-color: var(--accent);
        color: var(--text);
        background: var(--accent-weak);
      }
      .chip .n {
        color: var(--faint);
        font-variant-numeric: tabular-nums;
      }
      .group {
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        margin-bottom: var(--space-2);
        background: var(--surface);
        overflow: hidden;
      }
      .group.open {
        border-color: var(--border-strong);
      }
      .group > button {
        display: grid;
        grid-template-columns: 16px 1fr auto;
        gap: var(--space-2);
        width: 100%;
        padding: var(--space-2) var(--space-2);
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .group > button:hover {
        background: var(--surface-hover);
      }
      .who {
        font-weight: 600;
      }
      .what {
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .count {
        color: var(--muted);
        font-size: var(--text-sm);
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      .rule {
        font-size: var(--text-xs);
        color: var(--faint);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .items {
        border-top: 1px solid var(--border);
      }
      .item {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--space-2);
        width: 100%;
        padding: 6px var(--space-2) 6px 32px;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        font-size: var(--text-sm);
        text-align: left;
        cursor: pointer;
      }
      .item:hover {
        background: var(--surface-hover);
      }
      .item[aria-current="true"] {
        background: var(--accent-weak);
      }
      .item .v {
        color: var(--muted);
        font-variant-numeric: tabular-nums;
      }
      .badge.danger {
        background: var(--danger-weak);
        color: var(--danger);
      }
      .badge.warn {
        background: var(--warn-weak);
        color: var(--warn);
      }
      .badge.muted {
        background: var(--surface-2);
        color: var(--muted);
      }
      .empty {
        color: var(--muted);
        padding: var(--space-3) var(--space-1);
      }
    `,
  ];

  willUpdate(changed) {
    if (changed.has("session")) {
      this.onChange ??= () => this.requestUpdate();
      changed.get("session")?.removeEventListener("change", this.onChange);
      this.session?.addEventListener("change", this.onChange);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.session?.removeEventListener("change", this.onChange);
  }

  render() {
    const s = this.session;
    if (!s?.run) return html`<p class="empty">${s?.loaded ? "No run yet. Press Run verify." : "Loading…"}</p>`;
    const counts = s.ruleCounts();
    const groups = s.groups();
    const f = s.filters;
    const scenes = [...new Set(s.run.findings.map((x) => x.scene))].sort();
    return html`
      <div class="filters">
        <div class="row">
          <button class="chip" aria-pressed=${!f.rule} @click=${() => s.setFilter("rule", null)}>
            All <span class="n">${Object.values(counts).reduce((a, b) => a + b, 0)}</span>
          </button>
          ${RULES.filter((r) => counts[r.id]).map(
            (
              r,
            ) => html`<button class="chip" title=${r.says} aria-pressed=${f.rule === r.id} @click=${() => s.setFilter("rule", f.rule === r.id ? null : r.id)}>
              ${r.label} <span class="n">${counts[r.id]}</span>
            </button>`,
          )}
        </div>
        <div class="row">
          <select aria-label="Scene" @change=${(e) => s.setFilter("scene", e.target.value)}>
            <option value="all" ?selected=${f.scene === "all"}>All scenes</option>
            ${scenes.map((id) => html`<option value=${id} ?selected=${f.scene === id}>${sceneLabel(id)}</option>`)}
          </select>
          <select aria-label="Day or night" @change=${(e) => s.setFilter("theme", e.target.value)}>
            <option value="all" ?selected=${f.theme === "all"}>Day and night</option>
            <option value="light" ?selected=${f.theme === "light"}>Day</option>
            <option value="dark" ?selected=${f.theme === "dark"}>Night</option>
          </select>
          <select aria-label="Page width" @change=${(e) => s.setFilter("size", e.target.value)}>
            <option value="all" ?selected=${f.size === "all"}>Both widths</option>
            <option value="wide" ?selected=${f.size === "wide"}>Desktop</option>
            <option value="phone" ?selected=${f.size === "phone"}>Phone</option>
          </select>
          <select aria-label="Your mark" @change=${(e) => s.setFilter("mark", e.target.value)}>
            <option value="all" ?selected=${f.mark === "all"}>Any mark</option>
            <option value="open" ?selected=${f.mark === "open"}>Not marked</option>
            <option value="bug" ?selected=${f.mark === "bug"}>Real bug</option>
            <option value="strict" ?selected=${f.mark === "strict"}>Rule too strict</option>
            <option value="ignore" ?selected=${f.mark === "ignore"}>Ignored</option>
          </select>
        </div>
      </div>
      ${groups.length ? groups.map((g) => this.renderGroup(g)) : html`<p class="empty">Nothing matches these filters.</p>`}
    `;
  }

  renderGroup(g) {
    const s = this.session;
    const open = s.open === g.key;
    const mark = verdictOf(g.mark?.verdict);
    const range = g.low == null ? "" : g.low === g.high ? `${g.low}` : `${g.low} to ${g.high}`;
    return html`
      <div class="group ${open ? "open" : ""}">
        <button @click=${() => s.toggle(g.key)} aria-expanded=${open}>
          <n-icon name=${open ? "chevron-down" : "chevron-right"} size="14"></n-icon>
          <span>
            <div class="rule">${ruleLabel(g.rule)}</div>
            <div class="who">${actorName(g.actor)} ${g.says}</div>
            <div class="what">${range ? `${range} ${g.unit} · ` : ""}limit ${g.limit}</div>
            <div class="what">${g.scenes.map(sceneLabel).join(", ")}</div>
          </span>
          <span class="count">
            ${g.findings.length}×
            ${mark ? html`<div><span class="badge ${mark.tone}"><n-icon name=${mark.icon} size="11"></n-icon>${mark.label}</span></div>` : nothing}
          </span>
        </button>
        ${
          open
            ? html`<div class="items">
              ${g.findings.map(
                (f) => html`<button class="item" aria-current=${s.selected === uidOf(f)} @click=${() => s.select(f)}>
                  <span>${sceneLabel(f.scene)} · ${themeLabel(f.theme)} · ${sizeLabel(f.size)}${f.stage != null ? ` · stage ${f.stage}` : ""}</span>
                  <span class="v">${f.value ?? ""} · ${f.count}×</span>
                </button>`,
              )}
            </div>`
            : nothing
        }
      </div>
    `;
  }
}

customElements.define("verify-panel", VerifyPanel);
