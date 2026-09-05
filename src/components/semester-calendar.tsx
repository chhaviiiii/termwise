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
import { ChevronLeft, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { googleCalendarUrl, outlookCalendarUrl, sortCalendarEvents } from "@/lib/syllabot";
import type { AcademicEvent, Collision, Course } from "@/lib/syllabot";

type Filter = "all" | "exam" | "work" | "office-hour";

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function matchesFilter(event: AcademicEvent, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "exam") return event.kind === "exam";
  if (filter === "office-hour") return event.kind === "office-hour";
  return event.kind === "assignment" || event.kind === "deadline" || event.kind === "reading";
}

export function SemesterCalendar({
  events,
  courses,
  collisions,
  subscribeUrl,
  onAddAll,
  onCopySubscribe,
}: {
  events: AcademicEvent[];
  courses: Course[];
  collisions: Collision[];
  subscribeUrl?: string;
  onAddAll: () => void;
  onCopySubscribe?: () => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(events[0] ? new Date(`${events[0].date}T12:00:00`) : new Date("2026-09-01")));
  const [selected, setSelected] = useState<AcademicEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => sortCalendarEvents(events.filter((event) => matchesFilter(event, filter))), [events, filter]);

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
    ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "MMM d, yyyy")}`
    : format(cursor, "MMMM yyyy");

  const dayEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="sb-card p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--sb-muted)]">Calendar</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{label}</h2>
              <p className="text-xs text-[var(--sb-muted)]">{visible.length} events · pileup days marked</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex border border-[var(--sb-line)] p-0.5">
                <button onClick={() => setMode("week")} className={`px-3 py-1.5 text-[11px] font-semibold ${mode === "week" ? "bg-[var(--sb-soft)]" : "text-[var(--sb-muted)]"}`}>Week</button>
                <button onClick={() => setMode("month")} className={`px-3 py-1.5 text-[11px] font-semibold ${mode === "month" ? "bg-[var(--sb-soft)]" : "text-[var(--sb-muted)]"}`}>Month</button>
              </div>
              <button className="sb-btn-ghost h-9" aria-label="Previous" onClick={() => setCursor((current) => mode === "week" ? addWeeks(current, -1) : addMonths(current, -1))}><ChevronLeft className="size-4" /></button>
              <button className="sb-btn-ghost h-9" aria-label="Next" onClick={() => setCursor((current) => mode === "week" ? addWeeks(current, 1) : addMonths(current, 1))}><ChevronRight className="size-4" /></button>
              {subscribeUrl && onCopySubscribe && (
                <button className="sb-btn-ghost h-9" onClick={onCopySubscribe}><Copy className="size-3.5" /> Subscribe</button>
              )}
              <button onClick={onAddAll} className="sb-btn h-9">Add to Google</button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {([
              ["all", "All"],
              ["exam", "Exams"],
              ["work", "Work"],
              ["office-hour", "Office hours"],
            ] as const).map(([value, labelText]) => (
              <button key={value} onClick={() => setFilter(value)} className={`px-3 py-1 text-[11px] font-medium ${filter === value ? "bg-[var(--sb-ink)] text-[var(--sb-bg)]" : "border border-[var(--sb-line)] text-[var(--sb-muted)]"}`}>
                {labelText}
              </button>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-3">
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
                <div key={key} className={`min-h-[104px] bg-[var(--sb-card)] p-2 ${!isSameMonth(day, cursor) && mode === "month" ? "opacity-35" : ""} ${hot ? "outline outline-1 outline-[var(--sb-warn)]" : ""}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <button onClick={() => { setSelectedDay(key); setSelected(null); }} className={`text-xs ${hot || selectedDay === key ? "font-semibold" : ""}`}>{format(day, "d")}</button>
                    {hot && <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--sb-warn)]">pileup</span>}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const course = courses.find((entry) => entry.code === item.courseCode);
                      return (
                        <button key={item.id} onClick={() => { setSelected(item); setSelectedDay(key); }} className="w-full truncate border-l-2 bg-[var(--sb-bg)] px-1.5 py-1 text-left text-[10px] leading-tight" style={{ borderColor: course?.color ?? "var(--sb-ink)" }}>
                          {item.time ? `${item.time.split(" ")[0]} ` : ""}{item.title}
                        </button>
                      );
                    })}
                    {extra > 0 && (
                      <button onClick={() => { setSelectedDay(key); setSelected(null); }} className="text-[10px] text-[var(--sb-muted)]">+{extra}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      </div>

      {selectedDay && dayEvents.length > 0 && !selected && (
        <div className="sb-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{format(new Date(`${selectedDay}T12:00:00`), "EEEE, MMMM d")}</h3>
              <button className="sb-btn-ghost h-8" onClick={() => setSelectedDay(null)}>Close</button>
            </div>
            <div className="divide-y divide-[var(--sb-line)]">
              {dayEvents.map((item) => {
                const course = courses.find((entry) => entry.code === item.courseCode);
                return (
                  <button key={item.id} onClick={() => setSelected(item)} className="flex w-full items-center gap-3 py-2 text-left">
                    <span className="size-2 rounded-full" style={{ background: course?.color ?? "var(--sb-ink)" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] text-[var(--sb-muted)]">{item.courseCode} · {item.kind}</span>
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                    </span>
                    <span className="text-xs text-[var(--sb-muted)]">{item.time || "All day"}</span>
                  </button>
                );
              })}
            </div>
        </div>
      )}

      {selected && (
        <div className="sb-card flex flex-col gap-4 p-5 md:flex-row md:items-center">
            <div className="flex-1">
              <p className="text-xs text-[var(--sb-muted)]">{selected.courseCode} · {selected.kind}</p>
              <h3 className="mt-1 text-lg font-semibold">{selected.title}</h3>
              <p className="mt-1 text-sm text-[var(--sb-muted)]">{format(new Date(`${selected.date}T12:00:00`), "EEEE, MMMM d")} · {selected.time || "All day"} · ~{selected.estimatedHours}h{selected.location ? ` · ${selected.location}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="sb-btn h-9" onClick={() => window.open(googleCalendarUrl(selected), "_blank", "noopener,noreferrer")}>
                <ExternalLink className="size-3.5" /> Add to Google
              </button>
              <button className="sb-btn-ghost h-9" onClick={() => window.open(outlookCalendarUrl(selected), "_blank", "noopener,noreferrer")}>
                Outlook
              </button>
              <button className="sb-btn-ghost h-9" onClick={() => setSelected(null)}>Close</button>
            </div>
        </div>
      )}
    </div>
  );
}
