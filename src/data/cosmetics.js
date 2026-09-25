// Keep in sync with the `cosmetics` table — the server trusts the DB copy, not this file.

export const PURCHASES_ENABLED = false;
export const CURRENCY = "USD";

export const SLOTS = {
  frame: { label: "Frames", single: "Frame" },
  name: { label: "Name effects", single: "Name effect" },
  banner: { label: "Banners", single: "Banner" },
  badge: { label: "Badges", single: "Badge" },
};

export const MAX_BADGES = 3;

export const COSMETICS = [
  /* ---------- Frames ---------- */
  {
    id: "frame-gilded",
    type: "frame",
    name: "Gilded",
    description: "A clean ring of polished gold.",
    rarity: "rare",
    price: 199,
  },
  {
    id: "frame-ember",
    type: "frame",
    name: "Ember",
    description: "Warm, glowing, a little dangerous.",
    rarity: "rare",
    price: 199,
  },
  {
    id: "frame-frost",
    type: "frame",
    name: "Frost",
    description: "Ice-blue edge with a cold shimmer.",
    rarity: "rare",
    price: 199,
  },
  {
    id: "frame-aurora",
    type: "frame",
    name: "Aurora",
    description: "A slowly turning ring of northern lights.",
    rarity: "epic",
    price: 299,
  },
  {
    id: "frame-crowned",
    type: "frame",
    name: "Crowned",
    description: "Gold ring, and a crown on top. Subtle.",
    rarity: "legendary",
    price: 499,
  },
  {
    id: "frame-podium",
    type: "frame",
    name: "Podium",
    description: "Only for players who finished top 3 in an event.",
    rarity: "legendary",
    price: null,
    earn: { manual: true, label: "Finish top 3 in an event" },
  },

  /* ---------- Name effects ---------- */
  {
    id: "name-gold",
    type: "name",
    name: "Gold leaf",
    description: "Your name, in gold.",
    rarity: "rare",
    price: 149,
  },
  {
    id: "name-ember",
    type: "name",
    name: "Ember",
    description: "Hot gradient with a soft glow.",
    rarity: "rare",
    price: 149,
  },
  {
    id: "name-frost",
    type: "name",
    name: "Frost",
    description: "Cool blue with an icy sheen.",
    rarity: "rare",
    price: 149,
  },
  {
    id: "name-aurora",
    type: "name",
    name: "Aurora",
    description: "Colors that drift through your name.",
    rarity: "epic",
    price: 249,
  },
  {
    id: "name-holo",
    type: "name",
    name: "Holographic",
    description: "A light sweep that catches every eye.",
    rarity: "legendary",
    price: 399,
  },

  /* ---------- Banners ---------- */
  {
    id: "banner-dusk",
    type: "banner",
    name: "Dusk",
    description: "Last light over the city.",
    rarity: "common",
    price: 99,
  },
  {
    id: "banner-rose",
    type: "banner",
    name: "Rose quartz",
    description: "Soft pinks and warm haze.",
    rarity: "common",
    price: 99,
  },
  {
    id: "banner-ocean",
    type: "banner",
    name: "Deep sea",
    description: "Dark teal depths.",
    rarity: "rare",
    price: 149,
  },
  {
    id: "banner-golddust",
    type: "banner",
    name: "Gold dust",
    description: "Midnight scattered with gold.",
    rarity: "rare",
    price: 199,
  },
  {
    id: "banner-aurora",
    type: "banner",
    name: "Aurora",
    description: "Moving light across the whole header.",
    rarity: "epic",
    price: 249,
  },

  /* ---------- Badges ---------- */
  {
    id: "badge-first",
    type: "badge",
    name: "First invite",
    description: "Brought your first person in.",
    rarity: "common",
    icon: "link",
    price: null,
    earn: { referrals: 1, label: "Get 1 referral" },
  },
  {
    id: "badge-recruiter",
    type: "badge",
    name: "Recruiter",
    description: "Ten people joined because of you.",
    rarity: "rare",
    icon: "users",
    price: null,
    earn: { referrals: 10, label: "Get 10 referrals" },
  },
  {
    id: "badge-legend",
    type: "badge",
    name: "Legend",
    description: "Fifty referrals. Actual legend.",
    rarity: "legendary",
    icon: "crown",
    price: null,
    earn: { referrals: 50, label: "Get 50 referrals" },
  },
  {
    id: "badge-early",
    type: "badge",
    name: "Early",
    description: "Here before it was cool.",
    rarity: "epic",
    icon: "sparkles",
    price: null,
    earn: { joinedBefore: "2026-11-01", label: "Join before Nov 2026" },
  },
  {
    id: "badge-podium",
    type: "badge",
    name: "Podium",
    description: "Finished top 3 in an event.",
    rarity: "legendary",
    icon: "trophy",
    price: null,
    earn: { manual: true, label: "Finish top 3 in an event" },
  },
  {
    id: "badge-supporter",
    type: "badge",
    name: "Supporter",
    description: "Helped keep Vexora running.",
    rarity: "rare",
    icon: "heart",
    price: 99,
  },
  {
    id: "badge-flame",
    type: "badge",
    name: "On fire",
    description: "For when you're on a streak.",
    rarity: "common",
    icon: "flame",
    price: 99,
  },
  {
    id: "badge-star",
    type: "badge",
    name: "Star",
    description: "Main character energy.",
    rarity: "common",
    icon: "star",
    price: 99,
  },
  {
    id: "badge-gem",
    type: "badge",
    name: "Gem",
    description: "Rare and a little flashy.",
    rarity: "epic",
    icon: "gem",
    price: 149,
  },
];

export const RARITY_LABEL = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const BY_ID = new Map(COSMETICS.map((item) => [item.id, item]));

export const cosmeticById = (id) => BY_ID.get(id) || null;

export const cosmeticsOfType = (type) =>
  COSMETICS.filter((item) => item.type === type);

export function formatPrice(cents) {
  if (cents == null) return "";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: CURRENCY,
  }).format(cents / 100);
}

// Drops unknown or retired ids coming back from the database.
export function equippedFrom(profile) {
  const valid = (id, type) =>
    cosmeticById(id)?.type === type ? id : null;

  return {
    frame: valid(profile?.equipped_frame, "frame"),
    name: valid(profile?.equipped_name, "name"),
    banner: valid(profile?.equipped_banner, "banner"),
    badges: (profile?.equipped_badges || [])
      .filter((id) => cosmeticById(id)?.type === "badge")
      .slice(0, MAX_BADGES),
    avatar: profile?.avatar || null,
  };
}

export const PROFILE_COLUMNS =
  "id, username, referral_count, created_at, bio, equipped_frame, equipped_name, equipped_banner, equipped_badges, xp, checkin_streak, avatar";
