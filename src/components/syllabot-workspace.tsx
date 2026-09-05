"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle, CalendarDays, Check, CheckCircle2,
  Clock3, Copy, Download, FileText, LayoutDashboard, Mail, MessageSquare,
  Send, Settings, UploadCloud, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DEMO_SYLLABI,
  DEFAULT_MEMORY,
  buildWeeklyBrief,
  downloadIcs,
  draftExtensionRequest,
  eventsToIcs,
  expandOfficeHours,
  extractFromText,
  findCollisions,
  formatBriefEmail,
  googleCalendarUrl,
  mailtoHref,
  mergeExtractions,
  mergeUniqueEvents,
  priorityCalendarEvents,
  semesterBounds,
  type AcademicEvent,
  type Collision,
  type ExtensionDraft,
  type StudentMemory,
} from "@/lib/syllabot";
import {
  CHECK_COLLISIONS_SKILL,
  CONNECT_PLUGINS,
  DRAFT_EXTENSION_SKILL,
  EXTRACT_SYLLABUS_SKILL,
  GROK_SETUP_STEPS,
  SYLLABOT_IDENTITY,
  WEEKLY_BRIEF_ROUTINE,
} from "@/lib/syllabot/templates";
import { SemesterCalendar } from "@/components/semester-calendar";
import { AppearancePanel } from "@/components/appearance-panel";
import {
  DEFAULT_APPEARANCE,
  getAppearance,
  subscribeAppearance,
  type Appearance,
} from "@/lib/syllabot/appearance";

type View = "overview" | "chat" | "calendar" | "collisions" | "briefs" | "templates";
type ChatMessage = { id: string; role: "bot" | "user"; text: string };

const STORAGE_KEY = "syllabot-memory-v1";
const emptyMemory = (): StudentMemory => ({
  studentName: DEFAULT_MEMORY.studentName,
  weeklyCapacityHours: DEFAULT_MEMORY.weeklyCapacityHours,
  courses: [],
  events: [],
  extensions: DEFAULT_MEMORY.extensions,
});

