"""
Monash Handbook - Unit Scraper v3
==================================
Discovers ALL units from ALL faculties via the Monash Handbook sitemap,
scrapes each unit page, and saves all results to a single JSON file.

Requisite format:
  &  separates AND requirements
  ;  separates OR alternatives
  () groups items
  [] empty list when no requisites
  "" empty string for empty text fields

Usage:
    python unit2.py                       # scrapes current year
    python unit2.py --year 2025
    python unit2.py --year 2025 --output all_final_units.json
"""

import requests
import json
import re
import argparse
from datetime import datetime

BASE_URL     = "https://handbook.monash.edu"
DEFAULT_YEAR = str(datetime.now().year)
HEADERS      = {"User-Agent": "Mozilla/5.0 (MonashHandbookScraper/3.0)"}

ASSESSMENT_TYPE_MAP = [
    ("exam",          "exam"),
    ("test",          "in_class_test"),
    ("quiz",          "in_class_test"),
    ("assignment",    "assignment"),
    ("project",       "assignment"),
    ("report",        "assignment"),
    ("essay",         "assignment"),
    ("presentation",  "other"),
    ("participation", "other"),
    ("portfolio",     "other"),
    ("lab",           "other"),
    ("practical",     "other"),
]


# ──────────────────── SITEMAP DISCOVERY ───────────────────────
def discover_unit_codes(year: str) -> list[str]:
    """Walk the sitemap index and return all unit codes for `year`."""
    print(f"[1/3] Discovering all units for {year} ...")
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
            if f"/{year}/units/" not in url:
                continue
            code = url.split("/units/")[-1].upper().strip("/")
            if code and code not in seen:
                seen.add(code)
                codes.append(code)

    codes.sort()
    print(f"  Found {len(codes)} units total.")
    return codes


# ─────────────────────── PAGE FETCHER ─────────────────────────
def fetch_page_content(url: str) -> dict | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  [ERROR] {url}: {e}")
        return None
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">([\s\S]*?)</script>',
        resp.text,
    )
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
        return data["props"]["pageProps"]["pageContent"]
    except (json.JSONDecodeError, KeyError, TypeError):
        return None


# ──────────────────── HELPERS ─────────────────────────────────
def _dict_str(obj) -> str:
    """Extract a string value from a dict (tries 'label' then 'value') or cast directly."""
    if obj is None:
        return ""
    if isinstance(obj, dict):
        return str(obj.get("label") or obj.get("value") or "").strip()
    return str(obj).strip()


def _extract_level(code: str) -> int:
    m = re.search(r"\d", code)
    return int(m.group()) if m else 0


def _normalize_assessment_type(name: str, type_str: str) -> str:
    combined = (name + " " + type_str).lower()
    for keyword, atype in ASSESSMENT_TYPE_MAP:
        if keyword in combined:
            return atype
    return "other"


# ──────────────────── REQUISITE PARSER ────────────────────────
def _render_container(container: dict) -> str:
    """
    Recursively render one container node into a bracketed expression.

    The handbook encodes AND/OR on the *parent_connector* field of each
    container, which tells how to join that container's own children.
    Default when the field is absent is AND.

    Example result: (FIT1054;FIT2085;FIT1008)&(MAT1830;FIT1058)
    """
    connector = container.get("parent_connector", {})
    op  = (connector.get("value", "AND") if isinstance(connector, dict) else "AND").upper()
    sep = ";" if op == "OR" else "&"

    nested = container.get("containers", [])
    rels   = container.get("relationships", [])

    if nested:
        parts = []
        for child in nested:
            expr = _render_container(child)
            if not expr:
                continue
            child_items = child.get("containers") or child.get("relationships") or []
            if len(child_items) > 1:
                expr = f"({expr})"
            parts.append(expr)
    elif rels:
        parts = [r.get("academic_item_code", "") for r in rels if r.get("academic_item_code")]
    else:
        return ""

    return sep.join(p for p in parts if p)


