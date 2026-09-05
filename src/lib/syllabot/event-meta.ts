import type { AcademicEvent, Collision, Course } from "./types";

export function displayKind(event: Pick<AcademicEvent, "kind" | "title">) {
  if (event.kind === "office-hour") return "Office hours";
  if (event.kind === "exam") {
    if (/\bfinal\b/i.test(event.title)) return "Final";
    if (/\bmidterm\b/i.test(event.title)) return "Midterm";
    if (/\bquiz\b/i.test(event.title)) return "Quiz";
    return "Exam";
  }
  if (event.kind === "reading") return "Reading";
  if (/\b(paper|essay)\b/i.test(event.title)) return "Paper";
  if (/\bproject\b/i.test(event.title)) return "Project";
  if (event.kind === "assignment") return "Assignment";
  return "Deadline";
}

export function eventCourse(event: Pick<AcademicEvent, "courseId" | "courseCode">, courses: Course[]) {
  return courses.find((course) => course.id === event.courseId || course.code === event.courseCode);
}

export function collisionForEvent(event: Pick<AcademicEvent, "id">, collisions: Collision[]) {
  return collisions.find((collision) => collision.events.some((item) => item.id === event.id));
}

export function formatEventWhen(event: Pick<AcademicEvent, "date" | "time">) {
  const date = new Date(`${event.date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${date} · ${event.time || "All day"}`;
}

export function eventDescription(event: AcademicEvent, course?: Course) {
  const parts = [
    displayKind(event),
    event.estimatedHours ? `~${event.estimatedHours}h` : "",
    event.weight ? `weight ${event.weight}` : "",
    course?.professor && course.professor !== "Professor" ? course.professor : "",
    course?.officeHours ? `OH ${course.officeHours}` : "",
    course?.latePolicy ? `Late: ${course.latePolicy}` : "",
    event.location || "",
    "added by Termwise",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function eventHoverSummary(event: AcademicEvent, course?: Course, collision?: Collision) {
  const parts = [
    event.courseCode,
    displayKind(event),
    formatEventWhen(event),
    event.location,
    event.estimatedHours ? `~${event.estimatedHours}h` : "",
    event.weight,
    course?.professor && course.professor !== "Professor" ? course.professor : "",
    collision ? `${collision.severity} pileup` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}
