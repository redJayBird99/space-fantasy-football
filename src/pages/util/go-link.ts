// because lit-html esm don't play nice with ts-jest it is separated from the router file
// we use jest only for unit testing, any page related testing will be delegated to cypress
import { html, TemplateResult } from "lit-html";
import { handleLinkClick } from "./router";

/** get a sff-go element with the given url and a nested anchor */
export function goLink(
  href: string,
  content: TemplateResult | string
): TemplateResult {
  return html` <a @click=${handleLinkClick} href=${href}>${content}</a> `;
}
