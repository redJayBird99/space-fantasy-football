// a series of utils for the user interaction with the games
import {
  acceptable,
  tradeRequirements,
  transferPlayers,
} from "../game-sim/trade";
import {
  DraftPickRecord,
  GameState,
  SignRequest,
  TradeRecord,
  TransRecord,
} from "../game-state/game-state";
import { within } from "../util/math";
import { withdrawOffer } from "./mail";
import { Player, MIN_WAGE, SALARY_CAP, MAX_GROWTH_RATE } from "./player";
import { MAX_TEAM_SIZE, Team } from "./team";

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

/**
 * check if the user team can sign the given player (team size, salary cap, player will and etc)
 * @param payroll the wages of the user's players
 */
export function canSignPlayer(
  gs: GameState,
  payroll: number,
  p: Player
): boolean {
  const user = gs.teams[gs.userTeam];
  const wage = Player.wageRequest({ gs, t: user, p });
  const signLimitReached = gs.flags.signLimit && gs.flags.signedNewPlayer;

  return (
    !signLimitReached &&
    p.team === "free agent" &&
    gs.flags.openFreeSigningWindow &&
    !gs.rejections[p.id] &&
    user.playerIds.length < MAX_TEAM_SIZE &&
    (wage <= MIN_WAGE || wage + payroll <= SALARY_CAP)
  );
}

/** the user add the player to his team */
export function signPlayer(p: Player): void {
  const gs = window.$game.state!;
  const t = gs.teams[gs.userTeam];
  Team.signPlayer({ gs, t, p }, Player.wageRequest({ gs, t, p }));
  gs.flags.signedNewPlayer = true;
  gs.transactions.now.signings.push({
    when: gs.date.toDateString(),
    plId: p.id,
    team: t.name,
  });
  window.$game.state = gs; // mutation notification
}

/** the user team re-sign the given player request and add it to the transaction history */
export function resignPlayer(r: SignRequest): void {
  const gs = window.$game.state! as GameState;
  const p = gs.players[r.plId];
  const t = gs.teams[gs.userTeam];
  Team.signPlayer({ gs, t, p }, r.wage, r.seasons);
  gs.reSigning = gs.reSigning?.filter((rq) => rq !== r);
  gs.transactions.now.renewals.push({
    when: gs.date.toDateString(),
    plId: p.id,
    team: t.name,
  });
  window.$game.state = gs; // mutation notification
}
/**
 * check if the given trade by the user is possible
 * @param other the trading partner
 * @param get what the user team would receive from the other team
 * @param give what the user give to the other team
 */
export function canTrade(other: Team, get: Player[], give: Player[]): boolean {
  const gs = window.$game.state!;
  const user = gs.teams[gs.userTeam];

  return (
    gs.flags.openTradeWindow &&
    tradeRequirements(user, get, give) &&
    acceptable({ gs, t: other }, give, get)
  );
}

/**
 * transfer the players between the user team and the other team an save the
 * record in the the trade history
 * @param other the trading partner
 * @param get what the user team would receive from the other team
 * @param give what the user give to the other team
 */
export function makeTrade(other: Team, get: Player[], give: Player[]) {
  const gs = window.$game.state!;
  const user = gs.teams[gs.userTeam];
  transferPlayers(gs, get, user);
  transferPlayers(gs, give, other);
  gs.transactions.now.trades.push({
    when: gs.date.toDateString(),
    sides: [
      { team: user.name, plIds: give.map((p) => p.id) },
      { team: other.name, plIds: get.map((p) => p.id) },
    ],
  });
  window.$game.state = gs; // mutation notification
}

/** check if the given trade offer is still possible, check both teams size,
 * finances and if the player are still available */
export function tradeOfferIsStillValid(t: TradeRecord): boolean {
  const gs = window.$game.state!;
  const s1 = t.sides[0];
  const s2 = t.sides[1];
  const t1 = gs.teams[s1.team];
  const t2 = gs.teams[s2.team];
  const t1StillHasPls = !s1.plIds.some((id) => !t1.playerIds.includes(id));
  const t2StillHasPls = !s2.plIds.some((id) => !t2.playerIds.includes(id));

  if (gs.flags.openTradeWindow && t1StillHasPls && t2StillHasPls) {
    const t1Give = t.sides[0].plIds.map((id) => gs.players[id]);
    const t2Give = t.sides[1].plIds.map((id) => gs.players[id]);

    return (
      tradeRequirements(t1, t2Give, t1Give) &&
      tradeRequirements(t2, t1Give, t2Give)
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
      const valid = tradeOfferIsStillValid(t);
      !valid &&
        gs.mails.unshift(withdrawOffer(gs.date, t, gs.teams[gs.userTeam]));
      return valid;
    });
  }
}