def parse_requisites(requisites: list) -> dict:
    """
    Parse raw requisites into the structured dict:
      {permission, prerequisites, corequisites, prohibitions, cp_required}

    prerequisites/corequisites/prohibitions are [] when empty, or a list
    containing one formatted string using & and ; notation.
    """
    prereqs, coreqs, prohibs = [], [], []
    permission  = False
    cp_required = 0

    for req in requisites:
        req_type = req.get("requisite_type", {}).get("value", "")

        if req_type == "permission":
            permission = True
            continue

        cp = req.get("credit_points")
        if cp:
            try:
                cp_required = int(cp)
            except (ValueError, TypeError):
                pass

        top_containers = req.get("container", [])
        if not top_containers:
            continue

        parts = [_render_container(c) for c in top_containers]
        parts = [p for p in parts if p]
        if not parts:
            continue

        if len(parts) == 1:
            combined = parts[0]
        else:
            combined = "&".join(
                f"({p})" if (";" in p or "&" in p) else p for p in parts
            )

        if req_type == "prerequisite":
            prereqs.append(combined)
        elif req_type == "corequisite":
            coreqs.append(combined)
        elif req_type == "prohibition":
            prohibs.append(combined)

    def to_list(parts: list[str]) -> list:
        if not parts:
            return []
        return ["&".join(parts)]

    return {
        "permission":    permission,
        "prerequisites": to_list(prereqs),
        "corequisites":  to_list(coreqs),
        "prohibitions":  to_list(prohibs),
        "cp_required":   cp_required,
    }


# ──────────────────── UNIT SCRAPER ────────────────────────────
def scrape_unit(code: str, year: str, idx: int, total: int) -> tuple[str, dict] | None:
    print(f"  [{idx:>5}/{total}] {code} ...", end=" ", flush=True)

    pc = fetch_page_content(f"{BASE_URL}/{year}/units/{code}")
    if not pc:
        print("FAILED")
        return None

    title = pc.get("title") or code
    print(f"-> {title}")

    # Academic org
    academic_org = _dict_str(pc.get("academic_org"))

    # School
    school = _dict_str(pc.get("school"))

    # Credit points
    credit_points = str(pc.get("credit_points") or "6")

    # SCA band
    sca_band = 0
    sb = pc.get("sca_band")
    if sb is not None:
        try:
            sca_band = int(_dict_str(sb) or sb)
        except (ValueError, TypeError):
            sca_band = 0

    # Level (derived from unit code number)
    level = _extract_level(code)

    # Offerings
    offerings = []
    for off in pc.get("unit_offering", []) or []:
        loc  = _dict_str(off.get("location"))
        tp   = _dict_str(off.get("teaching_period"))
        mode = _dict_str(off.get("attendance_mode")) or _dict_str(off.get("mode"))
        name = str(off.get("display_name") or off.get("name") or "").strip()
        offerings.append({
            "location": loc,
            "mode":     mode,
            "name":     name,
            "period":   tp,
        })

    # Assessments
    assessments = []
    for a in pc.get("assessments", []) or []:
        aname     = str(a.get("assessment_name") or a.get("name") or "").strip()
        atype_raw = a.get("assessment_type") or {}
        atype_str = _dict_str(atype_raw) if isinstance(atype_raw, dict) else str(atype_raw or "")
        if aname:
            assessments.append({
                "name": aname,
                "type": _normalize_assessment_type(aname, atype_str),
            })

    # Requisites
    requisites = parse_requisites(pc.get("requisites", []) or [])

    return code, {
        "academic_org":  academic_org,
        "assessments":   assessments,
        "code":          code,
        "credit_points": credit_points,
        "level":         level,
        "offerings":     offerings,
        "requisites":    requisites,
        "sca_band":      sca_band,
        "school":        school,
        "title":         title,
    }


# ──────────────────── SAVE JSON ───────────────────────────────
def save_json(units: dict, filename: str):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(units, f, ensure_ascii=False, indent=4)
    print(f"\nSaved {len(units)} units to {filename}")


# ────────────────────────── CLI ───────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Scrape all Monash Handbook units across all faculties"
    )
    parser.add_argument("--year",   "-y", default=DEFAULT_YEAR,
                        help=f"Handbook year (default: {DEFAULT_YEAR})")
    parser.add_argument("--output", "-o", default="final_units.json",
                        help="Output JSON filename (default: final_units.json)")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Monash Unit Scraper v3  |  Year: {args.year}")
    print(f"{'='*60}\n")

    codes = discover_unit_codes(args.year)
    if not codes:
        print("No units found — check year or network connection.")
        return

    total = len(codes)
    print(f"\n[2/3] Scraping {total} unit pages ...")

    all_units = {}
    for i, code in enumerate(codes, 1):
        result = scrape_unit(code, args.year, i, total)
        if result:
            unit_code, unit_data = result
            all_units[unit_code] = unit_data

    print(f"\n[3/3] Saving results ...")
    save_json(all_units, args.output)


if __name__ == "__main__":
    main()
