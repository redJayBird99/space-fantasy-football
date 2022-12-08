import { html, render } from "lit-html";
import { MAX_WAGE, MIN_WAGE, Player, SALARY_CAP } from "../../character/player";
import { Team } from "../../character/team";
import { fakeWageRequest, signPlayer } from "../../character/user";
import { within } from "../../util/math";
import style from "./negotiate-contract.css";

/**
 * when this component is called it assumes that the player is signable
 * (it only check for salary cap requirements when signing a new player)
 *
 * open in a modal the negotiation ui to sign or re-sign the given player,
 * the component expect as props:
 * - prl: the player negotiating with
 * - onClose: a function called when the negotiation was concluded
 * - sign: if true it opens in new sign mode otherwise in re-sign mode
 */
class NegotiateContract extends HTMLElement {
  // the result of the last offer
  result: "pending" | "successful" | "rejected" = "pending";
  // this component is inside a modal we don't need to worry about stale references
  gs = window.$game.state!;
  user = this.gs.teams[this.gs.userTeam];
  userPayroll = Team.getWagesAmount({ gs: this.gs, t: this.user });
  // passed by the caller component
  props?: {
    plr: Player;
    sign: boolean;
    onClose: () => unknown;
  };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  /** handle the submitted offer, if the offer is successful the player is sign and the onclose sign called */
  onOffer = () => {
    if (this.result === "successful") {
      return;
    }

    const p = this.props?.plr;
    const wage = Number(
      (this.shadowRoot!.querySelector("#wage") as HTMLInputElement).value
    );
    const length = Number(
      (this.shadowRoot!.querySelector("#length") as HTMLInputElement).value
    );

    if (
      p &&
      length >= 1 &&
      length < 5 &&
      wage >= Player.wageRequest({ gs: this.gs, t: this.user, p })
    ) {
      if (!this.props!.sign) {
        signPlayer(p, wage, length, true);
        this.result = "successful";
      } else if (wage <= MIN_WAGE || wage + this.userPayroll <= SALARY_CAP) {
        // only when signing new players check if the team enough has cap space
        signPlayer(p, wage, length);
        this.result = "successful";
      }

      if (this.result === "successful") {
        // give some time to the user to see the result
        setTimeout(this.props!.onClose, 2500);
      }
    } else {
      this.result = "rejected";
    }

    this.render();
  };

  resultMessage() {
    if (this.result === "rejected") {
      return "The offer was rejected";
    } else if (this.result === "successful") {
      return "The offer was accepted";
    }

    return "";
  }

  render() {
    if (!this.props) {
      return;
    }

    // when re-signing the salary cap doesn't apply (Larry Bird exception)
    const maxWage = this.props.sign
      ? Math.floor(within(SALARY_CAP - this.userPayroll, MIN_WAGE, MAX_WAGE))
      : MAX_WAGE;

    render(
      html`
        <style>
          ${style}
        </style>
        <sff-modal .closeHandler=${this.props?.onClose}>
          <h3 class="dig-label" slot="title">
            Negotiating with ${this.props?.plr.name}
          </h3>
          <form class="form-neg" @submit=${(e: Event) => e.preventDefault()}>
            <label for="wage">wage offer</label>
            <input
              class="input-bg"
              id="wage"
              type="number"
              min=${MIN_WAGE}
              max=${maxWage}
              step="100"
              placeholder=${`wage request ${fakeWageRequest(this.props.plr)}₡`}
            />
            <label for="length">contract duration</label>
            <input
              class="input-bg"
              id="length"
              type="number"
              min="1"
              max="4"
              step="1"
              placeholder="contract duration"
            />
            <button
              class="btn-sml btn--acc"
              @click=${this.onOffer}
              id="btn-offer"
            >
              offer
            </button>
            <output class=${this.result} for="btn-offer"
              >${this.resultMessage()}</output
            >
          </form>
        </sff-modal>
      `,
      this.shadowRoot!
    );
  }
}

export default function define() {
  if (!customElements.get("negotiate-contract")) {
    customElements.define("negotiate-contract", NegotiateContract);
  }
}