let memoryCache = emptyMemory();
const memoryListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const saved = window.localStorage.getItem(STORAGE_KEY);
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
  const memory = useSyncExternalStore(subscribeMemory, () => memoryCache, emptyMemory);
  const setMemory = (update: StudentMemory | ((current: StudentMemory) => StudentMemory)) => {
    writeMemory(typeof update === "function" ? update(memoryCache) : update);
  };
  const [pending, setPending] = useState<{ events: AcademicEvent[]; courses: StudentMemory["courses"] } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "bot", text: "I'm Syllabot. Drop syllabi, paste text, or load the demo semester. I'll extract deadlines, wait for your OK before calendar writes, then flag collisions and draft emails — never send them." },
  ]);
  const [draft, setDraft] = useState<ExtensionDraft | null>(null);
  const [composer, setComposer] = useState("");
  const [paste, setPaste] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [toast, setToast] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [showAddCalendar, setShowAddCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [publishInfo, setPublishInfo] = useState<{ icsUrl: string; googleSubscribe: string; googleImport: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const collisions = useMemo(() => findCollisions(memory.events), [memory.events]);
  const brief = useMemo(() => buildWeeklyBrief(memory), [memory]);
  const weekEvents = brief.items;
  const severe = collisions.find((collision) => collision.severity === "severe") ?? collisions[0] ?? null;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function say(role: ChatMessage["role"], text: string) {
    setMessages((current) => [...current, { id: `${Date.now()}-${current.length}`, role, text }]);
  }

  function ingest(courses: StudentMemory["courses"], events: AcademicEvent[], source: string) {
    setPending({ courses, events });
    setShowUpload(true);
    say("bot", `${source}: found ${events.length} dated items across ${courses.length} course${courses.length === 1 ? "" : "s"}. Review the table, then confirm before I write anything to calendar.`);
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
        };
      } else {
        courses.push({ ...course });
      }
    }
    const bounds = semesterBounds(pending.events);
    const incoming = mergeUniqueEvents(pending.events, expandOfficeHours(courses, bounds.from, bounds.to));
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
      say("bot", `Added ${incoming.length} items to your Syllabot calendar, including office hours. ${found.length} collision${found.length === 1 ? "" : "s"} found — ${top.events.map((event) => event.courseCode).join(", ")} on ${formatDate(top.start)}–${formatDate(top.end)}.`);
      if (top.severity === "severe") setDraft(draftExtensionRequest(next, top));
    } else {
      say("bot", `Added ${incoming.length} items to your Syllabot calendar. No 48-hour pileups.`);
    }
    notify(`${incoming.length} events are on your Syllabot calendar.`);
    void publishCalendar(next);
  }

  async function publishCalendar(source = memory) {
    if (!source.events.length) return null;
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: source.events, courses: source.courses }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPublishInfo(data);
      return data as { icsUrl: string; googleSubscribe: string; googleImport: string };
    } catch {
      return null;
    }
  }

  function exportCalendar() {
    if (!memory.events.length) {
      notify("Add a syllabus first.");
      return;
    }
    downloadIcs("syllabot-semester.ics", eventsToIcs(memory.events, memory.courses));
    notify("Calendar file downloaded — Apple Calendar and Outlook will open it.");
  }

  function copySubscribeLink(url?: string) {
    const target = url ?? publishInfo?.icsUrl;
    if (!target) {
      notify("Publish the calendar first — confirm events, then try again.");
      return;
    }
    void navigator.clipboard.writeText(target);
    notify("Subscribe link copied. Paste it into Google Calendar → From URL.");
  }

  async function addAllToGoogle() {
    if (!memory.events.length) {
      notify("Add a syllabus first.");
      return;
    }
    downloadIcs("syllabot-semester.ics", eventsToIcs(memory.events, memory.courses));
    const published = publishInfo ?? await publishCalendar();
    if (published?.icsUrl) {
      void navigator.clipboard.writeText(published.icsUrl);
    }
    window.open(published?.googleImport ?? "https://calendar.google.com/calendar/u/0/r/settings/addbyurl", "_blank", "noopener,noreferrer");
    notify("Downloaded the semester .ics and opened Google Calendar. Paste the copied subscribe link if asked.");
  }

  function runBrief() {
    const next = buildWeeklyBrief(memory);
    say("user", "Run weekly-brief.");
    say("bot", formatBriefEmail(memory, next, findCollisions(memory.events)));
    setView("briefs");
  }

  function runDraft(collision = severe) {
    if (!collision) {
      notify("No collision to draft against yet.");
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
      if (!collisions.length) return say("bot", "No collisions yet. Confirm a syllabus first.");
      setView("collisions");
      return say("bot", collisions.map((item) => `${item.severity}: ${item.events.map((event) => event.courseCode).join(", ")} ${item.start}–${item.end}`).join("\n"));
    }
    if (lower.includes("brief") || lower.includes("sunday")) return runBrief();
    if (lower.includes("extension") || lower.includes("draft") || lower === "send it") {
      if (lower === "send it" && draft) {
        say("user", "send it");
        window.location.href = mailtoHref(draft);
        return say("bot", "Opened your mail client with the draft. I still have not sent anything myself.");
      }
      return runDraft();
    }
    if (lower.includes("calendar") || lower.includes("add to google")) {
      say("user", text);
      if (!memory.events.length) return say("bot", "Confirm a syllabus first, then I can put it on the calendar.");
      setView("calendar");
      setShowAddCalendar(true);
      return say("bot", "Your semester is on the Syllabot calendar. Confirm Add all to Google Calendar to push exams and projects.");
    }
    if (lower.includes("confirm") && pending) return confirmCalendar();
    if (/\b(due|exam|midterm|professor|office hours|assignment|project)\b/i.test(text) && findDateHint(text)) {
      say("user", text);
      return ingestText(text, "chat-syllabus.txt");
    }
    say("user", text);
    say("bot", "I can extract a syllabus, check collisions, write the Sunday brief, or draft an extension. Paste a syllabus, load the demo, or try “check collisions”.");
  }

  const firstName = memory.studentName.split(" ")[0];
  const themedCourses = memory.courses.map((course) => ({
    ...course,
    color: appearance.courseColors[course.id] ?? course.color,
  }));
  const themedMemory = { ...memory, courses: themedCourses };

  return (
    <main className="syllabot-shell" data-theme={appearance.theme} data-density={appearance.density} style={{ ["--sb-accent" as string]: appearance.accent }}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-[var(--sb-line)] bg-[var(--sb-bg)] px-4 py-6 lg:flex">
        <div className="px-2">
          <p className="text-lg font-semibold tracking-tight">Syllabot</p>
          <p className="mt-1 text-xs text-[var(--sb-muted)]">Semester desk</p>
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
            <div key={course.code} className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <span className="size-1.5 rounded-full" style={{ background: course.color }} />
              <span className="truncate">{course.code}</span>
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
        <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[var(--sb-line)] bg-[var(--sb-bg)]/90 px-5 backdrop-blur md:px-8">
          <p className="text-sm font-medium lg:hidden">Syllabot</p>
          <p className="hidden text-sm text-[var(--sb-muted)] sm:block lg:ml-0">{firstName} · preview first, then calendar or email</p>
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
              onCustomize={() => setShowSettings(true)}
            />
          )}
          {view === "calendar" && (
            memory.events.length
              ? <SemesterCalendar events={memory.events} courses={themedCourses} collisions={collisions} subscribeUrl={publishInfo?.icsUrl} onAddAll={() => setShowAddCalendar(true)} onCopySubscribe={() => copySubscribeLink()} />
              : <Empty title="Calendar is empty" body="Confirm a syllabus and I’ll place every deadline, exam, reading, and office-hour slot on a color-coded semester calendar." />
          )}
          {view === "chat" && (
            <ChatPanel messages={messages} composer={composer} setComposer={setComposer} onSend={() => handlePrompt(composer)} onDemo={loadDemo} onCalendar={() => handlePrompt("add to calendar")} />
          )}
          {view === "collisions" && (
            <CollisionsPanel collisions={collisions} onDraft={(collision) => runDraft(collision)} onExport={exportCalendar} />
          )}
          {view === "briefs" && (
            <BriefPanel memory={themedMemory} brief={brief} collisions={collisions} onSchedule={() => notify("Sunday 8:00 PM brief is scheduled in this workspace.")} />
          )}
          {view === "templates" && <TemplatesPanel notify={notify} />}
        </div>
      </section>

      {showUpload && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102523]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setShowUpload(false)}>
          <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white py-0 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{pending ? "Confirm calendar preview" : "Add your syllabi"}</h2>
                  <p className="mt-1 text-sm text-[#76817e]">{pending ? "Nothing has been written yet. Confirm to keep these events in Syllabot memory." : "Upload a PDF, paste text, or load the demo semester."}</p>
                </div>
                <button onClick={() => setShowUpload(false)} className="grid size-8 place-items-center rounded-full bg-[#f3f4f0]"><X className="size-4" /></button>
              </div>

              {!pending ? (
                <>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.txt,application/pdf,text/plain" className="hidden" onChange={(event) => processFiles(Array.from(event.target.files ?? []))} />
                  <button disabled={processing} onClick={() => fileRef.current?.click()} onDrop={(event) => { event.preventDefault(); processFiles(Array.from(event.dataTransfer.files)); }} onDragOver={(event) => event.preventDefault()} className="mt-6 grid w-full place-items-center rounded-2xl border-2 border-dashed border-[#b9cbc5] bg-[#f7fbf8] px-5 py-8 text-center hover:border-[#4e8b7d] disabled:opacity-60">
                    <UploadCloud className="size-6 text-[#1c775f]" />
                    <p className="mt-3 text-sm font-bold">Drop PDF or .txt syllabi</p>
                    <p className="mt-1 text-xs text-[#8b9592]">or click to browse · up to 10 files</p>
                  </button>
                  <textarea value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Or paste a syllabus here…" className="mt-4 min-h-28 w-full rounded-xl border border-[#dfe3dd] bg-[#fbfbf8] p-3 text-sm outline-none" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => ingestText(paste)} disabled={!paste.trim()} className="sb-btn disabled:opacity-40">Extract pasted text</button>
                    <button type="button" onClick={loadDemo} className="sb-btn-ghost">Load demo semester</button>
                  </div>
                  {processing && <p className="mt-4 text-xs font-semibold text-[#5d6b67]">Reading your syllabi…</p>}
                  {uploadError && <div className="mt-4 rounded-lg bg-[#fff0ec] px-3 py-2.5 text-xs font-semibold text-[#ad4938]">{uploadError}</div>}
                </>
              ) : (
                <>
                  <div className="mt-5 overflow-x-auto rounded-xl border border-[#e3e6e0]">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="bg-[#f6f7f3] text-[#6d7875]"><tr><th className="px-3 py-2">Course</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Hours</th></tr></thead>
                      <tbody>
                        {pending.events.map((event) => (
                          <tr key={event.id} className="border-t border-[#eef0eb]">
                            <td className="px-3 py-2 font-bold">{event.courseCode}</td>
                            <td className="px-3 py-2">{event.title}</td>
                            <td className="px-3 py-2 capitalize">{event.kind}</td>
                            <td className="px-3 py-2">{formatDate(event.date)} {event.time}</td>
                            <td className="px-3 py-2">{event.estimatedHours}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button onClick={() => setPending(null)} className="sb-btn-ghost">Back</button>
                    <button onClick={confirmCalendar} className="sb-btn"><CalendarDays className="size-4" /> Add to calendar</button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showAddCalendar && memory.events.length > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102523]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setShowAddCalendar(false)}>
          <Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border-0 bg-white py-0 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="mb-2 bg-[#e8f7f1] text-[#16856b]">{memory.events.length} EVENTS ON SYLLABOT</Badge>
                  <h2 className="text-2xl font-semibold tracking-tight">Add them to your real calendar</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#66736f]">They&apos;re already on the Syllabot calendar, color-coded by course. Google is never written without your click — download the reminder-ready .ics, or open Google Calendar and paste the subscribe link.</p>
                </div>
                <button onClick={() => setShowAddCalendar(false)} className="grid size-8 place-items-center rounded-full bg-[#f3f4f0]"><X className="size-4" /></button>
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <div className="rounded-xl bg-[#f6f7f3] px-4 py-3">The .ics includes 1–3 day reminders so exams and papers do not land the night before. Apple Calendar and Outlook open it directly.</div>
                <div className="rounded-xl bg-[#f6f7f3] px-4 py-3">Add all opens one Google “From URL” tab and copies the subscribe link. Individual exams stay one click each so the browser does not block a stack of tabs.</div>
                {publishInfo?.icsUrl && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#dfe3dd] px-4 py-3">
                    <code className="min-w-0 flex-1 truncate text-xs text-[#3d4b47]">{publishInfo.icsUrl}</code>
                    <Button variant="outline" className="h-8 rounded-lg text-xs font-bold" onClick={() => copySubscribeLink()}><Copy className="size-3.5" /> Copy</Button>
                  </div>
                )}
              </div>
              {priorityCalendarEvents(memory.events, 6).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-bold tracking-[.14em] text-[#82908c]">EXAMS &amp; PROJECTS — ONE CLICK EACH</p>
                  {priorityCalendarEvents(memory.events, 6).map((event) => (
                    <div key={event.id} className="flex items-center gap-3 rounded-xl border border-[#e7e9e4] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{event.courseCode} · {event.title}</p>
                        <p className="text-[11px] text-[#7c8683]">{formatDate(event.date)} {event.time}</p>
                      </div>
                      <Button variant="outline" className="h-8 rounded-lg text-xs font-bold" onClick={() => window.open(googleCalendarUrl(event), "_blank", "noopener,noreferrer")}>Add to Google</Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => { exportCalendar(); setShowAddCalendar(false); }} className="rounded-lg"><Download className="size-4" /> Download .ics</Button>
                <Button onClick={() => void addAllToGoogle()} className="rounded-lg bg-[#193c38] text-white hover:bg-[#112d2a]"><CalendarDays className="size-4" /> Add all to Google Calendar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102523]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setDraft(null)}>
          <Card className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border-0 bg-white py-0 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div><Badge className="mb-2 bg-[#fff0ec] text-[#c44d38]">DRAFT · NOT SENT</Badge><h2 className="font-serif text-2xl font-bold">Extension request</h2></div>
                <button onClick={() => setDraft(null)} className="grid size-8 place-items-center rounded-full bg-[#f3f4f0]"><X className="size-4" /></button>
              </div>
              <div className="mt-5 space-y-3 rounded-xl border border-[#e3e6e0] bg-[#fbfbf8] p-4 text-sm">
                <p><span className="mr-3 text-[#8a9491]">To</span> {draft.toName}{draft.toEmail ? ` <${draft.toEmail}>` : ""}</p>
                <p className="border-t border-[#e6e8e3] pt-3"><span className="mr-3 text-[#8a9491]">Subject</span> {draft.subject}</p>
              </div>
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-[#e3e6e0] p-4 font-sans text-sm leading-7 text-[#46534f]">{draft.body}</pre>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(draft.body); notify("Draft copied. Still not sent."); }} className="rounded-lg"><Copy className="size-4" /> Copy</Button>
                <Button onClick={() => { window.location.href = mailtoHref(draft); notify("Opened your mail client. Syllabot did not send it."); }} className="rounded-lg bg-[#193c38] text-white hover:bg-[#112d2a]"><Send className="size-4" /> Review in email</Button>
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

      {showSettings && (
        <AppearancePanel
          appearance={appearance}
          courses={themedCourses}
          studentName={memory.studentName}
          weeklyCapacityHours={memory.weeklyCapacityHours}
          onName={(value) => setMemory((current) => ({ ...current, studentName: value }))}
          onCapacity={(value) => setMemory((current) => ({ ...current, weeklyCapacityHours: value }))}
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

function Overview({ memory, appearance, brief, collisions, weekEvents, completed, setCompleted, onDemo, onUpload, onCollision, onCalendar, onDraft, onBrief, onCustomize }: {
  memory: StudentMemory;
  appearance: Appearance;
  brief: ReturnType<typeof buildWeeklyBrief>;
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
  onCustomize: () => void;
}) {
  if (!memory.events.length) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--sb-muted)]">Day one</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Put the syllabi on the desk.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--sb-muted)]">Extract deadlines, confirm before anything is written, then flag pileups and draft emails. Colors and widgets are yours — open Customize anytime.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={onUpload} className="sb-btn">Add a syllabus</button>
          <button onClick={onDemo} className="sb-btn-ghost">Load demo semester</button>
          <button onClick={onCustomize} className="sb-btn-ghost">Customize</button>
        </div>
      </div>
    );
  }

  const severe = collisions.find((item) => item.severity === "severe");
  const widgets = {
    collision: severe && (
      <div className="sb-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--sb-warn)]">Collision</p>
            <h2 className="mt-2 text-xl font-semibold">{severe.events.length} majors in {severe.hoursSpan} hours</h2>
            <p className="mt-1 text-sm text-[var(--sb-muted)]">{severe.events.map((event) => event.courseCode).join(" · ")} · {formatDate(severe.start)}–{formatDate(severe.end)} · {severe.totalHours}h</p>
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
          {weekEvents.length ? weekEvents.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <button onClick={() => setCompleted((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`grid size-4 place-items-center rounded-sm border border-[var(--sb-ink)] ${completed.includes(item.id) ? "bg-[var(--sb-ink)] text-[var(--sb-bg)]" : "text-transparent"}`} aria-label={`Complete ${item.title}`}><Check className="size-3" /></button>
              <div className={`min-w-0 flex-1 ${completed.includes(item.id) ? "opacity-40 line-through" : ""}`}>
                <p className="text-[11px] text-[var(--sb-muted)]">{item.courseCode}</p>
                <p className="truncate text-sm font-medium">{item.title}</p>
              </div>
              <span className="hidden text-xs text-[var(--sb-muted)] sm:block">{formatDate(item.date)}</span>
              <span className="flex items-center gap-1 text-xs"><Clock3 className="size-3.5 text-[var(--sb-muted)]" />{item.estimatedHours}h</span>
            </div>
          )) : <p className="text-sm text-[var(--sb-muted)]">Nothing graded this week.</p>}
        </div>
      </div>
    ),
    brief: (
      <div className="sb-card p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--sb-muted)]">Sunday 8:00 PM</p>
        <h2 className="mt-2 text-lg font-semibold">Week ahead</h2>
        <p className="mt-1 text-sm text-[var(--sb-muted)]">{brief.weekLabel} · {brief.totalHours}h of {brief.capacityHours}h</p>
        <Progress value={Math.min(100, (brief.totalHours / Math.max(brief.capacityHours, 1)) * 100)} className="mt-4 h-1 bg-[var(--sb-soft)] [&>div]:bg-[var(--sb-accent)]" />
        <button onClick={onBrief} className="sb-btn-ghost mt-4 w-full">Open brief</button>
      </div>
    ),
    courses: (
      <div className="sb-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Courses</h2>
        <div className="space-y-3">
          {memory.courses.map((course) => {
            const upcoming = memory.events.filter((event) => event.courseId === course.id && event.kind !== "office-hour").length;
            const hit = collisions.some((collision) => collision.events.some((event) => event.courseCode === course.code));
            return (
              <div key={course.id} className="flex items-center gap-3">
                <span className="size-2 rounded-full" style={{ background: course.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{course.code}</p>
                  <p className="truncate text-xs text-[var(--sb-muted)]">{course.professor}</p>
                </div>
                <div className="text-right text-xs">
                  <p>{upcoming} items</p>
                  <p className="text-[var(--sb-muted)]">{hit ? "In a collision" : "Clear"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
          <p className="mt-1 text-sm text-[var(--sb-muted)]">Rearrange these modules in Customize.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCalendar} className="sb-btn-ghost">Open calendar</button>
          <button onClick={onCustomize} className="sb-btn-ghost">Edit widgets</button>
        </div>
      </div>
      <div className={`grid gap-4 ${appearance.density === "compact" ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
        {appearance.widgets.filter((widget) => widget.visible && widgets[widget.id]).map((widget) => (
          <div key={widget.id} className={widget.id === "due" || widget.id === "collision" ? "md:col-span-2" : ""}>
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
            <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[var(--sb-muted)]">{message.role === "user" ? "You" : "Syllabot"}</p>
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
        </div>
        <div className="flex gap-2">
          <input value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSend()} placeholder="Ask, or paste a dated syllabus line…" className="h-10 flex-1 rounded-lg border border-[var(--sb-line)] bg-[var(--sb-bg)] px-3 text-sm outline-none" />
          <button onClick={onSend} className="sb-btn h-10"><Send className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

function CollisionsPanel({ collisions, onDraft, onExport }: { collisions: Collision[]; onDraft: (collision: Collision) => void; onExport: () => void }) {
  if (!collisions.length) {
    return <Empty title="No collisions yet" body="Confirm a syllabus and I’ll scan for 48-hour pileups." />;
  }
  return (
    <div className="space-y-4">
      {collisions.map((collision) => (
        <div key={collision.id} className="sb-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--sb-muted)]">{collision.severity}</p>
          <h2 className="mt-2 text-xl font-semibold">{collision.events.length} majors in {collision.hoursSpan} hours</h2>
          <p className="mt-1 text-sm text-[var(--sb-muted)]">{formatDate(collision.start)}–{formatDate(collision.end)} · {collision.totalHours}h</p>
          <div className="mt-4 space-y-2">
            {collision.events.map((event) => (
              <div key={event.id} className="border-t border-[var(--sb-line)] py-3 first:border-t-0 first:pt-0">
                <p className="text-xs text-[var(--sb-muted)]">{event.courseCode} · {formatDate(event.date)} {event.time}</p>
                <p className="mt-0.5 text-sm font-medium">{event.title}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={onExport} className="sb-btn-ghost"><Download className="size-4" /> Export week</button>
            {collision.severity === "severe" && <button onClick={() => onDraft(collision)} className="sb-btn"><Mail className="size-4" /> Draft email</button>}
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
      <button onClick={onSchedule} className="sb-btn mt-5"><CheckCircle2 className="size-4" /> Arm Sunday brief</button>
    </div>
  );
}

function TemplatesPanel({ notify }: { notify: (message: string) => void }) {
  const blocks = [
    { title: "1. Identity", body: SYLLABOT_IDENTITY },
    { title: "2. Connect plugins", body: CONNECT_PLUGINS },
    { title: "3. extract-syllabus", body: EXTRACT_SYLLABUS_SKILL },
    { title: "4. check-collisions", body: CHECK_COLLISIONS_SKILL },
    { title: "5. weekly-brief", body: WEEKLY_BRIEF_ROUTINE },
    { title: "6. draft-extension-request", body: DRAFT_EXTENSION_SKILL },
  ];
  return (
    <div className="space-y-4">
      <div className="sb-card p-6">
        <h1 className="text-2xl font-semibold">Shared Bot template</h1>
        <p className="mt-2 text-sm text-[var(--sb-muted)]">Copy these into Grok Bot. Files also live in <code className="rounded bg-[var(--sb-soft)] px-1">template/</code> and <code className="rounded bg-[var(--sb-soft)] px-1">.grok/skills/</code>.</p>
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

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-16">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--sb-muted)]">{body}</p>
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
