/** go directly to the given link href */
export function goTo(href: URL | string): void {
  history.pushState({}, "", href);
  history.pushState({}, "", href);
  history.back();
}

/**
 * add the url as a href attribute,
 * for accessibility add an <a> element as child (with the same href)
 */
export class Go extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.addEventListener("click", this.handleClick);
    }
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
  }

  handleClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    if (this.hasAttribute("href")) {
      goTo(this.getAttribute("href")!);
    }
  };
}

if (!customElements.get("sff-go")) {
  customElements.define("sff-go", Go);
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
