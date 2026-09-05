"use client";

import { CalendarDays, Copy, Download, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DestinationChoice } from "@/components/destination-choice";
import {
  DESTINATIONS,
  DESTINATION_RECONNECT_NOTE,
  calendarComposeUrl,
  downloadIcs,
  eventsToIcs,
  priorityCalendarEvents,
  type AcademicEvent,
  type CalendarDestination,
  type Course,
} from "@/lib/syllabot";

export type PublishInfo = {
  icsUrl: string;
  webcalUrl?: string;
  googleSubscribe: string;
  googleImport: string;
  outlookSubscribe?: string;
  outlookImport?: string;
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AddCalendarPanel({
  events,
  courses,
  destination,
  publishInfo,
  onDestination,
  onClose,
  onDownload,
  onCopySubscribe,
  onAddAll,
}: {
  events: AcademicEvent[];
  courses: Course[];
  destination: CalendarDestination;
  publishInfo: PublishInfo | null;
  onDestination: (value: CalendarDestination) => void;
  onClose: () => void;
  onDownload: () => void;
  onCopySubscribe: () => void;
  onAddAll: () => void;
}) {
  const chosen = DESTINATIONS[destination];
  const priorities = priorityCalendarEvents(events, 6);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--sb-ink)]/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--sb-line)] bg-[var(--sb-card)] py-0 text-[var(--sb-ink)] shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="mb-2 bg-[var(--sb-soft)] text-[var(--sb-ink)]">{events.length} events on Termwise</Badge>
              <h2 className="text-2xl font-semibold tracking-tight">Where should they go?</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--sb-muted)]">
                They&apos;re on the Termwise calendar, color-coded by course. Pick Google, Outlook, Apple Calendar, or Fallback — nothing is connected until you click.
              </p>
            </div>
            <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-[var(--sb-soft)]" aria-label="Close"><X className="size-4" /></button>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sb-muted)]">Destination</p>
            <DestinationChoice value={destination} onChange={onDestination} />
          </div>

          <ol className="mt-5 space-y-2 text-sm">
            <li className="rounded-xl bg-[var(--sb-soft)] px-4 py-3"><span className="mr-2 font-semibold">1.</span>Copy the subscribe link, or download the .ics. {chosen.fileHint}</li>
            <li className="rounded-xl bg-[var(--sb-soft)] px-4 py-3"><span className="mr-2 font-semibold">2.</span>{chosen.subscribeHint}</li>
            <li className="rounded-xl bg-[var(--sb-soft)] px-4 py-3"><span className="mr-2 font-semibold">3.</span>Exams and projects can also be added one click each, below.</li>
          </ol>

          {publishInfo?.icsUrl && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--sb-line)] px-4 py-3">
              <code className="min-w-0 flex-1 truncate text-xs">{publishInfo.icsUrl}</code>
              <button type="button" className="sb-btn-ghost h-8" onClick={onCopySubscribe}><Copy className="size-3.5" /> Copy</button>
            </div>
          )}

          {priorities.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sb-muted)]">Exams and projects, one click each</p>
              {priorities.map((event) => {
                const course = courses.find((item) => item.id === event.courseId || item.code === event.courseCode);
                return (
                  <div key={event.id} className="flex items-center gap-3 rounded-xl border border-[var(--sb-line)] px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{event.courseCode} · {event.title}</p>
                      <p className="text-[11px] text-[var(--sb-muted)]">
                        {formatDate(event.date)} {event.time}
                        {event.weight ? ` · ${event.weight}` : ""}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="sb-btn-ghost h-8 shrink-0"
                      onClick={() => destination === "file" || destination === "apple"
                        ? downloadIcs(`${event.courseCode}-${event.title}.ics`, eventsToIcs([event], course ? [course] : []))
                        : window.open(calendarComposeUrl(event, destination, course), "_blank", "noopener,noreferrer")}
                    >
                      {chosen.addOneLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-[11px] leading-5 text-[var(--sb-muted)]">{DESTINATION_RECONNECT_NOTE} Termwise never writes a calendar or sends mail without your click.</p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {destination !== "file" && destination !== "apple" && (
              <button type="button" onClick={onDownload} className="sb-btn-ghost"><Download className="size-4" /> Download .ics</button>
            )}
            <button type="button" onClick={onAddAll} className="sb-btn"><CalendarDays className="size-4" /> {chosen.addAllLabel}</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
