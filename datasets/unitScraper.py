"""
Monash Handbook - Unit Scraper v2
==================================
Automatically discovers all IT & Engineering units by parsing the Monash
Handbook sitemap, then scrapes each unit page for full details.
Saves results to units2.csv.

Unit prefixes:
  IT          : FIT, ITO
  Engineering : ENG, CIV, CHE, ECE, MEC, MAE, ENE, ENV, ETC, MTE

Usage:
    python unit2.py                # scrapes current year
    python unit2.py --year 2025

Requirements:
    pip install requests
"""

import requests
import json
import re
import csv
import argparse
from datetime import datetime

# ─────────────────────────── CONFIG ───────────────────────────
BASE_URL     = "https://handbook.monash.edu"
DEFAULT_YEAR = str(datetime.now().year)

FACULTY_PREFIXES = {
    "IT":          {"FIT", "MTH"},
    "ENG": {"ENG"}
}

# Flat lookup: prefix → faculty name
PREFIX_TO_FACULTY = {
    p: faculty
    for faculty, prefixes in FACULTY_PREFIXES.items()
    for p in prefixes
}

ALL_PREFIXES = set(PREFIX_TO_FACULTY)

HEADERS = {"User-Agent": "Mozilla/5.0 (MonashHandbookScraper/2.0)"}


# ──────────────────── SITEMAP DISCOVERY ───────────────────────
def discover_unit_codes(year: str) -> list[tuple[str, str]]:
    """
    Walk the sitemap index and extract every unit code for `year` whose
    3-letter prefix belongs to IT or Engineering.

    Returns a sorted list of (unit_code, faculty) tuples.
    """
    print(f"[1/3] Discovering units for {year} from sitemap ...")

    try:
        index_resp = requests.get(f"{BASE_URL}/sitemap.xml", headers=HEADERS, timeout=15)
        index_resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  [ERROR] Could not fetch sitemap index: {e}")
        return []

    sitemap_urls = re.findall(r"<loc>(.*?)</loc>", index_resp.text)
    print(f"  Found {len(sitemap_urls)} sitemap file(s) in index.")

    seen    = set()
    records = []

    for sm_url in sitemap_urls:
        try:
            resp = requests.get(sm_url, headers=HEADERS, timeout=15)
            if not resp.ok:
                continue
        except requests.RequestException:
            continue

        for url in re.findall(r"<loc>(.*?)</loc>", resp.text):
            if f"/{year}/units/" not in url:
                continue
            code = url.split("/units/")[-1].upper().strip("/")
            if not code or code in seen:
                continue
            prefix = code[:3]
            if prefix not in ALL_PREFIXES:
                continue
            seen.add(code)
            records.append((code, PREFIX_TO_FACULTY[prefix]))

    records.sort()
    it_count  = sum(1 for _, f in records if f == "IT")
    eng_count = len(records) - it_count
    print(f"  Found {it_count} IT units, {eng_count} Engineering units "
          f"({len(records)} total)")
    return records


