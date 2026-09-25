// Level L needs 50 * (L - 1)^2 total XP. Mirrors the SQL used in reports.
export const xpForLevel = (level) => 50 * (level - 1) ** 2;

export const TIERS = [
  { id: "bronze", name: "Bronze", minLevel: 1, icon: "medal" },
  { id: "silver", name: "Silver", minLevel: 5, icon: "medal" },
  { id: "gold", name: "Gold", minLevel: 10, icon: "star" },
  { id: "platinum", name: "Platinum", minLevel: 15, icon: "sparkles" },
  { id: "diamond", name: "Diamond", minLevel: 20, icon: "gem" },
  { id: "legend", name: "Legend", minLevel: 30, icon: "crown" },
];

export const XP_RULES = [
  { icon: "link", label: "Someone joins with your link", xp: "+100" },
  { icon: "users", label: "You join through someone's link", xp: "+50" },
  { icon: "flame", label: "Daily check-in (streaks add up to +30)", xp: "+10–40" },
  { icon: "star", label: "Daily quests (+40 bonus for all three)", xp: "+15–60" },
  { icon: "trophy", label: "Join an event", xp: "+25" },
  { icon: "heart", label: "Make a Moment (up to 3 a day)", xp: "+15" },
  { icon: "users", label: "Make a friend (up to 5 a day)", xp: "+15" },
  { icon: "chat", label: "Chat in the Lounge (up to 20 XP a day)", xp: "+2" },
];

export function levelInfo(xp = 0) {
  const total = Math.max(0, Number(xp) || 0);
  const level = Math.floor(Math.sqrt(total / 50)) + 1;

  const tier = [...TIERS].reverse().find((item) => level >= item.minLevel) || TIERS[0];
  const nextTier = TIERS.find((item) => item.minLevel > level) || null;

  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);

  return {
    xp: total,
    level,
    tier,
    nextTier,
    progress: (total - floor) / (ceiling - floor),
    toNext: ceiling - total,
  };
}
