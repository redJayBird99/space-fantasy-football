import { html, render } from "lit-html";
import { mainStyleSheet } from "../style-sheets";
import style from "./layout.css";
import { afterRouteLeave } from "./router";

class Layout extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      afterRouteLeave.add(this);
      this.render();
    }
  }

  disconnectedCallback() {
    afterRouteLeave.delete(this);
  }

  /** after the router has completed its job and the page is rendered, it is time
   * to close the mobile nav (if it is open), it look nicer than closing the nav
   * on the click right away
   *
   * if the routing take to much for a given page, break the page load in async smaller tasks
   * */
  onRouteLeave() {
    if (
      !this.shadowRoot!.querySelector("#js-nav")?.classList.contains(
        "mb-nav-close"
      )
    ) {
      this.toggleNav();
    }
  }

  /** toggle the mb-nav-close btn, opening and closing the nav bar */
  toggleNav = () => {
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
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        <header>
          <slot name="in-header"></slot>
          <button class="btn-toggle-nav" @click=${this.toggleNav}>
            <span>☰</span>
          </button>
        </header>
        <nav id="js-nav" class="mb-nav-close">
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
