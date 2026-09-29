import { useId } from "react";

import { VERIFIED_TIERS, verifiedTier } from "../data/verified";

// Scalloped seal around the centre.
function sealPath(bumps, outer = 11.4, inner = 9.5) {
  let d = "";
  for (let i = 0; i <= bumps * 2; i += 1) {
    const angle = (Math.PI * i) / bumps - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = (12 + Math.cos(angle) * r).toFixed(2);
    const y = (12 + Math.sin(angle) * r).toFixed(2);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return `${d} Z`;
}

const FACET = { stroke: "rgba(255,255,255,0.5)", strokeWidth: 0.6, fill: "none", strokeLinejoin: "round" };

// Each tier looks different, like Nitro badges: seals that gain points,
// then cut gems, then an iridescent opal.
function Shape({ shape, fill }) {
  switch (shape) {
    case "seal8":
    case "seal10":
    case "seal12":
      return (
        <>
          <path d={sealPath(Number(shape.slice(4)))} fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" strokeLinejoin="round" />
          {shape === "seal12" && <circle cx="12" cy="12" r="7.6" {...FACET} />}
        </>
      );
    case "crest":
      return (
        <>
          <circle cx="12" cy="12" r="11.3" fill="none" stroke={fill} strokeWidth="1.1" />
          <path d={sealPath(12, 10, 8.4)} fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M 12 0.2 L 13.4 2.6 L 12 4.2 L 10.6 2.6 Z" fill={fill} />
          <circle cx="12" cy="12" r="6.8" {...FACET} />
        </>
      );
    case "diamond":
      return (
        <>
          <path d="M 12 22.6 L 1.6 8.6 L 6.4 2.4 L 17.6 2.4 L 22.4 8.6 Z" fill={fill} stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M 1.6 8.6 L 22.4 8.6 M 6.4 2.4 L 9 8.6 L 12 2.4 L 15 8.6 L 17.6 2.4 M 9 8.6 L 12 22.6 L 15 8.6" {...FACET} />
        </>
      );
    case "emerald":
      return (
        <>
          <path d="M 7.5 1.6 L 16.5 1.6 L 22.4 7.5 L 22.4 16.5 L 16.5 22.4 L 7.5 22.4 L 1.6 16.5 L 1.6 7.5 Z" fill={fill} stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M 9 5 L 15 5 L 19 9 L 19 15 L 15 19 L 9 19 L 5 15 L 5 9 Z M 7.5 1.6 L 9 5 M 16.5 1.6 L 15 5 M 22.4 7.5 L 19 9 M 22.4 16.5 L 19 15 M 16.5 22.4 L 15 19 M 7.5 22.4 L 9 19 M 1.6 16.5 L 5 15 M 1.6 7.5 L 5 9" {...FACET} />
        </>
      );
    case "ruby": {
      const star = Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI * i) / 4;
        return `M 12 12 L ${(12 + Math.cos(a) * 10.8).toFixed(2)} ${(12 + Math.sin(a) * 10.8).toFixed(2)}`;
      }).join(" ");
      return (
        <>
          <circle cx="12" cy="12" r="11.2" fill={fill} stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" />
          <path d={star} {...FACET} strokeWidth="0.45" />
          <circle cx="12" cy="12" r="6" {...FACET} />
        </>
      );
    }
    case "opal":
      return (
        <>
          <ellipse cx="12" cy="12" rx="11.2" ry="11.4" fill={fill} stroke="rgba(255,255,255,0.6)" strokeWidth="0.7" />
          <ellipse cx="8.5" cy="7.5" rx="4" ry="2.4" fill="rgba(255,255,255,0.55)" transform="rotate(-30 8.5 7.5)" />
          <path d="M 19 4 l 0.6 1.6 1.6 0.6 -1.6 0.6 -0.6 1.6 -0.6 -1.6 -1.6 -0.6 1.6 -0.6 Z" fill="#fff" />
        </>
      );
    default:
      return <path d={sealPath(8)} fill={fill} />;
  }
}

// Pass `player` (with verified_until / verified_since) or a `tier` id.
function VerifiedTick({ player = null, tier: tierId = null, size = 16, title = true }) {
  // React ids contain characters that break url(#…) in some browsers.
  const gradientId = `vt${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tier = tierId ? VERIFIED_TIERS.find((item) => item.id === tierId) : verifiedTier(player);

  if (!tier) return null;

  const [light, dark] = tier.colors;
  const label = `Verified · ${tier.name}`;
  const darkCheck = ["silver", "platinum", "opal"].includes(tier.id);
  const opal = tier.id === "opal";

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
            {opal ? (
              <>
                <stop offset="0" stopColor="#ffd6f5" />
                <stop offset="0.35" stopColor="#c7f5ff" />
                <stop offset="0.65" stopColor="#fff4c2" />
                <stop offset="1" stopColor="#b9c8ff" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor={light} />
                <stop offset="1" stopColor={dark} />
              </>
            )}
          </linearGradient>
        </defs>

        <Shape shape={tier.shape} fill={`url(#${gradientId})`} />

        <path
          d={tier.shape === "diamond" ? "M 8.6 9.2 L 11 11.6 L 15.6 6.8" : "M 7.4 12.3 L 10.6 15.4 L 16.8 8.9"}
          fill="none"
          stroke={darkCheck ? "#2b3340" : "#ffffff"}
          strokeWidth={tier.shape === "diamond" ? 2 : 2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default VerifiedTick;
