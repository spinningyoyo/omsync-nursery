// <n-icon name="play" size="16">: a Lucide line icon that follows the text colour.
import { ICONS } from "./lucide.js";
import { css, html, LitElement, unsafeSVG } from "./lit.js";

export class NIcon extends LitElement {
  static properties = { name: {}, size: { type: Number } };

  static styles = css`
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
  `;

  constructor() {
    super();
    this.size = 16;
  }

  render() {
    const body = ICONS[this.name];
    if (!body) console.warn(`n-icon: no Lucide icon named ${this.name}`);
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width=${this.size}
      height=${this.size}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${unsafeSVG(body ?? "")}
    </svg>`;
  }
}

customElements.define("n-icon", NIcon);
