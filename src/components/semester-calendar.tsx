"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { EventDrawer } from "@/components/event-drawer";
import {
  collisionForEvent,
  DESTINATIONS,
  displayKind,
  eventCourse,
  eventHoverSummary,
  sortCalendarEvents,
  type AcademicEvent,
  type CalendarDestination,
  type Collision,
  type Course,
} from "@/lib/syllabot";

type Filter = "all" | "exam" | "work" | "office-hour";

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function matchesFilter(event: AcademicEvent, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "exam") return event.kind === "exam";
  if (filter === "office-hour") return event.kind === "office-hour";
  return event.kind === "assignment" || event.kind === "deadline" || event.kind === "reading" || event.kind === "study";
}

export function SemesterCalendar({
  events,
  courses,
  collisions,
  destination,
  subscribeUrl,
  onAddAll,
  onCopySubscribe,
  onDestination,
}: {
  events: AcademicEvent[];
  courses: Course[];
  collisions: Collision[];
  destination: CalendarDestination;
  subscribeUrl?: string;
  onAddAll: () => void;
  onCopySubscribe?: () => void;
  onDestination: (value: CalendarDestination) => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(events[0] ? new Date(`${events[0].date}T12:00:00`) : new Date("2026-09-01")));
  const [selected, setSelected] = useState<AcademicEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => sortCalendarEvents(events.filter((event) => matchesFilter(event, filter))), [events, filter]);
  const chosen = DESTINATIONS[destination];

  const collisionDays = useMemo(() => {
    const days = new Set<string>();
    collisions.forEach((collision) => collision.events.forEach((event) => days.add(event.date)));
    return days;
  }, [collisions]);

  const days = useMemo(() => {
    const start = startOfWeek(mode === "month" ? startOfMonth(cursor) : cursor, { weekStartsOn: 1 });
    const end = endOfWeek(mode === "month" ? endOfMonth(cursor) : cursor, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor, mode]);

  const byDay = useMemo(() => {
    const map = new Map<string, AcademicEvent[]>();
    visible.forEach((event) => {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [visible]);

  const label = mode === "week"
    ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "MMM d")} to ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "MMM d, yyyy")}`
    : format(cursor, "MMMM yyyy");

  const dayEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const selectedCourse = selected ? eventCourse(selected, courses) : undefined;
  const selectedCollision = selected ? collisionForEvent(selected, collisions) : undefined;

  return (
    <div className="space-y-3">
      <div className="sb-card p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--sb-muted)]">Calendar</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{label}</h2>
              <p className="mt-0.5 text-xs text-[var(--sb-muted)]">
                {visible.length} events · pileup days marked
                {subscribeUrl ? (destination === "file" ? " · subscribe URL ready for any calendar" : ` · subscribe into ${chosen.calendarLabel}`) : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex border border-[var(--sb-line)] p-0.5">
                <button type="button" onClick={() => setMode("week")} className={`px-3 py-1.5 text-[11px] font-semibold ${mode === "week" ? "bg-[var(--sb-soft)]" : "text-[var(--sb-muted)]"}`}>Week</button>
                <button type="button" onClick={() => setMode("month")} className={`px-3 py-1.5 text-[11px] font-semibold ${mode === "month" ? "bg-[var(--sb-soft)]" : "text-[var(--sb-muted)]"}`}>Month</button>
              </div>
              <button type="button" className="sb-btn-ghost h-9" aria-label="Previous" onClick={() => setCursor((current) => mode === "week" ? addWeeks(current, -1) : addMonths(current, -1))}><ChevronLeft className="size-4" /></button>
              <button type="button" className="sb-btn-ghost h-9" aria-label="Next" onClick={() => setCursor((current) => mode === "week" ? addWeeks(current, 1) : addMonths(current, 1))}><ChevronRight className="size-4" /></button>
              {subscribeUrl && onCopySubscribe && (
                <button type="button" className="sb-btn-ghost h-9" onClick={onCopySubscribe}><Copy className="size-3.5" /> Subscribe</button>
              )}
              <button type="button" onClick={onAddAll} className="sb-btn h-9">{destination === "file" ? chosen.addAllLabel : `Add to ${chosen.shortLabel}`}</button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {([
              ["all", "All"],
              ["exam", "Exams"],
              ["work", "Work"],
              ["office-hour", "Office hours"],
            ] as const).map(([value, labelText]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`px-2.5 py-1 text-[11px] font-medium ${filter === value ? "bg-[var(--sb-ink)] text-[var(--sb-bg)]" : "border border-[var(--sb-line)] text-[var(--sb-muted)]"}`}>
                {labelText}
              </button>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
            {courses.map((course) => (
              <span key={course.id} className="flex items-center gap-1.5 text-[11px] text-[var(--sb-muted)]">
                <span className="size-1.5 rounded-full" style={{ background: course.color }} /> {course.code}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px text-center text-[10px] uppercase tracking-[0.12em] text-[var(--sb-muted)]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-1">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-[var(--sb-line)]">
            {days.map((day) => {
              const key = dayKey(day);
              const items = (byDay.get(key) ?? []).slice(0, mode === "week" ? 8 : 3);
              const extra = (byDay.get(key) ?? []).length - items.length;
              const hot = collisionDays.has(key);
              return (
                <div key={key} className={`min-h-[96px] bg-[var(--sb-card)] p-1.5 ${!isSameMonth(day, cursor) && mode === "month" ? "opacity-35" : ""} ${hot ? "outline outline-1 outline-[var(--sb-warn)]" : ""}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <button type="button" onClick={() => { setSelectedDay(key); setSelected(null); }} className={`text-xs ${hot || selectedDay === key ? "font-semibold" : ""}`}>{format(day, "d")}</button>
                    {hot && <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--sb-warn)]">pileup</span>}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const course = eventCourse(item, courses);
                      const collision = collisionForEvent(item, collisions);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          title={eventHoverSummary(item, course, collision)}
                          onClick={() => { setSelected(item); setSelectedDay(key); }}
                          className={`w-full truncate border-l-2 bg-[var(--sb-bg)] px-1.5 py-1 text-left text-[10px] leading-tight ${item.kind === "exam" ? "font-semibold" : ""}`}
                          style={{ borderColor: course?.color ?? "var(--sb-ink)" }}
                        >
                          {item.time ? `${item.time.split(" ")[0]} ` : ""}{item.title}
                        </button>
                      );
                    })}
                    {extra > 0 && (
                      <button type="button" onClick={() => { setSelectedDay(key); setSelected(null); }} className="text-[10px] text-[var(--sb-muted)]">+{extra}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      </div>

      {selectedDay && dayEvents.length > 0 && !selected && (
        <div className="sb-card p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{format(new Date(`${selectedDay}T12:00:00`), "EEEE, MMMM d")}</h3>
                <p className="text-xs text-[var(--sb-muted)]">{dayEvents.length} item{dayEvents.length === 1 ? "" : "s"} · click one for hours, weight, and professor</p>
              </div>
              <button type="button" className="sb-btn-ghost h-8" onClick={() => setSelectedDay(null)}>Close</button>
            </div>
            <div className="divide-y divide-[var(--sb-line)]">
              {dayEvents.map((item) => {
                const course = eventCourse(item, courses);
                const collision = collisionForEvent(item, collisions);
                return (
                  <button key={item.id} type="button" onClick={() => setSelected(item)} title={eventHoverSummary(item, course, collision)} className="flex w-full items-start gap-3 py-2.5 text-left">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: course?.color ?? "var(--sb-ink)" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] text-[var(--sb-muted)]">
                        {item.courseCode} · {displayKind(item)}
                        {item.weight ? ` · ${item.weight}` : ""}
                        {collision ? " · pileup" : ""}
                      </span>
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className="mt-0.5 block text-[11px] text-[var(--sb-muted)]">
                        {item.time || "All day"}
                        {item.estimatedHours ? ` · ~${item.estimatedHours}h` : ""}
                        {item.location ? ` · ${item.location}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
        </div>
      )}

      {selected && (
        <EventDrawer
          event={selected}
          course={selectedCourse}
          collision={selectedCollision}
          destination={destination}
          onClose={() => setSelected(null)}
          onChangeDestination={onDestination}
        />
      )}
    </div>
  );
}
