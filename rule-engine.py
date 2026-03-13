"""
Monash University FIT Unit Rule Engine - Layer A
=================================================
Parses prerequisite, corequisite, and prohibition rules from the handbook CSV
and builds a DAG using networkx. Given a student transcript, outputs a boolean
eligibility mask over all units.

Rule Syntax (from handbook CSV):
  - Semicolon  ;  => OR  (any one of these satisfies the requirement)
  - Ampersand  &  => AND (all groups must be satisfied)
  - Parentheses () => grouping for nested logic

Example:
  (FIT1051;FIT1045)&(FIT1008;FIT1054)
  => (FIT1051 OR FIT1045) AND (FIT1008 OR FIT1054)
"""

import re
import pandas as pd
import networkx as nx
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# 1. Data Structures
# ---------------------------------------------------------------------------

@dataclass
class UnitNode:
    """Represents a single unit in the catalog."""
    code: str
    title: str
    credit_points: int
    faculty: str
    teaching_periods: list[str]
    # Parsed rule trees (None means no requirement)
    prerequisite_tree: Optional[dict] = None
    corequisite_tree: Optional[dict] = None
    prohibition_tree: Optional[dict] = None


# ---------------------------------------------------------------------------
# 2. Rule String Parser
# ---------------------------------------------------------------------------

class RuleParser:
    """
    Converts a raw prerequisite/corequisite/prohibition string into a
    nested rule tree.

    Tree node structure:
        { "op": "AND" | "OR", "children": [ <node> | <str> ] }

    Leaf nodes are plain unit code strings e.g. "FIT1045".

    Grammar (informal):
        expr   := term  ( '&' term )*
        term   := atom  ( ';' atom )*
        atom   := '(' expr ')' | UNIT_CODE
    """

    def parse(self, rule_str: str) -> Optional[dict]:
        """Entry point. Returns None if rule_str is empty/NaN."""
        if not rule_str or pd.isna(rule_str):
            return None
        rule_str = rule_str.strip()
        if not rule_str:
            return None
        tokens = self._tokenize(rule_str)
        tree, pos = self._parse_expr(tokens, 0)
        return tree

    # -- Tokenizer -----------------------------------------------------------

    def _tokenize(self, s: str) -> list[str]:
        """Split into tokens: unit codes, '&', ';', '(', ')'."""
        # Unit codes: letters + digits (e.g. FIT1045, MTH2025, ENG1003)
        token_pattern = re.compile(r'[A-Z]{2,4}\d{4}|[&;()]')
        return token_pattern.findall(s.upper())

    # -- Recursive Descent Parser --------------------------------------------

    def _parse_expr(self, tokens: list[str], pos: int) -> tuple[dict | str, int]:
        """
        expr := term ( '&' term )*
        AND node if multiple terms, otherwise collapse to single child.
        """
        children = []
        node, pos = self._parse_term(tokens, pos)
        children.append(node)

        while pos < len(tokens) and tokens[pos] == '&':
            pos += 1  # consume '&'
            node, pos = self._parse_term(tokens, pos)
            children.append(node)

        if len(children) == 1:
            return children[0], pos
        return {"op": "AND", "children": children}, pos

    def _parse_term(self, tokens: list[str], pos: int) -> tuple[dict | str, int]:
        """
        term := atom ( ';' atom )*
        OR node if multiple atoms, otherwise collapse to single child.
        """
        children = []
        node, pos = self._parse_atom(tokens, pos)
        children.append(node)

        while pos < len(tokens) and tokens[pos] == ';':
            pos += 1  # consume ';'
            node, pos = self._parse_atom(tokens, pos)
            children.append(node)

        if len(children) == 1:
            return children[0], pos
        return {"op": "OR", "children": children}, pos

    def _parse_atom(self, tokens: list[str], pos: int) -> tuple[dict | str, int]:
        """
        atom := '(' expr ')' | UNIT_CODE
        """
        if pos >= len(tokens):
            raise ValueError(f"Unexpected end of token stream at position {pos}")

        tok = tokens[pos]

        if tok == '(':
            pos += 1  # consume '('
            node, pos = self._parse_expr(tokens, pos)
            if pos >= len(tokens) or tokens[pos] != ')':
                raise ValueError(f"Expected ')' at position {pos}, got {tokens[pos] if pos < len(tokens) else 'EOF'}")
            pos += 1  # consume ')'
            return node, pos

        # Must be a unit code leaf
        if re.match(r'^[A-Z]{2,4}\d{4}$', tok):
            return tok, pos + 1

        raise ValueError(f"Unexpected token '{tok}' at position {pos}")


