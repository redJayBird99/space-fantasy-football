import { html, render } from "lit-html";
import style from "./league.css";
import "../tables/league-table.ts";

class LeaguePage extends HTMLElement {
  private mql = window.matchMedia("screen and (max-width: 52rem)");
  private tableMode = "large";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      this.mql.addEventListener("change", this.updateTableMode);
      this.updateTableMode();
    }
  }

  updateTableMode = (): void => {
    this.tableMode = this.mql.matches ? "abbr" : "large";
    this.render();
  };

  disconnectedCallback(): void {
    this.mql.removeEventListener("change", this.updateTableMode);
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sff-layout>
          <sff-game-header slot="in-header"></sff-game-header>
          <sff-game-nav slot="in-nav"></sff-game-nav>
          <div slot="in-main">
            <menu-bar></menu-bar>
            <league-table data-mode=${this.tableMode}></league-table>
          </div>
          <div slot="in-aside"><h2>TODO: aside</h2></div>
          <div slot="in-footer"><h2>TODO: footer</h2></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-league")) {
  customElements.define("sff-league", LeaguePage);
}
