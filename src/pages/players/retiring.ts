import { html, render, TemplateResult } from "lit-html";
import { Player } from "../../game/character/player";
import style from "./retiring.css";
import { goLink } from "../util/go-link";
import { HTMLSFFGameElement } from "../common/html-game-element";
import { randomGauss } from "../../util/generator";
import { mainStyleSheet } from "../style-sheets";

class RetiringPlayers extends HTMLSFFGameElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      document.title = `Retiring players - Space Fantasy Football`;
      super.connectedCallback();
    }
  }

  render(): void {
    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        ${players()}
      `,
      this.shadowRoot!
    );
  }
}

function players(): TemplateResult {
  const gs = window.$game.state!;

  // TODO in the future add some career stats
  return html`
    <section class="retire-sec">
      <h2>👋 Retiring Players</h2>
      <div class="cnt-pls">${gs.retiring.map((id) => player(id))}</div>
    </section>
  `;
}

function player(plId: string): TemplateResult {
  const gs = window.$game.state!;
  const p = gs.players[plId];
  const teamPath = p.team !== "free agent" ? `team?team=${p.team}` : "";

  return html`
    <article class="cnt-plr ${gs.userTeam === p.team ? "user-plr" : ""}">
      <h3>${goLink(`players/player?id=${p.id}`, p.name)}</h3>
      <div>
        <span>${teamPath ? goLink(teamPath, p.team) : p.team}</span>
        <span>${Player.age(p, gs.date)} y.o.</span>
        <span>${Math.floor(randomGauss() * 450)} games</span>
      </div>
    </article>
  `;
}

export default function define() {
  if (!customElements.get("retiring-players")) {
    customElements.define("retiring-players", RetiringPlayers);
  }
}
