import { parse, isValid } from "date-fns";
import { paletteForIndex } from "./palette";
import type { AcademicEvent, Course, EventKind, ExtractionResult } from "./types";

const MONTH_DATE =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?\b/i;
const SLASH_DATE = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/;
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/;
const TIME = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s?(?:AM|PM|am|pm)\b|\b(?:[01]?\d|2[0-3]):[0-5]\d\b/;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const COURSE_CODE = /\b([A-Z]{2,5})\s*-?\s*(\d{2,4}[A-Z]?)\b/;

const DATE_FORMATS = [
  "MMMM d, yyyy",
  "MMM d, yyyy",
  "MMMM d yyyy",
  "MMM d yyyy",
  "M/d/yyyy",
  "M/d/yy",
  "yyyy-MM-dd",
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").replace(/^[•\-–—*]+/, "").trim();
}

function classify(line: string): EventKind {
  if (/\b(office hours?|student hours?)\b/i.test(line)) return "office-hour";
  if (/\b(midterm|final|exam|quiz|test)\b/i.test(line)) return "exam";
  if (/\b(read|reading|chapter|pages?\b|pp\.)\b/i.test(line)) return "reading";
  if (/\b(project|paper|problem set|homework|assignment|essay|presentation|lab|pset)\b/i.test(line)) {
    return "assignment";
  }
  return "deadline";
}

function estimateHours(kind: EventKind, line: string) {
  const explicit = line.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (explicit) return Number(explicit[1]);
  if (kind === "exam") return /\bfinal\b/i.test(line) ? 8 : 5;
  if (kind === "assignment") return /\b(project|paper|essay)\b/i.test(line) ? 6 : 3;
  if (kind === "reading") return 1;
  return 1;
}

function extractWeight(line: string) {
  const match = line.match(/\((\d+(?:\.\d+)?)\s*%\)|\bworth\s+(\d+(?:\.\d+)?)\s*%|\b(\d+(?:\.\d+)?)\s*%\s+of\s+(?:the\s+)?(?:grade|course)/i);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return value ? `${value}%` : undefined;
}

function extractLocation(line: string) {
  const match = line.match(/\b((?:Room|Rm\.?|Hall|Gates|Studio|Bldg\.?|Building|Lab)\s+[A-Z0-9][A-Za-z0-9.\-]*)\b/i);
  return match?.[1]?.replace(/[.,;]+$/, "").trim() || undefined;
}

function extractLateNote(line: string) {
  if (!/\blate\b/i.test(line)) return undefined;
  if (/office hours?|late policy/i.test(line)) return undefined;
  return line.slice(0, 160);
}

function extractLatePolicy(text: string) {
  for (const raw of text.split(/\r?\n/)) {
    const line = cleanLine(raw);
    if (!line || line.length < 8) continue;
    if (!/late\s+(work|policy|assignment|submission|penalty)|no late work/i.test(line)) continue;
    return line.replace(/^late(?:\s+work)?\s*policy\s*[:\-–]\s*/i, "").slice(0, 180);
  }
  return undefined;
}

