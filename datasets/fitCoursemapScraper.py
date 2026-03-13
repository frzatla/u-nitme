"""
newCourseScraper.py
===================
Scrapes 2026 undergraduate single-degree course maps from:
  - Faculty of IT (FIT): https://www.monash.edu/it/current-students/enrolment/course-maps-and-handbooks

Rules:
  - Undergraduate + single degree only (C2000, C2001, C3001)

Output:
  - fit/   one JSON per course map

Usage:
    python newCourseScraper.py
    python newCourseScraper.py --year 2025
"""

import re
import json
import io
import sys
import os
import csv
import argparse

import requests
import pdfplumber

sys.stdout.reconfigure(encoding="utf-8")

# ─────────────────────────── CONFIG ───────────────────────────
DEFAULT_YEAR = "2026"

FIT_URL = "https://www.monash.edu/it/current-students/enrolment/course-maps-and-handbooks"
OUTPUT_DIR = "fit"
DISCIPLINE_CSV_DIR = "discipline_electives"

HEADERS = {"User-Agent": "Mozilla/5.0 (MonashCourseMapScraper/2.0)"}
UNIT_CODE_RE = re.compile(r"^([A-Z]{2,4}\d{4})(\*?)")

# FIT: only these course codes represent single undergrad degrees
FIT_ALLOWED_CODES = {"C2000", "C2001", "C3001"}


# ──────────────────── YEAR-IN-URL CHECK ───────────────────────
def url_contains_year(href: str, year: str) -> bool:
    filename = href.rsplit("/", 1)[-1]
    return bool(re.search(rf'(?<![A-Za-z\d]){re.escape(year)}(?![A-Za-z\d])', filename))


# ──────────────────── PDF URL DISCOVERY ───────────────────────
def discover_pdf_urls(year: str) -> list[dict]:
    resp = requests.get(FIT_URL, headers=HEADERS, timeout=15)
    resp.raise_for_status()

    anchors = re.findall(r'<a\s[^>]*href="([^"]+\.pdf)"[^>]*>(.*?)</a>', resp.text, re.S)

    results = []
    seen = set()

    for href, raw_label in anchors:
        if not url_contains_year(href, year):
            continue

        url = href if href.startswith("http") else "https://www.monash.edu" + href
        if url in seen:
            continue
        seen.add(url)

        label = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", raw_label)).strip()
        label = label.replace("&ndash;", "–").replace("&amp;", "&")

        if not _is_fit_single_undergrad(url):
            continue

        results.append({"label": label, "url": url})

    return results


def _is_fit_single_undergrad(url: str) -> bool:
    """Return True only for FIT single undergrad degree PDFs (C2000/C2001/C3001, no doubles)."""
    if "doubles" in url.lower():
        return False
    filename = url.rsplit("/", 1)[-1].upper()
    for code in FIT_ALLOWED_CODES:
        if code in filename:
            return True
    return False


# ─────────────────────── PDF HELPERS ──────────────────────────
def clean(cell) -> str:
    return re.sub(r"\s+", " ", (cell or "").replace("\n", " ")).strip()


def parse_unit_cell(text: str) -> dict | None:
    text = text.strip()
    m = UNIT_CODE_RE.match(text)
    if m:
        code = m.group(1)
        name = text[m.end():].strip().lstrip("*").strip()
        return {"unit_code": code, "unit_name": name, "type": "required"}
    if re.search(r"\belective\b", text, re.I):
        # Level 4/5 faculty elective
        if re.search(r"\blevel\s*4[/\\]?5\b", text, re.I):
            return {"unit_code": "Faculty Elective", "unit_name": text, "type": "level 4/5 faculty elective"}
        # Discipline approved elective
        if re.search(r"\bdiscipline\b", text, re.I):
            return {"unit_code": "Discipline Elective", "unit_name": text, "type": "discipline_elective"}
        # Generic elective
        return {"unit_code": "Elective", "unit_name": "", "type": "elective"}
    return None


def find_slot_column(row: list, min_col: int, max_col: int):
    for c in range(min_col, min(max_col + 1, len(row))):
        cell = clean(row[c])
        if not cell:
            continue
        unit = parse_unit_cell(cell)
        if unit:
            return c, unit
    return None, None


