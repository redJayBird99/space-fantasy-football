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
import { GameState, TradeRecord } from "../../game-state/game-state";
import "../common/game-page.ts";
import "../util/router.ts";
import { goLink } from "../util/go-link";
import style from "./trade-page.css";
import { repeat } from "lit-html/directives/repeat.js";
import "../util/modal.ts";
import { trade } from "../transactions/transactions";

type hdl = (e: Event) => unknown;

class TradePage extends HTMLElement {
  // only one between offer an other can be defined at any given time
  /* if offer is defined then the user is checking the received offer */
  private offer?: TradeRecord;
  /** if other is defined or offer is undefined the user is checking the trade interface */
  private other?: Team;
  /** true when the offer was accepted */
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

  onCloseResult = () => {
    this.offerResult = undefined;
    this.render();
  };

  /** handle the user response to the received offer, when accept is true make
   * the trade, otherwise reject the trade  */
  onOfferResponse = (accept: boolean) => {
    if (!this.offer) {
      return;
    }

    const o = this.offer;
    this.offer = undefined;
    const gs = window.$game.state! as GameState;
    gs.tradeOffers = gs.tradeOffers.filter((t) => t !== this.offer);
    const other = o.sides[0].team === gs.userTeam ? o.sides[1] : o.sides[0];
    const user = o.sides[0].team === gs.userTeam ? o.sides[0] : o.sides[1];

    // only valid offers are kept in the gs.tradeOffer so no other check is needed
    if (accept) {
      this.offerResult = true;
      makeTrade(
        gs.teams[other.team],
        other.plIds.map((id) => gs.players[id]),
        user.plIds.map((id) => gs.players[id])
      );
    } else {
      this.offerResult = false;
      window.$game.state = gs; // mutation notification, and check other trades
    }
  };

  onOfferSelect = (idx: string) => {
    if (idx && window.$game.state!.tradeOffers[Number(idx)]) {
      this.offer = window.$game.state!.tradeOffers[Number(idx)];
      this.other = undefined;
    } else {
      this.offer = undefined;
    }
  };

  onTeamSelect = (team: string) => {
    if (window.$game.state!.teams[team]) {
      this.other = window.$game.state!.teams[team];
      this.offer = undefined;
    } else {
      this.other = undefined;
    }
  };

  onSelect = (e: Event, handle: (val: string) => void) => {
    handle((e.currentTarget as HTMLSelectElement).value);
    this.render();
  };

  /** get the checkboxes selected for the given team */
  getSelectedPlayers(team: string, form: HTMLFormElement): Player[] {
    return Array.from<HTMLInputElement>(form[team] ?? [])
      .filter((e) => e.checked)
      .map((e) => window.$game.state!.players[e.value]);
  }

