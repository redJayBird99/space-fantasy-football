import { render, html } from "lit-html";
import style from "./inbox-page.css";
import "../util/layout.ts";
import "../common/menu-bar.ts";
import "../common/game-header.ts";
import "../common/game-nav.ts";

class InboxPage extends HTMLElement {
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
        <sff-layout>
          <style>
            ${style}
          </style>
          <sff-game-header slot="in-header"></sff-game-header>
          <sff-game-nav slot="in-nav"></sff-game-nav>
          <div slot="in-main"><sff-inbox class="ssaa"></sff-inbox></div>
          <div slot="in-aside">
            <h2>TODO: aside</h2>
          </div>
          <div slot="in-footer"><h2>TODO: footer</h2></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-inbox-page")) {
  customElements.define("sff-inbox-page", InboxPage);
}
