import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "../Icon";
import { supabase } from "../../lib/supabaseClient";
import { useMyProfile } from "../../context/ProfileContext";
import { levelInfo } from "../../data/levels";

const STEP_UI = {
  avatar: { icon: "user", to: "/profile", go: "Make it" },
  picture: { icon: "image", to: "/profile", go: "Add" },
  bio: { icon: "edit", to: "/profile", go: "Write" },
  checkin: { icon: "flame", to: "/", go: "Check in" },
  friend: { icon: "userPlus", to: "/people", go: "Find people" },
  message: { icon: "chat", to: "/chat", go: "Say hi" },
  invite: { icon: "link", to: "/invites", go: "Get link" },
};

// One-time starter checklist. Disappears once the final bonus is claimed.
function WelcomeCard() {
  const { profile, refresh } = useMyProfile();
  const [steps, setSteps] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_welcome_steps");
    if (error) {
      console.error("Could not load welcome steps:", error);
      setSteps([]);
      return;
    }
    setSteps(data || []);
  }, []);

  useEffect(() => {
    load();

    const onReturn = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onReturn);
    return () => document.removeEventListener("visibilitychange", onReturn);
  }, [load]);

  if (!steps?.length) return null;

  const final = steps.find((step) => step.id === "all");
  if (!final || final.claimed) return null;

  const list = steps.filter((step) => step.id !== "all");
  const ready = list.filter((step) => step.done && !step.claimed);
  const claimedCount = list.filter((step) => step.claimed).length;
  const finalReady = claimedCount === list.length;

  const claim = async (ids) => {
    setBusy(true);
    setNotice(null);

    let total = 0;
    for (const id of ids) {
      const { data, error } = await supabase.rpc("claim_welcome_step", { p_step: id });
      if (error) {
        setNotice({ type: "error", text: error.message });
        break;
      }
      total += data || 0;
    }

    if (total) setNotice({ type: "success", text: `+${total} XP` });
    setBusy(false);
    await Promise.all([load(), refresh()]);
  };

  return (
    <section className="welcome-card card">
      <div className="welcome-head">
        <div>
          <span className="eyebrow">Getting started · {claimedCount}/{list.length}</span>
          <h2>{levelInfo(profile?.xp).level >= 3 ? "Your starter checklist ✨" : "Finish these to unlock the Lounge 🔓"}</h2>
          <p>Each one gives XP. Do them all for a +{final.reward} XP bonus.</p>
        </div>

        {ready.length > 1 && (
          <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => claim(ready.map((s) => s.id))}>
            Claim all · +{ready.reduce((sum, step) => sum + step.reward, 0)} XP
          </button>
        )}
      </div>

      <div className="welcome-bar" aria-hidden="true">
        <span style={{ width: `${Math.round((claimedCount / list.length) * 100)}%` }} />
      </div>

      <ul className="welcome-list">
        {list.map((step) => {
          const ui = STEP_UI[step.id] || { icon: "star", to: "/", go: "Go" };
          const canClaim = step.done && !step.claimed;

          return (
            <li key={step.id} className={`welcome-step ${step.claimed ? "is-claimed" : ""} ${canClaim ? "is-ready" : ""}`}>
              <span className="welcome-icon" aria-hidden="true">
                <Icon name={step.claimed ? "check" : ui.icon} size={16} />
              </span>
              <span className="welcome-title">
                {step.title}
                <small className="mono">+{step.reward} XP</small>
              </span>
              {step.claimed ? (
                <span className="welcome-done">Done</span>
              ) : canClaim ? (
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => claim([step.id])}>
                  Claim
                </button>
              ) : (
                <Link to={ui.to} className="btn btn-sm">
                  {ui.go}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {finalReady && (
        <button type="button" className="btn btn-sun btn-block" disabled={busy} onClick={() => claim(["all"])}>
          <Icon name="sparkles" size={16} />
          Claim your +{final.reward} XP bonus
        </button>
      )}

      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          {notice.text}
        </div>
      )}
    </section>
  );
}

export default WelcomeCard;
