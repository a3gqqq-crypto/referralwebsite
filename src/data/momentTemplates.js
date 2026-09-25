// Moment card styles. Colours and decorations here drive both the on-screen card
// (MomentArt) and the saved story image (lib/momentImage), so they always match.
export const MOMENT_TEMPLATES = [
  {
    id: "birthday",
    icon: "🎂",
    label: "Birthday",
    prompt: "Make their day",
    bg: ["#ffe08a", "#ffb0c8"],
    ink: "#3b1024",
    accent: "#ff3d7f",
    shapes: ["confetti", "circle", "star", "confetti"],
    colors: ["#ff3d7f", "#ffffff", "#5aa9ff", "#ff9f1c"],
    burst: ["🎉", "🎈", "✨", "🎂"],
    suggestions: [
      "Happy birthday! Another year of you being the best thing that happened to this group chat. 🎉",
      "Hope today is as loud, chaotic and amazing as you are. Eat all the cake.",
      "Happy birthday legend. Proud to know you, even when you steal my fries.",
    ],
  },
  {
    id: "special",
    icon: "💖",
    label: "Someone Special",
    prompt: "Say what you feel",
    bg: ["#3a0f3b", "#a5245e"],
    ink: "#fff1f6",
    accent: "#ff9ec4",
    dark: true,
    shapes: ["heart", "heart", "sparkle", "circle"],
    colors: ["#ff6fa5", "#ffb3cf", "#ffffff", "#ff3d7f"],
    burst: ["💖", "💕", "✨", "💘"],
    suggestions: [
      "I don't say it enough, but you make everything better just by being around.",
      "Every day with you feels like my favourite song on repeat.",
      "You're my favourite notification. 💖",
    ],
  },
  {
    id: "friend",
    icon: "🫶",
    label: "Best Friend",
    prompt: "Celebrate your person",
    bg: ["#bfe3ff", "#d9ccff"],
    ink: "#13213d",
    accent: "#3a6bff",
    shapes: ["bubble", "circle", "sparkle", "bubble"],
    colors: ["#ffffff", "#7aa7ff", "#b89cff", "#ffffff"],
    burst: ["🫶", "💙", "✨", "🤝"],
    suggestions: [
      "Thanks for being the person I can send 40 memes to at 3am. Never change.",
      "Friends like you are rare. I'm keeping you forever, no refunds.",
      "Life's a lot less boring with you in it. Love you, dork.",
    ],
  },
  {
    id: "congrats",
    icon: "🏆",
    label: "Congrats",
    prompt: "Celebrate a win",
    bg: ["#c8f5c4", "#fff3a6"],
    ink: "#153221",
    accent: "#16a34a",
    shapes: ["star", "confetti", "sparkle", "circle"],
    colors: ["#ffb800", "#16a34a", "#ffffff", "#ff7a45"],
    burst: ["🏆", "🎉", "⭐", "🥳"],
    suggestions: [
      "YOU DID IT! Knew you would. So proud of you. 🏆",
      "All that hard work paid off. Go celebrate, you earned every bit of this.",
      "Main character energy. Congrats on the big win!",
    ],
  },
  {
    id: "thanks",
    icon: "🙏",
    label: "Thank You",
    prompt: "Show some love",
    bg: ["#ffd9c2", "#ffc2d6"],
    ink: "#3d1a12",
    accent: "#ff6a3d",
    shapes: ["heart", "circle", "sparkle", "petal"],
    colors: ["#ff6a3d", "#ffffff", "#ff9ec4", "#ffb38a"],
    burst: ["🙏", "🧡", "✨", "💐"],
    suggestions: [
      "Just wanted to say thank you. You helped more than you know.",
      "Thanks for always showing up for me. It means a lot.",
      "Big thank you for being you. The world needs more people like you.",
    ],
  },
  {
    id: "teacher",
    icon: "🌸",
    label: "Teacher's Day",
    prompt: "Thank a teacher",
    bg: ["#ffe1ec", "#fff4d6"],
    ink: "#3c1a2a",
    accent: "#e2477c",
    shapes: ["petal", "petal", "circle", "sparkle"],
    colors: ["#ff9ec4", "#ffc9dc", "#ffffff", "#f7b267"],
    burst: ["🌸", "📚", "✨", "🌷"],
    suggestions: [
      "Thank you for believing in me, even on the days I didn't. Happy Teacher's Day!",
      "You made learning feel like something I actually wanted to do. Thank you.",
      "The best teachers teach from the heart. Thanks for everything.",
    ],
  },
  {
    id: "missyou",
    icon: "🌙",
    label: "Miss You",
    prompt: "Close the distance",
    bg: ["#1d2a5c", "#5b3f8f"],
    ink: "#eef0ff",
    accent: "#ffd166",
    dark: true,
    shapes: ["star", "sparkle", "circle", "star"],
    colors: ["#ffd166", "#ffffff", "#a9b8ff", "#ffe8a3"],
    burst: ["🌙", "⭐", "💫", "🤍"],
    suggestions: [
      "Miss you more than I say. Let's fix that soon.",
      "Same sky, different places. Thinking of you. 🌙",
      "Everything's a bit less fun without you around. Come back!",
    ],
  },
  {
    id: "goodluck",
    icon: "🍀",
    label: "Good Luck",
    prompt: "Cheer them on",
    bg: ["#0f4d3a", "#1f8a5b"],
    ink: "#effff6",
    accent: "#b6f36a",
    dark: true,
    shapes: ["sparkle", "star", "circle", "sparkle"],
    colors: ["#b6f36a", "#ffffff", "#ffd166", "#7ee2b8"],
    burst: ["🍀", "✨", "💪", "⭐"],
    suggestions: [
      "You've got this. Go in there and show them what you can do. 🍀",
      "Good luck! Not that you need it, but here's some anyway.",
      "Rooting for you, always. Knock it out of the park.",
    ],
  },
  {
    id: "sorry",
    icon: "🥺",
    label: "Sorry",
    prompt: "Make it right",
    bg: ["#e2dcff", "#c9e4ff"],
    ink: "#221a44",
    accent: "#6b5bff",
    shapes: ["drop", "circle", "heart", "bubble"],
    colors: ["#8f84ff", "#ffffff", "#ff9ec4", "#a8d0ff"],
    burst: ["🥺", "🤍", "💐", "✨"],
    suggestions: [
      "I'm really sorry. You matter to me and I messed up. Can we talk?",
      "Not my best moment. I'm sorry, and I'll do better.",
      "Sorry for being a clown. Forgive me? 🥺",
    ],
  },
  {
    id: "getwell",
    icon: "🌼",
    label: "Get Well",
    prompt: "Send some comfort",
    bg: ["#d7f7ea", "#fff6c2"],
    ink: "#153328",
    accent: "#10a870",
    shapes: ["petal", "circle", "bubble", "sparkle"],
    colors: ["#ffd23f", "#ffffff", "#7fdcb0", "#ffb86b"],
    burst: ["🌼", "💛", "🍵", "✨"],
    suggestions: [
      "Get well soon! Rest up, drink water, and let people spoil you.",
      "Sending you a big hug and all the good vibes. Feel better!",
      "The group chat is too quiet without you. Heal fast. 🌼",
    ],
  },
  {
    id: "festival",
    icon: "✨",
    label: "Festival",
    prompt: "Send some magic",
    bg: ["#150f3a", "#4a1a6b"],
    ink: "#fff6e6",
    accent: "#ffb547",
    dark: true,
    shapes: ["sparkle", "star", "circle", "sparkle"],
    colors: ["#ffb547", "#ffd98a", "#ff6fa5", "#ffffff"],
    burst: ["✨", "🪔", "🎆", "⭐"],
    suggestions: [
      "Wishing you and your family a season full of light, love and good food. ✨",
      "May this festival bring you everything you've been hoping for.",
      "Happy celebrations! Save me some sweets.",
    ],
  },
  {
    id: "justbecause",
    icon: "🌅",
    label: "Just Because",
    prompt: "No reason needed",
    bg: ["#ff9a6b", "#ff5c8d"],
    ink: "#2d0b1a",
    accent: "#ffffff",
    shapes: ["circle", "sparkle", "bubble", "circle"],
    colors: ["#ffffff", "#ffe066", "#ffd0e0", "#ffb38a"],
    burst: ["🌅", "💫", "😊", "🧡"],
    suggestions: [
      "No reason. Just wanted you to know you're awesome.",
      "Random reminder that you're one of my favourite people.",
      "Hope this made you smile. That's it, that's the message. 😊",
    ],
  },
];

