import type { AcademicEvent, Course } from "./types";

function stamp(date: string, time: string) {
  const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  let hours = 23;
  let minutes = 59;
  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2] ?? "0");
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
  }
  const compact = date.replace(/-/g, "");
  return `${compact}T${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00`;
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function eventsToIcs(events: AcademicEvent[], courses: Course[]) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Syllabot//Semester Plan//EN", "CALSCALE:GREGORIAN"];

  for (const event of events) {
    const course = courses.find((item) => item.id === event.courseId || item.code === event.courseCode);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@syllabot`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART:${stamp(event.date, event.time)}`,
      `SUMMARY:${escapeText(`${event.courseCode} — ${event.title}`)}`,
      `DESCRIPTION:${escapeText(`${event.kind} · ~${event.estimatedHours}h`)}`,
      `CATEGORIES:${escapeText(event.courseCode)}`,
      `COLOR:${course?.color ?? "#193c38"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
