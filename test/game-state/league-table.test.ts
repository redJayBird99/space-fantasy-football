import {
  processResult,
  LeagueTable,
  Entry,
} from "../../src/game-state/league-table";

describe("processResult()", () => {
  test("when home has more goals should be the winner", () => {
    expect(processResult({ home: 3, away: 1 })).toEqual({
      home: { state: "won", points: 3 },
      away: { state: "lost", points: 0 },
    });
  });

  test("when away has more goals should be the loser", () => {
    expect(processResult({ home: 2, away: 5 })).toEqual({
      home: { state: "lost", points: 0 },
      away: { state: "won", points: 3 },
    });
  });

  test("when both teams have the same amount of goals get a draw", () => {
    expect(processResult({ home: 0, away: 0 })).toEqual({
      home: { state: "draws", points: 1 },
      away: { state: "draws", points: 1 },
    });
  });
});

describe("LeagueTable", () => {
  const date = new Date();
  const notPlayed = [
    { date, id: "...", home: "a", away: "b" },
    { date, id: "...", home: "c", away: "d" },
  ];
  const played = [
    { date, id: "...", home: "a", away: "b", result: { home: 3, away: 1 } },
    { date, id: "...", home: "c", away: "d", result: { home: 1, away: 1 } },
  ];

  test("should create a empty table when no match is given", () => {
    expect(new LeagueTable([]).getSortedTable()).toEqual([]);
  });

  test("should create a table with empty stats when the given matches don't have a result", () => {
    const table = new LeagueTable(notPlayed).getSortedTable();
    expect(table).toContainEqual(new Entry("a"));
    expect(table).toContainEqual(new Entry("b"));
    expect(table).toContainEqual(new Entry("c"));
    expect(table).toContainEqual(new Entry("d"));
  });

  test("should create a table with stats filled by the match results", () => {
    const table = new LeagueTable(played).getSortedTable();
    expect(table).toContainEqual({
      teamName: "a",
      played: 1,
      won: 1,
      draws: 0,
      lost: 0,
      points: 3,
      goalsFor: 3,
      goalsAgainst: 1,
    });
    expect(table).toContainEqual({
      teamName: "b",
      played: 1,
      won: 0,
      draws: 0,
      lost: 1,
      points: 0,
      goalsFor: 1,
      goalsAgainst: 3,
    });
    expect(table).toContainEqual({
      teamName: "c",
      played: 1,
      won: 0,
      draws: 1,
      lost: 0,
      points: 1,
      goalsFor: 1,
      goalsAgainst: 1,
    });
    expect(table).toContainEqual({
      teamName: "d",
      played: 1,
      won: 0,
      draws: 1,
      lost: 0,
      points: 1,
      goalsFor: 1,
      goalsAgainst: 1,
    });
  });

  describe(".getSortedTable()", () => {
    test("should return a table sorted by points", () => {
      const table = new LeagueTable(played).getSortedTable();

      for (let i = 0; i < table.length - 1; i++) {
        expect(table[i].points).toBeGreaterThanOrEqual(table[i + 1].points);
      }
    });
  });
});
