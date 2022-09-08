import { html, render } from "lit-html";
import style from "./modal.css";

/**
 * on close dispatch a "closeModal" customElement
 * the given data-id attribute is added to the detail propery
 * the actual removal of this element should be handled by the parent node
 * css --modal-container-flex: set the container flex property
 * css --modal-bg-color: background color of the modal
 * css --modal-container-bg-color: background color of the content container
 * css --modal-close-btn-bg-color: close button background color
 * css --modal-close-btn-color: button color
 */
class Modal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      document.body.style.overflow = "hidden";
      this.render();
    }
  }

  disconnectedCallback() {
    document.body.style.removeProperty("overflow");
  }

  handleClose = () => {
    this.dispatchEvent(
      new CustomEvent("closeModal", {
        bubbles: true,
        composed: true,
        detail: { id: this.dataset.id },
      })
    );
  };

  private render() {
    render(
      html`
        <style>
          ${style}
        </style>
        <div class="container">
          <button
            class="close-btn"
            aria-label="close modal"
            @click=${this.handleClose}
          >
            &#10008;
          </button>
          <slot></slot>
        </div>
      `,
      this.shadowRoot!
    );
  }
}

if (!customElements.get("sff-modal")) {
  customElements.define("sff-modal", Modal);
}