import { NextRequest, NextResponse } from "next/server";
import { calculateUnitDifficulties } from "@/lib/unitDifficulty";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codes = (searchParams.get("codes") ?? "")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  const year = searchParams.get("year");
  const semester = searchParams.get("semester");

  if (codes.length === 0) {
    return NextResponse.json({ units: [] });
  }

  try {
    const difficultyByCode = calculateUnitDifficulties(codes, {
      year,
      semester,
    });
    return NextResponse.json({
      units: codes.map((code) => ({
        code,
        ...difficultyByCode[code],
      })),
    });
  } catch (error) {
    // console.error("Difficulty calculation error:", error);
    return NextResponse.json(
      { error: "Difficulty calculation failed" },
      { status: 500 },
    );
  }
}
