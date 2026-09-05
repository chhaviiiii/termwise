import { differenceInHours, parseISO } from "date-fns";
import type { AcademicEvent, Collision } from "./types";

export function isMajorDeadline(event: AcademicEvent) {
  if (event.kind === "exam") return true;
  if (event.kind !== "assignment") return false;
  return /\b(project|paper|essay|midterm|final|presentation)\b/i.test(event.title);
}

function eventDate(event: AcademicEvent) {
  const time = event.time.includes(":") ? event.time : event.time.replace(/(\d{1,2})\s?(AM|PM)/i, "$1:00 $2");
  const parsed = Date.parse(`${event.date} ${time}`);
  return Number.isNaN(parsed) ? parseISO(`${event.date}T23:59:00`) : new Date(parsed);
}

export function findCollisions(events: AcademicEvent[]): Collision[] {
  const majors = events.filter(isMajorDeadline).sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime());
  const collisions: Collision[] = [];

  for (let i = 0; i < majors.length; i += 1) {
    const window = [majors[i]];
    for (let j = i + 1; j < majors.length; j += 1) {
      const hours = differenceInHours(eventDate(majors[j]), eventDate(majors[i]));
      if (hours <= 48) window.push(majors[j]);
      else break;
    }
    if (window.length < 2) continue;

    const start = window[0].date;
    const end = window[window.length - 1].date;
    const hoursSpan = Math.max(1, differenceInHours(eventDate(window[window.length - 1]), eventDate(window[0])));
    const id = `${start}-${end}-${window.map((event) => event.id).join("+")}`;
    if (collisions.some((collision) => collision.events.every((event) => window.includes(event)) && collision.events.length === window.length)) {
      continue;
    }

    collisions.push({
      id,
      start,
      end,
      hoursSpan,
      severity: window.length >= 3 ? "severe" : "watch",
      events: window,
      totalHours: window.reduce((sum, event) => sum + event.estimatedHours, 0),
    });
  }

  return collisions.filter((collision, index, list) => {
    return !list.some((other, otherIndex) => otherIndex !== index && other.events.length > collision.events.length && collision.events.every((event) => other.events.includes(event)));
  });
}