def detect_slot_ranges(table: list) -> list[tuple[int, int]]:
    for row in table[1:]:
        hits = []
        for c, cell in enumerate(row):
            if parse_unit_cell(clean(cell)):
                hits.append(c)
        if len(hits) >= 2:
            ranges = []
            for i, col in enumerate(hits):
                lo = (hits[i - 1] + col) // 2 + 1 if i > 0 else max(0, col - 2)
                hi = (col + hits[i + 1]) // 2 if i < len(hits) - 1 else col + 2
                ranges.append((lo, hi))
            if len(ranges) >= 2:
                return ranges
    return [(3, 3), (4, 6), (7, 9), (10, 10)]  # Monash PDF fallback


def _extract_code_from_url(url: str) -> str:
    filename = url.rsplit("/", 1)[-1].upper()
    m = re.search(r"[-/]([A-Z]\d{4})[-/.]", filename)
    if m:
        return m.group(1)
    return ""


# ──────────────────── PDF PARSER ──────────────────────────────
def parse_pdf(pdf_bytes: bytes, label: str, pdf_url: str) -> dict | None:
    try:
        pdf = pdfplumber.open(io.BytesIO(pdf_bytes))
        pages = pdf.pages
    except Exception as e:
        print(f"    [ERROR] Cannot open PDF: {e}")
        return None

    all_semesters = []
    notes = {}
    ibl_note = ""
    course_code = ""
    course_name = ""
    major = ""
    map_year = ""

    for page_idx, page in enumerate(pages):
        try:
            tables = page.extract_tables()
        except Exception:
            continue
        if not tables:
            continue

        table = tables[0]
        slot_ranges = detect_slot_ranges(table)

        # ── Header (first page only) ─────────────────────────────
        if page_idx == 0 and table and table[0]:
            raw_header = table[0][0] or ""
            header = clean(raw_header)

            m_code = re.search(r"\(([A-Z]\d{4})\)", header)
            m_year = re.search(r"\)\s*(20\d{2})\b", header)
            if not m_year:
                m_year = re.search(r"\b(20\d{2})\b", header)
            if m_code:
                course_code = m_code.group(1)
            if m_year:
                map_year = m_year.group(1)
            course_name = re.sub(r"\s*\(.*", "", header).strip()

            m_major = re.search(r"\d{4}\n(.+)", raw_header)
            if m_major:
                major = m_major.group(1).strip()
            else:
                major = label

        # ── Body ─────────────────────────────────────────────────
        current_year = None
        current_sem = None
        in_notes = False
        note_key = None
        active_slots: list[dict | None] = [None] * len(slot_ranges)

        def commit():
            if current_year is None or current_sem is None:
                return
            slots = [
                {
                    "slot": i + 1,
                    "unit_code": s["unit_code"],
                    "unit_name": re.sub(r"\s+", " ", s["unit_name"]).strip(),
                    "type": s["type"],
                }
                for i, s in enumerate(active_slots) if s
            ]
            if slots:
                all_semesters.append({
                    "year": current_year,
                    "semester": current_sem,
                    "slots": slots,
                })

        for row in table[1:]:
            col0 = clean(row[0])
            col1 = clean(row[1]) if len(row) > 1 else ""
            col2 = clean(row[2]) if len(row) > 2 else ""

            if "Notes" in col1 or "Notes" in col0:
                commit()
                current_year = None
                in_notes = True
                continue

            if "IBL" in col1 or ("●" in col0 and not col0.startswith("Year")):
                for cell in row:
                    txt = clean(cell)
                    if len(txt) > 20:
                        ibl_note = (ibl_note + " " + txt).strip()
                continue

            if in_notes:
                if col0:
                    note_key = col0
                vals = [clean(c) for c in row[3:] if c and clean(c)]
                val = " ".join(vals).strip()
                if note_key and val:
                    notes[note_key] = (notes.get(note_key, "") + " " + val).strip()
                continue

            if col0.startswith("Year"):
                m = re.search(r"(\d)", col0)
                if m:
                    commit()
                    current_year = int(m.group(1))
                    current_sem = None
                    active_slots = [None] * len(slot_ranges)

            sem_text = col2 if "Semester" in col2 else col0
            if "Semester" in sem_text:
                if current_sem is not None:
                    commit()
                    active_slots = [None] * len(slot_ranges)
                current_sem = "First" if "First" in sem_text else "Second"
                for idx, (mn, mx) in enumerate(slot_ranges):
                    ci, unit = find_slot_column(row, mn, mx)
                    if unit is not None:
                        unit["col"] = ci
                        active_slots[idx] = unit

            elif current_year and current_sem:
                for slot in active_slots:
                    if slot is None:
                        continue
                    tc = slot.get("col")
                    if tc is not None and tc < len(row):
                        extra = clean(row[tc])
                        if extra and extra.lower() not in ("none", ""):
                            slot["unit_name"] = (slot["unit_name"] + " " + extra).strip()

        commit()

    if not all_semesters:
        print(f"    [WARN] No semester data extracted.")

    if not course_code:
        course_code = _extract_code_from_url(pdf_url)

    return {
        "course_code": course_code,
        "course_name": course_name,
        "major": major,
        "year": map_year,
        "pdf_url": pdf_url,
        "semesters": all_semesters,
        "notes": notes,
        "ibl_note": ibl_note,
    }


