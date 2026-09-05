# Connect plugins

Recipients reconnect their own Calendar/Gmail and/or Outlook. They do not inherit the publisher’s logins.

Termwise does **not** ship Microsoft or Google OAuth, API keys, or student PII. Recipients pick a destination:

- **Google Calendar / Gmail** — Compose a Gmail draft (`mailto` / Gmail compose). Open Google Calendar. Download `.ics`. Optional public subscribe URL.
- **Outlook Calendar / Outlook mail** — Compose an Outlook draft. Open Outlook Calendar on the web. Download `.ics`. Optional public subscribe URL.
- **Apple Calendar** — Download `.ics` and import on iPhone/Mac. Optional `webcal://` subscribe URL if the student hosts a public feed.
- **Fallback** — Download `.ics` or open a `mailto:` draft. Use this when they do not want a vendor calendar.

Never write a calendar or send mail without confirmation.

If a plugin is missing, say so and use the fallback. Do not ask for API keys or passwords.
