import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { events } from "../data/events";
import ReferralPreview from "../components/ReferralPreview";

import "../styles/home.css";

function Home({ user }) {
  const username =
    user?.user_metadata?.username || "Member";

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =========================================
     FIND LIVE EVENT
  ========================================= */

  const liveEvent =
    events.find((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);

      return (
        event.active &&
        now >= start &&
        now <= end
      );
    }) || null;

  /* =========================================
     FIND NEXT UPCOMING EVENT
  ========================================= */

  const upcomingEvent =
    events
      .filter((event) => {
        const start = new Date(event.startDate);

        return (
          event.active &&
          start > now
        );
      })
      .sort(
        (a, b) =>
          new Date(a.startDate) -
          new Date(b.startDate)
      )[0] || null;

  /* =========================================
     COUNTDOWN
  ========================================= */

  const formatCountdown = (date) => {
    const difference =
      new Date(date).getTime() -
      now.getTime();

    if (difference <= 0) {
      return "00d 00h 00m 00s";
    }

    const totalSeconds =
      Math.floor(difference / 1000);

    const days =
      Math.floor(totalSeconds / 86400);

    const hours =
      Math.floor(
        (totalSeconds % 86400) / 3600
      );

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      );

    const seconds =
      totalSeconds % 60;

    return `${String(days).padStart(
      2,
      "0"
    )}d ${String(hours).padStart(
      2,
      "0"
    )}h ${String(minutes).padStart(
      2,
      "0"
    )}m ${String(seconds).padStart(
      2,
      "0"
    )}s`;
  };

  return (
    <main className="home-page">

      {/* =========================================
          HERO
      ========================================= */}

      <section className="home-hero">

        <div className="home-hero-badge">
          <span className="home-badge-dot"></span>
          VEXORA COMPETITION
        </div>

        <h1>
          Compete.
          <span> Invite.</span>
          <br />
          <strong>Climb higher.</strong>
        </h1>

        <p>
          Welcome back,{" "}
          <span className="home-username">
            {username}
          </span>
          . Join events, invite friends, and
          compete for exclusive rewards.
        </p>

        <div className="home-hero-actions">

          <Link
            to="/events"
            className="home-primary-button"
          >
            EXPLORE EVENTS
          </Link>

          <Link
            to="/invites"
            className="home-secondary-button"
          >
            MY REFERRALS
          </Link>

        </div>

      </section>


      {/* =========================================
          LIVE AT VEXORA
      ========================================= */}

      {liveEvent && (
        <section className="home-live-section">

          <div className="home-live-card">

            <div className="home-live-left">

              <div className="home-live-label">
                <span className="home-live-dot"></span>
                LIVE NOW
              </div>

              <div className="home-live-title">
                {liveEvent.title}
              </div>

              <div className="home-live-description">
                {liveEvent.description}
              </div>

            </div>

            <div className="home-live-right">

              <div className="home-live-prize">

                <span>
                  🏆 PRIZE
                </span>

                <strong>
                  {liveEvent.prize}
                </strong>

              </div>

              <div className="home-live-countdown">

                <span>
                  ENDS IN
                </span>

                <strong>
                  {formatCountdown(
                    liveEvent.endDate
                  )}
                </strong>

              </div>

              <Link
                to={`/events/${liveEvent.id}`}
                className="home-live-button"
              >
                VIEW EVENT →
              </Link>

            </div>

          </div>

        </section>
      )}


      {/* =========================================
          QUICK ACCESS
      ========================================= */}

      <section className="home-quick-section">

        <div className="home-section-heading">

          <div>

            <div className="home-section-label">
              QUICK ACCESS
            </div>

            <h2>
              Everything in one place.
            </h2>

          </div>

        </div>

        <div className="home-quick-grid">

          <Link
            to="/events"
            className="home-quick-card"
          >

            <div className="home-quick-icon purple">
              ⚡
            </div>

            <div className="home-quick-content">

              <span>
                COMPETE
              </span>

              <h3>
                Events
              </h3>

              <p>
                Discover live and upcoming Vexora
                competitions and rewards.
              </p>

              <div className="home-quick-link">
                View events
                <span>→</span>
              </div>

            </div>

          </Link>


          <Link
            to="/invites"
            className="home-quick-card"
          >

            <div className="home-quick-icon blue">
              🔗
            </div>

            <div className="home-quick-content">

              <span>
                GROW
              </span>

              <h3>
                Invites
              </h3>

              <p>
                Share your referral link and climb
                the competition.
              </p>

              <div className="home-quick-link">
                Open referrals
                <span>→</span>
              </div>

            </div>

          </Link>


          <Link
            to="/donations"
            className="home-quick-card"
          >

            <div className="home-quick-icon pink">
              💜
            </div>

            <div className="home-quick-content">

              <span>
                SUPPORT
              </span>

              <h3>
                Donations
              </h3>

              <p>
                Support the competition and help keep
                future events running.
              </p>

              <div className="home-quick-link">
                Support Vexora
                <span>→</span>
              </div>

            </div>

          </Link>

        </div>

      </section>


      {/* =========================================
          REFERRAL PREVIEW
      ========================================= */}

      <section className="home-referral-section">

        <ReferralPreview />

      </section>


      {/* =========================================
          NEXT EVENT
      ========================================= */}

      {upcomingEvent && (
        <section className="home-next-section">

          <div className="home-section-heading">

            <div>

              <div className="home-section-label">
                WHAT'S NEXT
              </div>

              <h2>
                Coming to Vexora.
              </h2>

              <p>
                The next competition is already
                waiting.
              </p>

            </div>

          </div>

          <Link
            to={`/events/${upcomingEvent.id}`}
            className="home-next-card"
          >

            <div className="home-next-image">

              <img
                src={upcomingEvent.image}
                alt={upcomingEvent.title}
              />

              <div className="home-next-overlay"></div>

            </div>

            <div className="home-next-content">

              <div className="home-next-label">
                UPCOMING EVENT
              </div>

              <h3>
                {upcomingEvent.title}
              </h3>

              <p>
                {upcomingEvent.description}
              </p>

              <div className="home-next-bottom">

                <span>
                  STARTS{" "}
                  {new Date(
                    upcomingEvent.startDate
                  ).toLocaleDateString()}
                </span>

                <strong>
                  VIEW EVENT →
                </strong>

              </div>

            </div>

          </Link>

        </section>
      )}


      {/* =========================================
          BOTTOM CTA
      ========================================= */}

      <section className="home-bottom-cta">

        <div className="home-cta-glow"></div>

        <div className="home-cta-content">

          <div className="home-section-label">
            READY?
          </div>

          <h2>
            Your next win starts here.
          </h2>

          <p>
            Explore what's happening across Vexora
            and make your move.
          </p>

        </div>

        <Link
          to="/events"
          className="home-cta-button"
        >
          SEE EVENTS
        </Link>

      </section>

    </main>
  );
}

export default Home;