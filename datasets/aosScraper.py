"""
Monash Handbook - Area of Study (AOS) Scraper v2
=================================================
Scrapes AOS codes from the Faculty of IT and Engineering, classifying
each as Major, Minor, or Specialisation.

Usage:
    python aos2.py                    # scrapes AOS_LIST for current year
    python aos2.py --year 2025
    python aos2.py --no-unit-details  # skip per-unit fetching (faster)

Requirements:
    pip install requests
"""

import requests
import json
import re
import csv
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# ─────────────────────────── CONFIG ───────────────────────────
BASE_URL     = "https://handbook.monash.edu"
SITEMAP_URL  = "https://handbook.monash.edu/sitemap/sitemap-1772935646162-1.xml"
DEFAULT_YEAR = str(datetime.now().year)
DISCOVERY_WORKERS = 20  # parallel threads for AOS faculty discovery

TARGET_FACULTIES = {
    "Faculty of Information Technology",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (MonashHandbookScraper/2.0)",
}


# ────────────────── AOS DISCOVERY ────────────────────────────
def _check_aos_faculty(code: str, year: str) -> str | None:
    """Fetch one AOS page and return its code if it belongs to a target faculty."""
    url = f"{BASE_URL}/{year}/aos/{code}"
    data, _ = fetch_page_data(url)
    if not data:
        return None
    try:
        pc = data["props"]["pageProps"]["pageContent"]
        faculty = pc.get("school", {}).get("value", "")
        return code if faculty in TARGET_FACULTIES else None
    except (KeyError, TypeError):
        return None


