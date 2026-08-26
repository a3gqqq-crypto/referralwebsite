import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/referralHistory.css";

function ReferralHistory({ user }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReferrals = async () => {
    if (!user?.id) {
      setReferrals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    // Get everyone referred by the current user
    let { data: referralRows, error: referralError } = await supabase
      .from("referrals")
      .select("invited_user_id, created_at")
      .eq("inviter_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    // Fallback in case the table doesn't have created_at
    if (referralError) {
      const fallback = await supabase
        .from("referrals")
        .select("invited_user_id")
        .eq("inviter_id", user.id);

      referralRows = fallback.data;
      referralError = fallback.error;
    }

    if (referralError) {
      console.error(referralError);
      setError("Could not load your referral history.");
      setLoading(false);
      return;
    }

    if (!referralRows || referralRows.length === 0) {
      setReferrals([]);
      setLoading(false);
      return;
    }

    const invitedUserIds = referralRows.map(
      (referral) => referral.invited_user_id
    );

    // Get usernames for those users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", invitedUserIds);

    if (profilesError) {
      console.error(profilesError);
      setError("Could not load referred users.");
      setLoading(false);
      return;
    }

    const profileMap = new Map(
      (profiles || []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const combined = referralRows.map((referral) => ({
      ...referral,
      profile: profileMap.get(referral.invited_user_id),
    }));

    setReferrals(combined);
    setLoading(false);
  };

  useEffect(() => {
    loadReferrals();

    const channel = supabase
      .channel(`referral-history-${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referrals",
          filter: `inviter_id=eq.${user?.id}`,
        },
        () => {
          loadReferrals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const formatDate = (date) => {
    if (!date) {
      return "Recently joined";
    }

    return new Date(date).toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getInitial = (username) => {
    return (
      username?.charAt(0)?.toUpperCase() || "?"
    );
  };

  return (
    <section className="referral-history-section">

      <div className="referral-history-heading">

        <div>
          <div className="section-label">
            YOUR NETWORK
          </div>

          <h2>
            Referral History
          </h2>

          <p>
            People who joined through your referral link.
          </p>
        </div>

        <div className="referral-count-badge">
          <strong>
            {referrals.length}
          </strong>

          <span>
            {referrals.length === 1
              ? "Referral"
              : "Referrals"}
          </span>
        </div>

      </div>

      {loading ? (
        <div className="referral-history-card">
          <div className="referral-history-loading">
            Loading your referrals...
          </div>
        </div>
      ) : error ? (
        <div className="referral-history-card">
          <div className="referral-history-error">
            {error}
          </div>
        </div>
      ) : referrals.length === 0 ? (
        <div className="referral-history-card empty">

          <div className="referral-empty-icon">
            👥
          </div>

          <h3>
            No referrals yet
          </h3>

          <p>
            Share your referral link and your
            friends will appear here when they join.
          </p>

        </div>
      ) : (
        <div className="referral-history-card">

          <div className="referral-history-list">

            {referrals.map((referral, index) => {

              const username =
                referral.profile?.username ||
                `User_${referral.invited_user_id
                  ?.slice(0, 8)}`;

              return (
                <div
                  className="referral-history-row"
                  key={referral.invited_user_id}
                >

                  <div className="referral-history-user">

                    <div className="referral-history-avatar">
                      {getInitial(username)}
                    </div>

                    <div>
                      <strong>
                        {username}
                      </strong>

                      <span>
                        Referral #{referrals.length - index}
                      </span>
                    </div>

                  </div>

                  <div className="referral-history-right">

                    <span className="referral-joined">
                      Joined
                    </span>

                    <strong>
                      {formatDate(
                        referral.created_at
                      )}
                    </strong>

                  </div>

                </div>
              );
            })}

          </div>

        </div>
      )}

    </section>
  );
}

export default ReferralHistory;