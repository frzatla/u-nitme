#!/usr/bin/env python3
"""
add_aos.py — augment an existing schedule with an additional AOS (minor/major).

Given a plan dict produced by algo1.py and a new AOS code, slot the new AOS's
required units (plus any prerequisite units they pull in) into the existing
schedule. ELECTIVE placeholders are consumed first; if that's not enough,
original units are shifted (forward or backward) to make room, with the goal
of minimising disruption to the original placement.

The schedule is NEVER extended beyond its existing length — if the new units
won't fit, ValueError is raised with a list of the units that couldn't be
placed and the reason.
"""

import copy
from collections import defaultdict

# Re-use helpers from algo1 — these are the same functions the original
# scheduler uses, so the new units obey the same rules.
from algo1 import (
    MAX_UNITS_PER_SEM,
    extract_required_units,
    ensure_prerequisites,
    compute_all_chain_lengths,
    compute_unlock_depths,
    compute_latest_starts,
    build_prereq_graph,
    get_offered_semesters,
)


# ─── helpers ─────────────────────────────────────────────────────────────────

def _real_units_in_sem(sem):
    """Yield (slot_index, unit_dict) for every non-ELECTIVE unit in a semester."""
    for i, u in enumerate(sem.get("units", [])):
        if u["code"] != "ELECTIVE":
            yield i, u


def _elective_slots_in_sem(sem):
    """Yield slot indices that are currently ELECTIVE placeholders."""
    for i, u in enumerate(sem.get("units", [])):
        if u["code"] == "ELECTIVE":
            yield i


def _make_unit_entry(code, units_db, chain_lengths, extended):
    """Build a unit dict in the same shape schedule_units produces."""
    ud = units_db.get(code, {})
    return {
        "code":          code,
        "title":         ud.get("title", ""),
        "credit_points": int(ud.get("credit_points") or 6),
        "level":         ud.get("level", 1),
        "chain_length":  chain_lengths.get(code, 0),
        "extended":      True if extended else None,
    }


def _make_elective_entry(extended):
    return {
        "code":          "ELECTIVE",
        "title":         "Free elective (student's choice)",
        "credit_points": 6,
        "level":         None,
        "chain_length":  None,
        "extended":      True if extended else None,
    }


def _recalc_cp(schedule):
    """Recompute fixed_cp / total_cp / cumulative_cp for every semester in place."""
    cumulative = 0
    for sem in schedule:
        if sem.get("period") is None:  # 'Unscheduled' bucket
            continue
        fixed = sum(u["credit_points"] for u in sem["units"] if u["code"] != "ELECTIVE")
        total = sum(u["credit_points"] for u in sem["units"])
        cumulative += total
        sem["fixed_cp"]      = fixed
        sem["total_cp"]      = total
        sem["cumulative_cp"] = cumulative


def _placement_ok(code, sem_idx, schedule, completed_by_sem, units_db, campus,
                  prereq_graph):
    """
    Can `code` be placed in semester `sem_idx`?

    Checks:
      - offered this semester
      - all prereqs (per prereq_graph) completed in earlier semesters
      - cp_required + level CP floor satisfied by cumulative CP entering this sem
    """
    sem = schedule[sem_idx]
    if sem.get("period") is None:
        return False

    # offered?
    offered = get_offered_semesters(code, units_db, campus)
    if sem["period"] not in offered:
        return False

    # prereqs all in earlier semesters?
    prior_completed = completed_by_sem[sem_idx]
    if not prereq_graph.get(code, set()).issubset(prior_completed):
        return False

    # cp floor
    ud = units_db.get(code, {})
    cp_needed = (ud.get("requisites") or {}).get("cp_required", 0) or 0
    level     = ud.get("level") or 1
    floor     = {2: 48, 3: 96}.get(level, 0)
    cp_before = sum(s["total_cp"] for s in schedule[:sem_idx]
                    if s.get("period") is not None)
    if cp_before < max(cp_needed, floor):
        return False

    return True


def _build_completed_by_sem(schedule):
    """Return list[set] where index i = set of unit codes completed BEFORE sem i."""
    completed = set()
    out = []
    for sem in schedule:
        if sem.get("period") is None:
            out.append(set(completed))
            continue
        out.append(set(completed))
        for u in sem["units"]:
            if u["code"] != "ELECTIVE":
                completed.add(u["code"])
    return out


# ─── core: place one unit into the schedule ──────────────────────────────────

def _try_place_in_elective(code, schedule, units_db, campus, prereq_graph,
                           chain_lengths):
    """
    Try to place `code` by replacing an ELECTIVE in the earliest valid semester.

    Returns (sem_idx, slot_idx) if successful, else None.
    """
    completed_by_sem = _build_completed_by_sem(schedule)
    candidates = []
    for sem_idx, sem in enumerate(schedule):
        if sem.get("period") is None:
            continue
        if not list(_elective_slots_in_sem(sem)):
            continue
        if not _placement_ok(code, sem_idx, schedule, completed_by_sem,
                              units_db, campus, prereq_graph):
            continue
        candidates.append(sem_idx)

    if not candidates:
        return None

    # Earliest valid semester — keeps the schedule tight and gives downstream
    # units the most room.
    sem_idx  = min(candidates)
    slot_idx = next(_elective_slots_in_sem(schedule[sem_idx]))
    extended = schedule[sem_idx].get("extended") is True
    schedule[sem_idx]["units"][slot_idx] = _make_unit_entry(
        code, units_db, chain_lengths, extended
    )
    return sem_idx, slot_idx


