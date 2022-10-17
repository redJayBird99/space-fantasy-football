import { render, html, TemplateResult, nothing } from "lit-html";
import {
  MacroSkill,
  MACRO_SKILLS,
  MAX_SKILL,
  Player,
  SALARY_CAP,
} from "../../character/player";
import { luxuryTax, minSalaryTax, Team } from "../../character/team";
import {
  canTrade,
  estimateImprovabilityRating,
  getPlayerRating,
  getPlayerRatingSymbol,
  improvabilityRatingSymbol,
  makeTrade,
} from "../../character/user";
import { GameState } from "../../game-state/game-state";
import "../common/game-page.ts";
import "../util/router.ts";
import { goLink } from "../util/go-link";
import style from "./trade-page.css";

class TradePage extends HTMLElement {
  private otherTeam?: Team;
  private offerResult?: boolean;

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

  onTradeTeamSelect = (e: Event) => {
    const name = (e.currentTarget as HTMLSelectElement).value;
    this.otherTeam = window.$game.state!.teams[name];
    this.render();
  };

  /** get the checkboxes selected for the given team */
  getSelectedPlayers(team: string, form: HTMLFormElement): Player[] {
    return Array.from<HTMLInputElement>(form[team] ?? [])
      .filter((e) => e.checked)
      .map((e) => window.$game.state!.players[e.value]);
  }

  onTradeOffer = (e: Event) => {
    e.preventDefault();
    const gs = window.$game.state!;

    if (this.canMakeOffer()) {
      const form = e.currentTarget as HTMLFormElement;
      const give = this.getSelectedPlayers(gs.userTeam, form);
      const get = this.getSelectedPlayers(this.otherTeam!.name, form);
      this.offerResult = canTrade(this.otherTeam!, get, give);
      this.offerResult && makeTrade(this.otherTeam!, get, give);
    }

    this.render();
  };

  canMakeOffer(): boolean {
    return Boolean(this.otherTeam) && window.$game.state!.flags.openTradeWindow;
  }

  /** the offer response */
  resultMessage(): string {
    if (this.offerResult === undefined) {
      return "";
    } else if (this.offerResult) {
      return "The offer is accepted!";
    }

    return "The offer is rejected!";
  }

  render(): void {
    const gs = window.$game.state!;

    render(
      html`
        <style>
          ${style}
        </style>
        <sff-game-page>
          <div slot="in-main">
            <div>
              The trade window is
              ${gs.flags.openTradeWindow ? "open" : "closed ⚠️"}
            </div>
            ${otherTeamSelector(this.onTradeTeamSelect)}
          </div>
          <form
            slot="in-main"
            @submit=${this.canMakeOffer() ? this.onTradeOffer : nothing}
          >
            <button ?disabled=${!this.canMakeOffer()}>Make offer</button>
            <output> result: ${this.resultMessage()} </output>
            <section class="cnt-traders">
              ${team(gs.teams[gs.userTeam])}
              ${this.otherTeam ? team(this.otherTeam) : nothing}
            </section>
          </form>
        </sff-game-page>
      `,
      this
    );
  }
}

/** selector for the trade partner, onSelect is an handle or the change event */
function otherTeamSelector(onSelect: (e: Event) => void): TemplateResult {
  const gs = window.$game.state!;
  return html`
    <label>
      select team to trade with
      <select @change="${onSelect}">
        ${Object.keys(gs.teams)
          .filter((n) => n !== gs.userTeam)
          .map((n) => html`<option>${n}</option>`)}
      </select>
    </label>
  `;
}

/** show the trading team roster and some financial info */
function team(t: Team): TemplateResult {
  const gs = window.$game.state!;
  return html`
    <section>
      <h2>${t.name}</h2>
      ${finance(t)}
      <ul class="roster">
        ${t.playerIds.map((id) => player(gs.players[id], t.name))}
      </ul>
    </section>
  `;
}

/** render some financial informations about the team roster */
function finance(t: Team): TemplateResult {
  const gs = window.$game.state!;
  const wages = Team.getWagesAmount({ gs, t });

  return html`
    <div class="fin-infos">
      ${financeInfo("Roster wages", wages)}
      ${financeInfo("Cap Space", SALARY_CAP - wages)}
      ${financeInfo("Luxury tax", luxuryTax(wages))}
      ${financeInfo("Min cap tax", minSalaryTax(wages))}
    </div>
  `;
}

function financeInfo(name: string, value: number): TemplateResult {
  return html`
    <div class="fin-info">
      <div>${name}</div>
      <div>${new Intl.NumberFormat("en-GB").format(value)}₡</div>
    </div>
  `;
}

/** render informations about the given player */
function player(p: Player, team: string): TemplateResult {
  return html`
    <li class="plr-entry">
      <div>${playerInfo(p)} ${playerSkills(p)}</div>
      <div class="cnt-checkbox">
        <input
          type="checkbox"
          name=${team}
          value=${p.id}
          aria-label="add to trade"
        />
      </div>
    </li>
  `;
}

/** render bio and some financial info about the give player */
function playerInfo(p: Player): TemplateResult {
  const gs = window.$game.state!;
  const c = GameState.getContract(gs, p);
  const link = `${window.$PUBLIC_PATH}players/player?id=${p.id}`;
  const wage = c?.wage ? new Intl.NumberFormat("en-GB").format(c?.wage) : 0;

  return html`
    <div class="plr-info">
      <div class="plr-bio">
        <h3>${goLink(link, p.name)}</h3>
        <div>
          <span class="plr-pos">${p.position}</span>
          <span>
            ${Player.age(p, gs.date)} <abbr title="years old">y.o.</abbr>
          </span>
        </div>
      </div>
      <div>
        wage <span class="plr-wage">${wage}₡</span> for ${c?.duration || 0}
        seasons
      </div>
    </div>
  `;
}

/** render information about the player quality according to the user team */
function playerSkills(p: Player): TemplateResult {
  const mSkills = Object.keys(MACRO_SKILLS) as MacroSkill[];
  const gs = window.$game.state!;
  const user = gs.teams[gs.userTeam];

  return html`
    <div class="plr-skills">
      ${playerSkill(
        "rating",
        getPlayerRatingSymbol(p, gs),
        getPlayerRating(p, gs)
      )}
      ${playerSkill(
        "improvability",
        improvabilityRatingSymbol(p, user),
        estimateImprovabilityRating(p, user)
      )}
      ${mSkills.map((s) => {
        const rating = Math.round(Player.getMacroSkill(p, s));
        return playerSkill(s, rating.toString(), rating / MAX_SKILL);
      })}
    </div>
  `;
}

/**
 * render the given key value pair
 * @param rating a value between 0 (bad) and 1 (good)
 */
function playerSkill(key: string, val: string, rating: number): TemplateResult {
  const color = `border-color: ${`hsl(${rating * 120}deg 100% 60%)`};`;
  return html`<div class="plr-skill" style=${color}>
    <abbr title=${key}>${key.substring(0, 3)}.</abbr>
    <span>${val}</span>
  </div>`;
}

if (!customElements.get("sff-trade-page")) {
  customElements.define("sff-trade-page", TradePage);
}
