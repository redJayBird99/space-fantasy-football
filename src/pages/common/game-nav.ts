import style from "./game-nav.css";
import { render, html, nothing, TemplateResult } from "lit-html";
import { goLink } from "../util/go-link";
import { HTMLSFFGameElement } from "./html-game-element";

/** the in game nav bar */
class GameNav extends HTMLSFFGameElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render(): void {
    const gs = window.$game.state!;

    render(
      html`
        <style>
          ${style}
        </style>
        <ul>
          <li class="home">${goLink(`${window.$PUBLIC_PATH}`, "⌂ home")}</li>
          <li class="inbox">
            ${goLink(
              `${window.$PUBLIC_PATH}inbox`,
              html`📬 inbox${mailBadge()}`
            )}
          </li>
          <li>${goLink(`${window.$PUBLIC_PATH}dashboard`, "🎮 dashboard")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}players`, "🏃 players")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}league`, "🏆 league")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}team`, "🏟 team")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}finances`, "🏦 finances")}</li>
          <li>
            ${goLink(`${window.$PUBLIC_PATH}transactions`, "🧳 transactions")}
          </li>
          <li>${goLink(`${window.$PUBLIC_PATH}draft`, "🥇 draft")}</li>
          <li>${goLink(`${window.$PUBLIC_PATH}trade`, "⚖ trade")}</li>
          ${gs.tradeOffers.length > 0
            ? html`<li class="offers">
                ${goLink(
                  `${window.$PUBLIC_PATH}trade-offers`,
                  html`📲 offers${offerBadge()}`
                )}
              </li>`
            : nothing}
          ${gs.flags.onGameEvent === "retiring"
            ? html`<li>
                ${goLink(`${window.$PUBLIC_PATH}retiring`, "🎽 retiring")}
              </li>`
            : nothing}
          <li>${goLink(`${window.$PUBLIC_PATH}game-manual`, "📘 manual")}</li>
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

if (!customElements.get("sff-game-nav")) {
  customElements.define("sff-game-nav", GameNav);
}
