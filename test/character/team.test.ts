import * as _t from "../../src/character/team";
import * as _p from "../../src/character/player";
import * as _gs from "../../src/game-state/game-state";
import { mean } from "../../src/util/generator";

const areas = Object.keys(_p.positionArea) as _p.PositionArea[];
const createPlayers = (area: _p.PositionArea, n: number) =>
  Array.from({ length: n }, () => _p.Player.createPlayerAt(new Date(), area));

const rdmPlayers = (n: number) => {
  const rdmArea = () => areas[Math.floor(Math.random() * areas.length)];
  return Array.from({ length: n }, () =>
    _p.Player.createPlayerAt(new Date(), rdmArea())
  );
};

describe("signContract()", () => {
  const st = new _gs.GameState(new Date());
  const team = new _t.Team("Smokers");
  const pl = new _p.Player("am", new Date());
  const c = _t.signContract(st, team, pl);

  test("save a new contract to the gameState", () => {
    expect(_gs.GameState.getContract(st, pl)).toEqual(c);
  });

  test("the contract duration should be greater than or equal 1", () => {
    expect(c.duration).toBeGreaterThanOrEqual(1);
  });

  test("the contract duration should be less than or equal 5", () => {
    expect(c.duration).toBeLessThanOrEqual(5);
  });

  test("should have the id of the player", () => {
    expect(c.playerId).toBe(pl.id);
  });

  test("should have the name of the team", () => {
    expect(c.teamName).toBe(team.name);
  });
});

describe("Team.signPlayer()", () => {
  const st = new _gs.GameState(new Date());
  const team = new _t.Team("Smokers");
  const pl = new _p.Player("cm", new Date());
  const c = _t.Team.signPlayer(st, team, pl);

  test("should add the player id to the team", () => {
    expect(team.playerIds).toContainEqual(pl.id);
  });

  test("should set player.team to the team name", () => {
    expect(pl.team).toBe("Smokers");
  });

  test("should add the contract to the gameState", () => {
    expect(_gs.GameState.getContract(st, pl)).toEqual(c);
  });

  test("when called twice shouldn't duplicate the player id stored", () => {
    _t.Team.signPlayer(st, team, pl);
    expect(team.playerIds).toEqual([pl.id]);
  });
});

describe("Team.unsignPlayer()", () => {
  const st = new _gs.GameState(new Date());
  const pl = new _p.Player("lm", new Date());
  const team = new _t.Team("Smokers");
  st.teams.Smokers = team;
  st.players[pl.id] = pl;
  _t.Team.unsignPlayer(st, _t.Team.signPlayer(st, team, pl));

  test("should remove the player id from the team", () => {
    expect(team.playerIds).not.toContainEqual(pl.id);
  });

  test("should set the player.team to free agent", () => {
    expect(pl.team).toBe("free agent");
  });

  test("should remove the contract from the gameState", () => {
    expect(_gs.GameState.getContract(st, pl)).not.toBeDefined();
  });
});

describe("RatingAreaByNeed", () => {
  describe(".goolkeeper", () => {
    test("should be 1 when there is no goolkeeper", () => {
      const ratings = new _t.RatingAreaByNeed([]);
      expect(ratings.goolkeeper).toBe(1);
    });

    test("should be 0 when there are 3 goolkeepers", () => {
      const ratings = new _t.RatingAreaByNeed(createPlayers("goolkeeper", 3));
      expect(ratings.goolkeeper).toBe(0);
    });

    test("should be 0 when there are more than 3 goolkeepers", () => {
      const ratings = new _t.RatingAreaByNeed(createPlayers("goolkeeper", 4));
      expect(ratings.goolkeeper).toBe(0);
    });
  });

  describe(".defender", () => {
    test("should be 1 when there is no defender", () => {
      const ratings = new _t.RatingAreaByNeed([]);
      expect(ratings.defender).toBe(1);
    });

    test("should be 0 when there are 8 defender", () => {
      const ratings = new _t.RatingAreaByNeed(createPlayers("defender", 8));
      expect(ratings.defender).toBe(0);
    });

    test("should be 0 when there are more than 8 defender", () => {
      const ratings = new _t.RatingAreaByNeed(createPlayers("defender", 9));
      expect(ratings.defender).toBe(0);
    });
  });

  describe(".midfielder", () => {
    test("should be 1 when there is no midfielder", () => {
      const ratings = new _t.RatingAreaByNeed([]);
      expect(ratings.midfielder).toBe(1);
    });

    test("should be 0 when there are 8 midfielder", () => {
      const ratings = new _t.RatingAreaByNeed(createPlayers("midfielder", 8));
      expect(ratings.midfielder).toBe(0);
    });

    test("should be 0 when there are more than 8 midfielder", () => {
      const ratings = new _t.RatingAreaByNeed(createPlayers("midfielder", 9));
      expect(ratings.midfielder).toBe(0);
    });
  });

  describe(".forward", () => {
    test("should be 1 when there is no forward", () => {
      const ratings = new _t.RatingAreaByNeed([]);
      expect(ratings.forward).toBe(1);
    });

    test("should be 0 when there are 6 midfielder", () => {
      const ratings = new _t.RatingAreaByNeed(createPlayers("forward", 6));
      expect(ratings.forward).toBe(0);
    });

    test("should be 0 when there are more than 6 midfielder", () => {
      const ratings = new _t.RatingAreaByNeed(createPlayers("forward", 7));
      expect(ratings.forward).toBe(0);
    });
  });
});

