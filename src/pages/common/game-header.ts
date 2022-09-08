import { html, render } from "lit-html";
import { GameState } from "../../game-state/game-state";
import "../common/sim-controls";
import style from "./game-header.css";

/**
 * the header of the pages when in game
 * @param {GameState} gs - property the current game
 */
class GameHeader extends HTMLElement {
  private gs?: GameState;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$GAME.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback(): void {
    window.$GAME.removeObserver(this);
  }

  gameStateUpdated(): void {
    this.render();
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <h1>TODO: header</h1>
        <sim-controls .gs=${this.gs}></sim-controls>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-game-header")) {
  customElements.define("sff-game-header", GameHeader);
}
