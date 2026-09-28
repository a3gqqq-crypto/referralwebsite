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

/* ---------- Full-body avatar (the main avatar maker) ---------- */

const SKINS = ["ffe0cc", "f9cfae", "eeb892", "d99c6f", "b97a4f", "915a37", "6b3f26", "4a2a18"];
const HAIR_COLORS = ["1f1612", "3b2417", "6b4226", "8f3b1b", "c98b3c", "e0b965", "efe3c2", "9a9a9a", "f07ca8", "d63b3b", "8a5cf0", "4f7cf0", "3fb37f"];
const EYE_COLORS = ["5b3a22", "2a1d1a", "8a6d3b", "3b6fb6", "3f8f5a", "7b5cc4"];
const CLOTHES = ["f4f4f4", "1f1f24", "8a8f98", "1f2433", "3f5f95", "4f9cf0", "2a9d8f", "3c6e4f", "7a7a3a", "f2b84b", "f08a4b", "e24b4a", "e2537f", "f7a8c4", "8a5cf0", "d8c3a5", "6b4226"];
const WITH_BOTTOMS = ["hoodie", "tee", "tank", "sweater", "shirt", "crop", "varsity", "tracksuit", "puffer", "bomber", "leather", "jersey", "suit"];

// group: which tab it sits in. view: "full" shows the whole body in option tiles.
export const FB_PARTS = [
  { key: "body", label: "Body", group: "body", view: "full", values: ["guy", "girl"] },
  { key: "skin", label: "Skin", group: "body", color: true, values: SKINS },
  { key: "pose", label: "Pose", group: "body", view: "full", values: ["stand", "wave", "hips", "peace", "flex"] },
  { key: "hair", label: "Hair", group: "hair", values: ["short", "fade", "buzz", "spiky", "sidepart", "curly", "mohawk", "manbun", "afro", "long", "bob", "bun", "ponytail", "pigtails", "braids", "curlylong", "bald"] },
  { key: "hairColor", label: "Colour", group: "hair", color: true, values: HAIR_COLORS },
  { key: "facialHair", label: "Beard", group: "hair", optional: true, values: ["stubble", "mustache", "goatee", "beard"] },
  { key: "eyes", label: "Eyes", group: "face", values: ["normal", "happy", "wink", "sleepy", "star", "hearts"] },
  { key: "eyeColor", label: "Eye colour", group: "face", color: true, values: EYE_COLORS },
  { key: "brows", label: "Brows", group: "face", values: ["normal", "raised", "flat", "angry", "sad"] },
  { key: "mouth", label: "Mouth", group: "face", values: ["smile", "grin", "open", "smirk", "tongue", "flat"] },
  { key: "cheeks", label: "Cheeks", group: "face", optional: true, values: ["blush", "freckles"] },
  { key: "hat", label: "Hats", group: "extras", optional: true, values: ["cap", "bandana", "bucket", "headband", "beanie", "catears", "headphones", "horns", "crown", "halo"] },
  { key: "hatColor", label: "Hat colour", group: "extras", color: true, values: CLOTHES, showIf: { hat: ["cap", "bandana", "bucket", "headband", "beanie", "catears"] } },
  { key: "glasses", label: "Glasses", group: "extras", optional: true, values: ["round", "square", "sunglasses", "aviators", "heart", "eyepatch"] },
  { key: "earrings", label: "Earrings", group: "extras", optional: true, values: ["studs", "hoops"] },
  { key: "necklace", label: "Necklace", group: "extras", optional: true, values: ["pearls", "chain"] },
  { key: "top", label: "Top", group: "outfit", view: "full", values: ["hoodie", "tee", "tank", "sweater", "shirt", "crop", "dress", "varsity", "tracksuit", "puffer", "bomber", "leather", "jersey", "suit"] },
  { key: "topColor", label: "Top colour", group: "outfit", color: true, values: CLOTHES },
  { key: "bottom", label: "Bottoms", group: "outfit", view: "full", values: ["jeans", "joggers", "shorts", "skirt", "ripped", "trackpants", "cargo"], showIf: { top: WITH_BOTTOMS } },
  { key: "bottomColor", label: "Bottoms colour", group: "outfit", color: true, values: CLOTHES, showIf: { top: WITH_BOTTOMS } },
  { key: "shoes", label: "Shoes", group: "outfit", view: "full", values: ["sneakers", "slides", "boots", "hightops"] },
  { key: "shoeColor", label: "Shoe colour", group: "outfit", color: true, values: CLOTHES },
];

