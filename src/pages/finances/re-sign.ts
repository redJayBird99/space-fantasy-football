import { render, html, TemplateResult, nothing } from "lit-html";
import { macroSkills, Player } from "../../character/player";
import style from "./re-sign.css";
import { SignRequest } from "../../game-state/game-state";
import { skillData } from "../players/player-page";
import { goLink } from "../util/go-link";
import { HTMLSFFGameElement } from "../common/html-game-element";

type Negotiate = (pl: SignRequest) => unknown;

/** show infos about expiring contracts of the user team and re-signing tools,
 * ( the user can go over the salary cap )
 */
class ReSign extends HTMLSFFGameElement {
  // where it exist open the negotiation with this request
  r?: SignRequest;

  closeNegotiation = () => {
    this.r = undefined;
    this.render();
  };

  openNegotiation = (pl: SignRequest) => {
    this.r = pl;
    this.render();
  };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        ${expiringPlayers(this.openNegotiation)}
        ${this.r
          ? html`<negotiate-contract
              .props=${{
                plr: window.$game.state!.players[this.r.plId],
                onClose: this.closeNegotiation,
                req: this.r,
              }}
            ></negotiate-contract>`
          : nothing}
      `,
      this.shadowRoot!
    );
  }
}

/** table the players re-signing request */
function expiringPlayers(open: Negotiate): TemplateResult {
  const gs = window.$game.state!;

  return html`
    <table>
      <caption>
        <h2>📝 Re-sign:</h2>
      </caption>
      <tr>
        <th>name</th>
        <th class="small-col"><abbr title="position">pos</abbr></th>
        <th class="small-col">age</th>
        ${macroSkills.map(
          (s) =>
            html`<th class="small-col">
              <abbr title=${s}>${s.substring(0, 3)}</abbr>
            </th>`
        )}
        <th>sign</th>
      </tr>
      ${gs.reSigning?.map((r) => expiringPlayer(r, open))}
    </table>
  `;
}

/** show infos about the given request and the player, and the resign button
 * ( the user can go over the salary cap ) */
function expiringPlayer(r: SignRequest, open: Negotiate): TemplateResult {
  const gs = window.$game.state!;
  const p = gs.players[r.plId];

  return html`
    <tr>
      <td>${goLink(`players/player?id=${p.id}`, p.name)}</td>
      <td class="small-col"><span class="plr-pos">${p.position}</span></td>
      <td class="small-col">${Player.age(p, gs.date)}</td>
      ${macroSkills.map((sk) =>
        playersSkillScore(Math.round(Player.getMacroSkill(p, sk)))
      )}
      <td>
        <button
          class="btn-sml btn--acc sign-btn"
          ?disabled=${!r.willing}
          @click=${r.willing ? () => open(r) : nothing}
        >
          Negotiate
        </button>
      </td>
    </tr>
  `;
}

function playersSkillScore(score: number): TemplateResult {
  const sl = `border-color: ${skillData(score).color}`;
  return html`<td class="small-col">
    <span class="skill-score" style=${sl}>${score}</span>
  </td>`;
}

export default function define() {
  if (!customElements.get("re-sign")) {
    customElements.define("re-sign", ReSign);
  }
}
