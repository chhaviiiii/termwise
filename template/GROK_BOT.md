# Install Termwise in Grok Bot

This folder is the shareable Bot template. It has no API keys and no student data.

Termwise is both a working web app in this repo and a Grok Bot. Create the Bot, then paste the identity, skills, and Sunday routine so it matches the app.

1. In Grok: **New → Create new agent → name it "Termwise"**
2. **Bot actions → Edit Profile**: name Termwise, title **A tidy semester desk**, and this listing description (also in `termwise.template.json`):

   A student semester desk: extract syllabus deadlines, confirm or edit the table, catch 48-hour pileups, keep optional work-back study blocks, draft extension emails, and send a Sunday week-ahead brief. Connect Google Calendar / Gmail, Outlook Calendar / Outlook mail, or Apple Calendar — you pick, you do not inherit logins — or use Fallback: .ics download / mailto draft. Never writes calendar or mail without a preview.

   Then paste `01-identity.md`.
3. In the new chat, paste `02-connect-plugins.md`
4. Add the five skills from `.grok/skills/` (or `03-07` in this folder)
5. Ask: `Every Sunday at 8pm, run weekly-brief.`
6. When it works, **Share as template**. Strip any personal emails first.

Recipients reconnect whichever they use — Google Calendar / Gmail, Outlook Calendar / Outlook mail, or Apple Calendar. They pick; they do not get your logins.

The working web app in this repo runs the same skills without Grok plugins: paste or upload a syllabus, confirm the table (keep/skip, edit dates, keep suggested study blocks), then pick Google, Outlook, Apple, or Fallback.
