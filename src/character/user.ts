// a series of utils for the user interaction with the games
import { fetchUpdatedFormations } from "../game-sim/sim-worker-interface";
import {
  acceptable,
  tradeRequirements,
  transferPlayers,
} from "../game-sim/trade";
import {
  addMail,
  DraftPickRecord,
  GameState,
  TradeRecord,
  TransRecord,
} from "../game-state/game-state";
import { hash } from "../util/generator";
import { within } from "../util/math";
import { toISODateString } from "../util/util";
import { Formations, FORMATIONS } from "./formation";
import { withdrawOffer } from "./mail";
import {
  Player,
  MIN_WAGE,
  SALARY_CAP,
  MAX_GROWTH_RATE,
  MAX_WAGE,
} from "./player";
import {
  MAX_TEAM_SIZE,
  removeLineupDepartures,
  setFormation,
  Team,
} from "./team";

type DraftHistory = DraftPickRecord & { when: number };
type TransferHistory = { draft?: DraftHistory; transactions: TransRecord };

/**
 * estimate the player improvability rating according to the team scouting
 * @Returns a value between 0 and 1 inclusive
 */
export function estimateImprovabilityRating(p: Player, t: Team): number {
  return Team.estimateGrowthRate(t, p) / MAX_GROWTH_RATE;
}

/** returns an estimation rating between F (bad) to A+ (great) about the player improvability */
export function improvabilityRatingSymbol(p: Player, t: Team): string {
  const rtg = ["F", "E", "E+", "D", "D+", "C", "C+", "B", "B+", "A", "A+"];
  return rtg[Math.round(estimateImprovabilityRating(p, t) * (rtg.length - 1))];
}

/**
 * returns a rating value between 0 and 1 (inclusive) about how good the
 * given player is respect to the others players
 */
export function getPlayerRating(p: Player, gs: GameState): number {
  const start = gs.popStats.meanScore - 3 * gs.popStats.standardDev;
  const end = gs.popStats.meanScore + 3 * gs.popStats.standardDev;
  const range = end - start;
  return within((Player.getScore(p) - start) / range, 0, 1);
}

/** returns a rating value between F (bad) to A+ (great) about how good the given player is */
export function getPlayerRatingSymbol(p: Player, gs: GameState): string {
  const rtg = ["F", "E", "E+", "D", "D+", "C", "C+", "B", "B+", "A", "A+"];
  return rtg[Math.round(getPlayerRating(p, gs) * (rtg.length - 1))];
}

/** get all transfer informations about the given player in no particular order */
export function getTransferHistoryOf(plId: string): TransferHistory | void {
  const gs = window.$game.state;
  const p = gs?.players[plId];

  if (p) {
    return {
      draft: draftHistoryOf(p.id) ?? undefined,
      transactions: transactionsHistoryOf(p.id),
    };
  }
}

function draftHistoryOf(plId: string): DraftHistory | void {
  const drafts = window.$game.state!.drafts;

  for (const season in drafts) {
    const rst = drafts[season].picked.find((r) => r.plId === plId);

    if (rst) {
      return { when: new Date(drafts[season].when).getFullYear(), ...rst };
    }
  }
}

/** get all the transaction where players was involved in no particular order */
function transactionsHistoryOf(plId: string): TransRecord {
  const trs = window.$game.state!.transactions;
  const record: TransRecord = { trades: [], signings: [], renewals: [] };

  for (const season in trs) {
    trs[season].signings.forEach((r) => {
      if (r.plId === plId) {
        record.signings.push(r);
      }
    });
    trs[season].trades.forEach((r) => {
      if (r.sides[0].plIds.includes(plId) || r.sides[1].plIds.includes(plId)) {
        record.trades.push(r);
      }
    });
    trs[season].renewals.forEach((r) => {
      if (r.plId === plId) {
        record.renewals.push(r);
      }
    });
  }

  return record;
}

/** the player should always ask for an higher wage to the user respect to want
 * it is willing to accept, expect when he is asking for the min wage */
export function fakeWageRequest(p: Player) {
  const gs = window.$game.state!;
  const user = gs.teams[gs.userTeam];
  const wage = Player.wageRequest({ gs, t: user, p });

  if (wage === MIN_WAGE) {
    return wage;
  }

  return Math.round(
    within(wage + 0.15 * wage * (hash(p.id, 100) / 100), MIN_WAGE, MAX_WAGE)
  );
}

/**
 * check if the user team can sign the given player (team size, salary cap, player will and etc)
 * @param payroll the wages of the user's players
 */
export function canSignPlayer(
  gs: GameState,
  payroll: number,
  p: Player
): { can: boolean; why: string } {
  const user = gs.teams[gs.userTeam];
  const wage = Player.wageRequest({ gs, t: user, p });

  if (!gs.flags.openFreeSigningWindow) {
    return { can: false, why: "the signing window is close" };
  }
  if (p.team !== "free agent") {
    return { can: false, why: "the player isn't free" };
  }
  if (gs.flags.signLimit && gs.flags.signedNewPlayer) {
    return { can: false, why: "you can't sign others players for today" };
  }
  if (gs.rejections[p.id]) {
    return { can: false, why: "the player is unwilling to sign" };
  }
  if (user.playerIds.length >= MAX_TEAM_SIZE) {
    return {
      can: false,
      why: `your team can't have more than ${MAX_TEAM_SIZE} players`,
    };
  }
  if (wage > MIN_WAGE && wage + payroll > SALARY_CAP) {
    return {
      can: false,
      why: "your team doesn't have enough free cap space to make an acceptable offer",
    };
  }

  return { can: true, why: "" };
}

