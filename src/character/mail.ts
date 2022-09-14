import { createId } from "../util/generator";
import { interpolate } from "../util/util";
import mails from "../asset/mails.json";

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
    sendDate: send.toLocaleDateString(),
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