export const FB_GROUPS = [
  { id: "body", label: "Body" },
  { id: "hair", label: "Hair" },
  { id: "face", label: "Face" },
  { id: "extras", label: "Extras" },
  { id: "outfit", label: "Outfit" },
  { id: "bg", label: "Background" },
];

export const FB_DEFAULTS = {
  guy: { body: "guy", skin: "eeb892", pose: "stand", hair: "short", hairColor: "3b2417", facialHair: "", eyes: "normal", eyeColor: "5b3a22", brows: "normal", mouth: "smile", cheeks: "", hat: "", hatColor: "e24b4a", glasses: "", earrings: "", necklace: "", top: "hoodie", topColor: "e2537f", bottom: "jeans", bottomColor: "3f5f95", shoes: "sneakers", shoeColor: "f4f4f4", bg: "sky" },
  girl: { body: "girl", skin: "f9cfae", pose: "stand", hair: "long", hairColor: "3b2417", facialHair: "", eyes: "normal", eyeColor: "5b3a22", brows: "normal", mouth: "smile", cheeks: "blush", hat: "", hatColor: "f7a8c4", glasses: "", earrings: "studs", necklace: "", top: "tee", topColor: "f4f4f4", bottom: "skirt", bottomColor: "1f1f24", shoes: "sneakers", shoeColor: "f4f4f4", bg: "peach" },
};

const FB_STYLE = { label: "Suffrova", parts: FB_PARTS, defaults: FB_DEFAULTS.guy };

const styleDef = (style) => (style === "fb" ? FB_STYLE : AVATAR_STYLES[style]);

// Stored values -> what the drawing code wants (valid ids, "#" colours).
export function fullBodyOptions(stored) {
  const merged = { ...FB_DEFAULTS.guy, ...stored };
  const out = {};
  for (const part of FB_PARTS) {
    let value = merged[part.key];
    if (value && !part.values.includes(value)) value = FB_DEFAULTS.guy[part.key];
    if (!value && !part.optional) value = FB_DEFAULTS.guy[part.key];
    out[part.key] = part.color ? `#${value}` : value || "";
  }
  if (out.hair === "bald") out.hair = "";
  const bg = BACKGROUNDS.find((item) => item.id === merged.bg) || BACKGROUNDS[0];
  return { options: out, bg: bg.colors };
}

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

  "fb.glasses.sunglasses": "avatar-shades",
  "fb.glasses.aviators": "avatar-shades",
  "fb.glasses.heart": "avatar-shades",
  "fb.hat.beanie": "avatar-winter",
  "fb.top.puffer": "avatar-winter",
  "fb.shoes.boots": "avatar-winter",
  "fb.earrings.hoops": "avatar-bling",
  "fb.necklace.chain": "avatar-bling",
  "fb.top.bomber": "avatar-drip",
  "fb.top.leather": "avatar-drip",
  "fb.bottom.cargo": "avatar-drip",
  "fb.shoes.hightops": "avatar-drip",
  "fb.hat.catears": "avatar-kawaii",
  "fb.eyes.star": "avatar-kawaii",
  "fb.eyes.hearts": "avatar-kawaii",
  "fb.hat.headphones": "avatar-glowbot",
  "fb.top.jersey": "avatar-glowbot",
  "fb.hat.horns": "avatar-villain",
  "fb.glasses.eyepatch": "avatar-villain",
  "fb.hat.crown": "avatar-royal",
  "fb.hat.halo": "avatar-royal",
  "fb.top.suit": "avatar-royal",
  "fb.pose.peace": "avatar-poses",
  "fb.pose.flex": "avatar-poses",
  "fb.top.varsity": "avatar-street",
  "fb.bottom.ripped": "avatar-street",
  "fb.hat.bucket": "avatar-street",
  "fb.top.tracksuit": "avatar-sporty",
  "fb.bottom.trackpants": "avatar-sporty",
  "fb.hat.headband": "avatar-sporty",
};

