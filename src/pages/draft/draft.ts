import { render, html, TemplateResult, nothing } from "lit-html";
import style from "./draft.css";
import {
  DraftPickRecord,
  DraftRecord,
  GameState,
} from "../../game-state/game-state";
import { goLink } from "../util/go-link";
import { Player } from "../../character/player";
import {
  estimateImprovabilityRating,
  getPlayerRating,
  getPlayerRatingSymbol,
  improvabilityRatingSymbol,
} from "../../character/user";
import { draftPlayer } from "../../game-sim/game-simulation";
import { HTMLSFFGameElement } from "../common/html-game-element";

/** the page where all drafts are collected */
class Draft extends HTMLSFFGameElement {
  // remember at which season was when the user navigates back
  season = new URLSearchParams(location.search).get("season") ?? "now";

  connectedCallback() {
    if (this.isConnected) {
      document.title = `Draft overview - Space Fantasy Football`;
      super.connectedCallback();
    }
  }

  onSeasonChange = (e: Event): void => {
    this.season = (e.target as HTMLSelectElement).value;
    // preserve the season position when navigating back
    const href = location.origin + location.pathname + `?season=${this.season}`;
    history.replaceState({}, "", href);
    this.render();
  };

  renderSeasonSelector(): TemplateResult {
    return html`
      <div class="cnt-season-sel">
        <label for="season">Season: </label>
        <select class="form-select" id="season" @change=${this.onSeasonChange}>
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
        ${this.renderSeasonSelector()}
        <div class="cnt-draft-info">
          ${draftTable(draft)} ${lottery(draft.lottery)}
        </div>
      `,
      this
    );
  }
}

/** handle the user drafting a player, it is assumed that the clicked draft btn
 * contain the id of a draftable player */
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
          <th><abbr title="Position">Pos.</abbr></th>
          <th>Age</th>
          <th><abbr title="Improvability">Imp.</abbr></th>
          <th><abbr title="Rating">Rat.</abbr></th>
          <th>Team</th>
          <th>Draft</th>
        </tr>
        ${dft.picked.map((d) => plrRow(d, new Date(dft.when)))}
        ${dft.picks.map((d) => plrRow(d, new Date(dft.when)))}
      </table>
    </div>
  `;
}

/**
 * a table row about the given draftable player
 * @param rec
 * @param when the date of the draft
 * @returns
 */
function plrRow(rec: DraftPickRecord, when: Date): TemplateResult {
  const gs = window.$game.state!;
  const p = gs.players[rec.plId];
  const plLink = `players/player?id=${rec.plId}`;
  const canDraft = p && gs.flags.userDrafting && p.team === "draft";
  const teamLink = goLink(`team?team=${rec.team}`, rec.team);

  // the player could be retired
  return html`
    <tr>
      <td><span class="pick-n">${isNaN(rec.n) ? "" : rec.n}</span></td>
      <td>${
        p ? goLink(plLink, p.name) : `${gs.retirees[rec.plId]} (retired)`
      }</td>
      <td>${p ? p.position.toUpperCase() : ""}</td>
      <td>${p ? Player.age(p, when) : ""}</td>
      <td>${p ? improvabilitySymbol(rec.plId) : ""}</td>
      <td>${p ? PlayerRatingSymbol(rec.plId) : ""}</td></td>
      <td ?data-user=${rec.team === gs.userTeam}>${teamLink}</td>
      <td>
        <button
          class="btn btn-sml btn-acc"
          ?disabled=${!canDraft}
          @click=${canDraft ? onDraftClick : nothing}
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
  const p = gs.players[plId];
  const t = gs.teams[gs.userTeam];
  return ratingSymbol(
    improvabilityRatingSymbol(p, t),
    estimateImprovabilityRating(p, t)
  );
}

/** show the player rating value (how good the player is currently) */
function PlayerRatingSymbol(plId: string): TemplateResult {
  const gs = window.$game.state!;
  const p = gs.players[plId];
  return ratingSymbol(getPlayerRatingSymbol(p, gs), getPlayerRating(p, gs));
}

function ratingSymbol(symbol: string, rating: number): TemplateResult {
  return html`
    <span
      class="rtg-symbol"
      style="border-color: ${`hsl(${rating * 120}deg 100% 60%)`}"
    >
      ${symbol}
    </span>
  `;
}

/** list the teams' picking order */
function lottery(order: string[]): TemplateResult {
  const user = window.$game.state?.userTeam;
  const pickN = window.$game.state!.drafts.now.picked.length + 1;
  const teamLink = (t: string) => goLink(`team?team=${t}`, t);

  return html`
    <article class="cnt-lottery">
      <h2>🎲 Lottery</h2>
      <ol class="lottery" start=${pickN ?? 1}>
        ${order.map(
          (t) => html`<li ?data-user=${user === t}>${teamLink(t)}</li>`
        )}
      </ol>
    </article>
  `;
}

export default function define() {
  if (!customElements.get("sff-draft")) {
    customElements.define("sff-draft", Draft);
  }
}
