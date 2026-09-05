"use client";

import { DESTINATIONS, type CalendarDestination } from "@/lib/syllabot/destinations";

export function DestinationChoice({
  value,
  onChange,
  compact = false,
}: {
  value: CalendarDestination;
  onChange: (value: CalendarDestination) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-3" : "sm:grid-cols-3"}`}>
      {(Object.values(DESTINATIONS) as typeof DESTINATIONS[CalendarDestination][]).map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={`rounded-xl border px-3 py-3 text-left transition-colors ${
              active ? "border-[var(--sb-ink)] bg-[var(--sb-soft)]" : "border-[var(--sb-line)] hover:border-[var(--sb-ink)]/40"
            }`}
          >
            <p className="text-sm font-semibold">{option.calendarLabel}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--sb-muted)]">{option.mailLabel}</p>
          </button>
        );
      })}
    </div>
  );
}
