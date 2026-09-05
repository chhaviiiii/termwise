import { NextResponse } from "next/server";
import { getPublishedCalendar } from "@/lib/syllabot/calendar-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !/^[\w-]{4,12}$/.test(id)) {
    return NextResponse.json({ error: "Unknown calendar." }, { status: 404 });
  }
  const calendar = getPublishedCalendar(id);
  if (!calendar) {
    return NextResponse.json({ error: "That calendar link expired. Publish again from Termwise." }, { status: 404 });
  }
  return new NextResponse(calendar.ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="termwise-${id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
