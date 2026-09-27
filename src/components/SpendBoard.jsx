import { useEffect, useState } from "react";

import PlayerChip from "./PlayerChip";
import SkeletonRows from "./SkeletonRows";
import { supabase } from "../lib/supabaseClient";

import "../styles/spendboard.css";

const MEDAL = ["🥇", "🥈", "🥉"];

// Top spenders (shop + donations) or top donors. Only people who chose to
// be shown at checkout appear. `reloadKey` refetches after a payment.
function SpendBoard({ donationsOnly = false, title, empty, limit = 10, reloadKey = 0 }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;

    supabase.rpc("spend_leaderboard", { p_donations_only: donationsOnly }).then(({ data }) => {
      if (!cancelled) setRows((data || []).slice(0, limit));
    });

    return () => {
      cancelled = true;
    };
  }, [donationsOnly, limit, reloadKey]);

  return (
    <section className="spend-board card">
      <span className="eyebrow">{title}</span>

      {!rows ? (
        <SkeletonRows count={3} />
      ) : rows.length === 0 ? (
        <p className="spend-board-empty">{empty}</p>
      ) : (
        <ol>
          {rows.map((player, index) => (
            <li key={player.id}>
              <span className="spend-board-rank mono">{MEDAL[index] || index + 1}</span>
              <PlayerChip player={player} size={32} showBadges={false} />
              <span className="spend-board-total mono">${Number(player.total).toFixed(2)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default SpendBoard;
