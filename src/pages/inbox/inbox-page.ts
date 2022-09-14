import { render, html } from "lit-html";
import style from "./inbox-page.css";
import "./inbox.ts";
import "../common/game-page.ts";

class InboxPage extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <sff-game-page>
          <style>
            ${style}
          </style>
          <sff-inbox slot="in-main"></sff-inbox>
        </sff-game-page>
      `,
      this
    );
  }
}

if (!customElements.get("sff-inbox-page")) {
  customElements.define("sff-inbox-page", InboxPage);
}