# ---------------------------------------------------------------------------
# 3. Rule Evaluator
# ---------------------------------------------------------------------------

class RuleEvaluator:
    """
    Evaluates a parsed rule tree against a student's completed/enrolled units.
    """

    def evaluate(self, tree: Optional[dict | str], completed: set[str]) -> bool:
        """Returns True if the rule tree is satisfied by completed units."""
        if tree is None:
            return True  # No rule = always satisfied

        # Leaf node: plain unit code string
        if isinstance(tree, str):
            return tree in completed

        op = tree["op"]
        children = tree["children"]

        if op == "AND":
            return all(self.evaluate(child, completed) for child in children)
        elif op == "OR":
            return any(self.evaluate(child, completed) for child in children)

        raise ValueError(f"Unknown operator: {op}")

    def get_all_codes(self, tree: Optional[dict | str]) -> set[str]:
        """Recursively extract all unit codes referenced in a rule tree."""
        if tree is None:
            return set()
        if isinstance(tree, str):
            return {tree}
        codes = set()
        for child in tree["children"]:
            codes |= self.get_all_codes(child)
        return codes


# ---------------------------------------------------------------------------
# 4. DAG Builder
# ---------------------------------------------------------------------------

class HandbookDAG:
    """
    Builds a Directed Acyclic Graph (DAG) from the unit catalog.
    Edge direction: prerequisite -> unit  (i.e. must complete source before target)
    """

    def __init__(self):
        self.graph = nx.DiGraph()

    def build(self, units: dict[str, UnitNode]):
        """Populate the DAG from a dict of UnitNode objects."""
        evaluator = RuleEvaluator()

        # Add all unit nodes first
        for code, unit in units.items():
            self.graph.add_node(code, unit=unit)

        # Add prerequisite edges
        for code, unit in units.items():
            if unit.prerequisite_tree is not None:
                prereq_codes = evaluator.get_all_codes(unit.prerequisite_tree)
                for prereq in prereq_codes:
                    # Add ghost node if prereq is outside FIT catalog (e.g. MTH units)
                    if prereq not in self.graph:
                        self.graph.add_node(prereq, unit=None, ghost=True)
                    self.graph.add_edge(prereq, code, relation="prerequisite")

            if unit.corequisite_tree is not None:
                coreq_codes = evaluator.get_all_codes(unit.corequisite_tree)
                for coreq in coreq_codes:
                    if coreq not in self.graph:
                        self.graph.add_node(coreq, unit=None, ghost=True)
                    self.graph.add_edge(coreq, code, relation="corequisite")

    def get_prerequisites(self, unit_code: str) -> list[str]:
        """Return direct prerequisite unit codes for a given unit."""
        return [
            src for src, _, data in self.graph.in_edges(unit_code, data=True)
            if data.get("relation") == "prerequisite"
        ]

    def get_corequisites(self, unit_code: str) -> list[str]:
        """Return direct corequisite unit codes for a given unit."""
        return [
            src for src, _, data in self.graph.in_edges(unit_code, data=True)
            if data.get("relation") == "corequisite"
        ]


# ---------------------------------------------------------------------------
# 5. Rule Engine (Main Interface)
# ---------------------------------------------------------------------------

