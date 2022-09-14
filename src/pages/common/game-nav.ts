import style from "./game-nav.css";
import { render, html } from "lit-html";
import { goLink } from "../util/go-link";

/** the in game nav bar */
class GameNav extends HTMLElement {
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
        <style>
          ${style}
        </style>
        <h2>TODO</h2>
        <ul>
          <li>${goLink(`${window.$PUBLIC_PATH}dashboard`, "dashboard")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}players`, "players")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}league`, "league")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}inbox`, "inbox")}</li>
        </ul>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-game-nav")) {
  customElements.define("sff-game-nav", GameNav);
}
