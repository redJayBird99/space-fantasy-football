import { html, render } from "lit-html";
import style from "./game-page.css";
import defineMenuBar from "./menu-bar";
import defineGameHeader from "./game-header";
import defineGameNav from "./game-nav";
defineMenuBar();
defineGameHeader();
defineGameNav();

/** the reusable page when in game with a in-main slot */
class GamePage extends HTMLElement {
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
          <div slot="in-main">
            <menu-bar></menu-bar>
            <slot name="in-main"></slot>
          </div>
          <div slot="in-footer"><h2>TODO: footer</h2></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

export default function define() {
  if (!customElements.get("sff-game-page")) {
    customElements.define("sff-game-page", GamePage);
  }
}
