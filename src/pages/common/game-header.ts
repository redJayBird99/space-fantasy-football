import { html, render } from "lit-html";
import "../common/sim-controls";
import style from "./game-header.css";

/** the header of the pages when in game */
class GameHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sim-controls></sim-controls>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-game-header")) {
  customElements.define("sff-game-header", GameHeader);
}
