import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";

import { useEventList } from "../data/events";
import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import SkeletonRows from "../components/SkeletonRows";
import StreakCard from "../components/StreakCard";
import QuestsCard from "../components/QuestsCard";
import ActivityFeed from "../components/home/ActivityFeed";
import { MiniBoard, RaceCard } from "../components/home/RaceCard";
import { FramedAvatar } from "../components/Cosmetics";
import { LevelBadge } from "../components/Level";
import { PLAYER_COLUMNS } from "../components/PlayerChip";
import { useMyProfile } from "../context/ProfileContext";
import { displayNameOf, equippedFrom } from "../data/cosmetics";
import { levelInfo } from "../data/levels";
import { useNow, getEventStatus, formatCountdown } from "../hooks/useCountdown";
import { referralLinkFor } from "../hooks/useCopy";

import "../styles/home.css";

// Explainer sections only show for people in their first few days.
const NEW_MEMBER_DAYS = 3;

function DashEvent({ event, now }) {
  const status = getEventStatus(event, now);

  return (
    <Link to={`/events/${event.id}`} className="dash-event card">
      <img src={event.image} alt="" className="dash-event-art" loading="lazy" />

      <div className="dash-event-main">
        <span className={`chip ${status === "live" ? "chip-live" : "chip-upcoming"}`}>
          {status === "live" && <span className="live-dot" />}
          {status === "live" ? "Live now" : "Next up"}
        </span>
        <strong>{event.title}</strong>
        <span className="dash-event-meta">
          <span className="dash-event-prize">{event.prize}</span>
          <span className="mono">
            {status === "live" ? "ends in " : "starts in "}
            {formatCountdown(status === "live" ? event.endDate : event.startDate, now).replace(/ \d+s$/, "")}
          </span>
        </span>
      </div>

      <Icon name="arrowRight" size={18} />
    </Link>
  );
}

function Home({ user }) {
  const { profile } = useMyProfile();
  const now = useNow();

  const username = displayNameOf(profile, user?.user_metadata?.username || "Member");
  const referralLink = referralLinkFor(user?.user_metadata?.username);
  const equipped = equippedFrom(profile);
  const level = levelInfo(profile?.xp);

  /* ---------- Events ---------- */

  const { events, loading: loadingEvents } = useEventList();
  const activeEvents = events.filter((event) => event.active);

  const byEnd = (a, b) => new Date(a.endDate) - new Date(b.endDate);
  const liveEvents = activeEvents.filter((event) => getEventStatus(event, now) === "live").sort(byEnd);
  const upcoming = activeEvents
    .filter((event) => getEventStatus(event, now) === "upcoming")
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const race = liveEvents.find((event) => event.type === "referral") || null;
  const streakEvent =
    [...liveEvents, ...upcoming].find((event) => event.type === "streak") || null;
  const shownEvents = [...liveEvents, ...upcoming.slice(0, 1)];

  /* ---------- Race standings ---------- */

  const [standings, setStandings] = useState([]);
  const [loadingStandings, setLoadingStandings] = useState(true);

  const raceId = race?.id;
  const raceStart = race?.startDate;
  const raceEnd = race?.endDate;

  const loadStandings = useCallback(async () => {
    if (!raceId) {
      // No race running: fall back to the all-time board.
      const { data } = await supabase
        .from("profiles")
        .select(PLAYER_COLUMNS)
        .not("username", "is", null)
        .order("referral_count", { ascending: false })
        .limit(50);

      setStandings(data || []);
      setLoadingStandings(false);
      return;
    }

    const { data, error } = await supabase.rpc("event_standings", {
      p_event_id: raceId,
      p_starts: new Date(raceStart).toISOString(),
      p_ends: new Date(raceEnd).toISOString(),
    });

    if (error) console.error("Could not load standings:", error);

    setStandings(data || []);
    setLoadingStandings(false);
  }, [raceId, raceStart, raceEnd]);

  useEffect(() => {
    if (loadingEvents) return;

    loadStandings();
    const timer = setInterval(loadStandings, 20000);

    return () => clearInterval(timer);
  }, [loadingEvents, loadStandings]);

  const isNewMember =
    profile?.created_at &&
    now.getTime() - new Date(profile.created_at).getTime() < NEW_MEMBER_DAYS * 86400000;

  return (
    <main className="page home-page home-dash">

      <header className="dash-greet">
        <Link to="/profile" className="dash-greet-avatar" aria-label="Your profile">
          <FramedAvatar name={username} frame={equipped.frame} avatar={equipped.avatar} size={52} />
        </Link>

        <div className="dash-greet-text">
          <span className="eyebrow">Hey {username} 👋</span>
          <div className="dash-greet-level">
            <LevelBadge xp={profile?.xp} />
            <span className="dash-greet-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
            </span>
            <span className="dash-greet-xp mono">
              {level.toNext} XP to Level {level.level + 1}
            </span>
          </div>
        </div>

        <div className="dash-greet-actions">
          <Link to="/profile" className="btn btn-sm">
            <Icon name="edit" size={15} />
            Customize
          </Link>
          <Link to="/shop" className="btn btn-sm btn-sun">
            <Icon name="sparkles" size={15} />
            Shop
          </Link>
        </div>
      </header>

      <div className="dash-top">
        <RaceCard
          event={race}
          standings={standings}
          loading={loadingEvents || loadingStandings}
          userId={user?.id}
          username={username}
          avatar={profile?.avatar}
          referralLink={referralLink}
          onJoined={loadStandings}
          now={now}
        />

        <MiniBoard
          event={race}
          standings={standings}
          loading={loadingEvents || loadingStandings}
          userId={user?.id}
        />
      </div>

      <div className="dash-mid">
        <StreakCard
          compact
          userId={user?.id}
          streak={profile?.checkin_streak}
          lastCheckin={profile?.last_checkin}
          streakEvent={streakEvent}
          now={now}
        />

        <QuestsCard compact now={now} />

        <ActivityFeed />
      </div>

      <section className="dash-events">
        <div className="dash-section-head">
          <h2>Events</h2>
          <Link to="/events" className="dash-more">
            All events <Icon name="arrowRight" size={14} />
          </Link>
        </div>

        {loadingEvents ? (
          <div className="card" aria-busy="true">
            <SkeletonRows count={2} />
          </div>
        ) : shownEvents.length ? (
          <div className="dash-event-list">
            {shownEvents.map((event) => (
              <DashEvent key={event.id} event={event} now={now} />
            ))}
          </div>
        ) : (
          <div className="card dash-idle">
            Nothing running right now. New events get announced in the{" "}
            <Link to="/discord">Discord</Link> first.
          </div>
        )}
      </section>

      {isNewMember && (
        <section className="home-how">
          <div className="home-section-head">
            <span className="eyebrow">New here? How it works</span>
            <h2>Simple on purpose.</h2>
          </div>

          <ol className="home-how-steps">
            <li>
              <span className="home-how-num">01</span>
              <h3>Share your link</h3>
              <p>Your link is tied to your username. Anyone can use it.</p>
            </li>
            <li>
              <span className="home-how-num">02</span>
              <h3>Friends sign up</h3>
              <p>Each new account made through your link adds one to your count.</p>
            </li>
            <li>
              <span className="home-how-num">03</span>
              <h3>Top 3 get paid</h3>
              <p>When an event ends, the highest counts win the prize pool.</p>
            </li>
          </ol>
        </section>
      )}
    </main>
  );
}

export default Home;
