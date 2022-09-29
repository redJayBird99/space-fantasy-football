import { render, html, TemplateResult } from "lit-html";
import { groupBy } from "lodash-es";
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
  return html`<div slot="in-main">
    ${trades()} ${signings()} ${renewals()}
  </div>`;
}

/**
 * returns a reusable transactions container of any type
 * @param when a dateString
 * @param trans a collection of transactions happened at the given date
 */
function transactions(when: string, trans: TemplateResult[]): TemplateResult {
  return html`
    <article class="transactions">
      <h3><time>${when}</time></h3>
      ${trans}
    </article>
  `;
}

/**
 * returns a reusable container for any type of transaction
 * @param title the introductory title of the transaction
 * @param content the specific content of the transaction
 */
function transaction(title: string, content: TemplateResult): TemplateResult {
  return html`
    <div>
      <h4 class="transaction-title">${title}</h4>
      <div class="transaction-content">
        <div class="team-log">🪐</div>
        ${content}
      </div>
    </div>
  `;
}

/** list all trades recorded */
function trades() {
  const tradesRecord = groupBy(
    (window.$game.state?.trades ?? []).reverse(),
    (e) => e.when
  );
  return html`
    <section class="trades">
      <h2>🔄 Trades:</h2>
      ${Object.values(tradesRecord).map((ts) => tradesBlocks(ts))}
    </section>
  `;
}

/** returns a collection of trades block from the given ones */
function tradesBlocks(ts: TradeRecord[]): TemplateResult {
  return transactions(
    ts[0].when,
    ts.map((t) => trade(t))
  );
}

/** returns informations about the given trade */
function trade(t: TradeRecord): TemplateResult {
  const s1 = t.sides[0];
  const s2 = t.sides[1];
  const was = new Date(t.when);

  return html`<div class="transaction-summary trade-summary">
    ${tradeSide(s1.team, s2.plIds, was)} ${tradeSide(s2.team, s1.plIds, was)}
  </div>`;
}

/** returns informations about the given trade side */
function tradeSide(team: string, getPls: string[], was: Date): TemplateResult {
  const gs = window.$game.state!; // it always defined when in this page
  const title = `${team} acquires:`;
  return transaction(
    title,
    html`
      <ul class="traded-pls">
        ${getPls.map(
          (id) =>
            html`<li class="cnt-pl-info">
              ${playerInfo(gs.players[id], was)}
            </li>`
        )}
      </ul>
    `
  );
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

/** list all signings recorded */
function signings(): TemplateResult {
  const signsRec = groupBy(
    (window.$game.state?.signings ?? []).reverse(),
    (e) => e.when
  );
  return html`
    <section class="signings">
      <h2>📝 New Signings:</h2>
      ${Object.values(signsRec).map((sr) => signingsBlock(sr))}
    </section>
  `;
}

/** returns a collection of signings block from the given ones */
function signingsBlock(sr: SigningRecord[]): TemplateResult {
  return transactions(
    sr[0].when,
    sr.map((r) => html`<div class="transaction-summary">${signing(r)}</div>`)
  );
}

/** returns informations about the given signed player */
function signing(r: SigningRecord): TemplateResult {
  const gs = window.$game.state!;
  const title = `${r.team} signed:`;
  return transaction(
    title,
    html`
      <div class="cnt-pl-info">
        ${playerInfo(gs.players[r.plId], new Date(r.when))}
      </div>
    `
  );
}

/** list all renewals recorded */
function renewals(): TemplateResult {
  const signsRec = groupBy(
    (window.$game.state?.renewals ?? []).reverse(),
    (e) => e.when
  );
  return html`
    <section class="signings">
      <h2>🗃 Re-signings:</h2>
      ${Object.values(signsRec).map((sr) => signingsBlock(sr))}
    </section>
  `;
}

if (!customElements.get("sff-transactions")) {
  customElements.define("sff-transactions", Transactions);
}