def _try_place_with_swap(code, schedule, units_db, campus, prereq_graph,
                         chain_lengths, locked):
    """
    Try to fit `code` somewhere by swapping with an existing unit.

    For each semester where `code` is otherwise valid (offered, prereqs met,
    CP floor met) but every slot is full of real units:
      - try moving each real unit in that semester to a different semester
        (preferring closest semester, then any ELECTIVE slot, then a swap chain)
      - score the swap by |target_sem - current_sem| of the displaced unit
      - pick the lowest-scoring valid swap

    `locked` is a set of codes that must NOT move (the units we've already
    successfully placed in this run, so we don't undo our own work).

    Returns (sem_idx, slot_idx) if successful, else None.
    """
    completed_by_sem = _build_completed_by_sem(schedule)

    best = None  # (disruption, sem_idx, slot_idx, displaced_code, target_sem_idx)

    for sem_idx, sem in enumerate(schedule):
        if sem.get("period") is None:
            continue
        if not _placement_ok(code, sem_idx, schedule, completed_by_sem,
                              units_db, campus, prereq_graph):
            continue
        # already covered by elective pass — skip
        if list(_elective_slots_in_sem(sem)):
            continue

        # try evicting each real unit in this semester
        for slot_idx, displaced in _real_units_in_sem(sem):
            d_code = displaced["code"]
            if d_code in locked:
                continue

            # simulate: pretend `code` takes this slot, find a new home for d_code
            sim = copy.deepcopy(schedule)
            sim[sem_idx]["units"][slot_idx] = _make_unit_entry(
                code, units_db, chain_lengths,
                sim[sem_idx].get("extended") is True
            )
            # re-derive completion sets after the swap
            sim_completed = _build_completed_by_sem(sim)

            # find every semester where d_code could legally land, EXCLUDING
            # its old slot (we just put `code` there)
            for target_idx, target_sem in enumerate(sim):
                if target_idx == sem_idx:
                    continue
                if target_sem.get("period") is None:
                    continue
                if not list(_elective_slots_in_sem(target_sem)):
                    continue
                if not _placement_ok(d_code, target_idx, sim, sim_completed,
                                      units_db, campus, prereq_graph):
                    continue
                # also: the target placement must not break downstream units
                # that depend on d_code (they must still come after target_idx)
                if not _downstream_still_ok(d_code, target_idx, sim,
                                             units_db, campus, prereq_graph):
                    continue

                # disruption score: how far did we move d_code?
                disruption = abs(target_idx - sem_idx)
                if best is None or disruption < best[0]:
                    best = (disruption, sem_idx, slot_idx, d_code, target_idx)

    if best is None:
        return None

    _, sem_idx, slot_idx, d_code, target_idx = best

    # commit the swap
    extended = schedule[sem_idx].get("extended") is True
    new_entry = _make_unit_entry(code, units_db, chain_lengths, extended)
    displaced_entry = schedule[sem_idx]["units"][slot_idx]
    schedule[sem_idx]["units"][slot_idx] = new_entry

    # put d_code into the first ELECTIVE slot of target_idx
    target_slot = next(_elective_slots_in_sem(schedule[target_idx]))
    target_extended = schedule[target_idx].get("extended") is True
    # update the displaced unit's extended flag to match its new home
    displaced_entry = dict(displaced_entry)
    displaced_entry["extended"] = True if target_extended else None
    schedule[target_idx]["units"][target_slot] = displaced_entry

    return sem_idx, slot_idx


def _downstream_still_ok(code, new_sem_idx, schedule, units_db, campus,
                          prereq_graph):
    """
    If we move `code` to new_sem_idx, do all units that depend on `code`
    still come AFTER it?
    """
    for sem_idx, sem in enumerate(schedule):
        if sem.get("period") is None:
            continue
        for u in sem.get("units", []):
            if u["code"] == "ELECTIVE":
                continue
            if code in prereq_graph.get(u["code"], set()):
                if sem_idx <= new_sem_idx:
                    return False
    return True


# ─── main entry point ────────────────────────────────────────────────────────

