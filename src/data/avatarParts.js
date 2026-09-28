// Avatar maker: 4 DiceBear styles, each with pickable parts.
// Stored in profiles.avatar as `db:` + JSON: {"s": style, "o": {part: value}}.
// Premium values must match the avatar_premium table (the server checks ownership).

const range = (prefix, from, to) => {
  const list = [];
  for (let n = from; n <= to; n += 1) list.push(`${prefix}${String(n).padStart(2, "0")}`);
  return list;
};

export const BACKGROUNDS = [
  { id: "sky", colors: ["b6e3f4"] },
  { id: "peach", colors: ["ffd5dc"] },
  { id: "mint", colors: ["c0f0d6"] },
  { id: "lilac", colors: ["d1d4f9"] },
  { id: "sand", colors: ["ffdfbf"] },
  { id: "night", colors: ["1f2433"] },
  { id: "sunset", colors: ["ff7a59", "ffb36b"], premium: "avatar-gradients" },
  { id: "ocean", colors: ["2193b0", "6dd5ed"], premium: "avatar-gradients" },
  { id: "aurora", colors: ["43e97b", "38f9d7"], premium: "avatar-gradients" },
  { id: "candy", colors: ["f78ca0", "fe9a8b"], premium: "avatar-gradients" },
  { id: "gold", colors: ["f6d365", "fda085"], premium: "avatar-gradients" },
  { id: "galaxy", colors: ["5f2c82", "49a09d"], premium: "avatar-gradients" },
];

