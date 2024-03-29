import "../../../src/game/game-sim/sim-worker-interface";
import "../../mock/broadcast-channel.mock";
import "../../../src/pages/util/router";
import * as _t from "../../../src/game/character/team";
import * as _p from "../../../src/game/character/player";
import * as _gs from "../../../src/game/game-state/game-state";
import * as _tde from "../../../src/game/game-sim/trade";
import { exportedForTesting as _u } from "../../../src/game/character/util";
import { mean } from "../../../src/util/math";
const _trdTest = _tde.exportedForTesting;
jest.mock("../../../src/game/game-sim/sim-worker-interface");
jest.mock("../../../src/pages/util/router");

// guarantee findOffer
const getSampleOffer = (gs: _gs.GameState, by: _t.Team, to: _t.Team) => {
  const pls = _t.getNotExpiringPlayers({ gs, t: to });
  let get = [pls[0], pls[1]];
  let offer = _tde.findOffer({ gs, t: by }, get);

  for (let i = 0; i < pls.length && offer.length === 0; i++) {
    get = [pls[i]];
    offer = _tde.findOffer({ gs, t: by }, get);
  }

  return { by, offer, get };
};

describe("underMinTeamSize", () => {
  const st = _gs.init(["someName", "other"]);
  const team = st.teams.someName;
  const team2 = st.teams.other;
  const tm1Pls = _t.getNotExpiringPlayers({ gs: st, t: team });
  const tm2Pls = _t.getNotExpiringPlayers({ gs: st, t: team2 });

  test("when stay over the min team size return false", () => {
    expect(_tde.underMinTeamSize(team, [tm2Pls[0]], [tm1Pls[0]])).toBe(false);
  });

  test("when get under the min team size return true", () => {
    const giveAmount = tm1Pls.length - _t.MIN_TEAM_SIZE + 2;
    const give = tm1Pls.slice(0, giveAmount);
    expect(_tde.underMinTeamSize(team, [tm2Pls[0]], give)).toBe(true);
  });
});

describe("overMaxTeamSize", () => {
  const st = _gs.init(["someName", "other"]);
  const team = st.teams.someName;
  const team2 = st.teams.other;
  const tm1Pls = _t.getNotExpiringPlayers({ gs: st, t: team });
  const tm2Pls = _t.getNotExpiringPlayers({ gs: st, t: team2 });

  test("when stay under the max team size return false", () => {
    expect(_tde.overMaxTeamSize(team, [tm2Pls[0]], [tm1Pls[0]])).toBe(false);
  });

  test("when get over the max team size return true", () => {
    const getAmount = _t.MAX_TEAM_SIZE - tm2Pls.length + 2;
    const get = tm1Pls.slice(0, getAmount);
    expect(_tde.overMaxTeamSize(team, get, [tm1Pls[0]])).toBe(true);
  });
});

