import { GameState, GameStateHandle } from "./game-state/game-state";

const gs = new GameStateHandle(GameState.init());
const pre = document.createElement("pre");
pre.textContent = JSON.stringify(gs.state, null, 4);
document.body.append(pre);

window.$_game = gs;
