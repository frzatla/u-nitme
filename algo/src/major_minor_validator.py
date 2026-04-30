#!/usr/bin/env python3
"""
major_minor_validator.py — Validate a student's major/minor completion.

Reads a course plan JSON (the schedule output from algo1.py) and walks the
requirement_groups tree of the major and minor referenced in the plan. Reports
any incomplete groups and the units still needed. If everything is satisfied,
returns a completion message.

Input  : JSON course plan (schedule output from algo1.py — must contain
         "major" / "minor" codes and a "schedule" list of semesters).
Output : JSON validation result.

Usage:
    python major_minor_validator.py --input plan.json
    python major_minor_validator.py --input plan.json --output result.json
    python major_minor_validator.py < plan.json   # stdin → stdout
"""

import argparse
import json
import os
import sys

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(SCRIPT_DIR, "data")


# ─── data loading ─────────────────────────────────────────────────────────────

def load_aos_db():
    """Load the AOS database. Prefers mock_aos.json when present, else final_aos.json."""
    mock_path  = os.path.join(DATA_DIR, "mock_aos.json")
    final_path = os.path.join(DATA_DIR, "final_aos.json")
    path = mock_path if os.path.exists(mock_path) else final_path
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_units_db():
    """Load the units database. Prefers mock_units.json when present, else final_units.json."""
    mock_path  = os.path.join(DATA_DIR, "mock_units.json")
    final_path = os.path.join(DATA_DIR, "final_units.json")
    path = mock_path if os.path.exists(mock_path) else final_path
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ─── plan parsing ─────────────────────────────────────────────────────────────

def normalise_plan(plan):
    """
    Accept any of:
      - Allocate+ style: { startYear, courseInfo, teachingPeriods: [{ units: [{ unitCode }] }] }
      - algo1.py schedule output: { major, minor, schedule: [{ units: [{ code }] }] }
      - Wrapper: { schedule: { major, minor, schedule: [...] } }

    For Allocate+ inputs, major/minor codes can be supplied at top level OR inside
    `courseInfo.major` / `courseInfo.minor`.

    Returns dict with keys: major, minor, periods (list of period blocks).
    """
    # Wrapped algo1.py form
    sched = plan.get("schedule")
    if isinstance(sched, dict):
        return {
            "major":   sched.get("major"),
            "minor":   sched.get("minor"),
            "periods": sched.get("schedule", []),
        }

    # Allocate+ form
    if "teachingPeriods" in plan:
        course_info = plan.get("courseInfo") or {}
        return {
            "major":   plan.get("major")   or course_info.get("major"),
            "minor":   plan.get("minor")   or course_info.get("minor"),
            "periods": plan.get("teachingPeriods", []),
        }

    # algo1.py output (flat)
    return {
        "major":   plan.get("major"),
        "minor":   plan.get("minor"),
        "periods": sched or [],
    }


def collect_scheduled_units(periods):
    """
    All real unit codes that appear anywhere in the plan.

    Handles both shapes:
      - Allocate+:  { units: [{ unitCode, placeholder }] }
      - algo1.py:   { units: [{ code }] }   (where code='ELECTIVE' is a placeholder)
    """
    units = set()
    for period in periods:
        for u in period.get("units", []):
            if u.get("placeholder"):              # Allocate+ placeholder
                continue
            code = u.get("unitCode") or u.get("code")
            if not code or code == "ELECTIVE":    # algo1.py placeholder
                continue
            units.add(code)
    return units


# ─── AOS tree validation ──────────────────────────────────────────────────────

