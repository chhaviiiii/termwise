"use client";

import { Download, ExternalLink, Mail } from "lucide-react";
import { calendarComposeUrl, DESTINATIONS, displayKind, downloadIcs, eventsToIcs, formatEventWhen, type CalendarDestination } from "@/lib/syllabot";
import type { AcademicEvent, Collision, Course } from "@/lib/syllabot";

export function EventDrawer({
  event,
  course,
  collision,
  destination,
  onClose,
  onChangeDestination,
}: {
  event: AcademicEvent;
  course?: Course;
  collision?: Collision;
  destination: CalendarDestination;
  onClose: () => void;
  onChangeDestination?: (value: CalendarDestination) => void;
}) {
  const chosen = DESTINATIONS[destination];
  const courses = course ? [course] : [];
  const facts = [
    { label: "When", value: formatEventWhen(event) },
    { label: "Hours", value: event.estimatedHours ? `~${event.estimatedHours}h` : "" },
    { label: "Weight", value: event.weight ?? "" },
    { label: "Location", value: event.location ?? "" },
    { label: "Professor", value: course?.professor && course.professor !== "Professor" ? course.professor : "" },
    { label: "Office hours", value: course?.officeHours ?? "" },
    { label: "Late policy", value: event.notes || course?.latePolicy || "" },
  ].filter((fact) => fact.value);

  return (
    <div className="sb-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--sb-muted)]">
            {event.courseCode}
            {course?.name && course.name !== course.code ? ` · ${course.name}` : ""}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">{event.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[var(--sb-soft)] px-2 py-0.5 text-[11px] font-medium">{displayKind(event)}</span>
            {collision && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[var(--sb-warn)]">
                {collision.severity} pileup · {collision.events.length} majors
              </span>
            )}
          </div>
        </div>
        <button type="button" className="sb-btn-ghost h-8 shrink-0" onClick={onClose}>Close</button>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--sb-muted)]">{fact.label}</dt>
            <dd className="mt-0.5 text-sm leading-5">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-muted)]">Add to your calendar</p>
        {onChangeDestination && (
          <div className="mb-2 flex border border-[var(--sb-line)] p-0.5">
            {(["google", "outlook", "file"] as const).map((id) => (
              <button key={id} type="button" onClick={() => onChangeDestination(id)} className={`flex-1 px-2 py-1.5 text-[11px] font-semibold ${destination === id ? "bg-[var(--sb-soft)]" : "text-[var(--sb-muted)]"}`}>
                {DESTINATIONS[id].shortLabel}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {destination === "file" ? (
            <button
              type="button"
              className="sb-btn h-9"
              onClick={() => downloadIcs(`${event.courseCode}-${event.title}.ics`, eventsToIcs([event], courses))}
            >
              <Download className="size-3.5" /> {chosen.addOneLabel}
            </button>
          ) : (
            <button
              type="button"
              className="sb-btn h-9"
              onClick={() => window.open(calendarComposeUrl(event, destination, course), "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="size-3.5" /> {chosen.addOneLabel}
            </button>
          )}
          <button
            type="button"
            className="sb-btn-ghost h-9"
            onClick={() => downloadIcs(`${event.courseCode}-${event.title}.ics`, eventsToIcs([event], courses))}
          >
            <Download className="size-3.5" /> .ics
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[var(--sb-muted)]">
          {destination === "file" ? "Downloads a file. Termwise does not write the calendar for you." : "Opens a compose tab. Termwise does not write the calendar for you."}
        </p>
      </div>

      {course?.email && (
        <p className="flex items-center gap-1.5 text-[11px] text-[var(--sb-muted)]">
          <Mail className="size-3.5" /> {course.email}
        </p>
      )}
    </div>
  );
}
