import { html, TemplateResult } from "lit-html";
import ghLogo from "../../asset/github-mark.svg";

export function forkMe(): TemplateResult {
  return html`
    <p class="fork-gh">
      <span>fork me on</span>
      <a
        target="_blank"
        href="https://github.com/RedAndBlu/space-fantasy-football"
      >
        <img src=${ghLogo} alt="gitHub logo" width="20" height="20" />
      </a>
    </p>
  `;
}
