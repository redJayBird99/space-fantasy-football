import { render, html } from "lit-html";
import style from "./manual.css";
import { manualContent } from "./manual";

import { HTMLSFFGameElement } from "../common/html-game-element";

/** the manual page when already in game */
class ManualInGame extends HTMLSFFGameElement {
  connectedCallback() {
    if (this.isConnected) {
      document.title = `Game manual - Space Fantasy Football`;
      super.connectedCallback();
    }
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sff-game-page>
          <div slot="in-main">${manualContent()}</div>
        </sff-game-page>
      `,
      this
    );
  }
}

export default function define() {
  if (!customElements.get("sff-game-manual")) {
    customElements.define("sff-game-manual", ManualInGame);
  }
}
