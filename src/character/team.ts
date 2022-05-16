import { Player } from "./player";
import { GameState } from "../game-state/game-state";

// note instances of this class are saved as JSON on the user machine
interface Contract {
  teamName: string;
  playerId: string;
  wage: number;
  duration: number; // in seasons
}

// note instances of this class are saved as JSON on the user machine
class Team {
  name: string;
  playerIds: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  // add the player to the team and the signed contract to the gameState
  // returns the signed Contract
  static signPlayer(gs: GameState, t: Team, p: Player): Contract {
    p.team = t.name;
    t.playerIds.includes(p.id) || t.playerIds.push(p.id);
    return signContract(gs, t, p);
  }

  // remove the player from the team and delete the contract from the gameState
  static unsignPlayer(gs: GameState, c: Contract): void {
    const team = gs.teams[c.teamName];
    const player = gs.players[c.playerId];
    player.team = "free agent";
    team.playerIds = team.playerIds.filter((id) => id !== player.id);
    GameState.deleteContract(gs, c);
  }
}

// creates new contracts for the given player and save it to the gameState,
// the min contrat duration is 1 max 5
function signContract(s: GameState, t: Team, p: Player): Contract {
  const c = {
    teamName: t.name,
    playerId: p.id,
    wage: Player.wantedWage(p),
    duration: Math.floor(Math.random() * 5) + 1,
  };
  GameState.saveContract(s, c);

  return c;
}

export { Contract, Team, signContract };
