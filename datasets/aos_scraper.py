"""
Monash Handbook - AOS Scraper v3
=================================
Discovers ALL Areas of Study from ALL faculties via the Monash Handbook
sitemap, scrapes each AOS page, and saves all results to aosTest.json.

Output structure matches b.json:
  - requirement_groups: flat list of nodes with id/parent_id/children tree refs
  - all_units: {code: title} mapping
  - statistics: {total_requirements, total_units, max_depth}

Usage:
    python aos_scraper.py                       # scrapes current year
    python aos_scraper.py --year 2025
    python aos_scraper.py --year 2025 --output my_aos.json
"""

import requests
import json
import re
import argparse
from datetime import datetime

BASE_URL     = "https://handbook.monash.edu"
DEFAULT_YEAR = str(datetime.now().year)
HEADERS      = {"User-Agent": "Mozilla/5.0 (MonashHandbookScraper/3.0)"}


# ──────────────────── SITEMAP DISCOVERY ───────────────────────
def discover_aos_codes(year: str) -> list[str]:
    """Walk the sitemap index and return all AOS codes for `year`."""
    print(f"[1/3] Discovering all AOS for {year} ...")
    try:
        idx = requests.get(f"{BASE_URL}/sitemap.xml", headers=HEADERS, timeout=15)
        idx.raise_for_status()
    except requests.RequestException as e:
        print(f"  [ERROR] Could not fetch sitemap: {e}")
        return []

    sitemap_urls = re.findall(r"<loc>(.*?)</loc>", idx.text)
    print(f"  Found {len(sitemap_urls)} sitemap file(s).")

    seen, codes = set(), []
    for sm_url in sitemap_urls:
        try:
            resp = requests.get(sm_url, headers=HEADERS, timeout=15)
            if not resp.ok:
                continue
        except requests.RequestException:
            continue
        for url in re.findall(r"<loc>(.*?)</loc>", resp.text):
            if f"/{year}/aos/" not in url:
                continue
            code = url.split("/aos/")[-1].upper().strip("/")
            if code and code not in seen:
                seen.add(code)
                codes.append(code)

    codes.sort()
    print(f"  Found {len(codes)} AOS codes total.")
    return codes


# ─────────────────────── PAGE FETCHER ─────────────────────────
def fetch_page_content(url: str) -> dict | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  [ERROR] {url}: {e}")
        return None

    # Try __NEXT_DATA__ first
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">([\s\S]*?)</script>',
        resp.text,
    )
    if m:
        try:
            data = json.loads(m.group(1))
            return data["props"]["pageProps"]["pageContent"]
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # Fallback: any script tag containing pageContent
    for script in re.findall(r"<script[^>]*>(.*?)</script>", resp.text, re.DOTALL):
        if "pageContent" not in script:
            continue
        try:
            data = json.loads(script.strip())
            return data["props"]["pageProps"]["pageContent"]
        except (json.JSONDecodeError, KeyError, TypeError):
            continue

    return None


# ──────────────── CONTAINER TREE PARSER ───────────────────────
def _parse_containers(
    containers: list,
    parent_id: str,
    level: int,
    counter: list,        # single-element mutable counter
    groups: list,         # accumulator for flat group list
    all_units: dict,      # accumulator for {code: title}
) -> list[str]:
    """
    Recursively flatten nested handbook containers into a flat requirement_groups
    list, preserving the tree via id/parent_id/children references.
    Returns the list of child IDs created at this level.
    """
    child_ids = []

    for container in containers:
        counter[0] += 1
        node_id = f"req_{counter[0]}"
        child_ids.append(node_id)

        title = container.get("title", "Requirement") or "Requirement"

        credit_pts = container.get("credit_points")
        try:
            credit_pts = int(credit_pts) if credit_pts is not None else None
        except (ValueError, TypeError):
            credit_pts = None

        num_req = container.get("num_required")
        try:
            num_req = int(num_req) if num_req is not None else None
        except (ValueError, TypeError):
            num_req = None

        # AND / OR type from connector field
        connector = container.get("parent_connector") or container.get("connector") or {}
        if isinstance(connector, dict):
            op = connector.get("value", "AND").upper()
        else:
            op = str(connector).upper() if connector else "AND"
        group_type = "OR" if op == "OR" else "AND"

        description = (
            container.get("description") or
            container.get("handbook_description") or
            ""
        )

        # Direct unit relationships at this container level
        unit_codes = []
        for rel in container.get("relationship", []) or []:
            uc = (rel.get("academic_item_code") or "").strip()
            ut = (rel.get("academic_item_name") or rel.get("title") or "").strip()
            if uc:
                unit_codes.append(uc)
                if uc not in all_units:
                    all_units[uc] = ut

        node = {
            "id":            node_id,
            "parent_id":     parent_id,
            "type":          group_type,
            "title":         title,
            "description":   description,
            "credit_points": credit_pts,
            "num_required":  num_req,
            "units":         unit_codes,
            "children":      [],
            "level":         level,
        }
        groups.append(node)

        # Recurse into nested containers
        nested = container.get("container", []) or []
        if nested:
            sub_ids = _parse_containers(nested, node_id, level + 1, counter, groups, all_units)
            node["children"] = sub_ids

    return child_ids


