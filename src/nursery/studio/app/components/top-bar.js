// The bar across the top: the app's name and the scene on show, the views of the centre, whether
// the code on screen is current, the inbox and the theme.
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const VIEWS = [
  { id: "scene", label: "Scene", icon: "image" },
  { id: "board", label: "Board", icon: "layout-grid" },
  { id: "family", label: "Families", icon: "users" },
  { id: "icons", label: "Icons", icon: "shapes" },
];

const THEMES = [
  { id: "light", label: "Day", icon: "sun" },
  { id: "dark", label: "Night", icon: "moon" },
];

export class TopBar extends LitElement {
  static properties = {
    view: {},
    heading: {},
    theme: {},
    inbox: { type: Number },
    stale: { type: Boolean },
  };

  static styles = [
    shared,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        height: var(--bar-height);
        padding: 0 var(--space-3) 0 var(--space-4);
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }
      .brand {
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-weight: 650;
        font-size: var(--text-lg);
      }
      .where {
        overflow: hidden;
        min-width: 0;
        color: var(--muted);
        font-weight: 550;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .grow {
        flex: 1;
      }
      .fresh {
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .fresh.stale {
        color: var(--warn);
      }
      .fresh.stale .dot {
        background: var(--warn);
      }
      .fresh .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--ok);
      }
    `,
  ];

  render() {
    return html`
      <div class="brand">
        <n-logo size="26"></n-logo>
        Nursery Studio
      </div>
      <div class="seg" role="group" aria-label="View">
        ${VIEWS.map(
          (v) => html`<button
            aria-pressed=${this.view === v.id}
            @click=${() => act(this, "view", { view: v.id })}
          >
            <n-icon name=${v.icon}></n-icon>${v.label}
          </button>`,
        )}
      </div>
      <span class="where">${this.heading}</span>
      <div class="grow"></div>
      ${this.stale
        ? html`<span class="fresh stale">
            <span class="dot"></span>The code changed. Save your edits, then
            <button class="btn" @click=${() => act(this, "reload")}><n-icon name="refresh-cw"></n-icon>Reload</button>
          </span>`
        : html`<span class="fresh" title="The studio reloads itself when the code on disk changes">
            <span class="dot"></span>Up to date
          </span>`}
      <button class="btn ghost inbox" @click=${() => act(this, "tab", { tab: "inbox" })}>
        <n-icon name="inbox"></n-icon>Inbox
        ${this.inbox ? html`<span class="badge count">${this.inbox}</span>` : nothing}
      </button>
      <div class="seg" role="group" aria-label="Theme">
        ${THEMES.map(
          (t) => html`<button
            aria-pressed=${this.theme === t.id}
            title=${t.label}
            @click=${() => act(this, "theme", { theme: t.id })}
          >
            <n-icon name=${t.icon}></n-icon>
          </button>`,
        )}
      </div>
    `;
  }
}

customElements.define("top-bar", TopBar);
