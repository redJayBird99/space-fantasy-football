import { render, html, TemplateResult } from "lit-html";
import { GameState } from "../../game-state/game-state";
import * as db from "../../game-state/game-db";
import {
  Player,
  macroskills,
  Macroskill,
  MAX_SKILL,
} from "../../character/player";
import { getImprovability } from "../../character/user";
import "../common/game-header.ts";
import "../common/game-nav.ts";
import style from "./player.css";

class PlayerPage extends HTMLElement {
  private gs: GameState = window.$GAME.state!;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$GAME.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback(): void {
    window.$GAME.removeObserver(this);
  }

  gameStateUpdated(): void {
    this.gs = window.$GAME.state!;
    this.render();
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sff-layout>
          <sff-game-header slot="in-header" .gs=${this.gs}></sff-game-header>
          <sff-game-nav slot="in-nav"></sff-game-nav>
          <div slot="in-main">
            <menu-bar data-game-name=${db.getGameName(this.gs)}></menu-bar>
            <player-info .gs=${this.gs}></player-info>
          </div>
          <div slot="in-aside"><h2>TODO: aside</h2></div>
          <div slot="in-footer"><h2>TODO: footer</h2></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

/** get the searched player from the gameState */
function getSearchParamPlayer(gs: GameState): Player | undefined {
  const id = new URLSearchParams(location.search).get("id");
  return gs.players[id ?? ""];
}

class PlayerInfo extends HTMLElement {
  private gs?: GameState;
  private player?: Player;

  connectedCallback() {
    if (this.isConnected) {
      this.player = getSearchParamPlayer(this.gs!);
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <section class="plr-info">
          <div class="plr-photo">TODO: add photo</div>
          ${this.player && this.gs && playerBio(this.player, this.gs)}
          ${this.player && this.gs && playerTeam(this.player, this.gs)}
        </section>
        <div class="plr-skills">
          ${this.player && playersMacroskills(this.player)}
        </div>
      `,
      this
    );
  }
}

/** biography informations */
function playerBio(p: Player, gs: GameState): TemplateResult {
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
function playerTeam(p: Player, gs: GameState): TemplateResult {
  const c = GameState.getContract(gs, p);
  const wage = new Intl.NumberFormat("en-GB").format(c?.wage ?? 0);
  const seasons = c?.duration;

  return html`
    <div class="plr-team">
      <span>team ${p.team}</span>
      <span>wage ${wage}₡</span>
      <span>contract ${seasons ? `length ${seasons} seasons` : "free"}</span>
    </div>
  `;
}

/** lists all macroskills with their subskills values */
function playersMacroskills(p: Player): TemplateResult[] {
  return Object.keys(macroskills).map((m) =>
    playerMacroskill(p, m as Macroskill)
  );
}

/**  macroskill with all its subskills values */
function playerMacroskill(p: Player, m: Macroskill): TemplateResult {
  return html`
    <ul>
      <li>${playersSkillScore(Player.getMacroskill(p, m))} ${m}</li>
      <ul>
        ${macroskills[m].map(
          (s) => html`<li>${playersSkillScore(Player.getSkill(p, s))} ${s}</li>`
        )}
      </ul>
    </ul>
  `;
}

function playersSkillScore(score: number): TemplateResult {
  score = Math.round(score);
  const s = `background-color: hsl(${(score / MAX_SKILL) * 120}deg 100% 60%)`;
  const v = score ? String(score).padStart(2, " ") : "";
  return html`<pre class="skill-score" style=${s}>${v}</pre>`;
}

if (!customElements.get("sff-player")) {
  customElements.define("sff-player", PlayerPage);
  customElements.define("player-info", PlayerInfo);
}