def discover_aos_codes(year: str) -> list[str]:
    """
    Discover all AOS codes for the target faculties by:
      1. Parsing the handbook sitemap for all AOS codes in the given year.
      2. Parallel-fetching each AOS page to check its faculty.
    """
    print(f"[Discovery] Fetching sitemap ...")
    try:
        resp = requests.get(SITEMAP_URL, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  [ERROR] Could not fetch sitemap: {e}")
        return []

    all_urls = re.findall(r"<loc>([^<]+/aos/[^<]+)</loc>", resp.text)
    year_urls = [u for u in all_urls if f"/{year}/" in u]
    all_codes = [u.split("/aos/")[-1].upper() for u in year_urls]
    print(f"[Discovery] {len(all_codes)} AOS codes found for {year}, checking faculties ...")

    matched: list[str] = []
    with ThreadPoolExecutor(max_workers=DISCOVERY_WORKERS) as pool:
        futures = {pool.submit(_check_aos_faculty, code, year): code for code in all_codes}
        done = 0
        for future in as_completed(futures):
            done += 1
            result = future.result()
            if result:
                matched.append(result)
            if done % 50 == 0 or done == len(all_codes):
                print(f"  {done}/{len(all_codes)} checked, {len(matched)} matched so far ...")

    matched.sort()
    print(f"[Discovery] Found {len(matched)} IT & Engineering AOS codes.")
    return matched


# ─────────────────── AOS TYPE CLASSIFIER ─────────────────────
def classify_aos_type(subclass: str) -> str:
    """
    Map a handbook subclass label to one of: Major, Minor, Specialisation.
    Falls back to the raw subclass value if no match is found.
    """
    s = subclass.lower()
    if "major" in s:
        return "Major"
    if "minor" in s:
        return "Minor"
    if "special" in s:
        return "Specialisation"
    return subclass  # preserve original if unrecognised


# ─────────────────────── PAGE FETCHER ─────────────────────────
def fetch_page_data(url: str) -> tuple[dict | None, int]:
    """Fetch a handbook page and extract the embedded JSON data. Returns (data, http_status)."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
    except requests.RequestException as e:
        print(f"  [ERROR] Failed to fetch {url}: {e}")
        return None, 0

    if resp.status_code == 404:
        return None, 404

    if not resp.ok:
        print(f"  [ERROR] HTTP {resp.status_code} for {url}")
        return None, resp.status_code

    scripts = re.findall(r"<script[^>]*>(.*?)</script>", resp.text, re.DOTALL)
    for script in scripts:
        script = script.strip()
        if script and "pageContent" in script:
            try:
                return json.loads(script), 200
            except json.JSONDecodeError:
                continue

    print(f"  [ERROR] Could not find page data in {url}")
    return None, 200


def get_page_content(url: str) -> tuple[dict | None, int]:
    """Return (pageContent dict, http_status) from a handbook page."""
    data, status = fetch_page_data(url)
    if not data:
        return None, status
    try:
        return data["props"]["pageProps"]["pageContent"], status
    except (KeyError, TypeError):
        print("  [ERROR] Unexpected page structure.")
        return None, status


# ─────────────────── UNIT DETAIL FETCH ───────────────────────
def fetch_unit_details(unit_code: str, year: str) -> dict:
    """Fetch a unit's name, credit points, and offerings from its page."""
    url = f"{BASE_URL}/{year}/units/{unit_code}"
    pc, _ = get_page_content(url)

    if not pc:
        return {
            "code": unit_code,
            "credit_points": "",
        }

    return {
        "code":          unit_code,
        "credit_points": str(pc.get("credit_points", "6")),
    }


# ────────────────── MAIN SCRAPER ──────────────────────────────
def scrape_aos(aos_code: str, year: str, fetch_units: bool = True) -> dict:
    """
    Fetch an AOS page and all its units.
    Returns a structured dict with title, type, credit requirements, and unit groups.
    """
    print(f"\n{'='*60}")
    print(f"  AOS Code : {aos_code}  |  Year: {year}")
    print(f"{'='*60}")

    # ── 1. Fetch the AOS page ────────────────────────────────
    print(f"[1/3] Fetching AOS page ...")
    url = f"{BASE_URL}/{year}/aos/{aos_code}"
    pc, _  = get_page_content(url)

    if not pc:
        print("  Failed to load the AOS page.")
        return {}

    title        = pc.get("title", aos_code)
    credit_total = pc.get("credit_points", "?")
    description  = pc.get("handbook_description", "")
    impl_year    = pc.get("implementation_year", year)
    subclass     = pc.get("subclass", {}).get("label", "Unknown")
    study_level  = pc.get("study_level", {}).get("label", "Unknown")
    aos_type     = classify_aos_type(subclass)

    print(f"  Title      : {title} ({impl_year})")
    print(f"  Type       : {aos_type}")
    print(f"  Credit pts : {credit_total}")

    # ── 2. Parse curriculum structure ────────────────────────
    print(f"[2/3] Parsing unit requirements ...")
    groups = []
    cs         = pc.get("curriculumStructure", {})
    containers = cs.get("container", [])

    for container in containers:
        label      = container.get("title", "Requirement")
        credit_req = container.get("credit_points", "?")
        unit_codes = []

        for rel in container.get("relationship", []):
            code = rel.get("academic_item_code", "")
            if code:
                unit_codes.append(code.strip())

        groups.append({
            "label":      label,
            "credit_req": str(credit_req) if credit_req else "?",
            "unit_codes": unit_codes,
            "units":      [],
        })

    total_codes = sum(len(g["unit_codes"]) for g in groups)
    print(f"  {len(groups)} group(s), {total_codes} unit code(s) found.")

    # ── 3. Fetch unit details ────────────────────────────────
    if fetch_units and total_codes > 0:
        print(f"[3/3] Fetching details for {total_codes} unit(s) ...")
        all_codes  = [c for g in groups for c in g["unit_codes"]]
        seen       = set()
        unique     = [c for c in all_codes if not (c in seen or seen.add(c))]

        unit_cache = {}
        for i, code in enumerate(unique, 1):
            print(f"  [{i}/{len(unique)}] {code} ...", end=" ", flush=True)
            unit_cache[code] = fetch_unit_details(code, year)
            print(f"-> {unit_cache[code]['credit_points']} cp")

        for g in groups:
            g["units"] = [unit_cache[c] for c in g["unit_codes"] if c in unit_cache]
    else:
        print("[3/3] Skipping unit detail fetch.")

    return {
        "aos_code":     aos_code,
        "title":        title,
        "year":         impl_year,
        "credit_total": str(credit_total),
        "aos_type":     aos_type,
        "study_level":  study_level,
        "description":  description,
        "groups":       groups,
    }


# ─────────────────── DISPLAY RESULTS ──────────────────────────
def print_results(data: dict):
    if not data:
        return

    print(f"\n{'='*60}")
    print(f"  RESULTS: {data['title']}")
    print(f"  Code: {data['aos_code']}  |  Year: {data['year']}")
    print(f"  Type: {data['aos_type']}")
    print(f"  Total credit points: {data['credit_total']}")
    print(f"{'='*60}")

    groups = data.get("groups", [])
    if not groups:
        print(f"\n  No unit groups found.")
        print(f"  -> Visit: {BASE_URL}/{data['year']}/aos/{data['aos_code']}")
        return

    for g in groups:
        cp_label = f"({g['credit_req']} cp)" if g["credit_req"] != "?" else ""
        print(f"\n  +- {g['label']} {cp_label}")
        if g["units"]:
            for u in g["units"]:
                print(f"  |  {u['code']:10}  {u['credit_points']} cp")
        elif g["unit_codes"]:
            for code in g["unit_codes"]:
                print(f"  |  {code}")
        else:
            print("  |  (No specific units listed)")
        print(f"  +{'-'*55}")

    total_units = sum(len(g["units"] or g["unit_codes"]) for g in groups)
    print(f"\n  Total units listed: {total_units}")
    print(f"  Full page: {BASE_URL}/{data['year']}/aos/{data['aos_code']}\n")


# ─────────────────────── CSV EXPORT ───────────────────────────
def save_csv(all_results: list[dict], filename: str = "aos2.csv"):
    """Write all AOS results to a flat CSV file, including aos_type."""
    rows = []
    for data in all_results:
        if not data:
            continue
        for g in data.get("groups", []):
            label = g["label"].strip()
            if label.startswith("Part ") or label.startswith("Studying"):
                continue
            units = g.get("units") or [
                {
                    "code": c,
                    "credit_points": "",
                }
                for c in g["unit_codes"]
            ]
            for u in units:
                rows.append({
                    "aos_code":     data["aos_code"],
                    "aos_title":    data["title"],
                    "aos_type":     data.get("aos_type", ""),
                    "study_level":  data.get("study_level", ""),
                    "year":         data["year"],
                    "group":        g["label"],
                    "group_cp_req": g["credit_req"],
                    "unit_code":    u["code"],
                    "unit_cp":      u.get("credit_points", ""),
                })

    fieldnames = [
        "aos_code", "aos_title", "aos_type", "study_level", "year",
        "group", "group_cp_req", "unit_code", "unit_cp",
    ]

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nSaved {len(rows)} rows to {filename}")


# ────────────────────────── CLI ───────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Scrape Monash Handbook AOS (Faculty of IT & Engineering)"
    )
    parser.add_argument(
        "--year", "-y",
        default=DEFAULT_YEAR,
        help=f"Handbook year (default: {DEFAULT_YEAR})",
    )
    parser.add_argument(
        "--no-unit-details",
        action="store_true",
        help="Skip fetching individual unit details (faster)",
    )
    args = parser.parse_args()

    aos_list = discover_aos_codes(args.year)
    if not aos_list:
        print("No AOS codes found. Exiting.")
        return

    all_results = []
    for aos_code in aos_list:
        result = scrape_aos(
            aos_code=aos_code.upper(),
            year=args.year,
            fetch_units=not args.no_unit_details,
        )
        print_results(result)
        all_results.append(result)

    save_csv(all_results)


if __name__ == "__main__":
    main()
