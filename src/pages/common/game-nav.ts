import style from "./game-nav.css";
import { render, html, nothing, TemplateResult } from "lit-html";
import { handleLinkClick } from "../util/router";
import { HTMLSFFGameElement } from "./html-game-element";

/** the in game nav bar */
class GameNav extends HTMLSFFGameElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render(): void {
    const gs = window.$game.state!;
    const link = (href: string, content: string | TemplateResult) =>
      html`<a @click=${handleLinkClick} href=${href} class="rt-link"
        ><span>${content}</span></a
      >`;

    render(
      html`
        <style>
          ${style}
        </style>
        <ul>
          <li class="home">${link(window.$PUBLIC_PATH, "⌂ home")}</li>
          <li class="inbox">
            ${link(`${window.$PUBLIC_PATH}inbox`, html`📬 inbox${mailBadge()}`)}
          </li>
          <li>${link(`${window.$PUBLIC_PATH}dashboard`, "🎮 dashboard")}</li>
          <li>${link(`${window.$PUBLIC_PATH}players`, "🏃 players")}</li>
          <li>${link(`${window.$PUBLIC_PATH}league`, "🏆 league")}</li>
          <li>${link(`${window.$PUBLIC_PATH}team`, "🏟 team")}</li>
          <li>${link(`${window.$PUBLIC_PATH}finances`, "🏦 finances")}</li>
          <li>
            ${link(`${window.$PUBLIC_PATH}transactions`, "🧳 transactions")}
          </li>
          <li>${link(`${window.$PUBLIC_PATH}draft`, "🥇 draft")}</li>
          <li>${link(`${window.$PUBLIC_PATH}trade`, "⚖ trade")}</li>
          ${gs.tradeOffers.length > 0
            ? html`<li class="offers">
                ${link(
                  `${window.$PUBLIC_PATH}trade-offers`,
                  html`📲 offers${offerBadge()}`
                )}
              </li>`
            : nothing}
          ${gs.flags.onGameEvent === "retiring"
            ? html`<li>
                ${link(`${window.$PUBLIC_PATH}retiring`, "🎽 retiring")}
              </li>`
            : nothing}
          <li>${link(`${window.$PUBLIC_PATH}game-manual`, "📘 manual")}</li>
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
