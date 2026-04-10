#!/usr/bin/env python3
"""
algo1.py — Monash unit scheduler using longest-prerequisite-chain (DAG critical path).

Units with deeper prerequisite chains are prioritised for early semesters so that
long dependency chains never become the bottleneck.

Usage:
    python3 algo1.py --course C2001 --specialisation ALGSFTWR01 --campus Clayton
    python3 algo1.py --course C2001 --specialisation DATASCAI01 --campus Clayton --output my_schedule.json
    python3 algo1.py --course C2001 --specialisation CSCYBSEC01 --major DATASCI10 --campus Clayton
"""

import json
import argparse
import os
import sys

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAX_UNITS_PER_SEM = 4       # standard full-time load (24 CP/sem)
MAX_SEMESTERS     = 24      # safety upper bound

# Preferred math units for FIT students — chosen over other math alternatives
FIT_PREFERRED_MATH = {"MAT1830", "MAT1841"}


# ─── data loading ────────────────────────────────────────────────────────────

def load_data():
    data_dir = os.path.join(SCRIPT_DIR, "data")
    def _load(name):
        path = os.path.join(data_dir, name)
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    units_db = _load("final_units.json")
    # Convert string requisites to group-dict format expected by the algorithm.
    #
    # String format uses:
    #   ';'  as OR  separator  (take 1 of these)
    #   '&'  as AND separator  (each clause is a separate required group)
    #   '()' for grouping
    #
    # e.g. "(FIT1045;FIT1053)&(MAT1830;FIT1058)"
    #   → [{"units":["FIT1045","FIT1053"]}, {"units":["MAT1830","FIT1058"]}]
    import re as _re
    _UNIT_RE = _re.compile(r'\b[A-Z]{2,4}\d{4}\b')

    def _split_top_and(s):
        """Split s on '&' only at paren-depth 0."""
        parts, depth, start = [], 0, 0
        for i, ch in enumerate(s):
            if ch == '(':   depth += 1
            elif ch == ')': depth -= 1
            elif ch == '&' and depth == 0:
                parts.append(s[start:i])
                start = i + 1
        parts.append(s[start:])
        return [p.strip() for p in parts if p.strip()]

    def _parse_req_string(expr):
        """Return list of group-dicts from one requisite expression string."""
        groups = []
        for clause in _split_top_and(expr.strip()):
            units = _UNIT_RE.findall(clause)
            if units:
                groups.append({"units": units})
        return groups

    def _norm_groups(raw):
        result = []
        for item in (raw or []):
            if isinstance(item, str):
                result.extend(_parse_req_string(item))
            elif isinstance(item, dict):
                result.append(item)
        return result

    for unit in units_db.values():
        reqs = unit.get("requisites")
        if not reqs:
            continue
        reqs["prerequisites"] = _norm_groups(reqs.get("prerequisites"))
        reqs["corequisites"]  = _norm_groups(reqs.get("corequisites"))
        reqs["prohibitions"]  = _norm_groups(reqs.get("prohibitions"))
    return (
        units_db,
        _load("final_courses.json"),
        _load("final_aos.json"),
    )


# ─── unit extraction from course / AOS requirement trees ─────────────────────

def _num_units_from_node(node, plain_units):
    """
    How many units should be taken from this node's unit list?

    Uses the node's credit_points as a guide: credit_points / 6 = units needed.
    If CP data is missing or would equal the full list, take all.
    """
    n  = len(plain_units)
    cp = node.get("credit_points") or 0
    if not cp or not n:
        return n
    needed = max(1, round(cp / 6))
    return min(needed, n)


