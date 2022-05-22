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

function setSkillsTo(p: _p.Player, v: number): void {
  Object.keys(p.skills).forEach((k) => (p.skills[k as _p.Skill] = v));
}

function getContracts(st: _gs.GameState, team: _t.Team): _t.Contract[] {
  return _gs.GameState.getTeamPlayers(st, team.name).map(
    (p) => _gs.GameState.getContract(st, p)!
  );
}

let st = new _gs.GameState(new Date());
let team = st.teams.titans;

beforeEach(() => {
  st = new _gs.GameState(new Date());
  _gs.initTeams(st, ["a"]);
  team = st.teams.a;
});

describe("signContract()", () => {
  const pl = new _p.Player("am", new Date());

  test("save a new contract to the gameState", () => {
    const c = _t.signContract(st, team, pl);
    expect(_gs.GameState.getContract(st, pl)).toEqual(c);
  });

  test("the contract duration should be greater than or equal 1", () => {
    const c = _t.signContract(st, team, pl);
    expect(c.duration).toBeGreaterThanOrEqual(1);
  });

  test("the contract duration should be less than or equal 5", () => {
    const c = _t.signContract(st, team, pl);
    expect(c.duration).toBeLessThanOrEqual(5);
  });

  test("should have the id of the player", () => {
    const c = _t.signContract(st, team, pl);
    expect(c.playerId).toBe(pl.id);
  });

  test("should have the name of the team", () => {
    const c = _t.signContract(st, team, pl);
    expect(c.teamName).toBe(team.name);
  });
});

