import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Auth from "./components/Auth";
import ErrorBoundary from "./components/ErrorBoundary";
import ResetPassword from "./components/ResetPassword";
import { lazyPage } from "./lib/lazyPage";

import { openedFromResetLink, supabase } from "./lib/supabaseClient";

import "./styles/auth.css";

// The logged-in app is its own download. Start it right away when this
// device has a saved login, so members don't wait for it; new visitors get
// the sign-up page without it.
const loadAuthenticatedApp = () => import("./AuthenticatedApp");

try {
  if (Object.keys(localStorage).some((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))) {
    loadAuthenticatedApp().catch(() => {});
  }
} catch {
  // Storage blocked: it loads after the session check instead.
}

const AuthenticatedApp = lazyPage(loadAuthenticatedApp);

// Shareable pages that also open without an account.
const MomentViewPage = lazyPage(() => import("./pages/MomentViewPage"));
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"));
const RulesPage = lazyPage(() => import("./pages/RulesPage"));
const LegalPage = lazyPage(() => import("./pages/LegalPage"));
const LEGAL_DOCS = ["terms", "privacy", "refunds"];

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

  const withLoading = (element) => <Suspense fallback={loadingScreen}>{element}</Suspense>;

  const gated = loading ? (
    loadingScreen
  ) : session && resetting ? (
    <ResetPassword onDone={() => setResetting(false)} onCancel={() => setResetting(false)} />
  ) : session ? (
    withLoading(<AuthenticatedApp session={session} onLogout={handleLogout} />)
  ) : (
    <Auth onAuthenticated={setSession} />
  );

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Moments and profiles are shareable, so they open without an account. */}
          <Route path="/m/:momentId" element={withLoading(<MomentViewPage />)} />

          {!loading && !session && (
            <Route path="/u/:username" element={withLoading(<ProfilePage standalone />)} />
          )}

          {!loading && !session && (
            <Route path="/rules" element={withLoading(<RulesPage standalone />)} />
          )}

          {!loading &&
            !session &&
            LEGAL_DOCS.map((doc) => (
              <Route key={doc} path={`/${doc}`} element={withLoading(<LegalPage doc={doc} standalone />)} />
            ))}

          <Route path="*" element={gated} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
