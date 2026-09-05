import type { AcademicEvent, EventReview } from "./types";

function similarTitle(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function changedFields(current: AcademicEvent, incoming: AcademicEvent) {
  return current.date !== incoming.date
    || current.time !== incoming.time
    || current.title !== incoming.title
    || current.estimatedHours !== incoming.estimatedHours
    || (current.weight ?? "") !== (incoming.weight ?? "")
    || (current.location ?? "") !== (incoming.location ?? "");
}

export function annotateEventReviews(incoming: AcademicEvent[], existing: AcademicEvent[]): AcademicEvent[] {
  return incoming.map((event) => {
    const match = existing.find((item) => (
      item.id === event.id
      || (item.courseCode === event.courseCode && item.date === event.date && similarTitle(item.title, event.title))
    ));
    let review: EventReview = "new";
    if (match && changedFields(match, event)) review = "changed";
    else if (match) review = "same";
    return { ...event, review };
  });
}
