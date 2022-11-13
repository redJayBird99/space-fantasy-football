import { html, render, TemplateResult } from "lit-html";
import style from "./game-page.css";
import defineMenuBar from "./menu-bar";
import defineGameHeader from "./game-header";
import defineGameNav from "./game-nav";
import { forkMe } from "./fork-me";
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
          <div slot="in-footer">${footerInfos()} ${forkMe()}</div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

function footerInfos(): TemplateResult {
  return html`
    <ul class="footer-infos">
      <li>
        <a
          href="https://github.com/RedAndBlu/space-fantasy-football#readme"
          target="_blank"
          >about</a
        >
      </li>
      <li>
        <a
          href="https://github.com/RedAndBlu/space-fantasy-football/issues"
          target="_blank"
          >Report an issue</a
        >
      </li>
    </ul>
  `;
}

export default function define() {
  if (!customElements.get("sff-game-page")) {
    customElements.define("sff-game-page", GamePage);
  }
}
