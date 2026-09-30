import { Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { featuredEvent, useEventList } from "./data/events";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MobileTabBar from "./components/MobileTabBar";

import Home from "./pages/Home";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import PageLoading from "./components/PageLoading";
import { lazyPage } from "./lib/lazyPage";

import { EventProvider } from "./context/EventContext";
import { ProfileProvider } from "./context/ProfileContext";
import { SocialProvider } from "./context/SocialContext";
import { CallProvider } from "./context/CallContext";
import { CallDock, IncomingCall } from "./components/CallDock";

import { supabase } from "./lib/supabaseClient";
import { startPresence, stopPresence } from "./lib/presence";
import { refreshPush } from "./lib/push";

import "./styles/navbar.css";
import "./styles/footer.css";
import "./styles/donation.css";

// The logged-in app. It downloads separately from the sign-up page, so new
// visitors see that page faster. Home loads with it; everything else
// downloads when it's first opened.
const EventsPage = lazyPage(() => import("./pages/EventsPage"));
const EventDetailsPage = lazyPage(() => import("./pages/EventDetails"));
const EventLeaderboardPage = lazyPage(() => import("./pages/EventLeaderboardPage"));
const InvitesPage = lazyPage(() => import("./pages/InvitesPage"));
const DonationsPage = lazyPage(() => import("./pages/DonationsPage"));
const MomentsPage = lazyPage(() => import("./pages/MomentsPage"));
const LockerPage = lazyPage(() => import("./pages/LockerPage"));
const ShopPage = lazyPage(() => import("./pages/ShopPage"));
const PeoplePage = lazyPage(() => import("./pages/PeoplePage"));
const ChatPage = lazyPage(() => import("./pages/ChatPage"));
const AdminPage = lazyPage(() => import("./pages/AdminPage"));
const RulesPage = lazyPage(() => import("./pages/RulesPage"));
const LegalPage = lazyPage(() => import("./pages/LegalPage"));
const CallPage = lazyPage(() => import("./pages/CallPage"));

const LEGAL_DOCS = ["terms", "privacy", "refunds"];

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

// Joins the "who's online" channel and keeps last_seen_at fresh while the tab is open.
function usePresence(userId) {
  useEffect(() => {
    if (!userId) return;

    startPresence(userId);
    refreshPush();

    const touch = () => supabase.rpc("touch_last_seen").then(() => {});
    touch();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") touch();
    }, 2 * 60 * 1000);

    document.addEventListener("visibilitychange", touch);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", touch);
      stopPresence();
    };
  }, [userId]);
}

function AuthenticatedApp({ session, onLogout }) {
  const user = session.user;
  const { pathname } = useLocation();
  const fullHeight = pathname.startsWith("/chat") || pathname.startsWith("/call");

  usePresence(user?.id);

  return (
    <EventProvider user={user}>
      <ProfileProvider user={user}>
        <SocialProvider user={user}>
          <CallProvider user={user}>
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
                <Route path="/chat/g/:groupId" element={<ChatPage />} />
                <Route path="/call/:roomId" element={<CallPage />} />
                <Route path="/donations" element={<DonationsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/rules" element={<RulesPage />} />
                {LEGAL_DOCS.map((doc) => (
                  <Route key={doc} path={`/${doc}`} element={<LegalPage doc={doc} />} />
                ))}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>

              {!fullHeight && <Footer />}

              <CallDock />
              <IncomingCall />

              <MobileTabBar />
            </div>
          </CallProvider>
        </SocialProvider>
      </ProfileProvider>
    </EventProvider>
  );
}

export default AuthenticatedApp;
