export type CalendarDestination = "google" | "outlook" | "file";

export type DestinationInfo = {
  id: CalendarDestination;
  calendarLabel: string;
  mailLabel: string;
  pairLabel: string;
  shortLabel: string;
  addAllLabel: string;
  addOneLabel: string;
  subscribeHint: string;
  fileHint: string;
  reviewMailLabel: string;
};

export const DESTINATIONS: Record<CalendarDestination, DestinationInfo> = {
  google: {
    id: "google",
    calendarLabel: "Google Calendar",
    mailLabel: "Gmail",
    pairLabel: "Google Calendar / Gmail",
    shortLabel: "Google",
    addAllLabel: "Add all to Google Calendar",
    addOneLabel: "Add to Google",
    subscribeHint: "In Google Calendar: Settings → Add calendar → From URL. Paste the subscribe link. One tab only, so the browser does not block a stack.",
    fileHint: "Or download the .ics and import it. Apple Calendar opens the same file.",
    reviewMailLabel: "Review in Gmail",
  },
  outlook: {
    id: "outlook",
    calendarLabel: "Outlook Calendar",
    mailLabel: "Outlook mail",
    pairLabel: "Outlook Calendar / Outlook mail",
    shortLabel: "Outlook",
    addAllLabel: "Add all to Outlook Calendar",
    addOneLabel: "Add to Outlook",
    subscribeHint: "In Outlook Calendar: Add calendar → Subscribe from web. Paste the subscribe link, or use Add from internet.",
    fileHint: "Or download the .ics and open it in Outlook. Apple Calendar opens the same file.",
    reviewMailLabel: "Review in Outlook",
  },
  file: {
    id: "file",
    calendarLabel: "Fallback",
    mailLabel: ".ics download / mailto draft",
    pairLabel: "Fallback: .ics download / mailto draft",
    shortLabel: "Fallback",
    addAllLabel: "Download .ics",
    addOneLabel: "Download .ics",
    subscribeHint: "No account needed. Download the semester .ics, or copy the subscribe URL for any calendar that accepts one.",
    fileHint: "Always available. Apple Calendar, Outlook, and Google Calendar all open .ics files.",
    reviewMailLabel: "Open mailto draft",
  },
};

export const DESTINATION_RECONNECT_NOTE =
  "Grok Bot recipients reconnect whichever they use — Google Calendar / Gmail and/or Outlook Calendar / Outlook mail. They pick; they do not inherit logins.";

export function isDestination(value: unknown): value is CalendarDestination {
  return value === "google" || value === "outlook" || value === "file";
}
