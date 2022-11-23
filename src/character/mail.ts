import { createId } from "../util/generator";
import { interpolate } from "../util/util";
import mails from "../asset/mails.json";
import { MIN_TEAM_SIZE, Team } from "./team";
import { Trade } from "../game-sim/trade";
import { TradeRecord } from "../game-state/game-state";
import { Injury } from "./player";

export interface Mail {
  id: string;
  sender: string;
  subject: string;
  sendDate: string;
  content: string;
  opened: boolean;
}

export function newMail(
  m: Omit<Mail, "opened" | "id" | "sendDate">,
  send: Date
): Mail {
  return {
    ...m,
    id: createId(),
    opened: false,
    sendDate: send.toDateString(),
  };
}

/** the welcome mail for the given team */
export function welcome(team: string, send: Date): Mail {
  const w = mails["mail-welcome"];
  return newMail(
    {
      sender: interpolate(w.sender, { team }),
      subject: interpolate(w.subject, { team }),
      content: w.content,
    },
    send
  );
}

export function mustDraft(send: Date): Mail {
  return newMail(mails["must-draft"], send);
}

export function teamSizeAlert(send: Date): Mail {
  return newMail(
    {
      sender: "Coach Assistant",
      subject: "we have too few players",
      content: `our team should have at least ${MIN_TEAM_SIZE} players, sign some new players to reach this requirement`,
    },
    send
  );
}

export function teamLineupAlert(send: Date): Mail {
  return newMail(mails["must-fill-lineup"], send);
}

export function tradeOffer(send: Date, t: Trade, user: Team): Mail {
  const offer = t.side1.by === user ? t.side2 : t.side1;

  return newMail(
    {
      sender: "Head Scout",
      subject: "we received a trade offer",
      content: `we have received an offer by ${
        offer.by.name
      } for ${offer.content.map((p) => p.name).join(", ")}`,
    },
    send
  );
}

export function withdrawOffer(send: Date, t: TradeRecord, user: Team): Mail {
  const offer = t.sides[0].team === user.name ? t.sides[1] : t.sides[0];
  // we don't need to worry about retired player (it called only when the trade window is open)
  const pls = offer.plIds.map((id) => window.$game.state!.players[id]);

  return newMail(
    {
      sender: "Head Scout",
      subject: `${offer.team} has withdrawn its offer`,
      content: `${offer.team} has withdrawn its trading offer for ${pls
        .map((p) => p.name)
        .join(", ")}. The trading conditions aren't met anymore`,
    },
    send
  );
}

export function injury(send: Date, plrName: string, i: Injury): Mail {
  return newMail(
    {
      sender: "Coach Assistant",
      subject: `${plrName} get injured`,
      content: `unfortunately our player ${plrName} get injured, the doctors say he will be fully recovered for the ${new Date(
        i.when
      ).toLocaleDateString()}, He can't play in the meantime`,
    },
    send
  );
}