/**
 * the user team sign a contract with the given player, and update the transaction history an related flags
 * @param length contract duration in seasons
 * @param reSign if true player is treated as a re-sign otherwise as a new sign
 */
export function signPlayer(
  p: Player,
  wage: number,
  length: number,
  reSign = false
): void {
  const gs = window.$game.state!;
  const t = gs.teams[gs.userTeam];
  Team.signPlayer({ gs, t, p }, wage, length);
  const historyEntry = {
    when: toISODateString(gs.date),
    plId: p.id,
    team: t.name,
  };

  if (reSign) {
    gs.transactions.now.renewals.push(historyEntry);
  } else {
    gs.transactions.now.signings.push(historyEntry);
    gs.flags.signedNewPlayer = true;
  }

  window.$game.state = gs; // mutation notification
}

/**
 * check if the given trade by the user is possible and if not return the reason
 * @param other the trading partner
 * @param get what the user team would receive from the other team
 * @param give what the user give to the other team
 */
export function canTrade(
  other: Team,
  get: Player[],
  give: Player[]
): { ok: boolean; why: string } {
  const gs = window.$game.state!;
  const user = gs.teams[gs.userTeam];

  if (!gs.flags.openTradeWindow) {
    return { ok: false, why: "the trade window is close" };
  }
  if (get.length === 0 || give.length === 0) {
    return { ok: false, why: "the trade offer can't have an empty side" };
  }

  const userReqs = tradeRequirements({ gs, t: user }, get, give);
  const otherReqs = tradeRequirements({ gs, t: other }, give, get);

  if (!userReqs.ok) {
    return { ok: false, why: `your team is ${userReqs.why}` };
  }
  if (!otherReqs.ok) {
    return { ok: false, why: `${other.name} is ${otherReqs.why}` };
  }
  if (!acceptable({ gs, t: other }, give, get)) {
    return { ok: false, why: `${other.name} rejected your offer` };
  }

  return { ok: true, why: "" };
}

/**
 * transfer the players between the user team and the other team an save the
 * record in the the trade history.
 * all traded player are removed from the lineups
 * @param other the trading partner
 * @param get what the user team would receive from the other team
 * @param give what the user give to the other team
 */
export function makeTrade(other: Team, get: Player[], give: Player[]) {
  const gs = window.$game.state!;
  const user = gs.teams[gs.userTeam];
  transferPlayers(gs, get, user);
  transferPlayers(gs, give, other);
  removeLineupDepartures({ gs, t: other });
  removeLineupDepartures({ gs, t: user });
  gs.transactions.now.trades.push({
    when: toISODateString(gs.date),
    sides: [
      { team: user.name, plIds: give.map((p) => p.id) },
      { team: other.name, plIds: get.map((p) => p.id) },
    ],
  });
  window.$game.state = gs; // mutation notification
}

/** check if the given trade offer is still possible, check both teams size,
 * finances and if the player are still available */
export function tradeOfferIsStillValid(gs: GameState, t: TradeRecord): boolean {
  const [s1, s2] = t.sides;
  const t1 = gs.teams[s1.team];
  const t2 = gs.teams[s2.team];
  const t1StillHasPls = !s1.plIds.some((id) => !t1.playerIds.includes(id));
  const t2StillHasPls = !s2.plIds.some((id) => !t2.playerIds.includes(id));

  if (gs.flags.openTradeWindow && t1StillHasPls && t2StillHasPls) {
    const t1Give = t.sides[0].plIds.map((id) => gs.players[id]);
    const t2Give = t.sides[1].plIds.map((id) => gs.players[id]);

    return (
      tradeRequirements({ gs, t: t1 }, t2Give, t1Give).ok &&
      tradeRequirements({ gs, t: t2 }, t1Give, t2Give).ok
    );
  }

  return false;
}

/** update the trade offer for the user, when an offer doesn't meet the validity
 * conditions remove it, and the user is notified with a mail */
export function updateTradeOffers(gs: GameState): void {
  // when the openTradeWindow is false the gs.tradeOffers is empty
  if (gs.flags.openTradeWindow) {
    gs.tradeOffers = gs.tradeOffers.filter((t) => {
      const valid = tradeOfferIsStillValid(gs, t);
      !valid && addMail(gs, withdrawOffer(gs.date, t, gs.teams[gs.userTeam]));
      return valid;
    });
  }
}

/** change the user team formation with the given one if it is different,
 * the new formation is filled with placeholder players */
export function changeFormation(to: Formations): void {
  const gs = window.$game.state!;
  const user = gs.teams[gs.userTeam];

  if (user.formation?.name !== to) {
    user.formation = {
      name: to,
      lineup: FORMATIONS[to].map((s) => ({ sp: s })),
    };
    updateFormation(gs, user);
  }
}

/** call the fetchUpdatedFormations function to do a complete update of the given team formation */
export async function updateFormation(gs: GameState, t: Team) {
  const res = await fetchUpdatedFormations({ gs, teams: [t.name] });
  setFormation(gs.teams[res[0].team], res[0].f);
  window.$game.state = gs;
}

/** get all not yet played matches by the user team */
export function getNextFixtures() {
  const gs = window.$game.state!;
  const user = gs.userTeam;
  return GameState.getSeasonMatches(gs, "now").filter(
    (m) => (m.away === user || m.home === user) && !m.result
  );
}
