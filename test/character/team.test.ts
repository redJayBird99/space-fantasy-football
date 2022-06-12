import * as _t from "../../src/character/team";
import * as _p from "../../src/character/player";
import * as _gs from "../../src/game-state/game-state";
import { mean, swap } from "../../src/util/generator";

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
_gs.initTeams(st, ["a"]);
let team = st.teams.a;
team.appeal = 5;

beforeEach(() => {
  st = new _gs.GameState(new Date());
  _gs.initTeams(st, ["a"]);
  team = st.teams.a;
  team.appeal = 5; // init it
});

describe("Team.signPlayer()", () => {
  const p = new _p.Player("cm", new Date());

  test("should add the player id to the team", () => {
    _t.Team.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    expect(team.playerIds).toContainEqual(p.id);
  });

  test("should set player.team to the team name", () => {
    _t.Team.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    expect(p.team).toBe(team.name);
  });

  test("should add the contract to the gameState", () => {
    const c = _t.Team.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    expect(_gs.GameState.getContract(st, p)).toEqual(c);
  });

  test("when called twice shouldn't duplicate the player id stored", () => {
    team.playerIds = [];
    _t.Team.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    _t.Team.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    expect(team.playerIds).toEqual([p.id]);
  });

  test("the contract duration should be greater than or equal 1", () => {
    const c = _t.Team.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    expect(c.duration).toBeGreaterThanOrEqual(1);
  });

  test("the contract duration should be less than or equal 4", () => {
    const c = _t.Team.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    expect(c.duration).toBeLessThanOrEqual(4);
  });
});

describe("Team.unsignPlayer()", () => {
  const st = new _gs.GameState(new Date());
  const pl = new _p.Player("lm", new Date());
  const team = new _t.Team("Smokers");
  st.teams.Smokers = team;
  st.players[pl.id] = pl;
  _t.Team.unsignPlayer(
    st,
    _t.Team.signPlayer({ gs: st, t: team, p: pl }, _p.MIN_WAGE)
  );

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
      expect(
        _t.renewalProbability({ gs: st, t: team, p }, rtgs)
      ).toBeGreaterThanOrEqual(0);
    });

    test("should return a value less than or equal 1", () => {
      expect(
        _t.renewalProbability({ gs: st, t: team, p }, rtgs)
      ).toBeLessThanOrEqual(1);
    });

    test("a player with score 72 should return 1", () => {
      setSkillsTo(pl, 72);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(1);
    });

    test("a player with score 60 should return 0.5", () => {
      setSkillsTo(pl, 60);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(0.52);
    });
  });

  describe("when the area rating is 0", () => {
    test("a player with score 72 should return 0.5", () => {
      rtgs = { goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
      setSkillsTo(pl, 72);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(0.5);
    });

    test("a player with score 54 should return 0", () => {
      setSkillsTo(pl, 54);
      expect(_t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)).toBe(0);
    });
  });

  describe("when the area rating is 1", () => {
    test("a player with score 54 should return 0", () => {
      rtgs = { goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
      setSkillsTo(pl, 54);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(0);
    });

    test("a player with score 60 should return 0.7", () => {
      setSkillsTo(pl, 60);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(0.7);
    });
  });
});

