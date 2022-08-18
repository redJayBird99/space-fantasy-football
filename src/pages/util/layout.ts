import { html, render } from "lit-html";
import style from "./layout.css";

class Layout extends HTMLElement {
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
        <style>
          ${style}
        </style>
        <header>
          <slot name="in-header"></slot>
        </header>
        <nav>
          <slot name="in-nav"></slot>
        </nav>
        <main>
          <slot name="in-main"></slot>
        </main>
        <aside>
          <slot name="in-aside"></slot>
        </aside>
        <footer>
          <slot name="in-footer"></slot>
        </footer>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-layout")) {
  customElements.define("sff-layout", Layout);
}
