export type EventKind = "exam" | "assignment" | "reading" | "office-hour" | "deadline";
export type CollisionSeverity = "watch" | "severe";

export type Course = {
  id: string;
  code: string;
  name: string;
  professor: string;
  email: string;
  officeHours: string;
  latePolicy?: string;
  color: string;
  bg: string;
};

export type AcademicEvent = {
  id: string;
  courseId: string;
  courseCode: string;
  title: string;
  kind: EventKind;
  date: string;
  time: string;
  estimatedHours: number;
  sourceLine: string;
  location?: string;
  weight?: string;
  notes?: string;
};

export type Collision = {
  id: string;
  start: string;
  end: string;
  hoursSpan: number;
  severity: CollisionSeverity;
  events: AcademicEvent[];
  totalHours: number;
};

export type ExtensionDraft = {
  toName: string;
  toEmail: string;
  subject: string;
  body: string;
  courseCode: string;
  collisionId: string;
};

export type WeeklyBrief = {
  weekLabel: string;
  rangeStart: string;
  rangeEnd: string;
  items: AcademicEvent[];
  collisions: Collision[];
  totalHours: number;
  capacityHours: number;
  startEarly: { title: string; reason: string } | null;
};

export type TermProgress = {
  fromLabel: string;
  toLabel: string;
  percent: number;
  remainingCount: number;
  remainingMajors: number;
  doneCount: number;
  nextTitle: string | null;
  nextDate: string | null;
};

export type StudentMemory = {
  studentName: string;
  weeklyCapacityHours: number;
  courses: Course[];
  events: AcademicEvent[];
  extensions: { courseCode: string; status: string; note: string }[];
};

export type ExtractionResult = {
  course: Course;
  events: AcademicEvent[];
  warnings: string[];
};
