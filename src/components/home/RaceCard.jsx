import { useState } from "react";
import { Link } from "react-router-dom";

import Icon from "../Icon";
import PlayerChip from "../PlayerChip";
import { useEvents } from "../../context/EventContext";
import { useCopy, canNativeShare, nativeShare } from "../../hooks/useCopy";

const SHARE_TEXT = "Join me on Vexora — invite friends, climb the board, win real prizes.";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function rewardFor(event, position) {
  return event?.rules?.winners?.find((winner) => winner.position === position)?.reward || null;
}

// What to tell someone about their place in the race, in one line.
function raceLine(event, standings, userId) {
  const index = standings.findIndex((player) => player.id === userId);

  if (index === -1) return { state: "out" };

  const me = standings[index];
  const rank = index + 1;
  const count = me.referral_count || 0;

  if (rank === 1) {
    const second = standings[1];
    const lead = count - (second?.referral_count || 0);

    if (count === 0) {
      return {
        state: "in",
        rank,
        head: <>Everyone's at zero. <span className="mark">First invite</span> takes #1.</>,
        sub: rewardFor(event, 1) ? `#1 wins ${rewardFor(event, 1)}.` : null,
        progress: 0,
      };
    }

    return {
      state: "in",
      rank,
      head: lead > 0
        ? <>You're #1, <span className="mark">{plural(lead, "invite")}</span> ahead.</>
        : <>You're #1, <span className="mark">tied</span>. Don't let up.</>,
      sub: rewardFor(event, 1) ? `Hold it and you win ${rewardFor(event, 1)}.` : "Hold it to the end.",
      progress: 1,
    };
  }

  const above = standings[index - 1];
  const needed = (above.referral_count || 0) - count + 1;
  const aboveReward = rewardFor(event, rank - 1);
  const third = standings[2];
  const toTop3 = rank > 3 && third ? (third.referral_count || 0) - count + 1 : null;

  return {
    state: "in",
    rank,
    head: <>You're #{rank}. <span className="mark">{plural(needed, "invite")}</span> to pass {above.username}.</>,
    sub: aboveReward
      ? `Pass them and you take the ${aboveReward} spot.`
      : toTop3 && rewardFor(event, 3)
        ? `${plural(toTop3, "invite")} gets you into the top 3 (${rewardFor(event, 3)}).`
        : null,
    progress: above.referral_count ? count / (above.referral_count + 1) : 0,
  };
}

export function RaceCard({ event, standings, loading, userId, referralLink, onJoined, now }) {
  const [copied, copy] = useCopy();
  const { joinEvent } = useEvents();
  const [joining, setJoining] = useState(false);

  const line = event && !loading ? raceLine(event, standings, userId) : null;
  const daysLeft = event ? Math.max(0, Math.floor((new Date(event.endDate) - now) / 86400000)) : null;

  const join = async () => {
    setJoining(true);
    await joinEvent(event.id);
    setJoining(false);
    onJoined?.();
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${referralLink}`)}`;

  return (
    <section className="dash-race card">
      <span className="eyebrow">
        {event
          ? `Your race · ${event.title} · ${daysLeft === 0 ? "last day" : `${daysLeft}d left`}`
          : "Your invite link"}
      </span>

      {!event ? (
        <>
          <h1 className="dash-race-head">
            Every friend who joins <span className="mark">counts.</span>
          </h1>
          <p className="dash-race-sub">No invite race is running right now, but invites still add to your total.</p>
        </>
      ) : loading ? (
        <div className="dash-race-head skeleton" style={{ height: 64, marginTop: 12 }} />
      ) : line.state === "out" ? (
        <>
          <h1 className="dash-race-head">
            {event.prize} up for grabs. <span className="mark">Join the race.</span>
          </h1>
          <p className="dash-race-sub">Only invites made during the event count, so everyone starts at zero.</p>
          <button type="button" className="btn btn-primary dash-race-join" onClick={join} disabled={joining}>
            <Icon name="trophy" size={17} />
            {joining ? "Joining…" : "Join the race"}
          </button>
        </>
      ) : (
        <>
          <h1 className="dash-race-head">{line.head}</h1>
          {line.sub && <p className="dash-race-sub">{line.sub}</p>}
          <div className="dash-race-bar" aria-hidden="true">
            <span style={{ width: `${Math.max(4, Math.min(100, line.progress * 100))}%` }} />
          </div>
        </>
      )}

      <div className="dash-race-link">
        <code className="mono">{referralLink || "Set a username to get your link"}</code>

        <div className="dash-race-buttons">
          <button
            type="button"
            className={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`}
            onClick={() => copy(referralLink)}
            disabled={!referralLink}
          >
            <Icon name={copied ? "check" : "copy"} size={15} />
            {copied ? "Copied" : "Copy link"}
          </button>

          <a className="btn btn-sm dash-whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
            WhatsApp
          </a>

          {canNativeShare && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => nativeShare({ title: "Vexora", text: SHARE_TEXT, url: referralLink })}
              disabled={!referralLink}
            >
              <Icon name="share" size={15} />
              Share
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function MiniBoard({ event, standings, loading, userId }) {
  const top = standings.slice(0, 5).map((player, index) => ({ ...player, rank: index + 1 }));
  const meIndex = standings.findIndex((player) => player.id === userId);
  const rows = meIndex >= 5 ? [...top, { ...standings[meIndex], rank: meIndex + 1, gap: true }] : top;

  return (
    <section className="dash-board card">
      <div className="dash-card-head">
        <span className="eyebrow">{event ? "Live top 5" : "Top inviters"}</span>
        {event && (
          <Link to={`/events/${event.id}/leaderboard`} className="dash-more">
            Full board <Icon name="arrowRight" size={14} />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="dash-board-empty">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="dash-board-empty">Nobody's on the board yet. Be first.</div>
      ) : (
        <ol className="dash-board-list">
          {rows.map((player) => (
            <li
              key={player.id}
              className={`${player.id === userId ? "is-me" : ""} ${player.gap ? "is-gap" : ""}`}
            >
              <span className="dash-board-rank mono">{MEDAL[player.rank] || player.rank}</span>
              <span className="dash-board-player">
                <PlayerChip player={player} size={26} showBadges={false} />
              </span>
              <span className="dash-board-count mono">{player.referral_count || 0}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
