export default async function handler(req, res) {
  const momentId =
    req.query?.momentId ||
    req.url?.split("?")[0]?.split("/").filter(Boolean).pop();

  const cleanMomentId = String(momentId || "").replace(
    /[^a-zA-Z0-9]/g,
    ""
  );

  if (!cleanMomentId) {
    return res.status(400).send("Missing Moment ID.");
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const requestHost =
    req.headers?.host || "www.joinvexora.com";

  const forwardedProto =
    req.headers?.["x-forwarded-proto"] || "https";

  const siteUrl =
    `${forwardedProto}://${requestHost}`;

  const momentsImage =
    `${siteUrl}/events/moments-event.png`;

  let creatorName = "Someone";
  let fromName = "Someone";
  let toName = "you";

  if (supabaseUrl && supabaseKey) {
    try {
      const query =
        `${supabaseUrl}/rest/v1/moments` +
        `?id=eq.${encodeURIComponent(cleanMomentId)}` +
        `&select=creator_username,from_name,to_name,expires_at` +
        `&limit=1`;

      const response = await fetch(query, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const rows = await response.json();

        if (Array.isArray(rows) && rows[0]) {
          const moment = rows[0];

          creatorName =
            moment.creator_username ||
            moment.from_name ||
            "Someone";

          fromName =
            moment.from_name ||
            moment.creator_username ||
            "Someone";

          toName =
            moment.to_name ||
            "you";
        }
      }
    } catch {
      // Use generic preview text if Supabase cannot be reached.
    }
  }

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const title =
    `${fromName} made you a Vexora Moment ✦`;

  const description =
    `A little message from ${creatorName}, made to be shared. ` +
    `Open your Vexora Moment and see what they created.`;

  const canonicalUrl =
    `${siteUrl}/m/${encodeURIComponent(cleanMomentId)}`;

  let html;

  try {
    const indexResponse =
      await fetch(`${siteUrl}/index.html`);

    if (!indexResponse.ok) {
      return res.status(500).send("Could not load Vexora.");
    }

    html = await indexResponse.text();
  } catch {
    return res.status(500).send("Could not load Vexora.");
  }

  const metadata = `
    <title>${escapeHtml(title)}</title>

    <meta
      name="description"
      content="${escapeHtml(description)}"
    />

    <link
      rel="canonical"
      href="${escapeHtml(canonicalUrl)}"
    />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Vexora" />

    <meta
      property="og:title"
      content="${escapeHtml(title)}"
    />

    <meta
      property="og:description"
      content="${escapeHtml(description)}"
    />

    <meta
      property="og:url"
      content="${escapeHtml(canonicalUrl)}"
    />

    <meta
      property="og:image"
      content="${escapeHtml(momentsImage)}"
    />

    <meta
      property="og:image:secure_url"
      content="${escapeHtml(momentsImage)}"
    />

    <meta
      property="og:image:type"
      content="image/png"
    />

    <meta
      property="og:image:alt"
      content="Vexora Moments"
    />

    <meta
      name="twitter:card"
      content="summary_large_image"
    />

    <meta
      name="twitter:title"
      content="${escapeHtml(title)}"
    />

    <meta
      name="twitter:description"
      content="${escapeHtml(description)}"
    />

    <meta
      name="twitter:image"
      content="${escapeHtml(momentsImage)}"
    />

    <meta
      name="twitter:image:alt"
      content="Vexora Moments"
    />
  `;

  html = html.replace(
    /<title[\s\S]*?<\/title>/i,
    ""
  );

  html = html.replace(
    "</head>",
    `${metadata}</head>`
  );

  res.setHeader(
    "Content-Type",
    "text/html; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600"
  );

  return res.status(200).send(html);
}