const BY_ID = new Map(MOMENT_TEMPLATES.map((template) => [template.id, template]));

export const templateById = (id) => BY_ID.get(id) || BY_ID.get("special");

/* ---------------------------------------------------------------
   Decorations: the same shapes are drawn as SVG on screen and on a
   canvas for the saved image, in a 100 x 125 box (the card's 4:5).
--------------------------------------------------------------- */

const starPath = (() => {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 0.5 : 0.21;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(Math.cos(angle) * radius).toFixed(3)} ${(Math.sin(angle) * radius).toFixed(3)}`);
  }
  return `M${points.join(" L")} Z`;
})();

export const SHAPE_PATHS = {
  circle: "M0.5 0 A0.5 0.5 0 1 1 -0.5 0 A0.5 0.5 0 1 1 0.5 0 Z",
  bubble: "M0.5 0 A0.5 0.5 0 1 1 -0.5 0 A0.5 0.5 0 1 1 0.5 0 Z",
  heart: "M0 0.38 C-0.6 -0.02 -0.4 -0.6 0 -0.26 C0.4 -0.6 0.6 -0.02 0 0.38 Z",
  star: starPath,
  sparkle: "M0 -0.5 Q0.07 -0.07 0.5 0 Q0.07 0.07 0 0.5 Q-0.07 0.07 -0.5 0 Q-0.07 -0.07 0 -0.5 Z",
  petal: "M0 -0.5 C0.28 -0.28 0.28 0.28 0 0.5 C-0.28 0.28 -0.28 -0.28 0 -0.5 Z",
  confetti: "M-0.14 -0.4 L0.14 -0.4 L0.14 0.4 L-0.14 0.4 Z",
  drop: "M0 -0.5 C0.3 -0.1 0.36 0.1 0.36 0.2 A0.36 0.36 0 1 1 -0.36 0.2 C-0.36 0.1 -0.3 -0.1 0 -0.5 Z",
};

// Small seeded random so a style always gets the same layout.
function seeded(text) {
  let seed = [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function decorationsFor(template) {
  const random = seeded(template.id);
  const items = [];

  // Mostly around the edges so the text stays readable.
  for (let i = 0; i < 26; i += 1) {
    const edge = i % 4;
    const along = random();
    const inset = random() * 16;

    const x = edge === 0 ? inset + 2 : edge === 1 ? 98 - inset : 4 + along * 92;
    const y = edge === 2 ? inset + 2 : edge === 3 ? 123 - inset : 6 + along * 113;

    items.push({
      kind: template.shapes[i % template.shapes.length],
      color: template.colors[Math.floor(random() * template.colors.length)],
      x,
      y,
      size: 2.2 + random() * 5.5,
      rotate: Math.round(random() * 360),
      opacity: 0.55 + random() * 0.45,
    });
  }

  // Two big, very soft ones in the background for depth.
  for (let i = 0; i < 2; i += 1) {
    items.unshift({
      kind: "circle",
      color: template.colors[i % template.colors.length],
      x: i === 0 ? 8 + random() * 20 : 72 + random() * 20,
      y: i === 0 ? 10 + random() * 25 : 85 + random() * 30,
      size: 36 + random() * 20,
      rotate: 0,
      opacity: 0.07 + random() * 0.05,
    });
  }

  return items;
}
