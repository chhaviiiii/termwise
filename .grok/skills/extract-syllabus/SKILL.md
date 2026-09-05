---
name: extract-syllabus
description: Pull graded items, readings, office hours, and professor contacts from a syllabus PDF or pasted text. Show a confirmation table before any calendar write.
user-invocable: true
argument-hint: "[syllabus PDF or pasted text]"
---

# extract-syllabus

Use when the student uploads or pastes a syllabus.

## Steps

1. Extract every graded item: assignments, quizzes, midterms, finals, projects, with exact due dates and times.
2. Extract weekly readings if listed.
3. Extract office hours and professor contact info.
4. Color-code events by course name.
5. Show a summary table (course, item, kind, date, time, estimated hours).
6. Wait for confirmation before creating Google Calendar events.

## Safety

Never create calendar events until the student confirms the table. If Calendar is disconnected, offer an `.ics` download after confirmation.
