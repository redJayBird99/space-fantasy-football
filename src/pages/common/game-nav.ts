import style from "./game-nav.css";
import { render, html, nothing } from "lit-html";
import { goLink } from "../util/go-link";

/** the in game nav bar */
class GameNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  gameStateUpdated() {
    this.render();
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <h2>TODO</h2>
        <ul>
          <li>${goLink(`${window.$PUBLIC_PATH}dashboard`, "dashboard")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}players`, "players")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}league`, "league")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}inbox`, "inbox")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}team`, "team")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}finances`, "finances")}</li>
          <li>
            ${goLink(`${window.$PUBLIC_PATH}transactions`, "transactions")}
          </li>
          <li>${goLink(`${window.$PUBLIC_PATH}draft`, "draft")}</li>
          ${window.$game.state?.flags.onGameEvent === "retiring"
            ? html`<li>
                ${goLink(`${window.$PUBLIC_PATH}retiring`, "retiring")}
              </li>`
            : nothing}
        </ul>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-game-nav")) {
  customElements.define("sff-game-nav", GameNav);
}
