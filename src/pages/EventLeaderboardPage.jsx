import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import { eventKind, useEventList } from "../data/events";
import Icon from "../components/Icon";
import PageLoading from "../components/PageLoading";
import SkeletonRows from "../components/SkeletonRows";
import PlayerChip from "../components/PlayerChip";
import StaffTag from "../components/StaffTag";
import { BadgeRow, FramedAvatar, StyledName } from "../components/Cosmetics";
import { displayNameOf, equippedFrom } from "../data/cosmetics";
import NotFound from "./NotFound";
import { useNow, getEventStatus } from "../hooks/useCountdown";
import { referralLinkFor } from "../hooks/useCopy";
import { shareBragImage } from "../lib/bragImage";

import "../styles/eventLeaderboard.css";

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

function EventLeaderboardPage({ user }) {
  const { eventId } = useParams();
  const now = useNow(30000);

  const { events, loading: loadingEvents } = useEventList();
  const event = events.find((item) => item.id === eventId);

  const [players, setPlayers] = useState([]);
  const [bragging, setBragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!event) return;

    let cancelled = false;

    const loadLeaderboard = async () => {
      const { data, error: loadError } = await supabase.rpc(eventKind(event).rpc, {
        p_event_id: event.id,
        p_starts: new Date(event.startDate).toISOString(),
        p_ends: new Date(event.endDate).toISOString(),
      });

      if (cancelled) return;

      if (loadError) {
        console.error(loadError);
        setError("Could not load the leaderboard.");
        setLoading(false);
        return;
      }

      setError("");
      setPlayers(
        (data || []).map((player, index) => ({ ...player, rank: index + 1 }))
      );

      setLoading(false);
    };

    loadLeaderboard();

    const timer = setInterval(loadLeaderboard, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [event]);

  if (!event && loadingEvents) return <PageLoading />;

  if (!event) {
    return (
      <NotFound
        title="Leaderboard not found."
        message="This event doesn't exist or isn't available anymore."
      />
    );
  }

  const status = getEventStatus(event, now);
  const kind = eventKind(event);
  const isStreak = event.type === "streak";

  const rewardFor = (position) =>
    event.rules?.winners?.find((winner) => winner.position === position)
      ?.reward || null;

  const me = players.find((player) => player.id === user?.id);

  const brag = async () => {
    setBragging(true);
    await shareBragImage({
      username: displayNameOf(me),
      avatar: me.avatar,
      rank: me.rank,
      count: kind.score(me),
      countLabel: isStreak ? "day streak" : null,
      eventTitle: event.title,
      daysLeft: status === "live" ? Math.floor((new Date(event.endDate) - now) / 86400000) : null,
      prize: rewardFor(1),
      link: referralLinkFor(user?.user_metadata?.username || me.username),
    });
    setBragging(false);
  };

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
          {isStreak
            ? status === "ended"
              ? "This month is over. The three longest login streaks take the prizes."
              : status === "upcoming"
                ? "Starts on the 1st. Open Vexora every day — you're entered automatically."
                : "Ranked by your longest run of daily logins this month. Ties go to whoever logged in on more days."
            : status === "ended"
              ? "This event has ended. Top three by invites made during the event take the prizes."
              : status === "upcoming"
                ? "Starts soon. Only invites made during the event count — everyone starts at zero."
                : "Ranked by invites made during this event. Top three when it ends take the prizes."}
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

          {me && status !== "upcoming" && (
            <button type="button" className="btn btn-sm btn-sun board-brag" onClick={brag} disabled={bragging}>
              <Icon name="share" size={14} />
              {bragging ? "Making…" : "Share my rank"}
            </button>
          )}
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
          <p>
            {isStreak
              ? "Everyone who opens Vexora this month shows up here."
              : "Be the first to join and claim the top spot."}
          </p>
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
                    name={displayNameOf(player)}
                    frame={equippedFrom(player).frame}
                    avatar={player.avatar}
                    size={player.rank === 1 ? 76 : 62}
                  />

                  <strong className="board-podium-name">
                    <StyledName
                      name={displayNameOf(player)}
                      effect={equippedFrom(player).name}
                    />
                  </strong>
                </Link>

                <StaffTag userId={player.id} />

                <BadgeRow ids={equippedFrom(player).badges} size={18} />

                <span className="board-podium-count mono">
                  {kind.unit(kind.score(player))}
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
              <span>
                <span className="board-head-long">{kind.column}</span>
                <span className="board-head-short">{kind.columnShort}</span>
              </span>
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
                    {kind.score(player)}
                    {isStreak && <span className="board-count-unit">d</span>}
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