# ──────────────────── FILE NAMING ─────────────────────────────
def safe_slug(text: str, max_len: int = 60) -> str:
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "_", text)
    return text.strip("_").lower()[:max_len]


def unique_filepath(base_path: str) -> str:
    if not os.path.exists(base_path):
        return base_path
    root, ext = os.path.splitext(base_path)
    counter = 2
    while True:
        candidate = f"{root}_{counter}{ext}"
        if not os.path.exists(candidate):
            return candidate
        counter += 1


def output_filepath(parsed: dict) -> str:
    code = parsed.get("course_code") or "unknown"
    major = parsed.get("major") or "no_major"
    slug = safe_slug(major)
    base = os.path.join(OUTPUT_DIR, f"{code}-{slug}.json")
    return unique_filepath(base)


# ──────────────────── CSV EXPORT ──────────────────────────────
def write_discipline_csv(parsed: dict) -> str | None:
    """
    Write a CSV of discipline_elective slots for a single course map.
    Returns the file path written, or None if no discipline electives found.
    """
    rows = []
    for sem in parsed.get("semesters", []):
        for slot in sem.get("slots", []):
            if slot["type"] == "discipline_elective":
                rows.append({
                    "course_code": parsed["course_code"],
                    "major": parsed["major"],
                    "year_of_study": sem["year"],
                    "semester": sem["semester"],
                    "slot": slot["slot"],
                    "unit_name": slot["unit_name"],
                })
    if not rows:
        return None

    os.makedirs(DISCIPLINE_CSV_DIR, exist_ok=True)
    code = parsed.get("course_code") or "unknown"
    slug = safe_slug(parsed.get("major") or "no_major")
    fpath = os.path.join(DISCIPLINE_CSV_DIR, f"{code}-{slug}.csv")
    with open(fpath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["course_code", "major", "year_of_study", "semester", "slot", "unit_name"])
        writer.writeheader()
        writer.writerows(rows)
    return fpath


# ──────────────────── SCRAPER ──────────────────────────────────
def scrape(year: str) -> int:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"\n{'='*64}")
    print(f"  FIT  |  {FIT_URL}")
    print(f"{'='*64}")

    print(f"  Discovering {year} PDFs ...")
    entries = discover_pdf_urls(year)
    print(f"  Found {len(entries)} candidate PDF(s).\n")

    saved = 0
    for i, entry in enumerate(entries, 1):
        label = entry["label"] or f"PDF {i}"
        url = entry["url"]
        print(f"  [{i:>2}/{len(entries)}] {label}")
        print(f"         {url}")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            print(f"         Downloaded {len(resp.content):,} bytes", end=" ... ")
        except requests.RequestException as e:
            print(f"\n         [ERROR] Download failed: {e}")
            continue

        parsed = parse_pdf(resp.content, label, url)
        if parsed is None:
            print("parse failed")
            continue

        fpath = output_filepath(parsed)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(parsed, f, indent=2, ensure_ascii=False)

        sem_count = len(parsed["semesters"])
        unit_count = sum(len(s["slots"]) for s in parsed["semesters"])
        print(f"OK  ({sem_count} sems, {unit_count} units) → {fpath}")

        csv_path = write_discipline_csv(parsed)
        if csv_path:
            print(f"         Discipline electives CSV → {csv_path}")

        saved += 1

    return saved


# ────────────────────────── CLI ───────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Scrape Monash FIT 2026 course maps to JSON"
    )
    parser.add_argument("--year", "-y", default=DEFAULT_YEAR,
                        help=f"Cohort year (default: {DEFAULT_YEAR})")
    args = parser.parse_args()

    print(f"\n{'='*64}")
    print(f"  Monash Course Map Scraper  |  Year: {args.year}  |  Faculty: FIT")
    print(f"{'='*64}")

    count = scrape(args.year)

    print(f"\n{'='*64}")
    print(f"  Done.  FIT → {OUTPUT_DIR}/   ({count} maps saved)")
    print(f"{'='*64}\n")


if __name__ == "__main__":
    main()
