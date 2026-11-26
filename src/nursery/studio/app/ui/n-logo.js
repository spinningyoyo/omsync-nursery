// The Nursery Studio's mark: omsync's pixel mascot cropped to its head and raised trunk, with the
// studio's Lucide sprout planted in the trunk. Its outline follows the text colour and the sprout
// the studio's green, in either theme. brand/mark.js and brand/favicon.svg (the same drawing for
// the browser tab) are built from the mascot's grid by `nursery brand`; never edit them here.

import { MARK, VIEWBOX } from "../brand/mark.js";
import { css, html, LitElement, unsafeSVG } from "../ui/lit.js";

export class NLogo extends LitElement {
  static properties = { size: { type: Number } };

  static styles = css`
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
    .sprout,
    .accessory {
      stroke: var(--accent);
    }
  `;

  constructor() {
    super();
    this.size = 24;
  }

  render() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox=${VIEWBOX} width=${this.size} height=${this.size} aria-hidden="true">
      ${unsafeSVG(MARK)}
    </svg>`;
  }
}

customElements.define("n-logo", NLogo);
