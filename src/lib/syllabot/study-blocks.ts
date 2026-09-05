import { addDays, format, getDay } from "date-fns";
import type { AcademicEvent } from "./types";

function isStudyCandidate(event: AcademicEvent) {
  if (event.suggested || event.kind === "office-hour" || event.kind === "reading" || event.kind === "study") return false;
  if (event.estimatedHours < 4) return false;
  if (event.kind === "exam") return true;
  return /\b(project|paper|essay|midterm|final|presentation)\b/i.test(event.title);
}

export function suggestStudyBlocks(events: AcademicEvent[]): AcademicEvent[] {
  const blocks: AcademicEvent[] = [];
  const taken = new Set(events.map((event) => `${event.date}:${event.courseId}`));

  for (const event of events) {
    if (!isStudyCandidate(event)) continue;
    const count = Math.min(3, Math.max(1, Math.round(event.estimatedHours / 2)));
    const hoursEach = Math.round((event.estimatedHours / count) * 10) / 10;
    let cursor = addDays(new Date(`${event.date}T12:00:00`), -1);
    let made = 0;
    let guard = 0;
    const verb = event.kind === "exam" ? "Review" : "Start";

    while (made < count && guard < 21) {
      const weekday = getDay(cursor);
      const date = format(cursor, "yyyy-MM-dd");
      const key = `${date}:${event.courseId}`;
      if (weekday !== 0 && weekday !== 6 && !taken.has(key) && date < event.date) {
        taken.add(key);
        blocks.push({
          id: `${event.id}-study-${date}`,
          courseId: event.courseId,
          courseCode: event.courseCode,
          title: `${verb} ${event.title}`,
          kind: "study",
          date,
          time: "7:00 PM",
          estimatedHours: hoursEach,
          sourceLine: `Suggested from ~${event.estimatedHours}h due ${event.date}. Not on the syllabus — skip if you do not want it.`,
          suggested: true,
          review: "new",
        });
        made += 1;
      }
      cursor = addDays(cursor, -1);
      guard += 1;
    }
  }

  return blocks;
}
