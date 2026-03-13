import { NextResponse } from "next/server";

const USER_AGENT = "u-nitme/1.0 (hackathon project)";

export const revalidate = 3600; // cache for 1 hour

export async function GET(request, { params }) {
  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: "Unit code required" }, { status: 400 });
  }

  // Extract just the number part as a fallback query (e.g. "FIT2004" → "2004")
  const numericPart = code.replace(/[^0-9]/g, "");
  const query = numericPart.length >= 3 ? `${code} OR ${numericPart}` : code;

  const url = new URL("https://www.reddit.com/r/Monash/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("restrict_sr", "1");
  url.searchParams.set("sort", "top");
  url.searchParams.set("t", "all");
  url.searchParams.set("type", "link");
  url.searchParams.set("limit", "15");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Reddit request failed", status: res.status },
        { status: 502 }
      );
    }

    const json = await res.json();
    const posts = json?.data?.children ?? [];

    const reviews = posts
      .map((child) => {
        const p = child.data;
        return {
          title: p.title,
          url: `https://www.reddit.com${p.permalink}`,
          score: p.score,
          numComments: p.num_comments,
          subreddit: p.subreddit,
        };
      })
      // Filter to posts that actually mention the unit code or numeric part
      .filter((p) => {
        const titleLower = p.title.toLowerCase();
        return (
          titleLower.includes(code.toLowerCase()) ||
          (numericPart.length >= 3 && titleLower.includes(numericPart))
        );
      });

    return NextResponse.json(reviews);
  } catch (err) {
    console.error("Reddit fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
