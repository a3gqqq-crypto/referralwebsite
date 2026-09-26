// Sends a password reset email for an email address or a username.
//
// Logged-out people call this, so it runs without a user token. It never
// says whether an account exists and never returns an email address; it
// always answers { ok: true }. Supabase's own email limits still apply.

import { createClient } from "npm:@supabase/supabase-js@2";

const SITES = [
  "https://www.joinvexora.com",
  "https://joinvexora.com",
  "http://localhost:5173",
];

function corsFor(origin: string) {
  return {
    "Access-Control-Allow-Origin": SITES.includes(origin) ? origin : SITES[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = { ...corsFor(origin), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers });
  }

  const done = () => new Response(JSON.stringify({ ok: true }), { headers });

  let login = "";

  try {
    login = String((await req.json())?.login ?? "").trim();
  } catch {
    return done();
  }

  if (!login || login.length > 254) return done();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  let email: string | null = login.includes("@") ? login : null;

  if (!email) {
    // Usernames are unique ignoring case; escape LIKE wildcards so this is an exact match.
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", login.replace(/[%_\\]/g, "\\$&"))
      .maybeSingle();

    if (profile) {
      const { data } = await admin.auth.admin.getUserById(profile.id);
      email = data?.user?.email ?? null;
    }
  }

  if (email) {
    const redirectTo = SITES.includes(origin) ? `${origin}/` : `${SITES[0]}/`;
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) console.error("Password reset email failed:", error.message);
  }

  return done();
});
