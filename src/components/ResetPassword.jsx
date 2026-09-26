import { useState } from "react";

import { supabase } from "../lib/supabaseClient";

// Shown after someone opens the link from a password reset email. They're
// signed in by the link, but only get into the site once the new password is set.
function ResetPassword({ onDone, onCancel }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password needs at least 8 characters, with letters and numbers.");
      return;
    }

    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(
        /different from the old/i.test(updateError.message)
          ? "That's your old password. Pick a new one."
          : updateError.message || "Couldn't save your password. Try again."
      );
      return;
    }

    onDone();
  };

  return (
    <div className="auth-reset">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span className="brand-word">Vexora</span>
        </div>

        <span className="eyebrow">Password reset</span>
        <h2>Set a new password</h2>
        <p className="auth-sub">Pick something you'll remember this time 😉</p>

        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8+ characters, letters and numbers"
              autoComplete="new-password"
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="confirm-password">Type it again</label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              disabled={saving}
            />
          </div>

          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save password"}
          </button>
        </form>

        <p className="auth-switch">
          Remembered it?{" "}
          <button type="button" onClick={onCancel} disabled={saving}>
            Skip
          </button>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
