import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Auth from "./components/Auth";

import Home from "./pages/Home";
import EventsPage from "./pages/EventsPage";
import EventDetailsPage from "./pages/EventDetails";
import EventLeaderboardPage from "./pages/EventLeaderboardPage";
import TopInviterEventPage from "./pages/TopInviterEventPage";
import InvitesPage from "./pages/InvitesPage";
import DonationsPage from "./pages/DonationsPage";
import DiscordPage from "./pages/DiscordPage";
import MomentsPage from "./pages/MomentsPage";
import MomentViewPage from "./pages/MomentViewPage";

import { EventProvider } from "./context/EventContext";

import { supabase } from "./lib/supabaseClient";

import "./styles/theme.css";
import "./styles/global.css";
import "./styles/navbar.css";
import "./styles/referral.css";
import "./styles/referralHistory.css";
import "./styles/leaderboard.css";
import "./styles/donation.css";
import "./styles/footer.css";
import "./styles/auth.css";
import "./styles/events.css";
import "./styles/eventDetails.css";
import "./styles/eventLeaderboard.css";
import "./styles/referralPreview.css";
import "./styles/home.css";
import "./styles/invites.css";
import "./styles/discord.css";
import "./styles/moments.css";
import "./styles/topInviterEvent.css";

function AuthenticatedApp({ session, onLogout }) {
  return (
    <EventProvider user={session.user}>
      <div className="app">
        <div className="background-glow glow-one"></div>
        <div className="background-glow glow-two"></div>

        <Navbar
          user={session.user}
          onLogout={onLogout}
        />

        <Routes>
          <Route
            path="/"
            element={<Home user={session.user} />}
          />

          <Route
            path="/events"
            element={<EventsPage user={session.user} />}
          />

          <Route
            path="/events/top-inviter"
            element={
              <TopInviterEventPage
                user={session.user}
              />
            }
          />

          <Route
            path="/events/:eventId"
            element={
              <EventDetailsPage
                user={session.user}
              />
            }
          />

          <Route
            path="/events/:eventId/leaderboard"
            element={
              <EventLeaderboardPage
                user={session.user}
              />
            }
          />

          <Route
            path="/invites"
            element={<InvitesPage user={session.user} />}
          />

          <Route
            path="/donations"
            element={<DonationsPage user={session.user} />}
          />

          <Route
            path="/discord"
            element={<DiscordPage />}
          />

          <Route
            path="/moments"
            element={<MomentsPage user={session.user} />}
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>

        <Footer />
      </div>
    </EventProvider>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================================
     PRELOAD BUTTON SOUND
  ========================================= */

  useEffect(() => {
    const audio = new Audio("/sounds/click.mp3");

    audio.preload = "auto";
    audio.volume = 0.18;
    audio.load();

    const handleButtonClick = (event) => {
      const button = event.target.closest("button");

      if (!button || button.disabled) {
        return;
      }

      try {
        audio.currentTime = 0;

        const playPromise =
          audio.play();

        if (playPromise) {
          playPromise.catch(() => {});
        }
      } catch {
        // Never let the sound break the website.
      }
    };

    document.addEventListener(
      "click",
      handleButtonClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleButtonClick
      );

      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  /* =========================================
     LOAD SESSION
  ========================================= */

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: {
          session: currentSession,
        },
      } =
        await supabase.auth.getSession();

      if (mounted) {
        setSession(currentSession);
        setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================
     AUTHENTICATED
  ========================================= */

  const handleAuthenticated = (
    newSession
  ) => {
    setSession(newSession);
  };

  /* =========================================
     LOGOUT
  ========================================= */

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Moment links work even before login. */}
        <Route
          path="/m/:momentId"
          element={<MomentViewPage />}
        />

        {/* Everything else keeps the existing login gate. */}
        <Route
          path="*"
          element={
            loading ? (
              <div className="auth-page">
                <div className="auth-container">
                  <div className="auth-card">
                    <div className="auth-heading">
                      <div className="auth-badge">
                        VEXORA
                      </div>

                      <h1>
                        Loading...
                      </h1>

                      <p>
                        Checking your account session.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : !session ? (
              <Auth
                onAuthenticated={
                  handleAuthenticated
                }
              />
            ) : (
              <AuthenticatedApp
                session={session}
                onLogout={handleLogout}
              />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
