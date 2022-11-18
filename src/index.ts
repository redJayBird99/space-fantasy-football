import appState from "./app-state/app-state";
import script from "./util/script";
import { GameStateHandle } from "./game-state/game-state";
import initPages from "./pages/initPages";

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    $game: GameStateHandle;
    $appState: typeof appState;
    $PUBLIC_PATH: string;
    $script: any; // utils for testing (and cheating)
    $modalRoot: HTMLElement;
  }
}

// @ts-ignore: Property 'UrlPattern' does not exist
if (!globalThis.URLPattern) {
  await import("urlpattern-polyfill");
}

window.$appState = appState;
window.$game = new GameStateHandle();
/** the currently given github page path */
window.$PUBLIC_PATH = "/space-fantasy-football/";
window.$script = script;
initPages();
