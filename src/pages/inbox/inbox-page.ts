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
        <sff-inbox></sff-inbox>
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
