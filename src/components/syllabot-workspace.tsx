"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle, CalendarDays, Check, CheckCircle2,
  Clock3, Copy, Download, FileText, LayoutDashboard, Mail, MessageSquare,
  Send, Settings, Trash2, UploadCloud, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DEMO_SYLLABI,
  DEFAULT_MEMORY,
  DESTINATIONS,
  DESTINATION_PICKER_HINT,
  DESTINATION_RECONNECT_NOTE,
  annotateEventReviews,
  buildStudyTonight,
  buildTermLoad,
  buildTermProgress,
  buildWeeklyBrief,
  collisionForEvent,
  displayKind,
  downloadIcs,
  draftExtensionRequest,
  eventBelongsToCourse,
  eventsToIcs,
  withOfficeHours,
  extractFromText,
  findCollisions,
  formatBriefEmail,
  formatEventWhen,
  formatStudyTonight,
  mailtoHref,
  mergeExtractions,
  mergeUniqueEvents,
  removeCourseFromMemory,
  reviewMailHref,
  suggestStudyBlocks,
  type AcademicEvent,
  type CalendarDestination,
  type Collision,
  type Course,
  type ExtensionDraft,
  type StudentMemory,
  type TermProgress,
} from "@/lib/syllabot";
import {
  CHECK_COLLISIONS_SKILL,
  CONNECT_PLUGINS,
  DRAFT_EXTENSION_SKILL,
  EXTRACT_SYLLABUS_SKILL,
  GROK_SETUP_STEPS,
  STUDY_TONIGHT_SKILL,
  TERMWISE_IDENTITY,
  TERMWISE_LISTING,
  WEEKLY_BRIEF_ROUTINE,
} from "@/lib/syllabot/templates";
import { SemesterCalendar } from "@/components/semester-calendar";
import { AppearancePanel } from "@/components/appearance-panel";
import { AddCalendarPanel, type PublishInfo } from "@/components/add-calendar-panel";
import { DestinationChoice } from "@/components/destination-choice";
import { ConfirmTable } from "@/components/confirm-table";
import { LoadStrip } from "@/components/load-strip";
import {
  DEFAULT_APPEARANCE,
  getAppearance,
  removeCourseColor,
  subscribeAppearance,
  writeAppearance,
  type Appearance,
} from "@/lib/syllabot/appearance";

type View = "overview" | "chat" | "calendar" | "collisions" | "briefs" | "templates";
type ChatMessage = { id: string; role: "bot" | "user"; text: string };

const STORAGE_KEY = "termwise-memory-v1";
const LEGACY_STORAGE_KEYS = ["syllabot-memory-v1"];
const EMPTY_MEMORY: StudentMemory = {
  studentName: DEFAULT_MEMORY.studentName,
  weeklyCapacityHours: DEFAULT_MEMORY.weeklyCapacityHours,
  courses: [],
  events: [],
  extensions: DEFAULT_MEMORY.extensions,
};
const emptyMemory = (): StudentMemory => ({
  studentName: EMPTY_MEMORY.studentName,
  weeklyCapacityHours: EMPTY_MEMORY.weeklyCapacityHours,
  courses: [],
  events: [],
  extensions: EMPTY_MEMORY.extensions,
});

let memoryCache = emptyMemory();
const memoryListeners = new Set<() => void>();

function readStoredMemory() {
  if (typeof window === "undefined") return null;
  const current = window.localStorage.getItem(STORAGE_KEY);
  if (current) return current;
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = window.localStorage.getItem(key);
    if (legacy) {
      window.localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  }
  return null;
}

if (typeof window !== "undefined") {
  const saved = readStoredMemory();
  if (saved) {
    try { memoryCache = { ...emptyMemory(), ...JSON.parse(saved) }; } catch { /* keep default */ }
  }
}

function subscribeMemory(listener: () => void) {
  memoryListeners.add(listener);
  return () => memoryListeners.delete(listener);
}

