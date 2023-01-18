import {
  render,
  html,
  TemplateResult,
  svg,
  SVGTemplateResult,
  nothing,
} from "lit-html";
import { styleMap } from "lit-html/directives/style-map.js";
import {
  getOutOfPositionPenalty,
  MacroSkill,
  MACRO_SKILLS,
  Player,
  GameState,
  util,
  Formations,
  FORMATIONS,
  getX,
  getY,
  Spot,
  Starter,
  completeLineup,
  findSetPiecesTakers,
  getFormation,
  Team,
  user,
} from "../../game/game";
import style from "./team-page.css";
import { skillData } from "../players/player-page";
import defineChangeSpot from "./change-spot";
import { HTMLSFFGameElement } from "../common/html-game-element";
import { setAutoOptions } from "../../app-state/app-state";
import { goLink } from "../util/go-link";
import { breakCamelCase } from "../../util/util";
import { createRef, ref, Ref } from "lit-html/directives/ref.js";
import plrImg from "../../asset/player.svg";
import phyImg from "../../asset/pharmacy.png";
import pitchSvg from "../../asset/half-pitch3.svg";
import settings from "../../asset/settings.svg";

defineChangeSpot();

export const PITCH_WIDTH = 74;
export const PITCH_HEIGHT = 52; // half pitch
const PITCH_PAD = 2;
const ENTIRE_PITCH_WIDTH = PITCH_WIDTH + PITCH_PAD * 2;
const ENTIRE_PITCH_HEIGHT = PITCH_HEIGHT + PITCH_PAD * 2;
const PLR_SIZE = 9;

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
): TemplateResult | typeof nothing {
  const gs = window.$game.state!;
  const pls = GameState.getTeamPlayers(gs, t.name);

  // lazily filling empty spots (sometimes when not needed the formation is incomplete)
  if (
    !completeLineup(gs, t) &&
    (gs.userTeam !== t.name || window.$appState.userSettings.autoFormation)
  ) {
    // the update will rerender with the new formation
    user.updateFormation(gs, t);
    return nothing;
  }

  // on every fresh new game the user team doesn't have any set pieces setted,
  // in this case set a initial configuration
  if (!t.setPieces && t.name === gs.userTeam) {
    t.setPieces = findSetPiecesTakers(gs, t.formation?.lineup ?? []);
  }

  const starters = getFormation({ gs, t })?.lineup ?? [];

  return html`
    <section slot="in-main" class="team-main">
      <div class="cnt-team-info">
        <div>${pitch(starters)}</div>
        <div>
          <article class="cnt-tactics">
            <header class="tactics-head">
              <h3>Tactics</h3>
              <div class="self-start">
                ${t.name === gs.userTeam ? customizeTactics() : nothing}
              </div>
            </header>
            ${tactics(t)}
          </article>
        </div>
      </div>
      ${teamPlayersTable(pls, starters, openUpdateLineup)}
    </section>
  `;
}

/** show info about set pieces, formation and etc */
function tactics(t: Team): TemplateResult {
  const gs = window.$game.state!;
  const isUser = gs.userTeam === t.name;
  const setPieces = Object.entries(
    t.setPieces ?? findSetPiecesTakers(gs, t.formation?.lineup ?? [])
  );

  return html`
    <menu class="tactics">
      ${isUser ? html`<li>${autoUpdateFormation()}</li>` : nothing}
      <li>Formation: ${t.formation?.name ?? ""}</li>
      <li>
        Captain:
        <i>${gs.players[t.captain ?? ""]?.name}</i>
      </li>
      ${setPieces.map(
        (s) =>
          html`<li>
            ${breakCamelCase(s[0])}:
            <i>${gs.players[s[1] ?? ""]?.name ?? ""}</i>
          </li>`
      )}
    </menu>
  `;
}

