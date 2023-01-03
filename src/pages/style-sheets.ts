import rootCss from "./index.css";
import mainCss from "./util/main.css";

/** note we are not using CSSStyleSheet because it is sill not supported by
 * every browser, instead inject the style sheet inline into the shadowDom */
export const rootStyleSheet = createStyleSheet(rootCss);
export const mainStyleSheet = createStyleSheet(mainCss);

/** inject the main Style sheets on the document */
export function injectStyleSheet() {
  document.head.append(rootStyleSheet, mainStyleSheet);
}

function createStyleSheet(style: string) {
  const s = document.createElement("style");
  s.textContent = style;
  return s;
}
