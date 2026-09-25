// Streak days are global: every day starts at 00:00 UTC for everyone,
// matching daily_checkin in the database.

export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

export function msUntilNextDay(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

export function formatUntilNextDay(now = new Date()) {
  const minutes = Math.ceil(msUntilNextDay(now) / 60000);
  const hours = Math.floor(minutes / 60);

  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

// What 00:00 UTC is on this visitor's clock, e.g. "5:30 AM".
export const localResetTime = () =>
  new Date(Date.UTC(2000, 0, 1)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
