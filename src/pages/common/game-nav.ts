import style from "./game-nav.css";
import { render, html, nothing, TemplateResult } from "lit-html";
import { HTMLSFFGameElement } from "./html-game-element";
import { goLink } from "../util/go-link";
import { mainStyleSheet } from "../style-sheets";

/** the in game nav bar */
class GameNav extends HTMLSFFGameElement {
  gName?: string; // named group of the matched URL passed as property

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render(): void {
    const gs = window.$game.state!;
    const gn = this.gName;
    const link = (href: string, content: string | TemplateResult) =>
      goLink(href, html`<span>${content}</span>`);

    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        <ul>
          <li class="home">${link("/", "⌂ home")}</li>
          <li class="inbox">
            ${link(`/${gn}/inbox`, html`inbox${mailBadge()}`)}
          </li>
          <li>${link(`/${gn}/dashboard`, "dashboard")}</li>
          <li>${link(`/${gn}/players`, "players")}</li>
          <li>${link(`/${gn}/league`, "league")}</li>
          <li>${link(`/${gn}/team`, "team")}</li>
          <li>${link(`/${gn}/finances`, "finances")}</li>
          <li>${link(`/${gn}/transactions`, "transactions")}</li>
          <li>${link(`/${gn}/draft`, "draft")}</li>
          <li>${link(`/${gn}/trade`, "trade")}</li>
          ${gs.tradeOffers.length > 0
            ? html`<li class="offers">
                ${link(`/${gn}/trade-offers`, html`offers${offerBadge()}`)}
              </li>`
            : nothing}
          ${gs.flags.onGameEvent === "retiring"
            ? html`<li>${link(`/${gn}/retiring`, "retiring")}</li>`
            : nothing}
          <li>${link(`/${gn}/game-manual`, "manual")}</li>
        </ul>
      `,
      this.shadowRoot!
    );
  }
}

function mailBadge(): TemplateResult | typeof nothing {
  const newMails = window.$game.state!.mails.filter((m) => !m.opened).length;

  if (newMails > 0) {
    return html`<span class="badge">${newMails}</span>`;
  }

  return nothing;
}

function offerBadge(): TemplateResult {
  return html`<span class="badge"
    >${window.$game.state?.tradeOffers.length ?? 0}</span
  >`;
}

export default function define() {
  if (!customElements.get("sff-game-nav")) {
    customElements.define("sff-game-nav", GameNav);
  }
}
