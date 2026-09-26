import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import FriendButton from "../components/FriendButton";
import ReportModal from "../components/ReportModal";
import SkeletonRows from "../components/SkeletonRows";
import PlayerChip, { PLAYER_COLUMNS } from "../components/PlayerChip";
import { BadgeRow, FramedAvatar, StyledName } from "../components/Cosmetics";
import { LevelBadge } from "../components/Level";
import StaffTag from "../components/StaffTag";
import { useMyProfile } from "../context/ProfileContext";
import { prepareChatImage, removeChatImage, uploadChatImage, useChatImage } from "../lib/chatImages";
import { displayNameOf, equippedFrom } from "../data/cosmetics";
import { useSocial } from "../context/SocialContext";

import "../styles/chat.css";

const PAGE = 50;
const GROUP_GAP_MS = 5 * 60 * 1000;

function formatTime(iso) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (date.toDateString() === new Date().toDateString()) return time;

  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

function ChatPhoto({ path, onOpen, onLoad }) {
  const link = useChatImage(path);

  if (link?.failed) {
    return <div className="chat-photo chat-photo-missing">Photo unavailable</div>;
  }

  if (!link?.url) {
    return <div className="chat-photo chat-photo-loading" aria-label="Loading photo" />;
  }

  return (
    <button type="button" className="chat-photo" onClick={() => onOpen(link.url)} aria-label="Open photo">
      <img src={link.url} alt="" loading="lazy" decoding="async" onLoad={onLoad} />
    </button>
  );
}

function MessageRow({ message, sender, grouped, isMine, onReport, onOpenPhoto, onPhotoLoad }) {
  const equipped = equippedFrom(sender);
  const name = displayNameOf(sender, "…");
  const href = `/u/${encodeURIComponent(sender?.username || "")}`;

  return (
    <li className={`chat-msg ${grouped ? "grouped" : ""} ${isMine ? "mine" : ""}`}>
      <div className="chat-msg-avatar">
        {!grouped && (
          <Link to={href} tabIndex={-1} aria-hidden="true">
            <FramedAvatar name={name} frame={equipped.frame} avatar={equipped.avatar} size={38} />
          </Link>
        )}
      </div>

      <div className="chat-msg-main">
        {!grouped && (
          <div className="chat-msg-head">
            <Link to={href} className="chat-msg-name">
              <StyledName name={name} effect={equipped.name} />
            </Link>
            <StaffTag userId={message.sender_id} />
            <LevelBadge xp={sender?.xp} />
            <BadgeRow ids={equipped.badges} size={16} />
            <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
          </div>
        )}

        {message.image && (
          <ChatPhoto path={message.image} onOpen={onOpenPhoto} onLoad={onPhotoLoad} />
        )}

        {message.body && <p className="chat-msg-body">{message.body}</p>}
      </div>

      {!isMine && sender && (
        <button
          type="button"
          className="chat-msg-report"
          onClick={() => onReport(sender, message.id)}
          aria-label={`Report message from ${name}`}
          title="Report"
        >
          <Icon name="flag" size={14} />
        </button>
      )}
    </li>
  );
}

