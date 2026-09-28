import { Link } from "react-router-dom";

import Icon from "../Icon";
import { useMyProfile } from "../../context/ProfileContext";
import { parseDicebear } from "../../data/avatarParts";
import { drawFullBody } from "../../lib/avatarRender";

const SAMPLES = [
  { body: "girl", hair: "ponytail", hairColor: "8f3b1b", skin: "f9cfae", top: "crop", topColor: "e2537f", bottom: "jeans", cheeks: "blush", pose: "wave" },
  { hair: "curly", hairColor: "1f1612", skin: "915a37", top: "hoodie", topColor: "2a9d8f", bottom: "joggers", bottomColor: "1f1f24", pose: "peace" },
  { body: "girl", hair: "bun", hairColor: "e0b965", skin: "eeb892", top: "dress", topColor: "8a5cf0", cheeks: "blush", pose: "hips" },
];

// Nudges people who haven't built a full-body avatar yet.
function AvatarCard() {
  const { profile, loading } = useMyProfile();

  if (loading || !profile || parseDicebear(profile.avatar)?.s === "fb") return null;

  return (
    <section className="avatar-card card">
      <div className="avatar-card-crew" aria-hidden="true">
        {SAMPLES.map((sample, index) => (
          <img key={index} src={drawFullBody(sample, "full")} alt="" draggable="false" />
        ))}
      </div>

      <div className="avatar-card-text">
        <strong>Make your avatar</strong>
        <span>Guy or girl, hair, fits and poses. It shows on your profile, in chat and in calls.</span>
      </div>

      <Link to="/profile?avatar=make" className="btn btn-sm btn-primary">
        <Icon name="sparkles" size={15} />
        Make mine
      </Link>
    </section>
  );
}

export default AvatarCard;
