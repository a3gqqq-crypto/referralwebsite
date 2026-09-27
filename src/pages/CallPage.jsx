import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DisconnectReason, Room, RoomEvent, Track } from "livekit-client";

import Icon from "../components/Icon";
import { FramedAvatar } from "../components/Cosmetics";
import { supabase } from "../lib/supabaseClient";
import { setPresenceCall } from "../lib/presence";
import { useSocial } from "../context/SocialContext";
import { displayNameOf, equippedFrom } from "../data/cosmetics";

import "../styles/call.css";

const REACTIONS = ["😂", "🔥", "👏", "❤️", "😮", "🎉"];

function readMeta(participant) {
  try {
    return JSON.parse(participant.metadata || "{}");
  } catch {
    return {};
  }
}

// One person in the call: their camera if it's on, otherwise their avatar.
function Tile({ participant, isLocal, canModerate, onKick }) {
  const videoRef = useRef(null);
  const meta = readMeta(participant);
  const name = participant.name || meta.username || "Someone";

  const cameraTrack = participant.getTrackPublication(Track.Source.Camera)?.track;
  const cameraOn = Boolean(cameraTrack) && !participant.getTrackPublication(Track.Source.Camera)?.isMuted;

  useEffect(() => {
    const element = videoRef.current;
    if (!cameraOn || !cameraTrack || !element) return;

    cameraTrack.attach(element);
    return () => {
      cameraTrack.detach(element);
    };
  }, [cameraOn, cameraTrack]);

  return (
    <li className={`call-tile ${participant.isSpeaking ? "is-speaking" : ""} ${cameraOn ? "has-video" : ""}`}>
      {cameraOn ? (
        <video ref={videoRef} className={`call-video ${isLocal ? "is-mirrored" : ""}`} autoPlay playsInline muted />
      ) : (
        <FramedAvatar name={name} frame={meta.frame} avatar={meta.avatar} size={76} />
      )}

      <span className="call-tile-name">
        {!participant.isMicrophoneEnabled && <Icon name="micOff" size={13} />}
        {name}
        {isLocal && <small> (you)</small>}
      </span>

      {canModerate && !isLocal && (
        <button type="button" className="call-tile-kick" onClick={() => onKick(participant)} title="Remove from call">
          <Icon name="close" size={13} strokeWidth={2.6} />
        </button>
      )}
    </li>
  );
}