function writeMemory(next: StudentMemory) {
  memoryCache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  memoryListeners.forEach((listener) => listener());
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SyllabotWorkspace() {
  const [view, setView] = useState<View>("overview");
  const appearance = useSyncExternalStore(subscribeAppearance, getAppearance, () => DEFAULT_APPEARANCE);
  const memory = useSyncExternalStore(subscribeMemory, () => memoryCache, () => EMPTY_MEMORY);
  const setMemory = (update: StudentMemory | ((current: StudentMemory) => StudentMemory)) => {
    writeMemory(typeof update === "function" ? update(memoryCache) : update);
  };
  const [pending, setPending] = useState<{ events: AcademicEvent[]; courses: StudentMemory["courses"]; skipped: string[] } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "bot", text: `I'm Termwise. Drop a syllabus, paste text, or load the demo. I'll gather the dates, let you edit or skip rows, and offer optional work-back study blocks. When you're ready, pick ${DESTINATION_PICKER_HINT}. I'll flag pileups, write the week brief, and draft emails. I never send them.` },
  ]);
  const [draft, setDraft] = useState<ExtensionDraft | null>(null);
  const [queuedDraft, setQueuedDraft] = useState<ExtensionDraft | null>(null);
  const [composer, setComposer] = useState("");
  const [paste, setPaste] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [toast, setToast] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [showAddCalendar, setShowAddCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [removing, setRemoving] = useState<Course | null>(null);
  const [publishInfo, setPublishInfo] = useState<PublishInfo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const collisions = useMemo(() => findCollisions(memory.events), [memory.events]);
  const brief = useMemo(() => buildWeeklyBrief(memory), [memory]);
  const weekEvents = brief.items;
  const severe = collisions.find((collision) => collision.severity === "severe") ?? collisions[0] ?? null;

  const destination = appearance.destination;
  const chosen = DESTINATIONS[destination];

  function setDestination(value: CalendarDestination) {
    writeAppearance((current) => ({ ...current, destination: value }));
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function say(role: ChatMessage["role"], text: string) {
    setMessages((current) => [...current, { id: `${Date.now()}-${current.length}`, role, text }]);
  }

  function ingest(courses: StudentMemory["courses"], events: AcademicEvent[], source: string) {
    const withHours = withOfficeHours(courses, events);
    const reviewed = annotateEventReviews(withHours, memory.events);
    const suggestions = suggestStudyBlocks(reviewed).filter((block) => !memory.events.some((event) => event.id === block.id));
    const officeHours = reviewed.filter((event) => event.kind === "office-hour").length;
    const skipped = suggestions.map((block) => block.id);
    setPending({ courses, events: [...reviewed, ...suggestions], skipped });
    setShowUpload(true);
    const changed = reviewed.filter((event) => event.review === "changed").length;
    say("bot", `${source}: ${reviewed.length} dated item${reviewed.length === 1 ? "" : "s"} across ${courses.length} course${courses.length === 1 ? "" : "s"}${officeHours ? `, including weekly office hours` : ""}${suggestions.length ? `, plus ${suggestions.length} suggested study block${suggestions.length === 1 ? "" : "s"}` : ""}${changed ? `, ${changed} changed` : ""}. Edit or skip rows. Office hours stay on. Then confirm.`);
  }

  function loadDemo() {
    const results = DEMO_SYLLABI.map((syllabus, index) => extractFromText(syllabus.text, syllabus.fileName, index));
    const merged = mergeExtractions(results);
    say("user", "Load the demo semester (CS 301, ECON 210, PHIL 160, DES 220).");
    ingest(merged.courses, merged.events, "Demo syllabi extracted");
  }

  function ingestText(text: string, fileName = "pasted-syllabus.txt") {
    const result = extractFromText(text, fileName, memory.courses.length);
    if (!result.events.length) {
      setUploadError(result.warnings[0] || "No dated items found.");
      return;
    }
    ingest([result.course], result.events, `Extracted ${result.course.code}`);
  }

  async function processFiles(files: File[]) {
    if (!files.length) return;
    setProcessing(true);
    setUploadError("");
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    try {
      const response = await fetch("/api/extract", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not read those syllabi.");
      ingest(data.courses, data.events, `Read ${data.documents.length} file${data.documents.length === 1 ? "" : "s"}`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not read those syllabi.");
    } finally {
      setProcessing(false);
    }
  }

  function requestRemoveCourse(course: Course) {
    setRemoving(course);
  }

  function confirmRemoveCourse() {
    if (!removing) return;
    const course = removing;
    const removedIds = new Set(memory.events.filter((event) => eventBelongsToCourse(event, course)).map((event) => event.id));
    const next = removeCourseFromMemory(memory, course.id);
    setMemory(next);
    removeCourseColor(course.id);
    setCompleted((current) => current.filter((id) => !removedIds.has(id)));
    if (draft && draft.courseCode.toLowerCase() === course.code.toLowerCase()) setDraft(null);
    if (queuedDraft && queuedDraft.courseCode.toLowerCase() === course.code.toLowerCase()) setQueuedDraft(null);
    setRemoving(null);
    if (next.events.length) {
      void publishCalendar(next);
    } else {
      setPublishInfo(null);
    }
    notify(next.courses.length ? `${course.code} is off the desk.` : `${course.code} is off the desk. Add a syllabus when you are ready.`);
    say("bot", next.courses.length
      ? `Removed ${course.code} and its dates. Your other classes are still here.`
      : `Removed ${course.code}. The desk is empty again.`);
  }

  function confirmCalendar() {
    if (!pending) return;
    const courses = memory.courses.map((course) => ({ ...course }));
    for (const course of pending.courses) {
      const index = courses.findIndex((item) => item.code.toLowerCase() === course.code.toLowerCase());
      if (index >= 0) {
        courses[index] = {
          ...courses[index],
          professor: course.professor || courses[index].professor,
          email: course.email || courses[index].email,
          officeHours: course.officeHours || courses[index].officeHours,
          latePolicy: course.latePolicy || courses[index].latePolicy,
        };
      } else {
        courses.push({ ...course });
      }
    }
    const kept = pending.events.filter((event) => event.kind === "office-hour" || !pending.skipped.includes(event.id));
    if (!kept.length) {
      notify("Keep at least one row, or go back.");
      return;
    }
    const incoming = withOfficeHours(courses, kept);
    const next: StudentMemory = {
      ...memory,
      courses,
      events: mergeUniqueEvents(memory.events.filter((event) => !incoming.some((nextEvent) => nextEvent.id === event.id)), incoming),
    };
    const found = findCollisions(next.events);
    setMemory(next);
    setPending(null);
    setShowUpload(false);
    setView("calendar");
    setShowAddCalendar(true);
    say("user", "Add these events to my calendar.");
    if (found.length) {
      const top = found.find((item) => item.severity === "severe") ?? found[0];
      say("bot", `Added ${incoming.length} items to your Termwise calendar, including office hours. ${found.length} collision${found.length === 1 ? "" : "s"}: ${top.events.map((event) => event.courseCode).join(", ")} on ${formatDate(top.start)} to ${formatDate(top.end)}.`);
      if (top.severity === "severe") setQueuedDraft(draftExtensionRequest(next, top));
    } else {
      say("bot", `Added ${incoming.length} items to your Termwise calendar. No 48-hour pileups.`);
    }
    notify(`${incoming.length} events are on your Termwise calendar.`);
    void publishCalendar(next);
  }

  async function publishCalendar(source = memory) {
    if (!source.events.length) return null;
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: source.events, courses: source.courses, timeZone: appearance.timeZone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPublishInfo(data);
      return data as PublishInfo;
    } catch {
      return null;
    }
  }

  function exportCalendar() {
    if (!memory.events.length) {
      notify("Add a syllabus first.");
      return;
    }
    downloadIcs("termwise-semester.ics", eventsToIcs(memory.events, memory.courses, appearance.timeZone));
    notify(destination === "file"
      ? "Calendar file downloaded. Import the .ics in any calendar app."
      : `Calendar file downloaded for ${appearance.timeZone}.`);
  }

  function copySubscribeLink(url?: string) {
    const target = url ?? publishInfo?.icsUrl;
    if (!target) {
      notify("Confirm the events first, then try again.");
      return;
    }
    void navigator.clipboard.writeText(target);
    notify(destination === "file"
      ? "Subscribe link copied. Paste it into any calendar that accepts a URL."
      : `Subscribe link copied. Paste it into ${chosen.calendarLabel}.`);
  }

  async function addAllToDestination() {
    if (!memory.events.length) {
      notify("Add a syllabus first.");
      return;
    }
    downloadIcs("termwise-semester.ics", eventsToIcs(memory.events, memory.courses, appearance.timeZone));
    if (destination === "file") {
      notify("Calendar file downloaded. Import it in any calendar app. Termwise did not write anything.");
      return;
    }
    const published = publishInfo ?? await publishCalendar();
    if (published?.icsUrl) {
      void navigator.clipboard.writeText(published.icsUrl);
    }
    if (destination === "apple") {
      if (published?.webcalUrl) window.open(published.webcalUrl, "_blank", "noopener,noreferrer");
      notify("Downloaded the semester .ics for Apple Calendar. Open the file or the subscribe link if asked.");
      return;
    }
    const openUrl = destination === "outlook"
      ? published?.outlookSubscribe ?? published?.outlookImport ?? "https://outlook.live.com/calendar/0/addfromweb"
      : published?.googleImport ?? "https://calendar.google.com/calendar/u/0/r/settings/addbyurl";
    window.open(openUrl, "_blank", "noopener,noreferrer");
    notify(`Downloaded the semester .ics and opened ${chosen.calendarLabel}. Paste the copied subscribe link if asked.`);
  }

  function runTonight() {
    const items = buildStudyTonight(memory);
    say("user", "Study tonight.");
    say("bot", formatStudyTonight(memory, items));
    setView("chat");
  }

  function runBrief() {
    const next = buildWeeklyBrief(memory);
    say("user", "Run weekly-brief.");
    say("bot", formatBriefEmail(memory, next, findCollisions(memory.events)));
    setView("briefs");
  }

  function runDraft(collision = severe) {
    if (!collision) {
      notify("No pileup to write about yet.");
      return;
    }
    const next = draftExtensionRequest(memory, collision);
    setDraft(next);
    say("user", "Draft an extension request.");
    say("bot", `Draft ready for ${next.toName} (${next.courseCode}). Not sent.`);
  }

  function handlePrompt(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setComposer("");
    const lower = text.toLowerCase();
    if (lower.includes("demo")) return loadDemo();
    if (lower.includes("collision")) {
      say("user", text);
      if (!collisions.length) return say("bot", "No pileups yet. Confirm a syllabus first.");
      setView("collisions");
      return say("bot", collisions.map((item) => `${item.severity}: ${item.events.map((event) => event.courseCode).join(", ")} ${item.start} to ${item.end}`).join("\n"));
    }
    if (lower.includes("tonight") || lower.includes("study tonight")) return runTonight();
    if (lower.includes("brief") || lower.includes("sunday")) return runBrief();
    if (lower.includes("extension") || lower.includes("draft") || lower === "send it") {
      if (lower === "send it" && draft) {
        say("user", "send it");
        window.open(reviewMailHref(draft, destination), "_blank", "noopener,noreferrer");
        return say("bot", `Opened ${chosen.mailLabel} with the draft. I still have not sent anything myself.`);
      }
      return runDraft();
    }
    if (lower.includes("calendar") || lower.includes("add to google") || lower.includes("outlook")) {
      say("user", text);
      if (!memory.events.length) return say("bot", "Confirm a syllabus first, then I can put it on the calendar.");
      setView("calendar");
      setShowAddCalendar(true);
      return say("bot", `Your semester is on the Termwise calendar. Choose ${DESTINATION_PICKER_HINT} when you want the dates over there too. ${DESTINATION_RECONNECT_NOTE}`);
    }
    if (lower.includes("confirm") && pending) return confirmCalendar();
    if (/\b(due|exam|midterm|professor|office hours|assignment|project)\b/i.test(text) && findDateHint(text)) {
      say("user", text);
      return ingestText(text, "chat-syllabus.txt");
    }
    say("user", text);
    say("bot", "I can read a syllabus, check for pileups, write the Sunday note, suggest study blocks, or draft an extension. Paste a syllabus, load the demo, or try “check collisions” or “study tonight”.");
  }

  const firstName = memory.studentName.split(" ")[0];
  const themedCourses = memory.courses.map((course) => ({
    ...course,
    color: appearance.courseColors[course.id] ?? course.color,
  }));
  const themedMemory = { ...memory, courses: themedCourses };
  const term = useMemo(() => buildTermProgress(memory), [memory]);
  const viewLabel = {
    overview: "This week",
    chat: "Chat",
    calendar: "Calendar",
    collisions: "Collisions",
    briefs: "Week brief",
    templates: "Templates",
  }[view];

  return (
    <main className="syllabot-shell" data-theme={appearance.theme} data-density={appearance.density} style={{ ["--sb-accent" as string]: appearance.accent }}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-[var(--sb-line)] bg-[var(--sb-bg)] px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <BrandMark size={32} />
          <div>
            <p className="text-lg font-semibold tracking-tight">Termwise</p>
            <p className="text-xs text-[var(--sb-muted)]">Semester desk</p>
          </div>
        </div>
        <nav className="mt-8 space-y-0.5">
          <NavItem icon={<LayoutDashboard />} label="Overview" active={view === "overview"} onClick={() => setView("overview")} />
          <NavItem icon={<CalendarDays />} label="Calendar" active={view === "calendar"} onClick={() => setView("calendar")} />
          <NavItem icon={<MessageSquare />} label="Chat" active={view === "chat"} onClick={() => setView("chat")} />
          <NavItem icon={<AlertTriangle />} label="Collisions" count={collisions.length || undefined} active={view === "collisions"} onClick={() => setView("collisions")} />
          <NavItem icon={<Mail />} label="Brief" active={view === "briefs"} onClick={() => setView("briefs")} />
          <NavItem icon={<FileText />} label="Templates" active={view === "templates"} onClick={() => setView("templates")} />
        </nav>
        <p className="mb-2 mt-8 px-2 text-[11px] uppercase tracking-[0.14em] text-[var(--sb-muted)]">Courses</p>
        <div className="space-y-1">
          {themedCourses.length ? themedCourses.map((course) => (
            <div key={course.id} className="flex items-center gap-1 px-2 py-1 text-sm">
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: course.color }} />
              <span className="min-w-0 flex-1 truncate">{course.code}</span>
              <button
                type="button"
                onClick={() => requestRemoveCourse(course)}
                className="grid size-7 shrink-0 place-items-center rounded-md text-[var(--sb-muted)] hover:bg-[var(--sb-soft)] hover:text-[var(--sb-ink)]"
                aria-label={`Remove ${course.code}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )) : <p className="px-2 text-xs text-[var(--sb-muted)]">None yet</p>}
        </div>
        <button onClick={() => setShowSettings(true)} className="mt-auto flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[var(--sb-soft)]">
          <span className="grid size-8 place-items-center rounded-full bg-[var(--sb-soft)] text-xs font-semibold">{firstName.slice(0, 1)}{memory.studentName.split(" ")[1]?.[0] ?? ""}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{memory.studentName}</span>
            <span className="block text-xs text-[var(--sb-muted)]">{memory.weeklyCapacityHours}h / week</span>
          </span>
          <Settings className="size-4 text-[var(--sb-muted)]" />
        </button>
      </aside>

      <section className="pb-24 lg:pb-0 lg:pl-[220px]">
        <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[var(--sb-line)] bg-[var(--sb-bg)]/90 px-4 backdrop-blur sm:px-5 md:px-8">
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <BrandMark size={30} />
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold tracking-tight">Termwise</p>
              <p className="truncate text-[10px] text-[var(--sb-muted)]">{viewLabel}</p>
            </div>
          </div>
          <p className="hidden text-sm text-[var(--sb-muted)] lg:block">{firstName} · I&apos;ll keep the desk tidy</p>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="sb-btn-ghost h-9" type="button"><Settings className="size-3.5" /> <span className="hidden sm:inline">Customize</span></button>
            <button type="button" onClick={() => { setView("calendar"); if (memory.events.length) setShowAddCalendar(true); }} className="sb-btn-ghost hidden h-9 md:inline-flex"><CalendarDays className="size-3.5" /> Calendar</button>
            <button type="button" onClick={() => { setShowUpload(true); setUploadError(""); }} className="sb-btn h-9">
              <UploadCloud className="size-4" /> <span className="hidden sm:inline">Add syllabus</span>
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] p-5 md:p-8 lg:p-10">
          {view === "overview" && (
            <Overview
              memory={themedMemory}
              appearance={appearance}
              brief={brief}
              term={term}
              collisions={collisions}
              weekEvents={weekEvents}
              completed={completed}
              setCompleted={setCompleted}
              onDemo={loadDemo}
              onUpload={() => setShowUpload(true)}
              onCollision={() => setView("collisions")}
              onCalendar={() => setView("calendar")}
              onDraft={() => { if (severe) runDraft(severe); }}
              onBrief={runBrief}
              onTonight={runTonight}
              onCustomize={() => setShowSettings(true)}
              onRemoveCourse={requestRemoveCourse}
            />
          )}
          {view === "calendar" && (
            memory.events.length
              ? (
                <SemesterCalendar
                  events={memory.events}
                  courses={themedCourses}
                  collisions={collisions}
                  destination={destination}
                  subscribeUrl={publishInfo?.icsUrl}
                  onAddAll={() => setShowAddCalendar(true)}
                  onCopySubscribe={() => copySubscribeLink()}
                  onDestination={setDestination}
                />
              )
              : <Empty title="Calendar is empty" body={`Confirm a syllabus and I will lay out the deadlines, exams, readings, study blocks you kept, and office hours by course color. Then pick ${DESTINATION_PICKER_HINT}. Nothing is written until you click.`} />
          )}
          {view === "chat" && (
            <ChatPanel messages={messages} composer={composer} setComposer={setComposer} onSend={() => handlePrompt(composer)} onDemo={loadDemo} onCalendar={() => handlePrompt("add to calendar")} />
          )}
          {view === "collisions" && (
            <CollisionsPanel memory={themedMemory} collisions={collisions} onDraft={(collision) => runDraft(collision)} onExport={exportCalendar} />
          )}
          {view === "briefs" && (
            <BriefPanel memory={themedMemory} brief={brief} collisions={collisions} onSchedule={() => notify("Sunday 8:00 PM note is set. I’ll have it ready here.")} />
          )}
          {view === "templates" && <TemplatesPanel notify={notify} />}
        </div>
      </section>

      {showUpload && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--sb-ink)]/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setShowUpload(false)}>
          <Card className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--sb-line)] bg-[var(--sb-card)] py-0 text-[var(--sb-ink)] shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{pending ? "Does this look right?" : "Add your syllabi"}</h2>
                  <p className="mt-1 text-sm text-[var(--sb-muted)]">{pending ? `Nothing is on the calendar yet. Edit or skip rows, keep study blocks if you want them, then confirm — then pick ${DESTINATION_PICKER_HINT}.` : "Upload a PDF, paste text, or load the demo semester."}</p>
                </div>
                <button type="button" onClick={() => setShowUpload(false)} className="grid size-8 place-items-center rounded-full bg-[var(--sb-soft)]" aria-label="Close"><X className="size-4" /></button>
              </div>

              {!pending ? (
                <>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.txt,application/pdf,text/plain" className="hidden" onChange={(event) => processFiles(Array.from(event.target.files ?? []))} />
                  <button disabled={processing} onClick={() => fileRef.current?.click()} onDrop={(event) => { event.preventDefault(); processFiles(Array.from(event.dataTransfer.files)); }} onDragOver={(event) => event.preventDefault()} className="mt-5 grid w-full place-items-center rounded-2xl border-2 border-dashed border-[var(--sb-line)] bg-[var(--sb-bg)] px-5 py-8 text-center hover:border-[var(--sb-ink)]/40 disabled:opacity-60">
                    <UploadCloud className="size-6 text-[var(--sb-muted)]" />
                    <p className="mt-3 text-sm font-semibold">Drop PDF or .txt syllabi</p>
                    <p className="mt-1 text-xs text-[var(--sb-muted)]">or click to browse · up to 10 files · text-based PDF, not a scan</p>
                  </button>
                  <textarea value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Or paste a syllabus here…" className="mt-4 min-h-28 w-full rounded-xl border border-[var(--sb-line)] bg-[var(--sb-bg)] p-3 text-sm outline-none" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => ingestText(paste)} disabled={!paste.trim()} className="sb-btn disabled:opacity-40">Extract pasted text</button>
                    <button type="button" onClick={loadDemo} className="sb-btn-ghost">Load demo semester</button>
                  </div>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-[var(--sb-muted)]">Demo PDFs for Grok</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      ["CS 301", "/samples/CS301-Algorithms.pdf"],
                      ["ECON 210", "/samples/ECON210-Microeconomics.pdf"],
                      ["PHIL 160", "/samples/PHIL160-Ethics.pdf"],
                      ["DES 220", "/samples/DES220-Interaction-Design.pdf"],
                      ["All four (zip)", "/samples/termwise-demo-syllabi.zip"],
                    ].map(([label, href]) => (
                      <a key={href} href={href} download className="sb-btn-ghost h-8 text-xs">{label}</a>
                    ))}
                  </div>
                  {processing && <p className="mt-4 text-xs font-semibold text-[var(--sb-muted)]">Reading your syllabi…</p>}
                  {uploadError && <div className="mt-4 rounded-lg bg-[var(--sb-soft)] px-3 py-2.5 text-xs font-semibold text-[var(--sb-warn)]">{uploadError}</div>}
                </>
              ) : (
                <>
                  <div className="mt-5">
                    <ConfirmTable
                      events={pending.events}
                      courses={pending.courses}
                      skipped={pending.skipped}
                      onChange={(id, patch) => setPending((current) => current ? { ...current, events: current.events.map((event) => event.id === id ? { ...event, ...patch } : event) } : current)}
                      onToggle={(id) => setPending((current) => {
                        if (!current) return current;
                        const event = current.events.find((item) => item.id === id);
                        if (event?.kind === "office-hour") return current;
                        const skipped = current.skipped.includes(id)
                          ? current.skipped.filter((item) => item !== id)
                          : [...current.skipped, id];
                        return { ...current, skipped };
                      })}
                      onKeepSuggested={() => setPending((current) => current ? { ...current, skipped: current.skipped.filter((id) => !current.events.some((event) => event.id === id && event.suggested)) } : current)}
                      onSkipSuggested={() => setPending((current) => current ? { ...current, skipped: Array.from(new Set([...current.skipped, ...current.events.filter((event) => event.suggested).map((event) => event.id)])) } : current)}
                    />
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-[var(--sb-muted)]">Edit a wrong date or skip a row. Suggested study blocks are off until you keep them — they are derived from listed hours, not new due dates. After confirm, pick Google, Outlook, Apple, or Fallback. Termwise never writes the calendar for you.</p>
                  <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setPending(null)} className="sb-btn-ghost">Back</button>
                    <button type="button" onClick={confirmCalendar} className="sb-btn"><CalendarDays className="size-4" /> Add to calendar</button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showAddCalendar && memory.events.length > 0 && (
        <AddCalendarPanel
          events={memory.events}
          courses={themedCourses}
          destination={destination}
          publishInfo={publishInfo}
          onDestination={setDestination}
          onClose={() => {
            setShowAddCalendar(false);
            if (queuedDraft) {
              setDraft(queuedDraft);
              setQueuedDraft(null);
            }
          }}
          onDownload={() => { exportCalendar(); setShowAddCalendar(false); }}
          onCopySubscribe={() => copySubscribeLink()}
          onAddAll={() => void addAllToDestination()}
        />
      )}

      {draft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--sb-ink)]/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setDraft(null)}>
          <Card className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--sb-line)] bg-[var(--sb-card)] py-0 text-[var(--sb-ink)] shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[var(--sb-warn)]">Draft · not sent</p>
                  <h2 className="text-2xl font-semibold tracking-tight">Extension request</h2>
                  <p className="mt-1 text-xs text-[var(--sb-muted)]">
                    {destination === "file"
                      ? "Opens a mailto draft. Termwise never sends unless you do."
                      : `Opens in ${chosen.mailLabel}. Termwise never sends unless you do.`}
                  </p>
                </div>
                <button type="button" onClick={() => setDraft(null)} className="grid size-8 place-items-center rounded-full bg-[var(--sb-soft)]" aria-label="Close"><X className="size-4" /></button>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sb-muted)]">Destination</p>
                <DestinationChoice value={destination} onChange={setDestination} />
              </div>
              <div className="mt-5 space-y-3 rounded-xl border border-[var(--sb-line)] bg-[var(--sb-bg)] p-4 text-sm">
                <p><span className="mr-3 text-[var(--sb-muted)]">To</span> {draft.toName}{draft.toEmail ? ` <${draft.toEmail}>` : ""}</p>
                <p className="border-t border-[var(--sb-line)] pt-3"><span className="mr-3 text-[var(--sb-muted)]">Subject</span> {draft.subject}</p>
              </div>
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--sb-line)] p-4 font-sans text-sm leading-7">{draft.body}</pre>
              <p className="mt-3 text-[11px] leading-5 text-[var(--sb-muted)]">mailto is always available as a fallback. Termwise does not send mail.</p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => { navigator.clipboard.writeText(draft.body); notify("Draft copied. Still not sent."); }} className="sb-btn-ghost"><Copy className="size-4" /> Copy</button>
                <button type="button" onClick={() => { window.location.href = mailtoHref(draft); notify("Opened your mail client. Termwise did not send it."); }} className="sb-btn-ghost">mailto</button>
                <button type="button" onClick={() => { window.open(reviewMailHref(draft, destination), "_blank", "noopener,noreferrer"); notify(`Opened ${destination === "file" ? "a mailto draft" : chosen.mailLabel}. Termwise did not send it.`); }} className="sb-btn"><Send className="size-4" /> {chosen.reviewMailLabel}</button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-xl border border-[var(--sb-line)] bg-[var(--sb-card)] px-2 py-2 lg:hidden">
        <MobileNav icon={<LayoutDashboard />} label="Home" active={view === "overview"} onClick={() => setView("overview")} />
        <MobileNav icon={<CalendarDays />} label="Calendar" active={view === "calendar"} onClick={() => setView("calendar")} />
        <MobileNav icon={<MessageSquare />} label="Chat" active={view === "chat"} onClick={() => setView("chat")} />
        <MobileNav icon={<AlertTriangle />} label="Conflicts" count={collisions.length || undefined} active={view === "collisions"} onClick={() => setView("collisions")} />
        <MobileNav icon={<FileText />} label="Template" active={view === "templates"} onClick={() => setView("templates")} />
      </nav>

      {removing && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[var(--sb-ink)]/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setRemoving(null)}>
          <Card className="w-full max-w-md rounded-2xl border border-[var(--sb-line)] bg-[var(--sb-card)] py-0 text-[var(--sb-ink)] shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[var(--sb-warn)]">Remove class</p>
                  <h2 className="text-2xl font-semibold tracking-tight">Take {removing.code} off the desk?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--sb-muted)]">
                    {memory.courses.length === 1
                      ? `This clears ${removing.code}, its deadlines, office hours, and color. The desk will be empty again.`
                      : `This clears ${removing.code}, its deadlines, office hours, and color. Your other classes stay.`}
                  </p>
                </div>
                <button type="button" onClick={() => setRemoving(null)} className="grid size-8 place-items-center rounded-full bg-[var(--sb-soft)]" aria-label="Close"><X className="size-4" /></button>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setRemoving(null)} className="sb-btn-ghost">Keep it</button>
                <button type="button" onClick={confirmRemoveCourse} className="sb-btn">Remove class</button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showSettings && (
        <AppearancePanel
          appearance={appearance}
          courses={themedCourses}
          studentName={memory.studentName}
          weeklyCapacityHours={memory.weeklyCapacityHours}
          onName={(value) => setMemory((current) => ({ ...current, studentName: value }))}
          onCapacity={(value) => setMemory((current) => ({ ...current, weeklyCapacityHours: value }))}
          onRemoveCourse={requestRemoveCourse}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--sb-ink)] px-4 py-2.5 text-xs font-medium text-[var(--sb-bg)] lg:bottom-6">
          {toast}
        </div>
      )}
    </main>
  );
}

function findDateHint(text: string) {
  return /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{1,2})\b/i.test(text);
}

function Overview({ memory, appearance, brief, term, collisions, weekEvents, completed, setCompleted, onDemo, onUpload, onCollision, onCalendar, onDraft, onBrief, onTonight, onCustomize, onRemoveCourse }: {
  memory: StudentMemory;
  appearance: Appearance;
  brief: ReturnType<typeof buildWeeklyBrief>;
  term: TermProgress | null;
  collisions: Collision[];
  weekEvents: AcademicEvent[];
  completed: string[];
  setCompleted: (value: string[] | ((current: string[]) => string[])) => void;
  onDemo: () => void;
  onUpload: () => void;
  onCollision: () => void;
  onCalendar: () => void;
  onDraft: () => void;
  onBrief: () => void;
  onTonight: () => void;
  onCustomize: () => void;
  onRemoveCourse: (course: Course) => void;
}) {
  if (!memory.events.length) {
    return (
      <div className="mx-auto max-w-2xl py-8 md:py-14">
        <div className="flex items-center gap-3">
          <BrandMark size={44} />
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--sb-muted)]">Semester desk</p>
            <h1 className="text-3xl font-semibold tracking-tight">Termwise</h1>
          </div>
        </div>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-[var(--sb-ink)]">
          Extract syllabi, confirm or edit the table, catch 48-hour pileups, keep optional work-back study blocks, read the week brief, and draft an extension if you need one. Send dates to {DESTINATION_PICKER_HINT}. Termwise never sends.
        </p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["1", "Extract", "PDF or paste. I wait for you."],
            ["2", "Calendar", "Google, Outlook, Apple, or Fallback."],
            ["3", "This week", "Load, study blocks, Sunday brief."],
            ["4", "Draft", "An extension email. Never sent."],
          ].map(([step, title, body]) => (
            <li key={step} className="sb-card flex gap-3 p-4">
              <span className="text-xs font-semibold text-[var(--sb-muted)]">{step}</span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--sb-muted)]">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-7 flex flex-wrap gap-2">
          <button onClick={onUpload} className="sb-btn">Add a syllabus</button>
          <button onClick={onDemo} className="sb-btn-ghost">Load demo semester</button>
          <button onClick={onCustomize} className="sb-btn-ghost">Customize</button>
        </div>
      </div>
    );
  }

  const severe = collisions.find((item) => item.severity === "severe");
  const widgets = {
    term: term && (
      <div className="sb-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--sb-muted)]">Term</p>
            <h2 className="mt-2 text-xl font-semibold">{term.fromLabel} to {term.toLabel}</h2>
            <p className="mt-1 text-sm text-[var(--sb-muted)]">
              {term.percent}% through · {term.remainingCount} left
              {term.remainingMajors ? ` · ${term.remainingMajors} major${term.remainingMajors === 1 ? "" : "s"}` : ""}
              {term.doneCount ? ` · ${term.doneCount} done` : ""}
            </p>
          </div>
          {term.nextTitle && (
            <p className="text-sm text-[var(--sb-muted)]">Next: {term.nextTitle}{term.nextDate ? ` · ${formatDate(term.nextDate)}` : ""}</p>
          )}
        </div>
        <Progress value={term.percent} className="mt-4 h-1 bg-[var(--sb-soft)] [&>div]:bg-[var(--sb-accent)]" />
      </div>
    ),
    collision: severe && (
      <div className="sb-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--sb-warn)]">Collision</p>
            <h2 className="mt-2 text-xl font-semibold">{severe.events.length} majors in {severe.hoursSpan} hours</h2>
            <p className="mt-1 text-sm text-[var(--sb-muted)]">{severe.events.map((event) => event.courseCode).join(" · ")} · {formatDate(severe.start)} to {formatDate(severe.end)} · {severe.totalHours}h</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCollision} className="sb-btn-ghost">View</button>
            <button onClick={onDraft} className="sb-btn">Draft email</button>
          </div>
        </div>
      </div>
    ),
    due: (
      <div className="sb-card p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Due this week</h2>
            <p className="text-xs text-[var(--sb-muted)]">{brief.totalHours}h · {weekEvents.length} items</p>
          </div>
          <span className="text-xs text-[var(--sb-muted)]">{brief.totalHours <= brief.capacityHours ? "On track" : "Over capacity"}</span>
        </div>
        <div className="divide-y divide-[var(--sb-line)]">
          {weekEvents.length ? weekEvents.map((item) => {
            const pileup = collisionForEvent(item, collisions);
            return (
            <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <button type="button" onClick={() => setCompleted((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`mt-0.5 grid size-4 place-items-center rounded-sm border border-[var(--sb-ink)] ${completed.includes(item.id) ? "bg-[var(--sb-ink)] text-[var(--sb-bg)]" : "text-transparent"}`} aria-label={`Complete ${item.title}`}><Check className="size-3" /></button>
              <div className={`min-w-0 flex-1 ${completed.includes(item.id) ? "opacity-40 line-through" : ""}`}>
                <p className="text-[11px] text-[var(--sb-muted)]">
                  {item.courseCode} · {displayKind(item)}
                  {item.weight ? ` · ${item.weight}` : ""}
                  {pileup ? " · pileup" : ""}
                </p>
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--sb-muted)]">{formatEventWhen(item)}{item.location ? ` · ${item.location}` : ""}</p>
              </div>
              <span className="flex items-center gap-1 pt-0.5 text-xs"><Clock3 className="size-3.5 text-[var(--sb-muted)]" />{item.estimatedHours}h</span>
            </div>
            );
          }) : <p className="text-sm text-[var(--sb-muted)]">Nothing graded this week.</p>}
        </div>
      </div>
    ),
    brief: (
      <div className="sb-card p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--sb-muted)]">Sunday 8:00 PM</p>
        <h2 className="mt-2 text-lg font-semibold">Week ahead</h2>
        <p className="mt-1 text-sm text-[var(--sb-muted)]">{brief.weekLabel} · {brief.totalHours}h of {brief.capacityHours}h</p>
        <Progress value={Math.min(100, (brief.totalHours / Math.max(brief.capacityHours, 1)) * 100)} className="mt-4 h-1 bg-[var(--sb-soft)] [&>div]:bg-[var(--sb-accent)]" />
        <div className="mt-4 flex gap-2">
          <button onClick={onBrief} className="sb-btn-ghost flex-1">Open brief</button>
          <button onClick={onTonight} className="sb-btn-ghost flex-1">Tonight</button>
        </div>
      </div>
    ),
    load: (
      <LoadStrip weeks={buildTermLoad(memory.events, memory.weeklyCapacityHours)} />
    ),
    courses: (
      <div className="sb-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Courses</h2>
        <div className="space-y-3">
          {memory.courses.length ? memory.courses.map((course) => {
            const upcoming = memory.events.filter((event) => event.courseId === course.id && event.kind !== "office-hour").length;
            const hit = collisions.some((collision) => collision.events.some((event) => event.courseCode === course.code));
            return (
              <div key={course.id} className="flex items-center gap-3">
                <span className="size-2 shrink-0 rounded-full" style={{ background: course.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{course.code}</p>
                  <p className="truncate text-xs text-[var(--sb-muted)]">{course.professor}{course.officeHours ? ` · ${course.officeHours}` : ""}</p>
                  <p className="mt-0.5 text-xs text-[var(--sb-muted)] sm:hidden">{upcoming} items · {hit ? "In a collision" : "Clear"}</p>
                </div>
                <div className="hidden text-right text-xs sm:block">
                  <p>{upcoming} items</p>
                  <p className="text-[var(--sb-muted)]">{hit ? "In a collision" : "Clear"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCourse(course)}
                  className="sb-btn-ghost h-8 shrink-0 px-2.5"
                  aria-label={`Remove ${course.code}`}
                >
                  Remove
                </button>
              </div>
            );
          }) : <p className="text-sm text-[var(--sb-muted)]">No classes on the desk.</p>}
        </div>
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
          <p className="mt-1 text-sm text-[var(--sb-muted)]">
            {term ? `${term.fromLabel} to ${term.toLabel} · ${term.percent}% through the term.` : "Move these around in Customize if you like."}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCalendar} className="sb-btn-ghost">Open calendar</button>
          <button onClick={onCustomize} className="sb-btn-ghost">Edit widgets</button>
        </div>
      </div>
      <div className={`grid gap-4 ${appearance.density === "compact" ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
        {appearance.widgets.filter((widget) => widget.visible && widgets[widget.id]).map((widget) => (
          <div key={widget.id} className={widget.id === "due" || widget.id === "collision" || widget.id === "term" || widget.id === "load" ? "md:col-span-2" : ""}>
            {widgets[widget.id]}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ messages, composer, setComposer, onSend, onDemo, onCalendar }: { messages: ChatMessage[]; composer: string; setComposer: (value: string) => void; onSend: () => void; onDemo: () => void; onCalendar: () => void }) {
  return (
    <div className="sb-card flex min-h-[70vh] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((message) => (
          <div key={message.id} className={`max-w-[80%] py-1 text-sm leading-6 ${message.role === "user" ? "ml-auto text-right" : ""}`}>
            <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[var(--sb-muted)]">{message.role === "user" ? "You" : "Termwise"}</p>
            <pre className="whitespace-pre-wrap font-sans">{message.text}</pre>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--sb-line)] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button onClick={onDemo} className="sb-btn-ghost h-8">Load demo</button>
          <button onClick={onCalendar} className="sb-btn-ghost h-8">Add to calendar</button>
          <button onClick={() => setComposer("check collisions")} className="sb-btn-ghost h-8">Collisions</button>
          <button onClick={() => setComposer("weekly brief")} className="sb-btn-ghost h-8">Brief</button>
          <button onClick={() => setComposer("study tonight")} className="sb-btn-ghost h-8">Tonight</button>
        </div>
        <div className="flex gap-2">
          <input value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSend()} placeholder="Ask, or paste a dated syllabus line…" className="h-10 flex-1 rounded-lg border border-[var(--sb-line)] bg-[var(--sb-bg)] px-3 text-sm outline-none" />
          <button onClick={onSend} className="sb-btn h-10"><Send className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

function CollisionsPanel({ memory, collisions, onDraft, onExport }: { memory: StudentMemory; collisions: Collision[]; onDraft: (collision: Collision) => void; onExport: () => void }) {
  if (!collisions.length) {
    return <Empty title="No collisions yet" body="Confirm a syllabus and I will look for 48-hour pileups. Export still goes to the destination you picked — Google, Outlook, Apple, or Fallback — as an .ics or subscribe link." />;
  }
  return (
    <div className="space-y-3">
      {collisions.map((collision) => (
        <div key={collision.id} className="sb-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--sb-muted)]">{collision.severity} pileup</p>
          <h2 className="mt-1.5 text-xl font-semibold">{collision.events.length} majors in {collision.hoursSpan} hours</h2>
          <p className="mt-1 text-sm text-[var(--sb-muted)]">{formatDate(collision.start)} to {formatDate(collision.end)} · {collision.totalHours}h</p>
          <div className="mt-4 space-y-1">
            {collision.events.map((event) => {
              const course = memory.courses.find((item) => item.id === event.courseId || item.code === event.courseCode);
              return (
                <div key={event.id} className="border-t border-[var(--sb-line)] py-3 first:border-t-0 first:pt-0">
                  <p className="text-[11px] text-[var(--sb-muted)]">
                    {event.courseCode} · {displayKind(event)}
                    {event.weight ? ` · ${event.weight}` : ""}
                    {event.estimatedHours ? ` · ~${event.estimatedHours}h` : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{event.title}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--sb-muted)]">
                    {formatEventWhen(event)}
                    {event.location ? ` · ${event.location}` : ""}
                    {course?.professor && course.professor !== "Professor" ? ` · ${course.professor}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onExport} className="sb-btn-ghost"><Download className="size-4" /> Export .ics</button>
            {collision.severity === "severe" && <button type="button" onClick={() => onDraft(collision)} className="sb-btn"><Mail className="size-4" /> Draft email</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BriefPanel({ memory, brief, collisions, onSchedule }: { memory: StudentMemory; brief: ReturnType<typeof buildWeeklyBrief>; collisions: Collision[]; onSchedule: () => void }) {
  return (
    <div className="sb-card p-6">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--sb-muted)]">Sunday 8:00 PM</p>
      <h2 className="mt-2 text-2xl font-semibold">{brief.weekLabel}</h2>
      <p className="mt-1 text-sm text-[var(--sb-muted)]">{brief.totalHours}h of {brief.capacityHours}h capacity</p>
      <pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--sb-ink)]">{formatBriefEmail(memory, brief, collisions)}</pre>
      <button onClick={onSchedule} className="sb-btn mt-5"><CheckCircle2 className="size-4" /> Set the Sunday note</button>
    </div>
  );
}

function TemplatesPanel({ notify }: { notify: (message: string) => void }) {
  const blocks = [
    { title: "0. Listing (Edit Profile)", body: TERMWISE_LISTING },
    { title: "1. Identity", body: TERMWISE_IDENTITY },
    { title: "2. Connect plugins", body: CONNECT_PLUGINS },
    { title: "3. extract-syllabus", body: EXTRACT_SYLLABUS_SKILL },
    { title: "4. check-collisions", body: CHECK_COLLISIONS_SKILL },
    { title: "5. weekly-brief", body: WEEKLY_BRIEF_ROUTINE },
    { title: "6. draft-extension-request", body: DRAFT_EXTENSION_SKILL },
    { title: "7. study-tonight", body: STUDY_TONIGHT_SKILL },
  ];
  return (
    <div className="space-y-4">
      <div className="sb-card p-6">
        <h1 className="text-2xl font-semibold">Termwise Bot template</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--sb-muted)]">
          In Grok: New, Create new agent, name it Termwise. Recipients pick Google Calendar / Gmail, Outlook Calendar / Outlook mail, or Apple Calendar — they reconnect their own accounts and do not inherit logins. Until plugins work, use Fallback: .ics download / mailto draft. Copy these blocks, or use the files in <code className="rounded bg-[var(--sb-soft)] px-1">template/</code> and <code className="rounded bg-[var(--sb-soft)] px-1">.grok/skills/</code>.
        </p>
        <pre className="mt-4 whitespace-pre-wrap bg-[var(--sb-soft)] p-4 text-xs leading-6">{GROK_SETUP_STEPS}</pre>
      </div>
      {blocks.map((block) => (
        <div key={block.title} className="sb-card p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{block.title}</h2>
            <button className="sb-btn-ghost h-8" onClick={() => { navigator.clipboard.writeText(block.body); notify(`Copied ${block.title}`); }}><Copy className="size-3.5" /> Copy</button>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-6">{block.body}</pre>
        </div>
      ))}
    </div>
  );
}

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/termwise-mark.svg" alt="Termwise" width={size} height={size} className="shrink-0" />
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="sb-card max-w-xl p-6">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--sb-muted)]">{body}</p>
    </div>
  );
}

function NavItem({ icon, label, active, count, onClick }: { icon: React.ReactNode; label: string; active?: boolean; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm ${active ? "bg-[var(--sb-soft)] font-medium" : "text-[var(--sb-muted)] hover:bg-[var(--sb-soft)] hover:text-[var(--sb-ink)]"}`}>
      <span className="[&>svg]:size-4">{icon}</span>
      <span>{label}</span>
      {count ? <span className="ml-auto text-[11px] text-[var(--sb-accent)]">{count}</span> : null}
    </button>
  );
}

function MobileNav({ icon, label, active, count, onClick }: { icon: React.ReactNode; label: string; active?: boolean; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative flex min-w-14 flex-col items-center gap-1 px-2 py-1 text-[10px] ${active ? "text-[var(--sb-ink)]" : "text-[var(--sb-muted)]"}`}>
      <span className="[&>svg]:size-4">{icon}</span>
      <span>{label}</span>
      {count ? <span className="absolute right-1 top-0 text-[9px] text-[var(--sb-accent)]">{count}</span> : null}
    </button>
  );
}
