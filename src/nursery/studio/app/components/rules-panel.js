// The scene against the nursery-scene skill's design rules, as far as the code shows them: a
// landmark, a timed event, density, sizes against the mascot, families, an ambient layer. Rules
// that only show in motion (flyby speeds, the food chain, idle poses) are marked for your eye
// with what to look at, instead of a guess.
import { running } from "../services/live-scene.js";
import { timers } from "../services/events.js";
import { css, html, LitElement } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const STATE = {
  ok: ["circle-check", "var(--ok)", "Passes"],
  warn: ["triangle-alert", "var(--warn)", "Look at this"],
  bad: ["circle-alert", "var(--danger)", "Broken"],
  eye: ["eye", "var(--muted)", "Check by eye"],
};

export class RulesPanel extends LitElement {
  static properties = { model: { attribute: false }, version: { type: Number } };

  static styles = [
    shared,
    css`
      :host {
        display: block;
        padding: var(--space-3) var(--space-4) var(--space-4);
      }
      .summary {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin: var(--space-2) 0 var(--space-3);
      }
      .rule {
        display: grid;
        grid-template-columns: 20px 1fr;
        gap: var(--space-2);
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--border);
      }
      .rule:last-child {
        border-bottom: 0;
      }
      .detail {
        color: var(--muted);
        font-size: var(--text-sm);
      }
    `,
  ];

  render() {
    if (!this.model) return html``;
    const engine = running.live?.engine;
    const live = engine?.scene?.id === this.model.sid ? { timers: timers(engine).map((t) => t.label) } : null;
    const rules = this.model.rules(live);
    const count = (s) => rules.filter((r) => r.state === s).length;
    return html`
      <span class="eyebrow">The nursery-scene skill's design rules</span>
      <div class="summary">
        <span class="badge ok">${count("ok")} pass</span>
        ${count("warn") ? html`<span class="badge waiting">${count("warn")} to look at</span>` : ""}
        ${count("bad") ? html`<span class="badge bad">${count("bad")} broken</span>` : ""}
        <span class="badge info">${count("eye")} by eye</span>
      </div>
      ${rules.map((r) => {
        const [icon, colour, label] = STATE[r.state];
        return html`<div class="rule" title=${label}>
          <n-icon name=${icon} style="color:${colour}"></n-icon>
          <div>
            <div>${r.rule}</div>
            <div class="detail">${r.detail}</div>
          </div>
        </div>`;
      })}
    `;
  }
}

customElements.define("rules-panel", RulesPanel);
