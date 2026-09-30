import { loadIndex, send, siteUrlFrom, supabaseGet, withMeta } from "./_lib/meta.js";

// Link previews for invite links, squad invites, profiles, squads and events.
// vercel.json sends those URLs here; people still get the normal app, just
// with a preview that matches the link.

const clean = (value, pattern = /[^A-Za-z0-9_.-]/g) => String(value || "").replace(pattern, "").slice(0, 64);
const levelOf = (xp) => Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 50)) + 1;
const nameOf = (profile) => profile?.display_name?.trim() || profile?.username || "";

async function findProfile(username) {
  if (!username) return null;
  const rows = await supabaseGet(
    `profiles?select=username,display_name,xp,referral_count,bio,site_banned&username=eq.${encodeURIComponent(username)}&limit=1`
  );
  const profile = Array.isArray(rows) ? rows[0] : null;
  return profile && !profile.site_banned ? profile : null;
}

async function findSquad(tag) {
  if (!tag) return null;
  const rows = await supabaseGet(
    `squads?select=id,name,tag,emblem,description&tag=eq.${encodeURIComponent(tag.toUpperCase())}&limit=1`
  );
  const squad = Array.isArray(rows) ? rows[0] : null;
  if (!squad) return null;
  const members = await supabaseGet(`squad_members?select=user_id&squad_id=eq.${squad.id}`);
  return { ...squad, members: Array.isArray(members) ? members.length : null };
}

async function buildMeta(query, siteUrl) {
  const kind = query.kind;
  const image = `${siteUrl}/og-image.png`;

  if (kind === "invite") {
    const ref = clean(query.ref);
    const tag = clean(query.squad, /[^A-Za-z0-9]/g).slice(0, 4);
    const [inviter, squad] = await Promise.all([findProfile(ref), findSquad(tag)]);
    const who = nameOf(inviter) || "A friend";
    const url = `${siteUrl}/?${new URLSearchParams({ ...(ref && { ref }), ...(tag && { squad: tag }) })}`;

    if (squad) {
      return {
        url,
        image,
        title: `${who} invited you to join ${squad.emblem} ${squad.name} [${squad.tag}] on Suffrova`,
        description: `Team up in weekly Squad Wars: chat, voice calls, 3D avatars and real prizes. ${
          squad.members != null ? `${squad.members}/30 members. ` : ""
        }Free to join.`,
      };
    }

    return {
      url,
      image,
      title: `${who} invited you to Suffrova 🎁`,
      description: `Join ${who} on Suffrova: chat and call with friends, build your 3D avatar and win real prizes. Free to join.`,
    };
  }

  if (kind === "profile") {
    const profile = await findProfile(clean(query.username));
    if (!profile) return null;
    const name = nameOf(profile);
    const bits = [`Level ${levelOf(profile.xp)}`, `${profile.referral_count || 0} invites`];
    const bio = profile.bio?.trim();
    return {
      url: `${siteUrl}/u/${encodeURIComponent(profile.username)}`,
      image,
      title: `${name}${name !== profile.username ? ` (@${profile.username})` : ""} on Suffrova`,
      description: `${bits.join(" · ")}${bio ? ` · ${bio}` : ""}. Add them on Suffrova to chat, call and play.`,
    };
  }

  if (kind === "squad") {
    const squad = await findSquad(clean(query.tag, /[^A-Za-z0-9]/g).slice(0, 4));
    if (!squad) return null;
    return {
      url: `${siteUrl}/squads/${squad.tag}`,
      image,
      title: `${squad.emblem} ${squad.name} [${squad.tag}] · Squad on Suffrova`,
      description: `${squad.members != null ? `${squad.members}/30 members. ` : ""}${
        squad.description?.trim() || "Join the squad and battle other squads in weekly Squad Wars."
      }`,
    };
  }

  if (kind === "event") {
    const id = clean(query.id);
    const rows = id
      ? await supabaseGet(`events?select=id,title,subtitle,description,prize,image&id=eq.${encodeURIComponent(id)}&limit=1`)
      : null;
    const event = Array.isArray(rows) ? rows[0] : null;
    if (!event) return null;
    const picture = /^https?:\/\//.test(event.image || "")
      ? event.image
      : event.image?.startsWith("/")
        ? `${siteUrl}${event.image}`
        : image;
    return {
      url: `${siteUrl}/events/${encodeURIComponent(event.id)}`,
      image: picture,
      title: `${event.title}${event.prize ? ` · ${event.prize}` : ""} on Suffrova`,
      description:
        event.subtitle?.trim() ||
        event.description?.trim()?.slice(0, 180) ||
        "Invite friends, climb the board and win real prizes.",
    };
  }

  return null;
}

export default async function handler(req, res) {
  const siteUrl = siteUrlFrom(req);
  const html = await loadIndex(siteUrl);
  if (!html) return res.status(500).send("Could not load Suffrova.");

  const meta = await buildMeta(req.query || {}, siteUrl).catch(() => null);

  // Unknown user/squad/event: the normal page with the normal preview.
  return send(res, meta ? withMeta(html, meta) : html);
}