def add_aos_to_plan(plan, new_aos_code, aos_role, units_db, courses_db, aos_db):
    """
    Add a new AOS (specialisation/major/minor) to an existing plan.

    Parameters
    ----------
    plan : dict
        Full output dict from algo1.py — must contain 'course_code', 'campus',
        'schedule', and the existing AOS fields.
    new_aos_code : str
        The AOS code to add (e.g. 'COMPUTSC02').
    aos_role : str
        One of 'specialisation', 'major', 'minor' — which slot in the plan
        dict to update.
    units_db, courses_db, aos_db : dict
        The same three databases algo1 uses.

    Returns
    -------
    dict
        Updated plan (same object, mutated and returned).

    Raises
    ------
    ValueError
        If the new AOS's units (after deduplication and prereq expansion)
        cannot all fit into the existing schedule's ELECTIVE slots and
        permissible swaps.
    """
    if aos_role not in ("specialisation", "major", "minor"):
        raise ValueError(f"aos_role must be specialisation/major/minor, got {aos_role!r}")
    if new_aos_code not in aos_db:
        raise ValueError(f"AOS {new_aos_code!r} not in database")

    schedule = plan["schedule"]
    campus   = plan.get("campus", "Clayton")
    course   = plan["course_code"]

    # ── 1. figure out what's already in the schedule ──────────────────────────
    already_scheduled = set()
    for sem in schedule:
        if sem.get("period") is None:
            continue
        for u in sem["units"]:
            if u["code"] != "ELECTIVE":
                already_scheduled.add(u["code"])

    # ── 2. extract the new AOS's required units ───────────────────────────────
    # Build the full AOS-selection list the plan currently has, plus the new one,
    # so extract_required_units's OR-branch heuristics still pick the right
    # specialisation-flavoured options where ambiguous.
    existing_aoses = [plan.get(r) for r in ("specialisation", "major", "minor")
                      if plan.get(r)]
    combined_aoses = existing_aoses + [new_aos_code]

    # Compute chain lengths once over the whole units DB (used by helpers)
    chain_lengths = compute_all_chain_lengths(units_db)

    # Run the same extraction the main scheduler uses, but only collect the new
    # AOS's units by diffing against what we already had.
    new_required = extract_required_units(
        course, [new_aos_code], campus, courses_db, aos_db,
        units_db=units_db, chain_lengths=chain_lengths,
        _aos_selections_ordered=combined_aoses,
    )
    # subtract anything already covered
    new_required -= already_scheduled

    # ── 3. expand prereqs over the COMBINED set ───────────────────────────────
    combined = set(already_scheduled) | set(new_required)
    ensure_prerequisites(combined, units_db, chain_lengths)
    # any prereqs added by the expansion that weren't already scheduled go into
    # the to-place pile too
    new_required = combined - already_scheduled

    if not new_required:
        # nothing to do — the new AOS is fully covered already
        plan[aos_role] = new_aos_code
        return plan

    # ── 4. build prereq graph + sort key over the combined set ────────────────
    prereq_graph  = build_prereq_graph(combined, units_db, chain_lengths)
    unlock_depths = compute_unlock_depths(combined, units_db, chain_lengths)
    # latest_starts uses the same horizon as the original run — derive from
    # the schedule length
    required_sems = sum(1 for s in schedule if s.get("period") is not None)
    latest_starts = compute_latest_starts(combined, units_db, required_sems)

    # ── 5. order the new units by the same five-key sort algo1 uses ──────────
    def _sort_key(u):
        return (
            latest_starts.get(u, required_sems - 1),
            -unlock_depths.get(u, 0),
            -chain_lengths.get(u, 0),
            len(get_offered_semesters(u, units_db, campus)),
            u,
        )

    to_place = sorted(new_required, key=_sort_key)

    # ── 6. place each unit ────────────────────────────────────────────────────
    placed   = set()
    failures = []  # (code, reason)

    for code in to_place:
        # first try elective-only placement (zero disruption)
        result = _try_place_in_elective(code, schedule, units_db, campus,
                                         prereq_graph, chain_lengths)
        if result is not None:
            placed.add(code)
            _recalc_cp(schedule)
            continue

        # then try swap-based placement
        result = _try_place_with_swap(code, schedule, units_db, campus,
                                       prereq_graph, chain_lengths,
                                       locked=placed)
        if result is not None:
            placed.add(code)
            _recalc_cp(schedule)
            continue

        # try diagnose why
        # (run a relaxed check to give the user useful info)
        offered = sorted(get_offered_semesters(code, units_db, campus))
        missing_prereqs = prereq_graph.get(code, set()) - already_scheduled - placed
        reason_parts = []
        if missing_prereqs:
            reason_parts.append(f"unmet prereqs: {sorted(missing_prereqs)}")
        if not offered:
            reason_parts.append("not offered at this campus")
        else:
            reason_parts.append(f"offered in {offered} but no slot available")
        failures.append((code, "; ".join(reason_parts)))

    if failures:
        msg = f"Cannot fit {len(failures)} unit(s) from {new_aos_code} into schedule:\n"
        for code, reason in failures:
            msg += f"  - {code}: {reason}\n"
        raise ValueError(msg.rstrip())

    # ── 7. update plan metadata ──────────────────────────────────────────────
    plan[aos_role] = new_aos_code

    # refresh summary numbers
    real_codes = {u["code"] for s in schedule if s.get("period")
                  for u in s["units"] if u["code"] != "ELECTIVE"}
    plan["summary"] = {
        "total_units":   len(real_codes),
        "total_cp":      sum(int(units_db.get(c, {}).get("credit_points") or 6)
                              for c in real_codes),
        "scheduled_cp":  sum(s["total_cp"] for s in schedule if s.get("period")),
        "semesters":     sum(1 for s in schedule if s.get("period")),
    }

    return plan