describe("validTeamSize", () => {
  const st = _gs.init(["someName", "other"]);
  const team = st.teams.someName;
  const team2 = st.teams.other;

  test("when is over the team max size but the team size is reduced return true", () => {
    const tm1Pls = _t.getNotExpiringPlayers({ gs: st, t: team });
    const pls = _u.rdmPlayers(_t.MAX_TEAM_SIZE - tm1Pls.length + 3);
    pls.forEach((p) => {
      _gs.savePlayer(st, p);
      _t.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    });
    const gv = _t.getNotExpiringPlayers({ gs: st, t: team }).slice(0, 2);
    const gt = _t.getNotExpiringPlayers({ gs: st, t: team2 }).slice(0, 1);
    expect(_tde.validTeamSize(team, gt, gv)).toBe(true);
  });

  test("when is over the max team size return false", () => {
    const tm1Pls = _t.getNotExpiringPlayers({ gs: st, t: team });
    const pls = _u.rdmPlayers(_t.MAX_TEAM_SIZE - tm1Pls.length + 3);
    pls.forEach((p) => {
      _gs.savePlayer(st, p);
      _t.signPlayer({ gs: st, t: team, p }, _p.MIN_WAGE);
    });
    const gv = _t.getNotExpiringPlayers({ gs: st, t: team }).slice(0, 1);
    const gt = _t.getNotExpiringPlayers({ gs: st, t: team2 }).slice(0, 2);
    expect(_tde.validTeamSize(team, gt, gv)).toBe(false);
  });

  test("when is under the team min size but the team size is increased return true", () => {
    const tm1Pls = _t.getNotExpiringPlayers({ gs: st, t: team });
    tm1Pls
      .slice(0, tm1Pls.length + 2 - _t.MIN_TEAM_SIZE)
      .forEach((p) => _t.unSignPlayer(st, _gs.getContract(st, p)!));
    const gv = _t.getNotExpiringPlayers({ gs: st, t: team }).slice(0, 1);
    const gt = _t.getNotExpiringPlayers({ gs: st, t: team2 }).slice(0, 2);
    expect(_tde.validTeamSize(team, gt, gv)).toBe(true);
  });

  test("when is under the team min size return false", () => {
    const tm1Pls = _t.getNotExpiringPlayers({ gs: st, t: team });
    tm1Pls
      .slice(0, tm1Pls.length + 2 - _t.MIN_TEAM_SIZE)
      .forEach((p) => _t.unSignPlayer(st, _gs.getContract(st, p)!));
    const gv = _t.getNotExpiringPlayers({ gs: st, t: team }).slice(0, 2);
    const gt = _t.getNotExpiringPlayers({ gs: st, t: team2 }).slice(0, 1);
    expect(_tde.validTeamSize(team, gt, gv)).toBe(false);
  });
});

describe("areClose", () => {
  test("return true when a and b are within a 10% distance between each other", () => {
    expect(_tde.areClose(10, 9.5)).toBe(true);
  });

  test("return false when a and b are too far apart", () => {
    expect(_tde.areClose(9, 10)).toBe(false);
  });
});

describe("scoreAppeal", () => {
  test("when mean: 65, stdDev: 5 and score: 67 should return ", () => {
    expect(_tde.scoreAppeal(65, 5, 67)).toBeCloseTo(3.031);
  });

  test("when mean: 65, stdDev: 6 and score: 60 should return ", () => {
    expect(_tde.scoreAppeal(65, 6, 60)).toBeCloseTo(0.099);
  });
});

describe("skewMean", () => {
  test("should return a value equal to the mean when the values in the sample are all equal", () => {
    const sample = [3, 3, 3, 3, 3];
    expect(mean(sample)).toBeCloseTo(_tde.skewMean(sample));
  });

  test("should return a value greater than the mean", () => {
    const sample = [1, 2, 4, 8, 16];
    expect(mean(sample)).toBeLessThan(_tde.skewMean(sample));
  });
});

describe("transferPlayers", () => {
  const st = _gs.init(["someName", "other"]);
  const team = st.teams.someName;
  const team2 = st.teams.other;
  const mvPls = _t.getNotExpiringPlayers({ gs: st, t: team }).slice(0, 3);
  _tde.transferPlayers(st, mvPls, team2);

  test("should move the players to the new team", () => {
    expect(_t.getNotExpiringPlayers({ gs: st, t: team2 })).toEqual(
      expect.arrayContaining(mvPls)
    );
  });

  test("should remove the players from the old team", () => {
    expect(_t.getNotExpiringPlayers({ gs: st, t: team })).not.toEqual(
      expect.arrayContaining(mvPls)
    );
  });
});

