import { addDays, format, isWithinInterval, parseISO, startOfDay } from "date-fns";
import type { AcademicEvent, Collision, StudentMemory, WeeklyBrief } from "./types";
import { findCollisions } from "./collisions";

export function eventsInRange(events: AcademicEvent[], start: Date, end: Date) {
  return events.filter((event) => {
    const date = parseISO(event.date);
    return isWithinInterval(date, { start: startOfDay(start), end });
  });
}

export function buildWeeklyBrief(memory: StudentMemory, now = new Date()): WeeklyBrief {
  const start = startOfDay(now);
  const weekEnd = addDays(start, 7);
  const lookAheadEnd = addDays(start, 14);
  const items = eventsInRange(memory.events, start, weekEnd)
    .filter((event) => event.kind !== "office-hour")
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = eventsInRange(memory.events, start, lookAheadEnd);
  const collisions = findCollisions(upcoming);
  const startEarly = pickStartEarly(items);

  return {
    weekLabel: `${format(start, "MMM d")} - ${format(weekEnd, "MMM d")}`,
    rangeStart: format(start, "yyyy-MM-dd"),
    rangeEnd: format(weekEnd, "yyyy-MM-dd"),
    items,
    collisions,
    totalHours: items.reduce((sum, item) => sum + item.estimatedHours, 0),
    capacityHours: memory.weeklyCapacityHours,
    startEarly,
  };
}

function pickStartEarly(items: AcademicEvent[]) {
  const heavy = [...items].sort((a, b) => b.estimatedHours - a.estimatedHours)[0];
  if (!heavy) return null;
  return {
    title: heavy.title,
    reason:
      heavy.kind === "exam"
        ? `Start review now so ${heavy.courseCode} exam prep does not pile up the night before.`
        : `Give ${heavy.courseCode} ${heavy.title} a quiet block first. It's the heaviest thing this week.`,
  };
}

export function formatBriefEmail(memory: StudentMemory, brief: WeeklyBrief, collisions: Collision[]) {
  const dueLines = brief.items.length
    ? brief.items.map((item) => `- ${item.courseCode}: ${item.title} (${item.date}${item.time ? `, ${item.time}` : ""}, ~${item.estimatedHours}h)`).join("\n")
    : "- Nothing graded is due this week.";
  const collisionLines = collisions.length
    ? collisions.map((collision) => `- ${collision.severity === "severe" ? "SEVERE" : "Watch"}: ${collision.events.map((event) => event.courseCode).join(", ")} on ${collision.start} to ${collision.end}`).join("\n")
    : "- No 48-hour pileups in the next two weeks.";

  return `Subject: Syllabot week-ahead (${brief.weekLabel})

Hi ${memory.studentName.split(" ")[0]},

Here's the week (${brief.weekLabel}), by course:
${dueLines}

Estimated load: ${brief.totalHours}h of ${brief.capacityHours}h.

Crowded stretches in the next 2 weeks:
${collisionLines}

One thing to start early:
${brief.startEarly ? `- ${brief.startEarly.title}: ${brief.startEarly.reason}` : "- Keep the lighter week and get ahead on readings."}

Syllabot`;
}
