import { createId, shuffle } from "../../util/generator";

type MatchPair = [string, string];

export type Match = {
  id: string;
  result?: { home: number; away: number };
  date: Date;
  home: string;
  away: string;
};

interface Round {
  date: Date;
  matches: Match[];
}

// it creates a complete double round season with a week of distance between games
// starting from the given staring date
export class Schedule {
  rounds: Round[];
  startDate: Date;

  constructor(teams: string[], start: Date) {
    if (teams.length % 2 === 1) {
      throw new Error("the numbers of teams can't be odd");
    }

    this.startDate = start;
    this.rounds = createDoubleRoundsTournament(teams).map((round, i) => {
      const date = new Date(start.getTime());
      date.setDate(start.getDate() + i * 7);
      return {
        date,
        matches: round.map(([home, away]) => ({
          id: createId(),
          date,
          home,
          away,
        })),
      };
    });
  }
}

// https://en.wikipedia.org/wiki/Round-robin_tournament
// returns a double round-robin schedule of a tournament alternating away and home games
export function createDoubleRoundsTournament(teams: string[]): MatchPair[][] {
  // alternate the original rounds otherwise we have long sequence of away and home games
  const schedule = createTournamentRounds(teams).map((rs, i) =>
    i % 2 === 0 ? rs : rs.map(([home, away]) => [away, home] as MatchPair)
  );
  return schedule.concat(
    schedule.map((round) => round.map(([home, away]) => [away, home]))
  );
}

// https://en.wikipedia.org/wiki/Round-robin_tournament
// returns a single round-robin schedule of a tournament, every call get a
// different combination of matches
export function createTournamentRounds(teams: string[]): MatchPair[][] {
  teams = shuffle([...teams]);
  const rounds = [];

  for (let round = 0; round < teams.length - 1; round++) {
    rounds.push(createRound(teams));
    teams = rotate(teams);
  }

  return rounds;
}

// a bit different implementation of https://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm
// return an array pairing teams from the start of first half with the end of the
// second half (teams[n] with teams[last - n])
export function createRound(teams: string[]): MatchPair[] {
  const round: MatchPair[] = [];

  for (let i = 0; i < teams.length / 2; i++) {
    round.push([teams[i], teams[teams.length - 1 - i]]);
  }

  return round;
}

// a bit different implementation of https://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm
// return a new array with moving every team in circle to the next index
// (loop back the last one), the only requirement is array[0] remaining fixed
// exp: ["a", "b", "c", "d"] => ["a", "d", "b", "c"]
export function rotate(teams: string[]): string[] {
  const rotated = [teams[0]];

  for (let i = 1; i < teams.length; i++) {
    // idx 0 is fixed only the rest can rotate
    rotated[(i + 1) % teams.length || 1] = teams[i];
  }

  return rotated;
}

/** check if the given team is part of the match */
export function playing(m: Match, team?: string): boolean {
  return m.home === team || m.away === team;
}
