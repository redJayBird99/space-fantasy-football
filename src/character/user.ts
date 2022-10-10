// a series of utils for the user interaction with the games
import {
  DraftPickRecord,
  GameState,
  TransRecord,
} from "../game-state/game-state";
import { within } from "../util/math";
import { Player, getImprovabilityRating, MIN_WAGE, SALARY_CAP } from "./player";
import { MAX_PLAYERS, Team } from "./team";

type DraftHistory = DraftPickRecord & { when: number };
type TransferHistory = { draft?: DraftHistory; transactions: TransRecord };

/**
 * estimate the player improvability rating according the user team scouting
 * @Returns a value between 0 and 10
 */
export function getImprovability(p: Player, gs: GameState): number {
  const gRate = Team.estimateGrowthRate(gs.teams[gs.userTeam], p);
  return within(getImprovabilityRating(gRate), 0, 10);
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

  return (
    p.team === "free agent" &&
    gs.flags.openFreeSigningWindow &&
    !gs.rejections[p.id] &&
    user.playerIds.length < MAX_PLAYERS &&
    (wage <= MIN_WAGE || wage + payroll <= SALARY_CAP)
  );
}

/** the user add the player to his team */
export function signPlayer(p: Player): void {
  const gs = window.$game.state!;
  const t = gs.teams[gs.userTeam];
  Team.signPlayer({ gs, t, p }, Player.wageRequest({ gs, t, p }));
  gs.transactions.now.signings.push({
    when: gs.date.toDateString(),
    plId: p.id,
    team: t.name,
  });
  window.$game.state = gs; // mutation notification
}
