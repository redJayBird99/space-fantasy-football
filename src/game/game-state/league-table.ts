import { Match } from "../game-sim/tournament-scheduler";

export class Entry {
  teamName: string;
  played = 0;
  won = 0;
  drawn = 0;
  lost = 0;
  points = 0;
  goalsFor = 0;
  goalsAgainst = 0;

  constructor(teamName: string) {
    this.teamName = teamName;
  }
}

interface EntryResult {
  state: "won" | "drawn" | "lost";
  points: number;
}

const WIN: EntryResult = { state: "won", points: 3 };
const DRAW: EntryResult = { state: "drawn", points: 1 };
const LOSE: EntryResult = { state: "lost", points: 0 };

interface EntryResults {
  home: EntryResult;
  away: EntryResult;
}

export class LeagueTable {
  private entries = new Map<string, Entry>();

  constructor(matches: Match[]) {
    matches.forEach((m) => this.addMatchResult(m));
  }

  private addEntry(teamName: string): void {
    if (!this.entries.has(teamName)) {
      this.entries.set(teamName, new Entry(teamName));
    }
  }

  // if the team entry doesn't exist get created
  private getEntry(teamName: string): Entry {
    this.addEntry(teamName);
    return this.entries.get(teamName)!;
  }

  // get all table entries sorted by points in descending order
  getSortedTable(): Entry[] {
    return [...this.entries.values()].sort((a, b) => b.points - a.points);
  }

  // add the teams to the entries and when the match has a result updates the
  // team entries stats
  private addMatchResult(m: Match): void {
    const homeEntry = this.getEntry(m.home);
    const awayEntry = this.getEntry(m.away);

    if (m.result) {
      const tbRst = processResult(m.result);

      homeEntry.goalsFor += m.result.home;
      awayEntry.goalsFor += m.result.away;
      homeEntry.goalsAgainst += m.result.away;
      awayEntry.goalsAgainst += m.result.home;
      homeEntry.played++;
      awayEntry.played++;

      homeEntry[tbRst.home.state]++;
      homeEntry.points += tbRst.home.points;
      awayEntry[tbRst.away.state]++;
      awayEntry.points += tbRst.away.points;
    }
  }
}

// returns the resulting team infos from the given Match result
export function processResult(r: { home: number; away: number }): EntryResults {
  if (r.home > r.away) {
    return { home: WIN, away: LOSE };
  } else if (r.home < r.away) {
    return { home: LOSE, away: WIN };
  }

  return { home: DRAW, away: DRAW };
}
