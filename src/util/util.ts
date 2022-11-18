/**
 *
 * replace all the occurrences of the ${value} similary to template literals,
 * but is a simpler version and only for string not expressions
 * when a value from subs is missing an empty string is used
 * @param tx string to interpolate
 * @param subs replacementes strings for the given key value
 * @returns a new string with the specified replacementes
 */
export function interpolate(tx: string, subs: { [k: string]: string }): string {
  return tx.replace(/\$\{([^}]*)\}/g, (_, p) => {
    return subs[p] ?? "";
  });
}

/** get the date part of the ISO format */
export function toISODateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * check if the current page is already on the given url
 * @param url relative or absolute
 */

export function atUrl(url: string): boolean {
  return location.href === new URL(url, location.origin).href;
}
