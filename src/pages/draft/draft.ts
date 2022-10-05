import { render, html, TemplateResult } from "lit-html";
import style from "./draft.css";
import "../common/game-page.ts";
import {
  DraftPickRecord,
  DraftRecord,
  GameState,
} from "../../game-state/game-state";
import { goLink } from "../util/go-link";
import { Player } from "../../character/player";
import { getImprovability } from "../../character/user";
import { draftPlayer } from "../../game-sim/game-simulation";

type onEvt = (e: Event) => unknown;

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

  onSeasonChange = (e: Event): void => {
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
            ${this.renderSeasonSelector()}
            <div class="cnt-draft-info">
              ${draftTable(draft)} ${lottery(draft.lottery)}
            </div>
          </div>
        </sff-game-page>
      `,
      this
    );
  }
}

/** handle the user drafting a player, it is assumed that the clicked draft btn
 * contain the id of a draftable */
function onDraftClick(e: Event): void {
  const gs = window.$game.state as GameState;
  const plId = (e.target as HTMLButtonElement).value;

  if (gs.flags.userDrafting) {
    draftPlayer(gs, gs.players[plId]);
    gs.flags.userDrafting = false;
    window.$game.state = gs; // mutation notification
  }
}

function draftTable(dft: DraftRecord): TemplateResult {
  return html`
    <div class="cnt-draft-players">
      <table>
        <tr>
          <th>Pick</th>
          <th>Name</th>
          <th><abbr title="position">Pos.</abbr></th>
          <th>Age</th>
          <th><abbr title="improvability">Imp.</abbr></th>
          <th>Team</th>
          <th>draft</th>
        </tr>
        ${dft.picked.map((d) => plrRow(d, new Date(dft.when)))}
        ${dft.picks.map((d) => plrRow(d, new Date(dft.when), onDraftClick))}
      </table>
    </div>
  `;
}

/**
 * a table row about the given draftable player
 * @param rec
 * @param when the date of the draft
 * @param onPick if the player is draftable on click call this function
 * @returns
 */
function plrRow(
  rec: DraftPickRecord,
  when: Date,
  onPick?: onEvt
): TemplateResult {
  const gs = window.$game.state!;
  const p = gs.players[rec.plId];
  const link = `${window.$PUBLIC_PATH}players/player?id=${rec.plId}`;

  // the player could be retired
  return html`
    <tr>
      <td><span class="pick-n">${isNaN(rec.n) ? "" : rec.n}</span></td>
      <td>${p ? goLink(link, p.name) : "a retired player"}</td>
      <td>${p ? p.position.toUpperCase() : ""}</td>
      <td>${p ? Player.age(p, when) : ""}</td>
      <td>${p ? improvabilitySymbol(rec.plId) : ""}</td>
      <td ?data-user=${rec.team === gs.userTeam}>${rec.team}</td>
      <td>
        <button
          ?disabled=${!p || !onPick || !gs.flags.userDrafting}
          @click=${onPick}
          aria-label="draft player"
          value=${rec.plId}
        >
          Draft
        </button>
      </td>
    </tr>
  `;
}

/** show the estimated player improvability */
function improvabilitySymbol(plId: string): TemplateResult {
  const gs = window.$game.state!;
  const rks = ["F", "E", "E+", "D", "D+", "C", "C+", "B", "B+", "A", "A+"];
  const rk = getImprovability(gs.players[plId], gs);

  return html`
    <span
      class="impv-symbol"
      style="border-color: ${`hsl(${(rk / 10) * 120}deg 100% 60%)`}"
    >
      ${rks[Math.floor(rk)]}
    </span>
  `;
}

/** list the teams' picking order */
function lottery(order: string[]): TemplateResult {
  const user = window.$game.state?.userTeam;
  const pickN = window.$game.state!.drafts.now.picked.length + 1;
  return html`
    <article class="cnt-lottery">
      <h2>Lottery:</h2>
      <ol class="lottery" start=${pickN ?? 1}>
        ${order.map((t) => html`<li ?data-user=${user === t}>${t}</li>`)}
      </ol>
    </article>
  `;
}

if (!customElements.get("sff-draft")) {
  customElements.define("sff-draft", Draft);
}
