import { html, render, TemplateResult } from "lit-html";
import { user, tour } from "../../game/game";
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
    const ms = user.getNextFixtures().slice(0, 8);
    const userTeam = window.$game.state!.userTeam!;

    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        <h3>Fixtures</h3>
        <ul>
          ${ms.length > 0
            ? ms.map((m) => fixture(m, userTeam))
            : html`<li>nothing to do</li>`}
        </ul>
      `,
      this.shadowRoot!
    );
  }
}

function fixture(m: tour.Match, user: string): TemplateResult {
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