  /** handle the user requested trade, if it's acceptable make the trade otherwise reject it  */
  onTradeSummit = (e: Event) => {
    e.preventDefault();
    const gs = window.$game.state!;

    if (Boolean(this.other) && gs.flags.openTradeWindow) {
      const form = e.currentTarget as HTMLFormElement;
      const give = this.getSelectedPlayers(gs.userTeam, form);
      const get = this.getSelectedPlayers(this.other!.name, form);
      this.offerResult = canTrade(this.other!, get, give);

      if (this.offerResult) {
        makeTrade(this.other!, get, give); // the mutation notification will re-render
      } else {
        this.render();
      }
    }
  };

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
    const tradeContent = this.offer
      ? openOffer(this.offer, this.onOfferResponse)
      : openTradeMaker(this.onTradeSummit, this.other);

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
            ${otherTeamSelector(
              (e) => this.onSelect(e, this.onTeamSelect),
              this.other
            )}
            ${offersSelector(
              (e) => this.onSelect(e, this.onOfferSelect),
              this.offer
            )}
          </div>
          ${tradeContent}
        </sff-game-page>
      `,
      this
    );
    render(outputRst(this.onCloseResult, this.offerResult), document.body);
  }
}

/**
 * render a modal with the result of the offer when rst is defined
 *  @param onClose called when close button is called
 */
function outputRst(onClose: () => void, rst?: boolean) {
  const trades = window.$game.state!.transactions.now.trades;
  const txt =
    rst === undefined
      ? null
      : rst
      ? "The offer was accepted!"
      : "The offer was rejected!";

  if (txt) {
    // if the trade was successful it is added as last trade operation
    return html`
      <sff-modal .handleClose=${onClose}>
        <output aria-label="trade result">
          <h3>${txt}</h3>
          ${rst ? trade(trades[trades.length - 1]) : nothing}
        </output>
      </sff-modal>
    `;
  }

  return nothing;
}

/** render the ui to allow the user to make trade offers to other team  */
function openTradeMaker(onSubmit: hdl, other?: Team): TemplateResult {
  const gs = window.$game.state!;
  const canMakeOffer = other && gs.flags.openTradeWindow;

  return html`
    <form slot="in-main" @submit=${canMakeOffer ? onSubmit : nothing}>
      <button id="btn-offer" ?disabled=${!canMakeOffer}>Make offer</button>
      <section class="cnt-traders">
        ${team(gs.teams[gs.userTeam])} ${other ? team(other) : nothing}
      </section>
    </form>
  `;
}

/** render the received offer selected by the user and allow the user to accept or reject it */
function openOffer(
  t: TradeRecord,
  onResponse: (b: boolean) => void
): TemplateResult {
  const gs = window.$game.state!;
  const user = t.sides[0].team === gs?.userTeam ? t.sides[0] : t.sides[1];
  const other = t.sides[0].team === gs?.userTeam ? t.sides[1] : t.sides[0];

  return html`
    <div slot="in-main">
      <button id="btn-accept" @click=${() => onResponse(true)}>accept</button>
      <button id="btn-reject" @click=${() => onResponse(false)}>reject</button>
      <section class="cnt-traders">
        ${team(gs.teams[gs.userTeam], user.plIds)}
        ${team(gs.teams[other.team], other.plIds)}
      </section>
    </div>
  `;
}

/**
 * render a received offer selector,
 * @param onSelect a change event handler
 * @param cur on which trade is currently on
 */
function offersSelector(onSelect: hdl, cur?: TradeRecord): TemplateResult {
  // TODO: I think firefox has a bug selected attribute bug, it doesn't switch to it when change programmatically
  // I should report it if that is the case
  const offers = window.$game.state!.tradeOffers;
  const dis = offers.length === 0;

  return html`
    <label>
      select a received offer
      <select @change="${dis ? nothing : onSelect}" ?disabled=${dis}>
        <option ?selected=${!cur} value="">Select offer</option>
        ${offers.map(
          (o, i) =>
            html`<option ?selected=${cur === o} value=${i}>${i}#</option>`
        )}
      </select>
    </label>
  `;
}

/**
 * render a team selector to trade with
 * @param onSelect a change event handler
 * @param cur on which offer is currently on
 * @returns
 */
function otherTeamSelector(onSelect: hdl, cur?: Team): TemplateResult {
  // TODO: I think firefox has a bug selected attribute bug, it doesn't switch to it when change programmatically
  const gs = window.$game.state!;
  return html`
    <label>
      select a team to trade with
      <select @change="${onSelect}">
        <option ?selected=${!cur} value="">Select team</option>
        ${Object.keys(gs.teams)
          .filter((n) => n !== gs.userTeam)
          .map((n) => html`<option ?selected=${cur?.name === n}>${n}</option>`)}
      </select>
    </label>
  `;
}

/** render the trading option, the team roster and some financial info for the given team,
 * when checked is defined it renders a predefined not interactive offer
 * @param checked players ids involved in the trade offer
 */
function team(t: Team, checked?: string[]): TemplateResult {
  const gs = window.$game.state!;
  return html`
    <section>
      <h2>${t.name}</h2>
      ${finance(t)}
      <ul class="roster">
        ${repeat(
          t.playerIds,
          (id: string) => id,
          (id: string) =>
            player(gs.players[id], t.name, checked?.includes(id) ?? undefined)
        )}
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

/** handle the click on the checkbox input */
function onCheckboxClick(e: Event): void {
  const cnt = (e.currentTarget as HTMLElement).closest(".cnt-checkbox");
  cnt && cnt.classList.toggle("cnt-checkbox--on");
}

/** render informations about the given player and a checkbox option to add
 * the player in the trade, if checked is defined the checkbox is fixed
 */
function player(p: Player, team: string, checked?: boolean): TemplateResult {
  // instead of disable we could use this solution if needed
  // https://stackoverflow.com/questions/12267242/how-can-i-make-a-checkbox-readonly-not-disabled
  return html`
    <li class="plr-entry">
      <div>${playerInfo(p)} ${playerSkills(p)}</div>
      <div class="cnt-checkbox ${checked ? "cnt-checkbox--on" : ""}">
        <input
          @click=${onCheckboxClick}
          ?disabled=${checked !== undefined}
          ?checked=${Boolean(checked)}
          type="checkbox"
          name=${team}
          value=${p.id}
          aria-label="add to the trade offer"
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
          <span class="plr-bio__pos">${p.position}</span>
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
