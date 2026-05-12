import { NextRequest, NextResponse } from "next/server";
import { getTypesenseClient, UNITS_COLLECTION } from "@/lib/typesense";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q     = searchParams.get("q")?.trim();
  const level = searchParams.get("level");
  const size  = Math.min(parseInt(searchParams.get("size") ?? "12"), 50);

  if (!q) return NextResponse.json({ units: [] });

  try {
    const client = getTypesenseClient();

    const params: Record<string, any> = {
      q,
      query_by:         "code,title,overview",
      query_by_weights: "6,4,2",
      num_typos:        q.length > 4 ? 2 : 1,
      prefix:           true,
      per_page:         size,
    };

    if (level) params.filter_by = `level:=${parseInt(level)}`;

    const result = await client
      .collections(UNITS_COLLECTION)
      .documents()
      .search(params);

    const units = result.hits?.map((h) => h.document) ?? [];
    return NextResponse.json({ units });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
