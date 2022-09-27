import { GameStateHandle } from "./game-state/game-state";
import { appState } from "./app-state/app-state";
import { Router } from "./pages/util/router";
import "./pages/home/home.ts";
import "./pages/dashboard/dashboard.ts";
import "./pages/players/players-page.ts";
import "./pages/players/player-page.ts";
import "./pages/tables/league.ts";
import "./pages/inbox/inbox-page.ts";
import "./pages/team/team-page.ts";
import "./pages/finances/finances-page.ts";
import "./pages/transactions/transactions.ts";
import style from "./index.css";

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    $game: GameStateHandle;
    $appState: typeof appState;
    $PUBLIC_PATH: string;
  }
}

window.$appState = appState;
window.$game = new GameStateHandle();
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
    {
      path: `${window.$PUBLIC_PATH}players`,
      page: "<sff-players></sff-players>",
    },
    {
      path: `${window.$PUBLIC_PATH}players/player`,
      page: "<sff-player></sff-player>",
    },
    {
      path: `${window.$PUBLIC_PATH}league`,
      page: "<sff-league></sff-league>",
    },
    {
      path: `${window.$PUBLIC_PATH}inbox`,
      page: "<sff-inbox-page></sff-inbox-page>",
    },
    {
      path: `${window.$PUBLIC_PATH}team`,
      page: "<sff-team></sff-team>",
    },
    {
      path: `${window.$PUBLIC_PATH}finances`,
      page: "<sff-team-finances></sff-team-finances>",
    },
    {
      path: `${window.$PUBLIC_PATH}transactions`,
      page: "<sff-transactions></sff-transactions>",
    },
  ])
  .renderPage();