describe("affordable()", () => {
  const st = _gs.init(["someName", "other"]);
  const team = st.teams.someName;
  const team2 = st.teams.other;
  const tm1Pls = _t.getNotExpiringPlayers({ gs: st, t: team });
  const tm2Pls = _t.getNotExpiringPlayers({ gs: st, t: team2 });

  describe("team payroll is over salary cap", () => {
    test("when get wages are greater than out wages should return false", () => {
      _u.getContracts(st, team).forEach((c) => (c.wage = _p.MAX_WAGE));
      _u.getContracts(st, team2).forEach((c) => (c.wage = 2 * _p.MAX_WAGE));
      const out = tm1Pls.slice(0, 5);
      const get = tm2Pls.slice(0, 5);
      expect(_tde.affordable({ gs: st, t: team })(get, out)).toBe(false);
    });

    test("when get wages are less than out wages should return true", () => {
      _u.getContracts(st, team).forEach((c) => (c.wage = _p.MAX_WAGE));
      _u.getContracts(st, team2).forEach((c) => (c.wage = _p.MAX_WAGE / 2));
      const out = tm1Pls.slice(0, 5);
      const get = tm2Pls.slice(0, 5);
      expect(_tde.affordable({ gs: st, t: team })(get, out)).toBe(true);
    });
  });

  describe("team payroll is under salary cap", () => {
    test("when the payroll stay under the salary cap after adding get wages should return true", () => {
      _u.getContracts(st, team).forEach((c) => (c.wage = _p.MIN_WAGE));
      _u.getContracts(st, team2).forEach((c) => (c.wage = 2 * _p.MIN_WAGE));
      const out = tm1Pls.slice(0, 5);
      const get = tm2Pls.slice(0, 5);
      expect(_tde.affordable({ gs: st, t: team })(get, out)).toBe(true);
    });

    test("when the payroll go over the salary cap after adding get wages should return false", () => {
      _u.getContracts(st, team).forEach((c) => (c.wage = _p.MIN_WAGE));
      _u.getContracts(st, team2).forEach((c) => (c.wage = _p.SALARY_CAP));
      const out = tm1Pls.slice(0, 5);
      const get = tm2Pls.slice(0, 5);
      expect(_tde.affordable({ gs: st, t: team })(get, out)).toBe(false);
    });
  });
});

describe("acceptable()", () => {
  const st = _gs.init(["someName", "other"]);
  const team = st.teams.someName;
  const team2 = st.teams.other;
  const tm1Pls = _t.getNotExpiringPlayers({ gs: st, t: team });
  const tm2Pls = _t.getNotExpiringPlayers({ gs: st, t: team2 });

  test("when get offer is an empty array should return false", () => {
    const give = tm1Pls.slice(0, 5);
    expect(_tde.acceptable({ gs: st, t: team }, [], give)).toBe(false);
  });

  test("when give offer is an empty array should return false", () => {
    const get = tm2Pls.slice(0, 5);
    expect(_tde.acceptable({ gs: st, t: team }, get, [])).toBe(false);
  });

  test("should return false when the team get under the min team size", () => {
    const giveAmount = tm1Pls.length - _t.MIN_TEAM_SIZE + 2;
    const give = tm1Pls.slice(0, giveAmount);
    const get = tm2Pls.slice(0, 1);
    expect(_tde.acceptable({ gs: st, t: team }, get, give)).toBe(false);
  });

  test("should return false when the team get over the max team size", () => {
    const getAmount = _t.MAX_TEAM_SIZE + 2 - tm1Pls.length;
    const get = tm2Pls.slice(0, getAmount);
    const give = tm1Pls.slice(0, 1);
    expect(_tde.acceptable({ gs: st, t: team }, get, give)).toBe(false);
  });

  test("when a fair affordable offer is made should return true", () => {
    const { by, offer, get } = getSampleOffer(st, team2, team);
    expect(_tde.acceptable({ gs: st, t: by }, get, offer)).toBe(true);
  });

  test("when a unfair offer is made should return false", () => {
    const give = [tm1Pls[0]];
    const get = [tm2Pls[0]];
    _u.setSkillsTo(give[0], _p.MAX_SKILL);
    _u.setSkillsTo(get[0], _p.MIN_SKILL);
    expect(_tde.acceptable({ gs: st, t: team }, get, give)).toBe(false);
  });

  test("when a offer put the team over the salary cap should return false", () => {
    const give = [tm1Pls[0]];
    const get = [tm2Pls[0]];
    _u.setSkillsTo(give[0], _p.MAX_SKILL);
    _u.setSkillsTo(get[0], _p.MIN_SKILL);
    _gs.getContract(st, get[0])!.wage = _p.SALARY_CAP;
    expect(_tde.acceptable({ gs: st, t: team }, get, give)).toBe(false);
  });
});

