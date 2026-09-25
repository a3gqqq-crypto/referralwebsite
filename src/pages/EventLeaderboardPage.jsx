import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import { events } from "../data/events";
import Icon from "../components/Icon";
import SkeletonRows from "../components/SkeletonRows";
import PlayerChip, { PLAYER_COLUMNS } from "../components/PlayerChip";
import { BadgeRow, FramedAvatar, StyledName } from "../components/Cosmetics";
import { equippedFrom } from "../data/cosmetics";
import NotFound from "./NotFound";
import { useNow, getEventStatus } from "../hooks/useCountdown";

import "../styles/eventLeaderboard.css";

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

function EventLeaderboardPage({ user }) {
  const { eventId } = useParams();
  const now = useNow(30000);

  const event = events.find((item) => item.id === eventId);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!event) return;

    let cancelled = false;

    const loadLeaderboard = async () => {
      setLoading(true);
      setError("");

      const { data: participants, error: participantError } =
        await supabase
          .from("event_participants")
          .select("user_id")
          .eq("event_id", event.id);

      if (cancelled) return;

      if (participantError) {
        console.error(participantError);
        setError("Could not load the leaderboard.");
        setLoading(false);
        return;
      }

      const ids = (participants || []).map((row) => row.user_id);

      if (ids.length === 0) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select(PLAYER_COLUMNS)
        .in("id", ids);

      if (cancelled) return;

      if (profileError) {
        console.error(profileError);
        setError("Could not load player rankings.");
        setLoading(false);
        return;
      }

      setPlayers(
        [...(profiles || [])]
          .sort(
            (a, b) =>
              (b.referral_count || 0) - (a.referral_count || 0)
          )
          .map((player, index) => ({ ...player, rank: index + 1 }))
      );

      setLoading(false);
    };

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [event]);

  if (!event) {
    return (
      <NotFound
        title="Leaderboard not found."
        message="This event doesn't exist or isn't available anymore."
      />
    );
  }

  const status = getEventStatus(event, now);

  const rewardFor = (position) =>
    event.rules?.winners?.find((winner) => winner.position === position)
      ?.reward || null;

  const me = players.find((player) => player.id === user?.id);

  const podium = [players[1], players[0], players[2]].filter(Boolean);

  return (
    <main className="page board-page">

      <Link to={`/events/${event.id}`} className="event-back">
        <Icon name="arrowLeft" size={16} />
        {event.title}
      </Link>

      <header className="page-header board-header">
        <span className="eyebrow">
          {status === "ended" ? "Final standings" : "Live leaderboard"}
        </span>

        <h1>{event.title}</h1>

        <p>
          {status === "ended"
            ? "This event has ended. Top three by referral count take the prizes."
            : "Ranked by referral count. Top three when the event ends take the prizes."}
        </p>
      </header>


      <section className="board-stats">
        <div className="board-stat board-stat-prize">
          <span className="eyebrow">Prize pool</span>
          <strong>{event.prize}</strong>
        </div>

        <div className="board-stat">
          <span className="eyebrow">Players</span>
          <strong className="mono">
            {loading ? "—" : players.length}
          </strong>
        </div>

        <div className="board-stat">
          <span className="eyebrow">Your rank</span>
          <strong className="mono">
            {me ? `#${me.rank}` : "—"}
          </strong>
        </div>
      </section>


      {loading ? (
        <div className="board-list card board-loading">
          <SkeletonRows count={6} />
        </div>
      ) : error ? (
        <div className="notice notice-error board-message">{error}</div>
      ) : players.length === 0 ? (
        <div className="card empty-state board-message">
          <div className="empty-state-icon" aria-hidden="true">🏁</div>
          <h3>No players yet</h3>
          <p>Be the first to join and claim the top spot.</p>
          <div className="empty-state-actions">
            <Link to={`/events/${event.id}`} className="btn btn-primary">
              Go to event
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="board-podium" aria-label="Top three">
            {podium.map((player) => (
              <div
                key={player.id}
                className={`board-podium-step place-${player.rank} ${
                  player.id === user?.id ? "is-me" : ""
                }`}
              >
                <span className="board-podium-medal" aria-hidden="true">
                  {MEDAL[player.rank]}
                </span>

                <Link
                  to={`/u/${encodeURIComponent(player.username || "")}`}
                  className="board-podium-who"
                >
                  <FramedAvatar
                    name={player.username}
                    frame={equippedFrom(player).frame}
                    size={player.rank === 1 ? 76 : 62}
                  />

                  <strong className="board-podium-name">
                    <StyledName
                      name={player.username || "Player"}
                      effect={equippedFrom(player).name}
                    />
                  </strong>
                </Link>

                <BadgeRow ids={equippedFrom(player).badges} size={18} />

                <span className="board-podium-count mono">
                  {player.referral_count || 0} referrals
                </span>

                {rewardFor(player.rank) && (
                  <span className="board-podium-reward">
                    {rewardFor(player.rank)}
                  </span>
                )}
              </div>
            ))}
          </section>


          <section className="board-list card" aria-label="All rankings">
            <div className="board-row board-row-head" aria-hidden="true">
              <span>Rank</span>
              <span>Player</span>
              <span>Referrals</span>
              <span>Prize</span>
            </div>

            <ol>
              {players.map((player) => (
                <li
                  key={player.id}
                  className={`board-row ${
                    player.id === user?.id ? "is-me" : ""
                  } ${player.rank <= 3 ? "is-top" : ""}`}
                >
                  <span className="board-rank mono">
                    {player.rank <= 3 ? MEDAL[player.rank] : player.rank}
                  </span>

                  <span className="board-player">
                    <PlayerChip
                      player={player}
                      size={36}
                      isMe={player.id === user?.id}
                    />
                  </span>

                  <span className="board-count mono">
                    {player.referral_count || 0}
                  </span>

                  <span className="board-reward">
                    {rewardFor(player.rank) || "—"}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

    </main>
  );
}

export default EventLeaderboardPage;