def extract_required_units(course_code, aos_selections, campus, courses_db, aos_db,
                           units_db=None, chain_lengths=None, _aos_selections_ordered=None):
    """
    Walk the course requirement tree and collect concrete unit codes.

    - AND nodes  → take ALL (or CP-proportional) direct units; visit ALL children.
    - OR  nodes  → pick the campus-appropriate child; if ambiguous, pick first.
    - AOS refs   → if the code appears in aos_selections, expand it fully;
                   otherwise skip (student didn't choose that specialisation).
    - Elective groups (node.credit_points < full list CP) → pick only as many
      units as the credit_points imply (e.g. 6 CP node with 7 options → pick 1).

    chain_lengths : precomputed dict used to pick the best elective option.
    aos_selections: list of AOS codes the student chose.
    Returns a set of unit code strings.
    """
    chain_lengths        = chain_lengths or {}
    units_db             = units_db or {}
    _aos_selections_ordered = _aos_selections_ordered or aos_selections
    required = set()
    aos_set  = set(aos_selections)

    def collect_from_tree(req_groups, force_all_children=False):
        """Traverse a requirement_groups list and add units to `required`."""
        node_map = {n["id"]: n for n in req_groups}
        root     = next(n for n in req_groups if n["parent_id"] is None)

        def visit(nid):
            node     = node_map[nid]
            ntype    = node.get("type", "AND")
            children = node.get("children", [])

            # ── direct units on this node ──────────────────────────────────
            aos_units   = [u for u in node.get("units", []) if u in aos_db]
            plain_units = [u for u in node.get("units", []) if u not in aos_db]

            # AOS references: expand only the student's chosen ones
            for u in aos_units:
                if u in aos_set:
                    collect_from_aos(u)

            # Plain units: use CP heuristic to decide how many to take
            # Exclude units with non-standard credit points (anything other than 6 CP)
            standard_units = [
                u for u in plain_units
                if int(units_db.get(u, {}).get("credit_points") or 6) == 6
            ]
            n_needed = _num_units_from_node(node, standard_units)
            # sort: prefer FIT math units, then shortest chain, then code
            plain_sorted = sorted(
                standard_units,
                key=lambda u: (0 if u in FIT_PREFERRED_MATH else 1,
                               chain_lengths.get(u, 0), u),
            )
            required.update(plain_sorted[:n_needed])

            # ── recurse into children ──────────────────────────────────────
            if force_all_children:
                # AOS expansion: visit every child (student must complete all groups)
                for cid in children:
                    visit(cid)
            elif ntype == "OR":
                chosen = _pick_or_child(node, children, node_map, campus, aos_set,
                                        aos_db=aos_db, units_db=units_db,
                                        aos_selections=_aos_selections_ordered)
                if chosen:
                    visit(chosen)
            else:  # AND
                # If all children are campus-specific or specialisation-specific
                # branches, treat as OR — pick the one relevant to the student.
                if children and (
                    _all_children_campus_specific(children, node_map)
                    or _all_children_specialisation_specific(children, node_map, aos_db)
                ):
                    chosen = _pick_or_child(node, children, node_map, campus, aos_set,
                                        aos_db=aos_db, units_db=units_db,
                                        aos_selections=_aos_selections_ordered)
                    if chosen:
                        visit(chosen)
                else:
                    for cid in children:
                        visit(cid)

        visit(root["id"])

    def collect_from_aos(aos_code):
        """
        Expand an AOS fully — visit ALL children regardless of OR/AND type
        because the student must complete the whole specialisation / major / minor.
        """
        aos = aos_db.get(aos_code)
        if not aos:
            return
        collect_from_tree(aos["requirement_groups"], force_all_children=True)

    course = courses_db.get(course_code)
    if not course:
        raise ValueError(f"Course {course_code!r} not found in database.")

    expanded = set()   # track which AOS codes were expanded during tree walk

    _orig_collect_from_aos = collect_from_aos

    def collect_from_aos(aos_code):
        expanded.add(aos_code)
        _orig_collect_from_aos(aos_code)

    collect_from_tree(course["requirement_groups"])

    # Expand any AOS selections not referenced by the course tree
    # (e.g. minors from other faculties, or specialisations not listed in this course's unit nodes)
    for code in aos_selections:
        if code not in expanded:
            collect_from_aos(code)

    return required


_CAMPUS_KEYWORDS = {"malaysia", "clayton", "parkville", "peninsula", "sunway", "alfred"}

def _all_children_campus_specific(children, node_map):
    """True if every child node's title contains a known campus name."""
    return children and all(
        any(kw in node_map.get(cid, {}).get("title", "").lower()
            for kw in _CAMPUS_KEYWORDS)
        for cid in children
    )


def _all_children_specialisation_specific(children, node_map, aos_db):
    """
    True if the children of an AND node are mutually exclusive specialisation
    branches — i.e. each child title matches a different AOS title from the db.

    Used to detect cases where the course data encodes specialisation-specific
    project/capstone groups as AND children when they should be OR alternatives.
    Allows one non-matching child (e.g. an IBL/industry placement option).
    """
    if not children or len(children) < 2:
        return False

    _STOP = {"and", "the", "of", "in", "for", "with", "studies", "project",
             "based", "learning", "industry", "placement"}

    def _kws(title):
        words = title.lower().split()
        bigrams = {f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)}
        singles = {w for w in words if len(w) > 4 and w not in _STOP}
        return bigrams, singles

    # Build keyword sets for every AOS in the database
    aos_kw_list = [_kws(e.get("course_title", "")) for e in aos_db.values()]

    matched = sum(
        1 for cid in children
        if any(
            (bgs and any(bg in node_map.get(cid, {}).get("title", "").lower() for bg in bgs))
            or (sns and any(w in node_map.get(cid, {}).get("title", "").lower() for w in sns))
            for bgs, sns in aos_kw_list
        )
    )
    # At least (n-1) children must match an AOS title to be considered specialisation branches
    return matched >= max(2, len(children) - 1)


def _child_has_standard_units(cid, node_map, aos_db, units_db):
    """True if the child node has at least one standard-CP (6 CP) unit, or has sub-children."""
    node = node_map.get(cid, {})
    if node.get("children"):
        return True  # has sub-children; assume it may yield valid units
    for u in node.get("units", []):
        if u in aos_db:
            return True  # AOS ref always considered valid
        if int(units_db.get(u, {}).get("credit_points") or 6) == 6:
            return True
    return False


