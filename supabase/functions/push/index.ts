// Web Push for Suffrova.
// - { action: "public_key" }: the site's VAPID public key (created on first use)
// - { notification_id }: deliver that notification to the person's devices.
//   A database trigger calls this for every new notification. Each one is sent
//   at most once (pushed_at), so calling it again is harmless.
// Payloads are encrypted per RFC 8291 (aes128gcm) and signed with VAPID (RFC 8292).

import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://www.suffrova.com";
const enc = new TextEncoder();

const b64u = {
  encode(bytes: Uint8Array) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  },
  decode(text: string) {
    const pad = "=".repeat((4 - (text.length % 4)) % 4);
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/") + pad);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  },
};

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};

async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, length);
}

// RFC 8291 aes128gcm (checked against the RFC's Appendix A example).
async function encryptPayload(uaPublic: Uint8Array, authSecret: Uint8Array, plaintext: Uint8Array) {
  const keys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));

  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, keys.privateKey, 256));

  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, concat(plaintext, new Uint8Array([2]))),
  );

  return concat(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPublic.length]), asPublic, cipher);
}

async function vapidJwt(privateJwk: JsonWebKey, audience: string) {
  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64u.encode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64u.encode(
    enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SITE })),
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${payload}`)),
  );
  return `${header}.${payload}.${b64u.encode(signature)}`;
}

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// The site's VAPID key pair; generated once and kept in push_config.
async function getKeys() {
  const { data } = await admin.from("push_config").select("public_key, private_jwk").eq("id", 1).maybeSingle();
  if (data) return data;

  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publicKey = b64u.encode(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

  await admin.from("push_config").upsert({ id: 1, public_key: publicKey, private_jwk: privateJwk }, { onConflict: "id", ignoreDuplicates: true });

  const { data: saved } = await admin.from("push_config").select("public_key, private_jwk").eq("id", 1).single();
  return saved;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  const headers = { ...CORS, "Content-Type": "application/json" };
  const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  let body: { action?: string; notification_id?: number } = {};
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Bad request" }, 400);
  }

  const keys = await getKeys();
  if (!keys) return reply({ error: "No keys" }, 500);

  if (body.action === "public_key") return reply({ publicKey: keys.public_key });

  const id = Number(body.notification_id);
  if (!Number.isInteger(id) || id <= 0) return reply({ error: "Bad id" }, 400);

  // Claim it so it's only ever pushed once.
  const { data: note } = await admin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", id)
    .is("pushed_at", null)
    // Only fresh ones: an old notification should never pop up on a phone.
    .gt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .select("user_id, kind, title, body, link")
    .maybeSingle();

  if (!note) return reply({ status: "skip" });

  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", note.user_id);
  if (!subs?.length) return reply({ status: "no_devices" });

  const isCall = note.kind === "call";
  const plaintext = enc.encode(
    JSON.stringify({ title: note.title, body: note.body || "", url: note.link || "/", kind: note.kind, tag: isCall ? "call" : `n-${id}` }),
  );

  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const payload = await encryptPayload(b64u.decode(sub.p256dh), b64u.decode(sub.auth), plaintext);
        const jwt = await vapidJwt(keys.private_jwk as JsonWebKey, new URL(sub.endpoint).origin);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: isCall ? "60" : "86400",
            Urgency: isCall ? "high" : "normal",
            Authorization: `vapid t=${jwt}, k=${keys.public_key}`,
          },
          body: payload,
        });

        if (res.status === 404 || res.status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else if (res.ok) {
          sent += 1;
        } else {
          console.error("Push failed:", res.status, await res.text());
        }
      } catch (error) {
        console.error("Push error:", error);
      }
    }),
  );

  return reply({ status: "ok", sent });
});
