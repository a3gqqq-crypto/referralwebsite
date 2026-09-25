import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../lib/supabaseClient";
import { PLAYER_COLUMNS } from "../components/PlayerChip";

const SocialContext = createContext(null);

export function SocialProvider({ user, children }) {
  const me = user?.id;

  const [friendships, setFriendships] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [blocked, setBlocked] = useState(() => new Set());
  const [unread, setUnread] = useState({});
  const [loading, setLoading] = useState(true);

  const dmListeners = useRef(new Set());

  const load = useCallback(async () => {
    if (!me) return;

    const [friendResult, blockResult, unreadResult] = await Promise.all([
      supabase
        .from("friendships")
        .select("user_a, user_b, requested_by, status, created_at, accepted_at"),
      supabase.from("blocks").select("blocked_id"),
      supabase
        .from("direct_messages")
        .select("sender_id")
        .eq("recipient_id", me)
        .is("read_at", null),
    ]);

    const rows = friendResult.data || [];
    const otherIds = rows.map((row) => (row.user_a === me ? row.user_b : row.user_a));

    if (otherIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select(PLAYER_COLUMNS)
        .in("id", otherIds);

      setProfilesById((current) => {
        const next = { ...current };
        (profiles || []).forEach((profile) => {
          next[profile.id] = profile;
        });
        return next;
      });
    }

    setFriendships(rows);
    setBlocked(new Set((blockResult.data || []).map((row) => row.blocked_id)));

    const counts = {};
    (unreadResult.data || []).forEach((row) => {
      counts[row.sender_id] = (counts[row.sender_id] || 0) + 1;
    });
    setUnread(counts);

    setLoading(false);
  }, [me]);

  useEffect(() => {
    load();

    const timer = setInterval(load, 30000);

    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!me) return;

    const channel = supabase
      .channel(`dm-inbox-${me}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${me}`,
        },
        (payload) => {
          const message = payload.new;

          setUnread((current) => ({
            ...current,
            [message.sender_id]: (current[message.sender_id] || 0) + 1,
          }));

          dmListeners.current.forEach((listener) => listener(message));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me]);

  const onDirectMessage = useCallback((listener) => {
    dmListeners.current.add(listener);

    return () => dmListeners.current.delete(listener);
  }, []);

  const rpc = useCallback(
    async (fn, args, { reload = true } = {}) => {
      const { data, error } = await supabase.rpc(fn, args);

      if (error) {
        console.error(error);
        return { ok: false, error: error.message };
      }

      if (reload) await load();

      return { ok: true, data };
    },
    [load]
  );

  const value = useMemo(() => {
    const otherOf = (row) => (row.user_a === me ? row.user_b : row.user_a);

    const withProfile = (row) => {
      const id = otherOf(row);
      return { ...row, otherId: id, profile: profilesById[id] || null };
    };

    const friends = friendships
      .filter((row) => row.status === "accepted")
      .map(withProfile);

    const incoming = friendships
      .filter((row) => row.status === "pending" && row.requested_by !== me)
      .map(withProfile);

    const outgoing = friendships
      .filter((row) => row.status === "pending" && row.requested_by === me)
      .map(withProfile);

    const relationWith = (id) => {
      if (!id) return "none";
      if (id === me) return "self";
      if (blocked.has(id)) return "blocked";

      const row = friendships.find((item) => otherOf(item) === id);

      if (!row) return "none";
      if (row.status === "accepted") return "friends";

      return row.requested_by === me ? "outgoing" : "incoming";
    };

    const unreadTotal = Object.values(unread).reduce((sum, n) => sum + n, 0);

    return {
      me,
      loading,
      friends,
      incoming,
      outgoing,
      blocked,
      unread,
      unreadTotal,
      badgeCount: unreadTotal + incoming.length,
      relationWith,
      refresh: load,
      onDirectMessage,
      sendRequest: (id) => rpc("send_friend_request", { p_target: id }),
      respond: (id, accept) =>
        rpc("respond_friend_request", { p_other: id, p_accept: accept }),
      removeFriend: (id) => rpc("remove_friend", { p_other: id }),
      block: (id) => rpc("block_user", { p_target: id }),
      unblock: (id) => rpc("unblock_user", { p_target: id }),
      report: (id, kind, messageId, reason) =>
        rpc(
          "report_user",
          {
            p_target: id,
            p_kind: kind,
            p_message_id: messageId ?? null,
            p_reason: reason || null,
          },
          { reload: false }
        ),
      markRead: async (id) => {
        setUnread((current) => {
          if (!current[id]) return current;
          const next = { ...current };
          delete next[id];
          return next;
        });

        await supabase.rpc("mark_dms_read", { p_other: id });
      },
    };
  }, [me, loading, friendships, profilesById, blocked, unread, load, onDirectMessage, rpc]);

  return (
    <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
  );
}

export function useSocial() {
  const context = useContext(SocialContext);

  if (!context) {
    throw new Error("useSocial must be used inside SocialProvider");
  }

  return context;
}
