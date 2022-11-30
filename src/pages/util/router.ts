import { nothing, render, TemplateResult } from "lit-html";

export type Route = {
  /** the path string should conform to the URLPattern pathname */
  path: string;
  // eslint-disable-next-line no-undef
  content: (m: URLPatternResult | null) => TemplateResult;
};

/** if the href start with a "/" and without the public path attach the public path to the returned href */
export function resolvePublicPath(href: string): string {
  return href.startsWith("/") && !href.startsWith(window.$PUBLIC_PATH)
    ? window.$PUBLIC_PATH + href.substring(1)
    : href;
}

/** go directly to the given link href
 * if the href start with "/" it get substituted with the public path
 */
export function goTo(href: string): void {
  const url = new URL(resolvePublicPath(href), location.href);
  history.pushState({}, "", url);
  history.pushState({}, "", url);
  history.back();
}

/** handle the navigation click any element with a href with the client side router  */
export function onLinkClick(e: Event): void {
  if (
    e.currentTarget instanceof HTMLElement &&
    e.currentTarget.hasAttribute("href")
  ) {
    e.preventDefault();
    goTo(e.currentTarget.getAttribute("href")!);
  }
}

/** list of listeners for the url update */
const urlObservers: Set<{ onUrlUpdate: () => unknown }> = new Set();
/** every time the main router end the routing process call these observes */
export const afterRouteLeave: Set<{ onRouteLeave: () => unknown }> = new Set();

/**
 * init the router on the current document, it can be called only once
 * @param root is the node where the route content will be rendered
 * @routes list of al possible route available to the Router
 * @param defaultContent when the Router doesn't find a route match render this content
 * @param preMatching called before the router start matching the new url
 */
export function init(
  root: HTMLElement,
  rs: Route[],
  defaultContent?: TemplateResult,
  preMatching?: () => void
) {
  if (urlObservers.size === 0) {
    window.addEventListener("popstate", () =>
      urlObservers.forEach((o) => o.onUrlUpdate())
    );
    urlObservers.add(new Router(root, rs, defaultContent, preMatching));
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
  private preRender?: () => void;

  /**
   * @param root is the node where the route content will be rendered
   * @routes list of al possible route available to the Router
   * @param defaultContent when the Router doesn't find a route match render this content
   * @param preMatching called before the router start matching the new url
   */
  constructor(
    private root: HTMLElement,
    routes: Route[],
    defaultContent?: TemplateResult,
    preMatching?: () => void
  ) {
    this.routes.push(...routes);
    defaultContent && (this.defaultContent = defaultContent);
    urlObservers.add(this);
    this.preRender = preMatching;
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
    this.preRender?.();
    const route = getRoute(this.routes);
    const match = route
      ? // eslint-disable-next-line no-undef
        new URLPattern({ pathname: route.path }).exec({
          pathname: location.pathname,
        })
      : null;

    render(route?.content(match) ?? this.defaultContent, this.root);
    afterRouteLeave.forEach((o) => o.onRouteLeave());
  }

  /** called this function when the router isn't need anymore */
  disconnect() {
    urlObservers.delete(this);
  }
}
