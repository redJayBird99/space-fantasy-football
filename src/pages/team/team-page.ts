import {
  render,
  html,
  TemplateResult,
  svg,
  SVGTemplateResult,
  nothing,
} from "lit-html";
import { styleMap } from "lit-html/directives/style-map.js";
import { GameState } from "../../game-state/game-state";
import {
  getOutOfPositionPenalty,
  MacroSkill,
  MACRO_SKILLS,
  Player,
} from "../../character/player";
import style from "./team-page.css";
import { skillData } from "../players/player-page";
import { sortByPosition } from "../../character/util";
import {
  Formations,
  FORMATIONS,
  getX,
  getY,
  Spot,
  Starter,
} from "../../character/formation";
import pImg from "../../asset/player.svg";
import {
  fillLineupMissingSpot,
  getFormation,
  Team,
} from "../../character/team";
import defineChangeSpot from "./change-spot";
import { changeFormation, updateUserFormation } from "../../character/user";
import { HTMLSFFGameElement } from "../common/html-game-element";
import { setAutoOptions } from "../../app-state/app-state";
import { goLink } from "../util/go-link";
import { onLinkClick } from "../util/router";
defineChangeSpot();

export const PITCH_WIDTH = 66;
export const PITCH_HEIGHT = 52; // half pitch
const PITCH_PAD = 3;
const ENTIRE_PITCH_WIDTH = PITCH_WIDTH + PITCH_PAD * 2;
const ENTIRE_PITCH_HEIGHT = PITCH_HEIGHT + PITCH_PAD * 2;
const P_IMG_SIZE = 8;

/** get the searched team from the gameState */
function getSearchParamTeam(): Team | undefined {
  const name = new URLSearchParams(location.search).get("team");
  return name ? window.$game.state!.teams[name] : undefined;
}

class TeamPage extends HTMLSFFGameElement {
  /** control the ui to change a starting player only for the user team */
  updateLineup: { open: boolean; plId?: string } = { open: false };
  /** if it doesn't exist default to the user */
  team =
    getSearchParamTeam() ??
    window.$game.state!.teams[window.$game.state!.userTeam];

  connectedCallback() {
    if (this.isConnected) {
      document.title = `${window.$game.state?.userTeam} club team overview - Space Fantasy Football`;
      super.connectedCallback();
    }
  }

  disconnectedCallback() {
    render(nothing, window.$modalRoot);
    super.disconnectedCallback();
  }

  closeUpdateLineup = () => {
    this.updateLineup = { open: false };
    this.render();
  };

  openUpdateLineup = (plId: string) => {
    this.updateLineup = { open: true, plId };
    this.render();
  };

  /** show the ui to change a staring player */
  renderUpdateLineup(): TemplateResult {
    return html`
      <change-spot
        data-pl-id=${this.updateLineup.plId!}
        .onDone=${this.closeUpdateLineup}
      >
      </change-spot>
    `;
  }

  render(): void {
    const isUser = window.$game.state!.userTeam === this.team.name;

    render(
      html`
        <style>
          ${style}
        </style>
        ${teamMain(this.team, isUser ? this.openUpdateLineup : undefined)}
      `,
      this
    );
    render(
      this.updateLineup.open && isUser ? this.renderUpdateLineup() : nothing,
      window.$modalRoot
    );
  }
}

/**
 * render information about the given team, if the team is the user team add
 * some controls for customization
 * @param openUpdateLineup open the change starters menu, only for the user
 */
function teamMain(
  t: Team,
  openUpdateLineup?: (id: string) => void
): TemplateResult {
  const gs = window.$game.state!;
  const pls = GameState.getTeamPlayers(gs, t.name);

  // lazily filling empty spots (sometimes when not needed the formation is incomplete)
  if (gs.userTeam !== t.name || window.$appState.userSettings.autoFormation) {
    fillLineupMissingSpot({ gs, t });
  }

  const starters = getFormation({ gs, t })?.lineup ?? [];

  return html`
    <section slot="in-main" class="team-main">
      <div>${pitch(starters)}</div>
      <div class="cnt-controls">
        <a
          aria-label="manual about finances"
          @click=${onLinkClick}
          href="game-manual#players"
          class="info-link"
          >🛈</a
        >
        <h3>formation: ${t.formation?.name}</h3>
        ${gs.userTeam === t.name ? userControls() : nothing}
      </div>
      ${teamPlayersTable(pls, starters, openUpdateLineup)}
    </section>
  `;
}