/** the user dialog to customize the user tactics */
function customizeTactics(): TemplateResult {
  const fms = Object.keys(FORMATIONS) as Formations[];
  const gs = window.$game.state!;
  const team = gs.teams[gs.userTeam];
  const refDig: Ref<HTMLDialogElement> = createRef();
  const openDig = () => refDig.value!.show();
  const closeDig = () => refDig.value!.close();
  // the only candidates are the staring players for set pieces
  const squad =
    team.formation?.lineup
      .filter((s) => Boolean(s.plID))
      .map((s) => gs.players[s.plID!]) ?? [];

  // update the user tactics with the new setting, or preserve the old ones when no change was made
  const onSummit = (e: Event) => {
    const form = e.currentTarget as HTMLFormElement;

    team.captain = form.captain.value || team.captain;
    team.setPieces = {
      penalties: form.penalties.value || team.setPieces?.penalties,
      shortFreeKicks:
        form["short-kick"].value || team.setPieces?.shortFreeKicks,
      longFreeKicks: form["long-kick"].value || team.setPieces?.longFreeKicks,
      corners: form.corners.value || team.setPieces?.corners,
      throwIns: form["throw-ins"].value || team.setPieces?.throwIns,
    };

    if (fms.includes(form.formations.value)) {
      user.changeFormation(form.formations.value as Formations);
    } else {
      window.$game.state = gs; // mutation notification
    }
  };

  return html`
    <button
      class="btn-txt leading-4 rounded-full"
      @click=${openDig}
      aria-label="open customize tactics"
    >
      <img class="w-4" src=${settings} alt="gear" />
    </button>
    <dialog ${ref(refDig)} aria-labelledby="dig-tactics-title" class="tct-dig">
      <div class="dig-head">
        <h3 class="dig-title" id="dig-tactics-title">Customize Tactics</h3>
        <button
          autofocus
          class="btn-close"
          @click=${closeDig}
          aria-label="close"
        ></button>
      </div>
      <form
        @submit=${onSummit}
        method="dialog"
        class="grid .grid-cols-1 sm-grid-cols-2 gap-4 w-max"
      >
        ${formationSelector(fms)}
        ${selectTactic(squad, "Choose captain", "captain")}
        ${selectTactic(squad, "Choose penalties taker", "penalties")}
        ${selectTactic(squad, "Choose corners taker", "corners")}
        ${selectTactic(squad, "Choose long free kick taker", "long-kick")}
        ${selectTactic(squad, "Choose short free kick taker", "short-kick")}
        ${selectTactic(squad, "Choose throw-ins taker", "throw-ins")}

        <button class="btn btn-rounded">Apply Tactics</button>
      </form>
    </dialog>
  `;
}

/** select element for a customizable team tactic */
function selectTactic(
  squad: Player[],
  label: string,
  name: string
): TemplateResult {
  const id = `slc-${name}`;
  return html`
    <label class="hide" for=${id}>${label}</label>
    <select id=${id} class="form-select" aria-label=${label} name=${name}>
      <option value="">${label}</option>
      ${squad.map((p) => html`<option value=${p.id}>${p.name}</option>`)}
    </select>
  `;
}

function teamPlayersTable(
  pls: Player[],
  sts: Starter[],
  openUpdateLineup?: (id: string) => void
): TemplateResult {
  util.sortByPosition(pls, true);
  const mSkills = Object.keys(MACRO_SKILLS) as MacroSkill[];
  const starter = (p: Player) => sts.find((s) => s.pl?.id === p.id);

  return html`
    <div class="cnt-table">
      <table>
        ${teamPlayersTableHead(mSkills)}
        ${pls.map((p) =>
          teamPlayerRow(p, mSkills, openUpdateLineup, starter(p))
        )}
      </table>
    </div>
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
      <th class="plr-n"><abbr title="squad number">n.</abbr></th>
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

/**
 * the table row for the give player
 * @param openUpdateLineup the handler for the click button to substitute a player
 * if the player is injured it doesn't apply
 * @param st indicate if the player is a starter or not
 */
function teamPlayerRow(
  p: Player,
  skl: MacroSkill[],
  openUpdateLineup?: (id: string) => void,
  st?: Starter
): TemplateResult {
  const gs = window.$game.state!;
  const at = st?.sp.pos;
  const canSub = !gs.injuries[p.id] && openUpdateLineup;

  return html`<tr class="plr ${st ? "starting" : ""}">
    <td class="plr-pos"><span>${p.position}</span></td>
    <td class="plr-pos plr-at" style=${starterAtBgColor(st)}>
      <button
        ?disabled=${!canSub}
        @click=${canSub ? () => openUpdateLineup(p.id) : nothing}
        class="btn-at btn-txt"
        aria-label="change starting position"
      >
        ${at}${gs.injuries[p.id]
          ? html`<img src=${phyImg} alt="player injured" class="injury" />`
          : nothing}
      </button>
    </td>
    <td class="plr-n"><span class="sqd-number">${p.number}</span></td>
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
      <div class="tag-info">
        <span class="tag-pos">${s.sp.pos}</span>
        <span class="tag-pos" style=${starterAtBgColor(s)}
          >${s.pl?.position}</span
        >
        <span class="sqd-number">${s.pl?.number ?? ""}</span>
      </div>
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
      <image
        href=${pitchSvg}
        x="0"
        y="0"
        width=${ENTIRE_PITCH_WIDTH}
        height=${ENTIRE_PITCH_HEIGHT}
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
  const x = getStarterX(s) - PLR_SIZE / 2;
  const y = getStarterY(s) - PLR_SIZE / 2;
  return svg`
    <image href=${plrImg} x=${x} y=${y} height=${PLR_SIZE} width=${PLR_SIZE}/>
  `;
}

/** formation selector to change the user formation */
function formationSelector(options: string[]): TemplateResult {
  return html`
    <label for="forms-slc" class="hide">Choose formation</label>
    <select id="forms-slc" class="form-select" name="formations">
      <option value="">Choose formation</option>
      ${options.map((f) => html`<option value=${f}>${f}</option>`)}
    </select>
  `;
}

/** handle the automatization option for updating the user formation before a match usually */
function autoUpdateFormation(): TemplateResult {
  const gs = window.$game.state!;

  const onChange = (e: Event) => {
    if ((e.target as HTMLInputElement).checked) {
      user.updateFormation(gs, gs.teams[gs.userTeam]);
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
