import { render, html, TemplateResult, svg, SVGTemplateResult } from "lit-html";
import { styleMap } from "lit-html/directives/style-map.js";
import { GameState } from "../../game-state/game-state";
import {
  getOutOfPositionPenalty,
  MacroSkill,
  MACRO_SKILLS,
  Player,
} from "../../character/player";
import "../common/game-page.ts";
import style from "./team-page.css";
import { skillData } from "../players/player-page";
import { sortByPosition } from "../../character/util";
import { getX, getY, Starter } from "../../character/formation";
import pImg from "../../asset/player.svg";
import { getFormation } from "../../character/team";

const PITCH_WIDTH = 66;
const PITCH_HEIGHT = 52; // half pitch
const PITCH_PAD = 3;
const ENTIRE_PITCH_WIDTH = PITCH_WIDTH + PITCH_PAD * 2;
const ENTIRE_PITCH_HEIGHT = PITCH_HEIGHT + PITCH_PAD * 2;
const P_IMG_SIZE = 8;

class TeamPage extends HTMLElement {
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
        <sff-game-page>
          ${teamMain(window.$game.state?.userTeam ?? "")}
        </sff-game-page>
      `,
      this
    );
  }
}

function teamMain(team: string): TemplateResult {
  const st = window.$game.state!;
  const pls = GameState.getTeamPlayers(st, team);
  const starters = getFormation({ gs: st, t: st.teams[team] })?.lineup ?? [];

  return html`
    <section slot="in-main" class="team-main">
      ${pitch(starters)}
      <div class="controls">
        <h2>TODO: controls</h2>
        <p>formation: ${st.teams[team].formation?.name}</p>
      </div>
      ${teamPlayersTable(pls, starters)}
    </section>
  `;
}

function teamPlayersTable(pls: Player[], sts: Starter[]): TemplateResult {
  sortByPosition(pls, true);
  const mSkills = Object.keys(MACRO_SKILLS) as MacroSkill[];
  const starter = (p: Player) => sts.find((s) => s.pl.id === p.id);

  return html`
    <table>
      ${teamPlayersTableHead(mSkills)}
      ${pls.map((p) => teamPlayerRow(p, mSkills, starter(p)))}
    </table>
  `;
}

/** the table head row for the team's players */
function teamPlayersTableHead(mSkills: string[]): TemplateResult {
  return html`
    <tr class="plr-head">
      <th class="plr-pos"><abbr title="position">pos</abbr></th>
      <th class="plr-pos">
        <abbr aria-label="playing at" title="playing at">at</abbr>
      </th>
      <th class="plr-name">name</th>
      ${mSkills.map(
        (sk) =>
          html`<th class="skill-score">
            <abbr title=${sk}>${sk.substring(0, 3)}</abbr>
          </th>`
      )}
    </tr>
  `;
}

/** the table rows of all team's players */
function teamPlayerRow(
  p: Player,
  skl: MacroSkill[],
  st?: Starter
): TemplateResult {
  const at = st?.sp.pos;
  return html`<tr class="plr ${st ? "starting" : ""}">
    <td class="plr-pos">${p.position}</td>
    <td class="plr-pos plr-at" style=${starterAtBgColor(st)}>${at}</td>
    <td class="plr-name">${p.name}</td>
    ${skl.map((s) => playersSkillScore(s, Player.getMacroSkill(p, s)))}
  </tr>`;
}

function playersSkillScore(skill: string, score: number): TemplateResult {
  const d = skillData(score);
  return html`<td class="skill-score">
    <span title=${skill} style=${`border-color: ${d.color}`}> ${d.score} </span>
  </td>`;
}

// TODO the color are temporary
/** return the background-color style according to how much the player is out of position */
function starterAtBgColor(s?: Starter): string {
  switch (s ? getOutOfPositionPenalty(s.pl, s.sp.pos) : -1) {
    case 0.2:
      return "background-color: red";
    case 0.1:
      return "background-color: orange";
    case 0.05:
      return "background-color: yellow";
    case 0:
      return "background-color: green";
    default:
      return "";
  }
}

/** the football pitch with all starting players an tags */
function pitch(sts: Starter[]): TemplateResult {
  return html`
    <div class="cnt-pitch">
      ${pitchDraw(sts)} ${sts.map((s) => starterTag(s))}
    </div>
  `;
}

function starterTag(s: Starter): TemplateResult {
  const style = {
    left: `${(getStarterX(s) / ENTIRE_PITCH_WIDTH) * 100}%`,
    top: `${(getStarterY(s) / ENTIRE_PITCH_HEIGHT) * 100}%`,
  };
  return html`
    <div
      style=${styleMap(style)}
      class="starter-tag"
      aria-label="starting player"
    >
      <div class="tag-name"><em>${s.pl.name}</em></div>
      <div class="tag-info"><span class="tag-pos">${s.sp.pos}</span> TODO</div>
    </div>
  `;
}

/** a svg football pitch with the starting players in it */
function pitchDraw(sts: Starter[]): TemplateResult {
  return html`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${ENTIRE_PITCH_WIDTH} ${ENTIRE_PITCH_HEIGHT}"
    >
      <rect
        class="pitch"
        x="0"
        y="0"
        width=${ENTIRE_PITCH_WIDTH}
        height=${ENTIRE_PITCH_HEIGHT}
      />
      <rect
        class="playing-pitch"
        stroke-width=${PITCH_WIDTH * 0.005}
        x=${PITCH_PAD}
        y=${PITCH_PAD}
        width=${PITCH_WIDTH}
        height=${PITCH_HEIGHT}
      />
      ${sts.map((ss) => starter(ss))}
    </svg>
  `;
}

function getStarterX(s: Starter): number {
  return getX(s.sp.col, PITCH_WIDTH * 0.9) + PITCH_WIDTH * 0.05 + PITCH_PAD;
}

function getStarterY(s: Starter): number {
  return getY(s.sp.row, PITCH_HEIGHT * 0.78) + PITCH_HEIGHT * 0.2 + PITCH_PAD;
}

/** the staring players images on the pitch */
function starter(s: Starter): SVGTemplateResult {
  const x = getStarterX(s) - P_IMG_SIZE / 2;
  const y = getStarterY(s) - P_IMG_SIZE / 2;
  return svg`
    <image href=${pImg} x=${x} y=${y} height=${P_IMG_SIZE} width=${P_IMG_SIZE}/>
  `;
}

if (!customElements.get("sff-team")) {
  customElements.define("sff-team", TeamPage);
}
