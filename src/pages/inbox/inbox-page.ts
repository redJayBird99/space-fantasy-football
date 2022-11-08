import { render, html } from "lit-html";
import style from "./inbox-page.css";

class InboxPage extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      document.title = `${window.$game.state?.userTeam} club inbox - Space Fantasy Football`;
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sff-game-page>
          <div slot="in-main">
            <sff-inbox></sff-inbox>
          </div>
        </sff-game-page>
      `,
      this
    );
  }
}

export default function define() {
  if (!customElements.get("sff-inbox-page")) {
    customElements.define("sff-inbox-page", InboxPage);
  }
}
