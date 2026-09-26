import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import FriendButton from "../components/FriendButton";
import SkeletonRows from "../components/SkeletonRows";
import { PLAYER_COLUMNS } from "../components/PlayerChip";
import {
  BadgeRow,
  FramedAvatar,
  ProfileBanner,
  StyledName,
} from "../components/Cosmetics";
import { LevelBadge } from "../components/Level";
import StaffTag from "../components/StaffTag";
import { displayNameOf, equippedFrom } from "../data/cosmetics";
import { useSocial } from "../context/SocialContext";

import "../styles/people.css";

const COLUMNS = `${PLAYER_COLUMNS}, equipped_banner, bio`;

// Matches usernames and display names. Keeps only letters, numbers, spaces and
// underscores so nothing can act as a LIKE wildcard or break the PostgREST filter.
const toPattern = (query) =>
  query.replace(/[^\p{L}\p{N} _]/gu, "").replace(/\s+/g, " ").trim();

function PersonCard({ person }) {
  const equipped = equippedFrom(person);
  const href = `/u/${encodeURIComponent(person.username)}`;
  const name = displayNameOf(person);

  return (
    <article className="person-card">
      <Link to={href} className="person-card-link" aria-label={`View ${name}'s profile`}>
        <ProfileBanner banner={equipped.banner} className="person-card-banner" />

        <div className="person-card-id">
          <FramedAvatar
            name={name}
            frame={equipped.frame}
            avatar={equipped.avatar}
            size={58}
          />

          <div className="person-card-name">
            <StyledName name={name} effect={equipped.name} />
            <span className="person-card-tags">
              <StaffTag userId={person.id} />
              <LevelBadge xp={person.xp} />
              <BadgeRow ids={equipped.badges} size={18} />
            </span>
          </div>
        </div>

        <p className="person-card-meta">
          <span className="mono">{person.referral_count || 0}</span>{" "}
          {person.referral_count === 1 ? "referral" : "referrals"}
          {person.bio && <span className="person-card-bio"> · {person.bio}</span>}
        </p>
      </Link>

      <div className="person-card-actions">
        <FriendButton profile={person} size="sm" />
      </div>
    </article>
  );
}

function PersonGrid({ people, loading, empty, rail = false }) {
  if (loading) return <SkeletonRows count={3} />;

  if (!people.length) {
    return <p className="people-empty">{empty}</p>;
  }

  return (
    <div className={`people-grid ${rail ? "is-rail" : ""}`}>
      {people.map((person) => (
        <PersonCard key={person.id} person={person} />
      ))}
    </div>
  );
}

function PeoplePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";

  const { me, friends, incoming } = useSocial();

  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [top, setTop] = useState([]);
  const [leveled, setLeveled] = useState([]);
  const [newest, setNewest] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      supabase
        .from("profiles")
        .select(COLUMNS)
        .not("username", "is", null)
        .order("referral_count", { ascending: false })
        .limit(9),
      supabase
        .from("profiles")
        .select(COLUMNS)
        .not("username", "is", null)
        .order("created_at", { ascending: false })
        .limit(9),
      supabase
        .from("profiles")
        .select(COLUMNS)
        .not("username", "is", null)
        .order("xp", { ascending: false })
        .limit(9),
    ]).then(([topResult, newResult, levelResult]) => {
      if (cancelled) return;

      setTop((topResult.data || []).filter((person) => person.id !== me));
      setNewest((newResult.data || []).filter((person) => person.id !== me));
      setLeveled((levelResult.data || []).filter((person) => person.id !== me));
      setLoadingLists(false);
    });

    return () => {
      cancelled = true;
    };
  }, [me]);

  useEffect(() => {
    const pattern = toPattern(query.trim());

    if (!pattern) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(COLUMNS)
        .or(`username.ilike."%${pattern}%",display_name.ilike."%${pattern}%"`)
        .not("username", "is", null)
        .order("referral_count", { ascending: false })
        .limit(24);

      if (cancelled) return;

      if (error) console.error(error);

      setResults(data || []);
      setSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <main className="page people-page">
      <header className="page-header">
        <span className="eyebrow">People</span>

        <h1>
          Find your <span className="mark">people.</span>
        </h1>

        <p>
          Look anyone up, check out their profile, and add
          them as a friend to start a chat.
        </p>
      </header>

      <div className="people-search">
        <Icon name="search" size={20} />

        <input
          type="search"
          value={query}
          onChange={(event) =>
            setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })
          }
          placeholder="Search by name"
          aria-label="Search by name"
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {(incoming.length > 0 || friends.length > 0) && !query && (
        <p className="people-social-note">
          {incoming.length > 0 && (
            <Link to="/chat">
              {incoming.length} friend {incoming.length === 1 ? "request" : "requests"} waiting
            </Link>
          )}
          {incoming.length > 0 && friends.length > 0 && " · "}
          {friends.length > 0 && `${friends.length} ${friends.length === 1 ? "friend" : "friends"}`}
        </p>
      )}

      {query ? (
        <section className="people-section">
          <h2 className="people-section-title">
            Results for “{query}”
          </h2>

          <PersonGrid
            people={results}
            loading={searching}
            empty="Nobody by that name. Check the spelling?"
          />
        </section>
      ) : (
        <>
          <section className="people-section">
            <h2 className="people-section-title">Top inviters</h2>
            <PersonGrid people={top} loading={loadingLists} empty="No one yet." rail />
          </section>

          <section className="people-section">
            <h2 className="people-section-title">Highest levels</h2>
            <PersonGrid people={leveled} loading={loadingLists} empty="No one yet." rail />
          </section>

          <section className="people-section">
            <h2 className="people-section-title">Just joined</h2>
            <PersonGrid people={newest} loading={loadingLists} empty="No one yet." rail />
          </section>
        </>
      )}
    </main>
  );
}

export default PeoplePage;
