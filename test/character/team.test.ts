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

describe("renewalProbability()", () => {
  const pl = new _p.Player("am", new Date(), 28);
  let rtgs = { goolkeeper: 0.1, defender: 0.1, midfielder: 0.1, forward: 0.1 };

  describe("when the area rating is 0.1", () => {
    const p = rdmPlayers(1)[0];

    test("should return a value greater than or equal 0", () => {
      expect(_t.renewalProbability(p, rtgs)).toBeGreaterThanOrEqual(0);
    });

    test("should return a value less than or equal 1", () => {
      expect(_t.renewalProbability(p, rtgs)).toBeLessThanOrEqual(1);
    });

    test("a player with score 72 should return 1", () => {
      setSkillsTo(pl, 72);
      expect(_t.renewalProbability(pl, rtgs)).toBeCloseTo(1);
    });

    test("a player with score 60 should return 0.5", () => {
      setSkillsTo(pl, 60);
      expect(_t.renewalProbability(pl, rtgs)).toBeCloseTo(0.52);
    });
  });

  describe("when the area rating is 0", () => {
    test("a player with score 72 should return 0.5", () => {
      rtgs = { goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
      setSkillsTo(pl, 72);
      expect(_t.renewalProbability(pl, rtgs)).toBeCloseTo(0.5);
    });

    test("a player with score 54 should return 0", () => {
      setSkillsTo(pl, 54);
      expect(_t.renewalProbability(pl, rtgs)).toBe(0);
    });
  });

  describe("when the area rating is 1", () => {
    test("a player with score 54 should return 0", () => {
      rtgs = { goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
      setSkillsTo(pl, 54);
      expect(_t.renewalProbability(pl, rtgs)).toBeCloseTo(0);
    });

    test("a player with score 60 should return 0.7", () => {
      setSkillsTo(pl, 60);
      expect(_t.renewalProbability(pl, rtgs)).toBeCloseTo(0.7);
    });
  });
});

describe("ratingPlayerByNeed()", () => {
  const pl = new _p.Player("cf", new Date(), 28);
  let rtgs = { goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  const pls = rdmPlayers(20).sort(
    (p1, p2) => _p.Player.getScore(p2) - _p.Player.getScore(p1)
  );

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
      rtgs = { goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
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
    expect(_t.luxuryTax(_p.SALARY_CAP)).toBe(0);
  });

  test("should return a value greater 0 when the payroll exceed the salary cap", () => {
    expect(_t.luxuryTax(_p.SALARY_CAP + 100)).toBeGreaterThan(0);
  });

  test("larger is the payroll excess larger is the tax factor", () => {
    const taxFct1 = _t.luxuryTax(_p.SALARY_CAP + 10_000) / 10_000;
    const taxFct2 = _t.luxuryTax(_p.SALARY_CAP + 50_000) / 50_000;
    expect(taxFct2).toBeGreaterThan(taxFct1);
  });
});

describe("minimumSalaryTax()", () => {
  test("should return 0 when the payroll ins't below the min salary cap", () => {
    expect(_t.minSalaryTax(_p.MIN_SALARY_CAP)).toBe(0);
  });

  test("should return difference between the payroll and the min salary cap when below", () => {
    expect(_t.minSalaryTax(_p.MIN_SALARY_CAP - 10_000)).toBe(10_000);
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
    const wage = _p.SALARY_CAP / 10;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    const wages = wage * getContracts(st, team).length;
    expect(_t.Team.getMonthlyExpenses(st, team)).toBe(
      wages + _t.luxuryTax(wages) + health + facilities + scouting
    );
  });

  test("should return the sum of every wage with all other expenses and minSalaryTax", () => {
    const { health, facilities, scouting } = team.finances;
    const wage = _p.MIN_WAGE;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    const wages = wage * getContracts(st, team).length;
    expect(_t.Team.getMonthlyExpenses(st, team)).toBe(
      wages + _t.minSalaryTax(wages) + health + facilities + scouting
    );
  });
});

describe("Team.canAfford()", () => {
  test("should return always true for MIN_WAGE", () => {
    getContracts(st, team).forEach((c) => c && (c.wage = _p.MAX_WAGE));
    expect(_t.Team.canAfford(st, team)(_p.MIN_WAGE)).toBe(true);
  });

  test("should return true when all expenses are small", () => {
    const wage = _p.MIN_SALARY_CAP / 20;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    expect(_t.Team.canAfford(st, team)(wage)).toBe(true);
  });

  test("should return true when wages are under MIN_SALARY_CAP no matter the budget", () => {
    team.finances.budget = -100 * _p.SALARY_CAP;
    getContracts(st, team).forEach((c) => c && (c.wage = _p.MIN_WAGE));
    expect(_t.Team.canAfford(st, team)(2 * _p.MIN_WAGE)).toBe(true);
  });

  test("should return true when all expenses are larger than the revenue but have a large enough budget", () => {
    team.finances.health = team.finances.revenue;
    team.finances.budget = 100 * _t.Team.getMonthlyExpenses(st, team);
    expect(_t.Team.canAfford(st, team)(3 * _p.MIN_WAGE)).toBe(true);
  });

  test("should return false when all expenses are larger than the revenue and the budget isn't large enough", () => {
    team.finances.health = team.finances.revenue;
    team.finances.budget = 0;
    expect(_t.Team.canAfford(st, team)(2 * _p.MIN_WAGE)).toBe(false);
  });

  test("should return false when a large luxury tax is applied and the budget isn't larger enough", () => {
    team.finances = {
      revenue: _p.SALARY_CAP,
      budget: _p.SALARY_CAP / 100,
      health: _p.SALARY_CAP / 100,
      scouting: _p.SALARY_CAP / 100,
      facilities: _p.SALARY_CAP / 100,
    };
    getContracts(st, team).forEach((c) => c && (c.wage = _p.SALARY_CAP / 15));
    expect(_t.Team.canAfford(st, team)(2 * _p.MIN_WAGE)).toBe(false);
  });

  test("should return true when the budget is negative but can compensate with revenue", () => {
    team.finances = {
      revenue: _p.SALARY_CAP,
      budget: -_p.SALARY_CAP,
      health: _p.SALARY_CAP / 100,
      scouting: _p.SALARY_CAP / 100,
      facilities: _p.SALARY_CAP / 100,
    };
    getContracts(st, team).forEach((c) => c && (c.wage = _p.SALARY_CAP / 30));
    expect(_t.Team.canAfford(st, team)(2 * _p.MIN_WAGE)).toBe(true);
  });
});

describe("findBest()", () => {
  const rgs = {
    teamPlayers: [],
    goolkeeper: 0,
    defender: 0,
    midfielder: 0,
    forward: 0,
  };
  const pls = rdmPlayers(30).sort(
    (a, b) => _t.ratingPlayerByNeed(b, rgs) - _t.ratingPlayerByNeed(a, rgs)
  );

  test("should return the player with the highest rating when affordable", () => {
    expect(_t.findBest([...pls], rgs, (a) => true)).toEqual(pls[0]);
  });

  test("should return the undefined when no one is affordable", () => {
    expect(_t.findBest([...pls], rgs, (a) => false)).not.toBeDefined();
  });
});

describe("Team.shouldRenew()", () => {
  const pl = new _p.Player("cf", new Date(), 28);
  setSkillsTo(pl, 70);
  let rtgs = { goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };

  test("should return false when there are 30 and no particular position need", () => {
    expect(_t.Team.shouldRenew(pl, rtgs, 30)).toBe(false);
  });

  test("should return true for a very good player when the team has less than 30 players and need the position", () => {
    rtgs = { ...rtgs, forward: 1 };
    expect(_t.Team.shouldRenew(pl, rtgs, 10)).toBe(true);
  });
});

describe("Team.renewExipiringContracts()", () => {
  test("should renew most players when the team is short of Players and can afford it", () => {
    team.finances.revenue = 3 * _p.SALARY_CAP;
    getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.renewExipiringContracts(st, team);
    const renewed = _t.Team.getNotExipiringPlayers(st, team);
    const expired = _t.Team.getExipiringPlayers(st, team);
    expect(renewed.length).toBeGreaterThan(expired.length);
  });

  test("renewed players should have a mean score greater than unrenewed ones when can afford it", () => {
    team.finances.revenue = 3 * _p.SALARY_CAP;
    getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.renewExipiringContracts(st, team);
    const renewed = _t.Team.getNotExipiringPlayers(st, team);
    const expired = _t.Team.getExipiringPlayers(st, team);
    expect(mean(renewed.map((p) => _p.Player.getScore(p)))).toBeGreaterThan(
      mean(expired.map((p) => _p.Player.getScore(p)))
    );
  });

  test("should expire most players when the team can't afford them", () => {
    team.finances.revenue = _p.MIN_SALARY_CAP;
    team.finances.budget = 0;
    getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.getExipiringPlayers(st, team).forEach((p) => {
      // so they ask for the max wage
      Object.keys(p.skills).forEach((s) => (p.skills[s as _p.Skill] = 80));
    });
    _t.Team.renewExipiringContracts(st, team);
    expect(_t.Team.getExipiringPlayers(st, team).length).toBeGreaterThan(
      _t.Team.getNotExipiringPlayers(st, team).length
    );
  });
});

describe("Team.needPlayer()", () => {
  test("should return false when all positionArea are covered", () => {
    expect(_t.Team.needPlayer(st, team)).toBe(false);
  });

  test("should return true when is short of players", () => {
    team.playerIds = team.playerIds.slice(15, team.playerIds.length);
    expect(_t.Team.needPlayer(st, team)).toBe(true);
  });
});

describe("Team.signFreeAgent()", () => {
  const plrs = rdmPlayers(30).sort(
    (a, b) => _p.Player.getScore(b) - _p.Player.getScore(a)
  );

  test("should sign a player when can afford it and return it", () => {
    team.finances.revenue = 10 * _p.SALARY_CAP;
    const sign = _t.Team.signFreeAgent(st, team, plrs);
    expect(team.playerIds).toContainEqual(sign?.id);
  });

  test("should sign one of the best score player when positionArea isn't a factor", () => {
    team.finances.revenue = 10 * _p.SALARY_CAP;
    const nthBest = plrs.indexOf(_t.Team.signFreeAgent(st, team, plrs)!);
    expect(nthBest).not.toBe(-1);
    expect(nthBest).toBeLessThan(6);
  });

  test("should return undefined when can't sign any players", () => {
    expect(_t.Team.signFreeAgent(st, team, [])).not.toBeDefined();
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
