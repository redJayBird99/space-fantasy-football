import "../../mock/broadcast-channel.mock";
import "../../../src/game/game-sim/sim-worker-interface";
import "../../../src/pages/util/router";
import * as _t from "../../../src/game/character/team";
import { exportedForTesting as _sm } from "../../../src/game/game-sim/game-simulation";
import * as _p from "../../../src/game/character/player";
import * as _gs from "../../../src/game/game-state/game-state";
import * as utl from "../../../src/game/character/util";
import { swap } from "../../../src/util/generator";
import { mean } from "../../../src/util/math";
const _u = utl.exportedForTesting;
jest.mock("../../../src/pages/util/router");
jest.mock("../../../src/game/game-sim/sim-worker-interface");

// eslint-disable-next-line no-import-assign
const mockBestAtPos = ((utl.bestAtPos as jest.Mock) = jest.fn());
const mockBestWithSkill = ((utl.bestWithSkill as jest.Mock) = jest.fn());

let st = _gs.GameState.init("abcd".split(""));
let team = st.teams.a;

beforeEach(() => {
  st = _gs.GameState.init("abcd".split(""));
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

describe("Team.unSignPlayer()", () => {
  const st = new _gs.GameState(new Date());
  const pl = new _p.Player("lm", new Date());
  const team = new _t.Team("Smokers");
  _gs.GameState.saveTeam(st, team);
  _gs.GameState.savePlayer(st, pl);
  _t.Team.unSignPlayer(
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

describe("Team.transferPlayer()", () => {
  const gs = new _gs.GameState(new Date());
  const p = new _p.Player("lm", new Date());
  const team = new _t.Team("old");
  const newTeam = new _t.Team("new");
  _gs.GameState.saveTeam(gs, team);
  _gs.GameState.saveTeam(gs, newTeam);
  _gs.GameState.savePlayer(gs, p);
  const c = _t.Team.signPlayer({ gs, t: team, p }, _p.MIN_WAGE);
  _t.Team.transferPlayer(gs, c, newTeam);

  test("should remove the player id from the old team", () => {
    expect(team.playerIds).not.toContainEqual(p.id);
  });

  test("should add the player id to the new team", () => {
    expect(newTeam.playerIds).toContainEqual(p.id);
  });

  test("the contract should have the new team name", () => {
    expect(_gs.GameState.getContract(gs, p)?.teamName).toBe(newTeam.name);
  });

  test("the player team should be the new team", () => {
    expect(p.team).toBe(newTeam.name);
  });

  test("the contract duration should be preserved", () => {
    expect(_gs.GameState.getContract(gs, p)?.duration).toBe(c.duration);
  });

  test("the contract wage should be preserved", () => {
    expect(_gs.GameState.getContract(gs, p)?.wage).toBe(c.wage);
  });
});

describe("RatingAreaByNeed", () => {
  describe(".goalkeeper", () => {
    test("should be 1 when there is no goalkeeper", () => {
      const ratings = new _t.RatingAreaByNeed([]);
      expect(ratings.goalkeeper).toBe(1);
    });

    test("should be 0 when there are 3 goalkeepers", () => {
      const ratings = new _t.RatingAreaByNeed(
        _u.createPlayers("goalkeeper", 3)
      );
      expect(ratings.goalkeeper).toBe(0);
    });

    test("should be 0 when there are more than 3 goalkeepers", () => {
      const ratings = new _t.RatingAreaByNeed(
        _u.createPlayers("goalkeeper", 4)
      );
      expect(ratings.goalkeeper).toBe(0);
    });
  });

  describe(".defender", () => {
    test("should be 1 when there is no defender", () => {
      const ratings = new _t.RatingAreaByNeed([]);
      expect(ratings.defender).toBe(1);
    });

    test("should be 0 when there are 8 defender", () => {
      const ratings = new _t.RatingAreaByNeed(_u.createPlayers("defender", 8));
      expect(ratings.defender).toBe(0);
    });

    test("should be 0 when there are more than 8 defender", () => {
      const ratings = new _t.RatingAreaByNeed(_u.createPlayers("defender", 9));
      expect(ratings.defender).toBe(0);
    });
  });

  describe(".midfielder", () => {
    test("should be 1 when there is no midfielder", () => {
      const ratings = new _t.RatingAreaByNeed([]);
      expect(ratings.midfielder).toBe(1);
    });

    test("should be 0 when there are 8 midfielder", () => {
      const ratings = new _t.RatingAreaByNeed(
        _u.createPlayers("midfielder", 8)
      );
      expect(ratings.midfielder).toBe(0);
    });

    test("should be 0 when there are more than 8 midfielder", () => {
      const ratings = new _t.RatingAreaByNeed(
        _u.createPlayers("midfielder", 9)
      );
      expect(ratings.midfielder).toBe(0);
    });
  });

  describe(".forward", () => {
    test("should be 1 when there is no forward", () => {
      const ratings = new _t.RatingAreaByNeed([]);
      expect(ratings.forward).toBe(1);
    });

    test("should be 0 when there are 6 midfielder", () => {
      const ratings = new _t.RatingAreaByNeed(_u.createPlayers("forward", 6));
      expect(ratings.forward).toBe(0);
    });

    test("should be 0 when there are more than 6 midfielder", () => {
      const ratings = new _t.RatingAreaByNeed(_u.createPlayers("forward", 7));
      expect(ratings.forward).toBe(0);
    });
  });
});

describe("renewalProbability()", () => {
  const st = _gs.GameState.init("abcd".split(""));
  st.popStats.meanScore = 62;
  st.popStats.standardDev = 5.5;
  const pl = new _p.Player("am", new Date(), 28);
  let rtgs = { goalkeeper: 0.1, defender: 0.1, midfielder: 0.1, forward: 0.1 };

  describe("when the area rating is 0.1", () => {
    const p = _u.rdmPlayers(1)[0];

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

    test("a player with score 74 should return 1", () => {
      _u.setSkillsTo(pl, 74);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(1);
    });

    test("a player with score 62 should return around 0.52", () => {
      _u.setSkillsTo(pl, 62);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(0.52);
    });
  });

  describe("when the area rating is 0", () => {
    test("a player with score 74 should return 0.5", () => {
      rtgs = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
      _u.setSkillsTo(pl, 74);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(0.5);
    });

    test("a player with score 52 should return 0", () => {
      _u.setSkillsTo(pl, 52);
      expect(_t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)).toBe(0);
    });
  });

  describe("when the area rating is 1", () => {
    test("a player with score 53 should return 0", () => {
      rtgs = { goalkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
      _u.setSkillsTo(pl, 53);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(0);
    });

    test("a player with score 60 should return around 0.6", () => {
      _u.setSkillsTo(pl, 60);
      expect(
        _t.renewalProbability({ gs: st, t: team, p: pl }, rtgs)
      ).toBeCloseTo(0.6, 1);
    });
  });
});

describe("Team.ratingPlayerByNeed()", () => {
  const d = new Date();
  const gs = new _gs.GameState(d);
  const team = new _t.Team("insert name");
  const pl = new _p.Player("cf", d, 28);
  let rtgs = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  const pls = _u
    .rdmPlayers(20)
    .sort(
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
      _u.setSkillsTo(pl, _p.MAX_SKILL);
      expect(
        _t.Team.ratingPlayerByNeed({ p: pl, t: team, gs }, rtgs)
      ).toBeCloseTo(4);
    });

    test("a player with MIN score should return 0", () => {
      _u.setSkillsTo(pl, _p.MIN_SKILL);
      expect(
        _t.Team.ratingPlayerByNeed({ p: pl, t: team, gs }, rtgs)
      ).toBeCloseTo(0);
    });
  });

  describe("when the area rating is 1", () => {
    test("a player with MAX score should return 5", () => {
      rtgs = { goalkeeper: 1, defender: 1, midfielder: 1, forward: 1 };
      _u.setSkillsTo(pl, _p.MAX_SKILL);
      expect(
        _t.Team.ratingPlayerByNeed({ p: pl, t: team, gs }, rtgs)
      ).toBeCloseTo(5);
    });

    test("a player with MIN score should return 1", () => {
      _u.setSkillsTo(pl, _p.MIN_SKILL);
      expect(
        _t.Team.ratingPlayerByNeed({ p: pl, t: team, gs }, rtgs)
      ).toBeCloseTo(1);
    });
  });
});

describe("Team.getExpiringPlayers()", () => {
  test("should return all expiring players", () => {
    _u.getContracts(st, team).forEach((c) => (c.duration = 0));
    expect(_t.Team.getExpiringPlayers({ gs: st, t: team })).toEqual(
      _gs.GameState.getTeamPlayers(st, team.name)
    );
  });

  test("should return 0 players when no contract is expiring", () => {
    _u.getContracts(st, team).forEach((c) => (c.duration = 1));
    expect(_t.Team.getExpiringPlayers({ gs: st, t: team })).toEqual([]);
  });
});

describe("Team.getNotExpiringPlayers()", () => {
  test("should return all not expiring players", () => {
    _u.getContracts(st, team).forEach((c) => (c.duration = 1));
    expect(_t.Team.getNotExpiringPlayers({ gs: st, t: team })).toEqual(
      _gs.GameState.getTeamPlayers(st, team.name)
    );
  });

  test("should return 0 players when all contracts are expiring", () => {
    _u.getContracts(st, team).forEach((c) => (c.duration = 0));
    expect(_t.Team.getNotExpiringPlayers({ gs: st, t: team })).toEqual([]);
  });
});

describe("initMoneyAmount()", () => {
  const min = 1_000;

  test("should never return a value less than min", () => {
    Array.from({ length: 10 }, () =>
      _t.initMoneyAmount("very small", min)
    ).forEach((amount) => {
      expect(amount).toBeGreaterThanOrEqual(min);
    });
  });

  test("should return a larger amount for a small fanBase respect to a very small one", () => {
    expect(_t.initMoneyAmount("small", min)).toBeGreaterThan(
      _t.initMoneyAmount("very small", min)
    );
  });

  test("should return a larger amount for a medium fanBase respect to a small one", () => {
    expect(_t.initMoneyAmount("medium", min)).toBeGreaterThan(
      _t.initMoneyAmount("small", min)
    );
  });

  test("should return a larger amount for a big fanBase respect to a medium one", () => {
    expect(_t.initMoneyAmount("big", min)).toBeGreaterThan(
      _t.initMoneyAmount("medium", min)
    );
  });

  test("should return a larger amount for a huge fanBase respect to a big one", () => {
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
    const cts = _u.getContracts(st, team);
    cts.forEach((c) => c && (c.wage = 100));
    expect(_t.Team.getWagesAmount({ gs: st, t: team })).toBe(100 * cts.length);
  });
});

describe("Team.getMonthlyExpenses()", () => {
  test("should return the sum of every wage with all other expenses and luxuryTax", () => {
    const { health, facilities, scouting } = team.finances;
    const wage = _p.SALARY_CAP / 10;
    _u.getContracts(st, team).forEach((c) => c && (c.wage = wage));
    const wages = wage * _u.getContracts(st, team).length;
    expect(_t.Team.getMonthlyExpenses({ gs: st, t: team })).toBe(
      wages + _t.luxuryTax(wages) + health + facilities + scouting
    );
  });

  test("should return the sum of every wage with all other expenses and minSalaryTax", () => {
    const { health, facilities, scouting } = team.finances;
    const wage = _p.MIN_WAGE;
    _u.getContracts(st, team).forEach((c) => c && (c.wage = wage));
    const wages = wage * _u.getContracts(st, team).length;
    expect(_t.Team.getMonthlyExpenses({ gs: st, t: team })).toBe(
      wages + _t.minSalaryTax(wages) + health + facilities + scouting
    );
  });
});

describe("Team.canAfford()", () => {
  test("should return always true for MIN_WAGE", () => {
    _u.getContracts(st, team).forEach((c) => c && (c.wage = _p.MAX_WAGE));
    expect(_t.Team.canAfford({ gs: st, t: team })(_p.MIN_WAGE)).toBe(true);
  });

  test("should return true when all expenses are small", () => {
    const wage = _p.MIN_SALARY_CAP / 20;
    _u.getContracts(st, team).forEach((c) => c && (c.wage = wage));
    expect(_t.Team.canAfford({ gs: st, t: team })(wage)).toBe(true);
  });

  test("should return true when wages are under MIN_SALARY_CAP no matter the budget", () => {
    team.finances.budget = -100 * _p.SALARY_CAP;
    _u.getContracts(st, team).forEach((c) => c && (c.wage = _p.MIN_WAGE));
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
    // make sure payroll is larger than min salary cap
    const wage = _p.MIN_SALARY_CAP / (team.playerIds.length - 2);
    _u.getContracts(st, team).forEach((c) => (c.wage = wage));
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
    _u.getContracts(st, team).forEach(
      (c) => c && (c.wage = _p.SALARY_CAP / 15)
    );
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
    _u.getContracts(st, team).forEach(
      (c) => c && (c.wage = _p.SALARY_CAP / 30)
    );
    expect(_t.Team.canAfford({ gs: st, t: team })(2 * _p.MIN_WAGE)).toBe(true);
  });
});

describe("findBest()", () => {
  const d = new Date();
  const gs = new _gs.GameState(d);
  const team = new _t.Team("Smokers");
  const rgs = {
    teamPlayers: [],
    goalkeeper: 0,
    defender: 0,
    midfielder: 0,
    forward: 0,
  };
  const pls = _u
    .rdmPlayers(30)
    .sort(
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
  _u.setSkillsTo(p, _u.GOOD_STAT);
  let rtgs = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };

  test("should return false when there are 30 and no particular position need", () => {
    expect(_t.Team.shouldRenew({ p, t: team, gs: st }, rtgs, 30)).toBe(false);
  });

  test("should return true for a very good player when the team has less than 30 players and need the position", () => {
    rtgs = { ...rtgs, forward: 1 };
    expect(_t.Team.shouldRenew({ p, t: team, gs: st }, rtgs, 10)).toBe(true);
  });
});

describe("Team.renewExpiringContracts()", () => {
  test("should renew most players when the team is short of Players and can afford it", () => {
    team.finances.revenue = 3 * _p.SALARY_CAP;
    _u.getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.renewExpiringContracts({ gs: st, t: team });
    const renewed = _t.Team.getNotExpiringPlayers({ gs: st, t: team });
    const expired = _t.Team.getExpiringPlayers({ gs: st, t: team });
    expect(renewed.length).toBeGreaterThan(expired.length);
  });

  test("renewed players should have a mean score greater than unrenewed ones when can afford it", () => {
    team.finances.revenue = 3 * _p.SALARY_CAP;
    _u.getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.renewExpiringContracts({ gs: st, t: team });
    const renewed = _t.Team.getNotExpiringPlayers({ gs: st, t: team });
    const expired = _t.Team.getExpiringPlayers({ gs: st, t: team });
    expect(mean(renewed.map((p) => _p.getScore(p)))).toBeGreaterThan(
      mean(expired.map((p) => _p.getScore(p)))
    );
  });

  test("should expire most players when the team can't afford them", () => {
    team.finances.revenue = _p.MIN_SALARY_CAP;
    team.finances.budget = 0;
    _u.getContracts(st, team).forEach((c) => (c.duration = 0));
    _t.Team.getExpiringPlayers({ gs: st, t: team }).forEach((p) => {
      // so they ask for the max wage
      Object.keys(p.skills).forEach((s) => (p.skills[s as _p.Skill] = 80));
    });
    _t.Team.renewExpiringContracts({ gs: st, t: team });
    expect(
      _t.Team.getExpiringPlayers({ gs: st, t: team }).length
    ).toBeGreaterThan(
      _t.Team.getNotExpiringPlayers({ gs: st, t: team }).length
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
  const st = _gs.GameState.init("abcd".split(""));
  const team = st.teams.a;
  const pls = _u
    .rdmPlayers(30)
    .sort(
      (a, b) =>
        _t.Team.evaluatePlayer({ t: team, p: b, gs: st }) -
        _t.Team.evaluatePlayer({ t: team, p: a, gs: st })
    );
  pls.forEach((p) => _gs.GameState.savePlayer(st, p));

  test("should sign a player when can afford it and return it", () => {
    team.finances.revenue = 10 * _p.SALARY_CAP;
    const sign = _t.Team.signFreeAgent({ gs: st, t: team }, pls);
    expect(team.playerIds).toContainEqual(sign?.id);
  });

  test("should sign one of the best score player when positionArea isn't a factor", () => {
    team.finances.revenue = 10 * _p.SALARY_CAP;
    const nthBest = pls.indexOf(
      _t.Team.signFreeAgent({ gs: st, t: team }, pls)!
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
  const pls = _u.rdmPlayers(30);

  test("should add the signed player to the team", () => {
    const sign = _t.Team.pickDraftPlayer({ gs: st, t: team }, pls);
    expect(team.playerIds).toContainEqual(sign.id);
  });

  test("the picked player should sign a 4 seasons contracts", () => {
    const sign = _t.Team.pickDraftPlayer({ gs: st, t: team }, pls);
    expect(_gs.GameState.getContract(st, sign)?.duration).toBe(4);
  });

  test("should the player with the highest score prediction", () => {
    // @ts-ignore
    const original = _p.predictScore;
    // @ts-ignore
    // eslint-disable-next-line no-import-assign
    _p.predictScore = jest.fn((p) => (pls[0] === p ? 60 : 10));
    expect(_t.Team.pickDraftPlayer({ gs: st, t: team }, pls)).toBe(pls[0]);
    // @ts-ignore
    // eslint-disable-next-line no-import-assign
    _p.predictScore = original;
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
    first.fanBase = "huge";
    expect(_t.Team.calcAppeal(first, teams, teams)).toBeCloseTo(5);
  });

  test("should return 0 points when rank last in every metric", () => {
    last.fanBase = "very small";
    expect(_t.Team.calcAppeal(last, teams, teams)).toBeCloseTo(0);
  });

  test("fanBase should worth 1 point at most", () => {
    last.fanBase = "huge";
    expect(_t.Team.calcAppeal(last, teams, teams)).toBeCloseTo(1);
  });

  test("facilityRanking should worth 1 point at most", () => {
    last.fanBase = "very small";
    const cp = teams.slice();
    swap(cp, 0, cp.length - 1);
    expect(_t.Team.calcAppeal(last, teams, cp)).toBeCloseTo(1);
  });

  test("ranking should worth 3 point at most", () => {
    last.fanBase = "very small";
    const cp = teams.slice();
    swap(cp, 0, cp.length - 1);
    expect(_t.Team.calcAppeal(last, cp, teams)).toBeCloseTo(3);
  });
});

describe("Team.evaluatePlayer()", () => {
  const st = new _gs.GameState(new Date());

  test("should return a value equal to the current score for a mature player", () => {
    const p = new _p.Player("gk", new Date(), _p.END_GROWTH_AGE + 1);
    expect(_t.Team.evaluatePlayer({ t: team, p, gs: st })).toBeCloseTo(
      _p.getScore(p)
    );
  });

  test("should return a value greater than or equal to the current score for a young player", () => {
    const p = new _p.Player("gk", new Date(), 18);
    expect(
      _t.Team.evaluatePlayer({ t: team, p, gs: st })
    ).toBeGreaterThanOrEqual(_p.getScore(p));
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

  test("should be deterministic given the same input", () => {
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

  test("should always return a value within 0 and MAX_GROWTH_RATE", () => {
    team.scoutOffset = 100 * _t.MAX_SCOUTING_OFFSET;
    expect(_t.Team.estimateGrowthRate(team, p)).toBeLessThanOrEqual(
      _p.MAX_GROWTH_RATE
    );
    team.scoutOffset = -100 * _t.MAX_SCOUTING_OFFSET;
    expect(_t.Team.estimateGrowthRate(team, p)).toBeGreaterThanOrEqual(0);
  });

  test("lower is team.scoutOffset closer should be to the real growthRate", () => {
    const team2 = new _t.Team("some other name");
    const dist = (p: _p.Player, t: _t.Team) =>
      Math.abs(_t.Team.estimateGrowthRate(t, p) - p.growthRate);
    const pls = _u.rdmPlayers(20);
    team.scoutOffset = 0.05;
    team2.scoutOffset = 0.2;
    const offset = pls.reduce((a, p) => a + dist(p, team), 0) / pls.length;
    const offset2 = pls.reduce((a, p) => a + dist(p, team2), 0) / pls.length;
    expect(offset).toBeLessThan(offset2);
  });
});

describe("sumWages()", () => {
  const pls = _u.rdmPlayers(6);

  test("should return the sum of all players wages", () => {
    pls.forEach((p) => _t.Team.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE));
    expect(_t.sumWages(st, pls)).toBeCloseTo(_p.MIN_WAGE * pls.length);
  });

  test("should count as 0 the players without contract", () => {
    expect(_t.sumWages(st, pls)).toBeCloseTo(0);
  });
});

describe("removeLineupDepartures", () => {
  const sp = { pos: "cm", row: 3, col: 8 } as const;
  const pls = _t.Team.getNotExpiringPlayers({ gs: st, t: team });
  const retired = pls[0];
  const traded = pls[1];
  team.formation = {
    name: "3-4-3",
    lineup: [
      { plID: "", sp },
      { plID: retired.id, sp },
      { plID: traded.id, sp },
      { plID: pls[2].id, sp },
    ],
  };
  _sm.retirePlayer(st, retired);
  _t.Team.unSignPlayer(st, st.contracts[traded.id]);
  const cpTeam = JSON.parse(JSON.stringify(team));
  _t.removeLineupDepartures({ gs: st, t: cpTeam });

  test("should remove retired players", () => {
    expect(cpTeam.formation?.lineup[1].plID).toBeUndefined();
  });

  test("should remove traded players", () => {
    expect(cpTeam.formation?.lineup[2].plID).toBeUndefined();
  });

  test("should remove empty position", () => {
    expect(cpTeam.formation?.lineup[0].plID).toBeUndefined();
  });

  test("should preserve all already filled position", () => {
    expect(cpTeam.formation?.lineup[3].plID).toBe(pls[2].id);
  });
});

describe("updateSquadNumber", () => {
  const mockPls = Array.from({ length: _t.MAX_TEAM_SIZE }, () => ({
    position: "am",
  })) as _p.Player[];

  test("every player should have a unique number", () => {
    const cp = JSON.parse(JSON.stringify(mockPls)) as _p.Player[];
    let i = 0;
    mockBestAtPos.mockImplementation(() => cp[i++]);
    _t.updateSquadNumber(cp);
    expect(new Set(cp.map((p) => p.number)).size).toBe(mockPls.length);
  });

  test("should select the best option for some specific numbers", () => {
    const cp = JSON.parse(JSON.stringify(mockPls));
    let i = 1;
    mockBestAtPos.mockImplementation((_, pos) =>
      pos === "gk" ? cp[0] : cp[i++]
    );
    _t.updateSquadNumber(cp);
    expect(cp[0].number).toBe(1);
  });
});

describe("updateCaptain", () => {
  test("should set a new team captain", () => {
    team.captain = undefined;
    _t.updateCaptain(st, team);
    expect(team.captain).toBeDefined();
  });

  test("te captain should be preferably an older player", () => {
    expect(
      _p.getAge(st.players[team.captain!], st.date)
    ).toBeGreaterThanOrEqual(25);
  });
});

describe("findSetPiecesTakers", () => {
  test("should find a complete set when enough players are available", () => {
    const starters = team.playerIds.slice(0, 11);
    const lineup = starters.map((id) => ({
      sp: { pos: "am", row: 0, col: 0 },
      plID: id,
    })) as _t.LineupSpot[];
    mockBestWithSkill.mockImplementation(
      (pls) => pls[Math.floor(Math.random() * pls.length)]
    );
    const set = Object.values(_t.findSetPiecesTakers(st, lineup));
    expect(set.length).toBe(5);
    expect(starters).toEqual(expect.arrayContaining(set));
  });
});

describe("updateSetPiecesTakers", () => {
  test("should remove all set pieces when the players aren't in the lineup", () => {
    team.setPieces = {
      corners: "a",
      longFreeKicks: "b",
      shortFreeKicks: "c",
      throwIns: "d",
      penalties: "e",
    };
    _t.updateSetPiecesTakers(team);
    expect(Object.values(team.setPieces!).some((v) => !v)).toBe(true);
  });

  test("should preserve the players not removed from the lineup", () => {
    const starter = team.playerIds[0];
    team.formation = {
      name: "3-4-3",
      lineup: [{ sp: { pos: "am", row: 0, col: 0 }, plID: starter }],
    };
    team.setPieces = {
      corners: starter,
    };
    _t.updateSetPiecesTakers(team);
    expect(team.setPieces.corners).toBe(starter);
  });
});
