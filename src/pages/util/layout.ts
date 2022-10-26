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

  /** handle the btn-toggle-nav, opening and closing the nav bar */
  onOpenNav = () => {
    const nav = this.shadowRoot!.querySelector("#js-nav") as HTMLElement;

    if (!nav.classList.contains("nav-open")) {
      nav.classList.add("nav-open");
      nav.style.display = "block";
      nav.style.opacity = "0";
      // setTimeout without delay on firefox sometimes doesn't fire the transition
      requestAnimationFrame(() =>
        requestAnimationFrame(() => (nav.style.opacity = ""))
      );
    } else {
      nav.classList.remove("nav-open");
      const clear = () => {
        nav.style.opacity = "";
        nav.style.display = "";
        nav.removeEventListener("transitionend", clear);
        nav.removeEventListener("transitioncancel", clear);
      };
      nav.addEventListener("transitionend", clear);
      nav.addEventListener("transitioncancel", clear);
      nav.style.opacity = "0";
    }
  };

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <header>
          <slot name="in-header"></slot>
          <button class="btn-toggle-nav" @click=${this.onOpenNav}>
            <span>☰</span>
          </button>
        </header>
        <nav id="js-nav">
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
