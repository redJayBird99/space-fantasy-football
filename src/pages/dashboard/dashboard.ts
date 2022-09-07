import { html, render, TemplateResult } from "lit-html";
import { GameState } from "../../game-state/game-state";
import * as db from "../../game-state/game-db";
import { Match, playing } from "../../game-sim/tournament-scheduler";
import { processResult } from "../../game-state/league-table";
import { daysBetween } from "../../util/math";
import "../util/router.ts";
import "../util/layout.ts";
import "../common/menu-bar.ts";
import "../tables/league-table.ts";
import style from "./dashboard.css";
import "../common/sim-controls";

class Dashboard extends HTMLElement {
  private gs: GameState;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.gs = window.$GAME.state!;
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$GAME.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback(): void {
    window.$GAME.removeObserver(this);
  }

  gameStateUpdated(): void {
    this.gs = window.$GAME.state!; // to be in this page a game exists
    this.render();
  }

  render(): void {
    render(
      html`
        <sff-layout>
          <style>
            ${style}
          </style>
          ${header(this.gs)}
          <div slot="in-nav">
            <h2>TODO: nav bar</h2>
            <sff-go href="${window.$PUBLIC_PATH}players">
              <a href="${window.$PUBLIC_PATH}players">players</a>
            </sff-go>
          </div>
          <dashboard-main slot="in-main" .gs=${this.gs}></dashboard-main>
          <div slot="in-aside">
            <h2>TODO: aside</h2>
          </div>
          <div slot="in-footer"><h2>TODO: footer</h2></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

function header(gs: GameState): TemplateResult {
  return html`
    <div slot="in-header">
      <h1>TODO: header</h1>
      <sim-controls .gs=${gs}></sim-controls>
    </div>
  `;
}

class Main extends HTMLElement {
  private gs?: GameState;

  connectedCallback() {
    if (this.isConnected) {
      window.$GAME.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback(): void {
    window.$GAME.removeObserver(this);
  }

  gameStateUpdated(): void {
    this.render(); // the gs is been updated
  }

  render(): void {
    const name = this.gs?.name.substring(db.savesPrefix.length) ?? "save";

    render(
      html`
        <menu-bar data-game-name=${name}></menu-bar>
        <dashboard-next-match
          role="article"
          .gs=${this.gs!}
        ></dashboard-next-match>
        <league-table data-mode="compact" .gs=${this.gs!}></league-table>
      `,
      this
    );
  }
}

/** displays the user team next match and the last 5 results of both teams */
class NextMatch extends HTMLElement {
  private gs?: GameState;

  connectedCallback() {
    if (this.isConnected) {
      window.$GAME.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback() {
    window.$GAME.removeObserver(this);
  }

  gameStateUpdated(): void {
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
          <em>${team}</em>
          <div class="team-logo">TODO: LOGO</div>
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
      <h2>next game</h2>
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
  customElements.define("dashboard-main", Main);
  customElements.define("dashboard-next-match", NextMatch);
}
