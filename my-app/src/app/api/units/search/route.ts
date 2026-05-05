import { NextRequest, NextResponse } from "next/server";
import { getElasticsearchClient, UNITS_INDEX } from "@/lib/elasticsearch";
import { calculateUnitDifficulties } from "@/lib/unitDifficulty";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const level = searchParams.get("level");
  const year = searchParams.get("year");
  const semester = searchParams.get("semester");
  const size = Math.min(parseInt(searchParams.get("size") ?? "12"), 50);

  if (!q) return NextResponse.json({ units: [] });

  try {
    const client = getElasticsearchClient();

    const filter: object[] = [];
    if (level) filter.push({ term: { level: parseInt(level) } });

    const result = await client.search({
      index: UNITS_INDEX,
      size,
      query: {
        bool: {
          should: [
            // Prefix on code keyword: "FIT" → FIT1008, FIT2004, etc.
            { prefix: { code: { value: q.toUpperCase(), boost: 5 } } },
            // Exact code match (e.g. "FIT1008")
            { term:   { code: { value: q.toUpperCase(), boost: 6 } } },
            // Full-text fuzzy search on title (e.g. "algorithms", "data science")
            { match:  { title: { query: q, fuzziness: "AUTO", boost: 2 } } },
            // Phrase prefix on title for partial words (e.g. "intro to prog")
            { match_phrase_prefix: { title: { query: q, boost: 1 } } },
          ],
          minimum_should_match: 1,
          filter,
        },
      },
    });

    const searchUnits = result.hits.hits.map((hit) => hit._source as any);
    const difficultyByCode = calculateUnitDifficulties(
      searchUnits.map((unit) => String(unit.code || "")),
      { year, semester },
    );

    const units = searchUnits.map((unit) => {
      const code = String(unit.code || "").trim().toUpperCase();
      return {
        ...unit,
        ...difficultyByCode[code],
      };
    });
    return NextResponse.json({ units });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
