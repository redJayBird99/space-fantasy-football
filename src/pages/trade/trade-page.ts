import { render, html, TemplateResult, nothing } from "lit-html";
import {
  MacroSkill,
  MACRO_SKILLS,
  MAX_SKILL,
  Player,
  SALARY_CAP,
  luxuryTax,
  minSalaryTax,
  sumWages,
  Team,
  user as userMod,
  GameState,
  TradeRecord,
  tradeRequirements,
  getAge,
  getMacroSkill,
  getWagesAmount,
} from "../../game/game";
import { goLink } from "../util/go-link";
import style from "./trade-page.css";
import { repeat } from "lit-html/directives/repeat.js";
import { keyed } from "lit-html/directives/keyed.js";
import { trade } from "../transactions/transactions";
import isEqual from "lodash-es/isEqual";
import { HTMLSFFGameElement } from "../common/html-game-element";

type hdl = (e: Event) => unknown;
type TradeSide = { get: Player[]; give: Player[]; team: Team };
type TradeState = { user: Team } & TradeSide;

/** it is the root element for both the trade page and the offer page,
 * the rendering page is control by the boolean attribute data-offer */
class TradeRoot extends HTMLSFFGameElement {
  connectedCallback() {
    if (this.isConnected) {
      if (this.hasAttribute("data-offers")) {
        document.title = `${window.$game.state?.userTeam} club overview of the trade offers received - Space Fantasy Football`;
      } else {
        document.title = `${window.$game.state?.userTeam} club trade overview - Space Fantasy Football`;
      }
      super.connectedCallback();
    }
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        ${this.hasAttribute("data-offers")
          ? html`<sff-trade-offers-page></sff-trade-offers-page>`
          : html`<sff-trade-page></sff-trade-page>`}
      `,
      this
    );
  }
}

abstract class PageContent extends HTMLSFFGameElement {
  /** the resulting answer to trade or the offer */
  protected offerResult?: { ok: boolean; why: string };

  disconnectedCallback() {
    // we need to clean the modal when successful because can navigate to other pages
    this.offerResult?.ok && render(nothing, window.$modalRoot);
    super.disconnectedCallback();
  }

  /** called when the modal showing the result is closed */
  onCloseResult = () => {
    this.offerResult = undefined;
    this.render();
  };
}

function windowStatus() {
  return window.$game.state?.flags.openTradeWindow
    ? ""
    : " ⚠ The trade window is closed";
}

/** render the user trade maker */
class TradePage extends PageContent {
  /** from the user prospective, this is a Controlled Components (as react call it), get and give are ids */
  private offer: { get: string[]; give: string[]; team?: string } = {
    get: [],
    give: [],
  };

  connectedCallback() {
    if (this.isConnected) {
      this.addEventListener("click", this.onCheckboxClick);
      super.connectedCallback();
    }
  }

  gameStateUpdated() {
    this.offer = { get: [], give: [], team: this.offer.team };
    super.gameStateUpdated();
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.onCheckboxClick);
    super.disconnectedCallback();
  }

  /** updated the offer if a player was checked or unchecked and re-render */
  onCheckboxClick = (e: Event) => {
    const t = e.target;

    if (!(t instanceof HTMLInputElement) || t.type !== "checkbox") {
      return;
    }

    if (t.checked) {
      t.name === this.offer.team
        ? this.offer.get.push(t.value)
        : this.offer.give.push(t.value);
    } else {
      this.offer.get = this.offer.get.filter((id) => id !== t.value);
      this.offer.give = this.offer.give.filter((id) => id !== t.value);
    }

    this.render();
  };

  /** update the trade partner when the selection change */
  onTeamSelect = (e: Event) => {
    const team = (e.currentTarget as HTMLSelectElement).value;
    this.offer = { get: [], give: [], team: team || undefined };
    this.render();
  };

  /** handle the user trade offer, if it's acceptable make the trade otherwise reject it  */
  onSummitTrade = (e: Event) => {
    e.preventDefault();
    const gs = window.$game.state!;
    const { get, give, team } = this.offer;

    if (team && gs.flags.openTradeWindow) {
      const other = gs.teams[team];
      const gv = give.map((id) => gs.players[id]);
      const gt = get.map((id) => gs.players[id]);
      this.offerResult = userMod.canTrade(other, gt, gv);

      if (this.offerResult.ok) {
        userMod.makeTrade(other, gt, gv); // on the mutation notification clean the offer and re-render
      } else {
        this.render();
      }
    }
  };

  render(): void {
    const gs = window.$game.state!;
    const { team, give: gv, get: gt } = this.offer;
    const user = gs.teams[gs.userTeam];
    const give = gv.map((id) => gs.players[id]);
    const get = gt.map((id) => gs.players[id]);
    const canMakeOffer =
      team && gs.flags.openTradeWindow && give.length && get.length;

    render(
      html`
        <div
          class="trade-ctrl flex gap-2 bg-750 right-0 fixed rounded-bl-xl fixed z-2 px-4 py-2 border-b-1 border-l-1 border-solid border-bg-500 border-0 shadow"
        >
          ${otherTeamSelector(this.onTeamSelect, team ?? "")}
          <button
            title=${windowStatus()}
            class="btn btn-rounded"
            id="btn-offer"
            ?disabled=${!canMakeOffer}
            @click=${canMakeOffer ? this.onSummitTrade : nothing}
          >
            Make offer
          </button>
        </div>
        <section class="cnt-traders">
          ${tradingTeam({ team: user, get, give })}
          ${team
            ? tradingTeam({ team: gs.teams[team], get: give, give: get })
            : nothing}
        </section>
      `,
      this
    );
    render(outputRst(this.onCloseResult, this.offerResult), window.$modalRoot);
  }
}

/** render the received trade offer fot the user team */
class OffersPage extends PageContent {
  private offer?: TradeRecord = window.$game.state!.tradeOffers[0] ?? undefined;

  gameStateUpdated() {
    if (
      this.offer &&
      !window.$game.state!.tradeOffers.some((o) => isEqual(o, this.offer))
    ) {
      this.offer = undefined;
    }
    super.gameStateUpdated();
  }

  /** handle the selection of a different different offer */
  onOfferSelect = (e: Event) => {
    const v = (e.currentTarget as HTMLSelectElement).value;
    const trades = window.$game.state!.tradeOffers;
    this.offer = v && trades[Number(v)] ? trades[Number(v)] : undefined;
    this.render();
  };

  /** handle the user response to the offer, when accept is true make
   * the trade, otherwise reject the trade, in both case the offer is removed */
  onOfferResponse = (accept: boolean) => {
    if (!this.offer) {
      return;
    }

    const gs = window.$game.state! as GameState;
    gs.tradeOffers = gs.tradeOffers.filter((t) => t !== this.offer);
    const { get, give, team: other } = toTradeState(this.offer);
    this.offer = undefined;

    // only valid offers are kept in the gs.tradeOffer so no other check is needed
    // the game handler will take care of the remaining trades validity after the mutation
    if (accept) {
      this.offerResult = { ok: true, why: "" };
      userMod.makeTrade(other, get, give);
    } else {
      this.offerResult = { ok: false, why: "the user rejected the offer" };
      window.$game.state = gs; // mutation notification
    }
  };

  renderOffer(): TemplateResult {
    const { user, get, give, team } = toTradeState(this.offer!);

    return html`
      <section class="cnt-traders">
        ${tradingTeam({ team: user, give, get }, true)}
        ${tradingTeam({ team, get: give, give: get }, true)}
      </section>
    `;
  }

  render(): void {
    const dis = !this.offer;

    render(
      html`
        <div
          class="trade-ctrl flex gap-2 bg-750 right-0 fixed rounded-bl-xl fixed z-2 px-4 py-2 border-b-1 border-l-1 border-solid border-bg-500 border-0 shadow"
        >
          ${offersSelector(this.onOfferSelect, this.offer)}
          <button
            title=${windowStatus()}
            class="btn btn-rounded btn--acc"
            ?disabled=${dis}
            @click=${() => this.onOfferResponse(true)}
          >
            accept
          </button>
          <button
            class="btn btn-rounded btn--err"
            ?disabled=${dis}
            @click=${() => this.onOfferResponse(false)}
          >
            reject
          </button>
        </div>
        ${dis ? nothing : this.renderOffer()}
      `,
      this
    );
    render(outputRst(this.onCloseResult, this.offerResult), window.$modalRoot);
  }
}

/** return convert the record from the user prospective */
function toTradeState(t: TradeRecord): TradeState {
  const gs = window.$game.state!;
  const [s1, s2] = t.sides;
  const user = s1.team === gs.userTeam ? s1 : s2;
  const other = s1.team === gs.userTeam ? s2 : s1;

  return {
    user: gs.teams[user.team],
    team: gs.teams[other.team],
    get: other.plIds.map((id) => gs.players[id]),
    give: user.plIds.map((id) => gs.players[id]),
  };
}

/**
 * render a modal with the result of the offer when rst is defined
 *  @param onClose called when the close button is clicked
 */
function outputRst(onClose: () => void, rst?: { ok: boolean; why: string }) {
  const trades = window.$game.state!.transactions.now.trades;

  if (rst) {
    const htmlRst = rst.ok
      ? html`
          <h2 class="dig-label" slot="title">The offer was successful!</h2>
          <output aria-label="trade result">
            ${rst ? trade(trades[trades.length - 1]) : nothing}
          </output>
        `
      : html`
          <h2 class="dig-label" slot="title">The offer was unsuccessful!</h2>
          <output aria-label="trade result">
            <p class="rst-p">${rst.why}</p>
          </output>
        `;

    // if the trade was successful it is added as last trade operation
    return html`<sff-modal .handleClose=${onClose}>${htmlRst}</sff-modal>`;
  }

  return nothing;
}

/**
 * render a selector for all received offers,
 * @param onSelect a change event handler
 * @param cur on which trade is currently on
 */
function offersSelector(onSelect: hdl, cur?: TradeRecord): TemplateResult {
  const gs = window.$game.state!;
  const offers = gs.tradeOffers;
  const dis = offers.length === 0;
  const by = (t: TradeRecord) =>
    t.sides[0].team === gs.userTeam ? t.sides[1].team : t.sides[0].team;

  // we use keyed (line doesn't work with selected) because firefox doesn't
  // update the selected element after the offer was processed
  return html`
    <label class="hide"> select an offer </label>
    <select
      class="form-select max-w-max"
      @change="${dis ? nothing : onSelect}"
      ?disabled=${dis}
    >
      ${keyed(
        !cur,
        html`<option ?selected=${!cur} value="">Select offer</option>`
      )}
      ${offers.map(
        (o, i) =>
          html`<option ?selected=${cur === o} value=${i}>by ${by(o)}</option>`
      )}
    </select>
  `;
}

/**
 * render a team selector to trade with
 * @param onSelect a change event handler
 * @param cur on which offer is currently on
 */
function otherTeamSelector(onSelect: hdl, cur: string): TemplateResult {
  const gs = window.$game.state!;
  return html`
    <label for="trade-select-team" class="hide">
      select a team to trade with
    </label>
    <select
      id="trade-select-team"
      class="form-select max-w-max"
      @change="${onSelect}"
    >
      <option ?selected=${!cur} value="">Select team</option>
      ${Object.keys(gs.teams)
        .filter((n) => n !== gs.userTeam)
        .map((n) => html`<option ?selected=${cur === n}>${n}</option>`)}
    </select>
  `;
}

/**
 * render the team trading options, the roster and an financial preview for the given side
 * @param readonly when true render a predefined not interactive offer
 */
function tradingTeam(side: TradeSide, readonly = false): TemplateResult {
  const gs = window.$game.state!;
  const { team: t, give } = side;
  const cks = new Set(give.map((p) => p.id));

  return html`
    <section>
      <h2 class="team-name">🌕 ${t.name}</h2>
      ${finance(side)}
      <ul class="roster">
        ${repeat(
          t.playerIds,
          (id: string) => id,
          (id: string) => player(gs.players[id], t.name, cks.has(id), readonly)
        )}
      </ul>
    </section>
  `;
}

/** render a financial preview about the trade for the given side */
function finance({ team, get, give }: TradeSide): TemplateResult {
  const gs = window.$game.state!;
  const incoming = sumWages(gs, get);
  const outgoing = sumWages(gs, give);
  const wages = getWagesAmount({ gs, t: team }) + incoming - outgoing;
  const capSpace = SALARY_CAP - wages;
  const nFm = new Intl.NumberFormat("en-GB");
  const color =
    incoming !== 0 || outgoing !== 0
      ? tradeRequirements({ gs, t: team }, get, give).ok
        ? "fin-good"
        : "fin-bad"
      : "";

  return html`
    <output for=${team.playerIds.join(" ")} class="fin-preview">
      <div class="fin-preview__status ${color}"></div>
      <div class="fin-move">${nFm.format(incoming)}₡ Incoming</div>
      <div class="fin-move">${nFm.format(-outgoing)}₡ Outgoing</div>
      <div class="fin-infos">
        ${financeInfo("Roster wages", wages)}
        ${financeInfo("Cap Space", capSpace)}
        ${financeInfo("Luxury tax", luxuryTax(wages))}
        ${financeInfo("Min cap tax", minSalaryTax(wages))}
      </div>
    </output>
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

/**
 * render informations about the given player and a checkbox option to add
 * the player in the trade
 * @param readonly when true the checkbox is fixed to the given checked value
 */
function player(
  p: Player,
  team: string,
  checked: boolean,
  readonly = false
): TemplateResult {
  // live doesn't work with boolean attributes
  const check = keyed(
    checked,
    html`
      <input
        @click=${onCheckboxClick}
        ?disabled=${readonly}
        ?checked=${checked}
        type="checkbox"
        name=${team}
        value=${p.id}
        id=${p.id}
        aria-label="add to the trade offer"
      />
    `
  );
  // instead of disable we could use this solution if needed
  // https://stackoverflow.com/questions/12267242/how-can-i-make-a-checkbox-readonly-not-disabled
  return html`
    <li class="plr-entry">
      <div>${playerInfo(p)} ${playerSkills(p)}</div>
      <div class="cnt-checkbox ${checked ? "cnt-checkbox--on" : ""}">
        ${check}
      </div>
    </li>
  `;
}

/** render bio and some financial info about the give player */
function playerInfo(p: Player): TemplateResult {
  const gs = window.$game.state!;
  const c = GameState.getContract(gs, p);
  const wage = c?.wage ? new Intl.NumberFormat("en-GB").format(c?.wage) : 0;

  return html`
    <div class="plr-info">
      <div class="plr-bio">
        <h3>${goLink(`players/player?id=${p.id}`, p.name)}</h3>
        <div>
          <span class="plr-bio__pos">${p.position}</span>
          <span>
            ${getAge(p, gs.date)} <abbr title="years old">y.o.</abbr>
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
        userMod.getPlayerRatingSymbol(p, gs),
        userMod.getPlayerRating(p, gs)
      )}
      ${playerSkill(
        "improvability",
        userMod.improvabilityRatingSymbol(p, user),
        userMod.estimateImprovabilityRating(p, user)
      )}
      ${mSkills.map((s) => {
        const rating = Math.round(getMacroSkill(p, s));
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

export default function define() {
  if (!customElements.get("sff-trade")) {
    customElements.define("sff-trade", TradeRoot);
    customElements.define("sff-trade-page", TradePage);
    customElements.define("sff-trade-offers-page", OffersPage);
  }
}
