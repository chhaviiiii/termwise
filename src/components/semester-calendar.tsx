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
import { CalendarDays, ChevronLeft, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "MMM d")}–${format(endOfWeek(cursor, { weekStartsOn: 1 }), "MMM d, yyyy")}`
    : format(cursor, "MMMM yyyy");

  const dayEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
        <CardContent className="p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-[.13em] text-[#15836d]"><CalendarDays className="size-3.5" /> SEMESTER CALENDAR</div>
              <h2 className="font-serif text-2xl font-bold">{label}</h2>
              <p className="text-xs text-[#7c8683]">{visible.length} events · color-coded by course · collision days ringed in coral</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-[#e4e6e0] bg-[#fafbf8] p-1">
                <button onClick={() => setMode("week")} className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${mode === "week" ? "bg-white shadow-sm" : "text-[#7d8784]"}`}>Week</button>
                <button onClick={() => setMode("month")} className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${mode === "month" ? "bg-white shadow-sm" : "text-[#7d8784]"}`}>Month</button>
              </div>
              <Button variant="outline" className="h-9 rounded-lg" aria-label="Previous" onClick={() => setCursor((current) => mode === "week" ? addWeeks(current, -1) : addMonths(current, -1))}><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" className="h-9 rounded-lg" aria-label="Next" onClick={() => setCursor((current) => mode === "week" ? addWeeks(current, 1) : addMonths(current, 1))}><ChevronRight className="size-4" /></Button>
              {subscribeUrl && onCopySubscribe && (
                <Button variant="outline" className="h-9 rounded-lg text-xs font-bold" onClick={onCopySubscribe}><Copy className="size-3.5" /> Copy subscribe link</Button>
              )}
              <Button onClick={onAddAll} className="h-9 rounded-lg bg-[#193c38] text-xs font-bold text-white hover:bg-[#112d2a]">Add all to Google Calendar</Button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {([
              ["all", "All"],
              ["exam", "Exams"],
              ["work", "Work"],
              ["office-hour", "Office hours"],
            ] as const).map(([value, labelText]) => (
              <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1 text-[10px] font-bold ${filter === value ? "bg-[#193c38] text-white" : "bg-[#f3f4f0] text-[#66736f]"}`}>
                {labelText}
              </button>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-3">
            {courses.map((course) => (
              <span key={course.id} className="flex items-center gap-1.5 text-[10px] font-bold text-[#66736f]">
                <span className="size-2 rounded-full" style={{ background: course.color }} /> {course.code}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-[.12em] text-[#8a9491]">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <div key={day} className="py-1">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = dayKey(day);
              const items = (byDay.get(key) ?? []).slice(0, mode === "week" ? 8 : 3);
              const extra = (byDay.get(key) ?? []).length - items.length;
              const hot = collisionDays.has(key);
              return (
                <div key={key} className={`min-h-[108px] rounded-xl border p-2 ${hot ? "border-[#f16d55] bg-[#fff7f4]" : isSameMonth(day, cursor) ? "border-[#e7e9e4] bg-[#fcfcfa]" : "border-transparent bg-transparent opacity-45"}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <button onClick={() => { setSelectedDay(key); setSelected(null); }} className={`grid size-6 place-items-center rounded-full text-xs font-bold ${hot ? "bg-[#f16d55] text-white" : selectedDay === key ? "bg-[#193c38] text-white" : ""}`}>{format(day, "d")}</button>
                    {hot && <Badge className="h-4 bg-[#fff0ec] px-1 text-[8px] text-[#c44d38]">CRASH</Badge>}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const course = courses.find((entry) => entry.code === item.courseCode);
                      return (
                        <button key={item.id} onClick={() => { setSelected(item); setSelectedDay(key); }} className="w-full truncate rounded-md border-l-[3px] bg-white px-1.5 py-1 text-left text-[10px] font-bold leading-tight shadow-[0_1px_3px_rgba(0,0,0,.04)]" style={{ borderColor: course?.color ?? "#193c38" }}>
                          {item.time ? `${item.time.split(" ")[0]} ` : ""}{item.title}
                        </button>
                      );
                    })}
                    {extra > 0 && (
                      <button onClick={() => { setSelectedDay(key); setSelected(null); }} className="text-[9px] font-semibold text-[#8a9491]">+{extra} more</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && dayEvents.length > 0 && !selected && (
        <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">{format(new Date(`${selectedDay}T12:00:00`), "EEEE, MMMM d")}</h3>
              <Button variant="outline" className="h-8 rounded-lg text-xs" onClick={() => setSelectedDay(null)}>Close</Button>
            </div>
            <div className="space-y-2">
              {dayEvents.map((item) => {
                const course = courses.find((entry) => entry.code === item.courseCode);
                return (
                  <button key={item.id} onClick={() => setSelected(item)} className="flex w-full items-center gap-3 rounded-xl border border-[#e7e9e4] bg-[#fcfcfa] px-3 py-2 text-left">
                    <span className="size-2.5 rounded-full" style={{ background: course?.color ?? "#193c38" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold text-[#82908c]">{item.courseCode} · {item.kind}</span>
                      <span className="block truncate text-sm font-bold">{item.title}</span>
                    </span>
                    <span className="text-xs font-bold text-[#66736f]">{item.time || "All day"}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selected && (
        <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-wide text-[#82908c]">{selected.courseCode} · {selected.kind}</p>
              <h3 className="mt-1 font-serif text-xl font-bold">{selected.title}</h3>
              <p className="mt-1 text-sm text-[#65706d]">{format(new Date(`${selected.date}T12:00:00`), "EEEE, MMMM d")} · {selected.time || "All day"} · ~{selected.estimatedHours}h{selected.location ? ` · ${selected.location}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="h-9 rounded-lg bg-[#193c38] text-xs font-bold text-white hover:bg-[#112d2a]" onClick={() => window.open(googleCalendarUrl(selected), "_blank", "noopener,noreferrer")}>
                <ExternalLink className="size-3.5" /> Add to Google
              </Button>
              <Button variant="outline" className="h-9 rounded-lg text-xs font-bold" onClick={() => window.open(outlookCalendarUrl(selected), "_blank", "noopener,noreferrer")}>
                Add to Outlook
              </Button>
              <Button variant="outline" className="h-9 rounded-lg text-xs" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
