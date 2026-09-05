#!/usr/bin/env python3
"""Write selectable-text demo syllabus PDFs for Termwise / Grok Bot."""

from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "samples"

SYLLABI = [
    (
        "CS301-Algorithms.pdf",
        "CS 301 Algorithms",
        [
            "CS 301 - Algorithms",
            "Fall 2026  |  Computer Science",
            "Professor: Dr. Chen (chen@university.edu)",
            "Office hours: Tuesday 4:30-5:30 PM, Gates 214",
            "Late policy: 10% per day up to 3 days; exams cannot be late.",
            "",
            "This course covers algorithm design and analysis: divide and conquer,",
            "graphs, dynamic programming, and NP-completeness. Readings are from",
            "CLRS. Weights below are taken from the published schedule.",
            "",
            "Graded schedule",
            "Sep 10, 2026 - Problem Set 1 due 11:59 PM (8%)",
            "Sep 24, 2026 - Problem Set 2 due 11:59 PM (8%)",
            "Oct 8, 2026 - Problem Set 3 due 11:59 PM (8%)",
            "Oct 12, 2026 - Midterm exam 9:00 AM, Gates 214 (25%)",
            "Nov 5, 2026 - Problem Set 4 due 11:59 PM (8%)",
            "Dec 10, 2026 - Final exam 9:00 AM, Gates 214 (35%)",
            "",
            "Weekly readings",
            "Sep 8, 2026 - Read CLRS Chapter 2",
            "Sep 15, 2026 - Read CLRS Chapter 4",
            "",
            "Participation and remaining percent are not listed as dated items.",
            "Do not invent extra due dates. Contact Dr. Chen before an exam conflict.",
        ],
    ),
    (
        "ECON210-Microeconomics.pdf",
        "ECON 210 Microeconomics",
        [
            "ECON 210 - Microeconomics",
            "Fall 2026  |  Economics",
            "Instructor: Prof. Alvarez (alvarez@university.edu)",
            "Office hours: Wednesday 1:00-2:00 PM",
            "Late policy: No late work accepted without prior notice.",
            "",
            "We study consumer choice, firms, market structure, and policy. Come",
            "to section having done the reading. The policy memo is the flexible",
            "item if midterm week piles up with other majors.",
            "",
            "Assignments and exams",
            "Sep 11, 2026 - Chapter 6 reading",
            "Sep 18, 2026 - Problem set 2 due 5:00 PM (10%)",
            "Oct 2, 2026 - Quiz 2 (5%)",
            "Oct 13, 2026 - Midterm exam 2:00 PM, Hall 110 (25%)",
            "Nov 20, 2026 - Policy memo due 11:59 PM (15%)",
            "Dec 12, 2026 - Final exam 1:00 PM, Hall 110 (30%)",
            "",
            "Listed weights do not add to 100%. Recitation credit is not on this",
            "calendar. Email Prof. Alvarez with prior notice if you need flexibility.",
        ],
    ),
    (
        "PHIL160-Ethics.pdf",
        "PHIL 160 Ethics and Technology",
        [
            "PHIL 160 - Ethics & Technology",
            "Fall 2026  |  Philosophy",
            "Professor: Dr. Morgan (morgan@university.edu)",
            "Office hours: Thursday 11:00 AM-12:00 PM",
            "Late policy: One 48-hour grace window per term; after that, 5% per day.",
            "",
            "A writing-heavy seminar on ethics, computing, and responsibility.",
            "Papers must use course readings. The midterm paper is usually the",
            "most flexible item in a 48-hour pileup, not an exam.",
            "",
            "Course calendar",
            "Sep 12, 2026 - Response paper 1 due 5:00 PM (10%)",
            "Sep 26, 2026 - Reading: Chapters 4-5",
            "Oct 20, 2026 - Midterm paper due 5:00 PM (25%)",
            "Nov 14, 2026 - Presentation (15%)",
            "Dec 8, 2026 - Final paper due 5:00 PM (30%)",
            "",
            "Seminar discussion is not given a dated weight here. Use the one",
            "grace window in writing. Do not invent extra paper due dates.",
        ],
    ),
    (
        "DES220-Interaction-Design.pdf",
        "DES 220 Interaction Design",
        [
            "DES 220 - Interaction Design",
            "Fall 2026  |  Design",
            "Professor: Prof. Davis (davis@university.edu)",
            "Office hours: Friday 2:00-3:30 PM, Studio B",
            "Late policy: Studio critiques cannot be late; project work loses a letter step per day.",
            "",
            "Studio course. You will research, prototype, test, and ship a small",
            "interaction. Critiques are in person in the studio. The project due",
            "in October is a major deadline and often collides with other midterms.",
            "",
            "Project milestones",
            "Sep 9, 2026 - Studio critique, Studio B",
            "Sep 23, 2026 - Research memo due 6:00 PM (10%)",
            "Oct 13, 2026 - Interaction design project due 11:59 PM (30%)",
            "Nov 11, 2026 - Usability report due 11:59 PM (20%)",
            "Dec 4, 2026 - Final portfolio due 11:59 PM, Studio B (25%)",
            "",
            "In-studio work is required. Critiques have no late path. Ask Prof.",
            "Davis before a project deadline if another course exam lands the same week.",
        ],
    ),
]


def pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def page_stream(lines: list[str]) -> bytes:
    commands = ["BT", "/F2 16 Tf", "72 720 Td", f"({pdf_escape(lines[0])}) Tj"]
    if len(lines) > 1:
        commands += ["/F1 10 Tf", "0 -22 Td", f"({pdf_escape(lines[1])}) Tj"]
    commands += ["/F1 11 Tf", "16 TL"]
    for line in lines[2:]:
        commands.append("T*")
        if line == "":
            commands.append("0 -6 Td")
            continue
        commands.append(f"({pdf_escape(line)}) Tj")
    commands.append("ET")
    return "\n".join(commands).encode("latin-1", "replace")


def build_pdf(title: str, lines: list[str]) -> bytes:
    content = page_stream(lines)
    objects = [
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        (
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            "/Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> "
            f"/Annots [] >> endobj\n"
        ),
        f"4 0 obj << /Length {len(content)} >> stream\n".encode() + content + b"\nendstream\nendobj\n",
        "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n",
        f"7 0 obj << /Title ({pdf_escape(title)}) /Creator (Termwise) >> endobj\n",
    ]

    encoded = []
    for obj in objects:
        encoded.append(obj if isinstance(obj, bytes) else obj.encode("latin-1"))

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = b""
    offsets = [0]
    cursor = len(header)
    for chunk in encoded:
        offsets.append(cursor)
        body += chunk
        cursor += len(chunk)

    xref = [f"xref\n0 {len(offsets)}\n0000000000 65535 f \n"]
    for offset in offsets[1:]:
        xref.append(f"{offset:010d} 00000 n \n")
    trailer = (
        f"trailer << /Size {len(offsets)} /Root 1 0 R /Info 7 0 R >>\n"
        f"startxref\n{cursor}\n%%EOF\n"
    )
    return header + body + "".join(xref).encode("latin-1") + trailer.encode("latin-1")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, title, lines in SYLLABI:
        path = OUT / name
        path.write_bytes(build_pdf(title, lines))
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
