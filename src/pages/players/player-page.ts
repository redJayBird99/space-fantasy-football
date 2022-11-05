import { render, html, TemplateResult, nothing } from "lit-html";
import { GameState } from "../../game-state/game-state";
import {
  Player,
  MACRO_SKILLS,
  MacroSkill,
  MAX_SKILL,
  Skill,
} from "../../character/player";
import "./player-history.ts";
import {
  canSignPlayer,
  estimateImprovabilityRating,
  getPlayerRating,
  getPlayerRatingSymbol,
  improvabilityRatingSymbol,
  signPlayer,
} from "../../character/user";
import style from "./player-page.css";
import pImg from "../../asset/player.svg";
import { Team } from "../../character/team";
import { goLink } from "../util/go-link";
import { HTMLSFFGameElement } from "../common/html-game-element";

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
        <sff-game-page>
          <div slot="in-main">${p ? playerCtn(p) : nothing}</div>
        </sff-game-page>
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
      ${playerBio(p)} ${signBtn(p)}
    </section>
    <div class="plr-skills">${p && playersMacroSkills(p)}</div>
    <player-history data-pl-id=${p?.id ?? ""}></player-history>
  `;
}

/** biography informations about the player */
function playerBio(p: Player): TemplateResult {
  const gs = window.$game.state!;
  const t = gs.teams[gs.userTeam];
  const c = GameState.getContract(window.$game.state!, p);
  const wage = new Intl.NumberFormat("en-GB").format(c?.wage ?? 0);
  const seasons = c?.duration;
  const bgColor = (c: string) => `background-color: ${c}`;
  const rColor = `hsl(${getPlayerRating(p, gs) * 120}deg 100% 60%)`;
  const iColor = `hsl(${estimateImprovabilityRating(p, t) * 120}deg 100% 60%)`;
  const teamLink = gs.teams[p.team]
    ? `${window.$PUBLIC_PATH}team?team=${p.team}`
    : "";

  return html`
    <div class="cnt-plr-high">
      <div class="plr-high">
        <div>Position</div>
        <div class="plr-high__val">${p.position.toUpperCase()}</div>
      </div>
      <div class="plr-high">
        <div>Rating</div>
        <div class="plr-high__val-stl" style=${bgColor(rColor)}>
          ${getPlayerRatingSymbol(p, gs)}
        </div>
      </div>
      <div class="plr-high">
        <div>
          <abbr title="Improvability">Improv.</abbr>
        </div>
        <div class="plr-high__val-stl" style=${bgColor(iColor)}>
          ${improvabilityRatingSymbol(p, t)}
        </div>
      </div>
      <div class="plr-high">
        <div>Team</div>
        <div>${teamLink ? goLink(teamLink, p.team) : p.team}</div>
      </div>
    </div>
    <div class="plr-bio">
      <div>${Player.age(p, gs.date)} y. o. ${p.birthday}</div>
      <div>${Player.getHeightInCm(p)} cm</div>
      <div>Preferred foot ${p.foot}</div>
      <div>wage: ${wage}₡</div>
      <div>contract: ${seasons ? `length ${seasons} seasons` : "free"}</div>
    </div>
  `;
}

/** the button to sign the given player, it is enabled only if signable */
function signBtn(p: Player): TemplateResult {
  const gs = window.$game.state!;
  const t = gs.teams[gs.userTeam];
  const uPayroll = Team.getWagesAmount({ gs, t: gs.teams[gs.userTeam] });
  const req = new Intl.NumberFormat("en-GB").format(
    Player.wageRequest({ gs, t, p })
  );
  const sign = canSignPlayer(gs, uPayroll, p);

  return html`
    <div class="cnt-plr-sign">
      <label>
        <button
          class="btn btn--acc sign-btn"
          ?disabled=${!sign.can}
          @click=${sign.can ? () => signPlayer(p) : nothing}
        >
          sign</button
        >${sign.can ? `sign him for ${req}₡` : sign.why}
      </label>
    </div>
  `;
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
      <li>${playersSkillScore(Player.getMacroSkill(p, m))} ${m}</li>
      <ul>
        ${MACRO_SKILLS[m].map(
          (s) =>
            html`<li>
              ${playersSkillScore(Player.getSkill(p, s))} ${skillString(s)}
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
  return html`<span class="skill-score" style=${sl}>${d.score}</span>`;
}

export function skillData(score: number): { color: string; score: string } {
  const s = Math.round(score);
  return {
    color: `hsl(${(score / MAX_SKILL) * 120}deg 100% 60%)`,
    score: s ? String(s).padStart(2, "0") : "",
  };
}

if (!customElements.get("sff-player")) {
  customElements.define("sff-player", PlayerPage);
}
