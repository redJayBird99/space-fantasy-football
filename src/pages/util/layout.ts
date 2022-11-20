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

  onNavLinkClick = (e: Event) => {
    const nav = e.currentTarget as HTMLElement;
    // cast to any because any element with a href could be a link
    if (e.composedPath().find((t) => (t as any).href)) {
      nav.classList.add("mb-nav-close");
    }
  };

  /** handle the btn-toggle-nav, opening and closing the nav bar */
  onOpenNav = () => {
    const nav = this.shadowRoot!.querySelector("#js-nav") as HTMLElement;

    if (nav.classList.contains("mb-nav-close")) {
      nav.classList.remove("mb-nav-close");
      nav.style.opacity = "0";
      // setTimeout without delay on firefox sometimes doesn't fire the transition
      requestAnimationFrame(() =>
        requestAnimationFrame(() => (nav.style.opacity = ""))
      );
    } else {
      const clear = () => {
        nav.style.opacity = "";
        nav.classList.add("mb-nav-close");
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
        <nav id="js-nav" class="mb-nav-close" @click=${this.onNavLinkClick}>
          <slot name="in-nav"></slot>
        </nav>
        <main>
          <slot name="in-main"></slot>
        </main>
        <footer>
          <slot name="in-footer"></slot>
        </footer>
      `,
      this.shadowRoot!
    );
  }
}

export default function define(): void {
  if (!customElements.get("sff-layout")) {
    customElements.define("sff-layout", Layout);
  }
}
