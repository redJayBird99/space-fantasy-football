import style from "./inbox.css";
import { html, nothing, render, TemplateResult } from "lit-html";
import "../util/modal.ts";
import { goTo } from "../util/router";
import { Mail } from "../../character/mail";
import { classMap } from "lit-html/directives/class-map.js";
import { GameState } from "../../game-state/game-state";

/**
 * an inbox for listing and reading news feed, email etc, it has to mode
 * @param {attribute} data-compact - when the attribute exists the inbox
 * is limited only to redirecting to the inbox page
 */
class Inbox extends HTMLElement {
  /** the currently open mail */
  mail?: Mail;

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

  gameStateUpdated(): void {
    if (this.mail) {
      // remove the stale reference
      this.mail = window.$game.state?.mails.find((m) => this.mail!.id === m.id);
    }

    this.render();
  }

  /** when the inbox is in compact mode redirect to the inbox page,
   * otherwise open the email for reading and mark it as opened */
  handleOpenMail = (e: Mail) => {
    if (this.hasAttribute("data-compact")) {
      goTo(`${window.$PUBLIC_PATH}inbox`);
    } else {
      // we don't need to notify the game handle of the mutation because nothing depend on mails
      e.opened = true;
      this.mail = e;
      this.render();
    }
  };

  handleCloseMail = () => {
    this.mail = undefined;
    this.render();
  };

  onDeleteMail = (e: Mail) => {
    if (!confirm("are you sure do you want to delete this email")) {
      return;
    }

    const gs = window.$game.state as GameState;
    // we don't need to notify the game handle of the mutation because nothing depend on mails
    gs.mails = gs.mails.filter((m) => e.id !== m.id);
    this.render();
  };

  /** list all the emails */
  mailEntries(): TemplateResult[] {
    const onClick = (m: Mail) => (e: Event) =>
      e.target instanceof HTMLButtonElement
        ? this.onDeleteMail(m)
        : this.handleOpenMail(m);
    const noCompactCols = (e: Mail) => html`
      <td>${e.sendDate}</td>
      <td>
        <button class="btn btn--err" aria-label="delete mail">✘</button>
      </td>
    `;

    return window.$game.state!.mails.map(
      (e) =>
        html`<tr
          class=${classMap({ "mail--opened": !e.opened })}
          @click=${onClick(e)}
        >
          <td>${e.sender}</td>
          <td>${e.subject}</td>
          ${this.hasAttribute("data-compact") ? nothing : noCompactCols(e)}
        </tr>`
    );
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <table>
          <caption>
            <h2>📬 Inbox</h2>
          </caption>
          <tbody>
            ${this.mailEntries()}
          </tbody>
        </table>
        ${this.mail &&
        html`
          <sff-modal .closeHandler=${this.handleCloseMail}>
            ${readMail(this.mail)}
          </sff-modal>
        `}
      `,
      this.shadowRoot!
    );
  }
}

/** show the mail content */
function readMail(e: Mail): TemplateResult {
  return html`
    <article class="open-mail">
      <div class="mail-info">
        <span>${e.sender}</span>
        <span>${e.sendDate}</span>
      </div>
      <p>${e.subject}</p>
      <p>${e.content}</p>
    </article>
  `;
}

if (!customElements.get("sff-inbox")) {
  customElements.define("sff-inbox", Inbox);
}
