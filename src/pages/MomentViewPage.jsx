import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../styles/moments.css";

const TEMPLATE_META = {
  teacher: { icon: "🌸", label: "TEACHER'S DAY", accent: "pink" },
  special: { icon: "💜", label: "SOMEONE SPECIAL", accent: "purple" },
  friend: { icon: "💙", label: "BEST FRIEND", accent: "blue" },
  birthday: { icon: "🎂", label: "BIRTHDAY", accent: "gold" },
  congrats: { icon: "🏆", label: "CONGRATULATIONS", accent: "green" },
  festival: { icon: "✨", label: "FESTIVAL", accent: "cyan" },
};

function MomentViewPage() {
  const { momentId } = useParams();
  const navigate = useNavigate();
  const [moment, setMoment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMoment = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("moments")
        .select("id, creator_username, from_name, to_name, message, template, created_at, expires_at")
        .eq("id", momentId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setLoading(false);
        setMoment(null);
        return;
      }

      if (new Date(data.expires_at).getTime() <= Date.now()) {
        setExpired(true);
        setMoment(null);
        setLoading(false);
        return;
      }

      setMoment(data);
      setLoading(false);
    };

    loadMoment();

    return () => {
      cancelled = true;
    };
  }, [momentId]);

  const meta = useMemo(
    () => TEMPLATE_META[moment?.template] || TEMPLATE_META.special,
    [moment?.template]
  );

  const publicLink = moment
    ? `${window.location.origin}/m/${moment.id}?ref=${encodeURIComponent(moment.creator_username)}`
    : "";

  const copyLink = async () => {
    if (!publicLink) return;

    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error(error);
    }
  };

  const shareLink = async () => {
    if (!publicLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "A Vexora Moment",
          text: `${moment.from_name} made you a Vexora Moment ✦`,
          url: publicLink,
        });
        return;
      } catch {
        // User cancelled.
      }
    }

    await copyLink();
  };

  const downloadCard = () => {
    if (!moment) return;

    const escaped = (value) =>
      String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const messageLines = [];
    let remaining = moment.message;
    while (remaining.length > 44) {
      let cut = remaining.lastIndexOf(" ", 44);
      if (cut < 20) cut = 44;
      messageLines.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut).trimStart();
    }
    if (remaining) messageLines.push(remaining);

    const messageSvg = messageLines
      .slice(0, 8)
      .map(
        (line, index) =>
          `<text x="600" y="${640 + index * 46}" text-anchor="middle" fill="#efefff" font-size="25" font-family="Arial, sans-serif">${escaped(line)}</text>`
      )
      .join("");

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#08070d"/>
            <stop offset="0.5" stop-color="#17112f"/>
            <stop offset="1" stop-color="#061827"/>
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.45"/>
            <stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="1500" fill="url(#bg)"/>
        <circle cx="950" cy="160" r="360" fill="url(#glow)"/>
        <circle cx="250" cy="1200" r="300" fill="#ec4899" opacity="0.10"/>
        <rect x="70" y="70" width="1060" height="1360" rx="42" fill="#ffffff" fill-opacity="0.035" stroke="#ffffff" stroke-opacity="0.10"/>
        <text x="100" y="140" fill="#c4b5fd" font-size="18" font-weight="700" font-family="Arial, sans-serif" letter-spacing="5">VEXORA MOMENTS</text>
        <text x="1100" y="140" text-anchor="end" fill="#8af0ae" font-size="18" font-family="Arial, sans-serif">SHAREABLE</text>
        <text x="600" y="350" text-anchor="middle" font-size="100">${escaped(meta.icon)}</text>
        <text x="600" y="430" text-anchor="middle" fill="#a78bfa" font-size="18" font-weight="700" font-family="Arial, sans-serif" letter-spacing="4">${escaped(meta.label)}</text>
        <text x="600" y="520" text-anchor="middle" fill="#ffffff" font-size="48" font-weight="700" font-family="Arial, sans-serif">FOR ${escaped(moment.to_name)}</text>
        ${messageSvg}
        <text x="600" y="1080" text-anchor="middle" fill="#c4b5fd" font-size="27" font-family="Arial, sans-serif">— ${escaped(moment.from_name)}</text>
        <line x1="260" x2="940" y1="1160" y2="1160" stroke="#ffffff" stroke-opacity="0.10"/>
        <text x="600" y="1240" text-anchor="middle" fill="#777284" font-size="17" font-family="Arial, sans-serif" letter-spacing="3">MADE WITH VEXORA</text>
        <text x="600" y="1320" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="700" font-family="Arial, sans-serif">joinvexora.com</text>
      </svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vexora-moment-${moment.id}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="moment-view-page">
        <div className="moment-view-loading">Opening your Vexora Moment...</div>
      </main>
    );
  }

  if (expired || !moment) {
    return (
      <main className="moment-view-page">
        <div className="moment-expired-card">
          <div className="moment-expired-icon">⌛</div>
          <div className="moments-section-label">VEXORA MOMENT</div>
          <h1>This Moment has expired.</h1>
          <p>This share link is no longer active. Create a new Moment and give someone another reason to smile.</p>
          <Link to="/" className="moment-main-button">CREATE YOUR OWN →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`moment-view-page ${meta.accent}`}>
      <div className="moment-view-orb orb-a"></div>
      <div className="moment-view-orb orb-b"></div>
      <div className="moment-view-grid"></div>

      <div className="moment-view-content">
        <div className="moment-view-topbar">
          <span>✦ VEXORA MOMENTS</span>
          <span>5 DAY LINK</span>
        </div>

        <section className="moment-reveal-card">
          <div className="moment-reveal-glow"></div>

          <div className="moment-reveal-icon">{meta.icon}</div>
          <div className="moment-reveal-label">{meta.label}</div>
          <h1>For {moment.to_name}</h1>

          <div className="moment-message">
            {moment.message}
          </div>

          <div className="moment-from">— {moment.from_name}</div>

          <div className="moment-reveal-footer">
            <span>MADE WITH VEXORA</span>
            <span>✦</span>
            <span>OPEN · SHARE · CREATE</span>
          </div>
        </section>

        <section className="moment-share-panel">
          <div>
            <div className="moments-section-label">LIKE THIS?</div>
            <h2>Make one for someone else.</h2>
            <p>Create your own Vexora Moment and share it with a unique link.</p>
          </div>

          <div className="moment-share-actions">
            <button type="button" onClick={shareLink}>SHARE</button>
            <button type="button" onClick={copyLink}>{copied ? "✓ COPIED" : "COPY LINK"}</button>
            <button type="button" onClick={downloadCard}>DOWNLOAD</button>
            <button type="button" onClick={() => navigate(`/moments?ref=${encodeURIComponent(moment.creator_username)}`)}>CREATE YOURS</button>
          </div>
        </section>

        <div className="moment-view-referral-note">
          ✦ Shared through <strong>{moment.creator_username}</strong> · New Vexora members who sign up through this Moment support their referrer’s climb.
        </div>
      </div>
    </main>
  );
}

export default MomentViewPage;
