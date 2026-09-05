"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle, Bell, BookOpen, Check, CheckCircle2, ChevronRight,
  Clock3, Copy, Download, FileText, LayoutDashboard, Mail, MessageSquare,
  Send, Settings, Sparkles, UploadCloud, X, Zap,
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
  extractFromText,
  findCollisions,
  formatBriefEmail,
  mailtoHref,
  mergeExtractions,
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

type View = "overview" | "chat" | "collisions" | "briefs" | "templates";
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
    const courses = [...memory.courses];
    for (const course of pending.courses) {
      const match = courses.find((item) => item.code.toLowerCase() === course.code.toLowerCase());
      if (match) {
        match.professor = course.professor || match.professor;
        match.email = course.email || match.email;
        match.officeHours = course.officeHours || match.officeHours;
      } else {
        courses.push(course);
      }
    }
    const next: StudentMemory = {
      ...memory,
      courses,
      events: [...memory.events.filter((event) => !pending.events.some((nextEvent) => nextEvent.id === event.id)), ...pending.events],
    };
    const found = findCollisions(next.events);
    setMemory(next);
    setPending(null);
    setShowUpload(false);
    say("user", "Confirm calendar preview.");
    if (found.length) {
      const top = found.find((item) => item.severity === "severe") ?? found[0];
      say("bot", `Calendar updated. ${found.length} collision${found.length === 1 ? "" : "s"} found. ${top.severity === "severe" ? "Severe" : "Watch"}: ${top.events.map((event) => event.courseCode).join(", ")} on ${formatDate(top.start)}–${formatDate(top.end)}.`);
      if (top.severity === "severe") setDraft(draftExtensionRequest(next, top));
      setView("collisions");
    } else {
      say("bot", "Calendar updated. No 48-hour major-deadline pileups. Sunday brief is armed for 8:00 PM.");
      setView("overview");
    }
    notify("Events staged. Export the .ics when you want them on Google Calendar.");
  }

  function exportCalendar() {
    if (!memory.events.length) {
      notify("Add a syllabus first.");
      return;
    }
    downloadIcs("syllabot-semester.ics", eventsToIcs(memory.events, memory.courses));
    notify("Calendar file downloaded — import it in Google Calendar.");
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
    if (lower.includes("confirm") && pending) return confirmCalendar();
    if (/\b(due|exam|midterm|professor|office hours|assignment|project)\b/i.test(text) && findDateHint(text)) {
      say("user", text);
      return ingestText(text, "chat-syllabus.txt");
    }
    say("user", text);
    say("bot", "I can extract a syllabus, check collisions, write the Sunday brief, or draft an extension. Paste a syllabus, load the demo, or try “check collisions”.");
  }

  const firstName = memory.studentName.split(" ")[0];

  return (
    <main className="min-h-screen bg-[#f7f7f3] text-[#182221]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col bg-[#152e2c] px-4 py-6 text-white lg:flex">
        <div className="flex items-center gap-3 px-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#f16d55] shadow-[0_6px_18px_rgba(241,109,85,.35)]"><Sparkles className="size-5" /></div>
          <div>
            <p className="font-serif text-xl font-bold leading-none">Syllabot</p>
            <p className="mt-1 text-[10px] font-semibold tracking-[.2em] text-white/45">GROK BOT</p>
          </div>
        </div>
        <nav className="mt-11 space-y-1.5">
          <NavItem icon={<LayoutDashboard />} label="Overview" active={view === "overview"} onClick={() => setView("overview")} />
          <NavItem icon={<MessageSquare />} label="Chat" active={view === "chat"} onClick={() => setView("chat")} />
          <NavItem icon={<AlertTriangle />} label="Collisions" count={collisions.length || undefined} active={view === "collisions"} onClick={() => setView("collisions")} />
          <NavItem icon={<Mail />} label="Weekly brief" active={view === "briefs"} onClick={() => setView("briefs")} />
          <NavItem icon={<FileText />} label="Templates" active={view === "templates"} onClick={() => setView("templates")} />
        </nav>
        <p className="mb-3 mt-9 px-3 text-[10px] font-bold tracking-[.18em] text-white/35">MEMORY</p>
        <div className="space-y-1">
          {memory.courses.length ? memory.courses.map((course) => (
            <div key={course.code} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/68">
              <span className="size-2 rounded-full" style={{ background: course.color }} />
              <span className="truncate">{course.code}</span>
            </div>
          )) : <p className="px-3 text-xs text-white/40">No courses yet</p>}
        </div>
        <label className="mt-4 px-3 text-[10px] font-bold tracking-[.14em] text-white/35">
          WEEKLY CAPACITY
          <input
            type="number"
            min={4}
            max={40}
            value={memory.weeklyCapacityHours}
            onChange={(event) => setMemory((current) => ({ ...current, weeklyCapacityHours: Number(event.target.value) || 12 }))}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
        </label>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-[#f2b65b] text-sm font-bold text-[#18302e]">{firstName.slice(0, 1)}{memory.studentName.split(" ")[1]?.[0] ?? ""}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{memory.studentName}</p>
              <p className="truncate text-xs text-white/45">{memory.weeklyCapacityHours}h / week</p>
            </div>
            <Settings className="ml-auto size-4 text-white/40" />
          </div>
        </div>
      </aside>

      <section className="pb-24 lg:pb-0 lg:pl-[244px]">
        <header className="sticky top-0 z-40 flex h-[74px] items-center border-b border-[#dfe3dd] bg-[#fbfbf8]/95 px-5 backdrop-blur md:px-8 lg:px-10">
          <div className="grid size-9 place-items-center rounded-xl bg-[#f16d55] text-white lg:hidden"><Sparkles className="size-5" /></div>
          <div className="ml-3 lg:ml-0">
            <p className="font-serif text-xl font-bold">Good morning, {firstName}</p>
            <p className="hidden text-xs text-[#6e7976] sm:block">Syllabot · preview first, then calendar or email</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="grid size-9 place-items-center rounded-full text-[#65716e] hover:bg-[#eef0eb]" aria-label="Notifications"><Bell className="size-[18px]" /></button>
            <Button onClick={exportCalendar} variant="outline" className="hidden h-9 rounded-lg border-[#d9dfda] bg-white px-3 text-xs font-bold md:flex"><Download className="size-3.5" /> Export .ics</Button>
            <Button type="button" onClick={() => { setShowUpload(true); setUploadError(""); }} className="relative z-10 h-9 rounded-lg bg-[#f16d55] px-3.5 text-xs font-bold text-white shadow-none hover:bg-[#dd5c45]">
              <UploadCloud className="size-4" /> <span className="hidden sm:inline">Add syllabus</span>
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] p-5 md:p-8 lg:p-10">
          {view === "overview" && (
            <Overview
              memory={memory}
              brief={brief}
              collisions={collisions}
              weekEvents={weekEvents}
              completed={completed}
              setCompleted={setCompleted}
              onDemo={loadDemo}
              onUpload={() => setShowUpload(true)}
              onCollision={() => setView("collisions")}
              onDraft={() => { if (severe) runDraft(severe); }}
              onBrief={runBrief}
            />
          )}
          {view === "chat" && (
            <ChatPanel messages={messages} composer={composer} setComposer={setComposer} onSend={() => handlePrompt(composer)} onDemo={loadDemo} />
          )}
          {view === "collisions" && (
            <CollisionsPanel collisions={collisions} onDraft={(collision) => runDraft(collision)} onExport={exportCalendar} />
          )}
          {view === "briefs" && (
            <BriefPanel memory={memory} brief={brief} collisions={collisions} onSchedule={() => notify("Sunday 8:00 PM brief is scheduled in this workspace.")} />
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
                  <h2 className="font-serif text-2xl font-bold">{pending ? "Confirm calendar preview" : "Add your syllabi"}</h2>
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
                    <Button type="button" onClick={() => ingestText(paste)} disabled={!paste.trim()} className="rounded-lg bg-[#193c38] text-white hover:bg-[#112d2a]">Extract pasted text</Button>
                    <Button type="button" variant="outline" onClick={loadDemo} className="rounded-lg">Load demo semester</Button>
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
                    <Button variant="outline" onClick={() => setPending(null)} className="rounded-lg">Back</Button>
                    <Button onClick={confirmCalendar} className="rounded-lg bg-[#193c38] text-white hover:bg-[#112d2a]"><CheckCircle2 className="size-4" /> Confirm and keep</Button>
                  </div>
                </>
              )}
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

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-[#193c38]/95 px-2 py-2 text-white shadow-xl backdrop-blur lg:hidden">
        <MobileNav icon={<LayoutDashboard />} label="Home" active={view === "overview"} onClick={() => setView("overview")} />
        <MobileNav icon={<MessageSquare />} label="Chat" active={view === "chat"} onClick={() => setView("chat")} />
        <MobileNav icon={<AlertTriangle />} label="Conflicts" count={collisions.length || undefined} active={view === "collisions"} onClick={() => setView("collisions")} />
        <MobileNav icon={<FileText />} label="Template" active={view === "templates"} onClick={() => setView("templates")} />
      </nav>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#193c38] px-4 py-2.5 text-xs font-bold text-white shadow-xl lg:bottom-6">
          <CheckCircle2 className="size-4 text-[#8ed2be]" /> {toast}
        </div>
      )}
    </main>
  );
}

