import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/leaderboard.css";

function Leaderboard({ user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = async () => {
    setLoading(true);
    setError("");

    const { data, error: leaderboardError } = await supabase
      .from("profiles")
      .select("id, username, referral_count, created_at")
      .order("referral_count", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (leaderboardError) {
      console.error(leaderboardError);

      setError("Could not load the leaderboard.");
      setLoading(false);

      return;
    }

    setLeaderboard(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboard();

    const channel = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getInitial = (username) => {
    return username?.charAt(0)?.toUpperCase() || "?";
  };

  const getRank = (profileId) => {
    const index = leaderboard.findIndex(
      (profile) => profile.id === profileId
    );

    return index === -1 ? null : index + 1;
  };

  const currentUserRank = user
    ? getRank(user.id)
    : null;

  const topThree = leaderboard.slice(0, 3);
  const remainingUsers = leaderboard.slice(3);

  if (loading) {
    return (
      <section className="leaderboard-section">

        <div className="section-heading">
          <div>
            <div className="section-label">
              COMPETE
            </div>

            <h2>
              Referral Leaderboard
            </h2>
          </div>
        </div>

        <div className="leaderboard-loading">
          Loading live rankings...
        </div>

      </section>
    );
  }

  return (
    <section className="leaderboard-section">

      <div className="section-heading">

        <div>

          <div className="section-label">
            COMPETE
          </div>

          <h2>
            Referral Leaderboard
          </h2>

        </div>

        <div className="updated">

          <span className="status-dot"></span>

          Live Rankings

        </div>

      </div>

      {error && (
        <div className="leaderboard-error">
          {error}
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="leaderboard-empty">

          <div className="empty-icon">
            🏆
          </div>

          <h3>
            No rankings yet
          </h3>

          <p>
            Start inviting friends to claim the top spot.
          </p>

        </div>
      ) : (
        <>
          {/* TOP 3 */}

          {topThree.length > 0 && (
            <div className="podium">

              {/* SECOND */}

              {topThree[1] && (
                <div className="podium-card second">

                  <div className="rank-circle">
                    2
                  </div>

                  <div className="avatar">
                    {getInitial(
                      topThree[1].username
                    )}
                  </div>

                  <h3>
                    {topThree[1].username}
                  </h3>

                  <p>
                    {topThree[1].referral_count}{" "}
                    referrals
                  </p>

                  <div className="podium-place">
                    2ND
                  </div>

                </div>
              )}

              {/* FIRST */}

              {topThree[0] && (
                <div className="podium-card first">

                  <div className="crown">
                    👑
                  </div>

                  <div className="rank-circle">
                    1
                  </div>

                  <div className="avatar">
                    {getInitial(
                      topThree[0].username
                    )}
                  </div>

                  <h3>
                    {topThree[0].username}
                  </h3>

                  <p>
                    {topThree[0].referral_count}{" "}
                    referrals
                  </p>

                  <div className="podium-place">
                    1ST
                  </div>

                </div>
              )}

              {/* THIRD */}

              {topThree[2] && (
                <div className="podium-card third">

                  <div className="rank-circle">
                    3
                  </div>

                  <div className="avatar">
                    {getInitial(
                      topThree[2].username
                    )}
                  </div>

                  <h3>
                    {topThree[2].username}
                  </h3>

                  <p>
                    {topThree[2].referral_count}{" "}
                    referrals
                  </p>

                  <div className="podium-place">
                    3RD
                  </div>

                </div>
              )}

            </div>
          )}

          {/* REMAINING USERS */}

          {remainingUsers.length > 0 && (
            <div className="leaderboard-list">

              {remainingUsers.map(
                (profile, index) => {

                  const rank = index + 4;

                  const isCurrentUser =
                    profile.id === user?.id;

                  return (
                    <div
                      className={`leaderboard-row ${
                        isCurrentUser
                          ? "current-user"
                          : ""
                      }`}
                      key={profile.id}
                    >

                      <div className="rank">
                        #{rank}
                      </div>

                      <div className="user-info">

                        <div className="avatar small">
                          {getInitial(
                            profile.username
                          )}
                        </div>

                        <div>

                          <strong>
                            {profile.username}

                            {isCurrentUser && (
                              <span className="you-badge">
                                YOU
                              </span>
                            )}
                          </strong>

                          <span>
                            Referral member
                          </span>

                        </div>

                      </div>

                      <div className="referrals">

                        <strong>
                          {profile.referral_count}
                        </strong>

                        <span>
                          referrals
                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

          {/* CURRENT USER POSITION */}

          {user && currentUserRank && (
            <div className="your-rank-card">

              <div>
                <span>
                  YOUR CURRENT POSITION
                </span>

                <strong>
                  #{currentUserRank}
                </strong>
              </div>

              <div>
                <span>
                  TOTAL PLAYERS
                </span>

                <strong>
                  {leaderboard.length}
                </strong>
              </div>

            </div>
          )}

        </>
      )}

    </section>
  );
}

export default Leaderboard;