/** control options to customize the formation */
function userControls(): TemplateResult | void {
  return html`
    <menu class="controls">
      <li>${autoUpdateFormation()}</li>
      <li>${formationSelector()}</li>
    </menu>
  `;
}

function teamPlayersTable(
  pls: Player[],
  sts: Starter[],
  openUpdateLineup?: (id: string) => void
): TemplateResult {
  sortByPosition(pls, true);
  const mSkills = Object.keys(MACRO_SKILLS) as MacroSkill[];
  const starter = (p: Player) => sts.find((s) => s.pl?.id === p.id);

  return html`
    <table>
      ${teamPlayersTableHead(mSkills)}
      ${pls.map((p) => teamPlayerRow(p, mSkills, openUpdateLineup, starter(p)))}
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
  openUpdateLineup?: (id: string) => void,
  st?: Starter
): TemplateResult {
  const at = st?.sp.pos;

  return html`<tr class="plr ${st ? "starting" : ""}">
    <td class="plr-pos"><span>${p.position}</span></td>
    <td class="plr-pos plr-at" style=${starterAtBgColor(st)}>
      <button
        ?disabled=${!openUpdateLineup}
        @click=${openUpdateLineup ? () => openUpdateLineup(p.id) : nothing}
        class="btn-at btn-txt"
        aria-label="change starting position"
      >
        ${at}
      </button>
    </td>
    <td class="plr-name">${goLink(`players/player?id=${p.id}`, p.name)}</td>
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
  switch (s && s.pl ? getOutOfPositionPenalty(s.pl, s.sp.pos) : -1) {
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
    left: `${(getStarterX(s.sp) / ENTIRE_PITCH_WIDTH) * 100}%`,
    top: `${(getStarterY(s.sp) / ENTIRE_PITCH_HEIGHT) * 100}%`,
  };
  return html`
    <div
      style=${styleMap(style)}
      class="starter-tag"
      aria-label="starting player"
    >
      <div class="tag-name"><em>${s.pl?.name}</em></div>
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
      ${sts.map((s) => starter(s.sp))}
    </svg>
  `;
}

export function getStarterX(s: Spot, noPad = false): number {
  const x = getX(s.col, PITCH_WIDTH * 0.9) + PITCH_WIDTH * 0.05;
  return noPad ? x : x + PITCH_PAD;
}

export function getStarterY(s: Spot, noPad = false): number {
  const y = getY(s.row, PITCH_HEIGHT * 0.75) + PITCH_HEIGHT * 0.22;
  return noPad ? y : y + PITCH_PAD;
}

/** the staring players images on the pitch */
function starter(s: Spot): SVGTemplateResult {
  const x = getStarterX(s) - P_IMG_SIZE / 2;
  const y = getStarterY(s) - P_IMG_SIZE / 2;
  return svg`
    <image href=${pImg} x=${x} y=${y} height=${P_IMG_SIZE} width=${P_IMG_SIZE}/>
  `;
}

/** formation selector to change the user formation */
function formationSelector(): TemplateResult {
  const uFrm =
    window.$game.state?.teams[window.$game.state.userTeam].formation?.name;
  const fms = Object.keys(FORMATIONS) as Formations[];
  const onChange = (e: Event) =>
    changeFormation((e.currentTarget as HTMLSelectElement).value as Formations);

  return html`
    <label>
      change formation
      <select class="input-bg" @change=${onChange}>
        ${fms.map((f) => html`<option ?selected=${f === uFrm}>${f}</option>`)}
      </select>
    </label>
  `;
}

/** handle the automatization option for updating the user formation before a match usually */
function autoUpdateFormation(): TemplateResult {
  const onChange = (e: Event) => {
    if ((e.target as HTMLInputElement).checked) {
      updateUserFormation(window.$game.state!);
    }

    setAutoOptions({ autoFormation: (e.target as HTMLInputElement).checked });
  };

  return html`
    <label>
      auto update formation
      <input
        type="checkbox"
        @change=${onChange}
        ?checked=${window.$appState.userSettings.autoFormation}
      />
    </label>
  `;
}

export default function define() {
  if (!customElements.get("sff-team")) {
    customElements.define("sff-team", TeamPage);
  }
}
