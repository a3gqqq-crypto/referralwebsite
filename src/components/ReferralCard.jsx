import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import Icon from "./Icon";
import { displayNameOf } from "../data/cosmetics";
import {
  useCopy,
  canNativeShare,
  nativeShare,
  referralLinkFor,
} from "../hooks/useCopy";

import "../styles/invites.css";

const SHARE_MESSAGE =
  "Join me on Vexora — invite friends, climb the leaderboard, win real prizes 🏆";

function ReferralCard({ user }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [copied, copy] = useCopy();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const load = async () => {
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("id, username, display_name, referral_count");

      if (cancelled) return;

      if (loadError) {
        console.error(loadError);
        setError("Could not load your referral stats.");
        return;
      }

      const sorted = [...(data || [])].sort(
        (a, b) => (b.referral_count || 0) - (a.referral_count || 0)
      );

      const index = sorted.findIndex((row) => row.id === user.id);

      setStats({
        username: index >= 0 ? sorted[index].username : null,
        referrals: index >= 0 ? sorted[index].referral_count || 0 : 0,
        rank: index >= 0 ? index + 1 : null,
        players: sorted.length,
        nextUp: index > 0 ? sorted[index - 1] : null,
      });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const username =
    stats?.username || user?.user_metadata?.username || "";

  const referralLink = referralLinkFor(username);

  const gap =
    stats?.nextUp
      ? (stats.nextUp.referral_count || 0) - stats.referrals + 1
      : null;

  const openShare = (url) =>
    window.open(url, "_blank", "noopener,noreferrer");

  return (
    <section className="invite-card card">

      <div className="invite-card-link">
        <span className="eyebrow">Your invite link</span>

        <code className="invite-card-url mono">
          {referralLink || "Set a username to get your link"}
        </code>

        <div className="invite-card-buttons">
          <button
            type="button"
            className={`btn ${copied ? "btn-success" : "btn-primary"}`}
            onClick={() => copy(referralLink)}
            disabled={!referralLink}
          >
            <Icon name={copied ? "check" : "copy"} />
            {copied ? "Copied" : "Copy link"}
          </button>

          <button
            type="button"
            className="btn invite-share-whatsapp"
            onClick={() =>
              openShare(
                `https://wa.me/?text=${encodeURIComponent(
                  `${SHARE_MESSAGE}\n\n${referralLink}`
                )}`
              )
            }
            disabled={!referralLink}
          >
            WhatsApp
          </button>

          <button
            type="button"
            className="btn invite-share-telegram"
            onClick={() =>
              openShare(
                `https://t.me/share/url?url=${encodeURIComponent(
                  referralLink
                )}&text=${encodeURIComponent(SHARE_MESSAGE)}`
              )
            }
            disabled={!referralLink}
          >
            Telegram
          </button>

          {canNativeShare && (
            <button
              type="button"
              className="btn"
              onClick={() =>
                nativeShare({
                  title: "Vexora",
                  text: SHARE_MESSAGE,
                  url: referralLink,
                })
              }
              disabled={!referralLink}
            >
              <Icon name="share" />
              More
            </button>
          )}
        </div>

        {error && (
          <div className="notice notice-error">{error}</div>
        )}
      </div>


      <dl className="invite-card-stats">
        <div className="invite-stat invite-stat-main">
          <dt>Referrals</dt>
          <dd className="mono">{stats ? stats.referrals : "—"}</dd>
        </div>

        <div className="invite-stat">
          <dt>Rank</dt>
          <dd className="mono">
            {stats?.rank ? `#${stats.rank}` : "—"}
          </dd>
        </div>

        <div className="invite-stat">
          <dt>Players</dt>
          <dd className="mono">{stats ? stats.players : "—"}</dd>
        </div>

        <p className="invite-card-nudge">
          {!stats
            ? "Loading your numbers…"
            : stats.rank === 1
              ? "You're #1. Everyone's chasing you now."
              : gap
                ? `${gap} more ${gap === 1 ? "invite" : "invites"} to pass ${displayNameOf(stats.nextUp)}.`
                : "Share your link to get on the board."}
        </p>
      </dl>

    </section>
  );
}

export default ReferralCard;
