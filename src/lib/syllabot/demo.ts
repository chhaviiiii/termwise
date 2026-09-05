export const DEMO_SYLLABI = [
  {
    fileName: "CS301-Algorithms.txt",
    text: `CS 301 — Algorithms
Professor: Dr. Chen (chen@university.edu)
Office hours: Tuesday 4:30-5:30 PM, Gates 214
Late policy: 10% per day up to 3 days; exams cannot be late.

Graded schedule
Sep 10, 2026 — Problem Set 1 due 11:59 PM (8%)
Sep 24, 2026 — Problem Set 2 due 11:59 PM (8%)
Oct 8, 2026 — Problem Set 3 due 11:59 PM (8%)
Oct 12, 2026 — Midterm exam 9:00 AM, Gates 214 (25%)
Nov 5, 2026 — Problem Set 4 due 11:59 PM (8%)
Dec 10, 2026 — Final exam 9:00 AM, Gates 214 (35%)

Weekly readings
Sep 8, 2026 — Read CLRS Chapter 2
Sep 15, 2026 — Read CLRS Chapter 4
`,
  },
  {
    fileName: "ECON210-Microeconomics.txt",
    text: `ECON 210 — Microeconomics
Instructor: Prof. Alvarez (alvarez@university.edu)
Office hours: Wednesday 1:00-2:00 PM
Late policy: No late work accepted without prior notice.

Assignments and exams
Sep 11, 2026 — Chapter 6 reading
Sep 18, 2026 — Problem set 2 due 5:00 PM (10%)
Oct 2, 2026 — Quiz 2 (5%)
Oct 13, 2026 — Midterm exam 2:00 PM, Hall 110 (25%)
Nov 20, 2026 — Policy memo due 11:59 PM (15%)
Dec 12, 2026 — Final exam 1:00 PM, Hall 110 (30%)
`,
  },
  {
    fileName: "PHIL160-Ethics.txt",
    text: `PHIL 160 — Ethics & Technology
Professor: Dr. Morgan (morgan@university.edu)
Office hours: Thursday 11:00 AM-12:00 PM
Late policy: One 48-hour grace window per term; after that, 5% per day.

Course calendar
Sep 12, 2026 — Response paper 1 due 5:00 PM (10%)
Sep 26, 2026 — Reading: Chapters 4-5
Oct 20, 2026 — Midterm paper due 5:00 PM (25%)
Nov 14, 2026 — Presentation (15%)
Dec 8, 2026 — Final paper due 5:00 PM (30%)
`,
  },
  {
    fileName: "DES220-Interaction-Design.txt",
    text: `DES 220 — Interaction Design
Professor: Prof. Davis (davis@university.edu)
Office hours: Friday 2:00-3:30 PM, Studio B
Late policy: Studio critiques cannot be late; project work loses a letter step per day.

Project milestones
Sep 9, 2026 — Studio critique, Studio B
Sep 23, 2026 — Research memo due 6:00 PM (10%)
Oct 13, 2026 — Interaction design project due 11:59 PM (30%)
Nov 11, 2026 — Usability report due 11:59 PM (20%)
Dec 4, 2026 — Final portfolio due 11:59 PM, Studio B (25%)
`,
  },
];

export const DEFAULT_MEMORY = {
  studentName: "Casey Morgan",
  weeklyCapacityHours: 12,
  extensions: [
    { courseCode: "PHIL 160", status: "approved", note: "48-hour extension granted last spring for the midterm paper." },
  ],
};
