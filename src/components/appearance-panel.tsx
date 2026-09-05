"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { DestinationChoice } from "@/components/destination-choice";
import {
  ACCENTS,
  THEMES,
  moveWidget,
  writeAppearance,
  type Appearance,
  type WidgetId,
} from "@/lib/syllabot/appearance";
import { DESTINATION_RECONNECT_NOTE, type Course } from "@/lib/syllabot";

export function AppearancePanel({
  appearance,
  courses,
  studentName,
  weeklyCapacityHours,
  onName,
  onCapacity,
  onRemoveCourse,
  onClose,
}: {
  appearance: Appearance;
  courses: Course[];
  studentName: string;
  weeklyCapacityHours: number;
  onName: (value: string) => void;
  onCapacity: (value: number) => void;
  onRemoveCourse: (course: Course) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid justify-end bg-black/25" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-md flex-col border-l border-[var(--sb-line)] bg-[var(--sb-card)] text-[var(--sb-ink)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--sb-line)] px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--sb-muted)]">Workspace</p>
            <h2 className="mt-1 text-lg font-semibold">Customize Termwise</h2>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full border border-[var(--sb-line)]" aria-label="Close"><X className="size-4" /></button>
        </header>
        <div className="flex-1 space-y-8 overflow-y-auto px-5 py-6">
          <section>
            <h3 className="text-sm font-semibold">Your desk</h3>
            <p className="mt-1 text-xs text-[var(--sb-muted)]">Name and weekly hours stay on this desk.</p>
            <label className="mt-3 block text-xs text-[var(--sb-muted)]">
              Display name
              <input value={studentName} onChange={(event) => onName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[var(--sb-line)] bg-[var(--sb-bg)] px-3 text-sm text-[var(--sb-ink)] outline-none" />
            </label>
            <label className="mt-3 block text-xs text-[var(--sb-muted)]">
              Weekly capacity (hours)
              <input type="number" min={4} max={40} value={weeklyCapacityHours} onChange={(event) => onCapacity(Number(event.target.value) || 12)} className="mt-1 h-10 w-full rounded-lg border border-[var(--sb-line)] bg-[var(--sb-bg)] px-3 text-sm outline-none" />
            </label>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Theme</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => writeAppearance((current) => ({ ...current, theme: theme.id }))}
                  className={`rounded-xl border px-3 py-3 text-left ${appearance.theme === theme.id ? "border-[var(--sb-ink)]" : "border-[var(--sb-line)]"}`}
                >
                  <p className="text-sm font-semibold">{theme.label}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--sb-muted)]">{theme.note}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Accent</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {ACCENTS.map((color) => (
                <button
                  key={color}
                  onClick={() => writeAppearance((current) => ({ ...current, accent: color }))}
                  className="size-8 rounded-full border border-black/10"
                  style={{ background: color, outline: appearance.accent === color ? "2px solid var(--sb-ink)" : undefined, outlineOffset: 2 }}
                  aria-label={`Accent ${color}`}
                />
              ))}
              <label className="grid size-8 place-items-center rounded-full border border-dashed border-[var(--sb-line)] text-[10px] text-[var(--sb-muted)]">
                +
                <input type="color" value={appearance.accent} className="sr-only" onChange={(event) => writeAppearance((current) => ({ ...current, accent: event.target.value }))} />
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Calendar &amp; mail</h3>
            <p className="mt-1 text-xs text-[var(--sb-muted)]">Choose Google or Outlook. Termwise still uses .ics, subscribe URLs, and drafts — no OAuth, nothing sent until you click.</p>
            <div className="mt-3">
              <DestinationChoice
                value={appearance.destination}
                onChange={(destination) => writeAppearance((current) => ({ ...current, destination }))}
              />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--sb-muted)]">{DESTINATION_RECONNECT_NOTE}</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Density</h3>
            <div className="mt-3 flex gap-2">
              {(["comfortable", "compact"] as const).map((density) => (
                <button
                  key={density}
                  onClick={() => writeAppearance((current) => ({ ...current, density }))}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${appearance.density === density ? "border-[var(--sb-ink)]" : "border-[var(--sb-line)]"}`}
                >
                  {density}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Overview widgets</h3>
            <p className="mt-1 text-xs text-[var(--sb-muted)]">Show, hide, or shuffle what sits on the home desk.</p>
            <div className="mt-3 space-y-2">
              {appearance.widgets.map((widget, index) => (
                <div key={widget.id} className="flex items-center gap-2 rounded-lg border border-[var(--sb-line)] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={widget.visible}
                    onChange={(event) => writeAppearance((current) => ({
                      ...current,
                      widgets: current.widgets.map((item) => item.id === widget.id ? { ...item, visible: event.target.checked } : item),
                    }))}
                  />
                  <span className="flex-1 text-sm">{widget.label}</span>
                  <button disabled={index === 0} className="text-[var(--sb-muted)] disabled:opacity-30" onClick={() => writeAppearance((current) => ({ ...current, widgets: moveWidget(current.widgets, widget.id as WidgetId, -1) }))} aria-label={`Move ${widget.label} up`}><ArrowUp className="size-4" /></button>
                  <button disabled={index === appearance.widgets.length - 1} className="text-[var(--sb-muted)] disabled:opacity-30" onClick={() => writeAppearance((current) => ({ ...current, widgets: moveWidget(current.widgets, widget.id as WidgetId, 1) }))} aria-label={`Move ${widget.label} down`}><ArrowDown className="size-4" /></button>
                </div>
              ))}
            </div>
          </section>

          {courses.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold">Classes</h3>
              <p className="mt-1 text-xs text-[var(--sb-muted)]">Recolor a class, or take it off the desk.</p>
              <div className="mt-3 space-y-2">
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between gap-3 text-sm">
                    <label className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate">{course.code}</span>
                      <input
                        type="color"
                        value={appearance.courseColors[course.id] ?? course.color}
                        onChange={(event) => writeAppearance((current) => ({
                          ...current,
                          courseColors: { ...current.courseColors, [course.id]: event.target.value },
                        }))}
                        className="h-8 w-10 cursor-pointer rounded border border-[var(--sb-line)] bg-transparent"
                        aria-label={`${course.code} color`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => onRemoveCourse(course)}
                      className="h-8 shrink-0 px-1 text-xs font-semibold text-[var(--sb-muted)] hover:text-[var(--sb-ink)]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
