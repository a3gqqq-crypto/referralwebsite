import { loadIndex, send, siteUrlFrom, supabaseGet, withMeta } from "./_lib/meta.js";

// Link preview for a shared Moment (/m/:id).
export default async function handler(req, res) {
  const momentId = req.query?.momentId || req.url?.split("?")[0]?.split("/").filter(Boolean).pop();
  const cleanMomentId = String(momentId || "").replace(/[^a-zA-Z0-9]/g, "");

  if (!cleanMomentId) {
    return res.status(400).send("Missing Moment ID.");
  }

  const siteUrl = siteUrlFrom(req);

  let creatorName = "Someone";
  let fromName = "Someone";

  // Moments aren't readable from the table directly; get_moment reads one by its id.
  const rows = await supabaseGet("rpc/get_moment", { method: "POST", body: { p_id: cleanMomentId } });
  if (Array.isArray(rows) && rows[0]) {
    const moment = rows[0];
    creatorName = moment.creator_username || moment.from_name || "Someone";
    fromName = moment.from_name || moment.creator_username || "Someone";
  }

  const html = await loadIndex(siteUrl);
  if (!html) return res.status(500).send("Could not load Suffrova.");

  return send(
    res,
    withMeta(html, {
      title: `${fromName} made you a Suffrova Moment ✦`,
      description: `A little message from ${creatorName}, made to be shared. Open your Suffrova Moment and see what they created.`,
      url: `${siteUrl}/m/${encodeURIComponent(cleanMomentId)}`,
      image: `${siteUrl}/og-moment.png`,
      imageAlt: "Suffrova Moments",
    })
  );
}
