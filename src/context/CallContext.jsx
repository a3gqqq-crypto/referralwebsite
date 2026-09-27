import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import { setPresenceCall } from "../lib/presence";

// The call lives here, above the pages, so it keeps going while people browse
// the site (a floating dock shows it). LiveKit's library only downloads when
// someone actually joins. Also rings for incoming calls.

const CallContext = createContext(null);

export const REACTIONS = ["😂", "🔥", "👏", "❤️", "😮", "🎉"];

let audioContext = null;

function getAudio() {
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

// Browsers keep sound muted until the person taps the page once, so wake the
// audio engine on the first tap; after that the ringtone can play by itself.
if (typeof window !== "undefined") {
  const unlock = () => {
    try {
      getAudio().resume();
    } catch {
      // No audio support.
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

// Tiny synthesized sounds, so there are no audio files to load.
function beep(notes) {
  try {
    const context = getAudio();
    if (context.state === "suspended") context.resume();
    const start = context.currentTime;

    notes.forEach(([frequency, at, length, volume = 0.08]) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start + at);
      gain.gain.linearRampToValueAtTime(volume, start + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + at + length);
      osc.connect(gain).connect(context.destination);
      osc.start(start + at);
      osc.stop(start + at + length + 0.05);
    });
  } catch {
    // Sound is a nice-to-have.
  }
}

const SOUNDS = {
  join: () => beep([[660, 0, 0.12], [990, 0.1, 0.18]]),
  leave: () => beep([[880, 0, 0.12], [520, 0.1, 0.2]]),
  ring: () => {
    beep([[880, 0, 0.35, 0.18], [1100, 0, 0.35, 0.09], [880, 0.45, 0.35, 0.18], [1100, 0.45, 0.35, 0.09]]);
    try {
      navigator.vibrate?.([400, 150, 400]);
    } catch {
      // No vibration on this device.
    }
  },
};

export function CallProvider({ user, children }) {
  const me = user?.id;

  const [phase, setPhase] = useState("idle"); // idle | joining | live | ended | error | soon
  const [roomKey, setRoomKey] = useState(null);
  const [room, setRoom] = useState(null);
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [needsAudioTap, setNeedsAudioTap] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [mutedForMe, setMutedForMe] = useState(() => new Set());
  const [incoming, setIncoming] = useState(null);
  const [, setTick] = useState(0);

  const roomRef = useRef(null);
  const audioRef = useRef(null);
  const wakeLockRef = useRef(null);

  const rerender = useCallback(() => setTick((n) => n + 1), []);

  const addReaction = useCallback((emoji, name) => {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions((current) => [...current.slice(-14), { id, emoji, name, left: 10 + Math.random() * 80 }]);
    setTimeout(() => setReactions((current) => current.filter((item) => item.id !== id)), 2600);
  }, []);

  const keepAwake = useCallback(async (on) => {
    try {
      if (on && !wakeLockRef.current && navigator.wakeLock) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } else if (!on && wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // Not supported or not allowed; the call still works.
    }
  }, []);

  // Screens release the wake lock when hidden; take it back on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && roomRef.current) keepAwake(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [keepAwake]);

  const finish = useCallback(
    (text) => {
      roomRef.current = null;
      setRoom(null);
      setReconnecting(false);
      setNeedsAudioTap(false);
      setMutedForMe(new Set());
      setPresenceCall(null);
      keepAwake(false);
      setPhase("ended");
      setMessage(text || "You left the call.");
    },
    [keepAwake]
  );

  const leave = useCallback(
    async (text) => {
      const current = roomRef.current;
      if (!current) return;

      finish(text);
      SOUNDS.leave();
      await current.disconnect();
    },
    [finish]
  );

  const join = useCallback(
    async (key) => {
      if (roomRef.current) {
        if (roomKey === key) return;
        await leave();
      }

      setRoomKey(key);
      setPhase("joining");
      setMessage("");
      setInfo(null);

      const [{ data, error }, lk] = await Promise.all([
        supabase.functions.invoke("call-token", { body: { room: key } }),
        import("livekit-client"),
      ]);


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

      const { Room, RoomEvent, Track, DisconnectReason } = lk;
      const next = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = next;
      setInfo(data);

      next
        .on(RoomEvent.ParticipantConnected, () => {
          SOUNDS.join();
          rerender();
        })
        .on(RoomEvent.ParticipantDisconnected, () => {
          SOUNDS.leave();
          rerender();
        })
        .on(RoomEvent.ActiveSpeakersChanged, rerender)
        .on(RoomEvent.TrackMuted, rerender)
        .on(RoomEvent.TrackUnmuted, rerender)
        .on(RoomEvent.TrackPublished, rerender)
        .on(RoomEvent.TrackUnpublished, rerender)
        .on(RoomEvent.LocalTrackPublished, rerender)
        .on(RoomEvent.LocalTrackUnpublished, rerender)
        .on(RoomEvent.ConnectionQualityChanged, rerender)
        .on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            const element = track.attach();
            element.dataset.callAudio = "1";
            audioRef.current?.appendChild(element);
          }
          rerender();
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((element) => element.remove());
          rerender();
        })
        .on(RoomEvent.Reconnecting, () => setReconnecting(true))
        .on(RoomEvent.SignalReconnecting, () => setReconnecting(true))
        .on(RoomEvent.Reconnected, () => setReconnecting(false))
        .on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudioTap(!next.canPlaybackAudio))
        .on(RoomEvent.DataReceived, (payload, participant) => {
          try {
            const packet = JSON.parse(new TextDecoder().decode(payload));
            if (packet.t === "react" && REACTIONS.includes(packet.e)) addReaction(packet.e, participant?.name);
            if (packet.t === "end" && !data.isHost && roomRef.current === next) {
              finish("The host ended the call.");
              SOUNDS.leave();
              next.disconnect();
            }
          } catch {
            // Ignore anything that isn't ours.
          }
        })
        .on(RoomEvent.Disconnected, (reason) => {
          if (roomRef.current !== next) return;
          finish(
            reason === DisconnectReason.PARTICIPANT_REMOVED
              ? "You were removed from the call."
              : reason === DisconnectReason.ROOM_DELETED
                ? "The call ended."
                : "You got disconnected. Tap Rejoin."
          );
        });

      try {
        await next.connect(data.url, data.token);
      } catch (connectError) {
        console.error(connectError);
        roomRef.current = null;
        setPhase("error");
        setMessage("Couldn't connect. Check your internet and try again.");
        return;
      }

      try {
        await next.localParticipant.setMicrophoneEnabled(true);
      } catch {
        setMessage("Your microphone is blocked, so others can't hear you. Allow it in your browser settings.");
      }

      setNeedsAudioTap(!next.canPlaybackAudio);
      setPresenceCall(key === "lounge" ? "lounge" : "private");
      keepAwake(true);
      SOUNDS.join();
      setRoom(next);
      setPhase("live");
    },
    [roomKey, leave, rerender, addReaction, finish, keepAwake]
  );

  // Leave cleanly when the tab closes or the person logs out.
  useEffect(() => {
    const onUnload = () => roomRef.current?.disconnect();
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      roomRef.current?.disconnect();
    };
  }, []);

  /* ---------- Controls ---------- */

  const local = room?.localParticipant;

  const toggleMic = useCallback(async () => {
    if (!local) return;
    await local.setMicrophoneEnabled(!local.isMicrophoneEnabled).catch(() => {});
    rerender();
  }, [local, rerender]);

  const toggleCamera = useCallback(async () => {
    if (!local) return;
    try {
      await local.setCameraEnabled(!local.isCameraEnabled);
    } catch {
      setMessage("Your camera is blocked. Allow it in your browser settings.");
    }
    rerender();
  }, [local, rerender]);

  const canScreenShare = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);

  const toggleScreen = useCallback(async () => {
    if (!local) return;
    try {
      await local.setScreenShareEnabled(!local.isScreenShareEnabled, { audio: true });
    } catch {
      // Cancelled the picker.
    }
    rerender();
  }, [local, rerender]);

  const react = useCallback(
    (emoji) => {
      local?.publishData(new TextEncoder().encode(JSON.stringify({ t: "react", e: emoji })), { reliable: true });
      addReaction(emoji, "You");
    },
    [local, addReaction]
  );

  const toggleMuteForMe = useCallback((participant) => {
    setMutedForMe((current) => {
      const next = new Set(current);
      if (next.has(participant.identity)) {
        next.delete(participant.identity);
        participant.setVolume?.(1);
      } else {
        next.add(participant.identity);
        participant.setVolume?.(0);
      }
      return next;
    });
  }, []);

  const kick = useCallback(
    async (participant) => {
      const { data } = await supabase.functions.invoke("call-token", {
        body: { room: roomKey, action: "kick", identity: participant.identity },
      });
      if (data?.status !== "ok") setMessage(data?.message || "Couldn't remove them.");
    },
    [roomKey]
  );

  const endForEveryone = useCallback(async () => {
    await local?.publishData(new TextEncoder().encode(JSON.stringify({ t: "end" })), { reliable: true });
    await supabase.rpc("end_call", { p_call: roomKey });
    await leave("You ended the call.");
  }, [local, roomKey, leave]);

  const startAudio = useCallback(async () => {
    await room?.startAudio();
    setNeedsAudioTap(false);
  }, [room]);

  /* ---------- Incoming calls ---------- */

  useEffect(() => {
    if (!me) return;

    const channel = supabase
      .channel(`incoming-calls-${me}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me}` },
        async (payload) => {
          const note = payload.new;
          if (note.kind !== "call" || !note.link) return;

          const callId = note.link.split("/").pop();
          if (roomRef.current && roomKey === callId) return;

          let caller = null;
          if (note.actor_id) {
            const { data } = await supabase
              .from("profiles")
              .select("id, username, display_name, avatar, equipped_frame")
              .eq("id", note.actor_id)
              .maybeSingle();
            caller = data;
          }

          setIncoming({ callId, link: note.link, title: note.title, caller, at: Date.now() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, roomKey]);

  // Ring until answered, declined, or 30 seconds pass.
  useEffect(() => {
    if (!incoming) return;

    SOUNDS.ring();
    const ringer = setInterval(SOUNDS.ring, 2200);
    const giveUp = setTimeout(() => setIncoming(null), 30000);

    return () => {
      clearInterval(ringer);
      clearTimeout(giveUp);
    };
  }, [incoming]);

  const everyone = room ? [room.localParticipant, ...room.remoteParticipants.values()] : [];

  const value = {
    phase,
    roomKey,
    room,
    info,
    message,
    setMessage,
    reconnecting,
    needsAudioTap,
    reactions,
    mutedForMe,
    everyone,
    local,
    live: phase === "live" && Boolean(room),
    canScreenShare,
    incoming,
    dismissIncoming: () => setIncoming(null),
    join,
    leave,
    toggleMic,
    toggleCamera,
    toggleScreen,
    react,
    toggleMuteForMe,
    kick,
    endForEveryone,
    startAudio,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <div ref={audioRef} hidden />
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used inside CallProvider");
  return context;
}
