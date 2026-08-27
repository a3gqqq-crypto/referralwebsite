export const events = [
  {
    id: "top-inviter",

    title: "Vexora Top Inviter",

    subtitle: "INVITE THE MOST. WIN THE MOST.",

    description:
      "Invite new members to Vexora, climb the referral leaderboard, and finish in the top three to win cash rewards.",

    prize: "$35 Total",

    startDate: "2026-08-27T00:00:00",

    endDate: "2026-09-11T23:59:59",

    image: "/events/summer.png",

    buttonText: "JOIN EVENT",

    active: true,

    type: "referral",

    rules: {
      ranking: "referral_count",

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