import { html, render, TemplateResult } from "lit-html";
import { GameState } from "../../game-state/game-state";
import * as db from "../../game-state/game-db";
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
            ${style + ledStyle}
          </style>
          <div slot="in-header"><h1>TODO: header</h1></div>
          <div slot="in-nav"><h2>TODO: nav bar</h2></div>
          <dashboard-main slot="in-main" .gs=${this.gs}></dashboard-main>
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
        <div class="menu-bar" role="menu">
          <autosave-led></autosave-led>
          <dashboard-save-file data-name=${name}></dashboard-save-file>
        </div>
        <dashboard-next-match
          role="article"
          .gs=${this.gs!}
        ></dashboard-next-match>
      `,
      this
    );
  }
}

/** led to signal the game autosave state to the user */
class AutosaveLed extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      db.addDBStateObserver(this);
      this.render();
    }
  }

  updateDBState(): void {
    this.render();
  }

  disconnectedCallback() {
    db.removeDBStateObserver(this);
  }

  render(): void {
    const save = `autosave ${db.on() ? "on" : "off"}`;
    this.className = `led ${db.on() ? "led--on" : "led--off"}`;
    this.ariaLabel = save;
    this.title = save;
    this.setAttribute("role", "img");
  }
}

class SaveGameJson extends HTMLElement {
  json?: string;

  connectedCallback() {
    if (this.isConnected) {
      window.$GAME.addObserver(this);
      this.json = window.$GAME.getStateAsJsonUrl();
      this.render();
    }
  }

  disconnectedCallback() {
    URL.revokeObjectURL(this.json ?? "");
    window.$GAME.removeObserver(this);
  }

  gameStateUpdated(): void {
    // when the gamestate update we need a new json referece for the new state
    URL.revokeObjectURL(this.json ?? "");
    this.json = window.$GAME.getStateAsJsonUrl();
    this.render();
  }

  render(): void {
    render(
      html`<a download="${this.dataset.name}.json" href=${this.json!}
        >save file</a
      >`,
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
  customElements.define("dashboard-save-file", SaveGameJson);
  customElements.define("autosave-led", AutosaveLed);
}
