// The rail down the left: each scene as its own pixel icon, as on the sign-in page, with its name
// on hover and a count of proposals waiting in it.
import { iconSvg } from "/js/kit/pixel.js";
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing, unsafeSVG } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

export class SceneRail extends LitElement {
  static properties = {
    scenes: { attribute: false },
    sid: {},
    waiting: { attribute: false },
  };

  static styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: var(--space-3) 0;
        border-right: 1px solid var(--border);
        background: var(--surface);
        overflow-y: auto;
      }
      button {
        position: relative;
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        background: transparent;
        cursor: pointer;
      }
      button:hover {
        background: var(--surface-hover);
      }
      button[aria-current="true"] {
        border-color: var(--accent);
        background: var(--accent-weak);
      }
      button:focus-visible {
        outline: 2px solid var(--accent);
      }
      button svg {
        width: 30px;
        height: 30px;
      }
      .badge {
        position: absolute;
        top: -3px;
        right: -3px;
      }
      button .tip {
        position: absolute;
        left: calc(100% + 10px);
        top: 50%;
        transform: translateY(-50%);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        background: var(--text);
        color: var(--bg);
        font-size: var(--text-sm);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.12s;
        z-index: 10;
      }
      button:hover .tip,
      button:focus-visible .tip {
        opacity: 1;
      }
    `,
  ];

  render() {
    return (this.scenes ?? []).map((scene) => {
      const count = this.waiting?.[scene.id] ?? 0;
      return html`<button
        aria-current=${scene.id === this.sid}
        aria-label=${scene.label}
        @click=${() => act(this, "scene", { sid: scene.id })}
      >
        ${unsafeSVG(iconSvg(scene.icon.grid, scene.icon.colours))}
        ${count ? html`<span class="badge count">${count}</span>` : nothing}
        <span class="tip">${scene.label}</span>
      </button>`;
    });
  }
}

customElements.define("scene-rail", SceneRail);
