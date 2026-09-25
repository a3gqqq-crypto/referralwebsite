import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { useEventList } from "../data/events";
import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import ProfileCard from "../components/ProfileCard";
import SkeletonRows from "../components/SkeletonRows";
import StreakCard from "../components/StreakCard";
import QuestsCard from "../components/QuestsCard";
import { useMyProfile } from "../context/ProfileContext";
import { equippedFrom } from "../data/cosmetics";
import {
  useNow,
  getEventStatus,
  formatCountdown,
} from "../hooks/useCountdown";
import { useReveal } from "../hooks/useReveal";
import {
  useCopy,
  canNativeShare,
  nativeShare,
  referralLinkFor,
} from "../hooks/useCopy";

import "../styles/home.css";

const SHARE_TEXT =
  "Join me on Vexora — invite friends, climb the board, win real prizes.";

function HomeEventCard({ event, live = false, now }) {
  return (
    <div className={`home-event card ${live ? "home-event-live" : "home-event-upcoming"}`}>
      <div className="home-event-main">
        {live ? (
          <span className="chip chip-live">
            <span className="live-dot" />
            Live now
          </span>
        ) : (
          <span className="chip chip-upcoming">Next up</span>
        )}

        <h2>{event.title}</h2>

        <p>{event.description}</p>
      </div>

      <div className="home-event-side">
        <div>
          <span className="eyebrow">Prize pool</span>
          <strong className="home-event-prize">{event.prize}</strong>
        </div>

        <div>
          <span className="eyebrow">{live ? "Ends in" : "Starts in"}</span>
          <strong className="home-event-timer mono">
            {formatCountdown(live ? event.endDate : event.startDate, now)}
          </strong>
        </div>

        <Link to={`/events/${event.id}`} className="btn btn-dark">
          View event
          <Icon name="arrowRight" />
        </Link>
      </div>
    </div>
  );
}

