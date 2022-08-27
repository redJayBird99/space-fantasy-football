import { html, render, TemplateResult } from "lit-html";
import { GameState } from "../../game-state/game-state";
import { on } from "../../game-state/game-db";
import { Match, playing } from "../../game-sim/tournament-scheduler";
import { processResult } from "../../game-state/league-table";
import { daysBetween } from "../../util/math";
import "../util/layout.ts";
import style from "./dashboard.css";
import ledStyle from "../util/led.css";

class Dashboard extends HTMLElement {
  private gs: GameState;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    window.$GAME.addObserver(this);
    this.gs = window.$GAME.state!;
  }

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  gameStateUpdated(): void {
    // to be in this page the game is initialized
    this.gs = window.$GAME.state!;
    this.render();
  }

  render(): void {
    render(
      html`
        <sff-layout>
          <style>
            ${style + ledStyle}
          </style>
          <div slot="in-header"><h1>TODO: header</h1></div>
          <div slot="in-nav"><h2>TODO: nav bar</h2></div>
          <dashboard-main slot="in-main" .gs=${this.gs}> </dashboard-main>
          <div slot="in-aside"><h2>TODO: aside</h2></div>
          <div slot="in-footer"><h2>TODO: footer</h2></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

class Main extends HTMLElement {
  private gs?: GameState;

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <div class="menu-bar" role="menu">${autosaveLed()}</div>
        <dashboard-next-match role="article" .gs=${this.gs!}>
        </dashboard-next-match>
      `,
      this
    );
  }
}

/** led to signal the game autosave state to the user */
function autosaveLed(): TemplateResult {
  const state = on() ? "on" : "off";
  const color = on() ? "led--on" : "led--off";
  const save = `autosave ${state}`;
  return html`
    <div
      class="led ${color}"
      aria-label="${save}"
      role="img"
      title="${save}"
    ></div>
  `;
}

/** displays the user team next match and the last 5 results of both teams */
class NextMatch extends HTMLElement {
  private gs?: GameState;

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  /** get the symbol of the given team result, returns "-" when no result was found */
  resultSymbol(team: string, m?: Match): "won" | "lost" | "draws" | "-" {
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
        <strong aria-label=${symbol}>${symbol[0]}</strong>
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
        <div class="history-boxes" aria-label="old match results">
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
      <h2>next match</h2>
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
