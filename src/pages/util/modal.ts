import { html, render } from "lit-html";
import { createRef, Ref, ref } from "lit-html/directives/ref.js";
import { mainStyleSheet } from "../style-sheets";
import style from "./modal.css";

/**
 * on close dispatch a "closeModal" customElement
 * the given data-id attribute is added to the detail property
 * @param {(id?: string) => unknown} closeHandler called on close click
 *
 * there are two slot one named title and another without any name for the content,
 *
 * if there is any child with the class "dig-label" its text content will be used as the dialog label
 *
 * the actual removal of this element should be handled by the parent node
 * @param css variable --modal-bg-color: background color of the modal dialog
 * @param css variable --backdrop-color: the backdrop color underneath the dialog
 * @param css variable --close-btn-bg-color: close button background color
 * @param css variable --close-btn-color: button color
 */
class Modal extends HTMLElement {
  private closeHandler?: (id?: string) => unknown;
  private dialogRef: Ref<HTMLDialogElement> = createRef();

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  handleClose = () => {
    this.dialogRef.value!.close();
    this.closeHandler?.(this.dataset.id);
    this.dispatchEvent(
      new CustomEvent("closeModal", {
        bubbles: true,
        composed: true,
        detail: { id: this.dataset.id },
      })
    );
  };

  private render(): void {
    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        <dialog ${ref(this.dialogRef)} @close=${this.handleClose}>
          <header class="dig-head">
            <slot name="title"></slot>
            <button
              autofocus
              class="btn-close self-center"
              aria-label="close modal"
              @click=${this.handleClose}
            ></button>
          </header>
          <slot></slot>
        </dialog>
      `,
      this.shadowRoot!
    );
    this.openDialog();
  }

  openDialog(): void {
    const dig = this.dialogRef.value!;
    dig.setAttribute(
      "aria-label",
      this.querySelector(".dig-label")?.textContent ?? ""
    );

    if (!dig.open) {
      dig.classList.add("opening-dig");
      dig.showModal();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => dig.classList.remove("opening-dig"))
      );
    }
  }
}

export default function define(): void {
  if (!customElements.get("sff-modal")) {
    customElements.define("sff-modal", Modal);
  }
}
