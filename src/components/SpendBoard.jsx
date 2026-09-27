import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "./Icon";
import PlayerChip from "./PlayerChip";
import SkeletonRows from "./SkeletonRows";
import { supabase } from "../lib/supabaseClient";

import "../styles/spendboard.css";

const MEDAL = ["🥇", "🥈", "🥉"];

// Top spenders (shop + donations) or top donors. Only people who chose to
// be shown at checkout appear. `reloadKey` refetches after a payment.
function SpendBoard({ donationsOnly = false, title, empty, limit = 10, reloadKey = 0, compact = false, moreLink = null }) {
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
    <section className={`spend-board card ${compact ? "is-compact" : ""}`}>
      <div className="spend-board-head">
        <span className="eyebrow">{title}</span>
        {moreLink && (
          <Link to={moreLink.to} className="dash-more">
            {moreLink.label} <Icon name="arrowRight" size={14} />
          </Link>
        )}
      </div>

      {!rows ? (
        <SkeletonRows count={3} />
      ) : rows.length === 0 ? (
        <p className="spend-board-empty">{empty}</p>
      ) : (
        <ol>
          {rows.map((player, index) => (
            <li key={player.id}>
              <span className="spend-board-rank mono">{MEDAL[index] || index + 1}</span>
              <PlayerChip player={player} size={compact ? 28 : 32} showBadges={false} />
              <span className="spend-board-total mono">${Number(player.total).toFixed(2)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default SpendBoard;
