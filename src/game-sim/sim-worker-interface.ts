import { Formation } from "../character/formation";
import { Player } from "../character/player";
import { GameState } from "../game-state/game-state";

type tForms = { [team: string]: Formation };
const worker = new Worker("sim-worker.js"); // to offload some heavy tasks

/** get new formations for each team in gs, trying to find the best lineup. */
export async function fetchNewFormations(gs: GameState): Promise<tForms> {
  return new Promise((resolve) => {
    worker.onmessage = (e) => {
      worker.onmessage = null;
      resolve(e.data);
    };
    worker.postMessage({ type: "getFormations", teams: teamsAndPlayers(gs) });
  });
}

/** convert the gameState teams to {team : players} pairings */
function teamsAndPlayers(gs: GameState): { [team: string]: Player[] } {
  const rst: { [team: string]: Player[] } = {};

  for (const team in gs.teams) {
    rst[team] = GameState.getTeamPlayers(gs, team);
  }

  return rst;
}
