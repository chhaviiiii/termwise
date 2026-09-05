"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle, Bell, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronRight, Clock3, FileText, LayoutDashboard, Mail, Search,
  Send, Settings, Sparkles, UploadCloud, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const courses = [
  { code: "CS 301", color: "#e85d46", bg: "#fff0ec", professor: "Dr. Chen" },
  { code: "ECON 210", color: "#6c63d9", bg: "#efedff", professor: "Prof. Alvarez" },
  { code: "PHIL 160", color: "#16856b", bg: "#e8f7f1", professor: "Dr. Morgan" },
  { code: "DES 220", color: "#c58a1b", bg: "#fff7df", professor: "Prof. Davis" },
];

const days = [
  { day: "MON", date: "14", items: [{ time: "10:00", title: "CS 301", color: "#e85d46" }] },
  { day: "TUE", date: "15", items: [{ time: "2:00", title: "ECON 210", color: "#6c63d9" }, { time: "4:30", title: "Office hours", color: "#16856b" }] },
  { day: "WED", date: "16", items: [{ time: "11:00", title: "PHIL 160", color: "#16856b" }] },
  { day: "THU", date: "17", active: true, items: [{ time: "9:00", title: "CS 301", color: "#e85d46" }, { time: "6:00", title: "Problem set", color: "#c58a1b" }] },
  { day: "FRI", date: "18", items: [{ time: "1:00", title: "Design studio", color: "#c58a1b" }] },
];

const weekItems = [
  { course: "CS 301", title: "Problem Set 3", due: "Wed, 11:59 PM", hours: 4, color: "#e85d46" },
  { course: "ECON 210", title: "Chapter 6 reading", due: "Thu, 2:00 PM", hours: 2, color: "#6c63d9" },
  { course: "PHIL 160", title: "Response paper", due: "Fri, 5:00 PM", hours: 3, color: "#16856b" },
];

