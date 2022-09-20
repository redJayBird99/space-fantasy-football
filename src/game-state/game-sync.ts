// TODO testing

import { GameState } from "./game-state";

interface Message {
  gs?: GameState;
  timeoutID?: ReturnType<typeof setTimeout>;
}

let BChannel: BroadcastChannel | null;
let bcState: "sending" | "receiving" | "idle" = "idle";
const mx: Message = {};

try {
  /** sync the tabs games when the gameState is updated, the game state will be
   * sended only if there is at least another page open with the same game,
   * so basically we ask first if anyone needs it */
  BChannel = new BroadcastChannel("sync-game");
  BChannel!.onmessage = (e) => {
    const localGameName = window.$game.state?.name;
    const type = e.data.type;

    if (type === "gameUpdate" && e.data.name === localGameName) {
      // respond to the notification asking to send the game state
      bcState = "receiving";
      BChannel?.postMessage({ type: "sendGameUpdate" });
    } else if (type === "sendGameUpdate" && bcState === "sending") {
      // respond to the request sending the game state
      clearTimeout(mx.timeoutID);
      BChannel?.postMessage({ type: "gameState", state: mx.gs });
      bcState = "idle";
      mx.gs = undefined;
    } else if (type === "gameState") {
      // handle the received game state
      window.$game.onSyncGameUpdate(e.data.state);
      bcState = "idle";
    }
  };
} catch (e: any) {
  // just to make jest shut up
}

/** send the given game to any other page with the same game open */
export function sendSyncUpdatedGame(gs: GameState) {
  if (bcState === "receiving") {
    return; // when busy, the first caller win
  }

  clearTimeout(mx.timeoutID); // clean when it was already trying to send something
  bcState = "sending";
  mx.gs = gs;
  BChannel?.postMessage({ type: "gameUpdate", name: gs.name });

  mx.timeoutID = setTimeout(() => {
    bcState = "idle";
  }, 50); // close when no one responded, the timing could be tricky
}
