import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/auth.css";

function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState("login");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [referralUsername, setReferralUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref) {
      const cleanRef = ref.trim();

      if (cleanRef) {
        setReferralUsername(cleanRef);

        // Referral links should open on the signup screen.
        setMode("signup");
      }
    }
  }, []);

  const switchMode = () => {
    setMode(isLogin ? "signup" : "login");

    setUsername("");
    setEmail("");
    setPassword("");

    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!email.trim()) {
        setError("Please enter your email.");
        return;
      }

      if (!password) {
        setError("Please enter your password.");
        return;
      }

      if (!isLogin) {
        const cleanUsername = username.trim();

        if (!cleanUsername) {
          setError("Please choose a username.");
          return;
        }

        if (cleanUsername.length < 3) {
          setError("Username must be at least 3 characters.");
          return;
        }

        if (cleanUsername.length > 20) {
          setError("Username must be 20 characters or less.");
          return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
          setError(
            "Username can only contain letters, numbers, and underscores."
          );
          return;
        }

        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }

        const metadata = {
          username: cleanUsername,
        };

        if (referralUsername) {
          metadata.referral_username = referralUsername;
        }

        const {
          data,
          error: signUpError,
        } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: metadata,
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          onAuthenticated(data.session);
        } else {
          setMessage(
            "Account created! Check your email to confirm your account."
          );
        }

        return;
      }

      const {
        data,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      onAuthenticated(data.session);
    } catch (authError) {
      setError(
        authError?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-glow auth-glow-one"></div>
      <div className="auth-glow auth-glow-two"></div>

      <div className="auth-container">

        <div className="auth-brand">

          <div className="auth-logo">
            R
          </div>

          <div>
            <strong>REFERRAL</strong>
            <span>COMPETITION</span>
          </div>

        </div>

        <div className="auth-card">

          <div className="auth-heading">

            <div className="auth-badge">
              {isLogin
                ? "WELCOME BACK"
                : "JOIN THE COMPETITION"}
            </div>

            <h1>
              {isLogin
                ? "Welcome back."
                : "Create your account."}
            </h1>

            <p>
              {isLogin
                ? "Sign in to continue climbing the leaderboard."
                : "Create an account and start earning referrals."}
            </p>

          </div>

          {!isLogin && referralUsername && (
            <div className="auth-message success">
              🎁 You were invited by{" "}
              <strong>
                {referralUsername}
              </strong>
              .
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {!isLogin && (
              <div className="form-group">

                <label htmlFor="username">
                  Username
                </label>

                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  placeholder="Choose your username"
                  autoComplete="username"
                  maxLength={20}
                  disabled={loading}
                />

              </div>
            )}

            <div className="form-group">

              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />

            </div>

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                autoComplete={
                  isLogin
                    ? "current-password"
                    : "new-password"
                }
                disabled={loading}
              />

            </div>

            {error && (
              <div className="auth-message error">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-message success">
                {message}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Log In"
                  : "Create Account"}
            </button>

          </form>

          <div className="auth-switch">

            <span>
              {isLogin
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>

            <button
              type="button"
              onClick={switchMode}
              disabled={loading}
            >
              {isLogin
                ? "Create one"
                : "Log in"}
            </button>

          </div>

        </div>

        <p className="auth-footer">
          Invite friends • Climb the leaderboard • Compete
        </p>

      </div>

    </div>
  );
}

export default Auth;