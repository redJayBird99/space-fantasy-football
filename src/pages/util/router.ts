import { nothing, render, TemplateResult } from "lit-html";

export type Route = {
  /** the path string should conform to the URLPattern pathname */
  path: string;
  // eslint-disable-next-line no-undef
  content: (m: URLPatternResult | null) => TemplateResult;
};

/** go directly to the given link href */
export function goTo(href: URL | string): void {
  const url = new URL(href, location.href);
  history.pushState({}, "", url);
  history.pushState({}, "", url);
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

/** list of listeners for the url update */
const urlObservers: Set<{ onUrlUpdate: () => unknown }> = new Set();

/**
 * init the router on the current document, it can be called only once
 * @param root is the node where the route content will be rendered
 * @routes list of al possible route available to the Router
 * @param defaultContent when the Router doesn't find a route match render this content
 */
export function init(
  root: HTMLElement,
  rs: Route[],
  defaultContent?: TemplateResult
) {
  if (urlObservers.size === 0) {
    window.addEventListener("popstate", () =>
      urlObservers.forEach((o) => o.onUrlUpdate())
    );
    urlObservers.add(new Router(root, rs, defaultContent));
  }
}

/** search the the route matching the pathname of the current url,
 * @param routes the path should conform to the URLPattern pathname
 */
function getRoute<T extends { path: string }>(routes: T[]): T | void {
  // TODO: this could be easily used with relative paths using a sub section of the location.pathname
  return routes.find((r) =>
    // eslint-disable-next-line no-undef
    new URLPattern({ pathname: r.path }).test({
      pathname: location.pathname,
    })
  );
}

/** this router is meant for the nested routing, on the first installation use the function init */
export class Router {
  private routes: Route[] = [];
  private defaultContent?: TemplateResult | typeof nothing = nothing;

  /**
   * @param root is the node where the route content will be rendered
   * @routes list of al possible route available to the Router
   * @param defaultContent when the Router doesn't find a route match render this content
   */
  constructor(
    private root: HTMLElement,
    routes: Route[],
    defaultContent?: TemplateResult
  ) {
    this.routes.push(...routes);
    defaultContent && (this.defaultContent = defaultContent);
    urlObservers.add(this);
    this.renderContent();
  }

  /**
   * add routes to render when path is matched
   * @param routes the path should conform to the URLPattern pathname
   */
  addRoutes(routes: Route[]) {
    this.routes.push(...routes);
  }

  onUrlUpdate() {
    this.renderContent();
  }

  /** render the content of the route matching the pathname of the current url, */
  renderContent() {
    const route = getRoute(this.routes);
    const match = route
      ? // eslint-disable-next-line no-undef
        new URLPattern({ pathname: route.path }).exec({
          pathname: location.pathname,
        })
      : null;

    render(route?.content(match) ?? this.defaultContent, this.root);
  }

  /** called this function when the router isn't need anymore */
  disconnect() {
    urlObservers.delete(this);
  }
}
