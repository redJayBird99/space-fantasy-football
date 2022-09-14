import { html, render } from "lit-html";
import style from "./league.css";
import "../tables/league-table.ts";

class LeaguePage extends HTMLElement {
  private mql = window.matchMedia("screen and (max-width: 52rem)");
  private tableMode = "large";

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
        <sff-game-page>
          <style>
            ${style}
          </style>
          <league-table
            slot="in-main"
            data-mode=${this.tableMode}
          ></league-table>
        </sff-game-page>
      `,
      this
    );
  }
}

if (!customElements.get("sff-league")) {
  customElements.define("sff-league", LeaguePage);
}
