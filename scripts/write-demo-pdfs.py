#!/usr/bin/env python3
"""Write selectable-text demo syllabus PDFs for Termwise / Grok Bot."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "samples"

# Body copy never includes a leftover month+day in prose (that becomes a fake event).
SYLLABI = [
    (
        "CS301-Algorithms",
        "CS 301 Algorithms",
        [
            "CS 301 - Algorithms",
            "Fall 2026  |  Computer Science",
            "Professor: Dr. Chen (chen@university.edu)",
            "Office hours: Tuesday 4:30-5:30 PM, Gates 214",
            "Late policy: 10% per day up to 3 days; exams cannot be late.",
            "",
            "Design and analysis: divide and conquer, graphs, DP, NP-completeness.",
            "Readings are from CLRS. Weights below are the published schedule.",
            "",
            "Readings",
            "Sep 3, 2026 - Read CLRS Chapter 1",
            "Sep 8, 2026 - Read CLRS Chapter 2",
            "Sep 15, 2026 - Read CLRS Chapter 4",
            "Sep 22, 2026 - Read CLRS Chapter 6",
            "Oct 1, 2026 - Read CLRS Chapter 15",
            "Oct 20, 2026 - Read CLRS Chapter 22",
            "Nov 19, 2026 - Read CLRS Chapter 34",
            "",
            "Labs and quizzes",
            "Sep 17, 2026 - Quiz 1 4:30 PM, Gates 214 (5%)",
            "Oct 3, 2026 - Lab 1: sorting runtime due 11:59 PM (5%)",
            "Nov 12, 2026 - Quiz 2 4:30 PM, Gates 214 (5%)",
            "Nov 24, 2026 - Lab 2: shortest paths due 11:59 PM (5%)",
            "",
            "Problem sets and exams",
            "Sep 10, 2026 - Problem Set 1 due 11:59 PM (5%)",
            "Sep 24, 2026 - Problem Set 2 due 11:59 PM (5%)",
            "Oct 8, 2026 - Problem Set 3 due 11:59 PM (5%)",
            "Oct 12, 2026 - Midterm exam 9:00 AM, Gates 214 (25%)",
            "Oct 22, 2026 - Problem Set 4 due 11:59 PM (5%)",
            "Nov 5, 2026 - Problem Set 5 due 11:59 PM (5%)",
            "Dec 3, 2026 - Problem Set 6 due 11:59 PM (5%)",
            "Dec 10, 2026 - Final exam 9:00 AM, Gates 214 (30%)",
        ],
    ),
    (
        "ECON210-Microeconomics",
        "ECON 210 Microeconomics",
        [
            "ECON 210 - Microeconomics",
            "Fall 2026  |  Economics",
            "Instructor: Prof. Alvarez (alvarez@university.edu)",
            "Office hours: Wednesday 1:00-2:00 PM",
            "Late policy: No late work accepted without prior notice.",
            "",
            "Consumer choice, firms, market structure, and policy. Come to section",
            "having done the reading. The policy memo is the flexible item if a week",
            "piles up with other majors.",
            "",
            "Readings",
            "Sep 4, 2026 - Chapter 3 reading",
            "Sep 11, 2026 - Chapter 6 reading",
            "Sep 25, 2026 - Chapter 8 reading",
            "Oct 21, 2026 - Chapter 12 reading",
            "Nov 13, 2026 - Chapter 16 reading",
            "",
            "Quizzes and problem sets",
            "Sep 9, 2026 - Problem set 1 due 5:00 PM (8%)",
            "Sep 16, 2026 - Quiz 1 1:00 PM, Hall 110 (5%)",
            "Sep 18, 2026 - Problem set 2 due 5:00 PM (8%)",
            "Oct 2, 2026 - Quiz 2 1:00 PM, Hall 110 (5%)",
            "Oct 7, 2026 - Problem set 3 due 5:00 PM (8%)",
            "Oct 28, 2026 - Problem set 4 due 5:00 PM (8%)",
            "Nov 6, 2026 - Quiz 3 1:00 PM, Hall 110 (5%)",
            "Dec 2, 2026 - Problem set 5 due 5:00 PM (8%)",
            "",
            "Majors",
            "Oct 13, 2026 - Midterm exam 2:00 PM, Hall 110 (25%)",
            "Nov 20, 2026 - Policy memo due 11:59 PM (15%)",
            "Dec 12, 2026 - Final exam 1:00 PM, Hall 110 (25%)",
        ],
    ),
    (
        "PHIL160-Ethics",
        "PHIL 160 Ethics and Technology",
        [
            "PHIL 160 - Ethics & Technology",
            "Fall 2026  |  Philosophy",
            "Professor: Dr. Morgan (morgan@university.edu)",
            "Office hours: Thursday 11:00 AM-12:00 PM",
            "Late policy: One 48-hour grace window per term; after that, 5% per day.",
            "",
            "Writing-heavy seminar on ethics, computing, and responsibility.",
            "Papers must use course readings. A paper is the flexible item in a",
            "pileup, not an in-class exam.",
            "",
            "Readings",
            "Sep 5, 2026 - Reading: Chapter 1",
            "Sep 19, 2026 - Reading: Chapter 3",
            "Sep 26, 2026 - Reading: Chapters 4-5",
            "Oct 10, 2026 - Reading: Chapter 7",
            "Oct 31, 2026 - Reading: Chapter 9",
            "Nov 21, 2026 - Reading: Chapter 12",
            "",
            "Posts and papers",
            "Sep 10, 2026 - Discussion post 1 due 11:59 PM (3%)",
            "Sep 12, 2026 - Response paper 1 due 5:00 PM (8%)",
            "Oct 3, 2026 - Response paper 2 due 5:00 PM (8%)",
            "Oct 17, 2026 - Discussion post 2 due 11:59 PM (3%)",
            "Oct 20, 2026 - Midterm paper due 5:00 PM (20%)",
            "Nov 7, 2026 - Response paper 3 due 5:00 PM (8%)",
            "Nov 14, 2026 - Presentation (15%)",
            "Dec 1, 2026 - Workshop draft due 5:00 PM (5%)",
            "Dec 8, 2026 - Final paper due 5:00 PM (25%)",
        ],
    ),
    (
        "DES220-Interaction-Design",
        "DES 220 Interaction Design",
        [
            "DES 220 - Interaction Design",
            "Fall 2026  |  Design",
            "Professor: Prof. Davis (davis@university.edu)",
            "Office hours: Friday 2:00-3:30 PM, Studio B",
            "Late policy: Studio critiques cannot be late; project work loses a letter step per day.",
            "",
            "Studio course. Research, prototype, test, and ship a small interaction.",
            "Critiques are in person. The October project is a major deadline and",
            "often collides with midterms in other classes.",
            "",
            "Studio days",
            "Sep 9, 2026 - Critique 1, Studio B",
            "Sep 30, 2026 - Critique 2, Studio B",
            "Oct 21, 2026 - Critique 3, Studio B",
            "Nov 4, 2026 - Critique 4, Studio B",
            "Dec 2, 2026 - Critique 5, Studio B",
            "",
            "Deliverables",
            "Sep 4, 2026 - Sketch assignment due 6:00 PM (5%)",
            "Sep 16, 2026 - Interview notes due 6:00 PM (5%)",
            "Sep 23, 2026 - Research memo due 6:00 PM (10%)",
            "Oct 7, 2026 - Prototype checkpoint due 6:00 PM (10%)",
            "Oct 13, 2026 - Interaction design project due 11:59 PM (25%)",
            "Oct 28, 2026 - Protocol memo due 6:00 PM (5%)",
            "Nov 11, 2026 - Usability report due 11:59 PM (15%)",
            "Nov 18, 2026 - Revision memo due 6:00 PM (5%)",
            "Dec 4, 2026 - Final portfolio due 11:59 PM, Studio B (20%)",
        ],
    ),
]


def pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def chunk_pages(lines: list[str], first_cap: int = 38, next_cap: int = 42) -> list[list[str]]:
    pages: list[list[str]] = []
    remaining = list(lines)
    cap = first_cap
    while remaining:
        take = remaining[:cap]
        remaining = remaining[cap:]
        if remaining and take and take[-1] != "":
            # Prefer a section break if we sliced mid-block.
            for i in range(len(take) - 1, max(len(take) - 8, 0), -1):
                if take[i] == "":
                    remaining = take[i + 1 :] + remaining
                    take = take[: i + 1]
                    break
        pages.append(take)
        cap = next_cap
    return pages


def page_stream(lines: list[str], first: bool) -> bytes:
    y = 720 if first else 740
    commands = ["BT", f"1 0 0 1 72 {y} Tm", "16 TL"]
    if first:
        commands += ["/F2 16 Tf", f"({pdf_escape(lines[0])}) Tj", "T*", "/F1 10 Tf"]
        body = lines[1:]
        if body:
            commands += [f"({pdf_escape(body[0])}) Tj", "T*", "/F1 11 Tf"]
            body = body[1:]
    else:
        commands += ["/F1 11 Tf"]
        body = lines
    for line in body:
        if line == "":
            commands.append("T*")
            continue
        commands.append(f"({pdf_escape(line)}) Tj")
        commands.append("T*")
    commands.append("ET")
    return "\n".join(commands).encode("latin-1", "replace")


def build_pdf(title: str, lines: list[str]) -> bytes:
    pages = chunk_pages(lines)
    page_streams = [page_stream(page, index == 0) for index, page in enumerate(pages)]

    objects: list[bytes] = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    ]

    page_ids = list(range(3, 3 + len(pages)))
    content_ids = list(range(3 + len(pages), 3 + 2 * len(pages)))
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects.append(
        f"2 0 obj << /Type /Pages /Kids [{kids}] /Count {len(pages)} >> endobj\n".encode("latin-1")
    )

    font_a = 3 + 2 * len(pages)
    font_b = font_a + 1
    info_id = font_b + 1

    for page_id, content_id in zip(page_ids, content_ids):
        objects.append(
            (
                f"{page_id} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                f"/Contents {content_id} 0 R /Resources << /Font << /F1 {font_a} 0 R /F2 {font_b} 0 R >> >> "
                f">> endobj\n"
            ).encode("latin-1")
        )

    for content_id, stream in zip(content_ids, page_streams):
        objects.append(
            f"{content_id} 0 obj << /Length {len(stream)} >> stream\n".encode("latin-1")
            + stream
            + b"\nendstream\nendobj\n"
        )

    objects.append(
        f"{font_a} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n".encode("latin-1")
    )
    objects.append(
        f"{font_b} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n".encode("latin-1")
    )
    objects.append(
        f"{info_id} 0 obj << /Title ({pdf_escape(title)}) /Creator (Termwise) >> endobj\n".encode("latin-1")
    )

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = b""
    offsets = [0]
    cursor = len(header)
    for chunk in objects:
        offsets.append(cursor)
        body += chunk
        cursor += len(chunk)

    xref = [f"xref\n0 {len(offsets)}\n0000000000 65535 f \n"]
    for offset in offsets[1:]:
        xref.append(f"{offset:010d} 00000 n \n")
    trailer = (
        f"trailer << /Size {len(offsets)} /Root 1 0 R /Info {info_id} 0 R >>\n"
        f"startxref\n{cursor}\n%%EOF\n"
    )
    return header + body + "".join(xref).encode("latin-1") + trailer.encode("latin-1")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for stem, title, lines in SYLLABI:
        pdf_path = OUT / f"{stem}.pdf"
        txt_path = OUT / f"{stem}.txt"
        pdf_path.write_bytes(build_pdf(title, lines))
        txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"wrote {pdf_path.name} ({pdf_path.stat().st_size} bytes) and {txt_path.name}")


if __name__ == "__main__":
    main()
