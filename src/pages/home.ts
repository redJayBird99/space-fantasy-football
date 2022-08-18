import { html, render } from "lit-html";
import "./util/layout.ts";

class Home extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <sff-layout>
          <div slot="in-header"></div>
          <div slot="in-nav"></div>
          <div slot="in-main">
            <pre>${JSON.stringify(window.$GAME.state, null, 4)}</pre>
          </div>
          <div slot="in-aside"></div>
          <div slot="in-footer"></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-home")) {
  customElements.define("sff-home", Home);
}
