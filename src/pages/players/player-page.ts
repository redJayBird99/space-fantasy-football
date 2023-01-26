import { render, html, TemplateResult, nothing } from "lit-html";
import {
  Player,
  MACRO_SKILLS,
  MacroSkill,
  MAX_SKILL,
  Skill,
  user,
  getAge,
  wageRequest,
  getHeightInCm,
  getMacroSkill,
  getSkill,
  getContract,
} from "../../game/game";
import style from "./player-page.css";
import pImg from "../../asset/player.svg";
import { goLink } from "../util/go-link";
import { HTMLSFFGameElement } from "../common/html-game-element";
import definePlayerHistory from "./player-history";
import { daysBetween } from "../../util/math";
import defineNegotiate from "./negotiate-contract";
definePlayerHistory();
defineNegotiate();

class PlayerPage extends HTMLSFFGameElement {
  connectedCallback() {
    if (this.isConnected) {
      document.title = `Player overview ${
        getSearchParamPlayer()?.name
      } - Space Fantasy Football`;
      super.connectedCallback();
    }
  }

  render(): void {
    const p = getSearchParamPlayer();

    render(
      html`
        <style>
          ${style}
        </style>
        ${p ? playerCtn(p) : nothing}
      `,
      this
    );
  }
}

/** get the searched player from the gameState */
function getSearchParamPlayer(): Player | undefined {
  const id = new URLSearchParams(location.search).get("id");
  return window.$game.state!.players[id ?? ""];
}

/** render the player informations */
function playerCtn(p: Player): TemplateResult {
  return html`
    <section class="plr-info">
      <div class="cnt-plr-img">
        <h3 class="plr-info__name">${p?.name}</h3>
        <img class="plr-img" src=${pImg} alt="a football player" />
      </div>
      ${playerBio(p)}
      <sign-new-player data-plr-id=${p.id}></sign-new-player>
    </section>
    <div class="plr-skills">${p && playersMacroSkills(p)}</div>
    <player-history data-pl-id=${p?.id ?? ""}></player-history>
  `;
}

/** biography informations about the player */
function playerBio(p: Player): TemplateResult {
  const gs = window.$game.state!;
  const t = gs.teams[gs.userTeam];
  const c = getContract(window.$game.state!, p);
  const wage = new Intl.NumberFormat("en-GB").format(c?.wage ?? 0);
  const seasons = c?.duration;
  const bgColor = (c: string) => `background-color: ${c}`;
  const rColor = `hsl(${user.getPlayerRating(p, gs) * 120}deg 100% 60%)`;
  const iColor = `hsl(${
    user.estimateImprovabilityRating(p, t) * 120
  }deg 100% 60%)`;
  const teamLink = gs.teams[p.team] ? `../team?team=${p.team}` : "";
  const injury = gs.injuries[p.id];

  return html`
    <div class="cnt-plr-high">
      <div class="plr-high">
        <div>Position</div>
        <div class="plr-high__val">${p.position.toUpperCase()}</div>
      </div>
      <div class="plr-high">
        <div>Rating</div>
        <div class="plr-high__val-stl" style=${bgColor(rColor)}>
          ${user.getPlayerRatingSymbol(p, gs)}
        </div>
      </div>
      <div class="plr-high">
        <div>
          <abbr title="Improvability">Improv.</abbr>
        </div>
        <div class="plr-high__val-stl" style=${bgColor(iColor)}>
          ${user.improvabilityRatingSymbol(p, t)}
        </div>
      </div>
      <div class="plr-high">
        <div>Team</div>
        <div>${teamLink ? goLink(teamLink, p.team) : p.team}</div>
      </div>
    </div>
    <div class="plr-bio text-sm">
      <div>
        ${getAge(p, gs.date)} y. o. ${new Date(p.birthday).toDateString()}
      </div>
      <div>${getHeightInCm(p)} cm</div>
      <div>Preferred foot ${p.foot}</div>
      <div>wage: ${wage}₡</div>
      <div>contract: ${seasons ? `length ${seasons} seasons` : "free"}</div>
      ${injury
        ? html`<div>
            injured for ${daysBetween(gs.date, new Date(injury.when))} days 🚑
          </div>`
        : nothing}
    </div>
  `;
}

/** the button to start the negotiation with the player, it is enabled only if the player is signable
 *
 * expect the player id as attribute "data-plr-id"
 */
class SignNewPlayer extends HTMLSFFGameElement {
  private negotiating = false;

  closeNegotiation = () => {
    this.negotiating = false;
    this.render();
  };

  openNegotiation = () => {
    this.negotiating = true;
    this.render();
  };

  render() {
    const gs = window.$game.state!;
    const p = gs.players[this.dataset.plrId ?? ""];
    // 3 quarters so there is some margin to start the negotiation
    const sign = user.canSignPlayer(
      gs,
      (3 * wageRequest({ gs, t: gs.teams[gs.userTeam], p })) / 4,
      p
    );
    console.log(sign, p.team);

    render(
      html`
        <div class="cnt-plr-sign">
          <button
            class="btn btn--acc sign-btn"
            ?disabled=${!sign.can}
            @click=${sign.can ? this.openNegotiation : nothing}
            title=${sign.can ? "Negotiate contract" : sign.why}
            aria-label=${sign.can ? "Negotiate contract" : sign.why}
          >
            Negotiate
          </button>
          ${this.negotiating
            ? html`<negotiate-contract
                .props=${{
                  plr: p,
                  onClose: this.closeNegotiation,
                  newSign: true,
                }}
              ></negotiate-contract>`
            : nothing}
        </div>
      `,
      this
    );
  }
}

/** lists all macroSkills with their subSkills values */
function playersMacroSkills(p: Player): TemplateResult[] {
  return Object.keys(MACRO_SKILLS).map((m) =>
    playerMacroSkill(p, m as MacroSkill)
  );
}

/**  macroSkill with all its subSkills values */
function playerMacroSkill(p: Player, m: MacroSkill): TemplateResult {
  return html`
    <ul>
      <li>${playersSkillScore(getMacroSkill(p, m))} ${m}</li>
      <ul>
        ${MACRO_SKILLS[m].map(
          (s) =>
            html`<li>
              ${playersSkillScore(getSkill(p, s))} ${skillString(s)}
            </li>`
        )}
      </ul>
    </ul>
  `;
}

function skillString(s: Skill): string | TemplateResult {
  switch (s) {
    case "defensivePositioning":
      return html`<abbr title="defensive positioning">Def. positioning</abbr>`;
    case "offensivePositioning":
      return html`<abbr title="offensive positioning">Off. positioning</abbr>`;
    default:
      return s;
  }
}

function playersSkillScore(score: number): TemplateResult {
  const d = skillData(score);
  const sl = `background-color: ${d.color}`;
  return html`<span
    class="skill-score w-7 text-center font-bold rounded-md"
    style=${sl}
    >${d.score}</span
  >`;
}

export function skillData(score: number): { color: string; score: string } {
  const s = Math.round(score);
  return {
    color: `hsl(${(score / MAX_SKILL) * 120}deg 100% 60%)`,
    score: s ? String(s).padStart(2, "0") : "",
  };
}

export default function define() {
  if (!customElements.get("sff-player")) {
    customElements.define("sff-player", PlayerPage);
    customElements.define("sign-new-player", SignNewPlayer);
  }
}
