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
        <style>
          ${style}
        </style>
        <sff-game-page>
          <div slot="in-main">
            <sff-inbox></sff-inbox>
          </div>
        </sff-game-page>
      `,
      this
    );
  }
}

if (!customElements.get("sff-inbox-page")) {
  customElements.define("sff-inbox-page", InboxPage);
}
