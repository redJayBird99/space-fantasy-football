import { Player } from "./player";

// note instances of this class are saved as JSON on the user machine
export interface Contract {
  teamName: string;
  playerId: string;
  wage: number;
  duration: number; // in seasons
}

// note instances of this class are saved as JSON on the user machine
export class Team {
  name: string;
  playerIds: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  /**
    pick the best (according to player score) n players and add them to the team
    and return an array with the picked players
    @param n amount of player to pick, when n > players.length throw an error
  */
  static pickPlayers(tm: Team, players: Player[], n: number): Player[] {
    if (players.length < n) {
      throw new Error(`players have less than ${n} players`);
    }

    const picked = players
      .sort((p1, p2) => Player.getScore(p2) - Player.getScore(p1))
      .slice(0, n);
    picked.forEach((p) => Team.addPlayer(tm, p));
    return picked;
  }

  // add the player to the team
  static addPlayer(t: Team, p: Player): void {
    p.team = t.name;
    t.playerIds.push(p.id);
  }
}