// kind: "part" (optional → can be "none"), "color".
export const AVATAR_STYLES = {
  avataaars: {
    label: "Cartoon",
    parts: [
      { key: "top", label: "Hair & hats", optional: "topProbability", values: ["shortFlat", "shortWaved", "shortCurly", "shortRound", "theCaesar", "theCaesarAndSidePart", "sides", "shavedSides", "frizzle", "shaggy", "shaggyMullet", "dreads", "dreads01", "dreads02", "fro", "froBand", "bob", "bun", "curly", "curvy", "bigHair", "frida", "longButNotTooLong", "miaWallace", "straight01", "straight02", "straightAndStrand", "hijab", "turban", "hat", "winterHat1", "winterHat02", "winterHat03", "winterHat04"] },
      { key: "hairColor", label: "Hair colour", color: true, values: ["2c1b18", "4a312c", "724133", "a55728", "b58143", "d6b370", "c93305", "f59797", "ecdcbf", "e8e1e1"] },
      { key: "skinColor", label: "Skin", color: true, values: ["ffdbb4", "edb98a", "d08b5b", "ae5d29", "614335", "fd9841", "f8d25c"] },
      { key: "eyes", label: "Eyes", values: ["default", "happy", "wink", "winkWacky", "squint", "side", "surprised", "closed", "eyeRoll", "hearts", "cry", "xDizzy"] },
      { key: "eyebrows", label: "Eyebrows", values: ["default", "defaultNatural", "flatNatural", "raisedExcited", "raisedExcitedNatural", "angry", "angryNatural", "frownNatural", "sadConcerned", "sadConcernedNatural", "unibrowNatural", "upDown", "upDownNatural"] },
      { key: "mouth", label: "Mouth", values: ["smile", "default", "twinkle", "tongue", "eating", "serious", "concerned", "disbelief", "grimace", "sad", "screamOpen", "vomit"] },
      { key: "facialHair", label: "Beard", optional: "facialHairProbability", values: ["beardLight", "beardMedium", "beardMajestic", "moustacheFancy", "moustacheMagnum"] },
      { key: "accessories", label: "Glasses", optional: "accessoriesProbability", values: ["prescription01", "prescription02", "round", "kurt", "sunglasses", "wayfarers", "eyepatch"] },
      { key: "clothing", label: "Outfit", values: ["hoodie", "shirtCrewNeck", "shirtScoopNeck", "shirtVNeck", "collarAndSweater", "blazerAndShirt", "blazerAndSweater", "overall", "graphicShirt"] },
      { key: "clothingGraphic", label: "Tee print", values: ["skull", "skullOutline", "bat", "bear", "deer", "diamond", "pizza", "hola", "cumbia", "resist"], showIf: { clothing: "graphicShirt" } },
      { key: "clothesColor", label: "Outfit colour", color: true, values: ["262e33", "3c4f5c", "25557c", "5199e4", "65c9ff", "b1e2ff", "a7ffc4", "ffffb1", "ffafb9", "ff488e", "ff5c5c", "929598", "e6e6e6", "ffffff"] },
    ],
    defaults: { top: "shortFlat", hairColor: "2c1b18", skinColor: "edb98a", eyes: "default", eyebrows: "default", mouth: "smile", facialHair: "", accessories: "", clothing: "hoodie", clothingGraphic: "skull", clothesColor: "5199e4", bg: "sky" },
  },
  adventurer: {
    label: "Anime",
    parts: [
      { key: "hair", label: "Hair", values: [...range("short", 1, 19), ...range("long", 1, 26)] },
      { key: "hairColor", label: "Hair colour", color: true, values: ["0e0e0e", "562306", "6a4e35", "796a45", "ac6511", "cb6820", "ab2a18", "b9a05f", "e5d7a3", "afafaf", "3eac2c", "85c2c6", "dba3be", "592454"] },
      { key: "skinColor", label: "Skin", color: true, values: ["f2d3b1", "ecad80", "9e5622", "763900"] },
      { key: "eyes", label: "Eyes", values: range("variant", 1, 26) },
      { key: "eyebrows", label: "Eyebrows", values: range("variant", 1, 15) },
      { key: "mouth", label: "Mouth", values: range("variant", 1, 30) },
      { key: "glasses", label: "Glasses", optional: "glassesProbability", values: range("variant", 1, 5) },
      { key: "earrings", label: "Earrings", optional: "earringsProbability", values: range("variant", 1, 6) },
      { key: "features", label: "Extras", optional: "featuresProbability", values: ["freckles", "birthmark", "mustache", "blush"] },
    ],
    defaults: { hair: "short01", hairColor: "0e0e0e", skinColor: "f2d3b1", eyes: "variant01", eyebrows: "variant01", mouth: "variant01", glasses: "", earrings: "", features: "", bg: "lilac" },
  },
  bigSmile: {
    label: "Big smile",
    parts: [
      { key: "hair", label: "Hair", values: ["shortHair", "curlyShortHair", "mohawk", "bowlCutHair", "shavedHead", "halfShavedHead", "bangs", "wavyBob", "curlyBob", "straightHair", "braids", "bunHair", "froBun"] },
      { key: "hairColor", label: "Hair colour", color: true, values: ["220f00", "3a1a00", "71472d", "e2ba87", "d56c0c", "e9b729", "605de4", "238d80"] },
      { key: "skinColor", label: "Skin", color: true, values: ["ffe4c0", "f5d7b1", "efcc9f", "e2ba87", "c99c62", "a47539", "8c5a2b", "643d19"] },
      { key: "eyes", label: "Eyes", values: ["cheery", "normal", "winking", "starstruck", "confused", "sleepy", "sad", "angry"] },
      { key: "mouth", label: "Mouth", values: ["openedSmile", "teethSmile", "gapSmile", "awkwardSmile", "unimpressed", "openSad", "braces", "kawaii"] },
      { key: "accessories", label: "Extras", optional: "accessoriesProbability", values: ["glasses", "mustache", "sleepMask", "sunglasses", "clownNose", "catEars", "sailormoonCrown", "faceMask"] },
    ],
    defaults: { hair: "shortHair", hairColor: "220f00", skinColor: "efcc9f", eyes: "cheery", mouth: "openedSmile", accessories: "", bg: "peach" },
  },
  bottts: {
    label: "Robot",
    parts: [
      { key: "baseColor", label: "Colour", color: true, values: ["1e88e5", "039be5", "00acc1", "00897b", "43a047", "7cb342", "c0ca33", "fdd835", "ffb300", "fb8c00", "f4511e", "e53935", "d81b60", "8e24aa", "5e35b1", "3949ab", "546e7a", "757575", "6d4c41"] },
      { key: "face", label: "Head", values: ["round01", "round02", "square01", "square02", "square03", "square04"] },
      { key: "eyes", label: "Eyes", values: ["round", "happy", "bulging", "dizzy", "frame1", "frame2", "roundFrame01", "roundFrame02", "robocop", "sensor", "shade01", "hearts", "eva", "glow"] },
      { key: "mouth", label: "Mouth", optional: "mouthProbability", values: ["smile01", "smile02", "bite", "square01", "square02", "grill01", "grill02", "grill03", "diagram"] },
      { key: "top", label: "Top", optional: "topProbability", values: ["antenna", "antennaCrooked", "bulb01", "pyramid", "radar", "lights", "glowingBulb01", "glowingBulb02", "horns"] },
      { key: "sides", label: "Sides", optional: "sidesProbability", values: ["antenna01", "antenna02", "cables01", "cables02", "round", "square", "squareAssymetric"] },
      { key: "texture", label: "Texture", optional: "textureProbability", values: ["dots", "circuits", "dirty01", "dirty02", "grunge01", "grunge02", "camo01", "camo02"] },
    ],
    defaults: { baseColor: "1e88e5", face: "round01", eyes: "round", mouth: "smile01", top: "antenna", sides: "antenna01", texture: "", bg: "mint" },
  },
};

