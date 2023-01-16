import { html, nothing, render, TemplateResult } from "lit-html";
import { getTransferHistoryOf } from "../../game/character/user";
import {
  SigningRecord,
  TradeRecord,
  TransRecord,
} from "../../game/game-state/game-state";
import { mainStyleSheet } from "../style-sheets";
import style from "./player-history.css";

/** show the transaction history of the give player
 * - attribute data-pId should be the player's id */
class PlayerHistory extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  gameStateUpdated() {
    this.render();
  }

  render(): void {
    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        <section>
          <h2>Transfer History</h2>
          ${renderHistory(this.dataset.plId ?? "")}
        </section>
      `,
      this.shadowRoot!
    );
  }
}

function renderHistory(plId: string): TemplateResult | void {
  const h = getTransferHistoryOf(plId);

  if (!h) {
    return;
  }

  const df = h.draft;
  return html`
    <ul class="history-list">
      ${df
        ? html`<li>Draft: ${df.when} - pick ${df.n} by ${df.team}</li>`
        : nothing}
      ${renderTransaction(h.transactions, plId)}
    </ul>
  `;
}

/** show all transaction where the player was involved sorted by date */
function renderTransaction(trs: TransRecord, plId: string): TemplateResult[] {
  return getTransactionsOrder(trs).map((or) => {
    if (or.key === "trades") {
      return renderTrade(trs[or.key][or.i], plId);
    } else if (or.key === "signings") {
      return renderSign(trs[or.key][or.i], false);
    }

    return renderSign(trs[or.key][or.i], true);
  });
}

/** render information about the given sign record */
function renderSign(r: SigningRecord, renewal: boolean): TemplateResult {
  const str = renewal ? "Re-signed" : "Signed";
  return html`<li>
    On ${new Date(r.when).toDateString()} ${str} for ${r.team}
  </li>`;
}

/** render information about the given trades where the player was involved */
function renderTrade(r: TradeRecord, plId: string): TemplateResult {
  const plInS1 = r.sides[0].plIds.includes(plId);
  const giver = plInS1 ? r.sides[0].team : r.sides[1].team;
  const receiver = plInS1 ? r.sides[1].team : r.sides[0].team;

  return html`<li>
    On ${new Date(r.when).toDateString()} was traded by ${giver} to ${receiver}
  </li>`;
}

type Ts = { key: keyof TransRecord; i: number };

/** get the transactions order by ascending date  */
function getTransactionsOrder(r: TransRecord): Ts[] {
  const rst: (Ts & { when: number })[] = [];
  const push = ({ key, i }: Ts, when: string) =>
    rst.push({ when: new Date(when).getTime(), i, key });
  r.trades.forEach(({ when }, i) => push({ i, key: "trades" }, when));
  r.signings.forEach(({ when }, i) => push({ i, key: "signings" }, when));
  r.renewals.forEach(({ when }, i) => push({ i, key: "renewals" }, when));

  return rst.sort((t0, t1) => t0.when - t1.when);
}

export default function define() {
  if (!customElements.get("player-history")) {
    customElements.define("player-history", PlayerHistory);
  }
}
