type DifficultyLike = {
  difficulty_score?: number | null;
  difficulty_level?: string | null;
  difficultyScore?: number | null;
  difficultyLevel?: string | null;
  difficulty?: {
    score?: number | null;
    level?: string | null;
  } | null;
};

export function getDifficultyLabel(unit: DifficultyLike | null | undefined) {
  if (!unit) return "Not calculated";

  const level =
    unit.difficulty_level ??
    unit.difficultyLevel ??
    unit.difficulty?.level ??
    null;

  const score =
    unit.difficulty_score ??
    unit.difficultyScore ??
    unit.difficulty?.score ??
    null;

  if (level && typeof score === "number") return `${level} (${score}/100)`;
  if (level) return level;
  if (typeof score === "number") return `${score}/100`;
  return "Not calculated";
}
