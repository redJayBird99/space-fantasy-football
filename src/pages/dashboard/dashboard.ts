import { html, render, TemplateResult } from "lit-html";
import { GameState } from "../../game-state/game-state";
import { Match, playing } from "../../game-sim/tournament-scheduler";
import { processResult } from "../../game-state/league-table";
import { daysBetween } from "../../util/math";
import "../tables/league-table.ts";
import "../inbox/inbox.ts";
import style from "./dashboard.css";
import pImg from "../../asset/planet1.svg";
import "./fixtures";

class Dashboard extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  gameStateUpdated() {
    this.render();
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sff-game-page>
          <div slot="in-main">
            <div class="bg-grid1"></div>
            <dashboard-next-match role="article"></dashboard-next-match>
            <sff-fixtures role="article"></sff-fixtures>
            <sff-inbox data-compact></sff-inbox>
            <league-table data-mode="compact"></league-table>
          </div>
        </sff-game-page>
      `,
      this
    );
  }
}

/** displays the user team next match and the last 5 results of both teams */
class NextMatch extends HTMLElement {
  private gs = window.$game.state;

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  gameStateUpdated(gs?: Readonly<GameState>): void {
    this.gs = gs;
    this.render();
  }

  /** get the symbol of the given team result, returns "-" when no result was found */
  resultSymbol(team: string, m?: Match): "won" | "lost" | "drawn" | "-" {
    if (m && m.result) {
      const r = processResult(m.result);
      return m.home === team ? r.home.state : r.away.state;
    }

    return "-";
  }

  /** get a box with a symbol result of the given match */
  private historyBox(team: string, m?: Match): TemplateResult {
    // TODO: add tooltip
    const symbol = this.resultSymbol(team, m);
    return html`
      <div class="history-box ${symbol}">
        <abbr aria-label=${symbol} title=${symbol}>
          <strong>${symbol[0]}</strong>
        </abbr>
      </div>
    `;
  }

  /** get a team box with always the last 5 matches played of the given team */
  private teamBox(team: string, history: Match[]): TemplateResult {
    return html`
      <div class="team">
        <div>
          <h3>${team}</h3>
          <img class="team-logo" src=${pImg} alt="a red planet" />
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
  private renderNextMarch(next?: Match): TemplateResult {
    const home = next?.home ?? "";
    const away = next?.away ?? "";
    const matches = GameState.getSeasonMatches(this.gs!, "now").filter(
      (m) => m.result
    );
    const homeHistory = matches.filter((m) => playing(m, home)).slice(-5);
    const awayHistory = matches.filter((m) => playing(m, away)).slice(-5);
    const days = next ? `(${daysBetween(next.date, this.gs!.date)} days)` : "";

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
    const rnd = GameState.getNextRound(this.gs!);

    if (rnd !== undefined) {
      return this.renderNextMarch(
        GameState.getRound(this.gs!, rnd, "now")?.find((m) =>
          playing(m, this.gs?.userTeam)
        )
      );
    }

    return this.renderNextMarch();
  }

  private render(): void {
    render(html`${this.renderUserNextMatch()}`, this);
  }
}

if (!customElements.get("sff-dashboard")) {
  customElements.define("sff-dashboard", Dashboard);
  customElements.define("dashboard-next-match", NextMatch);
}
