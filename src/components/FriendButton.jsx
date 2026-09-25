import { useState } from "react";
import { Link } from "react-router-dom";

import Icon from "./Icon";
import { useSocial } from "../context/SocialContext";

import "../styles/social.css";

function FriendButton({ profile, size = "", showMessage = true }) {
  const social = useSocial();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const relation = social.relationWith(profile?.id);
  const btn = `btn ${size === "sm" ? "btn-sm" : ""}`;

  if (!profile?.id || relation === "self") return null;

  const run = async (action) => {
    setBusy(true);
    setError("");

    const result = await action();

    setBusy(false);

    if (!result.ok) setError(result.error);
  };

  let content;

  if (relation === "blocked") {
    content = (
      <button type="button" className={btn} disabled={busy} onClick={() => run(() => social.unblock(profile.id))}>
        Unblock
      </button>
    );
  } else if (relation === "friends") {
    content = (
      <>
        {showMessage && (
          <Link to={`/chat/${encodeURIComponent(profile.username)}`} className={`${btn} btn-primary`}>
            <Icon name="chat" size={16} />
            Message
          </Link>
        )}
        <span className={`${btn} friend-state`} aria-label="You're friends">
          <Icon name="check" size={15} />
          Friends
        </span>
      </>
    );
  } else if (relation === "outgoing") {
    content = (
      <button
        type="button"
        className={btn}
        disabled={busy}
        onClick={() => run(() => social.removeFriend(profile.id))}
        title="Cancel request"
      >
        <Icon name="clock" size={15} />
        Requested
      </button>
    );
  } else if (relation === "incoming") {
    content = (
      <>
        <button
          type="button"
          className={`${btn} btn-primary`}
          disabled={busy}
          onClick={() => run(() => social.respond(profile.id, true))}
        >
          <Icon name="check" size={15} />
          Accept
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => run(() => social.respond(profile.id, false))}
        >
          Decline
        </button>
      </>
    );
  } else {
    content = (
      <button
        type="button"
        className={`${btn} btn-sun`}
        disabled={busy}
        onClick={() => run(() => social.sendRequest(profile.id))}
      >
        <Icon name="users" size={15} />
        Add friend
      </button>
    );
  }

  return (
    <span className="friend-button">
      {content}
      {error && <span className="friend-button-error">{error}</span>}
    </span>
  );
}

export default FriendButton;
