// Hands out LiveKit access tokens for calls, after checking the person may join:
// - "lounge": anyone signed in who isn't banned or muted from chat
// - a call id: only members of that call (friends who were invited), while it's live
// Also lets hosts (their call) and staff (the lounge) remove someone from a call.
//
// Needs the secrets LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.

import { createClient } from "npm:@supabase/supabase-js@2";

const SITES = ["https://www.suffrova.com", "https://suffrova.com", "http://localhost:5173"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsFor(origin: string) {
  return {
    "Access-Control-Allow-Origin": SITES.includes(origin) ? origin : SITES[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

const b64urlJson = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));

// LiveKit tokens are HS256 JWTs signed with the API secret.
async function signToken(apiKey: string, apiSecret: string, claims: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64urlJson({ alg: "HS256", typ: "JWT" })}.${b64urlJson({ iss: apiKey, nbf: now - 10, exp: now + 6 * 3600, ...claims })}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));

  return `${body}.${b64url(signature)}`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = { ...corsFor(origin), "Content-Type": "application/json" };
  const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  const livekitUrl = Deno.env.get("LIVEKIT_URL");
  const apiKey = Deno.env.get("LIVEKIT_API_KEY");
  const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

  if (!livekitUrl || !apiKey || !apiSecret) {
    return reply({ status: "not_configured", message: "Calls are coming soon." });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(jwt);
  const userId = auth?.user?.id;

  if (!userId) return reply({ status: "error", message: "Please log in again." }, 401);

  let body: { room?: string; action?: string; identity?: string } = {};

  try {
    body = await req.json();
  } catch {
    return reply({ status: "error", message: "Bad request." }, 400);
  }

  const roomKey = String(body.room ?? "");
  const isLounge = roomKey === "lounge";

  if (!isLounge && !UUID.test(roomKey)) return reply({ status: "error", message: "Call not found." });

  const livekitRoom = isLounge ? "suffrova-lounge" : `call-${roomKey.toLowerCase()}`;

  const [{ data: me }, { data: staffRow }] = await Promise.all([
    admin
      .from("profiles")
      .select("username, display_name, avatar, equipped_frame, chat_banned, chat_muted_until")
      .eq("id", userId)
      .maybeSingle(),
    admin.from("admins").select("role").eq("user_id", userId).maybeSingle(),
  ]);

  if (!me) return reply({ status: "error", message: "Profile not found." });

  const isStaff = Boolean(staffRow);
  let isHost = false;

  if (isLounge) {
    if (me.chat_banned) return reply({ status: "error", message: "Your chat access has been turned off." });
    if (me.chat_muted_until && new Date(me.chat_muted_until) > new Date()) {
      return reply({ status: "error", message: "You're muted right now, so you can't join voice." });
    }
  } else {
    const { data: call } = await admin.from("calls").select("host_id, created_at, ended_at").eq("id", roomKey).maybeSingle();

    const live = call && !call.ended_at && Date.now() - new Date(call.created_at).getTime() < 12 * 3600 * 1000;
    if (!live) return reply({ status: "error", message: "This call has ended." });

    const { data: member } = await admin
      .from("call_members")
      .select("user_id")
      .eq("call_id", roomKey)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) return reply({ status: "error", message: "You weren't invited to this call." });

    isHost = call.host_id === userId;
  }

  const canModerate = isLounge ? isStaff : isHost;

  // Remove someone from the room (host of a call, or staff in the lounge).
  if (body.action === "kick") {
    if (!canModerate) return reply({ status: "error", message: "You can't remove people from this call." });

    const identity = String(body.identity ?? "");
    if (!UUID.test(identity) || identity === userId) return reply({ status: "error", message: "Pick someone else." });

    const adminToken = await signToken(apiKey, apiSecret, { sub: userId, video: { roomAdmin: true, room: livekitRoom } });
    const httpUrl = livekitUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");

    const res = await fetch(`${httpUrl}/twirp/livekit.RoomService/RemoveParticipant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ room: livekitRoom, identity }),
    });

    if (!res.ok) {
      console.error("RemoveParticipant failed:", res.status, await res.text());
      return reply({ status: "error", message: "Couldn't remove them. They may have left already." });
    }

    return reply({ status: "ok" });
  }

  const token = await signToken(apiKey, apiSecret, {
    sub: userId,
    name: me.display_name || me.username,
    metadata: JSON.stringify({ username: me.username, avatar: me.avatar, frame: me.equipped_frame }),
    video: { room: livekitRoom, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true },
  });

  return reply({ status: "ok", token, url: livekitUrl, room: livekitRoom, isHost, canModerate });
});
