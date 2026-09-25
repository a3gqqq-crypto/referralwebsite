import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import SkeletonRows from "./SkeletonRows";
import PlayerChip, { PLAYER_COLUMNS } from "./PlayerChip";

import "../styles/eventLeaderboard.css";
import "../styles/invites.css";

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };
const LIMIT = 25;

function Leaderboard({ user }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select(PLAYER_COLUMNS)
        .order("referral_count", { ascending: false })
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (loadError) {
        console.error(loadError);
        setError("Could not load the leaderboard.");
      } else {
        setError("");
        setPlayers(
          (data || []).map((player, index) => ({
            ...player,
            rank: index + 1,
          }))
        );
      }

      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const me = players.find((player) => player.id === user?.id);
  const visible = players.slice(0, LIMIT);
  const meIsHidden = me && me.rank > LIMIT;

  const row = (player, extraClass = "") => (
    <li
      key={player.id}
      className={`board-row ${player.id === user?.id ? "is-me" : ""} ${
        player.rank <= 3 ? "is-top" : ""
      } ${extraClass}`}
    >
      <span className="board-rank mono">
        {player.rank <= 3 ? MEDAL[player.rank] : player.rank}
      </span>

      <span className="board-player">
        <PlayerChip player={player} size={34} isMe={player.id === user?.id} />
      </span>

      <span className="board-count mono">
        {player.referral_count || 0}
      </span>
    </li>
  );

  return (
    <section className="invites-panel">
      <div className="invites-panel-head">
        <div>
          <span className="eyebrow">All-time</span>
          <h2>Leaderboard</h2>
        </div>

        <span className="chip chip-live">
          <span className="live-dot" />
          Live
        </span>
      </div>

      {loading ? (
        <SkeletonRows count={6} />
      ) : error ? (
        <div className="notice notice-error">{error}</div>
      ) : players.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🏆</div>
          <h3>No rankings yet</h3>
          <p>Invite a friend and you're on the board.</p>
        </div>
      ) : (
        <ol className="board-list board-compact">
          {visible.map((player) => row(player))}
          {meIsHidden && row(me, "board-row-gap")}
        </ol>
      )}
    </section>
  );
}

export default Leaderboard;