export function premiumFor(style, key, value) {
  if (!value) return null;
  if (key === "bg") return BACKGROUNDS.find((bg) => bg.id === value)?.premium || null;
  return PREMIUM_PARTS[`${style}.${key}.${value}`] || null;
}

// What each avatar pack unlocks, for shop previews.
const fbPreview = (o) => ({ s: "fb", o });

// What each avatar pack unlocks, for shop previews.
export const PACK_PREVIEW = {
  "avatar-shades": fbPreview({ glasses: "aviators", hair: "sidepart", bg: "sand" }),
  "avatar-winter": fbPreview({ hat: "beanie", hatColor: "f7a8c4", top: "puffer", topColor: "4f9cf0", shoes: "boots", shoeColor: "6b4226", bg: "sky" }),
  "avatar-bling": fbPreview({ ...FB_DEFAULTS.girl, earrings: "hoops", necklace: "chain", top: "crop", topColor: "1f1f24", bg: "gold" }),
  "avatar-drip": fbPreview({ top: "bomber", topColor: "3c6e4f", bottom: "cargo", bottomColor: "8a8f98", shoes: "hightops", shoeColor: "e24b4a", bg: "night" }),
  "avatar-kawaii": fbPreview({ ...FB_DEFAULTS.girl, hat: "catears", hatColor: "f4f4f4", eyes: "hearts", hair: "pigtails", hairColor: "f07ca8", bg: "candy" }),
  "avatar-glowbot": fbPreview({ hat: "headphones", top: "jersey", topColor: "8a5cf0", hair: "spiky", hairColor: "4f7cf0", pose: "flex", bg: "night" }),
  "avatar-villain": fbPreview({ hat: "horns", glasses: "eyepatch", top: "leather", topColor: "1f1f24", brows: "angry", mouth: "smirk", bg: "night" }),
  "avatar-gradients": fbPreview({ bg: "sunset" }),
  "avatar-royal": fbPreview({ hat: "crown", top: "suit", topColor: "1f2433", bottomColor: "1f2433", shoes: "boots", shoeColor: "1f1f24", bg: "gold" }),
  "avatar-poses": fbPreview({ pose: "peace", bg: "mint" }),
  "avatar-street": fbPreview({ top: "varsity", topColor: "e24b4a", bottom: "ripped", bottomColor: "3f5f95", hat: "bucket", hatColor: "1f1f24", bg: "sand" }),
  "avatar-sporty": fbPreview({ ...FB_DEFAULTS.girl, top: "tracksuit", topColor: "2a9d8f", bottom: "trackpants", bottomColor: "2a9d8f", hat: "headband", hatColor: "f4f4f4", hair: "ponytail", bg: "mint" }),
};

export const packPreviewAvatar = (id) =>
  PACK_PREVIEW[id] ? `db:${JSON.stringify(PACK_PREVIEW[id])}` : null;

export function parseDicebear(avatar) {
  if (!avatar?.startsWith("db:")) return null;

  try {
    const data = JSON.parse(avatar.slice(3));
    const def = styleDef(data?.s);
    if (!def) return null;
    return { s: data.s, o: { ...def.defaults, ...(data.o || {}) } };
  } catch {
    return null;
  }
}

