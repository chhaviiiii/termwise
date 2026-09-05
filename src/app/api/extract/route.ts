import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { extractFromText, mergeExtractions } from "@/lib/syllabot";

export const runtime = "nodejs";

PDFParse.setWorker(
  pathToFileURL(join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).toString(),
);

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const results = [];

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { text?: string; fileName?: string; texts?: { text: string; fileName?: string }[] };
      const payloads = body.texts ?? (body.text ? [{ text: body.text, fileName: body.fileName }] : []);
      if (!payloads.length) {
        return NextResponse.json({ error: "Paste a syllabus or upload a PDF." }, { status: 400 });
      }
      payloads.forEach((payload, index) => {
        results.push(extractFromText(payload.text, payload.fileName ?? `syllabus-${index + 1}.txt`, index));
      });
    } else {
      const form = await request.formData();
      const pasted = String(form.get("text") ?? "").trim();
      if (pasted) results.push(extractFromText(pasted, String(form.get("fileName") ?? "pasted-syllabus.txt"), 0));

      const files = form.getAll("files").filter((value): value is File => value instanceof File);
      if (files.length > 10) {
        return NextResponse.json({ error: "Upload up to 10 syllabi at a time." }, { status: 400 });
      }
      for (const [index, file] of files.entries()) {
        if (file.size > 15 * 1024 * 1024) {
          return NextResponse.json({ error: `${file.name} is larger than 15 MB.` }, { status: 400 });
        }
        if (file.name.endsWith(".txt") || file.type.startsWith("text/")) {
          results.push(extractFromText(await file.text(), file.name, results.length + index));
          continue;
        }
        const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
        const parsed = await parser.getText();
        await parser.destroy();
        results.push(extractFromText(parsed.text, file.name, results.length + index));
      }

      if (!results.length) {
        return NextResponse.json({ error: "Add at least one syllabus PDF or paste the text." }, { status: 400 });
      }
    }

    const merged = mergeExtractions(results);
    const events = merged.events;
    return NextResponse.json({
      ...merged,
      documents: results.map((result) => ({
        fileName: result.course.code,
        course: result.course,
        eventCount: result.events.length,
        warnings: result.warnings,
      })),
      counts: {
        deadlines: events.length,
        exams: events.filter((event) => event.kind === "exam").length,
        readings: events.filter((event) => event.kind === "reading").length,
        officeHours: events.filter((event) => event.kind === "office-hour").length,
      },
    });
  } catch (error) {
    console.error("Deadliner extraction failed", error);
    return NextResponse.json(
      { error: "We could not read that syllabus. Try pasted text or an exported, text-based PDF." },
      { status: 422 },
    );
  }
}
