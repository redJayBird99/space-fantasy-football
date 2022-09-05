import { html, render, TemplateResult, nothing } from "lit-html";
import { GameState } from "../../game-state/game-state";
import {
  simulate,
  isSimulating,
  setTickInterval,
  DEFAULT_TICK_INTERVAL,
} from "../../game-sim/game-simulation";
import * as db from "../../game-state/game-db";
import { Match, playing } from "../../game-sim/tournament-scheduler";
import { processResult } from "../../game-state/league-table";
import { daysBetween } from "../../util/math";
import * as _ps from "../util/props-state";
import "../util/layout.ts";
import "../common/menu-bar.ts";
import "../tables/league-table.ts";
import style from "./dashboard.css";
import simOps from "../../app-state/sim-options.json";

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
          ${header()}
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

function header(): TemplateResult {
  return html`
    <div slot="in-header">
      <h1>TODO: header</h1>
      <play-sim></play-sim>
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

/** the play button to start the game simulation and customizable options */
class PlaySim extends HTMLElement {
  private simCloser: ReturnType<typeof simulate> | undefined;
  private state = _ps.newState(
    {
      childProps: _ps.newProps({} as { gs?: GameState }),
      openSimOptions: false,
      duration: window.$appState.simOptions.duration,
    },
    () => this.render()
  );

  connectedCallback() {
    if (this.isConnected) {
      this.addEventListener("closeModal", this.handleCloseModal);
      this.addEventListener("simOptionChange", this.handleSimOptionsChange);
      this.render();
    }
  }

  disconnectedCallback() {
    this.removeEventListener("closeModal", this.handleCloseModal);
    this.removeEventListener("simOptionChange", this.handleSimOptionsChange);
  }

  handleCloseModal = () => {
    this.simCloser?.();
  };

  /** change the simulation according the new options */
  handleSimOptionsChange = () => {
    setTickInterval(DEFAULT_TICK_INTERVAL / window.$appState.simOptions.speed);
    _ps.setState(() =>
      Object.assign(this.state, {
        openSimOptions: false,
        duration: window.$appState.simOptions.duration,
      })
    );
  };

  /** save the given gameState */
  handleSimEnd = (gs: GameState) => {
    window.$GAME.state = gs;
    window.$GAME.saveGsOnDB();
    this.render();
  };

  /** update the visual sim proprs with the given gs */
  handleSimTick = (gs: GameState) => {
    _ps.setState(() => {
      _ps.setProps(() => Object.assign(this.state.childProps, { gs }));
      return this.state;
    });
  };

  /** only play a simulation at the time */
  handlePlayClick = () => {
    if (isSimulating()) {
      return;
    }

    this.simCloser = simulate(
      window.$GAME.state!,
      this.handleSimTick,
      this.handleSimEnd,
      this.state.duration === 0 ? undefined : this.state.duration
    );

    this.render();
  };

  handleClickOptions = () => {
    _ps.setState(() =>
      Object.assign(this.state, { openSimOptions: !this.state.openSimOptions })
    );
  };

  renderSim(): TemplateResult {
    return html`
      <sff-modal>
        <visual-sim
          data-modf=${this.state.childProps[_ps.MODF]}
          .props=${this.state.childProps}
        ></visual-sim>
      </sff-modal>
    `;
  }

  render(): void {
    render(
      html`
        <button
          @click=${this.handlePlayClick}
          class="btn-acc"
          aria-label="play the simulation"
        >
          play
        </button>
        <button @click=${this.handleClickOptions} class="btn">
          ${this.state.openSimOptions ? "close" : "open"} sim options
        </button>
        ${this.state.openSimOptions
          ? html`<sim-options></sim-options>`
          : nothing}
        ${isSimulating() ? this.renderSim() : nothing}
      `,
      this
    );
  }
}

/** show the current state of the simulation */
class VisualSim extends HTMLElement {
  private props?: Readonly<_ps.Props & { gs?: GameState }>;

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  static get observedAttributes() {
    return ["data-modf"];
  }

  attributeChangedCallback(name: string) {
    if (name === "data-modf") {
      this.render();
    }
  }

  render(): void {
    this.setAttribute("aria-live", "polite");
    this.textContent =
      this.props?.gs?.date.toLocaleDateString("en-GB", {
        dateStyle: "full",
      }) ?? "";
  }
}

/**
 * a simulation options menu for user customization,
 * it fires a simOptionChange event on user change
 */
class SimOptions extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  /** update the state of the simOptions with what the user chooses */
  handleClickApply = () => {
    const dur = this.querySelector("#js-sim-duration") as HTMLSelectElement;
    const speed = this.querySelector("#js-sim-speed") as HTMLSelectElement;
    window.$appState.simOptions.duration = Number(dur.value);
    window.$appState.simOptions.speed = Number(speed.value);
    this.dispatchEvent(new CustomEvent("simOptionChange", { bubbles: true }));
  };

  /** check if the value is a current setted simOption */
  ckeckIfSelected(value: unknown): boolean {
    return (
      value === window.$appState.simOptions.duration ||
      value === window.$appState.simOptions.speed
    );
  }

  renderOptions(entries: [string, number][]): TemplateResult[] {
    return entries.map((e) =>
      this.ckeckIfSelected(e[1])
        ? html`<option selected value=${e[1]}>(current) ${e[0]}</option>`
        : html`<option value=${e[1]}>${e[0]}</option>`
    );
  }

  render(): void {
    render(
      html`
        <label for="js-sim-duration">choose a simulation duration</label>
        <select id="js-sim-duration">
          ${this.renderOptions(Object.entries(simOps.duration))}
        </select>
        <label for="js-sim-speed">choose a simulation speed</label>
        <select selected id="js-sim-speed">
          ${this.renderOptions(Object.entries(simOps.speed))}
        </select>
        <button class="btn-acc" @click=${this.handleClickApply}>apply</button>
      `,
      this
    );
  }
}

if (!customElements.get("sff-dashboard")) {
  customElements.define("sff-dashboard", Dashboard);
  customElements.define("dashboard-main", Main);
  customElements.define("dashboard-next-match", NextMatch);
  customElements.define("play-sim", PlaySim);
  customElements.define("visual-sim", VisualSim);
  customElements.define("sim-options", SimOptions);
}
