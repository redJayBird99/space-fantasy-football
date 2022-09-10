import { html, render } from "lit-html";
import { GameState } from "../../game-state/game-state";
import * as db from "../../game-state/game-db";
import style from "./league.css";
import "../tables/league-table.ts";

class LeaguePage extends HTMLElement {
  private gs: GameState = window.$GAME.state!;
  private mql = window.matchMedia("screen and (max-width: 52rem)");
  private tableMode = "large";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$GAME.addObserver(this);
      this.mql.addEventListener("change", this.updateTableMode);
      this.updateTableMode();
    }
  }

  updateTableMode = (): void => {
    this.tableMode = this.mql.matches ? "abbr" : "large";
    this.render();
  };

  disconnectedCallback(): void {
    window.$GAME.removeObserver(this);
    this.mql.removeEventListener("change", this.updateTableMode);
  }

  gameStateUpdated(): void {
    this.gs = window.$GAME.state!;
    this.render();
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sff-layout>
          <sff-game-header slot="in-header" .gs=${this.gs}></sff-game-header>
          <sff-game-nav slot="in-nav"></sff-game-nav>
          <div slot="in-main">
            <menu-bar data-game-name=${db.getGameName(this.gs)}></menu-bar>
            <league-table
              data-mode=${this.tableMode}
              .gs=${this.gs!}
            ></league-table>
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