function cleanTitle(line: string, dateText: string, extras: { location?: string; weight?: string } = {}) {
  let title = line
    .replace(dateText, "")
    .replace(TIME, "")
    .replace(/\bdue\b/gi, "")
    .replace(/\((\d+(?:\.\d+)?)\s*%\)/g, "")
    .replace(/\bworth\s+\d+(?:\.\d+)?\s*%/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*%\s+of\s+(?:the\s+)?(?:grade|course)/gi, "");
  if (extras.location) title = title.replace(extras.location, "");
  return title
    .replace(/^[–—,:.\-\s]+/, "")
    .replace(/[–—,:.\-\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

export function parseFlexibleDate(raw: string, fallbackYear = 2026): Date | null {
  const text = raw.replace(/(st|nd|rd|th)/i, "").replace(/\s+/g, " ").trim();
  const withYear = /\d{4}/.test(text) ? text : `${text}, ${fallbackYear}`;

  for (const format of DATE_FORMATS) {
    const parsed = parse(withYear, format, new Date(fallbackYear, 0, 1));
    if (isValid(parsed)) return parsed;
  }
  return null;
}

function findDate(line: string) {
  return line.match(ISO_DATE)?.[0] ?? line.match(MONTH_DATE)?.[0] ?? line.match(SLASH_DATE)?.[0] ?? "";
}

function extractCourse(text: string, fileName: string, colorIndex: number): Course {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const header = lines.slice(0, 12).join("\n");
  const codeMatch = header.match(COURSE_CODE) ?? fileName.match(COURSE_CODE);
  const code = codeMatch ? `${codeMatch[1]} ${codeMatch[2]}` : fileName.replace(/\.(pdf|txt)$/i, "").slice(0, 24) || "COURSE";
  const nameLine =
    lines.find((line) => COURSE_CODE.test(line) && /[—–\-:|]/.test(line)) ??
    lines.find((line) => COURSE_CODE.test(line)) ??
    lines[0] ??
    code;
  const name = nameLine.replace(COURSE_CODE, "").replace(/^[—–\-:|\s]+/, "").trim() || code;
  const professor =
    header.match(/(?:professor|instructor|prof\.?)\s*[:\-–]\s*([^(\n]+)/i)?.[1]?.replace(/,.+$/, "").trim() ??
    "Professor";
  const email = header.match(EMAIL)?.[0] ?? "";
  const officeHours =
    header.match(/office hours?\s*[:\-–]\s*(.+)/i)?.[1]?.trim() ??
    lines.find((line) => /office hours?/i.test(line))?.replace(/office hours?\s*[:\-–]?\s*/i, "") ??
    "";
  const palette = paletteForIndex(colorIndex);
  const latePolicy = extractLatePolicy(text);

  return {
    id: slug(code),
    code,
    name: name.slice(0, 80),
    professor,
    email,
    officeHours,
    latePolicy,
    color: palette.color,
    bg: palette.bg,
  };
}

export function extractFromText(text: string, fileName = "syllabus.txt", colorIndex = 0): ExtractionResult {
  const course = extractCourse(text, fileName, colorIndex);
  const warnings: string[] = [];
  const events: AcademicEvent[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    const line = cleanLine(raw);
    if (line.length < 6) continue;
    const dateText = findDate(line);
    if (!dateText) continue;
    if (/office hours?/i.test(line) && !/(midterm|exam|due|assignment|project|paper|quiz)/i.test(line)) continue;

    const parsed = parseFlexibleDate(dateText);
    if (!parsed) {
      warnings.push(`Could not parse date on: ${line}`);
      continue;
    }

    const kind = classify(line);
    const location = extractLocation(line);
    const weight = extractWeight(line);
    const notes = extractLateNote(line);
    const title = cleanTitle(line, dateText, { location, weight }) || `${course.code} ${kind}`;
    const key = `${course.id}:${parsed.toISOString().slice(0, 10)}:${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      id: slug(`${course.id}-${title}-${parsed.toISOString().slice(0, 10)}`),
      courseId: course.id,
      courseCode: course.code,
      title,
      kind,
      date: parsed.toISOString().slice(0, 10),
      time: line.match(TIME)?.[0]?.toUpperCase().replace(/\s+/g, " ") ?? (kind === "office-hour" ? "" : "11:59 PM"),
      estimatedHours: estimateHours(kind, line),
      sourceLine: line,
      location,
      weight,
      notes,
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  if (!events.length) warnings.push("No dated items found. Try a text-based syllabus with month/day dates.");
  return { course, events, warnings };
}

export function mergeExtractions(results: ExtractionResult[], existingCourses: Course[] = []) {
  const courses = [...existingCourses];
  const events: AcademicEvent[] = [];

  results.forEach((result, index) => {
    const match = courses.find((course) => course.code.toLowerCase() === result.course.code.toLowerCase());
    const course = match ?? { ...result.course, ...paletteForIndex(courses.length + index) };
    if (!match) courses.push(course);
    else Object.assign(match, {
      professor: result.course.professor || match.professor,
      email: result.course.email || match.email,
      officeHours: result.course.officeHours || match.officeHours,
      latePolicy: result.course.latePolicy || match.latePolicy,
    });
    events.push(...result.events.map((event) => ({ ...event, courseId: course.id, courseCode: course.code })));
  });

  return { courses, events };
}