describe("Team.signPlayer()", () => {
  const pl = new _p.Player("cm", new Date());

  test("should add the player id to the team", () => {
    _t.Team.signPlayer(st, team, pl);
    expect(team.playerIds).toContainEqual(pl.id);
  });

  test("should set player.team to the team name", () => {
    _t.Team.signPlayer(st, team, pl);
    expect(pl.team).toBe(team.name);
  });

  test("should add the contract to the gameState", () => {
    const c = _t.Team.signPlayer(st, team, pl);
    expect(_gs.GameState.getContract(st, pl)).toEqual(c);
  });

  test("when called twice shouldn't duplicate the player id stored", () => {
    team.playerIds = [];
    _t.Team.signPlayer(st, team, pl);
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
  const pl = new _p.Player("am", new Date(), 28);
  let rtgs = {
    teamPlayers: rdmPlayers(1),
    goolkeeper: 0.1,
    defender: 0.1,
    midfielder: 0.1,
    forward: 0.1,
  };

  describe("when the area rating is 0.1", () => {
    const p = rtgs.teamPlayers[0];

    test("should return a value greater than or equal 0", () => {
      expect(_t.teamSignPlayerProbability(p, rtgs)).toBeGreaterThanOrEqual(0);
    });

    test("should return a value less than or equal 1", () => {
      expect(_t.teamSignPlayerProbability(p, rtgs)).toBeLessThanOrEqual(1);
    });

    test("a player with score 70 should return 1", () => {
      setSkillsTo(pl, 70);
      expect(_t.teamSignPlayerProbability(pl, rtgs)).toBe(1);
    });

    test("a player with score 52 should return 0.42", () => {
      setSkillsTo(pl, 52);
      expect(_t.teamSignPlayerProbability(pl, rtgs)).toBeCloseTo(0.42);
    });
  });

  describe("when the area rating is 0", () => {
    test("a player with score 70 should return 0.5", () => {
      rtgs = { ...rtgs, goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
      setSkillsTo(pl, 70);
      expect(_t.teamSignPlayerProbability(pl, rtgs)).toBe(0.5);
    });

    test("a player with score 40 should return 0", () => {
      setSkillsTo(pl, 40);
      expect(_t.teamSignPlayerProbability(pl, rtgs)).toBe(0);
    });
  });

  describe("when the area rating is 1", () => {
    test("a player with score 40 should return 0", () => {
      rtgs = { ...rtgs, goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
      setSkillsTo(pl, 40);
      expect(_t.teamSignPlayerProbability(pl, rtgs)).toBeCloseTo(0);
    });

    test("a player with score 52 should return 0.6", () => {
      setSkillsTo(pl, 52);
      expect(_t.teamSignPlayerProbability(pl, rtgs)).toBeCloseTo(0.6);
    });
  });
});

describe("ratingPlayerByNeed()", () => {
  const pl = new _p.Player("cf", new Date(), 28);
  const pls = rdmPlayers(20).sort(
    (p1, p2) => _p.Player.getScore(p2) - _p.Player.getScore(p1)
  );
  let rtgs = {
    teamPlayers: pls,
    goolkeeper: 0,
    defender: 0,
    midfielder: 0,
    forward: 0,
  };

  describe("when the area rating is 0", () => {
    test("rate the players according the score", () => {
      const pRatings = [...pls].sort(
        (a, b) =>
          _t.ratingPlayerByNeed(b, rtgs) - _t.ratingPlayerByNeed(a, rtgs)
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

    test("a player with MAX score should return 4", () => {
      setSkillsTo(pl, _p.MAX_SKILL);
      expect(_t.ratingPlayerByNeed(pl, rtgs)).toBeCloseTo(4);
    });

    test("a player with MIN score should return 0", () => {
      setSkillsTo(pl, _p.MIN_SKILL);
      expect(_t.ratingPlayerByNeed(pl, rtgs)).toBeCloseTo(0);
    });
  });

  describe("when the area rating is 1", () => {
    test("a player with MAX score should return 5", () => {
      rtgs = { ...rtgs, goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
      setSkillsTo(pl, _p.MAX_SKILL);
      expect(_t.ratingPlayerByNeed(pl, rtgs)).toBeCloseTo(5);
    });

    test("a player with MIN score should return 1", () => {
      setSkillsTo(pl, _p.MIN_SKILL);
      expect(_t.ratingPlayerByNeed(pl, rtgs)).toBeCloseTo(1);
    });
  });
});

describe("Team.getExipiringPlayers()", () => {
  test("should return all expiring players", () => {
    getContracts(st, team).forEach((c) => (c.duration = 0));
    expect(_t.Team.getExipiringPlayers(st, team)).toEqual(
      _gs.GameState.getTeamPlayers(st, team.name)
    );
  });

  test("should return 0 players when no contract is expiring", () => {
    getContracts(st, team).forEach((c) => (c.duration = 1));
    expect(_t.Team.getExipiringPlayers(st, team)).toEqual([]);
  });
});

describe("Team.getNotExipiringPlayers()", () => {
  test("should return all not expiring players", () => {
    getContracts(st, team).forEach((c) => (c.duration = 1));
    expect(_t.Team.getNotExipiringPlayers(st, team)).toEqual(
      _gs.GameState.getTeamPlayers(st, team.name)
    );
  });

  test("should return 0 players when all contracts are expiring", () => {
    getContracts(st, team).forEach((c) => (c.duration = 0));
    expect(_t.Team.getNotExipiringPlayers(st, team)).toEqual([]);
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

describe("luxuryTax()", () => {
  test("should return 0 when the payroll doesn't exceed the salary cap", () => {
    expect(_t.luxuryTax(_t.SALARY_CAP)).toBe(0);
  });

  test("should return a value greater 0 when the payroll exceed the salary cap", () => {
    expect(_t.luxuryTax(_t.SALARY_CAP + 100)).toBeGreaterThan(0);
  });

  test("larger is the payroll excess larger is the tax factor", () => {
    const taxFct1 = _t.luxuryTax(_t.SALARY_CAP + 10_000) / 10_000;
    const taxFct2 = _t.luxuryTax(_t.SALARY_CAP + 50_000) / 50_000;
    expect(taxFct2).toBeGreaterThan(taxFct1);
  });
});

describe("minimumSalaryTax()", () => {
  test("should return 0 when the payroll ins't below the min salary cap", () => {
    expect(_t.minSalaryTax(_t.MIN_SALARY_CAP)).toBe(0);
  });

  test("should return difference between the payroll and the min salary cap when below", () => {
    expect(_t.minSalaryTax(_t.MIN_SALARY_CAP - 10_000)).toBe(10_000);
  });
});

describe("Team.getWagesAmount()", () => {
  test("should return the sum of every wage", () => {
    const cts = getContracts(st, team);
    cts.forEach((c) => c && (c.wage = 100));
    expect(_t.Team.getWagesAmount(st, team)).toBe(100 * cts.length);
  });
});

describe("Team.getMonthlyExpenses()", () => {
  test("should return the sum of every wage with all other expenses and luxuryTax", () => {
    const { health, facilities, scouting } = team.finances;
    const wage = _t.SALARY_CAP / 10;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    const wages = wage * getContracts(st, team).length;
    expect(_t.Team.getMonthlyExpenses(st, team)).toBe(
      wages + _t.luxuryTax(wages) + health + facilities + scouting
    );
  });

  test("should return the sum of every wage with all other expenses and minSalaryTax", () => {
    const { health, facilities, scouting } = team.finances;
    const wage = _t.SALARY_CAP / 100;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    const wages = wage * getContracts(st, team).length;
    expect(_t.Team.getMonthlyExpenses(st, team)).toBe(
      wages + _t.minSalaryTax(wages) + health + facilities + scouting
    );
  });
});

describe("Team.canAfford()", () => {
  test("should return true when all expenses are small", () => {
    const wage = _t.MIN_SALARY_CAP / 24;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    expect(_t.Team.canAfford(st, team)(wage)).toBe(true);
  });

  test("should return true when all expenses are larger than the revenue but have a large enough budget", () => {
    const dif = team.finances.revenue - _t.Team.getMonthlyExpenses(st, team);
    team.finances.health += dif + _t.SALARY_CAP / 20;
    team.finances.budget = _t.SALARY_CAP;
    expect(_t.Team.canAfford(st, team)(_t.SALARY_CAP / 100)).toBe(true);
  });

  test("should return false when all expenses are larger than the revenue and the budget isn't larger enough", () => {
    const dif = team.finances.revenue - _t.Team.getMonthlyExpenses(st, team);
    team.finances.health += dif + _t.SALARY_CAP / 20;
    team.finances.budget = 0;
    expect(_t.Team.canAfford(st, team)(_t.SALARY_CAP / 100)).toBe(false);
  });

  test("should return false when a large luxury tax is applied and the budget isn't larger enough", () => {
    team.finances = {
      revenue: _t.SALARY_CAP,
      budget: _t.SALARY_CAP / 100,
      health: _t.SALARY_CAP / 100,
      scouting: _t.SALARY_CAP / 100,
      facilities: _t.SALARY_CAP / 100,
    };
    getContracts(st, team).forEach((c) => c && (c.wage = _t.SALARY_CAP / 15));
    expect(_t.Team.canAfford(st, team)(_t.SALARY_CAP / 15)).toBe(false);
  });
});

describe("teamShouldSign()", () => {
  const pl = new _p.Player("cf", new Date(), 28);
  setSkillsTo(pl, 70);
  let rtgs = {
    teamPlayers: rdmPlayers(30),
    goolkeeper: 0,
    defender: 0,
    midfielder: 0,
    forward: 0,
  };

  test("should return false when there are 30 and no particular position need", () => {
    expect(_t.teamShouldSign(pl, rtgs)).toBe(false);
  });

  test("should return true for a very good player when the team has less than 30 players and need the position", () => {
    rtgs.teamPlayers = rtgs.teamPlayers.slice(0, 10);
    rtgs = { ...rtgs, teamPlayers: rtgs.teamPlayers.slice(0, 10), forward: 1 };
    expect(_t.teamShouldSign(pl, rtgs)).toBe(true);
  });
});

describe("Team.renewExipiringContracts()", () => {
  test("should renew most players when the team is short of Players and can afford it", () => {
    team.finances.revenue = 3 * _t.SALARY_CAP;
    getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.renewExipiringContracts(st, team);
    const renewed = _t.Team.getNotExipiringPlayers(st, team);
    const expired = _t.Team.getExipiringPlayers(st, team);
    expect(renewed.length).toBeGreaterThan(expired.length);
  });

  test("renewed players should have a mean score greater than unrenewed ones whencan afford it", () => {
    getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.renewExipiringContracts(st, team);
    const renewed = _t.Team.getNotExipiringPlayers(st, team);
    const expired = _t.Team.getExipiringPlayers(st, team);
    expect(mean(renewed.map((p) => _p.Player.getScore(p)))).toBeGreaterThan(
      mean(expired.map((p) => _p.Player.getScore(p)))
    );
  });

  test("should expire most players when the team can't afford them", () => {
    getContracts(st, team).forEach((c) => {
      c.duration = 0;
      c.wage = _t.MIN_SALARY_CAP / 6;
    });
    team.finances.revenue = _t.MIN_SALARY_CAP;
    team.finances.budget = 0;
    _t.Team.renewExipiringContracts(st, team);
    expect(_t.Team.getExipiringPlayers(st, team).length).toBeGreaterThan(
      _t.Team.getNotExipiringPlayers(st, team).length
    );
  });
});

describe("Team.updateFinances()", () => {
  test("should update the budget removing expenses and adding revenue", () => {
    const { revenue, budget } = team.finances;
    _t.Team.updateFinances(st, team);
    expect(st.teams.a.finances.budget).toBe(
      budget + revenue - _t.Team.getMonthlyExpenses(st, st.teams.a)
    );
  });
});
