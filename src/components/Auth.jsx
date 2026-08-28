import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
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

        if (password.length < 6) {
          setError(
            "Password must be at least 6 characters."
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

        const {
          data: usernameEmail,
          error:
            usernameLookupError,
        } = await supabase.rpc(
          "get_email_by_username",
          {
            lookup_username:
              loginValue,
          }
        );


        if (usernameLookupError) {

          console.error(
            usernameLookupError
          );

          throw new Error(
            "Could not find that username. Please try again."
          );

        }


        if (!usernameEmail) {
          setError(
            "Username not found."
          );

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

      <div className="auth-glow auth-glow-one"></div>

      <div className="auth-glow auth-glow-two"></div>


      <div className="auth-container">


        {/* =================================
            BRAND
        ================================= */}

        <div className="auth-brand">

          <div className="auth-logo">
            R
          </div>

          <div>

            <strong>
              REFERRAL
            </strong>

            <span>
              COMPETITION
            </span>

          </div>

        </div>


        {/* =================================
            CARD
        ================================= */}

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
                ? "Sign in using your email or username."
                : "Create an account and start earning referrals."}

            </p>

          </div>


          {/* =================================
              REFERRAL MESSAGE
          ================================= */}

          {!isLogin &&
            referralUsername && (

              <div className="auth-message success">

                🎁 You were invited by{" "}

                <strong>
                  {referralUsername}
                </strong>

                .

              </div>

            )}


          {/* =================================
              FORM
          ================================= */}

          <form
            onSubmit={handleSubmit}
          >

            {/* USERNAME */}

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
                    setUsername(
                      event.target.value
                    )
                  }
                  placeholder="Choose your username"
                  autoComplete="username"
                  maxLength={20}
                  disabled={loading}
                />

              </div>

            )}


            {/* EMAIL */}

            <div className="form-group">

              <label htmlFor="email">

                {isLogin
                  ? "Email or Username"
                  : "Email"}

              </label>

              <input
                id="email"
                type={
                  isLogin
                    ? "text"
                    : "email"
                }
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder={
                  isLogin
                    ? "Email or username"
                    : "you@example.com"
                }
                autoComplete={
                  isLogin
                    ? "username"
                    : "email"
                }
                disabled={loading}
              />

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
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


            {/* ERROR */}

            {error && (

              <div className="auth-message error">
                {error}
              </div>

            )}


            {/* SUCCESS */}

            {message && (

              <div className="auth-message success">
                {message}
              </div>

            )}


            {/* SUBMIT */}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >

              {loading
                ? "Checking..."
                : isLogin
                  ? "Log In"
                  : "Create Account"}

            </button>

          </form>


          {/* =================================
              SWITCH
          ================================= */}

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


        {/* =================================
            FOOTER
        ================================= */}

        <p className="auth-footer">
          Invite friends • Climb the leaderboard • Compete
        </p>

      </div>

    </div>
  );
}

export default Auth;