def validate_aos(aos_code, label, aos_db, units_db, scheduled):
    """
    Walk the requirement_groups tree of one AOS and report incomplete groups.

    Returns a dict:
      {
        "code", "label", "title",
        "found": bool,                  # False if AOS code unknown
        "complete": bool,
        "total_required_cp": int,
        "completed_cp": int,
        "incomplete_groups": [
          {
            "group":    "Part C > Core units",
            "type":     "AND" | "OR",
            "needed":   int,            # how many units this group requires
            "have":     int,            # how many of those the student has
            "missing_units": [...],     # for AND groups: units not yet taken
            "options":      [...],      # for OR groups: remaining options
          },
          ...
        ]
      }
    """
    aos = aos_db.get(aos_code)
    if not aos:
        return {
            "code":     aos_code,
            "label":    label,
            "found":    False,
            "complete": False,
            "message":  f"{label.capitalize()} '{aos_code}' not found in AOS database",
        }

    title    = aos.get("course_title", aos_code)
    nodes    = aos.get("requirement_groups", [])
    node_map = {n["id"]: n for n in nodes}
    aos_codes = set(aos_db.keys())   # used to filter AOS placeholders out of unit lists

    incomplete_groups = []

    def check(node, path):
        """Recurse the tree. Returns (cp_completed_here, ok)."""
        ntype     = node.get("type", "AND")
        ntitle    = node.get("title", node["id"])
        node_cp   = node.get("credit_points") or 0
        num_req   = node.get("num_required")
        children  = node.get("children", [])
        full_path = f"{path} > {ntitle}" if path else ntitle

        # Real units only — exclude AOS-code placeholders that sometimes
        # appear in node.units lists (e.g. specialisation cross-references).
        unit_list = [
            u.strip() for u in node.get("units", [])
            if u.strip() and u.strip() not in aos_codes
        ]

        # ── leaf node (direct unit list) ─────────────────────────────────────
        if unit_list and not children:
            present = [u for u in unit_list if u in scheduled]
            present_cp = sum(
                int(units_db.get(u, {}).get("credit_points") or 6) for u in present
            )

            if ntype == "AND":
                if num_req is not None:
                    needed = num_req
                elif node_cp:
                    needed = max(1, node_cp // 6)
                else:
                    needed = len(unit_list)
                ok = len(present) >= needed
                if not ok:
                    missing = [u for u in unit_list if u not in scheduled]
                    incomplete_groups.append({
                        "group":         full_path,
                        "type":          "AND",
                        "needed":        needed,
                        "have":          len(present),
                        "missing_units": missing,
                    })
                return present_cp, ok

            # OR leaf
            needed = num_req if num_req is not None else 1
            ok = len(present) >= needed
            if not ok:
                options_left = [u for u in unit_list if u not in scheduled]
                incomplete_groups.append({
                    "group":   full_path,
                    "type":    "OR",
                    "needed":  needed,
                    "have":    len(present),
                    "options": options_left,
                })
            return present_cp, ok

        # ── branch node (recurse into children) ──────────────────────────────
        if children:
            if ntype == "AND":
                total_cp, all_ok = 0, True
                for cid in children:
                    if cid not in node_map:
                        continue
                    ccp, cok = check(node_map[cid], full_path)
                    total_cp += ccp
                    all_ok = all_ok and cok
                return total_cp, all_ok

            # OR branch — needs `num_req` (default 1) of children satisfied
            need_n = num_req if num_req is not None else 1
            total_cp, satisfied = 0, 0
            for cid in children:
                if cid not in node_map:
                    continue
                ccp, cok = check(node_map[cid], full_path)
                total_cp += ccp
                if cok:
                    satisfied += 1
            ok = satisfied >= need_n
            if not ok:
                incomplete_groups.append({
                    "group":  full_path,
                    "type":   "OR",
                    "needed": need_n,
                    "have":   satisfied,
                    "of":     len(children),
                })
            return total_cp, ok

        return 0, True

    # Walk every root (parent_id is None)
    completed_cp = 0
    overall_ok   = True
    for root in [n for n in nodes if n.get("parent_id") is None]:
        cp, ok = check(root, "")
        completed_cp += cp
        overall_ok = overall_ok and ok

    return {
        "code":              aos_code,
        "label":             label,
        "title":             title,
        "found":             True,
        "complete":          overall_ok,
        "total_required_cp": aos.get("total_credit_points", 0),
        "completed_cp":      completed_cp,
        "incomplete_groups": incomplete_groups,
    }


# ─── top-level validation ────────────────────────────────────────────────────

def validate_plan(plan, aos_db, units_db):
    p = normalise_plan(plan)
    scheduled = collect_scheduled_units(p["periods"])

    results = []
    if p["major"]:
        results.append(validate_aos(p["major"], "major", aos_db, units_db, scheduled))
    if p["minor"]:
        results.append(validate_aos(p["minor"], "minor", aos_db, units_db, scheduled))

    if not results:
        return {
            "complete": True,
            "message":  "No major or minor specified in the plan — nothing to validate.",
            "results":  [],
        }

    all_complete = all(r.get("complete") for r in results)
    if all_complete:
        labels = " and ".join(r["label"] for r in results)
        return {
            "complete": True,
            "message":  f"All {labels} requirements are completed!",
            "results":  results,
        }

    return {
        "complete": False,
        "message":  "Some requirements are incomplete.",
        "results":  results,
    }


# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Validate major/minor completion in a course plan"
    )
    parser.add_argument("--input",  help="Path to plan JSON (default: stdin)")
    parser.add_argument("--output", help="Path to write result JSON (default: stdout)")
    args = parser.parse_args()

    if args.input:
        with open(args.input, encoding="utf-8") as f:
            plan = json.load(f)
    else:
        plan = json.load(sys.stdin)

    aos_db   = load_aos_db()
    units_db = load_units_db()
    result   = validate_plan(plan, aos_db, units_db)

    out = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(out)
    else:
        print(out)


if __name__ == "__main__":
    main()
