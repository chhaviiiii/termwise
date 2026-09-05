---
name: extract-syllabus
description: Pull graded items, readings, office hours, and professor contacts from a syllabus PDF or pasted text. Show a confirmation table before any calendar write.
user-invocable: true
argument-hint: "[syllabus PDF or pasted text]"
---

# extract-syllabus

Termwise skill. Use when the student uploads or pastes a syllabus.

## Steps

1. Extract every graded item: assignments, quizzes, midterms, finals, projects, with exact due dates and times.
2. Extract weekly readings if listed.
3. Extract office hours, professor contact info, weight if listed, location, and late-policy notes. Do not invent grades or dates.
4. Always expand listed office hours into weekly events across the term. Keep them. Do not skip them.
5. Color-code events by course name.
6. Show an editable summary table (course, item, kind, date, time, estimated hours, weight and location if listed). The student can fix or skip rows except weekly office hours.
7. Offer optional work-back study blocks from listed hours. Keep them off until the student opts in. Do not invent due dates.
8. Wait for confirmation before creating calendar events on Google Calendar, Outlook Calendar, Apple Calendar, or Fallback .ics.

## Safety

Never create calendar events until the student confirms the table. If Calendar is disconnected, offer Fallback: `.ics` download after confirmation.
