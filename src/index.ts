import { GameStateHandle } from "./game-state/game-state";
import { appState } from "./app-state/app-state";
import { Router } from "./pages/util/router";
import "./pages/home/home.ts";
import "./pages/dashboard/dashboard.ts";
import style from "./index.css";

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    $GAME: GameStateHandle;
    $appState: typeof appState;
    $PUBLIC_PATH: string;
  }
}

window.$appState = appState;
window.$GAME = new GameStateHandle();
window.$PUBLIC_PATH = "/github/";

document.documentElement.classList.add("dark");
document.head.insertAdjacentHTML("beforeend", `<style>${style}</style>`);

new Router(document.body, "<div>404 page no found</div>")
  .addRoutes([
    { path: `${window.$PUBLIC_PATH}`, page: "<sff-home></sff-home>" },
    {
      path: `${window.$PUBLIC_PATH}dashboard`,
      page: "<sff-dashboard></sff-dashboard>",
    },
  ])
  .renderPage();
