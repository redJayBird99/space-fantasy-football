import { render, html, TemplateResult } from "lit-html";
import groupBy from "lodash-es/groupBy";
import style from "./transactions.css";
import {
  SigningRecord,
  TradeRecord,
  TransRecord,
} from "../../game-state/game-state";
import { Player } from "../../character/player";
import { goLink } from "../util/go-link";
import { HTMLSFFGameElement } from "../common/html-game-element";

/** the page where all transactions (trades, new signing etc.) are collected */
class Transactions extends HTMLSFFGameElement {
  // remember at which season was when the user navigates back
  season: string = new URLSearchParams(location.search).get("season") ?? "now";

  connectedCallback() {
    if (this.isConnected) {
      document.title = `Transactions history - Space Fantasy Football`;
      super.connectedCallback();
    }
  }

  onSeasonChange = (e: Event) => {
    this.season = (e.target as HTMLSelectElement).value;
    // preserve the season position when navigating back
    const href = location.origin + location.pathname + `?season=${this.season}`;
    history.replaceState({}, "", href);
    this.render();
  };

  renderSeasonSelector(): TemplateResult {
    return html`
      <div class="cnt-season-sel">
        <label for="season">Season: </label>
        <select class="form-select" id="season" @change=${this.onSeasonChange}>
          ${Object.keys(window.$game.state!.transactions).map(
            (k) =>
              html`<option ?selected=${k === this.season} value=${k}>
                ${k === "now" ? "current" : k}
              </option>`
          )}
        </select>
      </div>
    `;
  }

  render(): void {
    const rec = window.$game.state!.transactions[this.season];
    render(
      html`
        <style>
          ${style}
        </style>
        ${this.renderSeasonSelector()} ${transactionsSection(rec)}
      `,
      this
    );
  }
}

/** a page section listing all given transactions */
function transactionsSection(rec: TransRecord): TemplateResult {
  return html`
    <div class="ctn-transactions">
      ${trades(rec.trades)} ${signings(rec.signings)} ${renewals(rec.renewals)}
    </div>
  `;
}

/** collect the given records by date from most recent to least recent */
function collectByDate<T extends SigningRecord | TradeRecord>(rs: T[]): T[][] {
  return Object.values(groupBy(rs, (e) => e.when)).sort(
    (c1, c2) => new Date(c2[0].when).getTime() - new Date(c1[0].when).getTime()
  );
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
function transaction(
  title: TemplateResult,
  content: TemplateResult
): TemplateResult {
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
function trades(rs: TradeRecord[]) {
  return html`
    <section class="trades">
      <h2>🔄 Trades:</h2>
      ${collectByDate(rs).map((ts) => tradesBlocks(ts))}
    </section>
  `;
}

/** returns a collection of trades block from the given ones */
function tradesBlocks(ts: TradeRecord[]): TemplateResult {
  return transactions(
    new Date(ts[0].when).toDateString(),
    ts.map((t) => trade(t))
  );
}

/** returns informations about the given trade */
export function trade(t: TradeRecord): TemplateResult {
  const s1 = t.sides[0];
  const s2 = t.sides[1];
  const was = new Date(t.when);

  return html`<div class="transaction-summary trade-summary">
    ${tradeSide(s1.team, s2.plIds, was)} ${tradeSide(s2.team, s1.plIds, was)}
  </div>`;
}

/** returns informations about the given trade side */
function tradeSide(team: string, getPls: string[], was: Date): TemplateResult {
  return transaction(
    html`${teamLink(team)} acquires:`,
    html`
      <ul class="traded-pls">
        ${getPls.map(
          (id) => html`<li class="cnt-pl-info">${playerInfo(id, was)}</li>`
        )}
      </ul>
    `
  );
}

/** returns informations about the given player id at the given time */
function playerInfo(plId: string, was: Date): TemplateResult {
  // when the player is retired doesn't exist, TODO add some record of retired players
  const gs = window.$game.state!;
  const p = gs.players[plId];

  if (p) {
    return html`
      <span class="plr-pos" aria-label="position">${p.position}</span>
      ${goLink(`players/player?id=${p.id}`, p.name)}
      <span aria-label="age">
        ${Player.age(p, was)} <abbr title="year">y.</abbr>
        <abbr title="old">o.</abbr>
      </span>
    `;
  }

  return html`
    <span class="plr-pos" aria-label="position">-</span>
    ${gs.retirees[plId].name ?? ""} (retired)
  `;
}

/** list all signings recorded */
function signings(sr: SigningRecord[]): TemplateResult {
  return html`
    <section class="signings">
      <h2>📝 New Signings:</h2>
      ${collectByDate(sr).map((sr) => signingsBlock(sr))}
    </section>
  `;
}

/** returns a collection of signings block from the given ones */
function signingsBlock(sr: SigningRecord[]): TemplateResult {
  return transactions(
    new Date(sr[0].when).toDateString(),
    sr.map((r) => html`<div class="transaction-summary">${signing(r)}</div>`)
  );
}

/** returns informations about the given signed player */
function signing(r: SigningRecord): TemplateResult {
  return transaction(
    html`${teamLink(r.team)} signed:`,
    html`
      <div class="cnt-pl-info">${playerInfo(r.plId, new Date(r.when))}</div>
    `
  );
}

/** list all renewals recorded */
function renewals(rs: SigningRecord[]): TemplateResult {
  return html`
    <section class="signings">
      <h2>✍ Re-signings:</h2>
      ${collectByDate(rs).map((r) => signingsBlock(r))}
    </section>
  `;
}

function teamLink(name: string): TemplateResult {
  return goLink(`team?team=${name}`, name);
}

export default function define() {
  if (!customElements.get("sff-transactions")) {
    customElements.define("sff-transactions", Transactions);
  }
}
