import { html, render, TemplateResult } from "lit-html";
import { getNextFixtures } from "../../character/user";
import { Match } from "../../game-sim/tournament-scheduler";
import style from "./fixtures.css";

/** a preview of the next few matches for the user team */
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
          ${ms.length > 0
            ? ms.map((m) => fixture(m, user))
            : html`<li>nothing to do</li>`}
        </ul>
      `,
      this.shadowRoot!
    );
  }
}

function fixture(m: Match, user: string): TemplateResult {
  return html`
    <li>
      <span>🌗 ${m.away === user ? m.home : m.away}</span>
      <span>${m.away === user ? "away" : "home"}</span>
      <time>${new Date(m.date).toLocaleDateString()}</time>
    </li>
  `;
}

if (!customElements.get("sff-fixtures")) {
  customElements.define("sff-fixtures", Fixtures);
}
