import { html, render } from "lit-html";
import style from "./league.css";
import defineLeagueFixtures from "./league-fixtures";
defineLeagueFixtures();

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
        <style>
          ${style}
        </style>
        <league-table data-mode=${this.tableMode}></league-table>
        <league-fixtures></league-fixtures>
      `,
      this
    );
  }
}

export default function define() {
  if (!customElements.get("sff-league")) {
    customElements.define("sff-league", LeaguePage);
  }
}
