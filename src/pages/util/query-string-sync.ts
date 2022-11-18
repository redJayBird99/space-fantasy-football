let obs: { onQueryStringUpdate: () => void }[] = [];

/** get the current querystring in the url */
export function getQueryString(): { [key: string]: string } {
  const ctx: { [key: string]: string } = {};

  for (const [key, value] of new URLSearchParams(location.search)) {
    ctx[key] = value;
  }

  return ctx;
}

/** save in the url queryString all the key value pairs in c,
 * if the value is a string or has a toString value is setted otherwise if a
 * value is undefined or null remove it */
export function save(c: { [key: string]: unknown }) {
  const prs = new URLSearchParams(location.search);

  for (const [k, v] of Object.entries(c)) {
    if (typeof v === "string") {
      prs.set(k, v);
    } else if ((v as any)?.toString) {
      prs.set(k, (v as any).toString());
    } else if (v === undefined || v === null) {
      prs.delete(k);
    }
  }

  history.replaceState({}, "", "?" + prs.toString());
  obs.forEach((o) => o.onQueryStringUpdate());
}

/** every time a new querystring is saved call the observer */
export function addObserver(obr: { onQueryStringUpdate: () => void }) {
  obs.push(obr);
}

export function removeObserver(obr: { onQueryStringUpdate: () => void }) {
  obs = obs.filter((o) => obr !== o);
}
