import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export function getEventStatus(event, now = new Date()) {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);

  if (now < start) return "upcoming";
  if (now > end) return "ended";

  return "live";
}

export function formatCountdown(targetDate, now = new Date()) {
  const difference =
    new Date(targetDate).getTime() - now.getTime();

  if (difference <= 0) {
    return "00d 00h 00m 00s";
  }

  const totalSeconds = Math.floor(difference / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(days).padStart(2, "0")}d ${String(hours).padStart(
    2,
    "0"
  )}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(
    2,
    "0"
  )}s`;
}
