import style from "./inbox.css";
import { html, render, TemplateResult } from "lit-html";
import "../util/modal.ts";
import { goTo } from "../util/router";
import { Mail } from "../../character/mail";
import { GameState } from "../../game-state/game-state";
import { classMap } from "lit-html/directives/class-map.js";
import * as _ps from "../util/props-state";

/**
 * an inbox for listing and reading news feed, email etc, it has to mode
 * @param {attribute} data-compact - when the attribute is setted the inbox
 * is limited only to redirecting to the inbox page
 */
class Inbox extends HTMLElement {
  state = _ps.newState(
    {
      mails: structuredClone(window.$game.state?.mails) ?? [],
      openMail: undefined as undefined | Mail,
    },
    () => this.render()
  );

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
    if (!this.hasAttribute("data-compact")) {
      // we actually want to mutate the gs only one time when the inbox section is closed
      // the compact mode doesn't mutate the mails only redirect
      const gs = window.$game.state as GameState;
      gs.mails = this.state.mails;
      window.$game.state = gs;
    }

    window.$game.removeObserver(this);
  }

  gameStateUpdated(gs?: Readonly<GameState>): void {
    const mails = structuredClone(gs?.mails) ?? [];
    _ps.setState(() =>
      Object.assign(this.state, { mails, openMail: undefined })
    );
  }

  /** when the inbox is in compact mode redirect to the inbox page,
   * otherwise open the email for reading and mark it as opened */
  handleOpenMail = (e: Mail) => {
    if (this.hasAttribute("data-compact")) {
      goTo(`${window.$PUBLIC_PATH}inbox`);
    } else {
      _ps.setState(() => {
        e.opened = true;
        return Object.assign(this.state, { openMail: e });
      });
    }
  };

  handleCloseMail = () => {
    _ps.setState(() => Object.assign(this.state, { openMail: undefined }));
  };

  /** list all the emails */
  mailEntries(): TemplateResult[] {
    return this.state.mails.map(
      (e) =>
        html`<tr
          class=${classMap({ "mail--opened": !e.opened })}
          @click=${() => this.handleOpenMail(e)}
        >
          <td>${e.sender}</td>
          <td>${e.subject}</td>
          <td>${e.sendDate}</td>
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
        ${this.state.openMail &&
        html`
          <sff-modal
            style="--modal-container-flex: 1"
            .closeHandler=${this.handleCloseMail}
          >
            ${readMail(this.state.openMail)}
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
    <article>
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
