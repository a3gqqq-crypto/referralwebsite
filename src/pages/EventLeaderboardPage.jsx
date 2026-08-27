import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import { events } from "../data/events";

import "../styles/eventLeaderboard.css";

function EventLeaderboardPage({ user }) {
  const { eventId } = useParams();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const event = useMemo(() => {
    return events.find(
      (item) => item.id === eventId
    );
  }, [eventId]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      setError("");

      if (!event) {
        setError("Event not found.");
        setLoading(false);
        return;
      }

      /*
       * Get everyone who joined this event.
       */
      const {
        data: participants,
        error: participantError,
      } = await supabase
        .from("event_participants")
        .select("user_id")
        .eq("event_id", event.id);

      if (participantError) {
        console.error(participantError);

        setError(
          "Could not load the event leaderboard."
        );

        setLoading(false);
        return;
      }

      const participantIds = (
        participants || []
      ).map(
        (participant) =>
          participant.user_id
      );

      /*
       * Nobody has joined yet.
       */
      if (participantIds.length === 0) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      /*
       * Load usernames + referral counts.
       */
      const {
        data: profiles,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, username, referral_count"
        )
        .in("id", participantIds);

      if (profileError) {
        console.error(profileError);

        setError(
          "Could not load player rankings."
        );

        setLoading(false);
        return;
      }

      /*
       * Highest referral count first.
       */
      const rankedPlayers = [
        ...(profiles || []),
      ]
        .sort(
          (a, b) =>
            (b.referral_count || 0) -
            (a.referral_count || 0)
        )
        .map((player, index) => ({
          ...player,
          rank: index + 1,
        }));

      setPlayers(rankedPlayers);
      setLoading(false);
    };

    loadLeaderboard();
  }, [event, eventId]);

  const getReward = (position) => {
    const winner =
      event?.rules?.winners?.find(
        (item) =>
          item.position === position
      );

    return winner?.reward || "—";
  };

  const currentUser = players.find(
    (player) =>
      player.id === user?.id
  );

  const topThree = players.slice(0, 3);

  if (!event) {
    return (
      <main className="event-leaderboard-page">

        <div className="event-leaderboard-empty">

          <div className="event-leaderboard-empty-icon">
            🔍
          </div>

          <div className="event-leaderboard-label">
            VEXORA EVENTS
          </div>

          <h1>
            Event not found
          </h1>

          <p>
            This competition could not be found.
          </p>

          <Link
            to="/events"
            className="event-leaderboard-back"
          >
            ← Back to Events
          </Link>

        </div>

      </main>
    );
  }

  return (
    <main className="event-leaderboard-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <section className="event-leaderboard-hero">

        <Link
          to="/events"
          className="event-leaderboard-back"
        >
          ← Back to Events
        </Link>

        <div className="event-leaderboard-label">
          🏆 EVENT LEADERBOARD
        </div>

        <h1>
          {event.title}
        </h1>

        <p>
          Invite the most people and finish in
          the top three to win the rewards.
        </p>

        <div className="event-leaderboard-stats">

          <div className="event-leaderboard-stat">
            <span>
              PRIZE POOL
            </span>

            <strong>
              {event.prize}
            </strong>
          </div>

          <div className="event-leaderboard-stat">
            <span>
              PLAYERS
            </span>

            <strong>
              {players.length}
            </strong>
          </div>

          <div className="event-leaderboard-stat">
            <span>
              YOUR RANK
            </span>

            <strong>
              {currentUser
                ? `#${currentUser.rank}`
                : "—"}
            </strong>
          </div>

        </div>

      </section>


      {/* =========================================
          TOP 3
      ========================================= */}

      <section className="event-podium-section">

        <div className="event-podium">

          {/* SECOND */}

          {topThree[1] && (
            <div className="event-podium-card second">

              <div className="event-podium-medal">
                🥈
              </div>

              <div className="event-podium-avatar">
                {(topThree[1].username || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <span className="event-podium-place">
                2ND PLACE
              </span>

              <h2>
                {topThree[1].username ||
                  "Player"}
              </h2>

              <strong className="event-podium-count">
                {topThree[1].referral_count || 0}
              </strong>

              <small>
                REFERRALS
              </small>

              <div className="event-podium-prize">
                {getReward(2)}
              </div>

            </div>
          )}


          {/* FIRST */}

          {topThree[0] && (
            <div className="event-podium-card first">

              <div className="event-podium-crown">
                👑
              </div>

              <div className="event-podium-medal">
                🥇
              </div>

              <div className="event-podium-avatar">
                {(topThree[0].username || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <span className="event-podium-place">
                1ST PLACE
              </span>

              <h2>
                {topThree[0].username ||
                  "Player"}
              </h2>

              <strong className="event-podium-count">
                {topThree[0].referral_count || 0}
              </strong>

              <small>
                REFERRALS
              </small>

              <div className="event-podium-prize">
                {getReward(1)}
              </div>

            </div>
          )}


          {/* THIRD */}

          {topThree[2] && (
            <div className="event-podium-card third">

              <div className="event-podium-medal">
                🥉
              </div>

              <div className="event-podium-avatar">
                {(topThree[2].username || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <span className="event-podium-place">
                3RD PLACE
              </span>

              <h2>
                {topThree[2].username ||
                  "Player"}
              </h2>

              <strong className="event-podium-count">
                {topThree[2].referral_count || 0}
              </strong>

              <small>
                REFERRALS
              </small>

              <div className="event-podium-prize">
                {getReward(3)}
              </div>

            </div>
          )}

        </div>

      </section>


      {/* =========================================
          FULL RANKINGS
      ========================================= */}

      <section className="event-ranking-section">

        <div className="event-ranking-heading">

          <div>

            <div className="event-ranking-label">
              LIVE RANKINGS
            </div>

            <h2>
              Top Inviter standings
            </h2>

          </div>

          <span>
            {players.length} players
          </span>

        </div>


        <div className="event-ranking-card">

          {loading && (
            <div className="event-ranking-message">
              Loading rankings...
            </div>
          )}

          {!loading && error && (
            <div className="event-ranking-message error">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            players.length === 0 && (
              <div className="event-ranking-message">

                <strong>
                  No players yet.
                </strong>

                <span>
                  Be the first person to join
                  this competition.
                </span>

              </div>
            )}


          {!loading &&
            !error &&
            players.length > 0 && (

              <div className="event-ranking-list">

                {players.map((player) => {

                  const isCurrentUser =
                    player.id === user?.id;

                  return (
                    <div
                      key={player.id}
                      className={`event-ranking-row ${
                        player.rank <= 3
                          ? "top-player"
                          : ""
                      } ${
                        isCurrentUser
                          ? "current-player"
                          : ""
                      }`}
                    >

                      <div className="event-ranking-rank">
                        #{player.rank}
                      </div>

                      <div className="event-ranking-avatar">

                        {(player.username ||
                          "?")
                          .charAt(0)
                          .toUpperCase()}

                      </div>

                      <div className="event-ranking-name">

                        <strong>
                          {player.username ||
                            "Player"}
                        </strong>

                        {isCurrentUser && (
                          <span>
                            YOU
                          </span>
                        )}

                      </div>

                      <div className="event-ranking-referrals">

                        <strong>
                          {player.referral_count ||
                            0}
                        </strong>

                        <span>
                          REFERRALS
                        </span>

                      </div>

                      <div className="event-ranking-reward">

                        {player.rank <= 3
                          ? getReward(
                              player.rank
                            )
                          : "—"}

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

        </div>

      </section>


      {/* =========================================
          RULES
      ========================================= */}

      <section className="event-leaderboard-rules">

        <div className="event-ranking-label">
          HOW IT WORKS
        </div>

        <h2>
          Invite. Climb. Win.
        </h2>

        <p>
          Your position is based on your
          referral count. When the event ends,
          the three players with the highest
          referral counts receive the displayed
          rewards.
        </p>

      </section>

    </main>
  );
}

export default EventLeaderboardPage;