import { useState } from "react";

import Icon from "../Icon";
import { supabase } from "../../lib/supabaseClient";
import { useMyProfile } from "../../context/ProfileContext";

const INSTAGRAM_URL = "https://www.instagram.com/suffrova";

// One-time reward for following on Instagram. Instagram can't tell us who
// follows, so after they open it we trust the "I followed" tap.
function InstaCard() {
  const { owned, loading, refresh } = useMyProfile();
  const [opened, setOpened] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  if (loading || (owned.has("badge-insta") && !done)) return null;

  const claim = async () => {
    setClaiming(true);
    setError("");

    const { data, error: claimError } = await supabase.rpc("claim_instagram_reward");

    setClaiming(false);

    if (claimError) {
      console.error(claimError);
      setError("Couldn't claim it. Try again.");
      return;
    }

    setDone(data);
    refresh();
  };

  if (done) {
    return (
      <section className="insta-card card is-done" role="status">
        <span className="insta-card-logo" aria-hidden="true">
          <Icon name="check" size={22} strokeWidth={2.6} />
        </span>
        <div className="insta-card-text">
          <strong>Thanks for following! 🎉</strong>
          <span>
            Insta Fam badge unlocked{done.xp ? ` · +${done.xp} XP` : ""}. Show it off from your profile.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="insta-card card">
      <span className="insta-card-logo" aria-hidden="true">
        <Icon name="instagram" size={22} />
      </span>

      <div className="insta-card-text">
        <strong>Follow @suffrova on Instagram</strong>
        <span>Get the Insta Fam badge and +100 XP. Event news drops there first.</span>
        {error && <span className="insta-card-error">{error}</span>}
      </div>

      <div className="insta-card-actions">
        <a
          className={`btn btn-sm ${opened ? "" : "btn-primary"}`}
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => setOpened(true)}
        >
          <Icon name="instagram" size={15} />
          Follow
        </a>

        {opened && (
          <button type="button" className="btn btn-sm btn-primary" onClick={claim} disabled={claiming}>
            <Icon name="check" size={15} strokeWidth={2.6} />
            {claiming ? "Claiming…" : "I followed, claim"}
          </button>
        )}
      </div>
    </section>
  );
}

export default InstaCard;
