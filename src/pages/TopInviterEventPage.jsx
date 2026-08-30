import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { events } from "../data/events";
import { useEvents } from "../context/EventContext";

import "../styles/topInviterEvent.css";

function TopInviterEventPage({ user }) {
  const [now, setNow] = useState(new Date());
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const {
    isJoined,
    joinEvent,
    loadingEvents,
  } = useEvents();

  const event =
    events.find(
      (item) => item.id === "top-inviter"
    );

  const joined = event
    ? isJoined(event.id)
    : false;

  const username =
    user?.user_metadata?.username ||
    "Member";

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!event) {
    return (
      <main className="top-inviter-page">
        <div className="top-inviter-not-found">
          <h1>Event unavailable.</h1>

          <p>
            This competition could not be loaded.
          </p>

          <Link to="/events">
            ← Back to Events
          </Link>
        </div>
      </main>
    );
  }

  const start =
    new Date(event.startDate);

  const end =
    new Date(event.endDate);

  let status = "live";

  if (now < start) {
    status = "upcoming";
  } else if (now > end) {
    status = "ended";
  }

  const formatTimeLeft = () => {
    const difference =
      end.getTime() -
      now.getTime();

    if (difference <= 0) {
      return "00d 00h 00m 00s";
    }

    const totalSeconds =
      Math.floor(
        difference / 1000
      );

    const days =
      Math.floor(
        totalSeconds / 86400
      );

    const hours =
      Math.floor(
        (totalSeconds % 86400) /
          3600
      );

    const minutes =
      Math.floor(
        (totalSeconds % 3600) /
          60
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

  const getReward = (position) => {
    return (
      event.rules?.winners?.find(
        (winner) =>
          winner.position === position
      )?.reward || "—"
    );
  };

  const referralLink =
    `${window.location.origin}/?ref=${encodeURIComponent(
      username
    )}`;

  const copyReferral = async () => {
    setError("");

    try {
      await navigator.clipboard.writeText(
        referralLink
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (copyError) {
      console.error(
        "Could not copy referral link:",
        copyError
      );

      setError(
        "Could not copy your referral link."
      );
    }
  };

  const handleJoin = async () => {
    setError("");
    setMessage("");

    if (!user?.id) {
      setError(
        "You need to be logged in to join this event."
      );

      return;
    }

    if (status === "ended") {
      setError(
        "This competition has already ended."
      );

      return;
    }

    if (joined) {
      return;
    }

    setJoining(true);

    try {
      const result =
        await joinEvent(event.id);

      if (!result?.success) {
        setError(
          result?.error ||
            "Could not join the event."
        );

        return;
      }

      setMessage(
        result.alreadyJoined
          ? "You're already participating."
          : "You're officially in. Good luck! 🏆"
      );
    } catch (joinError) {
      console.error(
        "Could not join:",
        joinError
      );

      setError(
        "Could not join the event. Please try again."
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="top-inviter-page">

      {/* ================================
          BACK
      ================================= */}

      <Link
        to="/events"
        className="top-inviter-back"
      >
        ← BACK TO EVENTS
      </Link>


      {/* ================================
          HERO
      ================================= */}

      <section className="top-inviter-hero">

        <div className="top-inviter-hero-image">
          <img
            src={event.image}
            alt={event.title}
          />

          <div className="top-inviter-hero-overlay"></div>
        </div>


        <div className="top-inviter-hero-content">

          <div className="top-inviter-status">
            <span
              className={`top-inviter-status-dot ${status}`}
            />

            {status === "live"
              ? "LIVE COMPETITION"
              : status === "upcoming"
                ? "UPCOMING COMPETITION"
                : "COMPETITION ENDED"}
          </div>


          <div className="top-inviter-kicker">
            {event.subtitle}
          </div>


          <h1>
            Invite more.
            <span> Climb higher.</span>
          </h1>


          <p>
            {event.description}
          </p>

        </div>

      </section>


      {/* ================================
          STATS
      ================================= */}

      <section className="top-inviter-stats">

        <div className="top-inviter-stat purple">
          <span>PRIZE POOL</span>

          <strong>
            {event.prize}
          </strong>

          <small>
            Top three positions rewarded
          </small>
        </div>


        <div className="top-inviter-stat blue">
          <span>
            {status === "ended"
              ? "STATUS"
              : "TIME REMAINING"}
          </span>

          <strong>
            {status === "ended"
              ? "ENDED"
              : formatTimeLeft()}
          </strong>

          <small>
            Competition countdown
          </small>
        </div>


        <div className="top-inviter-stat pink">
          <span>YOUR STATUS</span>

          <strong>
            {joined
              ? "JOINED"
              : status === "ended"
                ? "CLOSED"
                : "READY"}
          </strong>

          <small>
            {joined
              ? "Keep climbing"
              : "Join to compete"}
          </small>
        </div>

      </section>


      {/* ================================
          MISSION
      ================================= */}

      <section className="top-inviter-section">

        <div className="top-inviter-mission">

          <div>
            <span className="top-inviter-label">
              THE MISSION
            </span>

            <h2>
              Your network.
              <span> Your advantage.</span>
            </h2>

            <p>
              Bring new members into Vexora using
              your personal referral link. The more
              successful referrals you earn, the
              higher you climb on the leaderboard.
            </p>
          </div>


          <div className="top-inviter-mission-icon">
            ↗
          </div>

        </div>

      </section>


      {/* ================================
          REWARDS
      ================================= */}

      <section className="top-inviter-section">

        <div className="top-inviter-heading">

          <div>
            <span className="top-inviter-label">
              REWARD VAULT
            </span>

            <h2>
              Finish in the top three.
            </h2>
          </div>

          <strong>
            {event.prize}
          </strong>

        </div>


        <div className="top-inviter-rewards">

          <div className="top-inviter-reward second">

            <div className="top-inviter-medal">
              🥈
            </div>

            <span>2ND PLACE</span>

            <strong>
              {getReward(2)}
            </strong>

          </div>


          <div className="top-inviter-reward first">

            <div className="top-inviter-crown">
              👑
            </div>

            <div className="top-inviter-medal">
              🥇
            </div>

            <span>1ST PLACE</span>

            <strong>
              {getReward(1)}
            </strong>

            <small>
              TOP INVITER
            </small>

          </div>


          <div className="top-inviter-reward third">

            <div className="top-inviter-medal">
              🥉
            </div>

            <span>3RD PLACE</span>

            <strong>
              {getReward(3)}
            </strong>

          </div>

        </div>

      </section>


      {/* ================================
          REFERRAL
      ================================= */}

      <section className="top-inviter-section">

        <div className="top-inviter-heading">

          <div>
            <span className="top-inviter-label">
              YOUR REFERRAL LINK
            </span>

            <h2>
              Start climbing.
            </h2>
          </div>

          <div className="top-inviter-tracking">
            <span></span>
            TRACKING ACTIVE
          </div>

        </div>


        <div className="top-inviter-referral">

          <code>
            {referralLink}
          </code>

          <button
            type="button"
            className={
              copied
                ? "copied"
                : ""
            }
            onClick={copyReferral}
          >
            {copied
              ? "✓ COPIED"
              : "COPY LINK"}
          </button>

        </div>


        <p className="top-inviter-referral-note">
          Share your link with friends, communities,
          Discord, WhatsApp, Instagram Stories, and
          anywhere else you want to compete from.
        </p>

      </section>


      {/* ================================
          HOW IT WORKS
      ================================= */}

      <section className="top-inviter-section">

        <div className="top-inviter-heading">

          <div>
            <span className="top-inviter-label">
              HOW IT WORKS
            </span>

            <h2>
              Invite. Climb. Win.
            </h2>
          </div>

        </div>


        <div className="top-inviter-steps">

          <div>
            <span>01</span>

            <strong>
              JOIN
            </strong>

            <p>
              Enter the competition.
            </p>
          </div>


          <div>
            <span>02</span>

            <strong>
              SHARE
            </strong>

            <p>
              Send your referral link.
            </p>
          </div>


          <div>
            <span>03</span>

            <strong>
              CLIMB
            </strong>

            <p>
              Build your referral count.
            </p>
          </div>


          <div>
            <span>04</span>

            <strong>
              WIN
            </strong>

            <p>
              Finish among the top three.
            </p>
          </div>

        </div>

      </section>


      {/* ================================
          MESSAGES
      ================================= */}

      {error && (
        <div className="top-inviter-message error">
          {error}
        </div>
      )}

      {message && (
        <div className="top-inviter-message success">
          {message}
        </div>
      )}


      {/* ================================
          ACTIONS
      ================================= */}

      <section className="top-inviter-actions">

        <button
          type="button"
          className={
            joined
              ? "joined"
              : ""
          }
          onClick={handleJoin}
          disabled={
            loadingEvents ||
            joining ||
            joined ||
            status === "ended"
          }
        >
          {loadingEvents
            ? "CHECKING..."
            : joining
              ? "JOINING..."
              : joined
                ? "✓ YOU'RE JOINED"
                : status === "ended"
                  ? "EVENT ENDED"
                  : "JOIN EVENT"}
        </button>


        <Link
          to="/events/top-inviter/leaderboard"
        >
          🏆 VIEW EVENT LEADERBOARD
        </Link>

      </section>

    </main>
  );
}

export default TopInviterEventPage;