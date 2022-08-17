import { GameState, GameStateHandle } from "./game-state/game-state";
import { html, render } from "lit-html";

const gs = new GameStateHandle(GameState.init());

render(html`<pre>${JSON.stringify(gs.state, null, 4)}</pre>`, document.body);

window.$_game = gs;
