import { html, TemplateResult } from "lit-html";
import { goLink } from "../util/go-link";

export function page404(): TemplateResult {
  return html`
    <main class="cnt-404">
      <h1 class="cnt-404__head">Not Found (404)</h1>
      <p class="cnt-404__content">
        <span>sorry, the page you are looking for does not exist</span>
        <span>return to the ${goLink("/", "home page")}</span>
      </p>
    </main>
  `;
}