describe("Team.ratingPlayerByNeed()", () => {
  const d = new Date();
  const gs = new _gs.GameState(d);
  const team = new _t.Team("insert name");
  const pl = new _p.Player("cf", d, 28);
  let rtgs = { goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  const pls = rdmPlayers(20).sort(
    (p1, p2) =>
      _t.Team.evaluatePlayer({ t: team, p: p2, gs }) -
      _t.Team.evaluatePlayer({ t: team, p: p1, gs })
  );

  describe("when the area rating is 0", () => {
    test("rate the players according the score", () => {
      const pRatings = [...pls].sort(
        (a, b) =>
          _t.Team.ratingPlayerByNeed({ p: b, t: team, gs }, rtgs) -
          _t.Team.ratingPlayerByNeed({ p: a, t: team, gs }, rtgs)
      );
      expect(pRatings).toEqual(pls);
    });

    test("should return a value greater than or equal 0", () => {
      pls.forEach((p) =>
        expect(
          _t.Team.ratingPlayerByNeed({ p, t: team, gs }, rtgs)
        ).toBeGreaterThanOrEqual(0)
      );
    });

    test("should return a value less than or equal 5", () => {
      pls.forEach((p) =>
        expect(
          _t.Team.ratingPlayerByNeed({ p, t: team, gs }, rtgs)
        ).toBeLessThanOrEqual(5)
      );
    });

    test("a player with MAX score should return 4", () => {
      setSkillsTo(pl, _p.MAX_SKILL);
      expect(
        _t.Team.ratingPlayerByNeed({ p: pl, t: team, gs }, rtgs)
      ).toBeCloseTo(4);
    });

    test("a player with MIN score should return 0", () => {
      setSkillsTo(pl, _p.MIN_SKILL);
      expect(
        _t.Team.ratingPlayerByNeed({ p: pl, t: team, gs }, rtgs)
      ).toBeCloseTo(0);
    });
  });

  describe("when the area rating is 1", () => {
    test("a player with MAX score should return 5", () => {
      rtgs = { goolkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
      setSkillsTo(pl, _p.MAX_SKILL);
      expect(
        _t.Team.ratingPlayerByNeed({ p: pl, t: team, gs }, rtgs)
      ).toBeCloseTo(5);
    });

    test("a player with MIN score should return 1", () => {
      setSkillsTo(pl, _p.MIN_SKILL);
      expect(
        _t.Team.ratingPlayerByNeed({ p: pl, t: team, gs }, rtgs)
      ).toBeCloseTo(1);
    });
  });
});

describe("Team.getExipiringPlayers()", () => {
  test("should return all expiring players", () => {
    getContracts(st, team).forEach((c) => (c.duration = 0));
    expect(_t.Team.getExipiringPlayers({ gs: st, t: team })).toEqual(
      _gs.GameState.getTeamPlayers(st, team.name)
    );
  });

  test("should return 0 players when no contract is expiring", () => {
    getContracts(st, team).forEach((c) => (c.duration = 1));
    expect(_t.Team.getExipiringPlayers({ gs: st, t: team })).toEqual([]);
  });
});

describe("Team.getNotExipiringPlayers()", () => {
  test("should return all not expiring players", () => {
    getContracts(st, team).forEach((c) => (c.duration = 1));
    expect(_t.Team.getNotExipiringPlayers({ gs: st, t: team })).toEqual(
      _gs.GameState.getTeamPlayers(st, team.name)
    );
  });

  test("should return 0 players when all contracts are expiring", () => {
    getContracts(st, team).forEach((c) => (c.duration = 0));
    expect(_t.Team.getNotExipiringPlayers({ gs: st, t: team })).toEqual([]);
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
    expect(_t.Team.getWagesAmount({ gs: st, t: team })).toBe(100 * cts.length);
  });
});

describe("Team.getMonthlyExpenses()", () => {
  test("should return the sum of every wage with all other expenses and luxuryTax", () => {
    const { health, facilities, scouting } = team.finances;
    const wage = _p.SALARY_CAP / 10;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    const wages = wage * getContracts(st, team).length;
    expect(_t.Team.getMonthlyExpenses({ gs: st, t: team })).toBe(
      wages + _t.luxuryTax(wages) + health + facilities + scouting
    );
  });

  test("should return the sum of every wage with all other expenses and minSalaryTax", () => {
    const { health, facilities, scouting } = team.finances;
    const wage = _p.MIN_WAGE;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    const wages = wage * getContracts(st, team).length;
    expect(_t.Team.getMonthlyExpenses({ gs: st, t: team })).toBe(
      wages + _t.minSalaryTax(wages) + health + facilities + scouting
    );
  });
});

describe("Team.canAfford()", () => {
  test("should return always true for MIN_WAGE", () => {
    getContracts(st, team).forEach((c) => c && (c.wage = _p.MAX_WAGE));
    expect(_t.Team.canAfford({ gs: st, t: team })(_p.MIN_WAGE)).toBe(true);
  });

  test("should return true when all expenses are small", () => {
    const wage = _p.MIN_SALARY_CAP / 20;
    getContracts(st, team).forEach((c) => c && (c.wage = wage));
    expect(_t.Team.canAfford({ gs: st, t: team })(wage)).toBe(true);
  });

  test("should return true when wages are under MIN_SALARY_CAP no matter the budget", () => {
    team.finances.budget = -100 * _p.SALARY_CAP;
    getContracts(st, team).forEach((c) => c && (c.wage = _p.MIN_WAGE));
    expect(_t.Team.canAfford({ gs: st, t: team })(2 * _p.MIN_WAGE)).toBe(true);
  });

  test("should return true when all expenses are larger than the revenue but have a large enough budget", () => {
    team.finances.health = team.finances.revenue;
    team.finances.budget =
      100 * _t.Team.getMonthlyExpenses({ gs: st, t: team });
    expect(_t.Team.canAfford({ gs: st, t: team })(3 * _p.MIN_WAGE)).toBe(true);
  });

  test("should return false when all expenses are larger than the revenue and the budget isn't large enough", () => {
    team.finances.health = team.finances.revenue;
    team.finances.budget = 0;
    expect(_t.Team.canAfford({ gs: st, t: team })(2 * _p.MIN_WAGE)).toBe(false);
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
    expect(_t.Team.canAfford({ gs: st, t: team })(2 * _p.MIN_WAGE)).toBe(false);
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
    expect(_t.Team.canAfford({ gs: st, t: team })(2 * _p.MIN_WAGE)).toBe(true);
  });
});

describe("findBest()", () => {
  const d = new Date();
  const gs = new _gs.GameState(d);
  const team = new _t.Team("Smokers");
  const rgs = {
    teamPlayers: [],
    goolkeeper: 0,
    defender: 0,
    midfielder: 0,
    forward: 0,
  };
  const pls = rdmPlayers(30).sort(
    (a, b) =>
      _t.Team.ratingPlayerByNeed({ p: b, t: team, gs }, rgs) -
      _t.Team.ratingPlayerByNeed({ p: a, t: team, gs }, rgs)
  );

  test("should return the player with the highest rating", () => {
    expect(_t.findBest([...pls], { t: team, gs }, rgs)).toEqual(pls[0]);
  });
});

describe("Team.shouldRenew()", () => {
  const p = new _p.Player("cf", new Date(), 28);
  setSkillsTo(p, 70);
  let rtgs = { goolkeeper: 0, defender: 0, midfielder: 0, forward: 0 };

  test("should return false when there are 30 and no particular position need", () => {
    expect(_t.Team.shouldRenew({ p, t: team, gs: st }, rtgs, 30)).toBe(false);
  });

  test("should return true for a very good player when the team has less than 30 players and need the position", () => {
    rtgs = { ...rtgs, forward: 1 };
    expect(_t.Team.shouldRenew({ p, t: team, gs: st }, rtgs, 10)).toBe(true);
  });
});

describe("Team.renewExipiringContracts()", () => {
  test("should renew most players when the team is short of Players and can afford it", () => {
    team.finances.revenue = 3 * _p.SALARY_CAP;
    getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.renewExipiringContracts({ gs: st, t: team });
    const renewed = _t.Team.getNotExipiringPlayers({ gs: st, t: team });
    const expired = _t.Team.getExipiringPlayers({ gs: st, t: team });
    expect(renewed.length).toBeGreaterThan(expired.length);
  });

  test("renewed players should have a mean score greater than unrenewed ones when can afford it", () => {
    team.finances.revenue = 3 * _p.SALARY_CAP;
    getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.renewExipiringContracts({ gs: st, t: team });
    const renewed = _t.Team.getNotExipiringPlayers({ gs: st, t: team });
    const expired = _t.Team.getExipiringPlayers({ gs: st, t: team });
    expect(mean(renewed.map((p) => _p.Player.getScore(p)))).toBeGreaterThan(
      mean(expired.map((p) => _p.Player.getScore(p)))
    );
  });

  test("should expire most players when the team can't afford them", () => {
    team.finances.revenue = _p.MIN_SALARY_CAP;
    team.finances.budget = 0;
    getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.getExipiringPlayers({ gs: st, t: team }).forEach((p) => {
      // so they ask for the max wage
      Object.keys(p.skills).forEach((s) => (p.skills[s as _p.Skill] = 80));
    });
    _t.Team.renewExipiringContracts({ gs: st, t: team });
    expect(
      _t.Team.getExipiringPlayers({ gs: st, t: team }).length
    ).toBeGreaterThan(
      _t.Team.getNotExipiringPlayers({ gs: st, t: team }).length
    );
  });
});

describe("Team.needPlayer()", () => {
  test("should return false when all positionArea are covered", () => {
    expect(_t.Team.needPlayer({ gs: st, t: team })).toBe(false);
  });

  test("should return true when is short of players", () => {
    team.playerIds = team.playerIds.slice(15, team.playerIds.length);
    expect(_t.Team.needPlayer({ gs: st, t: team })).toBe(true);
  });
});

describe("Team.signFreeAgent()", () => {
  const d = new Date();
  const st = new _gs.GameState(d);
  const team = new _t.Team("insert name");
  const plrs = rdmPlayers(30).sort(
    (a, b) =>
      _t.Team.evaluatePlayer({ t: team, p: b, gs: st }) -
      _t.Team.evaluatePlayer({ t: team, p: a, gs: st })
  );

  test("should sign a player when can afford it and return it", () => {
    team.finances.revenue = 10 * _p.SALARY_CAP;
    const sign = _t.Team.signFreeAgent({ gs: st, t: team }, plrs);
    expect(team.playerIds).toContainEqual(sign?.id);
  });

  test("should sign one of the best score player when positionArea isn't a factor", () => {
    team.finances.revenue = 10 * _p.SALARY_CAP;
    const nthBest = plrs.indexOf(
      _t.Team.signFreeAgent({ gs: st, t: team }, plrs)!
    );
    expect(nthBest).not.toBe(-1);
    expect(nthBest).toBeLessThan(6);
  });

  test("should return undefined when can't sign any players", () => {
    expect(_t.Team.signFreeAgent({ gs: st, t: team }, [])).not.toBeDefined();
  });
});

describe("Team.pickDraftPlayer()", () => {
  const d = new Date();
  const st = new _gs.GameState(d);
  const team = new _t.Team("insert name");
  const plrs = rdmPlayers(30).sort(
    (a, b) =>
      _t.Team.evaluatePlayer({ t: team, p: b, gs: st }) -
      _t.Team.evaluatePlayer({ t: team, p: a, gs: st })
  );

  test("should add the signed player to the team", () => {
    const sign = _t.Team.pickDraftPlayer({ gs: st, t: team }, plrs);
    expect(team.playerIds).toContainEqual(sign.id);
  });

  test("should sign one of the best score player when positionArea isn't a factor", () => {
    const nthBest = plrs.indexOf(
      _t.Team.pickDraftPlayer({ gs: st, t: team }, plrs)
    );
    expect(nthBest).not.toBe(-1);
    expect(nthBest).toBeLessThan(6);
  });

  test("the picked player should sign a 4 seasons contracts", () => {
    const sign = _t.Team.pickDraftPlayer({ gs: st, t: team }, plrs);
    expect(_gs.GameState.getContract(st, sign)?.duration).toBe(4);
  });
});

describe("Team.updateFinances()", () => {
  test("should update the budget removing expenses and adding revenue", () => {
    const { revenue, budget } = team.finances;
    _t.Team.updateFinances({ gs: st, t: team });
    expect(st.teams.a.finances.budget).toBe(
      budget + revenue - _t.Team.getMonthlyExpenses({ gs: st, t: st.teams.a })
    );
  });
});

describe("Team.calcAppeal()", () => {
  const st = _gs.GameState.init();
  const teams = Object.values(st.teams);
  const first = teams[0];
  const last = teams[teams.length - 1];

  test("should return a value greater than or equal to 0", () => {
    teams.forEach((t) =>
      expect(_t.Team.calcAppeal(t, teams, teams)).toBeGreaterThanOrEqual(0)
    );
  });

  test("should return a value less than or equal to 5", () => {
    teams.forEach((t) =>
      expect(_t.Team.calcAppeal(t, teams, teams)).toBeLessThanOrEqual(5)
    );
  });

  test("should return 5 points when rank first in every metric", () => {
    first.fanbase = "huge";
    expect(_t.Team.calcAppeal(first, teams, teams)).toBeCloseTo(5);
  });

  test("should return 0 points when rank last in every metric", () => {
    last.fanbase = "verySmall";
    expect(_t.Team.calcAppeal(last, teams, teams)).toBeCloseTo(0);
  });

  test("fanbase should worth 1 point at most", () => {
    last.fanbase = "huge";
    expect(_t.Team.calcAppeal(last, teams, teams)).toBeCloseTo(1);
  });

  test("facilityRanking should worth 1 point at most", () => {
    last.fanbase = "verySmall";
    const cp = teams.slice();
    swap(cp, 0, cp.length - 1);
    expect(_t.Team.calcAppeal(last, teams, cp)).toBeCloseTo(1);
  });

  test("ranking should worth 3 point at most", () => {
    last.fanbase = "verySmall";
    const cp = teams.slice();
    swap(cp, 0, cp.length - 1);
    expect(_t.Team.calcAppeal(last, cp, teams)).toBeCloseTo(3);
  });
});

describe("Team.evaluatePlayer()", () => {
  const d = new Date();
  const st = new _gs.GameState(d);

  test("should return a value equal to the current score for a mature player", () => {
    const p = new _p.Player("gk", d, _p.END_GROWTH_AGE + 1);
    expect(_t.Team.evaluatePlayer({ t: team, p, gs: st })).toBeCloseTo(
      _p.Player.getScore(p)
    );
  });

  test("should return a value greater than the current score for a young player", () => {
    const p = new _p.Player("gk", d, 18);
    expect(_t.Team.evaluatePlayer({ t: team, p, gs: st })).toBeGreaterThan(
      _p.Player.getScore(p)
    );
  });
});

describe("pickBest()", () => {
  const pls = Array.from({ length: 9 }, () => new _p.Player("am", new Date()));
  const n = 5;

  test("should return n players", () => {
    expect(_t.pickBest({ gs: st, t: team }, pls, n).length).toBe(n);
  });

  test("should return the best n players", () => {
    const best = pls
      .sort(
        (p1, p2) =>
          _t.Team.evaluatePlayer({ t: team, p: p2, gs: st }) -
          _t.Team.evaluatePlayer({ t: team, p: p1, gs: st })
      )
      .slice(0, n);
    expect(_t.pickBest({ t: team, gs: st }, pls, n)).toEqual(
      expect.arrayContaining(best)
    );
  });

  test("throw an error when n is larger than player.length", () => {
    expect(() => _t.pickBest({ gs: st, t: team }, pls, 10)).toThrow();
  });
});

describe("initScoutOffset()", () => {
  test("should return a value less than or equal to MAX_SCOUTING_OFFSET", () => {
    expect(_t.initScoutOffset(team)).toBeLessThanOrEqual(2);
  });

  test("should return a value greater than or equal to 0", () => {
    expect(_t.initScoutOffset(team)).toBeGreaterThanOrEqual(0);
  });
});

describe("Team.estimateGrowthRate()", () => {
  const team = new _t.Team("some name");
  const p = new _p.Player("am", new Date());

  test("should be deterministic given the same imput", () => {
    expect(_t.Team.estimateGrowthRate(team, p)).toBe(
      _t.Team.estimateGrowthRate(team, p)
    );
  });

  test("most of the times teams should get different results", () => {
    const team2 = new _t.Team("some other name");
    expect(_t.Team.estimateGrowthRate(team2, p)).not.toBe(
      _t.Team.estimateGrowthRate(team, p)
    );
  });

  test("should return a value within (2 * MAX_SCOUTING_OFFSET)% of the real growthRate", () => {
    team.scoutOffset = _t.MAX_SCOUTING_OFFSET;
    expect(_t.Team.estimateGrowthRate(team, p)).toBeLessThanOrEqual(
      (1 + 2 * _t.MAX_SCOUTING_OFFSET) * p.growthRate
    );
    expect(_t.Team.estimateGrowthRate(team, p)).toBeGreaterThanOrEqual(
      (1 - 2 * _t.MAX_SCOUTING_OFFSET) * p.growthRate
    );
  });

  test("lower is team.scoutOffset closer should be to the real growthRate", () => {
    const team2 = new _t.Team("some other name");
    const dist = (p: _p.Player, t: _t.Team) =>
      Math.abs(_t.Team.estimateGrowthRate(t, p) - p.growthRate);
    const plrs = rdmPlayers(20);
    team.scoutOffset = 0.05;
    team2.scoutOffset = 0.2;
    const offset = plrs.reduce((a, p) => a + dist(p, team), 0) / plrs.length;
    const offset2 = plrs.reduce((a, p) => a + dist(p, team2), 0) / plrs.length;
    expect(offset).toBeLessThan(offset2);
  });
});
