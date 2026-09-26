import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useEventList } from "../data/events";
import AuthLiveBoard from "./AuthLiveBoard";
import "../styles/auth.css";


/* =========================================
   FREE USERNAME MODERATION
========================================= */

/*
 * We normalize usernames before checking them.
 *
 * Examples:
 * p0rn       -> porn
 * p3do       -> pedo
 * child-seII -> childseii
 * child-sex  -> childsex
 *
 * This is only a local safety filter.
 * It does not call any paid API.
 */
function normalizeUsername(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/\+/g, "t")
    .replace(/[^a-z0-9]/g, "");
}


/*
 * Clearly unsafe username terms.
 *
 * We intentionally do NOT use tiny strings such
 * as "cp" because that can create false positives
 * for normal usernames.
 */
const BLOCKED_USERNAME_TERMS = [
  /* Sexual / explicit */
  "porn",
  "porno",
  "pornhub",
  "hentai",
  "sexual",
  "sexually",
  "nude",
  "nudes",
  "nsfw",
  "xxx",
  "fetish",
  "rape",
  "molest",
  "molester",
  "incest",

  /* Child sexual exploitation / abuse */
  "childporn",
  "childsex",
  "childsexual",
  "childabuse",
  "childseller",
  "childselling",
  "kidssex",
  "kidseller",
  "kidselling",
  "minorsex",
  "minorseller",
  "minorselling",
  "underage",
  "pedophile",
  "pedophilia",
  "pedofil",
  "pedo",
  "lolicon",
  "shotacon",
  "shota",

  /* Sexual services */
  "sexseller",
  "sexsell",
  "prostitute",
  "prostitution",

  /* Common profanity */
  "fuck",
  "fucking",
  "fuk",
  "fck",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "pussy",
  "cock",
  "cunt",
  "whore",
  "slut",

  /* Hate / abusive slurs */
  "nigger",
  "nigga",
  "faggot",
  "retard",
];


/*
 * Extra patterns for stretched/obfuscated
 * unsafe words.
 */
const BLOCKED_USERNAME_PATTERNS = [
  /p+o+r+n+/,
  /p+e+d+o+/,
  /c+h+i+l+d+s+e+x+/,
  /c+h+i+l+d+p+o+r+n+/,
  /c+h+i+l+d+s+e+l+l+/,
  /k+i+d+s+e+l+l+/,
  /m+i+n+o+r+s+e+x+/,
  /m+i+n+o+r+s+e+l+l+/,
  /u+n+d+e+r+a+g+e+/,
  /r+a+p+e+/,
  /m+o+l+e+s+t+/,
];


/*
 * Returns true if username should be blocked.
 */
function isBlockedUsername(username) {
  const normalized =
    normalizeUsername(username);

  if (!normalized) {
    return false;
  }


  /* Exact normalized terms */

  const blockedByTerm =
    BLOCKED_USERNAME_TERMS.some(
      (term) =>
        normalized.includes(
          normalizeUsername(term)
        )
    );

  if (blockedByTerm) {
    return true;
  }


  /* Obfuscated / stretched patterns */

  return BLOCKED_USERNAME_PATTERNS.some(
    (pattern) =>
      pattern.test(normalized)
  );
}


