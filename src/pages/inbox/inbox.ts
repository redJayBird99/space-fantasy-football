import style from "./inbox.css";
import { html, nothing, render, TemplateResult } from "lit-html";
import { goTo } from "../util/router";
import { Mail } from "../../character/mail";
import { classMap } from "lit-html/directives/class-map.js";
import { GameState } from "../../game-state/game-state";
import { HTMLSFFGameElement } from "../common/html-game-element";

/**
 * an inbox for listing and reading news feed, email etc, it has to mode
 * @param {attribute} data-compact - when the attribute exists the inbox
 * is limited only to redirecting to the inbox page
 */
class Inbox extends HTMLSFFGameElement {
  /** the currently open mail */
  mail?: Mail;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  gameStateUpdated(): void {
    if (this.mail) {
      // remove the stale reference
      this.mail = window.$game.state?.mails.find((m) => this.mail!.id === m.id);
    }

    super.gameStateUpdated();
  }

  /** when the inbox is in compact mode redirect to the inbox page,
   * otherwise open the email for reading and mark it as opened */
  handleOpenMail = (e: Mail) => {
    if (this.hasAttribute("data-compact")) {
      goTo(`${window.$PUBLIC_PATH}inbox`);
    } else {
      e.opened = true;
      this.mail = e;
      window.$game.state = window.$game.state!; // need to notify the observers
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
    gs.mails = gs.mails.filter((m) => e.id !== m.id);
    window.$game.state = gs;
  };

  /** list all the emails */
  mailEntries(): TemplateResult[] {
    const gs = window.$game.state!;
    const mails = this.hasAttribute("data-compact")
      ? gs.mails.slice(0, 6)
      : gs.mails;
    const onClick = (m: Mail) => (e: Event) =>
      e.target instanceof HTMLButtonElement
        ? this.onDeleteMail(m)
        : this.handleOpenMail(m);
    const fullCols = (e: Mail) => html`
      <span class="date-cell">${e.sendDate}</span>
      <span class="close-cell">
        <button class="btn btn--err" aria-label="delete mail">✘</button>
      </span>
    `;

    return mails.map(
      (e) =>
        html`<li
          class=${classMap({ "mail--new": !e.opened })}
          @click=${onClick(e)}
        >
          <span>${e.sender}</span>
          <span>${e.subject}</span>
          ${this.hasAttribute("data-compact") ? nothing : fullCols(e)}
        </li>`
    );
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <h2>📬 Inbox</h2>
        <ul>
          ${this.mailEntries()}
        </ul>
        ${this.mail && readMail(this.mail, this.handleCloseMail)}
      `,
      this.shadowRoot!
    );
  }
}

/** show the mail content */
function readMail(e: Mail, onCloseMail: () => void): TemplateResult {
  return html`
    <sff-modal .closeHandler=${onCloseMail}>
      <div slot="title" class="mail-info dig-label">
        <h2>${e.sender}</h2>
        <span>${e.sendDate}</span>
      </div>
      <article class="open-mail">
        <p>${e.subject}</p>
        <p>${e.content}</p>
      </article>
    </sff-modal>
  `;
}

export default function define() {
  if (!customElements.get("sff-inbox")) {
    customElements.define("sff-inbox", Inbox);
  }
}
