// Shared helpers for link previews (WhatsApp, Instagram, iMessage...).
// Those apps read the page's <meta> tags without running any JavaScript, so
// these functions serve index.html with tags written for the specific link.

export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function siteUrlFrom(req) {
  const host = req.headers?.host || "www.suffrova.com";
  const proto = req.headers?.["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

// Read-only Supabase REST call with the public (anon) key. Returns null on any failure.
export async function supabaseGet(path, { method = "GET", body } = {}) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  try {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

// Removes the page's default title/description/og/twitter tags and adds these.
export function withMeta(html, { title, description, url, image, imageAlt = "Suffrova" }) {
  const meta = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Suffrova" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  `;

  return html
    .replace(/<title[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s[^>]*?(?:name|property)\s*=\s*"(?:description|og:[^"]*|twitter:[^"]*)"[^>]*>/gi, "")
    .replace(/<link\s[^>]*?rel\s*=\s*"canonical"[^>]*>/gi, "")
    .replace("</head>", `${meta}</head>`);
}

// index.html from the deployed site (a static file, so this never loops).
export async function loadIndex(siteUrl) {
  try {
    const response = await fetch(`${siteUrl}/index.html`);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

export function send(res, html) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).send(html);
}