function ChatPage() {
  const { username } = useParams();
  const isDm = Boolean(username);

  const social = useSocial();
  const { me, friends, incoming, unread, blocked, relationWith, onDirectMessage, markRead } = social;

  const [profiles, setProfiles] = useState({});
  const profilesRef = useRef({});

  const [target, setTarget] = useState(null);
  const [targetState, setTargetState] = useState("idle");

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(null);
  const [viewing, setViewing] = useState(null);
  const photoInputRef = useRef(null);

  const { profile: myProfile } = useMyProfile();
  const canPostLoungePhoto = (myProfile?.xp || 0) >= 200;

  const [recent, setRecent] = useState({});
  const [listOpen, setListOpen] = useState(false);
  const [reporting, setReporting] = useState(null);

  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const preserveFrom = useRef(null);
  const inputRef = useRef(null);

  const markReadRef = useRef(markRead);

  useEffect(() => {
    markReadRef.current = markRead;
  });

  const relation = target ? relationWith(target.id) : null;
  const canSend = !isDm || relation === "friends";

  const addProfiles = useCallback((rows) => {
    const next = { ...profilesRef.current };
    rows.forEach((row) => {
      if (row?.id) next[row.id] = row;
    });
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  const ensureProfiles = useCallback(
    async (ids) => {
      const missing = [...new Set(ids)].filter((id) => id && !profilesRef.current[id]);

      if (!missing.length) return;

      const { data } = await supabase.from("profiles").select(PLAYER_COLUMNS).in("id", missing);

      addProfiles(data || []);
    },
    [addProfiles]
  );

  /* ---------- Sidebar: last message per friend ---------- */

  const loadRecent = useCallback(async () => {
    if (!me) return;

    const { data } = await supabase
      .from("direct_messages")
      .select("sender_id, recipient_id, body, image, created_at")
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(300);

    const latest = {};
    (data || []).forEach((message) => {
      const other = message.sender_id === me ? message.recipient_id : message.sender_id;
      if (!latest[other]) latest[other] = message;
    });

    setRecent(latest);
  }, [me]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  /* ---------- DM target ---------- */

  useEffect(() => {
    setListOpen(false);
    setError("");
    setDraft("");
    setPhoto(null);

    if (!isDm) {
      setTarget(null);
      setTargetState("idle");
      return;
    }

    let cancelled = false;
    setTargetState("loading");

    supabase
      .from("profiles")
      .select(PLAYER_COLUMNS)
      .eq("username", username)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;

        if (!data) {
          setTarget(null);
          setTargetState("missing");
          return;
        }

        addProfiles([data]);
        setTarget(data);
        setTargetState("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [isDm, username, addProfiles]);

  /* ---------- Messages ---------- */

  const fetchPage = useCallback(
    async (before) => {
      let query = isDm
        ? supabase
            .from("direct_messages")
            .select("id, sender_id, recipient_id, body, image, created_at")
            .or(
              `and(sender_id.eq.${me},recipient_id.eq.${target.id}),and(sender_id.eq.${target.id},recipient_id.eq.${me})`
            )
        : supabase.from("lounge_messages").select("id, sender_id, body, image, created_at");

      query = query.order("created_at", { ascending: false }).limit(PAGE);

      if (before) query = query.lt("created_at", before);

      const { data, error: loadError } = await query;

      if (loadError) {
        console.error(loadError);
        return null;
      }

      const rows = (data || []).reverse();
      await ensureProfiles(rows.map((row) => row.sender_id));

      return rows;
    },
    [isDm, me, target, ensureProfiles]
  );

  useEffect(() => {
    if (isDm && targetState !== "ready") return;

    let cancelled = false;
    setLoading(true);
    setMessages([]);

    fetchPage().then((rows) => {
      if (cancelled) return;

      stickToBottom.current = true;
      setMessages(rows || []);
      setHasMore((rows || []).length === PAGE);
      setLoading(false);

      if (isDm && target) markReadRef.current(target.id);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchPage, isDm, targetState, target]);

  const loadOlder = async () => {
    if (!messages.length || loadingOlder) return;

    setLoadingOlder(true);
    preserveFrom.current = scrollRef.current?.scrollHeight ?? null;

    const rows = await fetchPage(messages[0].created_at);

    setLoadingOlder(false);

    if (rows) {
      setMessages((current) => [...rows, ...current]);
      setHasMore(rows.length === PAGE);
    }
  };

  /* ---------- Live updates ---------- */

  useEffect(() => {
    if (isDm) return;

    const channel = supabase
      .channel("lounge-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lounge_messages" },
        async (payload) => {
          const message = payload.new;
          await ensureProfiles([message.sender_id]);
          setMessages((current) =>
            current.some((item) => item.id === message.id) ? current : [...current, message]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDm, ensureProfiles]);

  useEffect(
    () =>
      onDirectMessage((message) => {
        loadRecent();

        if (isDm && target && message.sender_id === target.id) {
          setMessages((current) =>
            current.some((item) => item.id === message.id) ? current : [...current, message]
          );
          markReadRef.current(target.id);
        }
      }),
    [onDirectMessage, loadRecent, isDm, target]
  );

  /* ---------- Scrolling ---------- */

  useLayoutEffect(() => {
    const box = scrollRef.current;

    if (!box) return;

    if (preserveFrom.current != null) {
      box.scrollTop += box.scrollHeight - preserveFrom.current;
      preserveFrom.current = null;
      return;
    }

    if (stickToBottom.current) {
      box.scrollTop = box.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const box = scrollRef.current;
    stickToBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  };

  // Photos load after the message renders; keep the view pinned to the newest one.
  const keepAtBottom = useCallback(() => {
    const box = scrollRef.current;
    if (box && stickToBottom.current) box.scrollTop = box.scrollHeight;
  }, []);

  /* ---------- Sending ---------- */

  const pickPhoto = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only photos can be sent.");
      return;
    }

    if (!isDm && !canPostLoungePhoto) {
      setError("Reach level 3 to post photos in the lounge.");
      return;
    }

    setError("");
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.preview);
      return { file, preview: URL.createObjectURL(file) };
    });
    inputRef.current?.focus();
  };

  const clearPhoto = () => {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.preview);
      return null;
    });
  };

  const onPaste = (event) => {
    const file = [...(event.clipboardData?.files || [])].find((item) => item.type.startsWith("image/"));

    if (file) {
      event.preventDefault();
      pickPhoto(file);
    }
  };

  const send = async (event) => {
    event?.preventDefault();

    const body = draft.trim();

    if ((!body && !photo) || sending || !canSend) return;

    setSending(true);
    setError("");

    let imagePath = null;

    if (photo) {
      try {
        imagePath = await uploadChatImage(me, await prepareChatImage(photo.file));
      } catch (uploadError) {
        setSending(false);
        setError(uploadError.message);
        return;
      }
    }

    const { data, error: sendError } = isDm
      ? await supabase.rpc("send_direct_message", { p_recipient: target.id, p_body: body, p_image: imagePath })
      : await supabase.rpc("send_lounge_message", { p_body: body, p_image: imagePath });

    setSending(false);

    if (sendError) {
      if (imagePath) removeChatImage(imagePath);
      setError(sendError.message);
      return;
    }

    clearPhoto();
    setDraft("");
    stickToBottom.current = true;
    setMessages((current) =>
      current.some((item) => item.id === data.id) ? current : [...current, data]
    );

    if (isDm) loadRecent();

    inputRef.current?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  useEffect(() => {
    const input = inputRef.current;

    if (!input) return;

    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    input.style.overflowY = input.scrollHeight > 160 ? "auto" : "hidden";
  }, [draft]);

  /* ---------- Render ---------- */

  const visible = messages.filter((message) => !blocked.has(message.sender_id));

  const sortedFriends = [...friends].sort((a, b) => {
    const at = recent[a.otherId]?.created_at || a.accepted_at || "";
    const bt = recent[b.otherId]?.created_at || b.accepted_at || "";
    return bt.localeCompare(at);
  });

  const totalBadge = social.badgeCount;
  const limit = isDm ? 1000 : 500;

  return (
    <main className="chat-page">
      <aside className={`chat-sidebar ${listOpen ? "open" : ""}`} aria-label="Conversations">
        <div className="chat-sidebar-head">
          <h1>Chat</h1>
          <Link to="/people" className="btn btn-sm">
            <Icon name="users" size={15} />
            Find people
          </Link>
        </div>

        <div className="chat-sidebar-scroll">
          <Link
            to="/chat"
            className={`chat-room ${!isDm ? "active" : ""}`}
            onClick={() => setListOpen(false)}
          >
            <span className="chat-room-icon" aria-hidden="true">#</span>
            <span className="chat-room-text">
              <strong>Lounge</strong>
              <small>Everyone on Vexora</small>
            </span>
            <span className="chip chip-live chat-room-live">
              <span className="live-dot" />
            </span>
          </Link>

          {incoming.length > 0 && (
            <section className="chat-side-section">
              <h2>Friend requests</h2>

              {incoming.map((request) => (
                <div key={request.otherId} className="chat-request">
                  <PlayerChip player={request.profile} size={32} showBadges={false} />

                  <div className="chat-request-actions">
                    <button
                      type="button"
                      className="chat-icon-btn accept"
                      onClick={() => social.respond(request.otherId, true)}
                      aria-label={`Accept ${displayNameOf(request.profile)}`}
                      title="Accept"
                    >
                      <Icon name="check" size={15} strokeWidth={2.6} />
                    </button>
                    <button
                      type="button"
                      className="chat-icon-btn"
                      onClick={() => social.respond(request.otherId, false)}
                      aria-label={`Decline ${displayNameOf(request.profile)}`}
                      title="Decline"
                    >
                      <Icon name="close" size={15} strokeWidth={2.6} />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="chat-side-section">
            <h2>Friends</h2>

            {sortedFriends.length === 0 ? (
              <p className="chat-side-empty">
                No friends yet. <Link to="/people">Find people</Link> and add them — then
                you can DM.
              </p>
            ) : (
              sortedFriends.map((friend) => {
                const profile = friend.profile;
                const last = recent[friend.otherId];
                const count = unread[friend.otherId] || 0;
                const equipped = equippedFrom(profile);
                const active = isDm && target?.id === friend.otherId;

                if (!profile) return null;

                return (
                  <Link
                    key={friend.otherId}
                    to={`/chat/${encodeURIComponent(profile.username)}`}
                    className={`chat-friend ${active ? "active" : ""} ${count ? "has-unread" : ""}`}
                    onClick={() => setListOpen(false)}
                  >
                    <FramedAvatar
                      name={displayNameOf(profile)}
                      frame={equipped.frame}
                      avatar={equipped.avatar}
                      size={36}
                    />

                    <span className="chat-friend-text">
                      <StyledName name={displayNameOf(profile)} effect={equipped.name} />
                      <small>
                        {last
                          ? `${last.sender_id === me ? "You: " : ""}${last.body || (last.image ? "📷 Photo" : "")}`
                          : "Say hi 👋"}
                      </small>
                    </span>

                    {count > 0 && <span className="chat-unread">{count}</span>}
                  </Link>
                );
              })
            )}
          </section>
        </div>
      </aside>


      <section className="chat-main">
        <header className="chat-head">
          <button
            type="button"
            className="chat-list-toggle"
            onClick={() => setListOpen((open) => !open)}
            aria-expanded={listOpen}
            aria-label={listOpen ? "Close conversations" : "Open conversations"}
          >
            <Icon name={listOpen ? "close" : "chat"} size={18} />
            {totalBadge > 0 && !listOpen && <span className="chat-unread">{totalBadge}</span>}
          </button>

          {isDm ? (
            target ? (
              <>
                <PlayerChip player={target} size={38} />

                <div className="chat-head-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setReporting({ target, kind: "dm", messageId: null })}
                    aria-label={`Report ${displayNameOf(target)}`}
                  >
                    <Icon name="flag" size={15} className="chat-head-icon" />
                    <span className="chat-head-label">Report</span>
                  </button>

                  {relation !== "blocked" && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        if (window.confirm(`Block ${displayNameOf(target)}? They won't be able to message you or add you.`)) {
                          social.block(target.id);
                        }
                      }}
                      aria-label={`Block ${displayNameOf(target)}`}
                    >
                      <Icon name="block" size={15} className="chat-head-icon" />
                      <span className="chat-head-label">Block</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <strong className="chat-head-title">
                {targetState === "missing" ? "User not found" : "Loading…"}
              </strong>
            )
          ) : (
            <div className="chat-head-lounge">
              <span className="chat-room-icon" aria-hidden="true">#</span>
              <div>
                <strong className="chat-head-title">Lounge</strong>
                <small>Be kind · no links · reports go to the Vexora team</small>
              </div>
            </div>
          )}
        </header>

        <div className="chat-scroll" ref={scrollRef} onScroll={onScroll}>
          {loading ? (
            <div className="chat-loading">
              <SkeletonRows count={5} />
            </div>
          ) : (
            <>
              {hasMore && (
                <button type="button" className="btn btn-sm chat-older" onClick={loadOlder} disabled={loadingOlder}>
                  {loadingOlder ? "Loading…" : "Load older messages"}
                </button>
              )}

              {visible.length === 0 && (
                <div className="chat-empty">
                  {isDm ? (
                    <>
                      <strong>This is the start of your chat{target ? ` with ${displayNameOf(target)}` : ""}.</strong>
                      <span>Say something nice.</span>
                    </>
                  ) : (
                    <>
                      <strong>It's quiet in here.</strong>
                      <span>Be the first to say hi 👋</span>
                    </>
                  )}
                </div>
              )}

              <ol className="chat-list">
                {visible.map((message, index) => {
                  const previous = visible[index - 1];
                  const grouped =
                    previous &&
                    previous.sender_id === message.sender_id &&
                    new Date(message.created_at) - new Date(previous.created_at) < GROUP_GAP_MS;

                  return (
                    <MessageRow
                      key={message.id}
                      message={message}
                      sender={profiles[message.sender_id]}
                      grouped={grouped}
                      isMine={message.sender_id === me}
                      onReport={(sender, messageId) =>
                        setReporting({ target: sender, kind: isDm ? "dm" : "lounge", messageId })
                      }
                      onOpenPhoto={setViewing}
                      onPhotoLoad={keepAtBottom}
                    />
                  );
                })}
              </ol>
            </>
          )}
        </div>

        {canSend ? (
          <form className="chat-composer" onSubmit={send}>
            {error && <div className="notice notice-error chat-error">{error}</div>}

            {photo && (
              <div className="chat-pending-photo">
                <img src={photo.preview} alt="Photo to send" />
                <button type="button" onClick={clearPhoto} aria-label="Remove photo" disabled={sending}>
                  <Icon name="close" size={14} strokeWidth={2.6} />
                </button>
              </div>
            )}

            <div className="chat-composer-box">
              <button
                type="button"
                className="chat-attach"
                onClick={() =>
                  !isDm && !canPostLoungePhoto
                    ? setError("Reach level 3 to post photos in the lounge.")
                    : photoInputRef.current?.click()
                }
                disabled={sending}
                aria-label="Add a photo"
                title={!isDm && !canPostLoungePhoto ? "Reach level 3 to post photos in the lounge" : "Add a photo"}
              >
                <Icon name="image" size={20} />
              </button>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  pickPhoto(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />

              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (error) setError("");
                }}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                maxLength={limit}
                placeholder={isDm && target ? `Message ${displayNameOf(target)}` : "Message the lounge"}
                aria-label="Message"
              />

              {draft.length > limit - 100 && (
                <span className="chat-counter mono">{limit - draft.length}</span>
              )}

              <button
                type="submit"
                className="chat-send"
                disabled={(!draft.trim() && !photo) || sending}
                aria-label="Send"
              >
                {sending ? <span className="chat-send-spinner" /> : <Icon name="arrowRight" size={18} strokeWidth={2.4} />}
              </button>
            </div>
          </form>
        ) : (
          target && (
            <div className="chat-locked">
              {relation === "blocked" ? (
                <span>You blocked {displayNameOf(target)}.</span>
              ) : (
                <span>You can message {displayNameOf(target)} once you're friends.</span>
              )}
              <FriendButton profile={target} size="sm" showMessage={false} />
            </div>
          )
        )}
      </section>

      {viewing && (
        <div
          className="chat-lightbox"
          role="dialog"
          aria-label="Photo"
          onClick={() => setViewing(null)}
          onKeyDown={(event) => event.key === "Escape" && setViewing(null)}
          tabIndex={-1}
          ref={(node) => node?.focus()}
        >
          <img src={viewing} alt="" />
          <button type="button" className="chat-lightbox-close" aria-label="Close photo">
            <Icon name="close" size={20} />
          </button>
        </div>
      )}

      {reporting && (
        <ReportModal
          target={reporting.target}
          kind={reporting.kind}
          messageId={reporting.messageId}
          onClose={() => setReporting(null)}
        />
      )}
    </main>
  );
}

export default ChatPage;
