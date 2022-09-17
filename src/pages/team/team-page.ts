import { render, html, TemplateResult } from "lit-html";
import { GameState } from "../../game-state/game-state";
import { MacroSkill, MACRO_SKILLS, Player } from "../../character/player";
import "../common/game-page.ts";
import style from "./team-page.css";
import { skillData } from "../players/player";
import { sortByPosition } from "../../character/util";

class TeamPage extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <sff-game-page>
          <style>
            ${style}
          </style>
          ${teamMain(window.$game.state?.userTeam ?? "")}
        </sff-game-page>
      `,
      this
    );
  }
}

function teamMain(team: string): TemplateResult {
  return html`<section slot="in-main" class="team-main">
    <div class="pitch"><h2>TODO: players</h2></div>
    <div class="controls"><h2>TODO: controls</h2></div>
    ${teamPlayersTable(team)}
  </section> `;
}

function teamPlayersTable(team: string): TemplateResult {
  const pls = GameState.getTeamPlayers(window.$game.state!, team);
  sortByPosition(pls, true);
  const mSkills = Object.keys(MACRO_SKILLS) as MacroSkill[];
  return html`<table>
    ${teamPlayersTableHead(mSkills)}
    ${pls.map(
      (p) =>
        html`<tr class="plr">
          <td class="plr-pos">${p.position}</td>
          <td class="plr-name">${p.name}</td>
          ${mSkills.map((sk) =>
            playersSkillScore(sk, Player.getMacroSkill(p, sk))
          )}
        </tr>`
    )}
  </table>`;
}

function teamPlayersTableHead(mSkills: string[]): TemplateResult {
  return html`<tr class="plr-head">
    <th class="plr-head-pos"><abbr title="position">pos</abbr></th>
    <th class="plr-name">name</th>
    ${mSkills.map(
      (sk) =>
        html`<th class="skill-score">
          <abbr title=${sk}>${sk.substring(0, 3)}</abbr>
        </th>`
    )}
  </tr>`;
}

function playersSkillScore(skill: string, score: number): TemplateResult {
  const d = skillData(score);
  return html`<td title=${skill} aria-label=${skill} class="skill-score">
    <span style=${`background-color: ${d.color}`}>${d.score}</span>
  </td>`;
}

if (!customElements.get("sff-team")) {
  customElements.define("sff-team", TeamPage);
}
