import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/referral.css";

function ReferralCard({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, referral_count")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(profileError);
        setError("Could not load your referral profile.");
      } else {
        setProfile(data);
      }

      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const username = profile?.username || "";

  const referralLink = username
    ? `${window.location.origin}/?ref=${encodeURIComponent(username)}`
    : "";

  const shareMessage =
    "Join the referral competition and climb the leaderboard! 🏆";

  const copyReferralLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (copyError) {
      console.error(copyError);
      setError("Could not copy the referral link.");
    }
  };

  const shareWhatsApp = () => {
    if (!referralLink) return;

    const text = `${shareMessage}\n\n${referralLink}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareTelegram = () => {
    if (!referralLink) return;

    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(
        referralLink
      )}&text=${encodeURIComponent(shareMessage)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return (
      <section className="referral-section">
        <div className="referral-card">
          <div className="referral-loading">
            Loading your referral dashboard...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="referral-section">
      <div className="referral-card">

        <div className="referral-card-top">
          <div>
            <div className="referral-label">
              YOUR REFERRAL DASHBOARD
            </div>

            <h2>
              Welcome{" "}
              <span>
                {profile?.username ||
                  user?.user_metadata?.username ||
                  "Member"}
              </span>
              👋
            </h2>
          </div>

          <div className="referral-icon">
            🔗
          </div>
        </div>

        <div className="referral-stats">

          <div className="referral-stat">
            <span className="referral-stat-label">
              REFERRALS
            </span>

            <strong>
              {profile?.referral_count ?? 0}
            </strong>
          </div>

          <div className="referral-stat">
            <span className="referral-stat-label">
              STATUS
            </span>

            <strong className="status-online">
              ACTIVE
            </strong>
          </div>

          <div className="referral-stat">
            <span className="referral-stat-label">
              RANK
            </span>

            <strong>
              —
            </strong>
          </div>

        </div>

        <div className="referral-link-area">

          <div className="referral-link-heading">
            <span>
              Your unique referral link
            </span>

            <small>
              Share it with your friends
            </small>
          </div>

          <div className="referral-link-box">

            <input
              type="text"
              value={referralLink}
              readOnly
              aria-label="Your referral link"
            />

            <button
              type="button"
              onClick={copyReferralLink}
              disabled={!referralLink}
            >
              {copied ? "✓ Copied" : "Copy Link"}
            </button>

          </div>

          <div className="referral-share-buttons">

            <button
              type="button"
              className="share-button whatsapp"
              onClick={shareWhatsApp}
              disabled={!referralLink}
            >
              <span className="share-icon">◉</span>
              WhatsApp
            </button>

            <button
              type="button"
              className="share-button telegram"
              onClick={shareTelegram}
              disabled={!referralLink}
            >
              <span className="share-icon">➤</span>
              Telegram
            </button>

          </div>

        </div>

        {error && (
          <div className="referral-error">
            {error}
          </div>
        )}

        <div className="referral-tip">
          💡 The more people who sign up through your link,
          the higher you climb on the leaderboard.
        </div>

      </div>
    </section>
  );
}

export default ReferralCard;