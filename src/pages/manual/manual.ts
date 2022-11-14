// this is only the main content of the manual not the entire page
import { html, TemplateResult } from "lit-html";
import subPlayerPng from "../../asset/player-sub-image.png";
import subPlayerWebp from "../../asset/player-sub-image.webp";

export function manualContent(): TemplateResult {
  return html` <article class="cnt-manual">
    ${introduction()}${player()}${team()}${howTo()}
  </article>`;
}

function introduction(): TemplateResult {
  return html`
    <h2>Space Fantasy Football Manual</h2>
    <p>
      Space Fantasy Football is a football (soccer) management game, but there
      are some major differences from the conventional rules, Some of these
      differences are taken from the NBA system. All characters are fictional
      and randomly generated for each new league
    </p>
    <h3>Some of the major differences</h3>
    <ul>
      <li>
        Roughly the NBA contractual system (you can't buy or sell players only
        trades are allowed)
      </li>
      <li>Roughly the NBA draft system with some differences</li>
      <li>The promotion and relegation systems is temporarily not exist</li>
      <li>Players can’t be loaned out to other clubs</li>
      <li>Roughly The NBA salary cap (and minimum salary cap)</li>
    </ul>
  `;
}

function player(): TemplateResult {
  return html`
    <article class="cnt-about">
      <h3>Players</h3>
      <div>
        <h4>Player skills</h4>
        <p>
          The players skills are divided in two category the macro skills (which
          are mobility, physic, goalkeeper, defense, ability and offense) and
          skills. The macro skill is just a category for a set of skills, its
          value is just the mean of that set. The skill instead is a rating
          value between 0 (very bad) and 100 (very good).
        </p>
        <p>
          When a player isn't positioned in his natural position a penalty will
          be applied to some skills, the severity of the penalty is depend on
          position. the penalty for a cb playing as a cf is more severe than
          paying as a rb
        </p>
      </div>
      <div>
        <h4>Player Rating</h4>
        <p>
          The rating value indicates how good a player is respect to all other
          players, when the player is playing in his natural position. This
          value is calculated according to the normal distribution model
          <a
            target="_blank"
            href="https://en.wikipedia.org/wiki/Normal_distribution"
            >wiki normal distribution</a
          >
        </p>
      </div>
      <div>
        <h4>Player Improvability</h4>
        <p>
          The Improvability value indicates how rapidly a player improves his
          skills respect to all other players, usually the player growth stops
          around 27 years old. the correctness of this values is depend on the
          team scouting, and it is calculated according to the normal
          distribution model
          <a
            target="_blank"
            href="https://en.wikipedia.org/wiki/Normal_distribution"
            >wiki normal distribution</a
          >
        </p>
      </div>
    </article>
  `;
}

function team(): TemplateResult {
  return html`
    <article class="cnt-about" id="team">
      <h3>Team</h3>
      <div>
        <h4>Team requirements</h4>
        <p>
          The maximum number of players allowed in team is 30, and the minimum
          is 18. The salary cap is 320 thousand cosmos (cosmos is the name of
          the game currency), and the minimum salary cap is 200 thousand cosmos,
          the salary limits are fixed for every team. There isn't any limit on
          which player can be traded, although at the moment lottery picks
          aren't tradable
        </p>
      </div>
      <div>
        <h4>Team scouting, facilities and health</h4>
        <p>
          the scouting effects how precise the improvability value is, the
          health shorten the injury recovery time and the facilities are a
          factor in your team appeal. All the effects above are depend on how
          much the team is spending on them
        </p>
      </div>
      <div>
        <h4>Team appeal and fan base</h4>
        <p>
          The fan base size effects the revenue stream and the appeal of the
          team, larger is better. When a team has an high appeal players are
          usually more willing to sign, the appeal value is effected by the
          facilities, fan base size and team performances
        </p>
      </div>
      <div>
        <h4>Salary cap</h4>
        <p>
          The salary cap works mostly like
          <a href="https://en.wikipedia.org/wiki/NBA_salary_cap" target="_blank"
            >the NBA salary cap</a
          >, teams can still re-sign players for any salary, or sign new players
          for the minimum salary (3,200 cosmos per year), even if they are over
          the cap. teams exceeding the salary cap or below the minium salary cap
          are punished by being forced to pay luxury tax
        </p>
      </div>
    </article>
  `;
}

function howTo(): TemplateResult {
  return html`
    <article class="cnt-about">
      <h3>How to</h3>
      <div class="cnt-sub">
        <h4>substitute a player in the formation</h4>
        <p>
          click the button in red, it will open a modal where you can select
          where to position the clicked player
        </p>
        <picture>
          <source srcset=${subPlayerWebp} type="image/webp" />
          <img
            src=${subPlayerPng}
            alt="substitute button img"
            loading="lazy"
            width="780"
            height="75"
          />
        </picture>
      </div>
      <div>
        <h4>What the auto update formation does</h4>
        <p>
          this option guaranteed that before simulating a match your formation
          will be updated, this is a global setting shared by all your leagues
        </p>
      </div>
      <div>
        <h4>How to save</h4>
        <p>
          you have to two options one is to use the save file button below the
          header, and the other is to use the save button. the second option is
          the slot dedicated to the autosave (the autosave saves only after a
          simulation run, so you have some margin to make mistakes), it uses the
          Browser API
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API"
            target="_blank"
            >indexedDB</a
          >, so be careful when you clean the Browser data. The game is still
          playable only using the first option
        </p>
      </div>
    </article>
  `;
}
