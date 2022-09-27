import { render, html, TemplateResult } from "lit-html";
import style from "./transactions.css";
import "../common/game-page.ts";
import { TradeRecord } from "../../game-state/game-state";
import { Player } from "../../character/player";
import { goLink } from "../util/go-link";

/** the page where all transactions (trades, new signing etc.) are collected */
class Transactions extends HTMLElement {
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
        <sff-game-page>${main()}</sff-game-page>
      `,
      this
    );
  }
}

function main(): TemplateResult {
  return html`<div slot="in-main">${trades()}</div>`;
}

/** list all the trades recorded */
function trades() {
  const tradesRecord = window.$game.state?.trades ?? [];
  return html`
    <section class="trades">
      <h2>Trades:</h2>
      ${tradesRecord.map((t) => trade(t))}
    </section>
  `;
}

/** returns informations about the given trade */
function trade(t: TradeRecord): TemplateResult {
  const s1 = t.sides[0];
  const s2 = t.sides[1];
  const was = new Date(t.when);

  return html`
    <article class="trade">
      <h3><time>${t.when}</time></h3>
      <div class="trade-summary">
        ${tradeSide(s1.team, s2.plIds, was)}
        ${tradeSide(s2.team, s1.plIds, was)}
      </div>
    </article>
  `;
}

/** returns informations about the given trade side */
function tradeSide(team: string, getPls: string[], was: Date): TemplateResult {
  const gs = window.$game.state;
  return html`
    <div>
      <div class="team-log">LOGO</div>
      <div>
        <span class="team-name">${team}</span> acquires:
        <ul class="traded-pls">
          ${getPls.map((id) => (gs ? tradedPlayer(gs.players[id], was) : ""))}
        </ul>
      </div>
    </div>
  `;
}

/** returns informations about the given player at the given time */
function tradedPlayer(p: Player, was: Date): TemplateResult {
  const playerPath = (p: Player) =>
    `${window.$PUBLIC_PATH}players/player?id=${p.id}`;

  return html`
    <li>
      <span class="plr-pos" aria-label="position">${p.position}</span>
      ${goLink(playerPath(p), p.name)}
      <span aria-label="age">
        ${Player.age(p, was)} (<abbr title="year">y.</abbr>
        <abbr title="old">o.</abbr>)
      </span>
    </li>
  `;
}

if (!customElements.get("sff-transactions")) {
  customElements.define("sff-transactions", Transactions);
}
