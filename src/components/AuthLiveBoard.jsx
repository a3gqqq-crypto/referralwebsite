import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import { FramedAvatar, StyledName } from "./Cosmetics";
import { PLAYER_COLUMNS } from "./PlayerChip";
import { displayNameOf, equippedFrom } from "../data/cosmetics";

const MEDAL = ["🥇", "🥈", "🥉"];

// Real standings for the sign-up page: the live race's top 3 (or the all-time
// top inviters when no race is running) and how many people are already in.
function AuthLiveBoard({ race }) {
  const [top, setTop] = useState(null);
  const [members, setMembers] = useState(null);

  const raceId = race?.id;
  const raceStart = race?.startDate;
  const raceEnd = race?.endDate;

  const [showingRace, setShowingRace] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const allTime = () =>
      supabase
        .from("profiles")
        .select(PLAYER_COLUMNS)
        .not("username", "is", null)
        .gt("referral_count", 0)
        .order("referral_count", { ascending: false })
        .limit(3);

    const load = async () => {
      const [raceResult, countResult] = await Promise.all([
        raceId
          ? supabase.rpc("event_standings", {
              p_event_id: raceId,
              p_starts: new Date(raceStart).toISOString(),
              p_ends: new Date(raceEnd).toISOString(),
            })
          : Promise.resolve({ data: [] }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      let rows = (raceResult.data || []).filter((player) => player.username).slice(0, 3);
      let isRace = true;

      // A race nobody has scored in yet says nothing; show the all-time board instead.
      if (!rows.some((player) => player.referral_count > 0)) {
        rows = ((await allTime()).data || []).slice(0, 3);
        isRace = false;
      }

      if (cancelled) return;

      setTop(rows);
      setShowingRace(isRace);
      setMembers(countResult.count ?? null);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [raceId, raceStart, raceEnd]);

  if (!top?.length) return null;

  return (
    <div className="auth-live" aria-label={showingRace ? "Live leaderboard" : "Top inviters"}>
      <div className="auth-live-head">
        <span className="eyebrow">{showingRace ? "Live leaderboard" : "All-time top inviters"}</span>
        {members != null && <span className="auth-live-count">{members} members already in</span>}
      </div>

      <ol>
        {top.map((player, index) => {
          const equipped = equippedFrom(player);

          return (
            <li key={player.id}>
              <span className="auth-live-medal" aria-hidden="true">{MEDAL[index]}</span>
              <FramedAvatar name={displayNameOf(player)} frame={equipped.frame} avatar={equipped.avatar} size={36} />
              <StyledName name={displayNameOf(player)} effect={equipped.name} className="auth-live-name" />
              <span className="auth-live-score mono">
                {player.referral_count || 0}
                <small> invites</small>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="auth-live-note">
        {race
          ? showingRace
            ? "Everyone started at zero this round. Your first invite puts you on the board."
            : `${race.title} just started and everyone's at zero. Your first invite puts you in first place.`
          : "Invite friends to climb the board."}
      </p>
    </div>
  );
}

export default AuthLiveBoard;
