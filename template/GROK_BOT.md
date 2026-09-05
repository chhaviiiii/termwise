# Install Syllabot in Grok Bot

This folder is the shareable Bot template. It has no API keys and no student data.

1. In Grok Bot: **New → Create new agent → name it "Syllabot"**
2. **Bot actions → Edit Profile** and paste `01-identity.md`
3. In the new chat, paste `02-connect-plugins.md`
4. Add the four skills from `.grok/skills/` (or `03-06` in this folder)
5. Ask: `Every Sunday at 8pm, run weekly-brief.`
6. When it works, **Share as template**. Strip any personal emails first.

Recipients reconnect their own Calendar and Gmail. They do not get your logins.

The working web app in this repo runs the same skills without Grok plugins: paste or upload a syllabus, confirm the table, then export `.ics` / open a `mailto:` draft.
