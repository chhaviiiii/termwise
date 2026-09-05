# Termwise

A working academic desk for the Student Build Challenge. Drop in syllabi, confirm what you see, catch 48-hour pileups, and draft extension emails. Termwise never sends them.

The same identity, skills, and Sunday 8pm note live in the Grok Bot template so others can install it with their own Google Calendar / Gmail or Outlook Calendar / Outlook mail.

## Run the working app

```bash
npm install
npm run dev -- --port 43127
```

Open [http://localhost:43127](http://localhost:43127).

1. **Add syllabus** or **Load demo semester**
2. Review the extraction table (course, kind, when, hours, weight and location if the syllabus listed them)
3. **Add to calendar**. Nothing is written before this.
4. Confirmed items land on the color-coded Termwise semester calendar, including weekly office hours. Click an event for professor, office hours, late-policy notes, and pileup flags.
5. **Add to Google** or **Add to Outlook** downloads a reminder-ready `.ics` (Apple Calendar opens it too), copies a subscribe link, and opens one From URL / Subscribe from web tab. Exams and projects can also be added one click at a time. Nothing is written without your click.
6. Open **Collisions** if week 7 piles up (CS 301 midterm, DES 220 project, ECON 210 midterm)
7. Review the extension draft. Termwise will not send it. Review in Gmail or Outlook mail, or use `mailto:`.

Paste text or upload a text-based PDF. Open **Customize** to change theme, accent color, course colors, density, calendar/mail destination, and which overview widgets show, and in what order. Settings stay in the browser.

The mark lives at `public/termwise-mark.svg` (sidebar and mobile header) and `src/app/icon.svg` (favicon).

## Grok Bot template

Termwise is also a Grok Bot. In Grok: New → Create new agent → name it Termwise, then paste identity, skills, and the Sunday routine. Full steps are in `template/GROK_BOT.md`.

Shareable files (no secrets, no student data):

| File | What to paste |
| --- | --- |
| `template/01-identity.md` | Bot profile |
| `template/02-connect-plugins.md` | First chat: Google Calendar + Gmail, or Outlook Calendar + Outlook mail |
| `template/03-extract-syllabus.md` | Skill |
| `template/04-check-collisions.md` | Skill |
| `template/05-weekly-brief.md` | Sunday 8pm routine |
| `template/06-draft-extension-request.md` | Skill |
| `template/termwise.template.json` | Portable bundle |
| `.grok/skills/*/SKILL.md` | Installable skills |

Setup steps are in `template/GROK_BOT.md` and in the app's **Templates** view (copy buttons included). Recipients reconnect whichever they use — Google and/or Outlook. They do not inherit logins.

## Skills

- **extract-syllabus**: graded items, readings, office hours, professor email, weight/location/late notes if listed; confirmation table first
- **check-collisions**: 2 majors in 48 hours = watch; 3+ = severe
- **weekly-brief**: dues by course, collisions in 2 weeks, one thing to start early
- **draft-extension-request**: polite draft to the professor on the flexible item; never sent unless you say “send it”

Google Calendar / Gmail or Outlook Calendar / Outlook mail two-way sync needs those plugins in Grok Bot. This app's fallbacks are `.ics` download, an optional subscribe URL, and `mailto:` / web compose drafts. Google OAuth and Microsoft OAuth are not used.
