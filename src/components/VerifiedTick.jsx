import { useId } from "react";

import { VERIFIED_TIERS, verifiedTier } from "../data/verified";

// Scalloped seal (12 bumps) around a check mark, like a verified badge.
function sealPath(cx, cy, outer, inner, bumps = 12) {
  let d = "";
  for (let i = 0; i <= bumps * 2; i += 1) {
    const angle = (Math.PI * i) / bumps - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = (cx + Math.cos(angle) * r).toFixed(2);
    const y = (cy + Math.sin(angle) * r).toFixed(2);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return `${d} Z`;
}

const SEAL = sealPath(12, 12, 11.5, 9.6);

// Pass `player` (with verified_until / verified_months) or a `tier` id.
function VerifiedTick({ player = null, tier: tierId = null, size = 16, title = true }) {
  // React ids contain characters that break url(#…) in some browsers.
  const gradientId = `vt${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tier = tierId ? VERIFIED_TIERS.find((item) => item.id === tierId) : verifiedTier(player);

  if (!tier) return null;

  const [light, dark] = tier.colors;
  const label = `Verified · ${tier.name}`;

  return (
    <span
      className={`verified-tick tick-${tier.id}`}
      style={{ "--tick-size": `${size}px` }}
      role="img"
      aria-label={label}
      title={title ? label : undefined}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
        </defs>
        <path d={SEAL} fill={`url(#${gradientId})`} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" strokeLinejoin="round" />
        <path
          d="M 7.4 12.3 L 10.6 15.4 L 16.8 8.9"
          fill="none"
          stroke={tier.id === "silver" || tier.id === "platinum" ? "#2b3340" : "#ffffff"}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default VerifiedTick;
