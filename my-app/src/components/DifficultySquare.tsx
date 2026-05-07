import {
  getDifficultyBand,
  getDifficultyLabel,
  type DifficultyBand,
  type DifficultyLike,
} from "@/lib/difficulty";

const squareStyles: Record<DifficultyBand, string> = {
  low: "border-emerald-500/30 bg-emerald-500",
  moderate: "border-orange-500/35 bg-orange-500",
  hard: "border-orange-600/35 bg-orange-600",
  "very-hard": "border-red-500/35 bg-red-500",
  unknown: "border-black/10 bg-black/[0.08]",
};

const filledSquares: Record<DifficultyBand, number> = {
  low: 1,
  moderate: 3,
  hard: 4,
  "very-hard": 5,
  unknown: 0,
};

const sizeStyles = {
  sm: "h-2 w-2 rounded-[2px]",
  md: "h-2.5 w-2.5 rounded-[2px]",
};

type Props = {
  unit: DifficultyLike | null | undefined;
  size?: keyof typeof sizeStyles;
};

export default function DifficultySquare({ unit, size = "md" }: Props) {
  const label = getDifficultyLabel(unit);
  const band = getDifficultyBand(unit);
  const count = filledSquares[band];

  return (
    <span
      role="img"
      aria-label={`Difficulty: ${label}`}
      title={`Difficulty: ${label}`}
      className="inline-flex flex-shrink-0 items-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < count;

        return (
          <span
            key={index}
            aria-hidden="true"
            className={`inline-block border ${
              sizeStyles[size]
            } ${filled ? squareStyles[band] : squareStyles.unknown}`}
          />
        );
      })}
    </span>
  );
}
