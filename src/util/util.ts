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
