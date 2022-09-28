import { render, html, TemplateResult } from "lit-html";
import style from "./transactions.css";
import "../common/game-page.ts";
import { SigningRecord, TradeRecord } from "../../game-state/game-state";
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
  return html`<div slot="in-main">${signings()} ${trades()}</div>`;
}

/**
 * returns a reusable container for any type of transaction
 * @param when a dataString
 * @param content the specific transaction content
 */
function transaction(when: string, content: TemplateResult): TemplateResult {
  return html`
    <article class="transaction">
      <h3><time>${when}</time></h3>
      <div class="transaction-summary">${content}</div>
    </article>
  `;
}

/**
 * returns a reusable container for any type of transaction information element
 * @param content the specific content of the transaction
 */
function transactionElement(content: TemplateResult): TemplateResult {
  return html`
    <div class="transaction-info">
      <div class="team-log">LOGO</div>
      <div>${content}</div>
    </div>
  `;
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

  return transaction(
    t.when,
    html`
      ${tradeSide(s1.team, s2.plIds, was)} ${tradeSide(s2.team, s1.plIds, was)}
    `
  );
}

/** returns informations about the given trade side */
function tradeSide(team: string, getPls: string[], was: Date): TemplateResult {
  const gs = window.$game.state!; // it always defined hen in this page
  return transactionElement(html`
    <span class="team-name">${team}</span> acquires:
    <ul class="traded-pls">
      ${getPls.map(
        (id) =>
          html`<li class="cnt-pl-info">${playerInfo(gs.players[id], was)}</li>`
      )}
    </ul>
  `);
}

/** returns informations about the given  player at the given time */
function playerInfo(p: Player, was: Date): TemplateResult {
  const playerPath = (p: Player) =>
    `${window.$PUBLIC_PATH}players/player?id=${p.id}`;

  return html`
    <span class="plr-pos" aria-label="position">${p.position}</span>
    ${goLink(playerPath(p), p.name)}
    <span aria-label="age">
      ${Player.age(p, was)} (<abbr title="year">y.</abbr>
      <abbr title="old">o.</abbr>)
    </span>
  `;
}

function signings(): TemplateResult {
  const signingsRecord = window.$game.state?.signings ?? [];
  return html`
    <section class="signings">
      <h2>New Signings:</h2>
      ${signingsRecord.map((r) => signing(r))}
    </section>
  `;
}

function signing(r: SigningRecord): TemplateResult {
  const gs = window.$game.state!;
  return transaction(
    r.when,
    transactionElement(html`
      <span class="team-name">${r.team}</span> signed:
      <div class="cnt-pl-info signed-pl">
        ${playerInfo(gs.players[r.plId], new Date(r.when))}
      </div>
    `)
  );
}

if (!customElements.get("sff-transactions")) {
  customElements.define("sff-transactions", Transactions);
}
