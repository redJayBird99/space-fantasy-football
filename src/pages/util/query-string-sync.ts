let obs: { onQueryStringUpdate: () => void }[] = [];

/** get the current querystring in the url */
export function getQueryString(): { [key: string]: string } {
  const ctx: { [key: string]: string } = {};

  for (const [key, value] of new URLSearchParams(location.search)) {
    ctx[key] = value;
  }

  return ctx;
}

/** save all the key value pairs in c that are string or have a toString method */
export function save(c: object) {
  const prs = new URLSearchParams(
    Object.entries(c)
      .filter(([, e]) => typeof e === "string" || e?.toString)
      .map((e) => {
        if (typeof e[1] === "string") {
          return [e[0], e[1]];
        } else {
          return [e[0], e[1].toString()];
        }
      })
  );
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
