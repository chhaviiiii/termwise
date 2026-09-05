import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

type EventKind = "exam" | "assignment" | "reading" | "office-hour" | "deadline";

const datePattern =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/i;

function classify(line: string): EventKind {
  if (/\b(midterm|final|exam|quiz|test)\b/i.test(line)) return "exam";
  if (/\b(read|reading|chapter|pages?|pp\.)\b/i.test(line)) return "reading";
  if (/\b(office hours?|student hours?)\b/i.test(line)) return "office-hour";
  if (/\b(project|paper|problem set|homework|assignment|essay|presentation|lab)\b/i.test(line)) return "assignment";
  return "deadline";
}

function estimateHours(kind: EventKind, line: string) {
  const explicit = line.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (explicit) return Number(explicit[1]);
  if (kind === "exam") return 5;
  if (kind === "assignment") return /\b(project|paper|essay)\b/i.test(line) ? 6 : 3;
  if (kind === "reading") return 1;
  return 0.5;
}

function cleanTitle(line: string) {
  return line
    .replace(/\s+/g, " ")
    .replace(/^[•\-–—*\d.)\s]+/, "")
    .trim()
    .slice(0, 140);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "Add at least one PDF syllabus." }, { status: 400 });
    }
    if (files.length > 10) {
      return NextResponse.json({ error: "Upload up to 10 syllabi at a time." }, { status: 400 });
    }

    const documents = [];
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: `${file.name} is larger than 15 MB.` }, { status: 400 });
      }

      const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
      const result = await parser.getText();
      await parser.destroy();

      const lines = result.text
        .split(/\r?\n/)
        .map(cleanTitle)
        .filter((line) => line.length > 4);
      const events = lines
        .filter((line) => datePattern.test(line))
        .map((line) => {
          const kind = classify(line);
          return {
            title: line,
            dateText: line.match(datePattern)?.[0] ?? "",
            kind,
            estimatedHours: estimateHours(kind, line),
          };
        })
        .slice(0, 100);

      const email = result.text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] ?? null;
      documents.push({
        fileName: file.name,
        pages: result.total,
        email,
        events,
      });
    }

    const events = documents.flatMap((document) => document.events);
    const counts = {
      deadlines: events.length,
      exams: events.filter((event) => event.kind === "exam").length,
      readings: events.filter((event) => event.kind === "reading").length,
      officeHours: events.filter((event) => event.kind === "office-hour").length,
    };

    return NextResponse.json({
      documents: documents.map(({ events: documentEvents, ...document }) => ({
        ...document,
        eventCount: documentEvents.length,
      })),
      events: events.slice(0, 120),
      counts,
    });
  } catch (error) {
    console.error("Syllabus extraction failed", error);
    return NextResponse.json(
      { error: "We could not read that PDF. Try an exported, text-based syllabus." },
      { status: 422 },
    );
  }
}
