export type DifficultyLike = {
  difficulty_score?: number | null;
  difficulty_level?: string | null;
  difficultyScore?: number | null;
  difficultyLevel?: string | null;
  difficulty?: {
    score?: number | null;
    level?: string | null;
  } | null;
};

export type DifficultyBand =
  | "low"
  | "moderate"
  | "hard"
  | "very-hard"
  | "unknown";

function getDifficultyLevel(unit: DifficultyLike | null | undefined) {
  return (
    unit?.difficulty_level ??
    unit?.difficultyLevel ??
    unit?.difficulty?.level ??
    null
  );
}

function getDifficultyScore(unit: DifficultyLike | null | undefined) {
  return (
    unit?.difficulty_score ??
    unit?.difficultyScore ??
    unit?.difficulty?.score ??
    null
  );
}

export function getDifficultyBand(
  unit: DifficultyLike | null | undefined,
): DifficultyBand {
  if (!unit) return "unknown";

  const level = getDifficultyLevel(unit)?.trim().toLowerCase() ?? "";
  if (level === "very hard" || level === "v hard") return "very-hard";
  if (level === "hard") return "hard";
  if (level === "moderate" || level === "medium") return "moderate";
  if (level === "low" || level === "easy") return "low";

  const score = getDifficultyScore(unit);
  if (typeof score !== "number") return "unknown";
  if (score >= 75) return "very-hard";
  if (score >= 60) return "hard";
  if (score >= 42) return "moderate";
  return "low";
}

export function getDifficultyLabel(unit: DifficultyLike | null | undefined) {
  if (!unit) return "Not calculated";

  const level = getDifficultyLevel(unit);
  const score = getDifficultyScore(unit);

  if (level && typeof score === "number") return `${level} (${score}/100)`;
  if (level) return level;
  if (typeof score === "number") return `${score}/100`;
  return "Not calculated";
}
