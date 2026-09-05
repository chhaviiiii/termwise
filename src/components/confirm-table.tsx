"use client";

import { courseWeightTotals, displayKind, type AcademicEvent, type Course } from "@/lib/syllabot";

function Field({
  value,
  onChange,
  className,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 w-full rounded-md border border-[var(--sb-line)] bg-[var(--sb-bg)] px-2 text-xs outline-none ${className ?? ""}`}
    />
  );
}

export function ConfirmTable({
  events,
  courses,
  skipped,
  onChange,
  onToggle,
  onKeepSuggested,
  onSkipSuggested,
}: {
  events: AcademicEvent[];
  courses: Course[];
  skipped: string[];
  onChange: (id: string, patch: Partial<AcademicEvent>) => void;
  onToggle: (id: string) => void;
  onKeepSuggested?: () => void;
  onSkipSuggested?: () => void;
}) {
  const skippedSet = new Set(skipped);

  const suggested = events.filter((event) => event.suggested);
  const officeHours = events.filter((event) => event.kind === "office-hour");
  const rows = events.filter((event) => event.kind !== "office-hour");
  const officeByCourse = courses
    .map((course) => ({
      course,
      count: officeHours.filter((event) => event.courseId === course.id || event.courseCode === course.code).length,
    }))
    .filter((item) => item.course.officeHours || item.count);

  return (
    <div className="space-y-3">
      {officeByCourse.length > 0 && (
        <div className="rounded-xl border border-[var(--sb-line)] bg-[var(--sb-soft)] px-3 py-2.5">
          <p className="text-[11px] font-medium text-[var(--sb-ink)]">Weekly office hours — always kept</p>
          <div className="mt-1.5 space-y-0.5 text-[11px] text-[var(--sb-muted)]">
            {officeByCourse.map(({ course, count }) => (
              <p key={course.id}>
                <span className="font-semibold text-[var(--sb-ink)]">{course.code}</span>
                {course.officeHours ? ` · ${course.officeHours}` : ""}
                {count ? ` · ${count} weeks` : ""}
              </p>
            ))}
          </div>
        </div>
      )}
      {suggested.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[var(--sb-muted)]">{suggested.length} suggested study block{suggested.length === 1 ? "" : "s"} from listed hours — off until you keep them.</p>
          <div className="flex gap-2">
            {onKeepSuggested && <button type="button" className="sb-btn-ghost h-8" onClick={onKeepSuggested}>Keep suggested</button>}
            {onSkipSuggested && <button type="button" className="sb-btn-ghost h-8" onClick={onSkipSuggested}>Skip suggested</button>}
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-[var(--sb-line)]">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="bg-[var(--sb-soft)] text-[var(--sb-muted)]">
            <tr>
              <th className="px-2 py-2 font-medium">Keep</th>
              <th className="px-2 py-2 font-medium">Course</th>
              <th className="px-2 py-2 font-medium">Item</th>
              <th className="px-2 py-2 font-medium">Kind</th>
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Time</th>
              <th className="px-2 py-2 font-medium">Hours</th>
              <th className="px-2 py-2 font-medium">Weight</th>
              <th className="px-2 py-2 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => {
              const off = skippedSet.has(event.id);
              return (
                <tr key={event.id} className={`border-t border-[var(--sb-line)] ${off ? "opacity-40" : ""}`}>
                  <td className="px-2 py-1.5">
                    <input type="checkbox" checked={!off} onChange={() => onToggle(event.id)} aria-label={`Keep ${event.title}`} />
                  </td>
                  <td className="px-2 py-1.5 font-semibold">
                    {event.courseCode}
                    {event.suggested && <span className="ml-1 font-normal text-[var(--sb-muted)]">suggested</span>}
                    {!event.suggested && event.review === "new" && <span className="ml-1 font-normal text-[var(--sb-muted)]">new</span>}
                    {event.review === "changed" && <span className="ml-1 font-normal text-[var(--sb-warn)]">changed</span>}
                    {event.review === "same" && <span className="ml-1 font-normal text-[var(--sb-muted)]">same</span>}
                  </td>
                  <td className="px-2 py-1.5 min-w-[10rem]"><Field value={event.title} onChange={(title) => onChange(event.id, { title })} /></td>
                  <td className="px-2 py-1.5">{displayKind(event)}</td>
                  <td className="px-2 py-1.5 w-[8.5rem]"><Field type="date" value={event.date} onChange={(date) => onChange(event.id, { date })} /></td>
                  <td className="px-2 py-1.5 w-[7rem]"><Field value={event.time} onChange={(time) => onChange(event.id, { time })} /></td>
                  <td className="px-2 py-1.5 w-[4.5rem]"><Field value={String(event.estimatedHours)} onChange={(value) => onChange(event.id, { estimatedHours: Number(value) || 0 })} /></td>
                  <td className="px-2 py-1.5 w-[4.5rem]"><Field value={event.weight ?? ""} onChange={(weight) => onChange(event.id, { weight: weight || undefined })} /></td>
                  <td className="px-2 py-1.5 w-[7rem]"><Field value={event.location ?? ""} onChange={(location) => onChange(event.id, { location: location || undefined })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-1 text-[11px] text-[var(--sb-muted)]">
        {courses.map((course) => {
          const kept = rows.filter((event) => event.courseCode === course.code && !skippedSet.has(event.id));
          const { total, counted } = courseWeightTotals(kept, course.code);
          return (
            <p key={course.id}>
              <span className="font-semibold text-[var(--sb-ink)]">{course.code}</span>
              {counted ? ` · listed weights add to ${total}%` : " · no weights listed"}
              {counted && total < 100 ? " · rest was not on the syllabus" : ""}
              {counted && total > 100 ? " · over 100%, check the rows" : ""}
              {course.professor && course.professor !== "Professor" ? ` · ${course.professor}` : ""}
              {course.officeHours ? ` · OH ${course.officeHours}` : ""}
              {course.latePolicy ? ` · Late: ${course.latePolicy}` : ""}
            </p>
          );
        })}
      </div>
    </div>
  );
}
