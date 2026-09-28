import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConnectionQuality, Track } from "livekit-client";

import Icon from "../components/Icon";
import { EmoteAvatar, FramedAvatar } from "../components/Cosmetics";
import { useMyProfile } from "../context/ProfileContext";
import { EMOTES, canUseEmote, parseDicebear } from "../data/avatarParts";
import { fullBodySrc } from "../lib/avatarRender";
import { supabase } from "../lib/supabaseClient";
import { REACTIONS, useCall } from "../context/CallContext";
import { useSocial } from "../context/SocialContext";
import { displayNameOf, equippedFrom } from "../data/cosmetics";

import "../styles/call.css";

function readMeta(participant) {
  try {
    return JSON.parse(participant.metadata || "{}");
  } catch {
    return {};
  }
}

// Plays a video track (camera or screen) in a <video>.
function TrackVideo({ track, mirrored = false, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!track || !element) return;

    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);

  return <video ref={ref} className={`call-video ${mirrored ? "is-mirrored" : ""} ${className}`} autoPlay playsInline muted />;
}

// Free Fire-style emote wheel: 8 slots around a circle, more on the next page.
const WHEEL_SLOTS = 8;

function EmoteWheel({ owned, onPick, onClose }) {
  const usable = EMOTES.filter((emote) => canUseEmote(emote, owned));
  const locked = EMOTES.length - usable.length;
  const pages = Math.max(1, Math.ceil(usable.length / WHEEL_SLOTS));
  const [page, setPage] = useState(0);
  const shown = usable.slice(page * WHEEL_SLOTS, page * WHEEL_SLOTS + WHEEL_SLOTS);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="emote-wheel-backdrop" onClick={onClose}>
      <div className="emote-wheel" role="dialog" aria-label="Emotes" onClick={(event) => event.stopPropagation()}>
        {shown.map((emote, index) => {
          const angle = ((-90 + index * (360 / WHEEL_SLOTS)) * Math.PI) / 180;
          return (
            <button
              key={emote.id}
              type="button"
              className="emote-wheel-slot"
              style={{ left: `${50 + 37 * Math.cos(angle)}%`, top: `${50 + 37 * Math.sin(angle)}%` }}
              onClick={() => onPick(emote)}
            >
              <span className="emote-wheel-emoji" aria-hidden="true">{emote.emoji}</span>
              <span className="emote-wheel-name">{emote.name}</span>
            </button>
          );
        })}

        <div className="emote-wheel-center">
          {pages > 1 && (
            <button type="button" onClick={() => setPage((page + 1) % pages)} aria-label="More emotes">
              <Icon name="arrowRight" size={18} />
              <small>
                {page + 1}/{pages}
              </small>
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close emotes">
            <Icon name="close" size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {locked > 0 && (
        <Link to="/shop?type=emote" className="emote-wheel-more" onClick={(event) => event.stopPropagation()}>
          <Icon name="lock" size={13} /> {locked} more emotes in the shop
        </Link>
      )}
    </div>
  );
}

// One person: camera if on, otherwise their avatar. Tap for options.
function Tile({ participant, isLocal, canModerate, mutedForMe, onToggleMute, onKick, emoting }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = readMeta(participant);
  const name = participant.name || meta.username || "Someone";

  const camera = participant.getTrackPublication(Track.Source.Camera);
  const cameraOn = Boolean(camera?.track) && !camera.isMuted;

  // Is this person's sound actually reaching you?
  const mic = participant.getTrackPublication(Track.Source.Microphone);
  const audioIssue = isLocal
    ? null
    : !mic
      ? "No mic"
      : !mic.isMuted && !mic.isSubscribed
        ? "🔈 Connecting audio…"
        : null;
  const weak = [ConnectionQuality.Poor, ConnectionQuality.Lost].includes(participant.connectionQuality);

  // Full-body avatars stand in the tile and move their mouth while talking.
  const bodyAvatar = meta.body || (parseDicebear(meta.avatar)?.s === "fb" ? meta.avatar : null);
  const body = !cameraOn && Boolean(bodyAvatar);
  const talking = participant.isSpeaking && !mutedForMe && participant.isMicrophoneEnabled;

  return (
    <li
      className={`call-tile ${participant.isSpeaking && !mutedForMe ? "is-speaking" : ""} ${cameraOn ? "has-video" : ""} ${body ? "has-body" : ""}`}
      onClick={() => !isLocal && setMenuOpen((open) => !open)}
    >
      {cameraOn ? (
        <TrackVideo track={camera.track} mirrored={isLocal} />
      ) : emoting ? (
        <span className="call-figure">
          <EmoteAvatar
            key={emoting.id}
            emote={emoting.emote}
            name={name}
            frame={meta.frame}
            avatar={meta.avatar}
            body={bodyAvatar}
            size={76}
            loop={false}
            full={body}
          />
        </span>
      ) : body ? (
        <span className="call-figure">
          <img
            className="call-body"
            src={fullBodySrc(bodyAvatar, talking ? "talk" : "live")}
            alt=""
            draggable="false"
          />
        </span>
      ) : (
        <FramedAvatar name={name} frame={meta.frame} avatar={meta.avatar} size={76} />
      )}

      {cameraOn && emoting && (
        <span key={emoting.id} className="call-tile-emote" aria-hidden="true">
          {emoting.emote.emoji}
        </span>
      )}

      <span className="call-tile-name">
        {!participant.isMicrophoneEnabled && <Icon name="micOff" size={13} />}
        {mutedForMe && <span title="Muted for you">🔇</span>}
        {name}
        {isLocal && <small> (you)</small>}
      </span>

      {audioIssue && <span className="call-tile-audio">{audioIssue}</span>}

      {weak && (
        <span className="call-tile-weak" title="Weak connection">
          📶 weak
        </span>
      )}

      {menuOpen && !isLocal && (
        <div className="call-tile-menu" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => { onToggleMute(participant); setMenuOpen(false); }}>
            {mutedForMe ? "🔊 Unmute for me" : "🔇 Mute for me"}
          </button>
          {meta.username && (
            <Link to={`/u/${encodeURIComponent(meta.username)}`}>👤 View profile</Link>
          )}
          {canModerate && (
            <button
              type="button"
              className="is-danger"
              onClick={() => {
                setMenuOpen(false);
                if (window.confirm(`Remove ${name} from the call?`)) onKick(participant);
              }}
            >
              ⛔ Remove from call
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function CallPage() {
  const { roomId } = useParams();
  const isLounge = roomId === "lounge";
  const navigate = useNavigate();
  const social = useSocial();
  const call = useCall();
  const { owned } = useMyProfile();
  const [wheelOpen, setWheelOpen] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [members, setMembers] = useState(() => new Set());
  const [inviteNotice, setInviteNotice] = useState("");

  const here = call.roomKey === roomId;
  const inThisCall = here && call.live;
  const inOtherCall = call.live && !here;
  const phase = here ? call.phase : "idle";

  // Who's already in this private call (so the invite list can skip them).
  const loadMembers = () => {
    if (isLounge) return;
    supabase
      .from("call_members")
      .select("user_id")
      .eq("call_id", roomId)
      .then(({ data }) => setMembers(new Set((data || []).map((row) => row.user_id))));
  };

  useEffect(loadMembers, [isLounge, roomId]);

  const invite = async (friend) => {
    setInviteNotice("");
    const { error } = await supabase.rpc("invite_to_call", { p_call: roomId, p_user: friend.otherId });

    if (error) {
      setInviteNotice(error.message);
      return;
    }

    setInviteNotice(`Calling ${displayNameOf(friend.profile)}…`);
    loadMembers();
  };

  const invitable = social.friends.filter((friend) => friend.profile && !members.has(friend.otherId));
  const title = isLounge ? "Lounge voice" : "Group call";
  const local = call.local;

  // Anyone sharing their screen gets the big stage.
  const sharer = inThisCall
    ? call.everyone.find((participant) => participant.getTrackPublication(Track.Source.ScreenShare)?.track)
    : null;
  const screenTrack = sharer?.getTrackPublication(Track.Source.ScreenShare)?.track;

  return (
    <main className="call-page">
      <header className="call-head">
        <Link to="/chat" className="call-back">
          <Icon name="arrowLeft" size={16} />
          Chat
        </Link>
        <h1>
          {isLounge ? "🎧" : "📞"} {title}
        </h1>
        {inThisCall && <span className="call-count">{call.everyone.length} in call</span>}
      </header>

      {!inThisCall ? (
        <section className="call-lobby card">
          {phase === "soon" ? (
            <>
              <span className="call-lobby-emoji" aria-hidden="true">🎧</span>
              <h2>Calls are coming soon</h2>
              <p>We're setting up voice. Check back shortly.</p>
            </>
          ) : phase === "ended" ? (
            <>
              <span className="call-lobby-emoji" aria-hidden="true">👋</span>
              <h2>{call.message || "Call ended"}</h2>
              <div className="call-lobby-actions">
                {(isLounge || /disconnected/i.test(call.message)) && (
                  <button type="button" className="btn btn-primary" onClick={() => call.join(roomId)}>
                    Rejoin
                  </button>
                )}
                <button type="button" className="btn" onClick={() => navigate("/chat")}>
                  Back to chat
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="call-lobby-emoji" aria-hidden="true">{isLounge ? "🎧" : "📞"}</span>
              <h2>{isLounge ? "Hang out in Lounge voice" : "Join the call"}</h2>
              <p>
                {isLounge
                  ? "Anyone on Suffrova can hop in. Be kind. Staff can remove people."
                  : "Only friends who were invited can join."}{" "}
                Your mic turns on when you join. The call keeps going while you look around the site.
              </p>

              {inOtherCall && <div className="notice notice-gold">You're in another call. Joining this one leaves it.</div>}
              {here && phase === "error" && call.message && <div className="notice notice-error">{call.message}</div>}

              <button type="button" className="btn btn-primary call-join" onClick={() => call.join(roomId)} disabled={here && phase === "joining"}>
                <Icon name="phone" size={17} />
                {here && phase === "joining" ? "Joining…" : "Join call"}
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          {call.reconnecting && <div className="notice notice-gold call-message">📶 Connection dropped. Reconnecting…</div>}

          {call.needsAudioTap && (
            <button type="button" className="notice notice-gold call-audio-tap" onClick={call.startAudio}>
              🔊 Tap to hear everyone
            </button>
          )}

          {call.message && <div className="notice notice-error call-message">{call.message}</div>}

          <p className={`call-mic-status ${!local?.isMicrophoneEnabled ? "is-off" : local?.isSpeaking ? "is-live" : ""}`}>
            {!local?.isMicrophoneEnabled
              ? "🔇 You're muted. Tap the mic button to talk."
              : local?.isSpeaking
                ? "🎙️ They can hear you"
                : call.everyone.length > 1
                  ? "🎙️ Mic on. Say something: your tile glows green when they can hear you."
                  : "🎙️ Mic on. Waiting for others to join…"}
          </p>

          {screenTrack && (
            <div className="call-stage">
              <TrackVideo track={screenTrack} className="is-screen" />
              <span className="call-tile-name">🖥️ {sharer.name || "Someone"} is sharing their screen</span>
            </div>
          )}

          <ul className={`call-grid count-${Math.min(call.everyone.length, 6)} ${screenTrack ? "is-strip" : ""}`}>
            {call.everyone.map((participant) => (
              <Tile
                key={participant.identity}
                participant={participant}
                isLocal={participant === local}
                canModerate={call.info?.canModerate}
                mutedForMe={call.mutedForMe.has(participant.identity)}
                onToggleMute={call.toggleMuteForMe}
                onKick={call.kick}
                emoting={call.emotes[participant.identity]}
              />
            ))}
          </ul>

          <div className="call-reactions" aria-hidden="true">
            {call.reactions.map((item) => (
              <span key={item.id} className="call-float" style={{ left: `${item.left}%` }}>
                {item.emoji}
                {item.name && <small>{item.name}</small>}
              </span>
            ))}
          </div>

          {inviteOpen && !isLounge && (
            <section className="call-invite card">
              <div className="call-invite-head">
                <strong>Add friends to the call</strong>
                <button type="button" className="checkout-close" onClick={() => setInviteOpen(false)} aria-label="Close">
                  <Icon name="close" size={14} strokeWidth={2.6} />
                </button>
              </div>

              {inviteNotice && <p className="call-invite-notice">{inviteNotice}</p>}

              {invitable.length === 0 ? (
                <p className="muted">All your friends are already in, or you haven't added any yet.</p>
              ) : (
                <ul>
                  {invitable.map((friend) => (
                    <li key={friend.otherId}>
                      <FramedAvatar
                        userId={friend.otherId}
                        name={displayNameOf(friend.profile)}
                        frame={equippedFrom(friend.profile).frame}
                        avatar={friend.profile.avatar}
                        size={34}
                      />
                      <span className="call-invite-name">{displayNameOf(friend.profile)}</span>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => invite(friend)}>
                        Call
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {wheelOpen && (
            <EmoteWheel
              owned={owned}
              onClose={() => setWheelOpen(false)}
              onPick={(emote) => {
                call.sendEmote(emote);
                setWheelOpen(false);
              }}
            />
          )}

          <div className="call-bar">
            <div className="call-bar-reacts">
              {REACTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => call.react(emoji)} aria-label={`React ${emoji}`}>
                  {emoji}
                </button>
              ))}

              <span className="call-bar-divider" aria-hidden="true" />

              <button
                type="button"
                className="call-emote-open"
                onClick={() => setWheelOpen(true)}
                aria-label="Emotes"
                title="Emotes"
              >
                <span aria-hidden="true">😎</span>
                <small>Emotes</small>
              </button>
            </div>

            <div className="call-bar-main">
              <button
                type="button"
                className={`call-btn ${local?.isMicrophoneEnabled ? "" : "is-off"}`}
                onClick={call.toggleMic}
                aria-label={local?.isMicrophoneEnabled ? "Mute" : "Unmute"}
                title={local?.isMicrophoneEnabled ? "Mute" : "Unmute"}
              >
                <Icon name={local?.isMicrophoneEnabled ? "mic" : "micOff"} size={20} />
              </button>

              <button
                type="button"
                className={`call-btn ${local?.isCameraEnabled ? "is-on" : ""}`}
                onClick={call.toggleCamera}
                aria-label={local?.isCameraEnabled ? "Turn camera off" : "Turn camera on"}
                title="Camera"
              >
                <Icon name="video" size={20} />
              </button>

              {call.canScreenShare && (
                <button
                  type="button"
                  className={`call-btn ${local?.isScreenShareEnabled ? "is-on" : ""}`}
                  onClick={call.toggleScreen}
                  aria-label={local?.isScreenShareEnabled ? "Stop sharing" : "Share your screen"}
                  title="Share screen"
                >
                  <Icon name="screen" size={20} />
                </button>
              )}

              {!isLounge && (
                <button type="button" className="call-btn" onClick={() => setInviteOpen((open) => !open)} aria-label="Add friends" title="Add friends">
                  <Icon name="userPlus" size={20} />
                </button>
              )}

              <button type="button" className="call-btn is-leave" onClick={() => call.leave()} aria-label="Leave call" title="Leave">
                <Icon name="phoneOff" size={20} />
              </button>
            </div>

            {call.info?.isHost && !isLounge && (
              <button
                type="button"
                className="btn btn-sm call-end-all"
                onClick={() => window.confirm("End the call for everyone?") && call.endForEveryone()}
              >
                End for everyone
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}

export default CallPage;
