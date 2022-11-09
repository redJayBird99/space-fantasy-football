/** go directly to the given link href */
export function goTo(href: URL | string): void {
  history.pushState({}, "", href);
  history.pushState({}, "", href);
  history.back();
}

/** handle the clicking of an anchor element with the client side router  */
export function handleLinkClick(e: Event): void {
  e.preventDefault();
  e.stopPropagation();

  if (e.target instanceof HTMLElement) {
    const a = e.target.closest("a");
    a?.hasAttribute("href") && goTo(a.getAttribute("href")!);
  }
}

export type Route = { path: string; page: string };

export class Router {
  private routes = new Map<string, string>();

  /**
   * @param root is the node where the pages are going to be appended
   * @param defaultPage when no route is matched show this page
   */
  constructor(public root: HTMLElement, public defaultPage?: string) {
    window.addEventListener("popstate", this.renderPage);
  }

  /**
   * add pages (string elements) to display when the associated path is matched
   * @param pages path and a string element pairs handled by the router
   */
  addRoutes(pages: Route[]): Router {
    const atLoct = location.origin + location.pathname;
    pages.forEach((p) => this.routes.set(new URL(p.path, atLoct).href, p.page));
    return this;
  }

  /** render the page corresponding to the current url */
  renderPage = () => {
    const page = this.routes.get(location.origin + location.pathname);
    this.root.innerHTML = `${page ?? this.defaultPage ?? ""}`;
  };
}

/**
 * check if the current page is already on the given url
 * @param url relative or absolute
 */
export function atUrl(url: string): boolean {
  return location.href === new URL(url, location.origin).href;
}
