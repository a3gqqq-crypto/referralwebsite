// Dates carry an explicit offset (IST) so every visitor sees the same start/end,
// and the event leaderboard counts only referrals made inside that window.
export const events = [
  {
    id: "top-inviter-2",

    title: "Vexora Top Inviter · Round 2",

    subtitle: "EVERYONE STARTS AT ZERO.",

    description:
      "Round 2 is on. Only invites made during these 15 days count — invite the most new members and finish top three to win cash.",

    prize: "$35 Total",

    startDate: "2026-09-25T20:00:00+05:30",

    endDate: "2026-10-10T20:00:00+05:30",

    image: "/events/summer.png",

    buttonText: "JOIN EVENT",

    active: true,

    type: "referral",

    rules: {
      ranking: "referrals_during_event",

      winners: [
        { position: 1, reward: "$20" },
        { position: 2, reward: "$10" },
        { position: 3, reward: "$5" },
      ],
    },
  },

  {
    id: "top-inviter",

    title: "Vexora Top Inviter",

    subtitle: "INVITE THE MOST. WIN THE MOST.",

    description:
      "Invite new members to Vexora, climb the referral leaderboard, and finish in the top three to win cash rewards.",

    prize: "$35 Total",

    startDate: "2026-08-27T00:00:00+05:30",

    endDate: "2026-09-11T23:59:59+05:30",

    image: "/events/summer.png",

    buttonText: "JOIN EVENT",

    active: true,

    type: "referral",

    rules: {
      ranking: "referrals_during_event",

      winners: [
        {
          position: 1,
          reward: "$20",
        },
        {
          position: 2,
          reward: "$10",
        },
        {
          position: 3,
          reward: "$5",
        },
      ],
    },
  },

  /*
   * =========================================
   * FUTURE EVENTS
   * =========================================
   *
   * Copy an event below when creating a new one.
   *
   * {
   *   id: "halloween",
   *
   *   title: "Halloween Mayhem",
   *
   *   subtitle: "SPOOKY SEASON",
   *
   *   description:
   *     "Compete in the Halloween event and win exclusive rewards.",
   *
   *   prize: "$50 Total",
   *
   *   startDate: "2026-10-01T00:00:00",
   *
   *   endDate: "2026-10-15T23:59:59",
   *
   *   image: "/events/halloween.png",
   *
   *   buttonText: "JOIN EVENT",
   *
   *   active: true,
   *
   *   type: "custom",
   * }
   */
];

// The event the nav "Leaderboard" link should open: live, else next up, else most recent.
export function featuredEvent(now = new Date()) {
  const active = events.filter((event) => event.active);
  const start = (event) => new Date(event.startDate);
  const end = (event) => new Date(event.endDate);

  const live = active.find((event) => start(event) <= now && now <= end(event));
  if (live) return live;

  const upcoming = active
    .filter((event) => start(event) > now)
    .sort((a, b) => start(a) - start(b))[0];
  if (upcoming) return upcoming;

  return [...active].sort((a, b) => end(b) - end(a))[0] || null;
}