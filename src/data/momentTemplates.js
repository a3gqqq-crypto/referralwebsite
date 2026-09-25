export const MOMENT_TEMPLATES = [
  {
    id: "teacher",
    icon: "🌸",
    label: "Teacher's Day",
    prompt: "Thank a teacher",
    color: "#ffd6e5",
  },
  {
    id: "special",
    icon: "💜",
    label: "Someone Special",
    prompt: "Say what you feel",
    color: "#e3d7ff",
  },
  {
    id: "friend",
    icon: "💙",
    label: "Best Friend",
    prompt: "Celebrate your person",
    color: "#cfe3ff",
  },
  {
    id: "birthday",
    icon: "🎂",
    label: "Birthday",
    prompt: "Make their day",
    color: "#ffe7a3",
  },
  {
    id: "congrats",
    icon: "🏆",
    label: "Congrats",
    prompt: "Celebrate a win",
    color: "#cdeec9",
  },
  {
    id: "festival",
    icon: "✨",
    label: "Festival",
    prompt: "Send some magic",
    color: "#c9f0f0",
  },
];

export const templateById = (id) =>
  MOMENT_TEMPLATES.find((template) => template.id === id) ||
  MOMENT_TEMPLATES[1];
