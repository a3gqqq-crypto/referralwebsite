import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "./Icon";
import { useMyProfile } from "../context/ProfileContext";
import { formatUntilNextDay } from "../lib/streakDay";

const QUEST_UI = {
  invite: { icon: "link", to: "/invites", go: "Get link" },
  lounge: { icon: "chat", to: "/chat", go: "Open Lounge" },
  moment: { icon: "heart", to: "/moments", go: "Make one" },
  friend: { icon: "users", to: "/people", go: "Find people" },
  dm: { icon: "chat", to: "/chat", go: "Open chat" },
  photo: { icon: "image", to: "/chat", go: "Open chat" },
};

const SWEEP_BONUS = 40;

function QuestsCard({ now }) {
  const { refresh } = useMyProfile();
  const [quests, setQuests] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_daily_quests");

    if (error) {
      console.error("Could not load quests:", error);
      setQuests([]);
      return;
    }

    setQuests(data || []);
  }, []);

  useEffect(() => {
    load();

    // Progress changes while you're elsewhere on the site; refresh on return.
    const onReturn = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [load]);

  const claim = async (quest) => {
    setBusy(quest.id);
    setNotice(null);

    const { data, error } = await supabase.rpc("claim_quest", { p_quest: quest.id });

    setBusy(null);

    if (error) {
      setNotice({ type: "error", text: error.message });
      load();
      return;
    }

    const total = (data?.awarded || 0) + (data?.sweep || 0);
    setNotice({
      type: "success",
      text: data?.sweep ? `+${total} XP. All done for today, bonus included. 🔥` : `+${total} XP`,
    });

    await Promise.all([load(), refresh()]);
  };

  if (!quests?.length) return null;

  const done = quests.filter((quest) => quest.claimed).length;
  const swept = quests[0]?.sweep_claimed;

  return (
    <div className="quests card">
      <div className="quests-head">
        <div>
          <span className="eyebrow">Daily quests</span>
          <h3>
            {done}/{quests.length} done today
          </h3>
        </div>

        <span className="quests-reset mono" title="Quests reset at 00:00 UTC">
          <Icon name="clock" size={14} />
          {formatUntilNextDay(now)}
        </span>
      </div>

      <ul className="quests-list">
        {quests.map((quest) => {
          const ui = QUEST_UI[quest.id] || { icon: "star", to: "/", go: "Go" };
          const ready = !quest.claimed && quest.progress >= quest.target;

          return (
            <li key={quest.id} className={`quest ${quest.claimed ? "is-claimed" : ""} ${ready ? "is-ready" : ""}`}>
              <span className="quest-icon" aria-hidden="true">
                <Icon name={quest.claimed ? "check" : ui.icon} size={17} strokeWidth={quest.claimed ? 3 : 2.2} />
              </span>

              <div className="quest-main">
                <div className="quest-title">
                  <strong>{quest.title}</strong>
                  <span className="quest-reward mono">+{quest.reward} XP</span>
                </div>

                <div className="quest-bar" aria-label={`${quest.progress} of ${quest.target}`}>
                  <span style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }} />
                </div>
              </div>

              {quest.claimed ? (
                <span className="quest-done">Done</span>
              ) : ready ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => claim(quest)}
                  disabled={busy === quest.id}
                >
                  {busy === quest.id ? "…" : "Claim"}
                </button>
              ) : (
                <Link to={ui.to} className="btn btn-sm">
                  {quest.target > 1 ? `${quest.progress}/${quest.target}` : ui.go}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className={`quests-bonus ${swept ? "is-done" : ""}`}>
        <Icon name={swept ? "check" : "sparkles"} size={14} />
        {swept ? `All 3 done. +${SWEEP_BONUS} XP bonus claimed.` : `Finish all 3 for a +${SWEEP_BONUS} XP bonus.`}
      </p>

      {notice && (
        <div className={`notice notice-${notice.type} quests-notice`} role="status">
          {notice.text}
        </div>
      )}
    </div>
  );
}

export default QuestsCard;
