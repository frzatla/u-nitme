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
          must: [
            {
              multi_match: {
                query: q,
                fields: ["code^3", "title^2", "school"],
                fuzziness: "AUTO",
                operator: "or",
              },
            },
          ],
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
