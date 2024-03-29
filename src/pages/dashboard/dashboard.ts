import { html, render, TemplateResult } from "lit-html";
import {
  tour,
  table,
  getSeasonMatches,
  getRound,
  getNextRound,
} from "../../game/game";
import { daysBetween } from "../../util/math";
import { HTMLSFFGameElement } from "../common/html-game-element";
import style from "./dashboard.css";
import pImg from "../../asset/planet1.svg";
import defineFixtures from "./fixtures";
defineFixtures();

class Dashboard extends HTMLSFFGameElement {
  connectedCallback() {
    if (this.isConnected) {
      document.title = `${window.$game.state?.userTeam} club dashboard - Space Fantasy Football`;
      super.connectedCallback();
    }
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <div class="bg-grid1"></div>
        <dashboard-next-match role="article"></dashboard-next-match>
        <sff-fixtures role="article"></sff-fixtures>
        <sff-inbox data-compact></sff-inbox>
        <league-table data-mode="compact"></league-table>
      `,
      this
    );
  }
}

/** displays the user team next match and the last 5 results of both teams */
class NextMatch extends HTMLSFFGameElement {
  /** get the symbol of the given team result, returns "-" when no result was found */
  resultSymbol(team: string, m?: tour.Match): "won" | "lost" | "drawn" | "-" {
    if (m && m.result) {
      const r = table.processResult(m.result);
      return m.home === team ? r.home.state : r.away.state;
    }

    return "-";
  }

  /** get a box with a symbol result of the given match */
  private historyBox(team: string, m?: tour.Match): TemplateResult {
    // TODO: add tooltip
    const symbol = this.resultSymbol(team, m);
    return html`
      <div class="history-box ${symbol}">
        <abbr aria-label=${symbol} title=${symbol}>
          <strong class="rst-symbol">${symbol[0]}</strong>
        </abbr>
      </div>
    `;
  }

  /** get a team box with always the last 5 matches played of the given team */
  private teamBox(team: string, history: tour.Match[]): TemplateResult {
    return html`
      <div class="team">
        <div>
          <h3>${team}</h3>
          <img
            width="150"
            height="150"
            class="team-logo"
            src=${pImg}
            alt="a red planet"
          />
        </div>
        <div class="history-boxes" aria-label="previous games results">
          ${Array.from({ length: 5 }, (_, i) =>
            this.historyBox(team, history[i])
          )}
        </div>
      </div>
    `;
  }

  /**
   * return the entire structure of the next match, when the match doesn't
   * exist the informational content is empty
   */
  private renderNextMarch(next?: tour.Match): TemplateResult {
    const gs = window.$game.state!;
    const home = next?.home ?? "";
    const away = next?.away ?? "";
    const matches = getSeasonMatches(gs, "now").filter((m) => m.result);
    const homeHistory = matches.filter((m) => tour.playing(m, home)).slice(-5);
    const awayHistory = matches.filter((m) => tour.playing(m, away)).slice(-5);
    const days = next ? `(${daysBetween(next.date, gs.date)} days)` : "";

    return html`
      <h2>Next Game</h2>
      <p>
        <time>
          ${next?.date.toLocaleDateString("en-US", { dateStyle: "full" })}
        </time>
        ${days}
      </p>
      <div class="teams">
        ${this.teamBox(home, homeHistory)} ${this.teamBox(away, awayHistory)}
      </div>
    `;
  }

  private renderUserNextMatch(): TemplateResult {
    const gs = window.$game.state!;
    const rnd = getNextRound(gs);

    if (rnd !== undefined) {
      return this.renderNextMarch(
        getRound(gs, rnd, "now")?.find((m) => tour.playing(m, gs.userTeam))
      );
    }

    return this.renderNextMarch();
  }

  render(): void {
    render(html`${this.renderUserNextMatch()}`, this);
  }
}

export default function define() {
  if (!customElements.get("sff-dashboard")) {
    customElements.define("sff-dashboard", Dashboard);
    customElements.define("dashboard-next-match", NextMatch);
  }
}
