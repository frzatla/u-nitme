import { NextRequest, NextResponse } from "next/server";
import { getElasticsearchClient, UNITS_INDEX } from "@/lib/elasticsearch";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const level = searchParams.get("level");
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

    const units = result.hits.hits.map((hit) => hit._source);
    return NextResponse.json({ units });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
