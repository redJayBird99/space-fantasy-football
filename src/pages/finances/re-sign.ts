import { render, html, TemplateResult, nothing } from "lit-html";
import { MacroSkill, MACRO_SKILLS, Player } from "../../character/player";
import style from "./re-sign.css";
import { SignRequest } from "../../game-state/game-state";
import { skillData } from "../players/player-page";
import { goLink } from "../util/go-link";
import { resignPlayer } from "../../character/user";

/** show infos about expiring contracts of the user team and re-signing tools,
 * ( the user can go over the salary cap )
 */
class ReSign extends HTMLElement {
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

  gameStateUpdated() {
    this.render();
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        ${expiringPlayers()}
      `,
      this.shadowRoot!
    );
  }
}

/** table the players re-signing request */
function expiringPlayers(): TemplateResult {
  const gs = window.$game.state!;
  const sks = Object.keys(MACRO_SKILLS) as MacroSkill[];

  return html`
    <table>
      <caption>
        <h2>📝 Re-sign:</h2>
      </caption>
      <tr>
        <th>name</th>
        <th class="small-col"><abbr title="position">pos</abbr></th>
        <th class="small-col">age</th>
        ${sks.map(
          (s) =>
            html`<th class="small-col">
              <abbr title=${s}>${s.substring(0, 3)}</abbr>
            </th>`
        )}
        <th class="small-col"><abbr title="seasons">sea</abbr></th>
        <th>wage</th>
        <th>sign</th>
      </tr>
      ${gs.reSigning?.map((r) => expiringPlayer(r, sks))}
    </table>
  `;
}

/** show infos about the given request and the player, and the resign button
 * ( the user can go over the salary cap ) */
function expiringPlayer(r: SignRequest, sks: MacroSkill[]): TemplateResult {
  const gs = window.$game.state!;
  const p = gs.players[r.plId];
  const frt = new Intl.NumberFormat("en-GB");
  const canSign = r.wage !== 0 && r.seasons !== 0;
  const playerPath = `${window.$PUBLIC_PATH}players/player?id=${p.id}`;

  return html`
    <tr>
      <td>${goLink(playerPath, p.name)}</td>
      <td class="small-col"><span class="plr-pos">${p.position}</span></td>
      <td class="small-col">${Player.age(p, gs.date)}</td>
      ${sks.map((sk) =>
        playersSkillScore(Math.round(Player.getMacroSkill(p, sk)))
      )}
      <td class="small-col">${canSign ? r.seasons : "-"}</td>
      <td>${canSign ? `${frt.format(r.wage)}₡` : "-"}</td>
      <td>
        <button
          class="btn-sml btn--acc sign-btn"
          ?disabled=${!canSign}
          @click=${canSign ? () => resignPlayer(r) : nothing}
        >
          sign
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
