import { addDays, addMinutes, format, nextDay, type Day } from "date-fns";
import type { AcademicEvent, Course } from "./types";

const WEEKDAY: Record<string, Day> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const KIND_RANK: Record<AcademicEvent["kind"], number> = {
  exam: 0,
  assignment: 1,
  deadline: 2,
  reading: 3,
  "office-hour": 4,
};

export function parseClock(time: string, fallbackHour = 23, fallbackMinute = 59) {
  const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return { hours: fallbackHour, minutes: fallbackMinute };
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

export function eventStart(event: AcademicEvent) {
  const { hours, minutes } = parseClock(event.time);
  return new Date(`${event.date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
}

export function eventEnd(event: AcademicEvent) {
  const start = eventStart(event);
  if (event.kind === "exam") return addMinutes(start, 110);
  if (event.kind === "office-hour") return addMinutes(start, Math.max(30, Math.round(event.estimatedHours * 60)));
  if (event.time.includes("11:59")) return addMinutes(start, 15);
  return addMinutes(start, Math.max(45, event.estimatedHours * 20));
}

function compact(date: Date) {
  return format(date, "yyyyMMdd'T'HHmmss");
}

function utcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function alarmTrigger(event: AcademicEvent) {
  if (event.kind === "exam") return "-P3D";
  if (event.kind === "assignment") return "-P1D";
  if (event.kind === "reading") return "-PT4H";
  return "-PT1H";
}

export function eventsToIcs(events: AcademicEvent[], courses: Course[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Syllabot//Semester Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Syllabot semester",
    "X-WR-TIMEZONE:America/Los_Angeles",
  ];

  for (const event of events) {
    const course = courses.find((item) => item.id === event.courseId || item.code === event.courseCode);
    const color = course?.color ?? "#193c38";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@syllabot`,
      `DTSTAMP:${utcStamp(new Date())}`,
      `DTSTART;TZID=America/Los_Angeles:${compact(eventStart(event))}`,
      `DTEND;TZID=America/Los_Angeles:${compact(eventEnd(event))}`,
      `SUMMARY:${escapeText(`${event.courseCode} — ${event.title}`)}`,
      `DESCRIPTION:${escapeText(`${event.kind} · ~${event.estimatedHours}h${course?.professor ? ` · ${course.professor}` : ""}${event.location ? ` · ${event.location}` : ""}`)}`,
      `CATEGORIES:${escapeText(`${event.courseCode},${event.kind}`)}`,
      `COLOR:${color}`,
      `X-APPLE-CALENDAR-COLOR:${color}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(`${event.courseCode} ${event.title}`)}`,
      `TRIGGER:${alarmTrigger(event)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function googleCalendarUrl(event: AcademicEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${event.courseCode} — ${event.title}`,
    dates: `${compact(eventStart(event))}/${compact(eventEnd(event))}`,
    details: `${event.kind} · ~${event.estimatedHours}h · added by Syllabot`,
    ctz: "America/Los_Angeles",
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: AcademicEvent) {
  const params = new URLSearchParams({
    subject: `${event.courseCode} — ${event.title}`,
    startdt: eventStart(event).toISOString(),
    enddt: eventEnd(event).toISOString(),
    body: `${event.kind} · ~${event.estimatedHours}h · added by Syllabot`,
    path: "/calendar/action/compose",
    rru: "addevent",
  });
  if (event.location) params.set("location", event.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadIcs(filename: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseOfficeHours(officeHours: string) {
  const weekdayName = Object.keys(WEEKDAY).find((day) => new RegExp(`\\b${day}\\b`, "i").test(officeHours));
  if (!weekdayName) return null;
  const range = officeHours.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM)?(?:\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)?)?/i);
  const startMeridiem = range?.[2] || range?.[4] || "PM";
  const endMeridiem = range?.[4] || startMeridiem;
  const startClock = `${range?.[1] ?? "2:00"} ${startMeridiem}`;
  const start = parseClock(startClock);
  const end = range?.[3] ? parseClock(`${range[3]} ${endMeridiem}`) : { hours: start.hours + 1, minutes: start.minutes };
  let minutes = end.hours * 60 + end.minutes - (start.hours * 60 + start.minutes);
  if (minutes <= 0) minutes += 12 * 60;
  if (minutes <= 0 || minutes > 8 * 60) minutes = 60;
  return {
    weekdayName,
    time: startClock.toUpperCase().replace(/\s+/g, " "),
    estimatedHours: Math.round((minutes / 60) * 10) / 10,
    location: officeHours.split(",").slice(1).join(",").trim(),
  };
}

export function semesterBounds(events: AcademicEvent[], fallbackFrom = new Date("2026-09-01"), fallbackTo = new Date("2026-12-11")) {
  const dates = events.map((event) => event.date).filter(Boolean).sort();
  if (!dates.length) return { from: fallbackFrom, to: fallbackTo };
  return {
    from: addDays(new Date(`${dates[0]}T00:00:00`), -7),
    to: addDays(new Date(`${dates[dates.length - 1]}T00:00:00`), 7),
  };
}

export function expandOfficeHours(courses: Course[], from = new Date("2026-09-01"), to = new Date("2026-12-11")): AcademicEvent[] {
  const events: AcademicEvent[] = [];
  for (const course of courses) {
    const parsed = parseOfficeHours(course.officeHours);
    if (!parsed) continue;
    let cursor = nextDay(addDays(from, -1), WEEKDAY[parsed.weekdayName]);
    while (cursor <= to) {
      const date = format(cursor, "yyyy-MM-dd");
      events.push({
        id: `${course.id}-oh-${date}`,
        courseId: course.id,
        courseCode: course.code,
        title: "Office hours",
        kind: "office-hour",
        date,
        time: parsed.time,
        estimatedHours: parsed.estimatedHours,
        sourceLine: course.officeHours,
        location: parsed.location || undefined,
      });
      cursor = addDays(cursor, 7);
    }
  }
  return events;
}

export function mergeUniqueEvents(current: AcademicEvent[], incoming: AcademicEvent[]) {
  const seen = new Set(current.map((event) => event.id));
  return [...current, ...incoming.filter((event) => !seen.has(event.id))];
}

export function sortCalendarEvents(events: AcademicEvent[]) {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.time.localeCompare(b.time));
}

export function priorityCalendarEvents(events: AcademicEvent[], limit = 8) {
  return sortCalendarEvents(events)
    .filter((event) => event.kind === "exam" || /\b(project|paper|midterm|final)\b/i.test(event.title))
    .slice(0, limit);
}