def _pick_or_child(node, children, node_map, campus, aos_set,
                   aos_db=None, units_db=None, aos_selections=None):
    """
    Heuristic for choosing which OR branch to take, in priority order:
    1. Branch whose title matches the campus name.
    2. Branch whose title matches a keyword from the PRIMARY specialisation title.
    3. Branch whose title matches a keyword from a secondary AOS (major/minor).
    4. Branch that directly lists one of the student's AOS codes as a unit.
    5. First child with at least one standard-CP (6 CP) unit.
    6. Final fallback: first child.

    Primary specialisation always beats minor when both match (e.g. for capstone).
    Children whose units are all non-standard CP are skipped.
    """
    if not children:
        return None

    aos_db        = aos_db        or {}
    units_db      = units_db      or {}
    aos_selections = aos_selections or list(aos_set)

    # Generic words that appear in many AOS titles and are useless for capstone matching
    _STOP = {"and", "the", "of", "in", "for", "with", "advanced", "applied",
             "general", "studies", "science", "computer", "information",
             "technology", "engineering", "mathematics", "introduction"}

    def _aos_phrases(title):
        """
        Extract matching phrases from an AOS title:
        1. Bigrams (2-word consecutive pairs) — most specific, checked first.
        2. Single non-stop words longer than 4 chars — used as fallback.
        """
        words  = title.lower().split()
        bigrams = {f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)}
        singles = {w for w in words if len(w) > 4 and w not in _STOP}
        return bigrams, singles

    # Build ordered list of (priority_index, bigrams, singles) — index 0 = specialisation
    aos_kw_by_priority = []
    for i, code in enumerate(aos_selections):
        title   = aos_db.get(code, {}).get("course_title", "")
        bigrams, singles = _aos_phrases(title)
        aos_kw_by_priority.append((i, bigrams, singles))

    def score(cid):
        node   = node_map.get(cid, {})
        cunits = node.get("units", [])
        ctitle = node.get("title", "").lower()
        # Also include unit titles inside this child for richer matching
        unit_titles = " ".join(
            units_db.get(u, {}).get("title", "").lower() for u in cunits
        )
        combined = ctitle + " " + unit_titles

        if campus and campus.lower() in ctitle:
            return (0, 0)
        # Bigram match against node title + unit titles (most precise)
        for priority, bigrams, singles in aos_kw_by_priority:
            if bigrams and any(bg in combined for bg in bigrams):
                return (1, priority)
        # Single-word fallback
        for priority, bigrams, singles in aos_kw_by_priority:
            if singles and any(w in combined for w in singles):
                return (2, priority)
        if any(u in aos_set for u in cunits):
            return (3, 0)
        if _child_has_standard_units(cid, node_map, aos_db, units_db):
            return (4, 0)
        return (5, 0)

    ordered = sorted(children, key=score)
    # Skip children whose only units are non-standard CP, unless no alternative
    for cid in ordered:
        if _child_has_standard_units(cid, node_map, aos_db, units_db):
            return cid
    return ordered[0]  # last resort fallback


# ─── prerequisite chain length (critical-path depth in the prereq DAG) ────────

def compute_all_chain_lengths(units_db):
    """
    Compute chain_length[u] = the minimum number of prior semesters required
    before unit u can be taken, considering its full prerequisite graph.

    Within each AND-group the student picks the *shallowest* prerequisite
    (best-case), so chain_length = 1 + max over AND-groups of
    min(chain_length[v] for v in group).

    Returns dict[unit_code -> int].
    """
    memo = {}

    def depth(code, visiting=frozenset()):
        if code in memo:
            return memo[code]
        if code in visiting:        # cycle guard
            return 0

        unit = units_db.get(code)
        if not unit or not unit.get("requisites"):
            memo[code] = 0
            return 0

        prereqs = unit["requisites"].get("prerequisites") or []
        if not prereqs:
            memo[code] = 0
            return 0

        v2 = visiting | {code}
        d  = 0
        for group in prereqs:
            candidates = [u for u in group.get("units", []) if u in units_db]
            if candidates:
                best = min(depth(u, v2) for u in candidates)
                d    = max(d, best + 1)

        memo[code] = d
        return d

    for code in units_db:
        depth(code)

    return memo


# ─── prerequisite expansion (add missing prereqs to the required set) ──────────

def ensure_prerequisites(required, units_db, chain_lengths):
    """
    For each required unit whose prerequisite AND-groups aren't covered,
    add the best (shortest chain) candidate from each uncovered group.
    Repeats until stable.
    """
    changed = True
    while changed:
        changed = False
        for unit in list(required):
            unit_data = units_db.get(unit)
            if not unit_data or not unit_data.get("requisites"):
                continue
            for group in (unit_data["requisites"].get("prerequisites") or []):
                g_units  = group.get("units", [])
                num_req  = group.get("NumReq", 1)
                in_req   = [u for u in g_units if u in required]
                if len(in_req) >= num_req:
                    continue
                # pick the candidate(s): if MAT1830/MAT1841 is an option, take it first
                candidates = sorted(
                    (u for u in g_units if u in units_db and u not in required),
                    key=lambda u: (0 if u in FIT_PREFERRED_MATH else 1,
                                   chain_lengths.get(u, 0), u),
                )
                for c in candidates[: num_req - len(in_req)]:
                    required.add(c)
                    changed = True


# ─── unlock depth (how deep a chain each unit unblocks) ──────────────────────

def compute_unlock_depths(required, units_db, chain_lengths):
    """
    For each required unit, compute the maximum chain_length of any unit in
    `required` that transitively depends on it.

    unlock_depth[u] answers: "if I delay u, what is the deepest chain I will stall?"
    Units with high unlock_depth must be scheduled early.
    """
    from collections import defaultdict

    # Reverse graph: prereq → set of required units that need it
    dependents = defaultdict(set)
    for unit in required:
        unit_data = units_db.get(unit)
        if not unit_data or not unit_data.get("requisites"):
            continue
        for group in (unit_data["requisites"].get("prerequisites") or []):
            for u in group.get("units", []):
                if u in required:
                    dependents[u].add(unit)

    memo = {}

    def max_unlock(u, visiting=frozenset()):
        if u in memo:
            return memo[u]
        if u in visiting:
            return chain_lengths.get(u, 0)
        v2  = visiting | {u}
        val = chain_lengths.get(u, 0)
        for dep in dependents[u]:
            val = max(val, max_unlock(dep, v2))
        memo[u] = val
        return val

    return {u: max_unlock(u) for u in required}


# ─── backward pass: latest-start deadlines ───────────────────────────────────