export default function Home() {
  const [showUpload, setShowUpload] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function processFiles() {
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      setUploaded(true);
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f3] text-[#182221]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col bg-[#152e2c] px-4 py-6 text-white lg:flex">
        <div className="flex items-center gap-3 px-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#f16d55] shadow-[0_6px_18px_rgba(241,109,85,.35)]">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="font-serif text-xl font-bold leading-none">Syllabus Sync</p>
            <p className="mt-1 text-[10px] font-semibold tracking-[.2em] text-white/45">STUDENT COPILOT</p>
          </div>
        </div>

        <nav className="mt-11 space-y-1.5">
          <NavItem icon={<LayoutDashboard />} label="Overview" active />
          <NavItem icon={<CalendarDays />} label="Semester" />
          <NavItem icon={<AlertTriangle />} label="Collisions" count="3" />
          <NavItem icon={<Mail />} label="Weekly briefs" />
        </nav>

        <p className="mb-3 mt-9 px-3 text-[10px] font-bold tracking-[.18em] text-white/35">YOUR COURSES</p>
        <div className="space-y-1">
          {courses.map((course) => (
            <button key={course.code} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/68 transition hover:bg-white/7 hover:text-white">
              <span className="size-2 rounded-full" style={{ background: course.color }} />
              <span>{course.code}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-[#f2b65b] text-sm font-bold text-[#18302e]">CM</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Casey Morgan</p>
              <p className="truncate text-xs text-white/45">Fall semester</p>
            </div>
            <Settings className="ml-auto size-4 text-white/40" />
          </div>
        </div>
      </aside>

      <section className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 flex h-[74px] items-center border-b border-[#dfe3dd] bg-[#fbfbf8]/95 px-5 backdrop-blur md:px-8 lg:px-10">
          <div className="grid size-9 place-items-center rounded-xl bg-[#f16d55] text-white lg:hidden"><Sparkles className="size-5" /></div>
          <div className="ml-3 lg:ml-0">
            <p className="font-serif text-xl font-bold">Good morning, Casey</p>
            <p className="hidden text-xs text-[#6e7976] sm:block">Tuesday, September 15 · Week 4 of 15</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="grid size-9 place-items-center rounded-full text-[#65716e] hover:bg-[#eef0eb]" aria-label="Search"><Search className="size-[18px]" /></button>
            <button className="relative grid size-9 place-items-center rounded-full text-[#65716e] hover:bg-[#eef0eb]" aria-label="Notifications">
              <Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#ef684f]" />
            </button>
            <Button onClick={() => { setShowUpload(true); setUploaded(false); }} className="ml-1 h-9 rounded-lg bg-[#f16d55] px-3.5 text-xs font-bold text-white shadow-none hover:bg-[#dd5c45]">
              <UploadCloud className="size-4" /> <span className="hidden sm:inline">Add syllabus</span>
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] p-5 md:p-8 lg:p-10">
          <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[.13em] text-[#15836d]"><Sparkles className="size-3.5" /> YOUR SEMESTER, ORGANIZED</div>
              <h1 className="font-serif text-3xl font-bold tracking-[-.02em] md:text-[38px]">Here&apos;s what needs your attention.</h1>
            </div>
            <button className="flex items-center gap-2 text-xs font-bold text-[#52625f]">All tasks <ChevronRight className="size-4" /></button>
          </div>

          <Card className="mb-6 overflow-hidden rounded-2xl border-[#f0c9c0] bg-[#fff7f4] py-0 shadow-none">
            <CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fde0d9] text-[#d6533d]"><AlertTriangle className="size-5" /></div>
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-lg font-bold">Week 7 is looking intense</h2>
                  <Badge className="rounded-md bg-[#f16d55] px-2 text-[10px] text-white">HIGH LOAD</Badge>
                </div>
                <p className="text-sm leading-relaxed text-[#65706d]">
                  2 midterms and your design project land within 36 hours. That&apos;s an estimated <b className="text-[#283b38]">18 hours of work</b> across Oct 12–14.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-9 rounded-lg border-[#e1c5be] bg-white text-xs font-bold">View week</Button>
                <Button onClick={() => setShowDraft(true)} className="h-9 rounded-lg bg-[#193c38] text-xs font-bold text-white hover:bg-[#112d2a]">Draft extension email</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,.74fr)]">
            <div className="space-y-6">
              <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0 shadow-[0_3px_18px_rgba(30,55,50,.04)]">
                <CardContent className="p-5 md:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-xl font-bold">This week</h2>
                      <p className="text-xs text-[#7c8683]">September 14–18</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-[#e4e6e0] bg-[#fafbf8] p-1">
                      <button className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold shadow-sm">Week</button>
                      <button className="px-3 py-1.5 text-[11px] font-semibold text-[#7d8784]">Month</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {days.map((day) => (
                      <div key={day.day} className={`min-h-[175px] rounded-xl border p-3 ${day.active ? "border-[#8fb8ad] bg-[#f1faf6]" : "border-[#e7e9e4] bg-[#fcfcfa]"}`}>
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[9px] font-bold tracking-[.13em] text-[#8a9491]">{day.day}</span>
                          <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${day.active ? "bg-[#193c38] text-white" : ""}`}>{day.date}</span>
                        </div>
                        <div className="space-y-2">
                          {day.items.map((item) => (
                            <div key={item.title} className="rounded-md border-l-[3px] bg-white px-2 py-2 shadow-[0_1px_3px_rgba(0,0,0,.04)]" style={{ borderColor: item.color }}>
                              <p className="text-[9px] font-semibold text-[#8b9492]">{item.time}</p>
                              <p className="mt-0.5 text-[10px] font-bold leading-tight">{item.title}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0 shadow-[0_3px_18px_rgba(30,55,50,.04)]">
                <CardContent className="p-5 md:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-xl font-bold">Due this week</h2>
                      <p className="text-xs text-[#7c8683]">9 estimated hours · 3 assignments</p>
                    </div>
                    <Badge variant="outline" className="border-[#cfe0da] bg-[#f2faf6] text-[10px] font-bold text-[#17755f]">ON TRACK</Badge>
                  </div>
                  <div className="divide-y divide-[#edf0eb]">
                    {weekItems.map((item, index) => (
                      <div key={item.title} className="group flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                        <button className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-[#cbd3d0] text-white group-hover:border-[#27957c] group-hover:bg-[#27957c]" aria-label={`Complete ${item.title}`}><Check className="size-3" /></button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-[10px] font-bold tracking-wide text-[#82908c]">{item.course}</span>
                          </div>
                          <p className="mt-0.5 truncate text-sm font-bold">{item.title}</p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="text-[10px] font-semibold text-[#8a9491]">DUE</p>
                          <p className="text-xs font-bold">{item.due}</p>
                        </div>
                        <div className="flex w-12 items-center justify-end gap-1 text-xs font-bold text-[#53615e]"><Clock3 className="size-3.5 text-[#97a19e]" />{item.hours}h</div>
                        {index === 0 && <ChevronRight className="size-4 text-[#adb5b2]" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-2xl border-0 bg-[#193c38] py-0 text-white shadow-[0_8px_28px_rgba(25,60,56,.18)]">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="grid size-10 place-items-center rounded-xl bg-white/10"><Mail className="size-5 text-[#ffd1c6]" /></div>
                    <Badge className="bg-white/10 text-[9px] font-bold tracking-wider text-white">SUNDAY BRIEF</Badge>
                  </div>
                  <h2 className="mt-5 font-serif text-2xl font-bold">Your week, in 60 seconds.</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/64">The next brief lands Sunday at 8:00 PM with priorities, time estimates, and what to start early.</p>
                  <div className="mt-5 rounded-xl bg-white/[.07] p-4">
                    <div className="mb-2 flex justify-between text-xs"><span className="text-white/60">Planned workload</span><b>9h / 12h</b></div>
                    <Progress value={75} className="h-1.5 bg-white/10 [&>div]:bg-[#f58b75]" />
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-[#b8ded4]"><CheckCircle2 className="size-3.5" /> Fits your weekly capacity</div>
                  </div>
                  <Button className="mt-5 h-10 w-full rounded-lg bg-white text-xs font-bold text-[#193c38] hover:bg-[#f3f3ee]">Preview this week&apos;s brief <ChevronRight className="size-4" /></Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[#e0e3dd] bg-white py-0 shadow-[0_3px_18px_rgba(30,55,50,.04)]">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-serif text-lg font-bold">Course health</h2>
                    <button className="text-[10px] font-bold text-[#70807c]">View all</button>
                  </div>
                  <div className="space-y-4">
                    {courses.slice(0, 3).map((course, index) => (
                      <div key={course.code} className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg" style={{ color: course.color, background: course.bg }}><BookOpen className="size-4" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold">{course.code}</p>
                          <p className="truncate text-[10px] text-[#89938f]">{course.professor}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">{[7, 5, 3][index]} upcoming</p>
                          <p className="text-[10px] text-[#239076]">No conflicts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {showUpload && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102523]/55 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setShowUpload(false)}>
          <Card className="w-full max-w-lg rounded-2xl border-0 bg-white py-0 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div><h2 className="font-serif text-2xl font-bold">Add your syllabi</h2><p className="mt-1 text-sm text-[#76817e]">We&apos;ll extract dates, readings, exams, and office hours.</p></div>
                <button onClick={() => setShowUpload(false)} className="grid size-8 place-items-center rounded-full bg-[#f3f4f0]"><X className="size-4" /></button>
              </div>
              {!uploaded ? (
                <>
                  <input ref={fileRef} type="file" multiple accept=".pdf,application/pdf" className="hidden" onChange={processFiles} />
                  <button onClick={() => fileRef.current?.click()} onDrop={(e) => { e.preventDefault(); processFiles(); }} onDragOver={(e) => e.preventDefault()} className="mt-6 grid w-full place-items-center rounded-2xl border-2 border-dashed border-[#b9cbc5] bg-[#f7fbf8] px-5 py-10 text-center transition hover:border-[#4e8b7d]">
                    <div className="grid size-12 place-items-center rounded-xl bg-[#e2f1eb] text-[#1c775f]"><UploadCloud className="size-6" /></div>
                    <p className="mt-4 text-sm font-bold">Drop PDF syllabi here</p>
                    <p className="mt-1 text-xs text-[#8b9592]">or click to browse · up to 10 files</p>
                  </button>
                  {processing && <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-semibold"><span>Reading your syllabi…</span><span>Finding deadlines</span></div><Progress value={68} className="h-2 [&>div]:bg-[#f16d55]" /></div>}
                  <div className="mt-5 flex items-center justify-center gap-5 text-[10px] font-semibold text-[#85908d]">
                    <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Google Calendar</span>
                    <span className="flex items-center gap-1.5"><Mail className="size-3.5" /> Gmail</span>
                    <span className="flex items-center gap-1.5"><FileText className="size-3.5" /> Private by default</span>
                  </div>
                </>
              ) : (
                <div className="mt-6 text-center">
                  <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#e5f5ef] text-[#16856b]"><CheckCircle2 className="size-7" /></div>
                  <h3 className="mt-4 font-serif text-xl font-bold">Semester mapped!</h3>
                  <p className="mt-1 text-sm text-[#75817d]">Found 47 deadlines, 6 exams, and 12 office-hour slots across 4 courses.</p>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {["47 deadlines", "6 exams", "3 collisions"].map((stat) => <div key={stat} className="rounded-lg bg-[#f4f5f1] px-2 py-3 text-xs font-bold">{stat}</div>)}
                  </div>
                  <Button onClick={() => setShowUpload(false)} className="mt-5 w-full rounded-lg bg-[#193c38] text-white hover:bg-[#112d2a]">Open semester plan</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showDraft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102523]/55 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setShowDraft(false)}>
          <Card className="w-full max-w-xl rounded-2xl border-0 bg-white py-0 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div><Badge className="mb-2 bg-[#fff0ec] text-[#c44d38]">DRAFT · NOT SENT</Badge><h2 className="font-serif text-2xl font-bold">Extension request</h2></div>
                <button onClick={() => setShowDraft(false)} className="grid size-8 place-items-center rounded-full bg-[#f3f4f0]"><X className="size-4" /></button>
              </div>
              <div className="mt-5 space-y-3 rounded-xl border border-[#e3e6e0] bg-[#fbfbf8] p-4 text-sm">
                <p><span className="mr-3 text-[#8a9491]">To</span> Prof. Davis &lt;davis@university.edu&gt;</p>
                <p className="border-t border-[#e6e8e3] pt-3"><span className="mr-3 text-[#8a9491]">Subject</span> Request regarding DES 220 project deadline</p>
              </div>
              <div className="mt-4 rounded-xl border border-[#e3e6e0] p-4 text-sm leading-7 text-[#46534f]">
                <p>Dear Professor Davis,</p>
                <p className="mt-3">I&apos;m writing about the interaction design project due October 14. I have two midterm exams scheduled within the preceding 36 hours, and I want to make sure I can give the project the attention it deserves.</p>
                <p className="mt-3">Would it be possible to submit by October 16 instead? I&apos;ve already completed the research phase and can share my current progress if helpful.</p>
                <p className="mt-3">Thank you for considering my request,<br />Casey Morgan</p>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDraft(false)} className="rounded-lg">Save for later</Button>
                <Button onClick={() => setShowDraft(false)} className="rounded-lg bg-[#193c38] text-white hover:bg-[#112d2a]"><Send className="size-4" /> Open in Gmail</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

function NavItem({ icon, label, active, count }: { icon: React.ReactNode; label: string; active?: boolean; count?: string }) {
  return (
    <button className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-white/10 font-bold text-white" : "text-white/58 hover:bg-white/5 hover:text-white"}`}>
      <span className="[&>svg]:size-[17px]">{icon}</span>
      <span>{label}</span>
      {count && <span className="ml-auto grid size-5 place-items-center rounded-full bg-[#f16d55] text-[10px] font-bold text-white">{count}</span>}
    </button>
  );
}
