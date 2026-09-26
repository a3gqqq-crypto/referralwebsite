import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "./Icon";
import { formatCountdown, getEventStatus } from "../hooks/useCountdown";
import { formatUntilNextDay, localResetTime, utcDay } from "../lib/streakDay";

function lastSevenDays(now) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() - (6 - index) * 86400000);

    return {
      key: utcDay(date),
      label: date.toLocaleDateString(undefined, { weekday: "narrow", timeZone: "UTC" }),
    };
  });
}

function StreakCard({ userId, streak = 0, lastCheckin, streakEvent, now, compact = false }) {
  const [checkedDays, setCheckedDays] = useState(() => new Set());
  const [standing, setStanding] = useState(null);

  const today = utcDay(now);
  const checkedToday = lastCheckin === today;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabase
      .from("xp_events")
      .select("ref")
      .eq("user_id", userId)
      .eq("reason", "checkin")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!cancelled) setCheckedDays(new Set((data || []).map((row) => row.ref)));
      });

    return () => {
      cancelled = true;
    };
  }, [userId, lastCheckin]);

  const eventStatus = streakEvent ? getEventStatus(streakEvent, now) : null;

  useEffect(() => {
    if (!streakEvent || eventStatus !== "live" || !userId) return;

    let cancelled = false;

    supabase
      .rpc("streak_standings", {
        p_event_id: streakEvent.id,
        p_starts: new Date(streakEvent.startDate).toISOString(),
        p_ends: new Date(streakEvent.endDate).toISOString(),
      })
      .then(({ data }) => {
        if (cancelled || !data) return;

        const index = data.findIndex((player) => player.id === userId);
        setStanding(index === -1 ? null : { ...data[index], rank: index + 1 });
      });

    return () => {
      cancelled = true;
    };
  }, [streakEvent, eventStatus, userId, lastCheckin]);

  const current = checkedToday || lastCheckin === utcDay(new Date(now.getTime() - 86400000)) ? streak : 0;
  const nextBonus = 10 + Math.min(current * 5, 30);
  const days = lastSevenDays(now);

  if (compact) {
    return (
      <div className="streak-card card is-compact">
        <div className="dash-card-head">
          <span className="eyebrow">Login streak</span>
          {streakEvent && (
            <Link to={`/events/${streakEvent.id}`} className="dash-more">
              {eventStatus === "live" && standing ? `#${standing.rank} this month` : "Monthly event"}
              <Icon name="arrowRight" size={14} />
            </Link>
          )}
        </div>

        <div className="streak-card-main">
          <div className={`streak-flame ${current > 0 ? "is-lit" : ""}`} aria-hidden="true">
            <Icon name="flame" size={24} strokeWidth={2} />
          </div>

          <div className="streak-card-count">
            <strong className="mono">{current}</strong>
            <span>{current === 1 ? "day" : "days"}</span>
          </div>

          <ol className="streak-week" aria-label="Last seven days">
            {days.map((day) => (
              <li
                key={day.key}
                className={`${checkedDays.has(day.key) ? "is-done" : ""} ${day.key === today ? "is-today" : ""}`}
                title={day.key}
              >
                <span className="streak-dot">
                  {checkedDays.has(day.key) && <Icon name="check" size={11} strokeWidth={3} />}
                </span>
                <small>{day.label}</small>
              </li>
            ))}
          </ol>

          <p className="streak-card-note">
            {checkedToday
              ? `Next day in ${formatUntilNextDay(now)} · +${nextBonus} XP`
              : "Open Suffrova today to keep it going."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="streak-card card">
      <div className="streak-card-main">
        <div className={`streak-flame ${current > 0 ? "is-lit" : ""}`} aria-hidden="true">
          <Icon name="flame" size={30} strokeWidth={2} />
        </div>

        <div className="streak-card-count">
          <strong className="mono">{current}</strong>
          <span>day streak</span>
        </div>

        <p className="streak-card-note">
          {checkedToday
            ? `Checked in today. Next day starts in ${formatUntilNextDay(now)} — come back for +${nextBonus} XP.`
            : "Open Suffrova today to keep your chain going."}
          <small title="Days reset at 00:00 UTC for everyone">
            New day every {localResetTime()} your time
          </small>
        </p>

        <ol className="streak-week" aria-label="Last seven days">
          {days.map((day) => (
            <li
              key={day.key}
              className={`${checkedDays.has(day.key) ? "is-done" : ""} ${day.key === today ? "is-today" : ""}`}
              title={day.key}
            >
              <span className="streak-dot">
                {checkedDays.has(day.key) && <Icon name="check" size={12} strokeWidth={3} />}
              </span>
              <small>{day.label}</small>
            </li>
          ))}
        </ol>
      </div>

      {streakEvent && (
        <Link to={`/events/${streakEvent.id}`} className="streak-card-event">
          <span className="eyebrow">
            {eventStatus === "live" ? "This month" : "Starts soon"}
          </span>

          <strong>{streakEvent.title}</strong>

          <span className="streak-card-event-line">
            {eventStatus === "live"
              ? standing
                ? `You're #${standing.rank} · best ${standing.best_streak} ${standing.best_streak === 1 ? "day" : "days"}`
                : "You're entered automatically"
              : `Starts in ${formatCountdown(streakEvent.startDate, now)}`}
          </span>

          <span className="streak-card-prize">
            🤫 Top 3 streaks win secret prizes
            <Icon name="arrowRight" size={15} />
          </span>
        </Link>
      )}
    </div>
  );
}

export default StreakCard;