describe("teamSignPlayerProbability()", () => {
  const rtgs = { goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  const pl = new _p.Player("am", new Date(), 28);
  const pls = rdmPlayers(20);

  test("should return a value greater than or equal 0", () => {
    pls.forEach((p) =>
      expect(_t.teamSignPlayerProbability(p, rtgs)).toBeGreaterThanOrEqual(0)
    );
  });

  test("should return a value less than or equal 1", () => {
    pls.forEach((p) =>
      expect(_t.teamSignPlayerProbability(p, rtgs)).toBeLessThanOrEqual(1)
    );
  });

  test("a player with score 70 should return 1", () => {
    Object.keys(pl.skills).forEach((k) => (pl.skills[k as _p.Skill] = 70));
    expect(_t.teamSignPlayerProbability(pl, rtgs)).toBe(1);
  });

  test("a player with score 40 should return 0 when the positionArea rating is 0", () => {
    Object.keys(pl.skills).forEach((k) => (pl.skills[k as _p.Skill] = 40));
    expect(_t.teamSignPlayerProbability(pl, rtgs)).toBe(0);
  });

  test("a player with score 40 should return 0.2 when the positionArea rating is 1", () => {
    Object.keys(pl.skills).forEach((k) => (pl.skills[k as _p.Skill] = 40));
    const rtgs = { goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
    expect(_t.teamSignPlayerProbability(pl, rtgs)).toBeCloseTo(0.2);
  });
});

describe("ratingPlayerByNeed()", () => {
  const rtgs = { goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  const pls = rdmPlayers(20).sort(
    (p1, p2) => _p.Player.getScore(p2) - _p.Player.getScore(p1)
  );
  const pl = new _p.Player("cf", new Date(), 28);

  test("rate the players according the score when no particular area is needed", () => {
    const pRatings = [...pls].sort(
      (a, b) => _t.ratingPlayerByNeed(b, rtgs) - _t.ratingPlayerByNeed(a, rtgs)
    );
    expect(pRatings).toEqual(pls);
  });

  test("should return a value greater than or equal 0", () => {
    pls.forEach((p) =>
      expect(_t.ratingPlayerByNeed(p, rtgs)).toBeGreaterThanOrEqual(0)
    );
  });

  test("should return a value less than or equal 5", () => {
    pls.forEach((p) =>
      expect(_t.ratingPlayerByNeed(p, rtgs)).toBeLessThanOrEqual(5)
    );
  });

  test("a player with MAX score should return 4 when the positionArea rating is 0", () => {
    Object.keys(pl.skills).forEach(
      (k) => (pl.skills[k as _p.Skill] = _p.MAX_SKILL)
    );
    expect(_t.ratingPlayerByNeed(pl, rtgs)).toBeCloseTo(4);
  });

  test("a player with MAX score should return 5 when the positionArea rating is 1", () => {
    const rtgs = { goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
    Object.keys(pl.skills).forEach(
      (k) => (pl.skills[k as _p.Skill] = _p.MAX_SKILL)
    );
    expect(_t.ratingPlayerByNeed(pl, rtgs)).toBeCloseTo(5);
  });

  test("a player with MIN score should return 0 when the positionArea rating is 0", () => {
    Object.keys(pl.skills).forEach(
      (k) => (pl.skills[k as _p.Skill] = _p.MIN_SKILL)
    );
    expect(_t.ratingPlayerByNeed(pl, rtgs)).toBeCloseTo(0);
  });

  test("a player with MAX score should return 1 when the positionArea rating is 1", () => {
    const rtgs = { goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
    Object.keys(pl.skills).forEach(
      (k) => (pl.skills[k as _p.Skill] = _p.MIN_SKILL)
    );
    expect(_t.ratingPlayerByNeed(pl, rtgs)).toBeCloseTo(1);
  });
});

describe("Team.getExipiringPlayers()", () => {
  const st = new _gs.GameState(new Date());
  _gs.initTeams(st, ["titans"]);
  const team = st.teams.titans;

  test("should return all expiring players", () => {
    Object.values(st.contracts).forEach((c) => (c.duration = 0));
    expect(_t.Team.getExipiringPlayers(st, team)).toEqual(
      _gs.GameState.getTeamPlayers(st, "titans")
    );
  });

  test("should return 0 players when no contract is expiring", () => {
    Object.values(st.contracts).forEach((c) => (c.duration = 1));
    expect(_t.Team.getExipiringPlayers(st, team)).toEqual([]);
  });
});

describe("Team.getNotExipiringPlayers()", () => {
  const st = new _gs.GameState(new Date());
  _gs.initTeams(st, ["titans"]);
  const team = st.teams.titans;

  test("should return all not expiring players", () => {
    Object.values(st.contracts).forEach((c) => (c.duration = 1));
    expect(_t.Team.getNotExipiringPlayers(st, team)).toEqual(
      _gs.GameState.getTeamPlayers(st, "titans")
    );
  });

  test("should return 0 players when all contracts are expiring", () => {
    Object.values(st.contracts).forEach((c) => (c.duration = 0));
    expect(_t.Team.getNotExipiringPlayers(st, team)).toEqual([]);
  });
});

describe("Team.renewExipiringContracts()", () => {
  const st = new _gs.GameState(new Date());
  _gs.initTeams(st, ["a"]);
  Object.values(st.contracts).forEach((c) => (c.duration = 0));
  _t.Team.renewExipiringContracts(st, st.teams.a);
  const renewed = _t.Team.getNotExipiringPlayers(st, st.teams.a);
  const expired = _t.Team.getExipiringPlayers(st, st.teams.a);

  test("should renew most players when the team is short of Players", () => {
    expect(renewed.length).toBeGreaterThan(expired.length);
  });

  test("renewed players should have a mean score greater than unrenewed ones", () => {
    expect(mean(renewed.map((p) => _p.Player.getScore(p)))).toBeGreaterThan(
      mean(expired.map((p) => _p.Player.getScore(p)))
    );
  });
});

describe("initMoneyAmount()", () => {
  const min = 1_000;

  test("should never return a value less than min", () => {
    Array.from({ length: 10 }, () =>
      _t.initMoneyAmount("verySmall", min)
    ).forEach((amount) => {
      expect(amount).toBeGreaterThanOrEqual(min);
    });
  });

  test("should return a larger amount for a small fanbase respect to a very small one", () => {
    expect(_t.initMoneyAmount("small", min)).toBeGreaterThan(
      _t.initMoneyAmount("verySmall", min)
    );
  });

  test("should return a larger amount for a medium fanbase respect to a small one", () => {
    expect(_t.initMoneyAmount("medium", min)).toBeGreaterThan(
      _t.initMoneyAmount("small", min)
    );
  });

  test("should return a larger amount for a big fanbase respect to a medium one", () => {
    expect(_t.initMoneyAmount("big", min)).toBeGreaterThan(
      _t.initMoneyAmount("medium", min)
    );
  });

  test("should return a larger amount for a huge fanbase respect to a big one", () => {
    expect(_t.initMoneyAmount("huge", min)).toBeGreaterThan(
      _t.initMoneyAmount("big", min)
    );
  });
});

describe("Team.getWagesAmount()", () => {
  const st = new _gs.GameState(new Date());
  _gs.initTeams(st, ["titans"]);
  const cts = _t.Team.getNotExipiringPlayers(st, st.teams.titans).map((p) =>
    _gs.GameState.getContract(st, p)
  );

  test("should return the sum of every wage", () => {
    cts.forEach((c) => c && (c.wage = 100));
    expect(_t.Team.getWagesAmount(st, st.teams.titans)).toBe(100 * cts.length);
  });
});

describe("Team.getMonthlyExpenses()", () => {
  const st = new _gs.GameState(new Date());
  _gs.initTeams(st, ["a"]);
  const cts = _t.Team.getNotExipiringPlayers(st, st.teams.a).map((p) =>
    _gs.GameState.getContract(st, p)
  );

  test("should return the sum of every wage with all other expenses", () => {
    cts.forEach((c) => c && (c.wage = 100));
    const { health, facilities, scouting } = st.teams.a.finances;
    expect(_t.Team.getMonthlyExpenses(st, st.teams.a)).toBe(
      100 * cts.length + health + facilities + scouting
    );
  });
});
