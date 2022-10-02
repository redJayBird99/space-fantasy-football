import { render, html, TemplateResult } from "lit-html";
import style from "./draft.css";
import "../common/game-page.ts";
import { DraftPickRecord, DraftRecord } from "../../game-state/game-state";
import { goLink } from "../util/go-link";
import { getImprovabilityRating, Player } from "../../character/player";

/** the page where all drafts are collected */
class Draft extends HTMLElement {
  // remember at which season was when the user navigates back
  season = new URLSearchParams(location.search).get("season") ?? "now";

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  gameStateUpdated() {
    this.render();
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  onSeasonChange = (e: Event) => {
    this.season = (e.target as HTMLSelectElement).value;
    // preserve the season position when navigating back
    const href = location.origin + location.pathname + `?season=${this.season}`;
    history.pushState({}, "", href);
    this.render();
  };

  renderSeasonSelector(): TemplateResult {
    return html`
      <div class="cnt-season-sel">
        <label for="season">Season: </label>
        <select id="season" @change=${this.onSeasonChange}>
          ${Object.keys(window.$game.state!.drafts).map(
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
    const draft = window.$game.state!.drafts[this.season];

    render(
      html`
        <style>
          ${style}
        </style>
        <sff-game-page>
          <div slot="in-main">
            ${this.renderSeasonSelector()} ${main(draft)}
          </div>
        </sff-game-page>
      `,
      this
    );
  }
}

function main(dft: DraftRecord): TemplateResult {
  return html`
    <table>
      <tr>
        <th class="small-col">Pick</th>
        <th>Name</th>
        <th class="small-col"><abbr title="position">Pos.</abbr></th>
        <th class="small-col">Age</th>
        <th class="small-col"><abbr title="improvability">Imp.</abbr></th>
        <th>Team</th>
      </tr>
      ${dft.picks.map((d) => plrRow(d, new Date(dft.when)))}
    </table>
  `;
}

function plrRow(rec: DraftPickRecord, when: Date): TemplateResult {
  const p = window.$game.state!.players[rec.plId];
  const link = `${window.$PUBLIC_PATH}players/player?id=${rec.plId}`;

  // the player could be retired
  return html`
    <tr>
      <td><span class="pick-n">${isNaN(rec.n) ? "" : rec.n}</span></td>
      <td>${p ? goLink(link, p.name) : "a retired player"}</td>
      <td>${p ? p.position.toUpperCase() : ""}</td>
      <td>${p ? Player.age(p, when) : ""}</td>
      <td>${p ? improvabilitySymbol(p.growthRate) : ""}</td>
      <td>${rec.team}</td>
    </tr>
  `;
}

function improvabilitySymbol(growthRate: number): TemplateResult {
  const rks = ["E", "E+", "D", "D+", "C", "C+", "B", "B+", "A", "A+"];
  const rk = getImprovabilityRating(growthRate);

  return html`
    <span
      class="impv-symbol"
      style="border-color: ${`hsl(${(rk / 10) * 120}deg 100% 60%)`}"
    >
      ${rks[Math.floor(getImprovabilityRating(growthRate))]}
    </span>
  `;
}

if (!customElements.get("sff-draft")) {
  customElements.define("sff-draft", Draft);
}