function Auth({ onAuthenticated }) {
  const [mode, setMode] =
    useState("login");

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [referralUsername, setReferralUsername] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  const isLogin =
    mode === "login";


  /* =========================================
     LIVE EVENT (FOR REFERRAL BANNER)
  ========================================= */

  const { events } = useEventList();

  const liveEvent = events.find((event) => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    return event.active && now >= start && now <= end;
  }) || null;


  /* =========================================
     REFERRAL URL
  ========================================= */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const ref =
      params.get("ref");

    if (ref) {
      const cleanRef =
        ref.trim();

      if (cleanRef) {
        setReferralUsername(
          cleanRef
        );

        setMode("signup");
      }
    }
  }, []);


  /* =========================================
     SWITCH LOGIN / SIGNUP
  ========================================= */

  const switchMode = () => {
    setMode(
      isLogin
        ? "signup"
        : "login"
    );

    setUsername("");
    setEmail("");
    setPassword("");

    setMessage("");
    setError("");
  };


  /* =========================================
     SUBMIT
  ========================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {

      /* =====================================
         BASIC FIELDS
      ===================================== */

      if (!email.trim()) {
        setError(
          isLogin
            ? "Please enter your email or username."
            : "Please enter your email."
        );

        return;
      }

      if (!password) {
        setError(
          "Please enter your password."
        );

        return;
      }


      /* =====================================
         SIGN UP
      ===================================== */

      if (!isLogin) {

        const cleanUsername =
          username.trim();


        /* =================================
           REQUIRED
        ================================= */

        if (!cleanUsername) {
          setError(
            "Please choose a username."
          );

          return;
        }


        /* =================================
           LENGTH
        ================================= */

        if (
          cleanUsername.length < 3
        ) {
          setError(
            "Username must be at least 3 characters."
          );

          return;
        }

        if (
          cleanUsername.length > 20
        ) {
          setError(
            "Username must be 20 characters or less."
          );

          return;
        }


        /* =================================
           ALLOWED CHARACTERS
        ================================= */

        if (
          !/^[a-zA-Z0-9_]+$/.test(
            cleanUsername
          )
        ) {
          setError(
            "Username can only contain letters, numbers, and underscores."
          );

          return;
        }


        /* =================================
           FREE MODERATION
        ================================= */

        if (
          isBlockedUsername(
            cleanUsername
          )
        ) {
          setError(
            "That username isn't allowed. Please choose another username."
          );

          return;
        }


        /* =================================
           PASSWORD
        ================================= */

        // Matches the Supabase Auth setting: 8+ characters with letters and digits.
        if (
          password.length < 8 ||
          !/[a-zA-Z]/.test(password) ||
          !/[0-9]/.test(password)
        ) {
          setError(
            "Password needs at least 8 characters, with letters and numbers."
          );

          return;
        }


        /* =================================
           USERNAME AVAILABILITY
        ================================= */

        const {
          data: existingUsername,
          error:
            usernameCheckError,
        } = await supabase
          .from("profiles")
          .select("id")
          .ilike(
            "username",
            cleanUsername
          )
          .maybeSingle();


        if (usernameCheckError) {
          console.error(
            usernameCheckError
          );

          throw new Error(
            "Could not check username availability."
          );
        }


        if (existingUsername) {
          setError(
            "That username is already taken."
          );

          return;
        }


        /* =================================
           METADATA
        ================================= */

        const metadata = {
          username:
            cleanUsername,
        };


        if (referralUsername) {
          metadata.referral_username =
            referralUsername;
        }


        /* =================================
           CREATE ACCOUNT
        ================================= */

        const {
          data,
          error: signUpError,
        } = await supabase.auth.signUp({
          email:
            email.trim(),

          password,

          options: {
            data: metadata,
          },
        });


        if (signUpError) {
          throw signUpError;
        }


        /* =================================
           SESSION
        ================================= */

        if (data.session) {

          onAuthenticated(
            data.session
          );

        } else {

          setMessage(
            "Account created! Check your email to confirm your account."
          );

        }

        return;
      }


      /* =====================================
         LOGIN
      ===================================== */

      const loginValue =
        email.trim();

      let loginEmail =
        loginValue;


      /*
       * Username login.
       */

      if (
        !loginValue.includes("@")
      ) {

        // Returns the email only when the password is right, so emails never leak.
        const {
          data: usernameEmail,
          error: usernameLookupError,
        } = await supabase.rpc("email_for_login", {
          p_username: loginValue,
          p_password: password,
        });

        if (usernameLookupError) {
          console.error(usernameLookupError);

          throw new Error(
            usernameLookupError.message ||
              "Could not log in. Please try again."
          );
        }

        if (!usernameEmail) {
          setError("Wrong username or password.");

          return;
        }


        loginEmail =
          usernameEmail;
      }


      /* =================================
         SIGN IN
      ================================= */

      const {
        data,
        error: signInError,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              loginEmail,

            password,
          });


      if (signInError) {
        throw signInError;
      }


      onAuthenticated(
        data.session
      );

    } catch (authError) {

      console.error(
        "Authentication error:",
        authError
      );

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

      <aside className="auth-poster">

        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span className="brand-word">Vexora</span>
        </div>

        <div className="auth-poster-body">
          <span className="eyebrow">Invite · Climb · Win</span>

          <h1>
            Bring your friends.{" "}
            <span className="mark">Win real prizes.</span>
          </h1>

          <ol className="auth-steps">
            <li>
              <b>1</b>
              Grab your personal invite link
            </li>
            <li>
              <b>2</b>
              Every friend who joins moves you up the board
            </li>
            <li>
              <b>3</b>
              Finish top 3 when the event ends to win
            </li>
          </ol>
        </div>

        <AuthLiveBoard race={liveEvent?.type === "referral" ? liveEvent : null} />

        <div className="auth-poster-foot">
          {liveEvent ? (
            <>
              <span className="chip chip-live">
                <span className="live-dot" />
                Live now
              </span>
              <span>
                <strong>{liveEvent.title}</strong> ·{" "}
                {liveEvent.prize} prize pool
              </span>
            </>
          ) : (
            <span>
              The next competition drops soon. Get your
              link ready.
            </span>
          )}
        </div>

      </aside>


      <main className="auth-main">

        <div className="auth-card">

          <span className="eyebrow">
            {isLogin ? "Welcome back" : "Join Vexora"}
          </span>

          <h2>
            {isLogin ? "Log in" : "Create your account"}
          </h2>

          <p className="auth-sub">
            {isLogin
              ? "Use your email or username."
              : "Takes 20 seconds. Your invite link is ready the moment you're in."}
          </p>


          {!isLogin && referralUsername && (
            <div className="auth-invite">
              <span
                className="auth-invite-emoji"
                aria-hidden="true"
              >
                🎁
              </span>

              <div>
                <strong>
                  {referralUsername} invited you
                </strong>

                <span>
                  {liveEvent
                    ? `Sign up to join ${liveEvent.title} — ${liveEvent.prize} in prizes.`
                    : "Sign up and they get credit for bringing you in."}
                </span>
              </div>
            </div>
          )}


          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            {!isLogin && (
              <div className="field">
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
                  placeholder="Letters, numbers, underscores"
                  autoComplete="username"
                  maxLength={20}
                  disabled={loading}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">
                {isLogin ? "Email or username" : "Email"}
              </label>

              <input
                id="email"
                type={isLogin ? "text" : "email"}
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder={
                  isLogin
                    ? "you@example.com or username"
                    : "you@example.com"
                }
                autoComplete={isLogin ? "username" : "email"}
                disabled={loading}
              />
            </div>

            <div className="field">
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
                placeholder={
                  isLogin ? "Your password" : "8+ characters, letters and numbers"
                }
                autoComplete={
                  isLogin ? "current-password" : "new-password"
                }
                disabled={loading}
              />
            </div>

            {error && (
              <div className="notice notice-error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="notice notice-success" role="status">
                {message}
              </div>
            )}

            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Checking…"
                : isLogin
                  ? "Log in"
                  : "Create account"}
            </button>

          </form>


          <p className="auth-switch">
            {isLogin
              ? "New here?"
              : "Already have an account?"}{" "}

            <button
              type="button"
              onClick={switchMode}
              disabled={loading}
            >
              {isLogin ? "Create an account" : "Log in"}
            </button>
          </p>

          <p className="auth-rules">
            <Link to="/rules">How it works · Rules & FAQ</Link>
          </p>

        </div>

      </main>

    </div>
  );
}

export default Auth;