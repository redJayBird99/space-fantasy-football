import { init } from "./util/router";
import defineComponents from "./define-components";
import style from "./index.css";
import { html } from "lit-html";

export default function initPages(): void {
  defineComponents();
  document.documentElement.classList.add("dark");
  document.head.insertAdjacentHTML("beforeend", `<style>${style}</style>`);
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
    html`<div>404 page no found</div>`
  );
}
