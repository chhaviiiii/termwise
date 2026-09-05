# Syllabus Sync

A student copilot that turns syllabus PDFs into a semester plan. It extracts and classifies dated items from real PDFs, highlights deadline collisions, estimates weekly workload, previews Sunday planning briefs, exports an `.ics` calendar, and drafts extension-request emails for review.

## Run locally

```bash
npm install
npm run dev -- --port 43127
```

Open [http://localhost:43127](http://localhost:43127).

## What works

- Upload up to 10 text-based PDF syllabi (15 MB each)
- Server-side extraction of dates, exams, readings, assignments, and office hours
- Interactive collision map and extension-request draft
- Weekly workload brief, task completion, and calendar export
- Responsive desktop and mobile dashboard

Google Calendar and Gmail buttons use credential-free fallbacks (`.ics` download and `mailto:`). Production two-way sync requires Google OAuth credentials.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
