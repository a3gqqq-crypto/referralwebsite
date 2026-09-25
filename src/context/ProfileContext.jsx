import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../lib/supabaseClient";
import { PROFILE_COLUMNS } from "../data/cosmetics";
import { utcDay } from "../lib/streakDay";
import { prepareAvatarImage } from "../data/avatars";

import "../styles/levels.css";

const ProfileContext = createContext(null);

const today = () => utcDay();

// Keeps only the picture in use; older uploads in the user's folder are deleted.
async function removeOldUploads(userId, current) {
  const keep = current?.startsWith("upload:") ? current.slice(7) : null;
  const { data } = await supabase.storage.from("avatars").list(userId);
  const stale = (data || [])
    .map((file) => `${userId}/${file.name}`)
    .filter((path) => path !== keep);

  if (stale.length) await supabase.storage.from("avatars").remove(stale);
}

export function ProfileProvider({ user, children }) {
  const userId = user?.id;

  const [profile, setProfile] = useState(null);
  const [owned, setOwned] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkin, setCheckin] = useState(null);
  // null until the check comes back, so /admin can wait instead of flashing "not found".
  const [isAdmin, setIsAdmin] = useState(null);
  const checkedIn = useRef(null);

  // Only decides whether to show the Admin link; every admin RPC re-checks on the server.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabase.rpc("is_admin").then(({ data }) => {
      if (!cancelled) setIsAdmin(data === true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;

    // One check-in per day (00:00 UTC reset); a tab left open overnight checks in again.
    const day = today();

    if (checkedIn.current !== day) {
      checkedIn.current = day;

      const { data: reward, error: checkinError } = await supabase.rpc("daily_checkin");

      if (checkinError) {
        console.error("Daily check-in failed:", checkinError);
      } else if (reward?.awarded > 0) {
        setCheckin(reward);
      }
    }

    // Grants any free badges the user now qualifies for; safe to call repeatedly.
    const { error: claimError } = await supabase.rpc("claim_earned_cosmetics");

    if (claimError) {
      console.error("Could not claim earned cosmetics:", claimError);
    }

    const [profileResult, ownedResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(`${PROFILE_COLUMNS}, last_checkin`)
        .eq("id", userId)
        .single(),
      supabase
        .from("user_cosmetics")
        .select("cosmetic_id")
        .eq("user_id", userId),
    ]);

    if (profileResult.error) {
      console.error(profileResult.error);
      setError("Could not load your profile.");
    } else {
      setError("");
      setProfile(profileResult.data);
    }

    if (!ownedResult.error) {
      setOwned(
        new Set((ownedResult.data || []).map((row) => row.cosmetic_id))
      );
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === "visible" && checkedIn.current !== today()) {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [refresh]);

  const callAndRefresh = async (fn, args) => {
    const { error: rpcError } = await supabase.rpc(fn, args);

    if (rpcError) {
      console.error(rpcError);
      return { ok: false, error: rpcError.message };
    }

    await refresh();

    return { ok: true };
  };

  const value = {
    profile,
    owned,
    loading,
    error,
    refresh,
    isAdmin,
    username: profile?.username || user?.user_metadata?.username || "",
    equip: (slot, cosmeticId) =>
      callAndRefresh("equip_cosmetic", {
        p_slot: slot,
        p_cosmetic_id: cosmeticId,
      }),
    setBadges: (badgeIds) =>
      callAndRefresh("set_equipped_badges", { p_badges: badgeIds }),
    saveBio: (bio) =>
      callAndRefresh("update_profile_bio", { p_bio: bio }),
    setAvatar: async (avatar) => {
      const result = await callAndRefresh("set_avatar", { p_avatar: avatar });
      if (result.ok) removeOldUploads(userId, avatar);
      return result;
    },
    uploadAvatar: async (file) => {
      let prepared;

      try {
        prepared = await prepareAvatarImage(file);
      } catch (prepareError) {
        return { ok: false, error: prepareError.message };
      }

      const path = `${userId}/${Date.now()}.${prepared.ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, prepared.blob, { contentType: prepared.blob.type, cacheControl: "31536000" });

      if (uploadError) {
        console.error(uploadError);
        return { ok: false, error: "Upload failed. Try a smaller image." };
      }

      const avatar = `upload:${path}`;
      const result = await callAndRefresh("set_avatar", { p_avatar: avatar });

      if (result.ok) removeOldUploads(userId, avatar);
      else supabase.storage.from("avatars").remove([path]);

      return result;
    },
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}

      {checkin && (
        <div className="xp-toast" role="status" onAnimationEnd={() => setCheckin(null)}>
          <span aria-hidden="true">🔥</span>
          <span>
            Daily check-in <strong>+{checkin.awarded} XP</strong>
            {checkin.streak > 1 ? ` · ${checkin.streak}-day streak` : ""}
          </span>
        </div>
      )}
    </ProfileContext.Provider>
  );
}

export function useMyProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useMyProfile must be used inside ProfileProvider");
  }

  return context;
}
