import { Suspense, lazy, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { featuredEvent, useEventList } from "./data/events";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Auth from "./components/Auth";
import ErrorBoundary from "./components/ErrorBoundary";

import Home from "./pages/Home";
import EventsPage from "./pages/EventsPage";
import EventDetailsPage from "./pages/EventDetails";
import EventLeaderboardPage from "./pages/EventLeaderboardPage";
import InvitesPage from "./pages/InvitesPage";
import DonationsPage from "./pages/DonationsPage";
import DiscordPage from "./pages/DiscordPage";
import MomentsPage from "./pages/MomentsPage";
import MomentViewPage from "./pages/MomentViewPage";
import ProfilePage from "./pages/ProfilePage";
import LockerPage from "./pages/LockerPage";
import ShopPage from "./pages/ShopPage";
import PeoplePage from "./pages/PeoplePage";
import ChatPage from "./pages/ChatPage";
import NotFound from "./pages/NotFound";
import PageLoading from "./components/PageLoading";

const AdminPage = lazy(() => import("./pages/AdminPage"));

import { EventProvider } from "./context/EventContext";
import { ProfileProvider } from "./context/ProfileContext";
import { SocialProvider } from "./context/SocialContext";

import { supabase } from "./lib/supabaseClient";

import "./styles/navbar.css";
import "./styles/footer.css";
import "./styles/auth.css";
import "./styles/donation.css";
import "./styles/discord.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function LeaderboardRedirect() {
  const { events, loading } = useEventList();

  if (loading) return <PageLoading />;

  const featured = featuredEvent(events);

  return <Navigate to={featured ? `/events/${featured.id}/leaderboard` : "/events"} replace />;
}

function AuthenticatedApp({ session, onLogout }) {
  const user = session.user;
  const { pathname } = useLocation();
  const fullHeight = pathname.startsWith("/chat");

  return (
    <EventProvider user={user}>
      <ProfileProvider user={user}>
        <SocialProvider user={user}>
          <div className="app">
            <ScrollToTop />

            <Navbar user={user} onLogout={onLogout} />

            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/leaderboard" element={<LeaderboardRedirect />} />
              <Route path="/events/:eventId" element={<EventDetailsPage user={user} />} />
              <Route path="/events/:eventId/leaderboard" element={<EventLeaderboardPage user={user} />} />
              <Route path="/invites" element={<InvitesPage user={user} />} />
              <Route path="/moments" element={<MomentsPage user={user} />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/profile" element={<LockerPage />} />
              <Route path="/u/:username" element={<ProfilePage viewer={user} />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:username" element={<ChatPage />} />
              <Route path="/donations" element={<DonationsPage />} />
              <Route path="/discord" element={<DiscordPage />} />
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <AdminPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>

            {!fullHeight && <Footer />}
          </div>
        </SocialProvider>
      </ProfileProvider>
    </EventProvider>
  );
}

function useClickSound() {
  useEffect(() => {
    const audio = new Audio("/sounds/click.mp3");

    audio.preload = "auto";
    audio.volume = 0.18;
    audio.load();

    const handleButtonClick = (event) => {
      const button = event.target.closest("button");

      if (!button || button.disabled) return;

      try {
        audio.currentTime = 0;
        audio.play()?.catch(() => {});
      } catch {
        // Never let the sound break the website.
      }
    };

    document.addEventListener("click", handleButtonClick);

    return () => {
      document.removeEventListener("click", handleButtonClick);
      audio.pause();
    };
  }, []);
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useClickSound();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const loadingScreen = (
    <div className="app-loading">
      <span className="brand-mark" aria-hidden="true">V</span>
      <p>Loading Vexora…</p>
    </div>
  );

  const gated = loading ? (
    loadingScreen
  ) : session ? (
    <AuthenticatedApp session={session} onLogout={handleLogout} />
  ) : (
    <Auth onAuthenticated={setSession} />
  );

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Moments and profiles are shareable, so they open without an account. */}
          <Route path="/m/:momentId" element={<MomentViewPage />} />

          {!loading && !session && (
            <Route path="/u/:username" element={<ProfilePage standalone />} />
          )}

          <Route path="*" element={gated} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
