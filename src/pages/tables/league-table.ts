import { GameState } from "../../game-state/game-state";
import { Entry, LeagueTable as League } from "../../game-state/league-table";
import { html, render, TemplateResult } from "lit-html";
import style from "./league-table.css";

const columns = [
  { full: "name", abbr: "name", data: (e: Entry) => e.teamName },
  { full: "played", abbr: "pl", data: (e: Entry) => e.played },
  { full: "won", abbr: "w", data: (e: Entry) => e.won },
  { full: "drawn", abbr: "d", data: (e: Entry) => e.drawn },
  { full: "lost", abbr: "l", data: (e: Entry) => e.lost },
  { full: "goals for", abbr: "gf", data: (e: Entry) => e.goalsFor },
  { full: "goals against", abbr: "ga", data: (e: Entry) => e.goalsAgainst },
  {
    full: "goal difference",
    abbr: "gd",
    data: (e: Entry) => e.goalsFor - e.goalsAgainst,
  },
  { full: "points", abbr: "pts", data: (e: Entry) => e.points },
];

const cmpctCols = columns.filter(
  (c) => c.abbr !== "gf" && c.abbr !== "ga" && c.abbr !== "gd"
);

/**
 * the LeagueTable can have one of three attribute data-mode:
 * - large: complete table without abbreviations
 * - abbr: complete table with abbreviations (default)
 * - compact: removes some coluoms and has abbreviations
 * to specify the season use the data-season (default to now)
 * TODO: switch mode according the screen size (use the media query)
 */
class LeagueTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  static get observedAttributes() {
    return ["data-mode"];
  }

  attributeChangedCallback(name: string, old: string | null) {
    // the first render is left to connectedCallback
    if (name === "data-mode" && old !== null) {
      this.render();
    }
  }

  gameStateUpdated(): void {
    this.render();
  }

  /** when the table is in large mode add supplementary heads columns */
  renderHeads(): TemplateResult[] {
    return (this.dataset.mode === "compact" ? cmpctCols : columns).map((c) =>
      this.dataset.mode === "large"
        ? html`<th scope="col">${c.full}</th>`
        : html`<th scope="col"><abbr title=${c.full}>${c.abbr}</abbr></th>`
    );
  }

  /** when the table is in large mode add supplementary datas columns */
  renderDatas(e: Entry): TemplateResult[] {
    return (this.dataset.mode === "compact" ? cmpctCols : columns).map(
      (c) => html`<td>${c.data(e)}</td>`
    );
  }

  renderRows() {
    const season = this.dataset.season ?? "now";
    const renderRow = (e: Entry) =>
      html`<tr>
        ${this.renderDatas(e)}
      </tr>`;
    return new League(GameState.getSeasonMatches(window.$game.state!, season))
      .getSortedTable()
      .map(renderRow);
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <table class=${this.dataset.mode === "compact" ? "" : "tb-complete"}>
          <caption>
            <h2>## League Table ##</h2>
          </caption>
          <col span="1" />
          <thead>
            <tr>
              ${this.renderHeads()}
            </tr>
          </thead>
          <tbody class="tby">
            ${this.renderRows()}
          </tbody>
        </table>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("league-table")) {
  customElements.define("league-table", LeagueTable);
}
