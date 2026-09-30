import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";
import { useOnlineUsers } from "../../lib/presence";
import Icon from "../Icon";
import FriendButton from "../FriendButton";
import { FramedAvatar, StyledName } from "../Cosmetics";
import { LevelBadge } from "../Level";
import { PLAYER_COLUMNS } from "../PlayerChip";
import { useSocial } from "../../context/SocialContext";
import { displayNameOf, equippedFrom } from "../../data/cosmetics";

const SHOW = 6;

// For people with few friends: recently active members to add, so chat,
// groups and calls open up. Hidden once you have 3+ friends.
function PeopleToAdd() {
  const { me, friends, loading, relationWith } = useSocial();
  const online = useOnlineUsers();
  const [people, setPeople] = useState(null);
  const few = !loading && friends.length < 3;

  useEffect(() => {
    if (!few || !me) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select(PLAYER_COLUMNS)
      .not("username", "is", null)
      .eq("site_banned", false)
      .neq("id", me)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(30)
      .then(({ data }) => {
        if (!cancelled) setPeople(data || []);
      });

    return () => {
      cancelled = true;
    };
  }, [few, me]);

  if (!few || !people) return null;

  // Online first, then most recently seen; skip friends and blocks. People you
  // just sent a request to stay, so the button can show "Requested".
  const shown = people
    .filter((person) => ["none", "outgoing"].includes(relationWith(person.id)))
    .sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id)))
    .slice(0, SHOW);

  if (!shown.length) return null;

  return (
    <section className="people-add card">
      <div className="dash-section-head">
        <div>
          <span className="eyebrow">People to add</span>
          <h2>Make some friends 👋</h2>
        </div>
        <Link to="/people" className="dash-more">
          See all <Icon name="arrowRight" size={14} />
        </Link>
      </div>

      <p className="people-add-sub">Friends can message you, call you and make group chats with you.</p>

      <ul className="people-add-list">
        {shown.map((person) => {
          const equipped = equippedFrom(person);
          const name = displayNameOf(person);
          return (
            <li key={person.id} className="people-add-item">
              <Link to={`/u/${encodeURIComponent(person.username)}`} className="people-add-link">
                <span className="people-add-avatar">
                  <FramedAvatar userId={person.id} name={name} frame={equipped.frame} avatar={equipped.avatar} size={52} />
                  {online.has(person.id) && <span className="people-add-online" aria-label="Online" />}
                </span>
                <StyledName name={name} effect={equipped.name} className="people-add-name" />
                <LevelBadge xp={person.xp} />
              </Link>
              <FriendButton profile={person} size="sm" showMessage={false} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default PeopleToAdd;
