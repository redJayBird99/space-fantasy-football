import { Player } from "./player";

// note instances of this class are saved as JSON on the user machine
export class Team {
  name: string;
  playerIds: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  /**
    pick the best (according to player score) n players and add them to the team
    @param n amount of player to pick, when n > players.length throw an error
  */
  static pickPlayers(tm: Team, players: Player[], n: number): void {
    if (players.length < n) {
      throw new Error(`players have less than ${n} players`);
    }

    players
      .sort((p1, p2) => Player.getScore(p2) - Player.getScore(p1))
      .forEach((p, i) => {
        if (i < n) {
          p.team = tm.name;
          tm.playerIds.push(p.id);
        }
      });
  }
}
