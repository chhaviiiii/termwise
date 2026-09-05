import { addDays, format, startOfDay } from "date-fns";
import type { AcademicEvent, StudentMemory } from "./types";

export type TonightItem = {
  event: AcademicEvent;
  reason: string;
};

export function buildStudyTonight(memory: StudentMemory, now = new Date()): TonightItem[] {
  const today = startOfDay(now);
  const todayKey = format(today, "yyyy-MM-dd");
  const horizon = format(addDays(today, 4), "yyyy-MM-dd");
  const items = memory.events
    .filter((event) => event.kind !== "office-hour" && event.date >= todayKey && event.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date) || b.estimatedHours - a.estimatedHours)
    .slice(0, 6);

  return items.map((event) => ({
    event,
    reason:
      event.kind === "study"
        ? "Kept study block from listed hours."
        : event.date === todayKey
          ? "Due today."
          : event.kind === "exam"
            ? `Exam on ${event.date}. Start review tonight.`
            : `Due ${event.date} · ~${event.estimatedHours}h.`,
  }));
}

export function formatStudyTonight(memory: StudentMemory, items: TonightItem[]) {
  const lines = items.length
    ? items.map((item) => `- ${item.event.courseCode}: ${item.event.title} (${item.reason})`).join("\n")
    : "- Nothing due in the next few days. Keep a light review or a reading.";
  return `Tonight on the desk

${lines}

Termwise will not add these to a calendar unless you confirm.`;
}
