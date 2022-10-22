import { render, html, TemplateResult } from "lit-html";
import {
  PITCH_WIDTH,
  PITCH_HEIGHT,
  getStarterX,
  getStarterY,
} from "./team-page";
import { LineupSpot } from "../../character/team";
import { GameState } from "../../game-state/game-state";
import { styleMap } from "lit-html/directives/style-map.js";
import style from "./change-spot.css";
import { Player } from "../../character/player";

/**
 * render th ui to change the staring player, has two arguments:
 * - attribute data-pl-id: the id of the player adding (or moving) to the lineup spot
 * - property onUpdateSpot: called when the change was made
 */
class ChangeSpot extends HTMLElement {
  onUpdateSpot?: () => unknown;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  /** when the user click the spot where to insert the player,
   * update (mutate) the given spot with the current player id attribute */
  onSpotClick = (n: LineupSpot) => {
    const gs = window.$game.state! as GameState;
    const plId = this.getAttribute("data-pl-id");
    this.onUpdateSpot?.(); // we can close before updating

    if (plId && gs.players[plId]) {
      const old = gs.teams[gs.userTeam].formation?.lineup.find(
        (n) => n.plID === plId
      );

      if (old?.plID) {
        old.plID = undefined; // remove him from the old stating position
      }

      n.plID = plId;
      window.$game.state = gs; // mutation notification
    }
  };

  render(): void {
    const sub =
      window.$game.state!.players[this.getAttribute("data-pl-id") ?? ""];
    render(
      html`
        <style>
          ${style}
        </style>
        ${spotSelector(this.onSpotClick, sub)}
      `,
      this.shadowRoot!
    );
  }
}

/**
 * render all the available spot options where to insert the staring player
 * @param onSpotClick an handler for when a spot is selected
 */
function spotSelector(
  onSpotClick: (s: LineupSpot) => void,
  sub?: Player
): TemplateResult {
  const gs = window.$game.state!;
  const line = gs.teams[gs.userTeam].formation?.lineup;

  if (line) {
    return html`
      <div class="pitch">
        <div class="sub">
          substitute with
          <div>
            <span class="sub-name">${sub?.name}</span>
            <span class="sub-pos">${sub?.position}</span>
          </div>
        </div>
        ${line.map((n) => {
          const p = gs.players[n.plID ?? ""];
          const style = {
            left: `${(getStarterX(n.sp, true) / PITCH_WIDTH) * 100}%`,
            top: `${(getStarterY(n.sp, true) / PITCH_HEIGHT) * 100}%`,
          };

          return html`
            <button
              style=${styleMap(style)}
              class="spot"
              @click=${() => onSpotClick(n)}
              aria-label="add to ${n.sp.pos}"
            >
              <span class="plr-name">${p ? p.name : "Empty"}</span>
              <span class="spot-name">${n.sp.pos}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  return html`<div class="pitch"></div>`;
}

if (!customElements.get("change-spot")) {
  customElements.define("change-spot", ChangeSpot);
}
