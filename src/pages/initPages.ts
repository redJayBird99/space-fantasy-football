import { init } from "./util/router";
import defineComponents from "./define-components";
import { html } from "lit-html";
import { page404 } from "./common/page-404";
import { injectStyleSheet } from "./style-sheets";

/** this function is specifically to handle a customized redirection from the 404 github pages,
 * because gitHub pages doesn't support Single Page Apps we need some hacks
 *
 * when the 404 page get hit, it redirects the request to the index page,
 * but to do that the original path is converted as a query string, this function
 * take care of reconstructing the original requested url, only if "gh-path" query exists
 *
 * as reference https://github.com/rafgraph/spa-github-pages/blob/gh-pages/404.html
 * the idea is basically the the same
 */
function handleGitHubPages404Redirection() {
  const prs = new URLSearchParams(location.search);
  const path = prs.get("gh-path");

  if (path) {
    prs.delete("gh-path");
    history.replaceState({}, "", path + "?" + prs.toString() + location.hash);
  }
}

export default function initPages(): void {
  defineComponents();
  document.documentElement.classList.add("dark");
  injectStyleSheet();
  const root = document.createElement("div");
  const modalRoot = (window.$modalRoot = document.createElement("div"));
  document.body.append(root, modalRoot);

  init(
    root,
    [
      {
        path: `${window.$PUBLIC_PATH}`,
        content: () => html`<sff-home></sff-home>`,
      },
      {
        path: `${window.$PUBLIC_PATH}:gName/*`,
        content: (m) => html`<sff-game-page .match=${m}></sff-game-page>`,
      },
    ],
    page404(),
    handleGitHubPages404Redirection
  );
}
