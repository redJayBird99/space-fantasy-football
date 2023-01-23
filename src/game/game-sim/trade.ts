import { getAge, Player, SALARY_CAP } from "../character/player";
import {
  GsTm,
  GsTmPl,
  MIN_TEAM_SIZE,
  MAX_TEAM_SIZE,
  sumWages,
  Team,
  evaluatePlayer,
  getWagesAmount,
  getNotExpiringPlayers,
  transferPlayer,
} from "../character/team";
import { GameState, toTradeRecord } from "../game-state/game-state";
import { shuffle } from "../../util/generator";
import { dayFromLastBirthday, dist, within } from "../../util/math";

/** the content is what the team is giving */
type TradeSide = { by: Team; content: Player[] };
export type Trade = { side1: TradeSide; side2: TradeSide };

const MAX_EXCHANGE_SIZE = 3; // only for the non user teams, it makes the findOffer faster and the exchange smaller

/** estimate the trade value of given player, when the player is over 29 a progressive penalty get applied */
function estimatePlayerVal(g: GsTmPl): number {
  const daysAge = dayFromLastBirthday(g.p.birthday, g.gs.date) / 365;
  const pAge = getAge(g.p, g.gs.date) + daysAge;
  // the penalty can't be too much aggressive otherwise would penalize too much the entire trade offer value
  const agePenalty = within(1 - (pAge - 29) / 33, 0.8, 1);
  return evaluatePlayer(g) * agePenalty;
}

/**
 * @returns true if after the exchange the team players size is under the requirement
 */
function underMinTeamSize(t: Team, get: Player[], give: Player[]): boolean {
  return t.playerIds.length + get.length - give.length < MIN_TEAM_SIZE;
}

/**
 * @returns true if after the exchange the team players size is over the requirement
 */
function overMaxTeamSize(t: Team, get: Player[], give: Player[]): boolean {
  return t.playerIds.length + get.length - give.length > MAX_TEAM_SIZE;
}

/**
 * @returns true when the exchange respects the team players size requirements
 * or get closer to the size requirements
 */
function validTeamSize(t: Team, get: Player[], give: Player[]): boolean {
  if (underMinTeamSize(t, get, give)) {
    return get.length >= give.length;
  } else if (overMaxTeamSize(t, get, give)) {
    return give.length >= get.length;
  }

  return true;
}

/**
 * @returns true when a and b are within a 10% distance of each other
 */
function areClose(a: number, b: number): boolean {
  const d = dist(a, b);
  return d <= Math.abs(a) * 0.1 && d <= Math.abs(b) * 0.1;
}

/**
 * @param mean of the players population
 * @param stdDev standardDeviation of the players population
 * @param score of a player
 * @returns a rating of the given score
 */
function scoreAppeal(mean: number, stdDev: number, score: number): number {
  const step = stdDev / 4;
  return 2 ** ((score - mean) / step);
}

/**
 * get a shew mean towards the larger value in the array
 */
function skewMean(a: number[]): number {
  return Math.max(...a) * 0.5 + (a.reduce((a, b) => a + b, 0) / a.length) * 0.5;
}

/**
 * @param plsScores all the offered player scores
 * @returns a rating of the offer or NaN when plsScores is empty
 */
function offerAppeal({ gs }: GsTm, plsScores: number[]): number {
  if (plsScores.length === 0) {
    return NaN;
  }

  const { meanScore: mean, standardDev: stdDev } = gs.popStats;
  // reminder: the step size in scoreAppeal is very influential on the balance
  // between the mean and player scores, with a smaller step the mean get more influential
  return (
    scoreAppeal(mean, stdDev, skewMean(plsScores)) +
    plsScores.reduce((a, v) => a + scoreAppeal(mean, stdDev, v), 0)
  );
}

/**
 * returns a function that checks if the team payroll stay under the salary cap
 * or it is reduced when exchanging the getting and leaving players
 */
function affordable(g: GsTm): (get: Player[], give: Player[]) => boolean {
  const payroll = getWagesAmount(g);

  return (get, give) => {
    const newPayroll = payroll + sumWages(g.gs, get) - sumWages(g.gs, give);
    return newPayroll < SALARY_CAP || newPayroll <= payroll;
  };
}

/**
 * returns true when the team judges the exchange acceptable and it respects
 * salary cap and team size requirements
 * @param get the players entering the team
 * @param give the players leaving the team
 */
function acceptable({ gs, t }: GsTm, get: Player[], give: Player[]): boolean {
  if (!get.length || !give.length || !validTeamSize(t, get, give)) {
    return false;
  }

  const getScores = get.map((p) => estimatePlayerVal({ gs, t, p }));
  const giveScores = give.map((p) => estimatePlayerVal({ gs, t, p }));
  const getAppeal = offerAppeal({ gs, t }, getScores);
  const giveAppeal = offerAppeal({ gs, t }, giveScores);

  return (
    affordable({ gs, t })(get, give) &&
    (getAppeal > giveAppeal || areClose(getAppeal, giveAppeal))
  );
}

