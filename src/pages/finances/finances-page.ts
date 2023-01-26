import { render, html, TemplateResult, nothing } from "lit-html";
import {
  MIN_SALARY_CAP,
  Player,
  SALARY_CAP,
  Contract,
  fanBaseScore,
  Finances,
  luxuryTax,
  minSalaryTax,
  Team,
  util,
  getMonthlyExpenses,
  getWagesAmount,
  getNotExpiringPlayers,
  getContract,
} from "../../game/game";
import defineReSign from "./re-sign";
import style from "./finances-page.css";
import { goLink } from "../util/go-link";
import { HTMLSFFGameElement } from "../common/html-game-element";
defineReSign();

type TeamInfo = { v: string; rank: number };
type Teams = { all: Team[]; t: Team };

const frt = new Intl.NumberFormat("en-GB");
const SEASONS = 4;

/** the team finances page */
class TeamFinances extends HTMLSFFGameElement {
  connectedCallback() {
    if (this.isConnected) {
      document.title = `${window.$game.state?.userTeam} club financial overview - Space Fantasy Football`;
      super.connectedCallback();
    }
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        ${main(window.$game.state?.userTeam ?? "")}
      `,
      this
    );
  }
}

function main(team: string): TemplateResult {
  const gs = window.$game.state;
  const t = gs?.teams[team];

  return html`
    <div slot="in-main">
      ${gs?.flags.onGameEvent === "updateContracts"
        ? html`<re-sign></re-sign>`
        : nothing}
      <section class="cnt-tb-fin">
        ${t && contractsTable(t)} ${t && teamFinances(t)}
      </section>
    </div>
  `;
}

/** collect all team financial information and some general info of the given team */
function teamFinances(t: Team): TemplateResult {
  const gs = window.$game.state!; // in game we always have a state
  const ts = { all: Object.values(gs.teams), t };
  const mExpenses = t ? getMonthlyExpenses({ gs, t }) : 0;
  const wages = t ? getWagesAmount({ gs, t }) : 0;
  const balance = (t.finances.revenue ?? 0) - mExpenses;
  const budget = finInfo(ts, "budget");
  const revenue = finInfo(ts, "revenue");
  const scout = finInfo(ts, "scouting");
  const fcy = finInfo(ts, "facilities");
  const hth = finInfo(ts, "health");

  return html`
    <div class="cnt-fin">
      <h2>💰 team finances:</h2>
      <div class="fin-liquidity">
        <h3>team liquidity:</h3>
        <p>budget: ${budget.v}₡ (${financeRank(budget.rank)})</p>
        <p>monthly revenue: +${revenue.v}₡ (${financeRank(revenue.rank)})</p>
      </div>
      <div class="fin-expenses">
        <h3>monthly expenses:</h3>
        <p>scouting: -${scout.v}₡ (${financeRank(scout.rank)})</p>
        <p>facilities: -${fcy.v}₡ (${financeRank(fcy.rank)})</p>
        <p>health: -${hth.v}₡ (${financeRank(hth.rank)})</p>
        <p>wages: -${frt.format(wages)}₡</p>
        ${taxesExpenses(wages)}
        <p>total: -${frt.format(mExpenses)}₡</p>
      </div>
      <p>
        <span class="fin-bal ${balance >= 0 ? "positive" : "negative"}">
          financial balance: ${frt.format(balance)}₡
        </span>
      </p>
      <div class="info">
        <h3>info:</h3>
        <p>maximum salary cap: ${frt.format(SALARY_CAP)}₡</p>
        <p>minimum salary cap: ${frt.format(MIN_SALARY_CAP)}₡</p>
        ${teamGeneralInfo(ts)}
      </div>
    </div>
  `;
}

/**
 * get the value and the financial ranking of the given team respect to the other teams
 * @param k the financial field to rank
 * @param ascending the ranking sort order
 */
function finInfo(ts: Teams, k: keyof Finances, ascending = false): TeamInfo {
  const i = util
    .sortByFinances(ts.all, k, ascending)
    .findIndex((tm) => ts.t === tm);
  return { v: frt.format(ts.t?.finances[k] ?? 0), rank: i + 1 };
}

/**
 * get the value and the field ranking of the given team respect to the other teams
 * @param k only for appeal and fanBase
 * @param ascending the ranking sort order
 */
function teamInfo(ts: Teams, k: keyof Team, ascending = false): TeamInfo {
  const i = util
    .sortTeamsBy(ts.all, k, ascending)
    .findIndex((tm) => ts.t === tm);
  return { v: ts.t[k]?.toString() ?? "", rank: i + 1 };
}

/** get the fan base ranking size of the given team */
function rankFanBase(ts: Teams): number {
  const max = fanBaseScore.huge;
  const rank = (ts.all.length / max) * (max - fanBaseScore[ts.t.fanBase]);
  return rank === 0 ? 1 : rank;
}

/** convert the given rank to a color  */
function getRankColor(rank: number): string {
  const size = Object.values(window.$game.state?.teams ?? {}).length || 1;
  return `hsl(${120 - (rank / size) * 120}deg 70% 70%)`;
}

/** get the colored ranking symbol */
function financeRank(rank: number): TemplateResult {
  return html`
    <span class="fin-rank" style="color: ${getRankColor(rank)}">
      ${rank}<sup>${cardinalSymbol(rank)}</sup>
    </span>
  `;
}

/** get the cardinal number symbol for the given rank */
function cardinalSymbol(rank: number): "st" | "nd" | "th" | "rd" {
  switch (rank) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** return the info about the luxury and min salary taxes given the wages sum */
function taxesExpenses(wages: number): TemplateResult {
  const lx = luxuryTax(wages);
  const mTx = minSalaryTax(wages);

  return html`
    <p>
      luxury tax:
      <span class="tax ${lx > 0 ? "negative" : ""}">-${frt.format(lx)}₡</span>
    </p>
    <p>
      minimum salary tax:
      <span class="tax ${mTx > 0 ? "negative" : ""}">-${frt.format(mTx)}₡</span>
    </p>
  `;
}

/** return the info about the appeal and the fan base size for the given team */
function teamGeneralInfo(ts: Teams): TemplateResult {
  const apl = teamInfo(ts, "appeal");
  const aplSty = `background-color: ${getRankColor(apl.rank)}`;
  const fanSty = `background-color: ${getRankColor(rankFanBase(ts))}`;

  return html`
    <p>
      team appeal:
      <span class="gen-info" style=${aplSty}>
        ${apl.rank}<sup>${cardinalSymbol(apl.rank)}</sup>
      </span>
    </p>
    <p>
      fan base: <span class="gen-info" style=${fanSty}>${ts.t.fanBase}</span>
    </p>
  `;
}

/** table with all team players wages */
function contractsTable(t: Team): TemplateResult {
  const gs = window.$game.state!;
  const pls = getNotExpiringPlayers({ gs, t });
  const years = Array.from(
    { length: SEASONS },
    (_, i) => gs.date.getFullYear() + i
  );

  return html`
    <table>
      <caption>
        <h2>⚽ players wages:</h2>
      </caption>
      <tr>
        <th>name</th>
        ${years.map((y) => html`<th aria-label="year wage">${y}</th>`)}
      </tr>
      ${pls.map((p) => plWageRow(p))} ${wagesSummary(pls)}
    </table>
  `;
}

/** get the player row about its yearly wages table */
function plWageRow(p: Player): TemplateResult {
  const gs = window.$game.state!;
  const c = getContract(gs, p);
  const plLink = `players/player?id=${p.id}`;
  const yWages = Array.from({ length: SEASONS }, (_, i) =>
    (c?.duration ?? 0) - i > 0 ? c?.wage : ""
  );
  return html`
    <tr>
      <td>${goLink(plLink, p.name)}</td>
      ${yWages.map((w) => html`<td>${w ? `${frt.format(w)}₡` : w}</td>`)}
    </tr>
  `;
}

/** the summary rows about the wages expenses for the given players and the salary cap space */
function wagesSummary(pls: Player[]): TemplateResult {
  const gs = window.$game.state!;
  const cs = pls.map((p) => getContract(gs, p));
  const yearWage = (y: number, c: Contract | void) =>
    c && c.duration - y > 0 ? c.wage : 0;
  const plsWagesSum = Array.from({ length: SEASONS }, (_, i) =>
    cs.reduce((a, c) => a + yearWage(i, c), 0)
  );
  return html`
    <tr class="wage-totals">
      <td>totals</td>
      ${plsWagesSum.map((w) => html`<td>${frt.format(w)}₡</td>`)}
    </tr>
    <tr>
      <td>free cap space</td>
      ${plsWagesSum.map((w) => maxSalaryCapSpaceCell(w))}
    </tr>
  `;
}

/** the table cell about the remaining salary cap space */
function maxSalaryCapSpaceCell(wages: number): TemplateResult {
  const bal = SALARY_CAP - wages;
  return html`
    <td>
      <span class="cap-space ${bal >= 0 ? "positive" : "negative"}">
        ${frt.format(bal)}₡
      </span>
    </td>
  `;
}

export default function define() {
  if (!customElements.get("sff-team-finances")) {
    customElements.define("sff-team-finances", TeamFinances);
  }
}
