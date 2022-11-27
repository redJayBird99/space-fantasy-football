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

export function cubicBezierY(
  t: number,
  y1: number,
  y2: number,
  y3: number,
  y4: number
): number {
  return (
    (1 - t) ** 3 * y1 +
    3 * (1 - t) ** 2 * t * y2 +
    3 * (1 - t) * t ** 2 * y3 +
    t ** 3 * y4
  );
}

/** transform the given camel case string to a normal string with spaces, camelCase => camel Case */
export function breakCamelCase(s: string): string {
  return s.replace(/([A-Z])/g, " $1");
}