def compute_latest_starts(required, units_db, required_sems):
    """
    Backward pass (CPM): for each required unit compute the latest 0-based
    semester index at which it can start and still allow every downstream
    dependent to finish within `required_sems` semesters.

    Units with a smaller latest_start have tighter deadlines and must be
    prioritised by the scheduler.
    """
    from collections import defaultdict

    # Reverse graph: prereq -> direct dependents inside `required`
    dependents = defaultdict(set)
    for unit in required:
        unit_data = units_db.get(unit)
        if not unit_data:
            continue
        for group in (unit_data.get("requisites") or {}).get("prerequisites") or []:
            for prereq in group.get("units", []):
                if prereq in required:
                    dependents[prereq].add(unit)

    memo = {}

    def latest_start(u, visiting=frozenset()):
        if u in memo:
            return memo[u]
        if u in visiting:           # cycle guard — default to last slot
            return required_sems - 1
        deps = dependents[u]
        if not deps:
            memo[u] = required_sems - 1
            return required_sems - 1
        v2 = visiting | {u}
        # must be placed at least 1 semester before the tightest dependent
        tightest = min(latest_start(d, v2) for d in deps)
        memo[u] = tightest - 1
        return memo[u]

    return {u: latest_start(u) for u in required}


# ─── prerequisite dependency graph (within the required set) ──────────────────

def build_prereq_graph(required, units_db, chain_lengths):
    """
    For each unit, determine which other *required* units must be completed first.

    For each AND-group we pick the num_req shortest-chain units already in
    `required` (the ones the student is most likely to take first).

    Returns dict[unit_code -> set of unit_codes].
    """
    graph = {u: set() for u in required}

    for unit in required:
        unit_data = units_db.get(unit)
        if not unit_data or not unit_data.get("requisites"):
            continue
        for group in (unit_data["requisites"].get("prerequisites") or []):
            g_units = group.get("units", [])
            num_req = group.get("NumReq", 1)
            in_req  = sorted(
                [u for u in g_units if u in required],
                key=lambda u: (0 if u in FIT_PREFERRED_MATH else 1,
                               chain_lengths.get(u, 0), u),
            )
            graph[unit].update(in_req[:num_req])

    return graph


# ─── semester offering lookup ─────────────────────────────────────────────────

def get_offered_semesters(code, units_db, campus):
    """
    Returns a set containing 'S1', 'S2', and/or 'Summer' for the given campus.
    Defaults to {'S1', 'S2'} when data is missing.
    """
    unit = units_db.get(code)
    if not unit or not unit.get("offerings"):
        return {"S1", "S2"}

    sems = set()
    for o in (unit["offerings"] or []):
        if campus:
            loc = o.get("location", "")
            if campus.lower() not in loc.lower():
                continue
        p = o.get("period", "").lower()
        if "first" in p:
            sems.add("S1")
        elif "second" in p:
            sems.add("S2")
        elif "summer" in p:
            sems.add("Summer")
        elif "full year" in p:
            sems.update({"S1", "S2"})

    return sems or {"S1", "S2"}


# ─── greedy scheduler ─────────────────────────────────────────────────────────

def schedule_units(required, prereq_graph, chain_lengths, unlock_depths, units_db, campus,
                   standard_years=3):
    """
    Greedy semester-by-semester scheduler.

    Each semester:
      1. Filter to units whose prerequisites are all completed.
      2. Filter to units offered this semester.
      3. Sort by chain_length DESC (deepest chains first), then code for stability.
      4. Take up to MAX_UNITS_PER_SEM units.

    Also enforces cp_required: if a unit demands N CP completed first,
    it won't be scheduled until cumulative CP >= N.

    Semesters cycle S1 → S2 → S1 → S2 ...
    """
    required_sems = standard_years * 2
    latest_starts = compute_latest_starts(required, units_db, required_sems)
    completed    = set()
    remaining    = set(required)
    cumulative_cp = 0
    schedule     = []
    sem_cycle    = ["S1", "S2"]
    year         = 1
    sem_idx      = 0
    consecutive_empty = 0

    for _ in range(MAX_SEMESTERS):
        if not remaining:
            break

        sem       = sem_cycle[sem_idx % 2]
        sem_label = f"Year {year}, Semester {'1' if sem == 'S1' else '2'}"

        # units available this semester
        available = []
        for u in remaining:
            # prereqs satisfied?
            if not prereq_graph[u].issubset(completed):
                continue
            # cp_required satisfied?
            unit_data  = units_db.get(u, {})
            requisites = unit_data.get("requisites") or {}
            cp_needed  = requisites.get("cp_required", 0) or 0
            if cumulative_cp < cp_needed:
                continue
            # offered this semester?
            offered = get_offered_semesters(u, units_db, campus)
            if sem not in offered:
                continue
            available.append(u)

        # sort: highest unlock_depth first (unblocks the deepest chains),
        # then deepest own chain, then fewest offered semesters (least flexible
        # units scheduled first — e.g. S2-only before S1+S2 to avoid bumping
        # them to a much later semester), then code for determinism
        available.sort(key=lambda u: (latest_starts.get(u, required_sems - 1),
                                      -unlock_depths.get(u, 0),
                                      -chain_lengths.get(u, 0),
                                      len(get_offered_semesters(u, units_db, campus)),
                                      u))
        chosen = available[:MAX_UNITS_PER_SEM]

        if chosen or remaining:
            sem_number  = sem_idx + 1          # 1-based count of scheduled semesters
            is_extended = sem_number > standard_years * 2  # beyond standard degree duration

            sem_units = []
            for u in chosen:
                ud = units_db.get(u, {})
                cp = int(ud.get("credit_points") or 6)
                sem_units.append({
                    "code":          u,
                    "title":         ud.get("title", ""),
                    "credit_points": cp,
                    "level":         ud.get("level", 1),
                    "chain_length":  chain_lengths.get(u, 0),
                    "extended":      True if is_extended else None,
                })
            # fill remaining slots with free elective placeholders
            for _ in range(MAX_UNITS_PER_SEM - len(sem_units)):
                sem_units.append({
                    "code":          "ELECTIVE",
                    "title":         "Free elective (student's choice)",
                    "credit_points": 6,
                    "level":         None,
                    "chain_length":  None,
                    "extended":      True if is_extended else None,
                })
            fixed_cp       = sum(u["credit_points"] for u in sem_units
                                 if u["code"] != "ELECTIVE")
            total_cp       = sum(u["credit_points"] for u in sem_units)
            # cp_required checks count ALL completed CP (required + free electives),
            # so use total_cp (all 4 slots) not just fixed_cp
            cumulative_cp += total_cp

            schedule.append({
                "semester":      sem_label,
                "period":        sem,
                "semester_index": sem_number,
                "extended":      True if is_extended else None,
                "units":         sem_units,
                "fixed_cp":      fixed_cp,
                "total_cp":      total_cp,
                "cumulative_cp": cumulative_cp,
            })
            completed.update(chosen)
            remaining -= set(chosen)
            if chosen:
                consecutive_empty = 0
            else:
                consecutive_empty += 1
                if consecutive_empty >= 4:
                    break

        sem_idx += 1
        if sem_idx % 2 == 0:
            year += 1

    # anything left goes into an 'unscheduled' bucket
    if remaining:
        unscheduled = []
        for u in sorted(remaining):
            ud = units_db.get(u, {})
            unscheduled.append({
                "code":          u,
                "title":         ud.get("title", ""),
                "credit_points": int(ud.get("credit_points") or 6),
                "level":         ud.get("level", 1),
                "chain_length":  chain_lengths.get(u, 0),
                "note":          "Could not schedule — prerequisite cycle or offering conflict",
            })
        schedule.append({
            "semester":    "Unscheduled",
            "period":      None,
            "units":       unscheduled,
            "total_cp":    sum(u["credit_points"] for u in unscheduled),
            "cumulative_cp": None,
        })

    return schedule