# ─────────────────────── PAGE FETCHER ─────────────────────────
def fetch_page_data(url: str) -> dict | None:
    """Fetch a handbook page and return its embedded __NEXT_DATA__ JSON blob."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  [ERROR] {url}: {e}")
        return None

    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">([\s\S]*?)</script>',
        resp.text,
    )
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def get_page_content(url: str) -> dict | None:
    data = fetch_page_data(url)
    if not data:
        return None
    try:
        return data["props"]["pageProps"]["pageContent"]
    except (KeyError, TypeError):
        return None


# ──────────────────── REQUISITE PARSER ────────────────────────
def _render_container(container: dict) -> str:
    """
    Recursively render one container node into a bracketed expression.

    The handbook encodes AND/OR on the *parent_connector* field of each
    container, which tells how to join that container's own children.
    Default when the field is absent is AND (as stated in the handbook UI).

    Brackets are added around a child group only when it contains more than
    one item, so single-unit groups stay uncluttered.

    Example result: (FIT1054;FIT2085;FIT1008)&(MAT1830;FIT1058)
    """
    connector = container.get("parent_connector", {})
    op = (connector.get("value", "AND") if isinstance(connector, dict) else "AND").upper()
    sep = ";" if op == "OR" else "&"

    nested = container.get("containers", [])
    rels   = container.get("relationships", [])

    if nested:
        parts = []
        for child in nested:
            expr = _render_container(child)
            if not expr:
                continue
            # Wrap in brackets when the child itself expands to multiple items
            child_items = child.get("containers") or child.get("relationships") or []
            if len(child_items) > 1:
                expr = f"({expr})"
            parts.append(expr)
    elif rels:
        parts = [r.get("academic_item_code", "") for r in rels if r.get("academic_item_code")]
    else:
        return ""

    return sep.join(p for p in parts if p)


def parse_requisites(requisites: list) -> tuple[str, str, str]:
    """Return (prerequisites, corequisites, prohibitions) as formatted strings.

    Format:
      ;  separates OR alternatives   e.g. FIT1008;FIT1054
      &  separates AND requirements  e.g. (FIT1008;FIT1054)&(MAT1830;FIT1058)
      () groups a set of OR/AND alternatives when there are multiple items
    """
    prereqs, coreqs, prohibs = [], [], []

    for req in requisites:
        req_type = req.get("requisite_type", {}).get("value", "")
        top_containers = req.get("container", [])
        if not top_containers:
            continue

        # Render each top-level container and AND them together
        parts = [_render_container(c) for c in top_containers]
        parts = [p for p in parts if p]
        if not parts:
            continue

        if len(parts) == 1:
            combined = parts[0]
        else:
            combined = "&".join(f"({p})" if (";" in p or "&" in p) else p for p in parts)

        if req_type == "prerequisite":
            prereqs.append(combined)
        elif req_type == "corequisite":
            coreqs.append(combined)
        elif req_type == "prohibition":
            prohibs.append(combined)

    return "&".join(prereqs), "&".join(coreqs), "&".join(prohibs)


# ──────────────────── UNIT PAGE SCRAPER ───────────────────────
def scrape_unit(unit_code: str, faculty: str, year: str, index: int, total: int) -> dict:
    """Fetch a unit page and return a structured dict of its details."""
    print(f"  [{index:>4}/{total}] {unit_code} ...", end=" ", flush=True)

    url = f"{BASE_URL}/{year}/units/{unit_code}"
    pc  = get_page_content(url)

    if not pc:
        print("FAILED")
        return {}

    title      = pc.get("title", unit_code)
    credit_pts = str(pc.get("credit_points", "6"))
    school     = pc.get("school",    {}).get("value", "") if isinstance(pc.get("school"),    dict) else ""
    subclass   = pc.get("subclass",  {}).get("label", "") if isinstance(pc.get("subclass"),  dict) else ""
    synopsis   = re.sub(r"<[^>]+>", "", pc.get("handbook_synopsis", "") or "").strip()
    impl_year  = pc.get("implementation_year", year)

    campuses, periods = [], []
    for offering in pc.get("unit_offering", []):
        loc = offering.get("location",        {}).get("value", "")
        tp  = offering.get("teaching_period", {}).get("value", "")
        if loc and loc not in campuses:
            campuses.append(loc)
        if tp  and tp  not in periods:
            periods.append(tp)

    prereqs, coreqs, prohibs = parse_requisites(pc.get("requisites", []))

    print(f"-> {title}")
    return {
        "unit_code":        unit_code,
        "title":            title,
        "year":             impl_year,
        "credit_points":    credit_pts,
        "faculty":          faculty,
        "subclass":         subclass,
        "school":           school,
        "campuses":         "; ".join(campuses),
        "teaching_periods": "; ".join(periods),
        "prerequisites":    prereqs,
        "corequisites":     coreqs,
        "prohibitions":     prohibs,
        "synopsis":         synopsis,
    }


# ───────────────────── SAVE CSV ───────────────────────────────
def save_csv(rows: list[dict], filename: str = "units2.csv"):
    rows = [r for r in rows if r]

    fieldnames = [
        "unit_code", "title", "year", "credit_points", "faculty",
        "subclass", "school", "campuses", "teaching_periods",
        "prerequisites", "corequisites", "prohibitions", "synopsis",
    ]

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nSaved {len(rows)} rows to {filename}")


# ────────────────────────── CLI ───────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Scrape Monash Handbook units for Faculty of IT and Engineering"
    )
    parser.add_argument("--year", "-y", default=DEFAULT_YEAR,
                        help=f"Handbook year (default: {DEFAULT_YEAR})")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Monash Unit Scraper v2  |  Year: {args.year}")
    print(f"{'='*60}\n")

    # Step 1: discover codes via sitemap
    units = discover_unit_codes(args.year)
    if not units:
        print("No units found — check year or network connection.")
        return

    # Step 2: scrape each unit page
    total = len(units)
    print(f"\n[2/3] Scraping {total} unit pages ...")
    results = [
        scrape_unit(code, faculty, args.year, i, total)
        for i, (code, faculty) in enumerate(units, 1)
    ]

    # Step 3: save
    print(f"\n[3/3] Saving results ...")
    save_csv(results)


if __name__ == "__main__":
    main()
