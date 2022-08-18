import { GameStateHandle } from "./game-state/game-state";
import { html, render } from "lit-html";
import "./pages/home";

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    $GAME: GameStateHandle;
  }
}

window.$GAME = new GameStateHandle();
window.$GAME.newGame();

render(html`<sff-home></sff-home>`, document.body);
