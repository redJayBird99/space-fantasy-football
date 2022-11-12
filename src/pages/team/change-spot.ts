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

/**
 * render th ui to change the staring player, has two arguments:
 * - attribute data-pl-id: the id of the player adding (or moving) to the lineup spot
 * - property onDone: called when the change was made or the close btn was clicked
 */
class ChangeSpot extends HTMLElement {
  onDone?: () => unknown;

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
    this.onDone?.(); // we can close before updating

    if (plId && gs.players[plId]) {
      const oldSpot = gs.teams[gs.userTeam].formation?.lineup.find(
        (n) => n.plID === plId
      );

      if (oldSpot?.plID) {
        oldSpot.plID = n.plID; // swap the stating positions
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
        <sff-modal .closeHandler=${this.onDone}>
          <h2 slot="title">
            Positioning <span class="sub-name">${sub?.name}</span>
            <span class="sub-pos">${sub?.position}</span>
          </h2>
          ${spotSelector(this.onSpotClick)}
        </sff-modal>
      `,
      this.shadowRoot!
    );
  }
}

/**
 * render all the available spot options where to insert the staring player
 * @param onSpotClick an handler for when a spot is selected
 */
function spotSelector(onSpotClick: (s: LineupSpot) => void): TemplateResult {
  const gs = window.$game.state!;
  const line = gs.teams[gs.userTeam].formation?.lineup;

  if (line) {
    return html`
      <div class="pitch">
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
              <span class="plr-name">${p ? p.name : ""}</span>
              <span class="spot-name">${n.sp.pos}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  return html`<div class="pitch"></div>`;
}

export default function define() {
  if (!customElements.get("change-spot")) {
    customElements.define("change-spot", ChangeSpot);
  }
}
