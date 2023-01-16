import { html, render, TemplateResult } from "lit-html";
import { getNextFixtures } from "../../game/character/user";
import { Match } from "../../game/game-sim/tournament-scheduler";
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
        <h3>Fixtures</h3>
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
  const userClass = (team: string) => (user === team ? "font-bold" : "");
  return html`
    <li>
      <div>
        <span class=${`pr-2 ${userClass(m.home)}`}>${m.home}</span>
        -
        <span class=${`pl-2 ${userClass(m.away)}`}>${m.away}</span>
      </div>
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
