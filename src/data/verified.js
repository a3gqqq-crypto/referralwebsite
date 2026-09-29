// Verified membership: $7 per 30 days. The tick evolves with consecutive
// months (the server resets the count after a 30+ day lapse).
export const VERIFIED_ITEM_ID = "verified-month";

export const VERIFIED_TIERS = [
  { id: "bronze", name: "Bronze", months: 1, colors: ["#e6a06a", "#a15a24"] },
  { id: "silver", name: "Silver", months: 2, colors: ["#f2f4f8", "#9aa3b0"] },
  { id: "gold", name: "Gold", months: 3, colors: ["#ffe27a", "#e39b00"] },
  { id: "platinum", name: "Platinum", months: 6, colors: ["#d7fbff", "#5fb3c9"] },
  { id: "diamond", name: "Diamond", months: 12, colors: ["#8fd8ff", "#6a5cff"] },
  { id: "legend", name: "Legend", months: 24, colors: ["#ff4d8d", "#ffd166"] },
];

export const isVerified = (player) =>
  Boolean(player?.verified_until) && new Date(player.verified_until) > new Date();

// The tier someone shows right now (null if not verified).
export function verifiedTier(player) {
  if (!isVerified(player)) return null;
  const months = Math.max(1, player.verified_months || 1);
  return [...VERIFIED_TIERS].reverse().find((tier) => months >= tier.months) || VERIFIED_TIERS[0];
}

export const nextVerifiedTier = (tier) => {
  const index = VERIFIED_TIERS.findIndex((item) => item.id === tier?.id);
  return VERIFIED_TIERS[index + 1] || null;
};

export function verifiedDaysLeft(player) {
  if (!isVerified(player)) return 0;
  return Math.ceil((new Date(player.verified_until) - new Date()) / 86400000);
}
