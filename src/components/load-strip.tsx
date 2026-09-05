"use client";

import type { WeekLoad } from "@/lib/syllabot";

export function LoadStrip({ weeks }: { weeks: WeekLoad[] }) {
  if (!weeks.length) return null;
  const max = Math.max(...weeks.map((week) => Math.max(week.hours, week.capacity, 1)));
  return (
    <div className="sb-card p-5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--sb-muted)]">Week load</p>
      <h2 className="mt-1.5 text-lg font-semibold">Hours vs capacity</h2>
      <p className="mt-1 text-xs text-[var(--sb-muted)]">From confirmed items only. Over-capacity weeks are marked.</p>
      <div className="mt-4 flex items-end gap-1 overflow-x-auto pb-1">
        {weeks.map((week) => (
          <div key={week.start} className="flex min-w-8 flex-1 flex-col items-center gap-1">
            <span className={`text-[9px] ${week.over ? "font-semibold text-[var(--sb-warn)]" : "text-[var(--sb-muted)]"}`}>
              {week.hours || ""}
            </span>
            <div className="flex h-16 w-full items-end rounded-sm bg-[var(--sb-soft)]">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.min(100, (week.hours / max) * 100)}%`,
                  background: week.over ? "var(--sb-warn)" : "var(--sb-accent)",
                }}
              />
            </div>
            <span className="text-[9px] text-[var(--sb-muted)]">{week.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
