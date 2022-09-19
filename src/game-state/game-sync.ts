// TODO testing

import { GameState } from "./game-state";

interface Message {
  gs?: GameState;
  timeoutID?: ReturnType<typeof setTimeout>;
}

let BChannel: BroadcastChannel | null;
const bcState = { receiving: false, sending: false };
const mx: Message = {};

try {
  /** sync the tabs games when the gameState is updated, the game state will be
   * sended only if there is at least another page open with the same game,
   * so basically we ask first if anyone needs it */
  BChannel = new BroadcastChannel("sync-game");
  BChannel!.onmessage = (e) => {
    const localGameName = window.$game.state?.name;

    if (e.data.type === "gameUpdate" && e.data.name === localGameName) {
      // respond to the notification asking to send the game state
      bcState.receiving = true;
      BChannel?.postMessage({ type: "sendGameUpdate" });
    } else if (e.data.type === "sendGameUpdate" && bcState.sending) {
      // respond to the request sending the game state
      BChannel?.postMessage({ type: "gameState", state: mx.gs });
      bcState.sending = false;
      mx.gs = undefined;
      clearTimeout(mx.timeoutID);
    } else if (e.data.type === "gameState") {
      // handle the received game state
      window.$game.onSyncGameUpdate(e.data.state);
      bcState.receiving = false;
    }
  };
} catch (e: any) {
  // just to make jest shut up
}

/** send the given game to any other page with the same game open */
export function sendSyncUpdatedGame(gs: GameState) {
  if (bcState.receiving) {
    return; // when busy, the first caller win
  }

  clearTimeout(mx.timeoutID); // clean when it was already trying to send something
  bcState.sending = true;
  mx.gs = gs;
  BChannel?.postMessage({ type: "gameUpdate", name: gs.name });

  mx.timeoutID = setTimeout(() => {
    bcState.sending = false;
  }, 60); // close when no one responded, the timing could be tricky
}
