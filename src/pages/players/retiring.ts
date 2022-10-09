import { html, render, TemplateResult } from "lit-html";
import { Player } from "../../character/player";
import style from "./retiring.css";
import "../common/game-page.ts";
import "../util/router.ts";
import { goLink } from "../util/go-link";

class RetiringPlayers extends HTMLElement {
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
        <sff-game-page>
          <div slot="in-main">${players()}</div>
        </sff-game-page>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("retiring-players")) {
  customElements.define("retiring-players", RetiringPlayers);
}

function players(): TemplateResult {
  const gs = window.$game.state!;

  // TODO in the future add some career stats
  return html`
    <table>
      <caption>
        <h2>👋 Retiring Players</h2>
      </caption>
      <tr>
        <th>name</th>
        <th>team</th>
        <th>age</th>
        <th>games</th>
      </tr>
      ${gs.retiring.map((id) => player(id))}
    </table>
  `;
}

function player(plId: string): TemplateResult {
  const gs = window.$game.state!;
  const p = gs.players[plId];
  const playerPath = `${window.$PUBLIC_PATH}players/player?id=${p.id}`;

  return html`
    <tr>
      <td>${goLink(playerPath, p.name)}</td>
      <td>${p.team}</td>
      <td>${Player.age(p, gs.date)}</td>
      <td>${Math.floor(Math.random() * 450)}</td>
    </tr>
  `;
}
