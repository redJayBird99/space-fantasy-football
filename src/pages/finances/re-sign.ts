import { render, html, TemplateResult, nothing } from "lit-html";
import {
  approachable,
  getAge,
  getMacroSkill,
  macroSkills,
  Player,
  Team,
} from "../../game/game";
import style from "./re-sign.css";
import { skillData } from "../players/player-page";
import { goLink } from "../util/go-link";
import { HTMLSFFGameElement } from "../common/html-game-element";
import { mainStyleSheet } from "../style-sheets";

type Negotiate = (pl: Player) => unknown;

/** show infos about expiring contracts of the user team and re-signing tools,
 * ( the user can go over the salary cap )
 */
class ReSign extends HTMLSFFGameElement {
  // where it exist open the negotiation with this player
  pl?: Player;

  closeNegotiation = () => {
    this.pl = undefined;
    this.render();
  };

  openNegotiation = (pl: Player) => {
    console.log(pl);
    this.pl = pl;
    this.render();
  };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render(): void {
    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        ${expiringPlayers(this.openNegotiation)}
        ${this.pl
          ? html`<negotiate-contract
              .props=${{
                plr: this.pl,
                onClose: this.closeNegotiation,
                sign: false,
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
  const expiring = Team.getExpiringPlayers({ gs, t: gs.teams[gs.userTeam] });

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
      ${expiring.map((p) => expiringPlayer(p, open))}
    </table>
  `;
}

/** show infos about the given request and the player, and the resign button
 * ( the user can go over the salary cap ) */
function expiringPlayer(p: Player, open: Negotiate): TemplateResult {
  const gs = window.$game.state!;
  const willing = approachable({ gs, t: gs.teams[gs.userTeam], p });
  const call = () => {
    console.log("hhs");
    open(p);
  };

  return html`
    <tr>
      <td>${goLink(`players/player?id=${p.id}`, p.name)}</td>
      <td class="small-col"><span class="plr-pos">${p.position}</span></td>
      <td class="small-col">${getAge(p, gs.date)}</td>
      ${macroSkills.map((sk) =>
        playersSkillScore(Math.round(getMacroSkill(p, sk)))
      )}
      <td>
        <button
          class="btn btn-sml btn--acc sign-btn"
          ?disabled=${!willing}
          @click=${willing ? call : nothing}
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