# ─── schedule validator ───────────────────────────────────────────────────────

def validate_schedule(schedule_json, units_db,
                      course_code=None, specialisation=None, major=None, minor=None,
                      campus="Clayton", courses_db=None, aos_db=None):
    """
    Validate a schedule JSON (the 'schedule' list from the output file).

    Requisite checks (per unit, excluding ELECTIVEs and units not in units_db):
      1. Prerequisites  — each AND-group needs >= NumReq units done in a *prior* semester.
      2. Corequisites   — each AND-group needs >= NumReq units done in same or prior semester.
      3. cp_required    — cumulative CP before this semester must meet the threshold.
      4. Prohibitions   — no prohibited unit may appear elsewhere in the schedule.

    Completion checks (when course_code / AOS args + courses_db/aos_db are supplied):
      5. For each degree/specialisation/major/minor, walk its requirement_groups tree
         and verify the schedule satisfies every AND-node's unit list and every OR-node's
         num_required / credit_point target.

    Returns a list of violation dicts with keys:
      {type, source, unit (optional), semester (optional), message}
    """
    violations = []

    semesters = [s for s in schedule_json if s.get("period") is not None]

    # unit code -> 0-based semester index
    unit_sem = {}
    for idx, sem in enumerate(semesters):
        for u in sem.get("units", []):
            if u["code"] != "ELECTIVE":
                unit_sem[u["code"]] = idx

    all_scheduled = set(unit_sem.keys())
    cumulative_cp = 0

    # ── 1–4: per-unit requisite checks ────────────────────────────────────────
    for idx, sem in enumerate(semesters):
        sem_label = sem.get("semester", f"Semester {idx+1}")
        cp_before = cumulative_cp

        for u in sem.get("units", []):
            code = u["code"]
            if code == "ELECTIVE":
                continue
            unit_data = units_db.get(code)
            if not unit_data or not unit_data.get("requisites"):
                continue
            req = unit_data["requisites"]

            # 1. Prerequisites
            for group in (req.get("prerequisites") or []):
                g_units = [x.strip() for x in group.get("units", [])]
                num_req = group.get("NumReq", 1)
                met = [u2 for u2 in g_units if u2 in unit_sem and unit_sem[u2] < idx]
                if len(met) < num_req:
                    violations.append({
                        "type":     "prerequisite",
                        "source":   code,
                        "unit":     code,
                        "semester": sem_label,
                        "message":  (
                            f"Needs {num_req} of {g_units} completed before this semester "
                            f"(found {len(met)}: {met})"
                        ),
                    })

            # 2. Corequisites
            for group in (req.get("corequisites") or []):
                g_units = [x.strip() for x in group.get("units", [])]
                num_req = group.get("NumReq", 1)
                met = [u2 for u2 in g_units if u2 in unit_sem and unit_sem[u2] <= idx]
                if len(met) < num_req:
                    violations.append({
                        "type":     "corequisite",
                        "source":   code,
                        "unit":     code,
                        "semester": sem_label,
                        "message":  (
                            f"Needs {num_req} of {g_units} in same or earlier semester "
                            f"(found {len(met)}: {met})"
                        ),
                    })

            # 3. cp_required
            cp_req = req.get("cp_required")
            if cp_req and cp_before < cp_req:
                violations.append({
                    "type":     "cp_required",
                    "source":   code,
                    "unit":     code,
                    "semester": sem_label,
                    "message":  (
                        f"Needs {cp_req} CP completed before enrolment "
                        f"(only {cp_before} CP accumulated)"
                    ),
                })

            # 4. Prohibitions
            for group in (req.get("prohibitions") or []):
                g_units = [x.strip() for x in group.get("units", [])]
                clashes = [u2 for u2 in g_units if u2 in all_scheduled and u2 != code]
                if clashes:
                    violations.append({
                        "type":     "prohibition",
                        "source":   code,
                        "unit":     code,
                        "semester": sem_label,
                        "message":  f"Cannot be taken alongside {clashes} (also in schedule)",
                    })

        cumulative_cp = sem.get("cumulative_cp") or (cumulative_cp + sem.get("total_cp", 0))

    # ── 5: degree / AOS completion checks ─────────────────────────────────────
    if courses_db is not None and aos_db is not None:
        # Total CP = required units + elective placeholders (student fills those freely)
        required_unit_cp = sum(
            int(units_db.get(code, {}).get("credit_points") or 6)
            for code in all_scheduled
        )
        elective_cp = sum(
            u["credit_points"]
            for s in schedule_json if s.get("period")
            for u in s.get("units", [])
            if u["code"] == "ELECTIVE"
        )
        total_scheduled_cp = required_unit_cp + elective_cp

        entries_to_check = []
        if course_code:
            entries_to_check.append((course_code, courses_db, "degree"))
        for aos_code, label in [
            (specialisation, "specialisation"),
            (major,          "major"),
            (minor,          "minor"),
        ]:
            if aos_code:
                entries_to_check.append((aos_code, aos_db, label))

        for entry_code, db, label in entries_to_check:
            entry = db.get(entry_code)
            if not entry:
                violations.append({
                    "type":    "completion",
                    "source":  entry_code,
                    "message": f"{label.capitalize()} '{entry_code}' not found in database",
                })
                continue

            entry_title = entry.get("course_title", entry_code)
            node_map    = {n["id"]: n for n in entry.get("requirement_groups", [])}

            all_db_codes = set(courses_db) | set(aos_db)

            def _check_node(node, path, report=True):
                """
                Recursively check whether `all_scheduled` satisfies this node.
                Returns (covered_cp, ok: bool).

                report=False suppresses violation emission (used inside OR branches
                so that individual failing options don't produce noise — only the
                parent OR reports if not enough options are satisfied).
                """
                node_type  = node.get("type", "AND")
                node_title = node.get("title", node["id"])
                node_cp    = node.get("credit_points") or 0
                num_req    = node.get("num_required")
                # Filter out AOS/course codes — they are structural placeholders,
                # not real unit codes the student enrols in
                units_list = [
                    u.strip() for u in node.get("units", [])
                    if u.strip() and u.strip() not in all_db_codes
                ]
                children   = node.get("children", [])
                full_path  = f"{path} > {node_title}" if path else node_title

                # Skip campus-mismatched branches ("Malaysia offerings" etc.)
                campus_kw = (campus or "Clayton").lower()
                campus_keywords = {"malaysia", "clayton", "alfred"}
                for kw in campus_keywords - {campus_kw}:
                    if kw in node_title.lower():
                        return 0, True

                # ── leaf: direct unit list ─────────────────────────────────────
                if units_list and not children:
                    present    = [u for u in units_list if u in all_scheduled]
                    present_cp = sum(
                        int(units_db.get(u, {}).get("credit_points") or 6)
                        for u in present
                    )
                    if node_type == "AND":
                        # Use CP/6 heuristic (same as scheduler): how many does
                        # this node expect the student to take?
                        if num_req is not None:
                            need = num_req
                        elif node_cp:
                            need = max(1, node_cp // 6)
                        else:
                            need = len(units_list)
                        ok = len(present) >= need
                        if not ok and report:
                            missing = [u for u in units_list if u not in all_scheduled]
                            violations.append({
                                "type":    "completion",
                                "source":  entry_code,
                                "message": (
                                    f"[{label.upper()}] {entry_title} — '{full_path}': "
                                    f"need {need} of {len(units_list)} units, "
                                    f"missing {missing[:8]}"
                                    + (" ..." if len(missing) > 8 else "")
                                ),
                            })
                        return present_cp, ok
                    else:  # OR
                        need_n = num_req if num_req is not None else 1
                        # Unit-count is the decisive check for OR leaves.
                        # node_cp is the degree-contribution of this group, not a
                        # threshold — don't enforce it here (data inconsistencies
                        # between node cp and actual unit cp values cause false fails).
                        ok = len(present) >= need_n
                        if not ok and report:
                            violations.append({
                                "type":    "completion",
                                "source":  entry_code,
                                "message": (
                                    f"[{label.upper()}] {entry_title} — '{full_path}': "
                                    f"need {need_n} unit(s) from {units_list}, "
                                    f"have {present}"
                                ),
                            })
                        return present_cp, ok

                # ── branch: recurse into children ──────────────────────────────
                if children:
                    if node_type == "AND":
                        # All children required — recurse with full reporting
                        total_cp_here = 0
                        all_ok = True
                        for cid in children:
                            if cid not in node_map:
                                continue
                            ccp, cok = _check_node(node_map[cid], full_path, report=report)
                            total_cp_here += ccp
                            all_ok = all_ok and cok
                        return total_cp_here, all_ok
                    else:  # OR — only report at this level, not per-child
                        need_n  = num_req if num_req is not None else 1
                        need_cp = node_cp
                        sat, total_cp_here = 0, 0
                        for cid in children:
                            if cid not in node_map:
                                continue
                            # report=False: suppress child-level noise for OR options
                            ccp, cok = _check_node(node_map[cid], full_path, report=False)
                            total_cp_here += ccp
                            if cok:
                                sat += 1
                        ok = sat >= need_n and (not need_cp or total_cp_here >= need_cp)
                        if not ok and report:
                            violations.append({
                                "type":    "completion",
                                "source":  entry_code,
                                "message": (
                                    f"[{label.upper()}] {entry_title} — '{full_path}': "
                                    f"need {need_n} of {len(children)} options satisfied "
                                    f"(have {sat})"
                                ),
                            })
                        return total_cp_here, ok

                return 0, True

            # Find and check root nodes (parent_id is None)
            roots = [n for n in entry.get("requirement_groups", [])
                     if n.get("parent_id") is None]
            for root in roots:
                _check_node(root, "")

            # Note: overall degree CP is not checked here — the algorithm
            # only schedules required units; free elective slots fill the
            # remainder automatically and are the student's responsibility.

    return violations


# ─── AOS query helper ─────────────────────────────────────────────────────────

def get_available_aos(course_code, courses_db, aos_db, campus="Clayton", _visited=None):
    """
    Return all AOS (specialisations, majors, minors) available for a given course.

    AOS codes are read directly from the course's requirement_groups nodes.
    If a node's units list contains another *course* code (e.g. a double degree
    like C2002 referencing C2000), the AOS from the parent course are inherited
    recursively.

    Returns a list of group dicts:
    [
      {
        "group":         str,        # requirement node title
        "inherited_from": str|None,  # parent course code if inherited, else None
        "num_required":  int|None,   # how many AOS the student must choose
        "credit_points": int,        # CP this group fills
        "options": [
          {
            "code":                str,
            "title":               str,
            "total_credit_points": int,
          },
          ...
        ]
      },
      ...
    ]
    """
    if _visited is None:
        _visited = set()
    if course_code in _visited:
        return []
    _visited.add(course_code)

    course = courses_db.get(course_code)
    if not course:
        return []

    all_aos_codes    = set(aos_db.keys())
    all_course_codes = set(courses_db.keys())
    groups = []

    for node in course.get("requirement_groups", []):
        raw_units = [u.strip() for u in node.get("units", []) if u.strip()]

        # ── AOS options listed directly in this node ───────────────────────────
        aos_refs = [u for u in raw_units if u in all_aos_codes]
        if aos_refs:
            options = []
            for code in aos_refs:
                entry = aos_db[code]
                options.append({
                    "code":                code,
                    "title":               entry.get("course_title", code),
                    "total_credit_points": entry.get("total_credit_points") or 0,
                })
            groups.append({
                "group":          node.get("title", ""),
                "inherited_from": None,
                "num_required":   node.get("num_required"),
                "credit_points":  node.get("credit_points") or 0,
                "options":        options,
            })
            continue

        # ── Parent course references — inherit their AOS ───────────────────────
        parent_refs = [u for u in raw_units if u in all_course_codes]
        for parent_code in parent_refs:
            inherited = get_available_aos(
                parent_code, courses_db, aos_db, campus, _visited=_visited
            )
            for g in inherited:
                groups.append({**g, "inherited_from": parent_code})

    return groups


# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Monash unit scheduler — longest-prerequisite-chain (DAG) approach"
    )
    parser.add_argument("--course",         required=True,
                        help="Course code, e.g. C2001")
    parser.add_argument("--specialisation", default=None,
                        help="Specialisation AOS code, e.g. ALGSFTWR01")
    parser.add_argument("--major",          default=None,
                        help="Major AOS code")
    parser.add_argument("--minor",          default=None,
                        help="Minor AOS code")
    parser.add_argument("--campus",         default="Clayton",
                        help="Campus name (default: Clayton)")
    parser.add_argument("--years",          default=None, type=int,
                        help="Standard degree duration in years (default: auto-detect from course code)")
    parser.add_argument("--output",         default="schedule.json",
                        help="Output JSON filename (default: schedule.json)")
    parser.add_argument("--validate",       metavar="SCHEDULE_JSON",
                        help="Validate an existing schedule JSON file instead of generating one")
    parser.add_argument("--list-aos",       action="store_true",
                        help="List available AOS for the given course and exit (outputs JSON)")
    args = parser.parse_args()

    print("Loading data...")
    units_db, courses_db, aos_db = load_data()

    # ── list-aos mode ──────────────────────────────────────────────────────────
    if args.list_aos:
        groups = get_available_aos(args.course, courses_db, aos_db, campus=args.campus)
        print(json.dumps(groups, indent=2))
        return

    # ── validate-only mode ─────────────────────────────────────────────────────
    if args.validate:
        with open(args.validate) as f:
            data = json.load(f)
        sched = data.get("schedule", data) if isinstance(data, dict) else data
        # Pull course/AOS from the file itself if not overridden on CLI
        course     = args.course      or (data.get("course_code")    if isinstance(data, dict) else None)
        spec       = args.specialisation or (data.get("specialisation") if isinstance(data, dict) else None)
        major      = args.major       or (data.get("major")          if isinstance(data, dict) else None)
        minor      = args.minor       or (data.get("minor")          if isinstance(data, dict) else None)
        camp       = args.campus      or (data.get("campus")         if isinstance(data, dict) else "Clayton")
        violations = validate_schedule(
            sched, units_db,
            course_code=course, specialisation=spec, major=major, minor=minor,
            campus=camp, courses_db=courses_db, aos_db=aos_db,
        )
        if not violations:
            print(f"✓  No violations found in {args.validate}")
        else:
            print(f"✗  {len(violations)} violation(s) in {args.validate}:\n")
            for v in violations:
                loc = f" ({v['semester']})" if v.get("semester") else ""
                print(f"  [{v['type'].upper()}] {v.get('unit', v.get('source', ''))}{loc}")
                print(f"    {v['message']}")
        return

    # ── 1. compute chain lengths for every unit in the DB (once) ──────────────
    print("Computing prerequisite chain lengths for all units...")
    chain_lengths = compute_all_chain_lengths(units_db)

    # ── 2. extract units required by the student's degree / AOS choices ────────
    aos_selections = [x for x in [args.specialisation, args.major, args.minor] if x]
    print(f"Extracting required units for {args.course}"
          + (f" + {', '.join(aos_selections)}" if aos_selections else "") + "...")
    required = extract_required_units(
        args.course, aos_selections, args.campus, courses_db, aos_db,
        units_db=units_db, chain_lengths=chain_lengths,
        _aos_selections_ordered=aos_selections,
    )
    print(f"  → {len(required)} units from course/AOS requirements")

    # ── 3. add missing prerequisites ──────────────────────────────────────────
    print("Ensuring prerequisites are covered...")
    ensure_prerequisites(required, units_db, chain_lengths)
    print(f"  → {len(required)} units total (after prerequisite expansion)")

    # ── 4. build dependency graph ──────────────────────────────────────────────
    prereq_graph = build_prereq_graph(required, units_db, chain_lengths)

    # ── 5. compute unlock depths ───────────────────────────────────────────────
    print("Computing unlock depths...")
    unlock_depths = compute_unlock_depths(required, units_db, chain_lengths)

    # ── 6. schedule ───────────────────────────────────────────────────────────
    # Auto-detect standard degree length: engineering (E3xxx) = 4 years, else 3
    if args.years is not None:
        standard_years = args.years
    elif args.course.startswith("E3"):
        standard_years = 4
    else:
        standard_years = 3
    print("Scheduling units into semesters...")
    schedule = schedule_units(required, prereq_graph, chain_lengths, unlock_depths,
                              units_db, args.campus, standard_years=standard_years)

    # Pad schedule so the JSON always covers every semester of the degree
    required_sems = standard_years * 2
    while len(schedule) < required_sems:
        idx        = len(schedule)          # 0-based position
        year_num   = (idx // 2) + 1
        sem_num    = (idx % 2) + 1
        sem_label  = f"Year {year_num}, Semester {sem_num}"
        period     = "S1" if sem_num == 1 else "S2"
        prev_cum   = schedule[-1]["cumulative_cp"] if schedule else 0
        schedule.append({
            "semester":       sem_label,
            "period":         period,
            "semester_index": idx + 1,
            "extended":       None,
            "units": [
                {
                    "code":          "ELECTIVE",
                    "title":         "Free elective (student's choice)",
                    "credit_points": 6,
                    "level":         None,
                    "chain_length":  None,
                    "extended":      None,
                }
                for _ in range(4)
            ],
            "fixed_cp":      0,
            "total_cp":      24,
            "cumulative_cp": prev_cum + 24,
        })

    # ── 6. build output ────────────────────────────────────────────────────────
    course_data  = courses_db.get(args.course, {})
    total_cp     = sum(int(units_db.get(u, {}).get("credit_points") or 6) for u in required)
    scheduled_cp = sum(s["total_cp"] for s in schedule if s["period"] is not None)

    output = {
        "course_code":    args.course,
        "course_title":   course_data.get("course_title", ""),
        "specialisation": args.specialisation,
        "major":          args.major,
        "minor":          args.minor,
        "campus":         args.campus,
        "algorithm":      "longest-prerequisite-chain (DAG critical path)",
        "notes": [
            "Free electives (Part F) are NOT included — the student chooses those freely.",
            "Where a group offers unit alternatives, the algorithm picks the option with the shortest prerequisite chain.",
            "Units marked 'Unscheduled' have unresolvable prerequisite cycles or offering conflicts.",
            "cp_required constraints (minimum credit points before enrolment) are enforced.",
        ],
        "summary": {
            "total_units":    len(required),
            "total_cp":       total_cp,
            "scheduled_cp":   scheduled_cp,
            "semesters":      sum(1 for s in schedule if s["period"] is not None),
        },
        "schedule": schedule,
    }

    output_path = os.path.join(SCRIPT_DIR, args.output)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSchedule written to {output_path}")

    # ── auto-validate after generation ─────────────────────────────────────────
    violations = validate_schedule(
        schedule, units_db,
        course_code=args.course, specialisation=args.specialisation,
        major=args.major, minor=args.minor,
        campus=args.campus, courses_db=courses_db, aos_db=aos_db,
    )
    if violations:
        print(f"\n⚠  Validation — {len(violations)} violation(s):")
        for v in violations:
            loc = f" ({v['semester']})" if v.get("semester") else ""
            print(f"  [{v['type'].upper()}] {v.get('unit', v.get('source', ''))}{loc}")
            print(f"    {v['message']}")
    else:
        print("✓  Validation passed — all requisites and completion requirements satisfied")

    # ── console summary ────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  {output['course_title']} ({args.course})")
    if args.specialisation:
        sp = aos_db.get(args.specialisation, {})
        print(f"  Specialisation: {sp.get('course_title', args.specialisation)}")
    print(f"  Campus: {args.campus}")
    print(f"  Total: {len(required)} units | {total_cp} CP")
    print(f"{'='*60}")
    for sem in schedule:
        if sem["period"] is None:
            print(f"\n⚠  Unscheduled ({sem['total_cp']} CP):")
        else:
            print(f"\n{sem['semester']}  [{sem['total_cp']} CP | cumulative {sem['cumulative_cp']} CP]")
        for u in sem["units"]:
            cl = u["chain_length"]
            chain_bar = "─" * cl if cl is not None else ""
            lvl = u["level"] if u["level"] is not None else "-"
            print(f"  {u['code']:10}  L{lvl}  chain={cl} {chain_bar}  {u['title']}")


if __name__ == "__main__":
    main()