import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";
import Icon from "../Icon";
import { SquadEmblem } from "../SquadModals";
import { useSocial } from "../../context/SocialContext";
import { loadSquads, squadByTag, useSquads } from "../../data/squads";

// Set by invite links (?squad=TAG), also saved by the sign-up page.
const PENDING_SQUAD_KEY = "suffrova_pending_squad";

const readPending = () => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("squad");
    if (fromUrl) localStorage.setItem(PENDING_SQUAD_KEY, fromUrl.toUpperCase());
    return localStorage.getItem(PENDING_SQUAD_KEY);
  } catch {
    return null;
  }
};

const clearPending = () => {
  try {
    localStorage.removeItem(PENDING_SQUAD_KEY);
  } catch {
    // Fine.
  }
};

// Home: your squad's place in Squad Wars, an invite you followed, or a nudge to join one.
function SquadCard() {
  const { me } = useSocial();
  const squads = useSquads();
  const navigate = useNavigate();
  const [pendingTag, setPendingTag] = useState(readPending);
  const [standing, setStanding] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mine = me ? squads.byUser.get(me) || null : null;
  const invited = pendingTag && !mine ? squadByTag(squads, pendingTag) : null;

  // Already in a squad: an old invite doesn't matter any more.
  useEffect(() => {
    if (mine && pendingTag) {
      clearPending();
      setPendingTag(null);
    }
  }, [mine, pendingTag]);

  useEffect(() => {
    if (!mine) return;
    let cancelled = false;
    supabase.rpc("squad_standings").then(({ data }) => {
      if (cancelled) return;
      const index = (data || []).findIndex((row) => row.id === mine.id);
      setStanding(index >= 0 ? { rank: index + 1, score: data[index].score } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [mine]);

  if (mine) {
    return (
      <Link to={`/squads/${mine.tag}`} className="squad-home card">
        <SquadEmblem squad={mine} size={46} />
        <span className="squad-home-text">
          <strong>
            {mine.name} {standing ? `is #${standing.rank} in Squad Wars` : ""}
          </strong>
          <span>
            {standing ? `${standing.score.toLocaleString()} XP this week · ` : ""}Invite friends to push your squad up.
          </span>
        </span>
        <Icon name="arrowRight" size={16} />
      </Link>
    );
  }

  if (invited) {
    return (
      <section className="squad-home card">
        <SquadEmblem squad={invited} size={46} />
        <span className="squad-home-text">
          <strong>You're invited to join {invited.name} [{invited.tag}]</strong>
          <span>Team up and battle other squads every week.</span>
          {error && <span style={{ color: "var(--rose)" }}>{error}</span>}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-sun"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            const { error: joinError } = await supabase.rpc("join_squad", { p_squad: invited.id });
            setBusy(false);
            if (joinError) {
              setError(joinError.message);
              return;
            }
            clearPending();
            await loadSquads({ force: true });
            navigate(`/squads/${invited.tag}`);
          }}
        >
          {busy ? "Joining…" : "Join"}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            clearPending();
            setPendingTag(null);
          }}
        >
          No thanks
        </button>
      </section>
    );
  }

  return (
    <Link to="/squads" className="squad-home card">
      <span style={{ fontSize: 34 }} aria-hidden="true">⚔️</span>
      <span className="squad-home-text">
        <strong>Squad Wars are on</strong>
        <span>Join a squad or start one with friends. The top squad each week gets the Champion badge.</span>
      </span>
      <Icon name="arrowRight" size={16} />
    </Link>
  );
}

export default SquadCard;
