import { dicebearOptions } from "../data/avatarParts";

// Each style downloads only when first needed (see avatarRender.js).
const STYLE_LOADERS = {
  avataaars: () => import("@dicebear/avataaars"),
  adventurer: () => import("@dicebear/adventurer"),
  bigSmile: () => import("@dicebear/big-smile"),
  bottts: () => import("@dicebear/bottts"),
};

const loaded = {};
let core = null;

export async function renderDicebear(style, stored) {
  core ??= import("@dicebear/core");
  loaded[style] ??= STYLE_LOADERS[style]();

  const [{ createAvatar }, styleModule] = await Promise.all([core, loaded[style]]);
  return createAvatar(styleModule, dicebearOptions(style, stored)).toDataUri();
}