/**
 * returns a closely matching offer to the getting one by the team
 * the returned offer respects salary cap and team size requirements for the
 * given team (no check for the other team)
 * the function is undeterministic
 * @param get what the team get in exchange
 * @returns a empty array when no offer was found
 */
function findOffer({ gs, t }: GsTm, get: Player[]): Player[] {
  // ToFIX: this is the subset sum problem we uses a brute force solution (find combinations)
  // shuffle to make it undeterministic and slice for performance
  const pls = shuffle(getNotExpiringPlayers({ gs, t })).slice(0, 20);
  const _affordable = affordable({ gs, t });
  const plsAppeal = new Map<Player, number>();
  pls.forEach((p) => plsAppeal.set(p, estimatePlayerVal({ gs, t, p })));
  const getAppeal = offerAppeal(
    { gs, t },
    get.map((p) => estimatePlayerVal({ gs, t, p }))
  );
  const rst: Player[][] = [];

  // MAX_EXCHANGE_SIZE solution are more frequent so to balance it we search all
  // solution (instead of the first one) and pick only one for each size
  const search = (stack: Player[], i: number): Player[] | void => {
    if (MAX_EXCHANGE_SIZE < stack.length || !validTeamSize(t, get, stack)) {
      return;
    }

    if (stack.length > 0 && !rst[stack.length - 1]) {
      const giveAppeal = offerAppeal(
        { gs, t },
        stack.map((p) => plsAppeal.get(p)!)
      );

      if (areClose(giveAppeal, getAppeal) && _affordable(get, stack)) {
        rst[stack.length - 1] = stack.slice();
      }
    }

    for (let j = i; j < pls.length; j++) {
      stack.push(pls[i]);
      search(stack, j + 1);
      stack.pop();
    }
  };

  search([], 0);
  return shuffle(rst.filter((a) => a))[0] ?? [];
}

/**
 * search for an acceptable trade between the two given teams, the output
 * is random multiple calls gives different results,
 * because team can't often agree on the players value a trade is somehow rare
 * @param other the team trading with
 */
function searchTrade({ gs, t }: GsTm, other: Team): Trade | void {
  // ToFIX it is a temp solution
  const get = shuffle(getNotExpiringPlayers({ gs, t: other })).slice(
    0,
    Math.floor(MAX_EXCHANGE_SIZE * Math.random()) + 1
  );
  const give = findOffer({ gs, t }, get);

  if (acceptable({ gs, t: other }, give, get)) {
    return {
      side1: { by: t, content: give },
      side2: { by: other, content: get },
    };
  }
}

/**
 * move the current players contracts to the given team
 */
function transferPlayers(gs: GameState, pls: Player[], to: Team): void {
  pls.forEach((p) => {
    const c = GameState.getContract(gs, p);
    c && transferPlayer(gs, c, to);
  });
}

/** try to find some possible trades between teams
 * * @returns the potential trades without duplicate teams (same team in multiple trades)
 */
export function findTrades(gs: GameState): Trade[] {
  const rst: Trade[] = [];
  const teams = shuffle(Object.values(gs.teams));

  for (let i = 1; i <= teams.length / 2; i += 2) {
    const trade = searchTrade({ gs, t: teams[i] }, teams[i - 1]);

    if (trade) {
      rst.push(trade);
    }
  }

  return rst;
}

/** transfer the players and save the trade record in the game state */
export function commitTrade(gs: GameState, t: Trade) {
  transferPlayers(gs, t.side1.content, t.side2.by);
  transferPlayers(gs, t.side2.content, t.side1.by);
  gs.transactions.now.trades.push(toTradeRecord(t, gs.date));
}

// it is just a wrapper around validTeamSize and affordable with some extra info
/** returns ok setted to true  if the team has the financial and size
 * requirements to make the trade, otherwise it is false with the a failing reason */
export function tradeRequirements(
  { gs, t }: GsTm,
  get: Player[],
  give: Player[]
): { ok: boolean; why: string } {
  if (!validTeamSize(t, get, give)) {
    return { ok: false, why: "failing the squad size requirements" };
  } else if (!affordable({ gs, t })(get, give)) {
    return { ok: false, why: "failing the salary cap requirements" };
  }

  return { ok: true, why: "" };
}

export {
  MAX_EXCHANGE_SIZE,
  underMinTeamSize,
  overMaxTeamSize,
  validTeamSize,
  areClose,
  scoreAppeal,
  skewMean,
  transferPlayers,
  offerAppeal,
  affordable,
  acceptable,
  findOffer,
  searchTrade,
};

export const exportedForTesting = {
  estimatePlayerVal,
};
