import { Link } from "react-router-dom";
import "../styles/referralPreview.css";

function ReferralPreview() {
  return (
    <section className="referral-preview-section">

      <div className="referral-preview-card">

        <div className="referral-preview-content">

          <div className="referral-preview-label">
            🏆 REFERRAL COMPETITION
          </div>

          <h2>
            Invite friends.
            <span> Climb higher.</span>
          </h2>

          <p>
            Share your unique referral link, bring new
            members to Vexora, and compete for the top
            spot on the leaderboard.
          </p>

          <div className="referral-preview-actions">

            <Link
              to="/invites"
              className="referral-preview-button"
            >
              VIEW REFERRALS
            </Link>

            <div className="referral-preview-note">
              🔗 Your personal referral dashboard
            </div>

          </div>

        </div>

        <div className="referral-preview-visual">

          <div className="referral-preview-icon">
            🔗
          </div>

          <div className="referral-preview-rank">

            <span>
              COMPETE
            </span>

            <strong>
              #1
            </strong>

            <small>
              Top referrers win
            </small>

          </div>

        </div>

      </div>

    </section>
  );
}

export default ReferralPreview;