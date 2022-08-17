import { GameStateHandle } from "./game-state/game-state";
import { html, render } from "lit-html";

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    $GAME: GameStateHandle;
  }
}

window.$GAME = new GameStateHandle();
window.$GAME.newGame();

render(
  html`<pre>${JSON.stringify(window.$GAME.state, null, 4)}</pre>`,
  document.body
);
