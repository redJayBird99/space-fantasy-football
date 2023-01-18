import { GameState, table } from "../../game/game";
import { html, render, TemplateResult } from "lit-html";
import style from "./league-table.css";
import { goLink } from "../util/go-link";
import { mainStyleSheet } from "../style-sheets";

const columns = [
  { full: "team", abbr: "team", data: (e: table.Entry) => e.teamName },
  { full: "played", abbr: "pl", data: (e: table.Entry) => e.played },
  { full: "won", abbr: "w", data: (e: table.Entry) => e.won },
  { full: "drawn", abbr: "d", data: (e: table.Entry) => e.drawn },
  { full: "lost", abbr: "l", data: (e: table.Entry) => e.lost },
  { full: "goals for", abbr: "GF", data: (e: table.Entry) => e.goalsFor },
  {
    full: "goals against",
    abbr: "GA",
    data: (e: table.Entry) => e.goalsAgainst,
  },
  {
    full: "goal difference",
    abbr: "GD",
    data: (e: table.Entry) => e.goalsFor - e.goalsAgainst,
  },
  { full: "points", abbr: "pts", data: (e: table.Entry) => e.points },
];

const cmpctCols = columns.filter(
  (c) => c.abbr !== "GF" && c.abbr !== "GA" && c.abbr !== "GD"
);

/**
 * the LeagueTable can have one of three attribute data-mode:
 * - large: complete table without abbreviations
 * - abbr: complete table with abbreviations (default)
 * - compact: removes some columns and has abbreviations
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
  renderHeads(): TemplateResult {
    const useFull = (abbr: string) =>
      abbr !== "GF" && abbr !== "GA" && abbr !== "GD";

    return html`
      <th scope="col"><abbr title="Position">Pos.</abbr></th>
      ${(this.dataset.mode === "compact" ? cmpctCols : columns).map((c) =>
        this.dataset.mode === "large" && useFull(c.abbr)
          ? html`<th scope="col">${c.full}</th>`
          : html`<th scope="col"><abbr title=${c.full}>${c.abbr}</abbr></th>`
      )}
    `;
  }

  /** when the table is in large mode add supplementary data columns */
  renderData(e: table.Entry): TemplateResult[] {
    return (this.dataset.mode === "compact" ? cmpctCols : columns).map((c) => {
      const rst = c.data(e);
      return html`<td>
        ${c.full === "team" && typeof rst === "string"
          ? goLink(`team?team=${rst}`, rst)
          : rst}
      </td>`;
    });
  }

  renderRows() {
    const user = window.$game.state?.userTeam;
    const season = this.dataset.season ?? "now";
    const renderRow = (e: table.Entry, i: number) =>
      html`<tr class=${e.teamName === user ? "user-row" : ""}>
        <td>${i + 1}</td>
        ${this.renderData(e)}
      </tr>`;
    return new table.LeagueTable(
      GameState.getSeasonMatches(window.$game.state!, season)
    )
      .getSortedTable()
      .map(renderRow);
  }

  render(): void {
    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        <table
          class=${this.dataset.mode === "compact" ? "compact" : "tb-complete"}
        >
          <caption>
            <h2>🏆 League Table</h2>
          </caption>
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

export default function define() {
  if (!customElements.get("league-table")) {
    customElements.define("league-table", LeagueTable);
  }
}
