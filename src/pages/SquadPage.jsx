import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import PlayerChip, { PLAYER_COLUMNS } from "../components/PlayerChip";
import SkeletonRows from "../components/SkeletonRows";
import { EditSquadModal, SquadEmblem } from "../components/SquadModals";
import { useSocial } from "../context/SocialContext";
import { useMyProfile } from "../context/ProfileContext";
import { MAX_SQUAD, loadSquads, squadByTag, squadGradient, useSquads } from "../data/squads";
import { useCopy } from "../hooks/useCopy";

import "../styles/squads.css";

// One squad: who's in it, what each member added this week, join / leave / invite.
function SquadPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { me } = useSocial();
  const { profile } = useMyProfile();
  const squads = useSquads();
  const squad = squadByTag(squads, tag);
  const mine = me ? squads.byUser.get(me) || null : null;
  const isMember = Boolean(squad && mine?.id === squad.id);
  const isOwner = Boolean(squad && squad.owner_id === me);

  const [members, setMembers] = useState(null);
  const [standing, setStanding] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [triedReload, setTriedReload] = useState(false);
  const [copied, copy] = useCopy();

  // A brand-new squad may not be in the shared list yet.
  useEffect(() => {
    if (squad || triedReload) return;
    setTriedReload(true);
    loadSquads({ force: true });
  }, [squad, triedReload]);

  const squadId = squad?.id;
  const memberKey = squad?.memberIds.join(",");

  const load = useCallback(async () => {
    if (!squadId) return;
    const [{ data: rows }, { data: board }] = await Promise.all([
      supabase.rpc("squad_contributions", { p_squad: squadId }),
      supabase.rpc("squad_standings"),
    ]);
    const ids = (rows || []).map((row) => row.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select(PLAYER_COLUMNS).in("id", ids)
      : { data: [] };
    const byId = new Map((profiles || []).map((person) => [person.id, person]));
    setMembers((rows || []).map((row) => ({ ...row, profile: byId.get(row.user_id) })).filter((row) => row.profile));
    const index = (board || []).findIndex((row) => row.id === squadId);
    setStanding(index >= 0 ? { rank: index + 1, score: board[index].score, of: board.length } : null);
  }, [squadId]);

  useEffect(() => {
    load();
  }, [load, memberKey]);

  const run = async (fn, args, success) => {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) {
      setNotice({ type: "error", text: error.message });
      return false;
    }
    if (success) setNotice({ type: "success", text: success });
    await loadSquads({ force: true });
    await load();
    return true;
  };

  if (!squad) {
    return (
      <main className="page squads-page">
        {!triedReload || squads.bySquad.size === 0 ? (
          <SkeletonRows count={3} />
        ) : (
          <div className="card squads-empty">
            <strong>No squad with the tag [{String(tag).toUpperCase()}].</strong>{" "}
            <Link to="/squads">See all squads</Link>
          </div>
        )}
      </main>
    );
  }

  const full = squad.memberIds.length >= MAX_SQUAD;
  const inviteLink = `${window.location.origin}/?ref=${encodeURIComponent(profile?.username || "")}&squad=${squad.tag}`;

  return (
    <main className="page squads-page">
      <section className="squad-hero" style={{ background: squadGradient(squad.color) }}>
        <SquadEmblem squad={{ ...squad, color: "night" }} size={84} />

        <div className="squad-hero-text">
          <span className="eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>
            Squad [{squad.tag}]
          </span>
          <h1>{squad.name}</h1>
          {squad.description && <p>{squad.description}</p>}
          <div className="squad-hero-stats">
            <span>
              👥 {squad.memberIds.length}/{MAX_SQUAD}
            </span>
            {standing && <span>🏁 #{standing.rank} of {standing.of} this week</span>}
            {standing && <span>⚡ {standing.score.toLocaleString()} XP</span>}
          </div>
        </div>

        <div className="squad-hero-actions">
          {isMember ? (
            <>
              <button type="button" className="btn btn-sun" onClick={() => copy(inviteLink)}>
                <Icon name={copied ? "check" : "userPlus"} size={16} />
                {copied ? "Link copied" : "Invite friends"}
              </button>
              {isOwner && (
                <button type="button" className="btn" onClick={() => setEditing(true)}>
                  <Icon name="edit" size={15} />
                  Edit
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={async () => {
                  const text = isOwner && squad.memberIds.length > 1
                    ? `Leave ${squad.name}? The longest-standing member becomes the new owner.`
                    : `Leave ${squad.name}?`;
                  if (!window.confirm(text)) return;
                  if (await run("leave_squad", {})) navigate("/squads");
                }}
              >
                Leave
              </button>
            </>
          ) : mine ? (
            <Link to={`/squads/${mine.tag}`} className="btn">
              You're in {mine.name}
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-sun"
              disabled={busy || full}
              onClick={() => run("join_squad", { p_squad: squad.id }, `Welcome to ${squad.name}! 🎉`)}
            >
              <Icon name="users" size={16} />
              {full ? "Squad is full" : busy ? "Joining…" : "Join squad"}
            </button>
          )}
        </div>
      </section>

      {notice && <div className={`notice notice-${notice.type}`} style={{ marginBottom: 14 }}>{notice.text}</div>}

      {isMember && (
        <p style={{ color: "var(--text-soft)", marginBottom: 14, fontSize: 14 }}>
          Your invite link adds friends to Suffrova <b>and</b> to {squad.name}. Each friend who joins is +100 XP for
          the squad.
        </p>
      )}

      <section className="squad-members card">
        <div className="squads-board-head">
          <h2>Members this week</h2>
          <Link to="/squads" className="dash-more">
            Squad Wars <Icon name="arrowRight" size={14} />
          </Link>
        </div>

        {!members ? (
          <SkeletonRows count={4} />
        ) : (
          members.map((member) => (
            <div key={member.user_id} className="squad-member">
              <PlayerChip player={member.profile} size={36} isMe={member.user_id === me} showBadges={false} showSquad={false} />
              <span className="squad-member-side">
                <span className="squad-member-xp">
                  {member.user_id === squad.owner_id && (
                    <span title="Squad owner" aria-label="Squad owner">
                      👑{" "}
                    </span>
                  )}
                  {member.score.toLocaleString()} <small>XP</small>
                </span>
                {isOwner && member.user_id !== me && (
                  <button
                    type="button"
                    className="squad-kick"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove ${member.profile.display_name || member.profile.username} from the squad? They can't rejoin.`)) {
                        run("kick_from_squad", { p_user: member.user_id }, "Removed.");
                      }
                    }}
                  >
                    Remove
                  </button>
                )}
              </span>
            </div>
          ))
        )}
      </section>

      {editing && <EditSquadModal squad={squad} onClose={() => setEditing(false)} />}
    </main>
  );
}

export default SquadPage;
