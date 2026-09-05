import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { AcademicEvent } from "./types";

export type WeekLoad = {
  start: string;
  label: string;
  hours: number;
  capacity: number;
  majors: number;
  over: boolean;
};

export function buildTermLoad(events: AcademicEvent[], capacityHours: number): WeekLoad[] {
  const graded = events.filter((event) => event.kind !== "office-hour");
  if (!graded.length) return [];
  const dates = graded.map((event) => event.date).sort();
  const first = startOfWeek(parseISO(dates[0]), { weekStartsOn: 1 });
  const last = startOfWeek(parseISO(dates[dates.length - 1]), { weekStartsOn: 1 });
  const weeks: WeekLoad[] = [];

  for (let cursor = first; cursor <= last; cursor = addDays(cursor, 7)) {
    const start = format(cursor, "yyyy-MM-dd");
    const end = format(addDays(cursor, 6), "yyyy-MM-dd");
    const items = graded.filter((event) => event.date >= start && event.date <= end);
    const hours = items.reduce((sum, event) => sum + event.estimatedHours, 0);
    weeks.push({
      start,
      label: format(cursor, "MMM d"),
      hours: Math.round(hours * 10) / 10,
      capacity: capacityHours,
      majors: items.filter((event) => event.kind === "exam" || /\b(project|paper|essay|midterm|final)\b/i.test(event.title)).length,
      over: hours > capacityHours,
    });
  }

  return weeks;
}

export function parseWeightPercent(weight?: string) {
  if (!weight) return null;
  const value = Number(weight.replace(/%/g, "").trim());
  return Number.isFinite(value) ? value : null;
}

export function courseWeightTotals(events: AcademicEvent[], courseCode: string) {
  const listed = events
    .filter((event) => event.courseCode === courseCode && !event.suggested)
    .map((event) => parseWeightPercent(event.weight))
    .filter((value): value is number => value != null);
  const total = Math.round(listed.reduce((sum, value) => sum + value, 0) * 10) / 10;
  return { total, counted: listed.length };
}