function Home({ user }) {
  const { profile } = useMyProfile();

  const username =
    user?.user_metadata?.username || "Member";

  const referralLink = referralLinkFor(
    user?.user_metadata?.username
  );

  const now = useNow();

  const [standing, setStanding] = useState({
    rank: null,
    referrals: null,
    players: null,
  });

  const [heroCopied, copyHero] = useCopy();
  const [bandCopied, copyBand] = useCopy();

  /* =========================================
     LOAD STANDING
  ========================================= */

  useEffect(() => {
    let cancelled = false;

    const loadStanding = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, referral_count")
        .order("referral_count", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Could not load referral rank:", error);
        return;
      }

      const rows = data || [];
      const index = rows.findIndex(
        (profile) => profile.id === user.id
      );

      setStanding({
        rank: index >= 0 ? index + 1 : null,
        referrals:
          index >= 0 ? rows[index].referral_count || 0 : null,
        players: rows.length,
      });
    };

    loadStanding();

    const timer = setInterval(loadStanding, 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user?.id]);

  /* =========================================
     EVENTS
  ========================================= */

  const { events, loading: loadingEvents } = useEventList();
  const activeEvents = events.filter((event) => event.active);

  // Several events can run at once (e.g. an invite race and the monthly streak).
  const liveEvents = activeEvents
    .filter((event) => getEventStatus(event, now) === "live")
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  const streakEvent =
    activeEvents
      .filter(
        (event) => event.type === "streak" && getEventStatus(event, now) !== "ended"
      )
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] || null;

  const upcomingEvent =
    activeEvents
      .filter(
        (event) => getEventStatus(event, now) === "upcoming"
      )
      .sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
      )[0] || null;

  const lastEndedEvent =
    events
      .filter(
        (event) => getEventStatus(event, now) === "ended"
      )
      .sort(
        (a, b) => new Date(b.endDate) - new Date(a.endDate)
      )[0] || null;

  /* =========================================
     REVEAL
  ========================================= */

  const [statusRef, statusVisible] = useReveal();
  const [doRef, doVisible] = useReveal();
  const [howRef, howVisible] = useReveal();
  const [bandRef, bandVisible] = useReveal();

  const revealClass = (visible) =>
    `reveal-section ${visible ? "reveal-visible" : ""}`;

  return (
    <main className="page home-page">

      {/* =========================================
          HERO
      ========================================= */}

      <section className="home-hero">

        <div className="home-hero-copy">
          <span className="eyebrow">
            Hey {username} 👋
          </span>

          <h1>
            Bring your friends.{" "}
            <span className="mark">Take the top spot.</span>
          </h1>

          <p>
            Every friend who signs up with your link
            counts toward your rank. Most invites when
            the event ends wins the prize pool.
          </p>

          <div className="home-hero-actions">
            <button
              type="button"
              className={`btn ${heroCopied ? "btn-success" : "btn-primary"}`}
              onClick={() => copyHero(referralLink)}
              disabled={!referralLink}
            >
              <Icon name={heroCopied ? "check" : "copy"} />
              {heroCopied ? "Link copied" : "Copy my invite link"}
            </button>

            <Link to="/events" className="btn">
              See events
              <Icon name="arrowRight" />
            </Link>
          </div>
        </div>

        <aside className="home-me" aria-label="Your profile">
          <ProfileCard
            userId={user?.id}
            username={username}
            equipped={equippedFrom(profile)}
            xp={profile?.xp}
            streak={profile?.checkin_streak}
            showProgress
            stats={[
              { label: "Rank", value: standing.rank ? `#${standing.rank}` : "—" },
              { label: "Referrals", value: standing.referrals ?? "—" },
              { label: "Players", value: standing.players ?? "—" },
            ]}
          >
            <p className="home-me-caption">
              {standing.rank === 1
                ? "You're in first. Hold it."
                : standing.rank
                  ? `${standing.rank - 1} ${standing.rank - 1 === 1 ? "person" : "people"} ahead of you.`
                  : "Invite someone to get on the board."}
            </p>

            <div className="home-me-actions">
              <Link to="/profile" className="btn btn-sm">
                <Icon name="edit" size={15} />
                Customize
              </Link>

              <Link to="/shop" className="btn btn-sm btn-sun">
                <Icon name="sparkles" size={15} />
                Shop
              </Link>
            </div>
          </ProfileCard>
        </aside>

      </section>


      {/* =========================================
          EVENT STATUS
      ========================================= */}

      <section
        ref={statusRef}
        className={`home-status ${revealClass(statusVisible)}`}
      >
        <StreakCard
          userId={user?.id}
          streak={profile?.checkin_streak}
          lastCheckin={profile?.last_checkin}
          streakEvent={streakEvent}
          now={now}
        />

        <QuestsCard now={now} />

        {loadingEvents ? (
          <div className="home-event card" aria-busy="true">
            <SkeletonRows count={2} />
          </div>
        ) : liveEvents.length > 0 ? (
          liveEvents.map((event) => (
            <HomeEventCard key={event.id} event={event} live now={now} />
          ))
        ) : upcomingEvent ? (
          <HomeEventCard event={upcomingEvent} now={now} />
        ) : (
          <div className="home-event home-event-idle">
            <div className="home-event-main">
              <span className="chip chip-ended">
                Between events
              </span>

              <h2>The next competition is on its way.</h2>

              <p>
                {lastEndedEvent
                  ? `${lastEndedEvent.title} has wrapped. `
                  : ""}
                New events get announced in the Discord
                first — and invites you send now still
                count toward your total.
              </p>
            </div>

            <div className="home-event-actions">
              <Link to="/discord" className="btn btn-dark">
                Get notified on Discord
              </Link>

              {lastEndedEvent && (
                <Link
                  to={`/events/${lastEndedEvent.id}/leaderboard`}
                  className="btn"
                >
                  Final results
                </Link>
              )}
            </div>
          </div>
        )}
      </section>


      {/* =========================================
          THINGS TO DO
      ========================================= */}

      <section
        ref={doRef}
        className={`home-do ${revealClass(doVisible)}`}
      >
        <div className="home-section-head">
          <span className="eyebrow">Your next move</span>
          <h2>Three ways to climb.</h2>
        </div>

        <div className="home-do-grid">
          <Link to="/invites" className="home-do-card">
            <span className="home-do-icon" aria-hidden="true">
              <Icon name="link" size={22} />
            </span>
            <h3>Share your link</h3>
            <p>
              Send it in group chats, bios, stories.
              Track who joined and where you rank.
            </p>
            <span className="home-do-cta">
              Open invites <Icon name="arrowRight" size={16} />
            </span>
          </Link>

          <Link to="/moments" className="home-do-card">
            <span className="home-do-icon" aria-hidden="true">
              <Icon name="heart" size={22} />
            </span>
            <h3>Send a Moment</h3>
            <p>
              Make a little card for a friend. It carries
              your invite, so it counts when they join.
            </p>
            <span className="home-do-cta">
              Make one <Icon name="arrowRight" size={16} />
            </span>
          </Link>

          <Link to="/profile" className="home-do-card home-do-card-gold">
            <span className="home-do-icon" aria-hidden="true">
              <Icon name="crown" size={22} />
            </span>
            <h3>Dress up your profile</h3>
            <p>
              Frames, name effects, banners and badges.
              Your profile link is an invite link too.
            </p>
            <span className="home-do-cta">
              Customize <Icon name="arrowRight" size={16} />
            </span>
          </Link>
        </div>
      </section>


      {/* =========================================
          HOW IT WORKS
      ========================================= */}

      <section
        ref={howRef}
        className={`home-how ${revealClass(howVisible)}`}
      >
        <div className="home-section-head">
          <span className="eyebrow">How it works</span>
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


      {/* =========================================
          INVITE BAND
      ========================================= */}

      <section
        ref={bandRef}
        className={`home-band ${revealClass(bandVisible)}`}
      >
        <div className="home-band-copy">
          <h2>Your link is your ticket.</h2>
          <p>Copy it once, paste it everywhere.</p>
        </div>

        <div className="home-band-link">
          <code className="mono">
            {referralLink || "Set a username to get your link"}
          </code>

          <div className="home-band-buttons">
            <button
              type="button"
              className={`btn ${bandCopied ? "btn-success" : "btn-sun"}`}
              onClick={() => copyBand(referralLink)}
              disabled={!referralLink}
            >
              <Icon name={bandCopied ? "check" : "copy"} />
              {bandCopied ? "Copied" : "Copy"}
            </button>

            {canNativeShare && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  nativeShare({
                    title: "Vexora",
                    text: SHARE_TEXT,
                    url: referralLink,
                  })
                }
                disabled={!referralLink}
              >
                <Icon name="share" />
                Share
              </button>
            )}
          </div>
        </div>
      </section>

    </main>
  );
}

export default Home;