class RuleEngine:
    """
    Main Layer A interface.

    Usage:
        engine = RuleEngine("handbook.csv")
        mask = engine.get_eligibility_mask(
            completed=["FIT1045", "FIT1008"],
            enrolled=["FIT2004"]          # currently enrolled (for coreqs)
        )
        # mask is a dict: { unit_code: bool }
    """

    def __init__(self, csv_path: str):
        self.parser = RuleParser()
        self.evaluator = RuleEvaluator()
        self.units: dict[str, UnitNode] = {}
        self.dag = HandbookDAG()
        self._load(csv_path)
        self.dag.build(self.units)

    def _load(self, csv_path: str):
        """Load and parse the handbook CSV into UnitNode objects."""
        df = pd.read_csv(csv_path, dtype=str)
        df.columns = df.columns.str.strip()

        for _, row in df.iterrows():
            code = str(row.get("unit_code", "")).strip()
            if not code:
                continue

            # Only include FIT units in the primary catalog
            # Non-FIT units referenced in prerequisites become ghost nodes in the DAG
            unit = UnitNode(
                code=code,
                title=str(row.get("title", "")).strip(),
                credit_points=int(row.get("credit_points", 6)),
                faculty=str(row.get("faculty", "")).strip(),
                teaching_periods=[
                    p.strip() for p in str(row.get("teaching_periods", "")).split(";")
                ],
                prerequisite_tree=self.parser.parse(row.get("prerequisites")),
                corequisite_tree=self.parser.parse(row.get("corequisites")),
                prohibition_tree=self.parser.parse(row.get("prohibitions")),
            )
            self.units[code] = unit

    def get_eligibility_mask(
        self,
        completed: list[str],
        enrolled: list[str] | None = None,
        completed_credit_points: int = 0,
    ) -> dict[str, bool]:
        """
        Core output method. Returns a boolean eligibility mask over all FIT units.

        Parameters
        ----------
        completed : list[str]
            Unit codes the student has already passed.
        enrolled : list[str], optional
            Unit codes the student is currently enrolled in this period
            (used for corequisite checking).
        completed_credit_points : int
            Total credit points completed (for threshold-based prerequisites).

        Returns
        -------
        dict[str, bool]
            { unit_code: True/False } for every unit in the FIT catalog.
            True  = student is eligible to enrol.
            False = student is blocked (prereq not met, prohibited, already done).
        """
        completed_set = set(c.strip().upper() for c in completed)
        enrolled_set = set(e.strip().upper() for e in (enrolled or []))

        # For corequisite checks: student must have completed OR be currently enrolled
        available_set = completed_set | enrolled_set

        mask = {}

        for code, unit in self.units.items():

            # --- Already completed: not eligible to re-enrol ---
            if code in completed_set:
                mask[code] = False
                continue

            # --- Currently enrolled: skip ---
            if code in enrolled_set:
                mask[code] = False
                continue

            # --- Prohibition check ---
            # If any prohibited unit has been completed, block this unit
            if unit.prohibition_tree is not None:
                if self.evaluator.evaluate(unit.prohibition_tree, completed_set):
                    mask[code] = False
                    continue

            # --- Prerequisite check ---
            # Must be satisfied by completed units only
            if unit.prerequisite_tree is not None:
                if not self.evaluator.evaluate(unit.prerequisite_tree, completed_set):
                    mask[code] = False
                    continue

            # --- Corequisite check ---
            # Must be satisfied by completed OR currently enrolled units
            if unit.corequisite_tree is not None:
                if not self.evaluator.evaluate(unit.corequisite_tree, available_set):
                    mask[code] = False
                    continue

            # --- All checks passed ---
            mask[code] = True

        return mask

    def get_eligible_units(
        self,
        completed: list[str],
        enrolled: list[str] | None = None,
    ) -> list[str]:
        """Convenience method: returns only the eligible unit codes as a sorted list."""
        mask = self.get_eligibility_mask(completed, enrolled)
        return sorted(code for code, eligible in mask.items() if eligible)

    def explain(self, unit_code: str, completed: list[str], enrolled: list[str] | None = None) -> dict:
        """
        Debug utility: explains why a unit is eligible or blocked for a student.

        Returns a dict with keys:
            eligible        bool
            prereq_met      bool
            coreq_met       bool
            prohibition_hit bool
            already_done    bool
            notes           str
        """
        code = unit_code.strip().upper()
        completed_set = set(c.strip().upper() for c in completed)
        enrolled_set = set(e.strip().upper() for e in (enrolled or []))
        available_set = completed_set | enrolled_set

        if code not in self.units:
            return {"eligible": False, "notes": f"{code} not found in FIT catalog"}

        unit = self.units[code]

        already_done = code in completed_set
        currently_enrolled = code in enrolled_set

        prohibition_hit = (
            unit.prohibition_tree is not None
            and self.evaluator.evaluate(unit.prohibition_tree, completed_set)
        )
        prereq_met = (
            unit.prerequisite_tree is None
            or self.evaluator.evaluate(unit.prerequisite_tree, completed_set)
        )
        coreq_met = (
            unit.corequisite_tree is None
            or self.evaluator.evaluate(unit.corequisite_tree, available_set)
        )

        eligible = (
            not already_done
            and not currently_enrolled
            and not prohibition_hit
            and prereq_met
            and coreq_met
        )

        notes_parts = []
        if already_done:
            notes_parts.append("Already completed.")
        if currently_enrolled:
            notes_parts.append("Currently enrolled.")
        if prohibition_hit:
            notes_parts.append("Blocked by prohibition rule.")
        if not prereq_met:
            notes_parts.append(f"Prerequisites not satisfied. Tree: {unit.prerequisite_tree}")
        if not coreq_met:
            notes_parts.append(f"Corequisites not satisfied. Tree: {unit.corequisite_tree}")
        if eligible:
            notes_parts.append("All checks passed — eligible.")

        return {
            "eligible": eligible,
            "prereq_met": prereq_met,
            "coreq_met": coreq_met,
            "prohibition_hit": prohibition_hit,
            "already_done": already_done,
            "notes": " ".join(notes_parts),
        }

    def summary(self) -> dict:
        """Returns basic stats about the loaded catalog."""
        ghost_nodes = [
            n for n, d in self.dag.graph.nodes(data=True)
            if d.get("ghost", False)
        ]
        return {
            "total_fit_units": len(self.units),
            "total_dag_nodes": self.dag.graph.number_of_nodes(),
            "total_dag_edges": self.dag.graph.number_of_edges(),
            "ghost_nodes": ghost_nodes,  # non-FIT units referenced as prerequisites
        }


# ---------------------------------------------------------------------------
# 6. Quick Test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    csv_path = sys.argv[1] if len(sys.argv) > 1 else "handbook.csv"

    print(f"Loading handbook from: {csv_path}\n")
    engine = RuleEngine(csv_path)

    stats = engine.summary()
    print("=== Catalog Summary ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")

    print("\n=== Eligibility Test ===")
    completed = ["FIT1045", "FIT1051", "FIT1008"]
    enrolled = []

    print(f"  Completed : {completed}")
    print(f"  Enrolled  : {enrolled}")

    eligible = engine.get_eligible_units(completed, enrolled)
    print(f"\n  Eligible units ({len(eligible)}):")
    for u in eligible:
        print(f"    {u} — {engine.units[u].title}")

    print("\n=== Explain Specific Units ===")
    for test_unit in ["FIT2014", "FIT2081", "FIT2099", "FIT1061"]:
        result = engine.explain(test_unit, completed, enrolled)
        status = "✓ ELIGIBLE" if result["eligible"] else "✗ BLOCKED"
        print(f"  {test_unit}: {status} | {result['notes']}")