function findDateHint(text: string) {
  return /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{1,2})\b/i.test(text);
}

function Overview({ memory, brief, collisions, weekEvents, completed, setCompleted, onDemo, onUpload, onCollision, onDraft, onBrief }: {
  memory: StudentMemory;
  brief: ReturnType<typeof buildWeeklyBrief>;
  collisions: Collision[];
  weekEvents: AcademicEvent[];
  completed: string[];
  setCompleted: (value: string[] | ((current: string[]) => string[])) => void;
  onDemo: () => void;
  onUpload: () => void;
  onCollision: () => void;
  onDraft: () => void;
  onBrief: () => void;
}) {
  if (!memory.events.length) {
    return (
      <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
        <CardContent className="p-8 text-center md:p-12">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#fff0ec] text-[#e85d46]"><Sparkles className="size-7" /></div>
          <h1 className="mt-5 font-serif text-3xl font-bold">Drop in syllabi on day one.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#66736f]">Syllabot extracts deadlines, waits for your confirmation, flags 48-hour pileups, and drafts extension emails. Nothing is sent unless you say so.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={onUpload} className="rounded-lg bg-[#f16d55] text-white hover:bg-[#dd5c45]">Add a syllabus</Button>
            <Button variant="outline" onClick={onDemo} className="rounded-lg">Load demo semester</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const severe = collisions.find((item) => item.severity === "severe");
  return (
    <>
      <div className="mb-7">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[.13em] text-[#15836d]"><Sparkles className="size-3.5" /> YOUR SEMESTER, ORGANIZED</div>
        <h1 className="font-serif text-3xl font-bold md:text-[38px]">Here&apos;s what needs your attention.</h1>
      </div>
      {severe && (
        <Card className="mb-6 rounded-2xl border-[#f0c9c0] bg-[#fff7f4] py-0 shadow-none">
          <CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
            <div className="grid size-11 place-items-center rounded-xl bg-[#fde0d9] text-[#d6533d]"><AlertTriangle className="size-5" /></div>
            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-lg font-bold">{severe.events.length} majors within {severe.hoursSpan} hours</h2>
                <Badge className="bg-[#f16d55] text-[10px] text-white">SEVERE</Badge>
              </div>
              <p className="text-sm text-[#65706d]">{severe.events.map((event) => event.courseCode).join(", ")} land {formatDate(severe.start)}–{formatDate(severe.end)}. About {severe.totalHours} hours of work.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCollision} className="h-9 rounded-lg bg-white text-xs font-bold">View week</Button>
              <Button onClick={onDraft} className="h-9 rounded-lg bg-[#193c38] text-xs font-bold text-white hover:bg-[#112d2a]">Draft extension email</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,.74fr)]">
        <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
          <CardContent className="p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold">Due this week</h2>
                <p className="text-xs text-[#7c8683]">{brief.totalHours} estimated hours · {weekEvents.length} items</p>
              </div>
              <Badge variant="outline" className="border-[#cfe0da] bg-[#f2faf6] text-[10px] font-bold text-[#17755f]">{brief.totalHours <= brief.capacityHours ? "ON TRACK" : "OVER CAPACITY"}</Badge>
            </div>
            <div className="divide-y divide-[#edf0eb]">
              {weekEvents.length ? weekEvents.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <button onClick={() => setCompleted((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`grid size-5 place-items-center rounded-full border-2 ${completed.includes(item.id) ? "border-[#27957c] bg-[#27957c] text-white" : "border-[#cbd3d0] text-transparent"}`} aria-label={`Complete ${item.title}`}><Check className="size-3" /></button>
                  <div className={`min-w-0 flex-1 ${completed.includes(item.id) ? "opacity-45 line-through" : ""}`}>
                    <p className="text-[10px] font-bold text-[#82908c]">{item.courseCode}</p>
                    <p className="truncate text-sm font-bold">{item.title}</p>
                  </div>
                  <div className="hidden text-right sm:block"><p className="text-[10px] text-[#8a9491]">DUE</p><p className="text-xs font-bold">{formatDate(item.date)}</p></div>
                  <div className="flex items-center gap-1 text-xs font-bold"><Clock3 className="size-3.5 text-[#97a19e]" />{item.estimatedHours}h</div>
                </div>
              )) : <p className="text-sm text-[#75817d]">Nothing graded this week. Use the extra room to start early.</p>}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="rounded-2xl border-0 bg-[#193c38] py-0 text-white">
            <CardContent className="p-6">
              <Badge className="bg-white/10 text-[9px] text-white">SUNDAY 8:00 PM</Badge>
              <h2 className="mt-4 font-serif text-2xl font-bold">Your week, in 60 seconds.</h2>
              <p className="mt-2 text-sm text-white/64">{brief.weekLabel} · {brief.totalHours}h of {brief.capacityHours}h capacity.</p>
              <Progress value={Math.min(100, (brief.totalHours / brief.capacityHours) * 100)} className="mt-4 h-1.5 bg-white/10 [&>div]:bg-[#f58b75]" />
              <Button onClick={onBrief} className="mt-5 h-10 w-full rounded-lg bg-white text-xs font-bold text-[#193c38] hover:bg-[#f3f3ee]">Preview this week&apos;s brief <ChevronRight className="size-4" /></Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
            <CardContent className="p-5">
              <h2 className="mb-4 font-serif text-lg font-bold">Course health</h2>
              <div className="space-y-4">
                {memory.courses.map((course) => {
                  const upcoming = memory.events.filter((event) => event.courseId === course.id && event.kind !== "office-hour").length;
                  const hit = collisions.some((collision) => collision.events.some((event) => event.courseCode === course.code));
                  return (
                    <div key={course.id} className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-lg" style={{ color: course.color, background: course.bg }}><BookOpen className="size-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">{course.code}</p>
                        <p className="truncate text-[10px] text-[#89938f]">{course.professor}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold">{upcoming} items</p>
                        <p className={`text-[10px] ${hit ? "text-[#c44d38]" : "text-[#239076]"}`}>{hit ? "In a collision" : "No conflicts"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function ChatPanel({ messages, composer, setComposer, onSend, onDemo }: { messages: ChatMessage[]; composer: string; setComposer: (value: string) => void; onSend: () => void; onDemo: () => void }) {
  return (
    <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
      <CardContent className="flex min-h-[70vh] flex-col p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((message) => (
            <div key={message.id} className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-[#193c38] text-white" : "bg-[#f4f5f1] text-[#243330]"}`}>
              <pre className="whitespace-pre-wrap font-sans">{message.text}</pre>
            </div>
          ))}
        </div>
        <div className="border-t border-[#e7eae4] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={onDemo} className="h-8 rounded-lg text-xs">Load demo</Button>
            <Button variant="outline" onClick={() => setComposer("check collisions")} className="h-8 rounded-lg text-xs">Check collisions</Button>
            <Button variant="outline" onClick={() => setComposer("weekly brief")} className="h-8 rounded-lg text-xs">Weekly brief</Button>
          </div>
          <div className="flex gap-2">
            <input value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSend()} placeholder="Ask Syllabot, or paste a syllabus line with a date…" className="h-11 flex-1 rounded-xl border border-[#dfe3dd] bg-[#fbfbf8] px-3 text-sm outline-none" />
            <Button onClick={onSend} className="h-11 rounded-xl bg-[#193c38] text-white hover:bg-[#112d2a]"><Send className="size-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CollisionsPanel({ collisions, onDraft, onExport }: { collisions: Collision[]; onDraft: (collision: Collision) => void; onExport: () => void }) {
  if (!collisions.length) {
    return <Empty title="No collisions yet" body="Confirm a syllabus and I’ll scan for 48-hour pileups." />;
  }
  return (
    <div className="space-y-4">
      {collisions.map((collision) => (
        <Card key={collision.id} className="rounded-2xl border-[#e0e3dd] bg-white py-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className={collision.severity === "severe" ? "bg-[#fff0ec] text-[#c44d38]" : "bg-[#eef7f3] text-[#17755f]"}>{collision.severity.toUpperCase()}</Badge>
                <h2 className="mt-2 font-serif text-2xl font-bold">{collision.events.length} majors in {collision.hoursSpan} hours</h2>
                <p className="mt-1 text-sm text-[#75817d]">{formatDate(collision.start)}–{formatDate(collision.end)} · {collision.totalHours}h</p>
              </div>
              <Zap className="size-5 text-[#17836a]" />
            </div>
            <div className="mt-5 space-y-2">
              {collision.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-[#e4e7e1] bg-[#fcfcfa] p-4">
                  <p className="text-[10px] font-bold text-[#85908c]">{event.courseCode} · {formatDate(event.date)} {event.time}</p>
                  <p className="mt-1 text-sm font-bold">{event.title}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onExport} className="rounded-lg"><Download className="size-4" /> Export week</Button>
              {collision.severity === "severe" && <Button onClick={() => onDraft(collision)} className="rounded-lg bg-[#193c38] text-white hover:bg-[#112d2a]"><Mail className="size-4" /> Draft extension email</Button>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BriefPanel({ memory, brief, collisions, onSchedule }: { memory: StudentMemory; brief: ReturnType<typeof buildWeeklyBrief>; collisions: Collision[]; onSchedule: () => void }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-0 bg-[#f9faf6] py-0">
      <CardContent className="p-0">
        <div className="bg-[#193c38] p-6 text-white">
          <p className="text-[10px] font-bold tracking-[.18em] text-[#9fd0c3]">WEEKLY-BRIEF · SUNDAY 8:00 PM</p>
          <h2 className="mt-2 font-serif text-3xl font-bold">{brief.weekLabel}</h2>
          <p className="mt-2 text-sm text-white/65">{brief.totalHours}h planned of {brief.capacityHours}h capacity.</p>
        </div>
        <pre className="whitespace-pre-wrap p-6 font-sans text-sm leading-7 text-[#3d4b47]">{formatBriefEmail(memory, brief, collisions)}</pre>
        <div className="px-6 pb-6">
          <Button onClick={onSchedule} className="w-full rounded-lg bg-[#193c38] text-white hover:bg-[#112d2a]"><CheckCircle2 className="size-4" /> Arm Sunday brief</Button>
        </div>
      </CardContent>
    </Card>
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
      <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
        <CardContent className="p-6">
          <h1 className="font-serif text-3xl font-bold">Shared Bot template</h1>
          <p className="mt-2 text-sm text-[#66736f]">Copy these into Grok Bot so someone else can run Syllabot with their own Calendar and Gmail. Files also live in <code className="rounded bg-[#f3f4f0] px-1">template/</code> and <code className="rounded bg-[#f3f4f0] px-1">.grok/skills/</code>.</p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-[#f6f7f3] p-4 text-xs leading-6 text-[#3d4b47]">{GROK_SETUP_STEPS}</pre>
        </CardContent>
      </Card>
      {blocks.map((block) => (
        <Card key={block.title} className="rounded-2xl border-[#e0e3dd] bg-white py-0">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl font-bold">{block.title}</h2>
              <Button variant="outline" className="h-8 rounded-lg text-xs" onClick={() => { navigator.clipboard.writeText(block.body); notify(`Copied ${block.title}`); }}><Copy className="size-3.5" /> Copy</Button>
            </div>
            <pre className="whitespace-pre-wrap text-xs leading-6 text-[#3d4b47]">{block.body}</pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0">
      <CardContent className="p-10 text-center">
        <h2 className="font-serif text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-[#75817d]">{body}</p>
      </CardContent>
    </Card>
  );
}

function NavItem({ icon, label, active, count, onClick }: { icon: React.ReactNode; label: string; active?: boolean; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-white/10 font-bold text-white" : "text-white/58 hover:bg-white/5 hover:text-white"}`}>
      <span className="[&>svg]:size-[17px]">{icon}</span>
      <span>{label}</span>
      {count ? <span className="ml-auto grid size-5 place-items-center rounded-full bg-[#f16d55] text-[10px] font-bold text-white">{count}</span> : null}
    </button>
  );
}

function MobileNav({ icon, label, active, count, onClick }: { icon: React.ReactNode; label: string; active?: boolean; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[9px] font-semibold ${active ? "bg-white/10 text-white" : "text-white/55"}`}>
      <span className="[&>svg]:size-[17px]">{icon}</span>
      <span>{label}</span>
      {count ? <span className="absolute right-2 top-0 grid size-4 place-items-center rounded-full bg-[#f16d55] text-[8px] text-white">{count}</span> : null}
    </button>
  );
}
