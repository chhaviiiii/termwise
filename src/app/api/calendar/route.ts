import { NextResponse } from "next/server";
import { eventsToIcs } from "@/lib/syllabot";
import { publishCalendarIcs } from "@/lib/syllabot/calendar-store";
import type { AcademicEvent, Course } from "@/lib/syllabot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { events?: AcademicEvent[]; courses?: Course[] };
    if (!Array.isArray(body.events) || !body.events.length) {
      return NextResponse.json({ error: "No events to publish." }, { status: 400 });
    }
    const id = publishCalendarIcs(eventsToIcs(body.events, body.courses ?? []));
    const origin = new URL(request.url).origin;
    const icsUrl = `${origin}/api/calendar/${id}`;
    const webcalUrl = icsUrl.replace(/^https?:/, "webcal:");
    return NextResponse.json({
      id,
      icsUrl,
      webcalUrl,
      googleSubscribe: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`,
      googleImport: "https://calendar.google.com/calendar/u/0/r/settings/addbyurl",
    });
  } catch {
    return NextResponse.json({ error: "Invalid calendar payload." }, { status: 400 });
  }
}