# ──────────────────── AOS SCRAPER ─────────────────────────────
def scrape_aos(code: str, year: str, idx: int, total: int) -> tuple[str, dict] | None:
    print(f"  [{idx:>5}/{total}] {code} ...", end=" ", flush=True)

    pc = fetch_page_content(f"{BASE_URL}/{year}/aos/{code}")
    if not pc:
        print("FAILED")
        return None

    title = pc.get("title") or code
    print(f"-> {title}")

    credit_total = pc.get("credit_points")
    try:
        credit_total = int(credit_total) if credit_total is not None else 0
    except (ValueError, TypeError):
        credit_total = 0

    # Parse the curriculum structure
    cs         = pc.get("curriculumStructure") or {}
    containers = cs.get("container", []) or []

    groups: list     = []
    all_units: dict  = {}
    counter          = [1]   # root uses 1, children start at 2

    root_id       = "root_1"
    root_children = _parse_containers(containers, root_id, 1, counter, groups, all_units)

    root = {
        "id":            root_id,
        "parent_id":     None,
        "type":          "AND",
        "title":         f"{code} - Complete Requirements",
        "description":   f"Complete all requirements for {title}",
        "credit_points": credit_total,
        "num_required":  None,
        "units":         [],
        "children":      root_children,
        "level":         0,
    }

    all_groups = [root] + groups

    # Statistics
    unique_units = {u for g in all_groups for u in g["units"]}
    max_depth    = max((g["level"] for g in all_groups), default=0)

    return code, {
        "course_code":         code,
        "course_title":        title,
        "total_credit_points": credit_total,
        "requirement_groups":  all_groups,
        "all_units":           all_units,
        "statistics": {
            "total_requirements": len(all_groups),
            "total_units":        len(unique_units),
            "max_depth":          max_depth,
        },
    }


# ──────────────────── SAVE JSON ───────────────────────────────
def save_json(data: dict, filename: str):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"\nSaved {len(data)} AOS records to {filename}")


# ────────────────────────── CLI ───────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Scrape all Monash Handbook AOS across all faculties"
    )
    parser.add_argument("--year",   "-y", default=DEFAULT_YEAR,
                        help=f"Handbook year (default: {DEFAULT_YEAR})")
    parser.add_argument("--output", "-o", default="aosTest.json",
                        help="Output JSON filename (default: aosTest.json)")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Monash AOS Scraper v3  |  Year: {args.year}")
    print(f"{'='*60}\n")

    codes = discover_aos_codes(args.year)
    if not codes:
        print("No AOS codes found — check year or network connection.")
        return

    total = len(codes)
    print(f"\n[2/3] Scraping {total} AOS pages ...")

    all_aos = {}
    for i, code in enumerate(codes, 1):
        result = scrape_aos(code, args.year, i, total)
        if result:
            aos_code, aos_data = result
            all_aos[aos_code] = aos_data

    print(f"\n[3/3] Saving results ...")
    save_json(all_aos, args.output)


if __name__ == "__main__":
    main()
