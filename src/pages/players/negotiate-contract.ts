import { html, render } from "lit-html";
import { MAX_WAGE, MIN_WAGE, Player, SALARY_CAP } from "../../character/player";
import { Team } from "../../character/team";
import {
  fakeWageRequest,
  tryReSignPlayer,
  trySignNewPlayer,
} from "../../character/user";
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
 * - newSign: if true it opens in new sign mode otherwise in re-sign mode
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
    newSign: boolean;
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

  trySignPlayer() {
    return this.props!.newSign ? trySignNewPlayer : tryReSignPlayer;
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
      this.trySignPlayer()(p, wage, length)
    ) {
      this.result = "successful";
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

  renderForm() {
    // when re-signing the salary cap doesn't apply (Larry Bird exception)
    const maxWage = this.props!.newSign
      ? Math.floor(within(SALARY_CAP - this.userPayroll, MIN_WAGE, MAX_WAGE))
      : MAX_WAGE;

    return html`
      <form class="form-neg" @submit=${(e: Event) => e.preventDefault()}>
        <label class="hide" for="wage">wage offer</label>
        <input
          class="form-number"
          id="wage"
          type="number"
          min=${MIN_WAGE}
          max=${maxWage}
          step="100"
          placeholder=${`wage request ${fakeWageRequest(this.props!.plr)}₡`}
        />
        <label class="hide" for="length">contract duration</label>
        <input
          class="form-number"
          id="length"
          type="number"
          min="1"
          max="4"
          step="1"
          placeholder="contract duration"
        />
        <button
          class="btn btn-rounded btn--acc"
          @click=${this.onOffer}
          id="btn-offer"
        >
          Make Offer
        </button>
        <output class=${this.result} for="btn-offer"
          >${this.resultMessage()}</output
        >
      </form>
    `;
  }

  render() {
    if (!this.props) {
      return;
    }
    html`<output class=${this.result} for="btn-offer"
      >${this.resultMessage()}</output
    >`;

    render(
      html`
        <style>
          ${style}
        </style>
        <sff-modal .closeHandler=${this.props?.onClose}>
          <h3 class="dig-label" slot="title">
            Negotiating with ${this.props?.plr.name}
          </h3>
          ${this.result === "successful"
            ? html`<output class=${this.result} for="btn-offer"
                >${this.resultMessage()}</output
              >`
            : this.renderForm()}
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
