import { Link, useLocation, useNavigate } from "react-router-dom";

import Icon from "./Icon";
import { FramedAvatar } from "./Cosmetics";
import { useCall } from "../context/CallContext";
import { displayNameOf } from "../data/cosmetics";

import "../styles/call.css";

function readMeta(participant) {
  try {
    return JSON.parse(participant.metadata || "{}");
  } catch {
    return {};
  }
}

// Floating bar while you're in a call but looking at another page.
export function CallDock() {
  const call = useCall();
  const { pathname } = useLocation();

  if (call.phase === "joining" && !call.live && pathname !== `/call/${call.roomKey}`) {
    return (
      <div className="call-dock" role="status">
        <span className="call-dock-text">
          <strong>Joining call…</strong>
          <small>Getting you back in</small>
        </span>
      </div>
    );
  }

  if (!call.live || pathname === `/call/${call.roomKey}`) return null;

  const speakers = call.everyone.filter((participant) => participant.isSpeaking).slice(0, 3);
  const shown = speakers.length ? speakers : call.everyone.slice(0, 3);
  const micOn = call.local?.isMicrophoneEnabled;

  return (
    <div className="call-dock" role="region" aria-label="Current call">
      <Link to={`/call/${call.roomKey}`} className="call-dock-main">
        <span className="call-dock-faces">
          {shown.map((participant) => {
            const meta = readMeta(participant);
            return (
              <span key={participant.identity} className={participant.isSpeaking ? "is-speaking" : ""}>
                <FramedAvatar name={participant.name} frame={meta.frame} avatar={meta.avatar} size={26} />
              </span>
            );
          })}
        </span>
        <span className="call-dock-text">
          <strong>{call.roomKey === "lounge" ? "Lounge voice" : "In a call"}</strong>
          <small className={call.needsAudioTap ? "is-warn" : ""}>
            {call.needsAudioTap
              ? "🔇 Tap anywhere to hear"
              : call.reconnecting
                ? "Reconnecting…"
                : `${call.everyone.length} in call · tap to open`}
          </small>
        </span>
      </Link>

      <button
        type="button"
        className={`call-btn is-small ${micOn ? "" : "is-off"}`}
        onClick={call.toggleMic}
        aria-label={micOn ? "Mute" : "Unmute"}
      >
        <Icon name={micOn ? "mic" : "micOff"} size={17} />
      </button>

      <button type="button" className="call-btn is-small is-leave" onClick={() => call.leave()} aria-label="Leave call">
        <Icon name="phoneOff" size={17} />
      </button>
    </div>
  );
}

// Full-screen "X is calling you" with Accept / Decline, on any page.
export function IncomingCall() {
  const call = useCall();
  const navigate = useNavigate();
  const ring = call.incoming;

  if (!ring) return null;

  const name = ring.caller ? displayNameOf(ring.caller) : "A friend";

  return (
    <div className="incoming-call" role="alertdialog" aria-label={`${name} is calling you`}>
      <div className="incoming-card">
        <span className="incoming-ring">
          <FramedAvatar
            name={name}
            frame={ring.caller?.equipped_frame}
            avatar={ring.caller?.avatar}
            size={96}
          />
        </span>

        <strong>{name}</strong>
        <span>is calling you…</span>

        <div className="incoming-actions">
          <button type="button" className="incoming-btn is-decline" onClick={call.dismissIncoming} aria-label="Decline">
            <Icon name="phoneOff" size={24} />
          </button>

          <button
            type="button"
            className="incoming-btn is-accept"
            onClick={() => {
              call.dismissIncoming();
              navigate(ring.link);
              call.join(ring.callId);
            }}
            aria-label="Accept"
          >
            <Icon name="phone" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
