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
import InvitesPage from "./pages/InvitesPage";
import DonationsPage from "./pages/DonationsPage";

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

function App() {
  const [session, setSession] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

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
      data: {
        subscription,
      },
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

  const handleAuthenticated =
    (newSession) => {
      setSession(newSession);
    };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    setSession(null);
  };


  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
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
    );
  }


  /* =========================================
     LOGIN
  ========================================= */

  if (!session) {
    return (
      <Auth
        onAuthenticated={
          handleAuthenticated
        }
      />
    );
  }


  /* =========================================
     LOGGED IN
  ========================================= */

  return (
    <BrowserRouter>

      <EventProvider
        user={session.user}
      >

        <div className="app">

          <div className="background-glow glow-one"></div>

          <div className="background-glow glow-two"></div>

          <Navbar
            user={session.user}
            onLogout={handleLogout}
          />

          <Routes>

            <Route
              path="/"
              element={
                <Home
                  user={session.user}
                />
              }
            />

            <Route
              path="/events"
              element={
                <EventsPage
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
              element={
                <InvitesPage
                  user={session.user}
                />
              }
            />

            <Route
              path="/donations"
              element={
                <DonationsPage
                  user={session.user}
                />
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>

          <Footer />

        </div>

      </EventProvider>

    </BrowserRouter>
  );
}

export default App;