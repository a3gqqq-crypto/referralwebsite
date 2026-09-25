import ReferralCard from "../components/ReferralCard";
import ReferralHistory from "../components/ReferralHistory";
import Leaderboard from "../components/Leaderboard";
import { useReveal } from "../hooks/useReveal";

import "../styles/invites.css";

function InvitesPage({ user }) {
  const [panelsRef, panelsVisible] = useReveal();

  return (
    <main className="page invites-page">

      <header className="page-header">
        <span className="eyebrow">Invites</span>

        <h1>
          Your people, <span className="mark">your points.</span>
        </h1>

        <p>
          One link, one count. Everyone who signs up
          through it moves you up the board.
        </p>
      </header>

      <ReferralCard user={user} />

      <div
        ref={panelsRef}
        className={`invites-panels reveal-section ${
          panelsVisible ? "reveal-visible" : ""
        }`}
      >
        <Leaderboard user={user} />
        <ReferralHistory user={user} />
      </div>

    </main>
  );
}

export default InvitesPage;
