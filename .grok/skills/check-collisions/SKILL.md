---
name: check-collisions
description: After new deadlines are added, flag any 48-hour window with 2+ major deadlines (exam, project, or paper).
user-invocable: true
---

# check-collisions

Termwise skill. Run immediately after extract-syllabus events are confirmed.

## Rules

- Major items: exams, projects, papers.
- Watch: 2 majors within 48 hours.
- Severe: 3+ majors within 48 hours.
- Report dates, course names, estimated hours, and which item is most flexible.

If severe, offer `draft-extension-request` for the flexible item (usually a project or paper, never an exam).
