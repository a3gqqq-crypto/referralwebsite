import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import SkeletonRows from "../components/SkeletonRows";
import { CreateSquadModal, SquadEmblem } from "../components/SquadModals";
import { useSocial } from "../context/SocialContext";
import { useNow } from "../hooks/useCountdown";
import { MAX_SQUAD, formatLeft, useSquads, weekEnds } from "../data/squads";

import "../styles/squads.css";

// Squad Wars: this week's squad standings, your squad, and last week's winners.
function SquadsPage() {
  const { me } = useSocial();
  const squads = useSquads();
  const now = useNow(30000);
  const [standings, setStandings] = useState(null);
  const [champions, setChampions] = useState([]);
  const [creating, setCreating] = useState(false);

  const mine = me ? squads.byUser.get(me) || null : null;
  const squadCount = squads.bySquad.size;

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      supabase.rpc("squad_standings"),
      supabase.from("squad_champions").select("week_start, squad_name, squad_tag, score").order("week_start", { ascending: false }).limit(5),
    ]).then(([standingResult, champResult]) => {
      if (cancelled) return;
      setStandings(standingResult.data || []);
      setChampions(champResult.data || []);
    });

    return () => {
      cancelled = true;
    };
    // Refresh when squads change (created, joined, left).
  }, [squadCount, mine?.id]);

  const myRank = mine && standings ? standings.findIndex((row) => row.id === mine.id) + 1 : 0;
  const myScore = mine && standings ? standings.find((row) => row.id === mine.id)?.score || 0 : 0;

  return (
    <main className="page squads-page">
      <header className="page-header">
        <span className="eyebrow">Squads</span>
        <h1>
          Team up. <span className="mark">Win the week.</span>
        </h1>
        <p>
          Start a squad or join one (up to {MAX_SQUAD} people). Every XP your squad earns this week counts. The #1
          squad on Monday gets the Squad Champion badge.
        </p>
      </header>

      <section className="squads-wars card">
        <span style={{ fontSize: 34 }} aria-hidden="true">⚔️</span>
        <div className="squads-wars-title">
          <strong>Squad Wars</strong>
          <span>Invites give the most XP (+100 each), then check-ins, quests and chatting.</span>
        </div>
        <span className="squads-wars-timer">Ends in {formatLeft(weekEnds(now).getTime(), now.getTime())}</span>
      </section>

      <div className="squads-layout">
        <section className="squads-board card">
          <div className="squads-board-head">
            <h2>This week</h2>
            <span className="eyebrow">{standings ? `${standings.length} squads` : ""}</span>
          </div>

          {!standings ? (
            <SkeletonRows count={4} />
          ) : standings.length === 0 ? (
            <p className="squads-empty">No squads yet. Be the first to start one!</p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {standings.map((row, index) => (
                <li key={row.id}>
                  <Link to={`/squads/${row.tag}`} className={`squads-row ${mine?.id === row.id ? "is-mine" : ""}`}>
                    <span className="squads-rank">{index + 1}</span>
                    <SquadEmblem squad={row} size={42} />
                    <span className="squads-row-name">
                      <strong>{row.name}</strong>
                      <small>
                        [{row.tag}] · {row.members}/{MAX_SQUAD} members
                      </small>
                    </span>
                    <span className="squads-score">
                      {row.score.toLocaleString()}
                      <small>XP</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="squads-side">
          <section className="squads-mine card">
            <h2>Your squad</h2>
            {mine ? (
              <Link to={`/squads/${mine.tag}`} className="squads-row is-mine">
                <SquadEmblem squad={mine} size={48} />
                <span className="squads-row-name">
                  <strong>{mine.name}</strong>
                  <small>
                    {myRank ? `#${myRank} this week · ${myScore.toLocaleString()} XP` : "Loading…"}
                  </small>
                </span>
                <Icon name="arrowRight" size={16} />
              </Link>
            ) : (
              <>
                <p style={{ color: "var(--text-soft)", marginBottom: 12 }}>
                  You're not in a squad yet. Join one from the list, or start your own and invite your friends.
                </p>
                <button type="button" className="btn btn-primary btn-block" onClick={() => setCreating(true)}>
                  <Icon name="users" size={16} />
                  Start a squad
                </button>
              </>
            )}
          </section>

          <section className="squads-how card">
            <h2>How Squad Wars work</h2>
            <ol>
              <li>Join a squad or start one. You can be in one squad at a time.</li>
              <li>From Monday to Sunday (UTC), all XP members earn counts for the squad.</li>
              <li>Invite friends: each new member you bring is +100 XP for your squad.</li>
              <li>The top squad on Monday gets the 🏆 Squad Champion badge.</li>
            </ol>
          </section>

          {champions.length > 0 && (
            <section className="squads-champs card">
              <h2>🏆 Past champions</h2>
              {champions.map((champ) => (
                <div key={champ.week_start} className="squads-champ">
                  <Link to={`/squads/${champ.squad_tag}`}>
                    {champ.squad_name} [{champ.squad_tag}]
                  </Link>
                  <span>
                    {new Date(champ.week_start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                    {champ.score.toLocaleString()} XP
                  </span>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>

      {creating && <CreateSquadModal onClose={() => setCreating(false)} />}
    </main>
  );
}

export default SquadsPage;
