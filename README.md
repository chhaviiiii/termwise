# Syllabot

A working academic assistant for the Student Build Challenge. Drop in syllabi, confirm a calendar preview, catch 48-hour deadline pileups, and draft — never send — extension emails.

The same identity, skills, and Sunday 8pm routine live in the Grok Bot template so others can install it with their own Calendar and Gmail.

## Run the working app

```bash
npm install
npm run dev -- --port 43127
```

Open [http://localhost:43127](http://localhost:43127).

1. **Add syllabus** or **Load demo semester**
2. Review the extraction table
3. **Confirm and keep** — nothing is written before this
4. Open **Collisions** if week 7 piles up (CS 301 midterm, DES 220 project, ECON 210 midterm)
5. Review the extension draft. Syllabot will not send it.
6. **Export .ics** to import into Google Calendar, or open the draft in your mail client

Paste text or upload a text-based PDF. Weekly capacity is remembered in the sidebar.

## Grok Bot template

Shareable files (no secrets, no student data):

| File | What to paste |
| --- | --- |
| `template/01-identity.md` | Bot profile |
| `template/02-connect-plugins.md` | First chat: Calendar + Gmail |
| `template/03-extract-syllabus.md` | Skill |
| `template/04-check-collisions.md` | Skill |
| `template/05-weekly-brief.md` | Sunday 8pm routine |
| `template/06-draft-extension-request.md` | Skill |
| `template/syllabot.template.json` | Portable bundle |
| `.grok/skills/*/SKILL.md` | Installable skills |

Setup steps are in `template/GROK_BOT.md` and in the app’s **Templates** view (copy buttons included).

## Skills

- **extract-syllabus** — graded items, readings, office hours, professor email; confirmation table first
- **check-collisions** — 2 majors in 48 hours = watch; 3+ = severe
- **weekly-brief** — dues by course, collisions in 2 weeks, one thing to start early
- **draft-extension-request** — polite draft to the professor on the flexible item; never sent unless you say “send it”

Google Calendar / Gmail two-way sync needs those plugins in Grok Bot. This app’s fallbacks are `.ics` download and `mailto:`.
