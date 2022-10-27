import { html, render } from "lit-html";
import { getNextFixtures } from "../../character/user";
import style from "./fixtures.css";

class Fixtures extends HTMLElement {
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

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  gameStateUpdated() {
    this.render();
  }

  render(): void {
    const ms = getNextFixtures().slice(0, 7);
    const user = window.$game.state!.userTeam!;

    render(
      html`
        <style>
          ${style}
        </style>
        <h3>${user} Fixtures</h3>
        <ul>
          ${ms.map(
            (m) =>
              html`<li>
                <span>🌗 ${m.away === user ? m.home : m.away}</span>
                <span>${m.away === user ? "away" : "home"}</span>
                <time>${new Date(m.date).toLocaleDateString()}</time>
              </li>`
          )}
        </ul>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-fixtures")) {
  customElements.define("sff-fixtures", Fixtures);
}
