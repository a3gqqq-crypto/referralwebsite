import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import SkeletonRows from "./SkeletonRows";
import PlayerChip, { PLAYER_COLUMNS } from "./PlayerChip";

import "../styles/invites.css";

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : "Recently";

function ReferralHistory({ user }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const load = async () => {
      // Sign-ups that count once they confirm their email.
      supabase.rpc("my_pending_invites").then(({ data }) => {
        if (!cancelled) setPending(data || 0);
      });

      let { data: rows, error: rowsError } = await supabase
        .from("referrals")
        .select("invited_user_id, created_at")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false });

      // Older tables may not have created_at.
      if (rowsError) {
        const fallback = await supabase
          .from("referrals")
          .select("invited_user_id")
          .eq("inviter_id", user.id);

        rows = fallback.data;
        rowsError = fallback.error;
      }

      if (cancelled) return;

      if (rowsError) {
        console.error(rowsError);
        setError("Could not load your referral history.");
        setLoading(false);
        return;
      }

      if (!rows || rows.length === 0) {
        setReferrals([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(PLAYER_COLUMNS)
        .in(
          "id",
          rows.map((row) => row.invited_user_id)
        );

      if (cancelled) return;

      if (profilesError) {
        console.error(profilesError);
        setError("Could not load the people you invited.");
        setLoading(false);
        return;
      }

      const byId = new Map(
        (profiles || []).map((profile) => [profile.id, profile])
      );

      setError("");
      setReferrals(
        rows.map((row) => ({
          ...row,
          profile: byId.get(row.invited_user_id) || {
            username: `user_${row.invited_user_id?.slice(0, 6)}`,
          },
        }))
      );
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`referral-history-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referrals",
          filter: `inviter_id=eq.${user.id}`,
        },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <section className="invites-panel">
      <div className="invites-panel-head">
        <div>
          <span className="eyebrow">Your people</span>
          <h2>Who joined</h2>
        </div>

        {!loading && !error && (
          <span className="invites-count mono">
            {referrals.length}
          </span>
        )}
      </div>

      {pending > 0 && (
        <p className="invites-pending">
          ⏳ {pending} more {pending === 1 ? "person" : "people"} signed up with your link but haven't confirmed
          their email yet. They count as soon as they click the link in their inbox.
        </p>
      )}

      {loading ? (
        <SkeletonRows count={3} />
      ) : error ? (
        <div className="notice notice-error">{error}</div>
      ) : referrals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">👋</div>
          <h3>Nobody yet</h3>
          <p>
            When someone signs up with your link and confirms
            their email, they'll show up here.
          </p>
        </div>
      ) : (
        <ol className="history-list">
          {referrals.map((referral) => (
            <li key={referral.invited_user_id} className="history-row">
              <PlayerChip player={referral.profile} size={34} />

              <span className="history-date">
                {formatDate(referral.created_at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default ReferralHistory;
