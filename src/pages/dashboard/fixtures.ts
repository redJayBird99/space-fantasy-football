import { html, render, TemplateResult } from "lit-html";
import { getNextFixtures } from "../../character/user";
import { Match } from "../../game-sim/tournament-scheduler";
import style from "./fixtures.css";
import { HTMLSFFGameElement } from "../common/html-game-element";
import { mainStyleSheet } from "../style-sheets";

/** a preview of the next few matches for the user team */
class Fixtures extends HTMLSFFGameElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render(): void {
    const ms = getNextFixtures().slice(0, 8);
    const user = window.$game.state!.userTeam!;

    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
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

export default function define() {
  if (!customElements.get("sff-fixtures")) {
    customElements.define("sff-fixtures", Fixtures);
  }
}
