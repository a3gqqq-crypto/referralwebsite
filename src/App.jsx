import { Suspense, useEffect, useState } from "react";
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
import MobileTabBar from "./components/MobileTabBar";
import Auth from "./components/Auth";
import ErrorBoundary from "./components/ErrorBoundary";
import ResetPassword from "./components/ResetPassword";

import Home from "./pages/Home";
import MomentViewPage from "./pages/MomentViewPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import PageLoading from "./components/PageLoading";
import { lazyPage } from "./lib/lazyPage";

// Home, shared Moments and public profiles are entry points, so they load
// with the app; everything else downloads when it's first opened.
const EventsPage = lazyPage(() => import("./pages/EventsPage"));
const EventDetailsPage = lazyPage(() => import("./pages/EventDetails"));
const EventLeaderboardPage = lazyPage(() => import("./pages/EventLeaderboardPage"));
const InvitesPage = lazyPage(() => import("./pages/InvitesPage"));
const DonationsPage = lazyPage(() => import("./pages/DonationsPage"));
const DiscordPage = lazyPage(() => import("./pages/DiscordPage"));
const MomentsPage = lazyPage(() => import("./pages/MomentsPage"));
const LockerPage = lazyPage(() => import("./pages/LockerPage"));
const ShopPage = lazyPage(() => import("./pages/ShopPage"));
const PeoplePage = lazyPage(() => import("./pages/PeoplePage"));
const ChatPage = lazyPage(() => import("./pages/ChatPage"));
const AdminPage = lazyPage(() => import("./pages/AdminPage"));
const RulesPage = lazyPage(() => import("./pages/RulesPage"));

import { EventProvider } from "./context/EventContext";
import { ProfileProvider } from "./context/ProfileContext";
import { SocialProvider } from "./context/SocialContext";

import { openedFromResetLink, supabase } from "./lib/supabaseClient";

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
          <div className={`app ${fullHeight ? "app-fill" : ""}`}>
            <ScrollToTop />

            <Navbar user={user} onLogout={onLogout} />

            <Suspense fallback={<PageLoading />}>
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
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>

            {!fullHeight && <Footer />}

            <MobileTabBar />
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
  const [resetting, setResetting] = useState(openedFromResetLink);

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
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setResetting(true);
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
      <span className="brand-mark" aria-hidden="true">S</span>
      <p>Loading Suffrova…</p>
    </div>
  );

  const gated = loading ? (
    loadingScreen
  ) : session && resetting ? (
    <ResetPassword onDone={() => setResetting(false)} onCancel={() => setResetting(false)} />
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

          {!loading && !session && (
            <Route
              path="/rules"
              element={
                <Suspense fallback={loadingScreen}>
                  <RulesPage standalone />
                </Suspense>
              }
            />
          )}

          <Route path="*" element={gated} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
