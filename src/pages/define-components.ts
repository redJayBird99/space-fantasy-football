import defineLayout from "./util/layout";
import defineModal from "./util/modal";
import defineHome from "./home/home";
import defineGamePage from "./common/game-page";
import defineLeagueTable from "./tables/league-table";
import defineInbox from "./inbox/inbox";
import defineDashboard from "./dashboard/dashboard";
import defineInboxPage from "./inbox/inbox-page";
import defineLeaguePage from "./tables/league";
import definePlayersPage from "./players/players-page";
import definePlayerPage from "./players/player-page";
import defineTeamPage from "./team/team-page";
import defineFinancesPage from "./finances/finances-page";
import defineTransactionsPage from "./transactions/transactions";
import defineDraftPage from "./draft/draft";
import defineRetiringPage from "./players/retiring";
import defineTradePage from "./trade/trade-page";
import defineInGameManual from "./manual/manual-in-game";

export default function define() {
  if (!customElements.get("sff-layout")) {
    defineLayout();
    defineModal();
    defineHome();
    defineLeagueTable();
    defineInbox();
    defineDashboard();
    defineInboxPage();
    defineLeaguePage();
    definePlayersPage();
    definePlayerPage();
    defineTeamPage();
    defineFinancesPage();
    defineTransactionsPage();
    defineDraftPage();
    defineRetiringPage();
    defineTradePage();
    defineInGameManual();
    defineGamePage();
  }
}