describe("findOffer()", () => {
  const gs = _gs.init(["someName", "other"]);
  const team = gs.teams.someName;
  const team2 = gs.teams.other;
  // for most of the tests we want a successful findOffer call
  const { by, offer, get } = getSampleOffer(gs, team2, team);

  test("the found offer should be not empty", () => {
    expect(_tde.affordable({ gs, t: by })(get, offer)).not.toEqual([]);
  });

  test("the found offer should should be considered acceptable by the offerer", () => {
    expect(_tde.acceptable({ gs, t: by }, get, offer)).toBe(true);
  });

  test("the found offer should respect team size requirements", () => {
    expect(_tde.underMinTeamSize(by, get, offer)).toBe(false);
  });

  test("the found offer should respect salary cap requirements", () => {
    expect(_tde.affordable({ gs, t: by })(get, offer)).toBe(true);
  });

  test("when no offer was found return a empty array", () => {
    // assuming that the get offer is unmatchable
    const get = _t
      .getNotExpiringPlayers({ gs, t: team })
      .slice(0, _tde.MAX_EXCHANGE_SIZE);
    get.forEach((p) => _u.setSkillsTo(p, _p.MAX_SKILL));
    expect(_tde.findOffer({ gs, t: team2 }, get)).toEqual([]);
  });
});

describe("searchTrade", () => {
  describe("when is able to find a trade", () => {
    let gs = _gs.init(["a", "b"]);
    let trade = _tde.searchTrade({ gs, t: gs.teams.a }, gs.teams.b);

    while (!trade) {
      gs = _gs.init(["a", "b"]);
      // make them more probable to agree
      gs.teams.a.scoutOffset = 0;
      gs.teams.b.scoutOffset = 0;
      trade = _tde.searchTrade({ gs, t: gs.teams.a }, gs.teams.b);
    }

    const { side1, side2 } = trade;

    test("the trade should be acceptable by both teams", () => {
      expect(
        _tde.acceptable({ gs, t: side1.by }, side2.content, side1.content)
      ).toBe(true);
      expect(
        _tde.acceptable({ gs, t: side2.by }, side1.content, side2.content)
      ).toBe(true);
    });
  });
});

describe("findTrades and commitTrade", () => {
  describe("when some trade was made", () => {
    let gs = _gs.init(["a", "b", "c", "d", "e", "f", "g", "h"]);
    let trades = _tde.findTrades(gs);
    trades.forEach((t) => _tde.commitTrade(gs, t));

    while (trades.length !== 0) {
      gs = _gs.init(["a", "b", "c", "d", "e", "f", "g", "h"]);
      trades = _tde.findTrades(gs);
      trades.forEach((t) => _tde.commitTrade(gs, t));
    }

    test("the traded players should switch team", () => {
      trades.forEach((trade) => {
        const { side1, side2 } = trade;
        expect(_t.getNotExpiringPlayers({ gs, t: side2.by })).toEqual(
          expect.arrayContaining(side1.content)
        );
        expect(_t.getNotExpiringPlayers({ gs, t: side1.by })).toEqual(
          expect.arrayContaining(side2.content)
        );
      });
    });
  });
});

describe("estimatePlayerVal()", () => {
  const original = _t.evaluatePlayer;
  const gs = _gs.init(["a", "b"]);
  const t = gs.teams.a;

  test("when a player is younger than 29 years old shouldn't have a age penalty", () => {
    // @ts-ignore
    // eslint-disable-next-line no-import-assign
    _t.evaluatePlayer = jest.fn(() => 50);
    const p = new _p.Player("gk", gs.date, 25);
    expect(_trdTest.estimatePlayerVal({ gs, t, p })).toBe(50);
  });

  test("when a player is older than 29 years old a age penalty should be applied", () => {
    const p = new _p.Player("gk", gs.date, 30);
    expect(_trdTest.estimatePlayerVal({ gs, t, p })).toBeLessThan(50);
    // @ts-ignore
    // eslint-disable-next-line no-import-assign
    _t.evaluatePlayer = original;
  });
});
