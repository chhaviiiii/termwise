import type { Collision, ExtensionDraft, StudentMemory } from "./types";
import { isMajorDeadline } from "./collisions";

function pickFlexibleEvent(collision: Collision) {
  return (
    collision.events.find((event) => /\b(project|paper|essay)\b/i.test(event.title)) ??
    collision.events.find((event) => event.kind === "assignment") ??
    collision.events[collision.events.length - 1]
  );
}

export function draftExtensionRequest(memory: StudentMemory, collision: Collision): ExtensionDraft {
  const target = pickFlexibleEvent(collision);
  const course = memory.courses.find((item) => item.id === target.courseId || item.code === target.courseCode);
  const others = collision.events.filter((event) => event.id !== target.id && isMajorDeadline(event));
  const professor = course?.professor || "Professor";
  const greeting = professor.replace(/^dr\.?\s+/i, "Dr. ").replace(/^prof\.?\s+/i, "Professor ");

  const body = `Dear ${greeting},

I'm writing about ${target.title} in ${target.courseCode}, due ${target.date}${target.time ? ` at ${target.time}` : ""}. I have ${others.length} other major deadline${others.length === 1 ? "" : "s"} in a ${collision.hoursSpan}-hour window (${others.map((event) => `${event.courseCode} ${event.title} on ${event.date}`).join("; ")}), and I want to turn in work I'm proud of.

Would it be possible to submit ${target.title} 48 hours later? Happy to share where I am if that helps.

Thank you for considering this.

Sincerely,
${memory.studentName}`;

  return {
    toName: professor,
    toEmail: course?.email || "",
    subject: `A note about the ${target.courseCode} deadline`,
    body,
    courseCode: target.courseCode,
    collisionId: collision.id,
  };
}

export function mailtoHref(draft: ExtensionDraft) {
  const params = new URLSearchParams({
    subject: draft.subject,
    body: draft.body,
  });
  return `mailto:${draft.toEmail}?${params.toString()}`;
}

export function gmailComposeHref(draft: ExtensionDraft) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: draft.toEmail,
    su: draft.subject,
    body: draft.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function outlookMailHref(draft: ExtensionDraft) {
  const params = new URLSearchParams({
    to: draft.toEmail,
    subject: draft.subject,
    body: draft.body,
  });
  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
}

export function reviewMailHref(draft: ExtensionDraft, destination: "google" | "outlook" | "file") {
  if (destination === "outlook") return outlookMailHref(draft);
  if (destination === "file") return mailtoHref(draft);
  return gmailComposeHref(draft);
}