export const STYLE_IDS = Object.keys(AVATAR_STYLES);

// "style.part.value" -> cosmetic id. Mirror of the avatar_premium table.
export const PREMIUM_PARTS = {
  "avataaars.accessories.sunglasses": "avatar-shades",
  "avataaars.accessories.wayfarers": "avatar-shades",
  "avataaars.accessories.kurt": "avatar-shades",
  "bigSmile.accessories.sunglasses": "avatar-shades",
  "avataaars.top.hat": "avatar-winter",
  "avataaars.top.winterHat1": "avatar-winter",
  "avataaars.top.winterHat02": "avatar-winter",
  "avataaars.top.winterHat03": "avatar-winter",
  "avataaars.top.winterHat04": "avatar-winter",
  "bigSmile.accessories.catEars": "avatar-kawaii",
  "bigSmile.accessories.sailormoonCrown": "avatar-kawaii",
  "bigSmile.mouth.kawaii": "avatar-kawaii",
  "adventurer.features.blush": "avatar-kawaii",
  ...Object.fromEntries(range("variant", 1, 6).map((value) => [`adventurer.earrings.${value}`, "avatar-bling"])),
  "avataaars.clothing.graphicShirt": "avatar-drip",
  "bottts.top.glowingBulb01": "avatar-glowbot",
  "bottts.top.glowingBulb02": "avatar-glowbot",
  "bottts.top.lights": "avatar-glowbot",
  "bottts.eyes.glow": "avatar-glowbot",
  "bottts.eyes.eva": "avatar-glowbot",
  "avataaars.accessories.eyepatch": "avatar-villain",
  "bottts.top.horns": "avatar-villain",
  "bottts.texture.camo01": "avatar-villain",
  "bottts.texture.camo02": "avatar-villain",
  "bigSmile.accessories.faceMask": "avatar-villain",
  "bigSmile.accessories.clownNose": "avatar-villain",
};

export function premiumFor(style, key, value) {
  if (!value) return null;
  if (key === "bg") return BACKGROUNDS.find((bg) => bg.id === value)?.premium || null;
  return PREMIUM_PARTS[`${style}.${key}.${value}`] || null;
}

