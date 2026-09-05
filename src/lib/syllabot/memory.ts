import type { AcademicEvent, Course, StudentMemory } from "./types";

export function eventBelongsToCourse(event: Pick<AcademicEvent, "courseId" | "courseCode">, course: Pick<Course, "id" | "code">) {
  return event.courseId === course.id || event.courseCode.toLowerCase() === course.code.toLowerCase();
}

export function removeCourseFromMemory(memory: StudentMemory, courseId: string): StudentMemory {
  const course = memory.courses.find((item) => item.id === courseId);
  if (!course) return memory;
  return {
    ...memory,
    courses: memory.courses.filter((item) => item.id !== courseId),
    events: memory.events.filter((event) => !eventBelongsToCourse(event, course)),
    extensions: memory.extensions.filter((item) => item.courseCode.toLowerCase() !== course.code.toLowerCase()),
  };
}
