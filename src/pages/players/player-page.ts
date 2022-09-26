import { render, html, TemplateResult } from "lit-html";
import { GameState } from "../../game-state/game-state";
import {
  Player,
  MACRO_SKILLS,
  MacroSkill,
  MAX_SKILL,
} from "../../character/player";
import { getImprovability } from "../../character/user";
import style from "./player-page.css";
import pImg from "../../asset/player.svg";

class PlayerPage extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sff-game-page>
          <player-info slot="in-main"></player-info>
        </sff-game-page>
      `,
      this
    );
  }
}

/** get the searched player from the gameState */
function getSearchParamPlayer(gs: Readonly<GameState>): Player | undefined {
  const id = new URLSearchParams(location.search).get("id");
  return gs.players[id ?? ""];
}

class PlayerInfo extends HTMLElement {
  private gs = window.$game.state;
  private player?: Player;

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.player = getSearchParamPlayer(this.gs!);
      this.render();
    }
  }

  disconnectedCallback(): void {
    window.$game.removeObserver(this);
  }

  gameStateUpdated(gs?: Readonly<GameState>): void {
    this.gs = gs;
    this.render();
  }

  render(): void {
    render(
      html`
        <section class="plr-info">
          <img class="plr-img" src=${pImg} alt="a football player" />
          ${this.player && this.gs && playerBio(this.player, this.gs)}
          ${this.player && this.gs && playerTeam(this.player, this.gs)}
        </section>
        <div class="plr-skills">
          ${this.player && playersMacroSkills(this.player)}
        </div>
      `,
      this
    );
  }
}

/** biography informations */
function playerBio(p: Player, gs: Readonly<GameState>): TemplateResult {
  // TODO: use half starts for improvability
  return html`
    <div class="plr-bio">
      <span>${p.name}</span>
      <span>${p.birthday} (${Player.age(p, gs.date)} years old)</span>
      <span>${Player.getHeightInCm(p)}cm</span>
      <span>
        <abbr title="position">pos</abbr>
        <span class="plr-pos">${p.position.toUpperCase()}</span>
      </span>
      <span>
        improvability
        <span class="plr-stars">${"🟊".repeat(getImprovability(p, gs))}</span>
      </span>
    </div>
  `;
}

/** contractual informations */
function playerTeam(p: Player, gs: Readonly<GameState>): TemplateResult {
  const c = GameState.getContract(gs, p);
  const wage = new Intl.NumberFormat("en-GB").format(c?.wage ?? 0);
  const seasons = c?.duration;

  return html`
    <div class="plr-team">
      <span>team: ${p.team}</span>
      <span>wage: ${wage}₡</span>
      <span>contract: ${seasons ? `length ${seasons} seasons` : "free"}</span>
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
          (s) => html`<li>${playersSkillScore(Player.getSkill(p, s))} ${s}</li>`
        )}
      </ul>
    </ul>
  `;
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
  customElements.define("player-info", PlayerInfo);
}
