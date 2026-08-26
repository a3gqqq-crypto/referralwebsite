import { useEffect, useState } from "react";

import Navbar from "./components/Navbar";
import ReferralCard from "./components/ReferralCard";
import ReferralHistory from "./components/ReferralHistory";
import DonationCard from "./components/DonationCard";
import Leaderboard from "./components/Leaderboard";
import Footer from "./components/Footer";
import Auth from "./components/Auth";

import { supabase } from "./lib/supabaseClient";

import "./styles/theme.css";
import "./styles/global.css";
import "./styles/navbar.css";
import "./styles/referral.css";
import "./styles/referralHistory.css";
import "./styles/donation.css";
import "./styles/leaderboard.css";
import "./styles/footer.css";
import "./styles/auth.css";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthenticated = (newSession) => {
    setSession(newSession);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-container">

          <div className="auth-card">

            <div className="auth-heading">

              <div className="auth-badge">
                REFERRAL COMPETITION
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

  if (!session) {
    return (
      <Auth
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="app">

      <div className="background-glow glow-one"></div>
      <div className="background-glow glow-two"></div>

      <Navbar
        user={session.user}
        onLogout={handleLogout}
      />

      <main>

        <section className="hero">

          <div className="hero-badge">
            🏆 Referral Competition
          </div>

          <h1>
            Invite More.
            <span>
              {" "}
              Climb Higher.
            </span>
          </h1>

          <p>
            Invite your friends and compete for the top
            spot on the referral leaderboard.
          </p>

          <ReferralCard
            user={session.user}
          />

        </section>

        <ReferralHistory
          user={session.user}
        />

        <DonationCard />

        <Leaderboard
          user={session.user}
        />

      </main>

      <Footer />

    </div>
  );
}

export default App;