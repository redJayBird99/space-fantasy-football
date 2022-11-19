// because lit-html esm don't play nice with ts-jest it is separated from the router file
// we use jest only for unit testing, any page related testing will be delegated to cypress
import { html, TemplateResult } from "lit-html";
import { onLinkClick, resolvePublicPath } from "./router";

/** return a anchor element handled by the client side router,
 * if the href start with "/" it get substituted with the public path */
export function goLink(
  href: string,
  content: TemplateResult | string
): TemplateResult {
  return html`
    <a @click=${onLinkClick} href=${resolvePublicPath(href)}>${content}</a>
  `;
}