function CallPage() {
  const { roomId } = useParams();
  const isLounge = roomId === "lounge";
  const navigate = useNavigate();
  const social = useSocial();

  const [phase, setPhase] = useState("ready"); // ready | joining | live | ended | error | soon
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState(null);
  const [, setTick] = useState(0);
  const [reactions, setReactions] = useState([]);
  const [needsAudioTap, setNeedsAudioTap] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [members, setMembers] = useState(new Set());
  const [inviteNotice, setInviteNotice] = useState("");
  // The live Room, for rendering; roomRef is for cleanup in callbacks.
  const [room, setRoom] = useState(null);

  const roomRef = useRef(null);
  const audioRef = useRef(null);

  const rerender = useCallback(() => setTick((n) => n + 1), []);

  const addReaction = useCallback((emoji, name) => {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions((current) => [...current.slice(-14), { id, emoji, name, left: 10 + Math.random() * 80 }]);
    setTimeout(() => setReactions((current) => current.filter((item) => item.id !== id)), 2600);
  }, []);

  // Who's already in this private call (so the invite list can skip them).
  const loadMembers = useCallback(async () => {
    if (isLounge) return;
    const { data } = await supabase.from("call_members").select("user_id").eq("call_id", roomId);
    setMembers(new Set((data || []).map((row) => row.user_id)));
  }, [isLounge, roomId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const leave = useCallback(async () => {
    const current = roomRef.current;
    roomRef.current = null;
    setRoom(null);
    setPresenceCall(null);
    if (current) await current.disconnect();
  }, []);

  // Leave when the page closes or you navigate away.
  useEffect(() => () => {
    leave();
  }, [leave]);

  const join = async () => {
    setPhase("joining");
    setMessage("");

    const { data, error } = await supabase.functions.invoke("call-token", { body: { room: roomId } });

    if (error || !data) {
      setPhase("error");
      setMessage("Couldn't start the call. Try again in a moment.");
      return;
    }

    if (data.status === "not_configured") {
      setPhase("soon");
      return;
    }

    if (data.status !== "ok") {
      setPhase("error");
      setMessage(data.message || "You can't join this call.");
      return;
    }

    setInfo(data);

    const next = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = next;

    next
      .on(RoomEvent.ParticipantConnected, rerender)
      .on(RoomEvent.ParticipantDisconnected, rerender)
      .on(RoomEvent.ActiveSpeakersChanged, rerender)
      .on(RoomEvent.TrackMuted, rerender)
      .on(RoomEvent.TrackUnmuted, rerender)
      .on(RoomEvent.LocalTrackPublished, rerender)
      .on(RoomEvent.LocalTrackUnpublished, rerender)
      .on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) audioRef.current?.appendChild(track.attach());
        rerender();
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
        rerender();
      })
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudioTap(!next.canPlaybackAudio))
      .on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const packet = JSON.parse(new TextDecoder().decode(payload));
          if (packet.t === "react" && REACTIONS.includes(packet.e)) addReaction(packet.e, participant?.name);
          if (packet.t === "end" && !data.isHost) {
            leave();
            setPhase("ended");
            setMessage("The host ended the call.");
          }
        } catch {
          // Ignore anything that isn't ours.
        }
      })
      .on(RoomEvent.Disconnected, (reason) => {
        if (roomRef.current !== next) return;
        roomRef.current = null;
        setRoom(null);
        setPresenceCall(null);
        setPhase("ended");
        setMessage(
          reason === DisconnectReason.PARTICIPANT_REMOVED
            ? "You were removed from the call."
            : "You left the call."
        );
      });

    try {
      await next.connect(data.url, data.token);
    } catch (connectError) {
      console.error(connectError);
      roomRef.current = null;
      setPhase("error");
      setMessage("Couldn't connect to the call. Check your internet and try again.");
      return;
    }

    try {
      await next.localParticipant.setMicrophoneEnabled(true);
    } catch {
      setMessage("Your microphone is blocked, so others can't hear you. Allow it in your browser settings.");
    }

    setNeedsAudioTap(!next.canPlaybackAudio);
    setPresenceCall(isLounge ? "lounge" : "private");
    setRoom(next);
    setPhase("live");
  };

  const local = room?.localParticipant;
  const everyone = room ? [room.localParticipant, ...room.remoteParticipants.values()] : [];

  const toggleMic = async () => {
    await local.setMicrophoneEnabled(!local.isMicrophoneEnabled).catch(() => {});
    rerender();
  };

  const toggleCamera = async () => {
    try {
      await local.setCameraEnabled(!local.isCameraEnabled);
    } catch {
      setMessage("Your camera is blocked. Allow it in your browser settings.");
    }
    rerender();
  };

  const react = (emoji) => {
    local?.publishData(new TextEncoder().encode(JSON.stringify({ t: "react", e: emoji })), { reliable: true });
    addReaction(emoji, "You");
  };

  const kick = async (participant) => {
    if (!window.confirm(`Remove ${participant.name || "them"} from the call?`)) return;

    const { data } = await supabase.functions.invoke("call-token", {
      body: { room: roomId, action: "kick", identity: participant.identity },
    });

    if (data?.status !== "ok") setMessage(data?.message || "Couldn't remove them.");
  };

  const endForEveryone = async () => {
    if (!window.confirm("End the call for everyone?")) return;

    await local?.publishData(new TextEncoder().encode(JSON.stringify({ t: "end" })), { reliable: true });
    await supabase.rpc("end_call", { p_call: roomId });
    await leave();
    setPhase("ended");
    setMessage("You ended the call.");
  };

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

  return (
    <main className="call-page">
      <div ref={audioRef} hidden />

      <header className="call-head">
        <Link to={isLounge ? "/chat" : "/chat"} className="call-back" onClick={() => leave()}>
          <Icon name="arrowLeft" size={16} />
          Chat
        </Link>
        <h1>
          {isLounge ? "🎧" : "📞"} {title}
        </h1>
        {phase === "live" && <span className="call-count">{everyone.length} in call</span>}
      </header>

      {phase !== "live" ? (
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
              <h2>{message || "Call ended"}</h2>
              <div className="call-lobby-actions">
                {isLounge && (
                  <button type="button" className="btn btn-primary" onClick={join}>
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
                Your mic turns on when you join. Camera is off until you turn it on.
              </p>

              {message && <div className="notice notice-error">{message}</div>}

              <button type="button" className="btn btn-primary call-join" onClick={join} disabled={phase === "joining"}>
                <Icon name="phone" size={17} />
                {phase === "joining" ? "Joining…" : "Join call"}
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          {needsAudioTap && (
            <button type="button" className="notice notice-gold call-audio-tap" onClick={() => room.startAudio().then(() => setNeedsAudioTap(false))}>
              🔊 Tap to hear everyone
            </button>
          )}

          {message && <div className="notice notice-error call-message">{message}</div>}

          <ul className={`call-grid count-${Math.min(everyone.length, 6)}`}>
            {everyone.map((participant) => (
              <Tile
                key={participant.identity}
                participant={participant}
                isLocal={participant === local}
                canModerate={info?.canModerate}
                onKick={kick}
              />
            ))}
          </ul>

          <div className="call-reactions" aria-hidden="true">
            {reactions.map((item) => (
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

          <div className="call-bar">
            <div className="call-bar-reacts">
              {REACTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => react(emoji)} aria-label={`React ${emoji}`}>
                  {emoji}
                </button>
              ))}
            </div>

            <div className="call-bar-main">
              <button
                type="button"
                className={`call-btn ${local?.isMicrophoneEnabled ? "" : "is-off"}`}
                onClick={toggleMic}
                aria-label={local?.isMicrophoneEnabled ? "Mute" : "Unmute"}
              >
                <Icon name={local?.isMicrophoneEnabled ? "mic" : "micOff"} size={20} />
              </button>

              <button
                type="button"
                className={`call-btn ${local?.isCameraEnabled ? "is-on" : ""}`}
                onClick={toggleCamera}
                aria-label={local?.isCameraEnabled ? "Turn camera off" : "Turn camera on"}
              >
                <Icon name="video" size={20} />
              </button>

              {!isLounge && (
                <button type="button" className="call-btn" onClick={() => setInviteOpen((open) => !open)} aria-label="Add friends">
                  <Icon name="userPlus" size={20} />
                </button>
              )}

              <button
                type="button"
                className="call-btn is-leave"
                onClick={() => {
                  leave();
                  setPhase("ended");
                  setMessage("You left the call.");
                }}
                aria-label="Leave call"
              >
                <Icon name="phoneOff" size={20} />
              </button>
            </div>

            {info?.isHost && (
              <button type="button" className="btn btn-sm call-end-all" onClick={endForEveryone}>
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
