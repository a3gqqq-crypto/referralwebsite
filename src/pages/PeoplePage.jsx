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
import { equippedFrom } from "../data/cosmetics";
import { useSocial } from "../context/SocialContext";

import "../styles/people.css";

const COLUMNS = `${PLAYER_COLUMNS}, equipped_banner, bio`;

// Usernames are [a-zA-Z0-9_]; strip anything else so it can't act as a LIKE/PostgREST wildcard.
const toPattern = (query) =>
  query.replace(/[^a-zA-Z0-9_]/g, "").replace(/_/g, "\\_");

function PersonCard({ person }) {
  const equipped = equippedFrom(person);
  const href = `/u/${encodeURIComponent(person.username)}`;

  return (
    <article className="person-card">
      <Link to={href} className="person-card-link" aria-label={`View ${person.username}'s profile`}>
        <ProfileBanner banner={equipped.banner} className="person-card-banner" />

        <div className="person-card-id">
          <FramedAvatar name={person.username} frame={equipped.frame} size={58} />

          <div className="person-card-name">
            <StyledName name={person.username} effect={equipped.name} />
            <BadgeRow ids={equipped.badges} size={18} />
          </div>
        </div>

        <p className="person-card-meta">
          <span className="mono">{person.referral_count || 0}</span> referrals
          {person.bio && <span className="person-card-bio"> · {person.bio}</span>}
        </p>
      </Link>

      <div className="person-card-actions">
        <FriendButton profile={person} size="sm" />
      </div>
    </article>
  );
}

function PersonGrid({ people, loading, empty }) {
  if (loading) return <SkeletonRows count={3} />;

  if (!people.length) {
    return <p className="people-empty">{empty}</p>;
  }

  return (
    <div className="people-grid">
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
    ]).then(([topResult, newResult]) => {
      if (cancelled) return;

      setTop((topResult.data || []).filter((person) => person.id !== me));
      setNewest((newResult.data || []).filter((person) => person.id !== me));
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
        .ilike("username", `%${pattern}%`)
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
          placeholder="Search by username"
          aria-label="Search by username"
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
            <PersonGrid people={top} loading={loadingLists} empty="No one yet." />
          </section>

          <section className="people-section">
            <h2 className="people-section-title">Just joined</h2>
            <PersonGrid people={newest} loading={loadingLists} empty="No one yet." />
          </section>
        </>
      )}
    </main>
  );
}

export default PeoplePage;
