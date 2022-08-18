/** go directly to the given link href */
function goTo(href: URL | string): void {
  history.pushState({}, "", href);
  history.pushState({}, "", href);
  history.back();
}

/**
 * add the url as a href attribute,
 * for accessibility add an <a> element as child (with the same href)
 */
class Go extends HTMLElement {
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

    if (this.hasAttribute("href")) {
      goTo(this.getAttribute("href")!);
    }
  };
}

if (!customElements.get("sff-go")) {
  customElements.define("sff-go", Go);
}

type Route = { path: string; page: string };

class Router {
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

export { goTo, Router, Route };
