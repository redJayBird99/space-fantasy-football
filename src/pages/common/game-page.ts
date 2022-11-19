import { html, nothing, TemplateResult } from "lit-html";
import { until } from "lit-html/directives/until.js";
import style from "./game-page.css";
import defineMenuBar from "./menu-bar";
import defineGameHeader from "./game-header";
import defineGameNav from "./game-nav";
import { forkMe } from "./fork-me";
import { Router } from "../util/router";
import { page404 } from "./page-404";
defineMenuBar();
defineGameHeader();
defineGameNav();

/** this element acts as the Router for the in game pages */
class GamePage extends HTMLElement {
  private basePath = `${window.$PUBLIC_PATH}:gName/`;
  private router?: Router;

  /**
   * @param main the main content of the game page
   */
  pageTemplate = (gName: string, main: TemplateResult | typeof nothing) => {
    return html`
      <sff-layout>
        <style>
          ${style}
        </style>
        <sff-game-header .gName=${gName} slot="in-header"></sff-game-header>
        <sff-game-nav .gName=${gName} slot="in-nav"></sff-game-nav>
        <div slot="in-main">
          <menu-bar></menu-bar>
          <div class="game-main">${main}</div>
        </div>
        <div slot="in-footer">${footerInfos()} ${forkMe()}</div>
      </sff-layout>
    `;
  };

  errorPageTemplate = (gName: string) => {
    // TODO a proper 404 page
    html`<div>
      <div>sorry, the page you are looking for doesn't exist</div>
    </div>`;
  };

  // eslint-disable-next-line no-undef
  render = (m: URLPatternResult | null, main: TemplateResult) => {
    const gName = m!.pathname.groups.gName;

    if (!window.$game.state && gName) {
      // if the game isn't already loaded like when navigating directly from  a
      // link try to get the save from the db before rendering the page
      const content = new Promise((resolve) => {
        window.$game.loadGameFromDB(
          m!.pathname.groups.gName!,
          () => resolve(this.pageTemplate(gName!, main)),
          () => resolve(page404())
        );
      });

      return html`${until(content, nothing)}`;
    }

    return this.pageTemplate(gName!, main);
  };

  disconnectedCallback() {
    this.router?.disconnect();
  }

  connectedCallback() {
    if (this.isConnected) {
      this.router = new Router(
        this,
        [
          {
            path: `${this.basePath}dashboard`,
            content: (m) =>
              this.render(m, html`<sff-dashboard></sff-dashboard>`),
          },
          {
            path: `${this.basePath}players`,
            content: (m) => this.render(m, html`<sff-players></sff-players>`),
          },
          {
            path: `${this.basePath}players/player`,
            content: (m) => this.render(m, html`<sff-player></sff-player>`),
          },
          {
            path: `${this.basePath}league`,
            content: (m) => this.render(m, html`<sff-league></sff-league>`),
          },
          {
            path: `${this.basePath}inbox`,
            content: (m) =>
              this.render(m, html`<sff-inbox-page></sff-inbox-page>`),
          },
          {
            path: `${this.basePath}team`,
            content: (m) => this.render(m, html`<sff-team></sff-team>`),
          },
          {
            path: `${this.basePath}finances`,
            content: (m) =>
              this.render(m, html`<sff-team-finances></sff-team-finances>`),
          },
          {
            path: `${this.basePath}transactions`,
            content: (m) =>
              this.render(m, html`<sff-transactions></sff-transactions>`),
          },
          {
            path: `${this.basePath}draft`,
            content: (m) => this.render(m, html`<sff-draft></sff-draft>`),
          },
          {
            path: `${this.basePath}retiring`,
            content: (m) =>
              this.render(m, html`<retiring-players></retiring-players>`),
          },
          {
            path: `${this.basePath}trade`,
            content: (m) => this.render(m, html`<sff-trade></sff-trade>`),
          },
          {
            path: `${this.basePath}trade-offers`,
            content: (m) =>
              this.render(m, html`<sff-trade data-offers=""></sff-trade>`),
          },
          {
            path: `${this.basePath}game-manual`,
            content: (m) =>
              this.render(m, html`<sff-game-manual></sff-game-manual>`),
          },
        ],
        page404()
      );
    }
  }
}

function footerInfos(): TemplateResult {
  return html`
    <ul class="footer-infos">
      <li>
        <a
          href="https://github.com/RedAndBlu/space-fantasy-football#readme"
          target="_blank"
          >about</a
        >
      </li>
      <li>
        <a
          href="https://github.com/RedAndBlu/space-fantasy-football/issues"
          target="_blank"
          >Report an issue</a
        >
      </li>
    </ul>
  `;
}

export default function define() {
  if (!customElements.get("sff-game-page")) {
    customElements.define("sff-game-page", GamePage);
  }
}
