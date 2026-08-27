import ReferralCard from "../components/ReferralCard";
import ReferralHistory from "../components/ReferralHistory";
import Leaderboard from "../components/Leaderboard";

import "../styles/invites.css";

function InvitesPage({ user }) {
  return (
    <main className="invites-page">

      {/* =========================================
          PAGE INTRO
      ========================================= */}

      <section className="invites-header">

        <div className="invites-header-label">
          VEXORA REFERRALS
        </div>

        <h1>
          Invite friends.
          <span> Climb higher.</span>
        </h1>

        <p>
          Build your network, track your referrals,
          and compete for the top spot.
        </p>

      </section>


      {/* =========================================
          PERSONAL DASHBOARD
      ========================================= */}

      <ReferralCard user={user} />


      {/* =========================================
          COMPETITION AREA
      ========================================= */}

      <section className="invites-competition">

        <div className="invites-competition-heading">

          <div>

            <div className="invites-section-label">
              YOUR COMPETITION
            </div>

            <h2>
              Track everything.
            </h2>

          </div>

        </div>


        <div className="invites-panels">

          {/* REFERRAL HISTORY */}

          <div className="invites-panel">

            <ReferralHistory user={user} />

          </div>


          {/* LEADERBOARD */}

          <div className="invites-panel">

            <Leaderboard user={user} />

          </div>

        </div>

      </section>

    </main>
  );
}

export default InvitesPage;