// Only keeps values that differ from the style defaults, so the string stays short.
export function encodeDicebear(style, options) {
  const defaults = styleDef(style).defaults;
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
// look: what a full-body avatar changes into while doing the emote.
// frames: optional sequence of looks it cycles through (a little dance).
export const EMOTES = [
  { id: "wave", emoji: "👋", name: "Wave", anim: "wave", look: { pose: "wave", mouth: "grin" } },
  { id: "laugh", emoji: "😂", name: "Laugh", anim: "bounce", look: { eyes: "happy", mouth: "open" } },
  { id: "gg", emoji: "🎉", name: "GG", anim: "pop", look: { pose: "peace", eyes: "happy", mouth: "grin" },
    frames: [{ pose: "peace", eyes: "happy", mouth: "grin" }, { pose: "flex", eyes: "happy", mouth: "open" }] },
  { id: "dance", emoji: "💃", name: "Dance", anim: "dance", premium: "emote-dance", look: { pose: "flex", eyes: "happy", mouth: "smile" },
    frames: [
      { pose: "flex", eyes: "happy", mouth: "smile" },
      { pose: "hips", eyes: "happy", mouth: "open" },
      { pose: "wave", eyes: "happy", mouth: "grin" },
      { pose: "peace", eyes: "wink", mouth: "tongue" },
    ] },
  { id: "love", emoji: "😍", name: "Love", anim: "pulse", premium: "emote-love", look: { eyes: "hearts", mouth: "grin" } },
  { id: "cry", emoji: "😭", name: "Cry", anim: "shake", premium: "emote-cry", look: { eyes: "sleepy", brows: "sad", mouth: "open" } },
  { id: "rage", emoji: "😡", name: "Rage", anim: "rage", premium: "emote-rage", look: { brows: "angry", mouth: "flat", pose: "hips" },
    frames: [{ brows: "angry", mouth: "flat", pose: "hips" }, { brows: "angry", mouth: "open", pose: "flex" }] },
  { id: "fire", emoji: "🔥", name: "On fire", anim: "pulse", premium: "emote-fire", look: { pose: "flex", brows: "raised", mouth: "grin" } },
  { id: "crown", emoji: "👑", name: "Crowned", anim: "spin", premium: "emote-crown", look: { hat: "crown", pose: "hips", mouth: "smirk" } },
  { id: "shock", emoji: "😱", name: "Shook", anim: "jump", premium: "emote-shock", look: { brows: "raised", mouth: "open", pose: "flex" } },
  { id: "sleepy", emoji: "😴", name: "Sleepy", anim: "sway", premium: "emote-sleepy", look: { eyes: "sleepy", mouth: "flat" } },
  { id: "clap", emoji: "👏", name: "Clap", anim: "bounce", premium: "emote-clap", look: { pose: "flex", eyes: "happy", mouth: "open" },
    frames: [{ pose: "flex", eyes: "happy", mouth: "open" }, { pose: "hips", eyes: "happy", mouth: "grin" }] },
  { id: "cool", emoji: "😎", name: "Too cool", anim: "pop", premium: "emote-cool", look: { glasses: "sunglasses", pose: "peace", mouth: "smirk" } },
  { id: "money", emoji: "💸", name: "Rich", anim: "spin", premium: "emote-money", look: { eyes: "star", pose: "hips", mouth: "grin" },
    frames: [{ eyes: "star", pose: "hips", mouth: "grin" }, { eyes: "star", pose: "peace", mouth: "open" }] },
  { id: "skull", emoji: "💀", name: "Dead", anim: "fall", premium: "emote-skull", look: { eyes: "sleepy", mouth: "tongue" } },
];

export const emoteById = (id) => EMOTES.find((emote) => emote.id === id) || null;

export const EMOTE_RE = /^::emote:([a-z]+)::$/;

export const emoteFromBody = (body) => {
  const match = EMOTE_RE.exec(body || "");
  return match ? emoteById(match[1]) : null;
};

// A full-body avatar string changed into an emote's look (null for other avatars).
export function emoteAvatar(avatar, emote) {
  const parsed = parseDicebear(avatar);
  if (parsed?.s !== "fb" || !emote?.look) return null;
  return { o: { ...parsed.o, ...emote.look }, avatar: `db:${JSON.stringify({ s: "fb", o: { ...parsed.o, ...emote.look } })}` };
}

export const canUseEmote = (emote, owned) => !emote.premium || owned?.has(emote.premium);