// What each avatar pack unlocks, for shop previews.
export const PACK_PREVIEW = {
  "avatar-shades": { s: "avataaars", o: { accessories: "wayfarers", top: "shortWaved", bg: "sand" } },
  "avatar-winter": { s: "avataaars", o: { top: "winterHat02", clothesColor: "ff5c5c", bg: "sky" } },
  "avatar-kawaii": { s: "bigSmile", o: { accessories: "catEars", mouth: "kawaii", hairColor: "605de4", bg: "peach" } },
  "avatar-bling": { s: "adventurer", o: { earrings: "variant03", hair: "long05", bg: "lilac" } },
  "avatar-drip": { s: "avataaars", o: { clothing: "graphicShirt", clothingGraphic: "skull", clothesColor: "262e33", accessories: "round", bg: "night" } },
  "avatar-glowbot": { s: "bottts", o: { top: "glowingBulb01", eyes: "glow", baseColor: "5e35b1", bg: "night" } },
  "avatar-villain": { s: "bottts", o: { top: "horns", texture: "camo01", baseColor: "e53935", eyes: "robocop", bg: "night" } },
  "avatar-gradients": { s: "avataaars", o: { bg: "sunset" } },
};

export const packPreviewAvatar = (id) =>
  PACK_PREVIEW[id] ? `db:${JSON.stringify(PACK_PREVIEW[id])}` : null;

export function parseDicebear(avatar) {
  if (!avatar?.startsWith("db:")) return null;

  try {
    const data = JSON.parse(avatar.slice(3));
    if (!AVATAR_STYLES[data?.s]) return null;
    return { s: data.s, o: { ...AVATAR_STYLES[data.s].defaults, ...(data.o || {}) } };
  } catch {
    return null;
  }
}

// Only keeps values that differ from the style defaults, so the string stays short.
export function encodeDicebear(style, options) {
  const defaults = AVATAR_STYLES[style].defaults;
  const o = {};
  for (const [key, value] of Object.entries(options)) {
    if (key in defaults && value !== defaults[key]) o[key] = value;
  }
  return `db:${JSON.stringify({ s: style, o })}`;
}

// Turns stored choices into DiceBear options. Unknown values fall back to the
// default so a typo can never make DiceBear pick something random.
export function dicebearOptions(style, stored) {
  const def = AVATAR_STYLES[style];
  const merged = { ...def.defaults, ...stored };
  const options = { seed: "suffrova", radius: 0 };

  for (const part of def.parts) {
    let value = merged[part.key];
    if (value && !part.values.includes(value)) value = def.defaults[part.key];

    if (part.optional) {
      options[part.optional] = value ? 100 : 0;
      if (value) options[part.key] = [value];
      else options[part.key] = [part.values[0]];
    } else {
      options[part.key] = [value || part.values[0]];
    }
  }

  if (style === "avataaars") {
    options.hatColor = options.clothesColor;
    options.facialHairColor = options.hairColor;
    options.accessoriesColor = ["262e33"];
  }

  const bg = BACKGROUNDS.find((item) => item.id === merged.bg) || BACKGROUNDS[0];
  options.backgroundColor = bg.colors;
  options.backgroundType = [bg.colors.length > 1 ? "gradientLinear" : "solid"];

  return options;
}

// Emotes: free ones for everyone, the rest are shop items (cosmetic id "emote-<id>").
export const EMOTES = [
  { id: "wave", emoji: "👋", name: "Wave", anim: "wave" },
  { id: "laugh", emoji: "😂", name: "Laugh", anim: "bounce" },
  { id: "gg", emoji: "🎉", name: "GG", anim: "pop" },
  { id: "dance", emoji: "💃", name: "Dance", anim: "dance", premium: "emote-dance" },
  { id: "love", emoji: "😍", name: "Love", anim: "pulse", premium: "emote-love" },
  { id: "cry", emoji: "😭", name: "Cry", anim: "shake", premium: "emote-cry" },
  { id: "rage", emoji: "😡", name: "Rage", anim: "rage", premium: "emote-rage" },
  { id: "fire", emoji: "🔥", name: "On fire", anim: "pulse", premium: "emote-fire" },
  { id: "crown", emoji: "👑", name: "Crowned", anim: "spin", premium: "emote-crown" },
];

export const emoteById = (id) => EMOTES.find((emote) => emote.id === id) || null;

export const EMOTE_RE = /^::emote:([a-z]+)::$/;

export const emoteFromBody = (body) => {
  const match = EMOTE_RE.exec(body || "");
  return match ? emoteById(match[1]) : null;
};

export const canUseEmote = (emote, owned) => !emote.premium || owned?.has(emote.premium);
