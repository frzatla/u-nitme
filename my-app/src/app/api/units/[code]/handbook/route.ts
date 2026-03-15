import { NextResponse } from "next/server";

// Cache the buildId at module level — valid until server restarts
let cachedBuildId: string | null = null;

async function getBuildId(): Promise<string | null> {
  if (cachedBuildId) return cachedBuildId;
  try {
    const html = await fetch("https://handbook.monash.edu/", {
      headers: { "User-Agent": "u-nitme/1.0" },
      next: { revalidate: 3600 },
    }).then((r) => r.text());

    const match = html.match(/"buildId":"([^"]+)"/);
    if (match) {
      cachedBuildId = match[1];
      return cachedBuildId;
    }
  } catch (_) {}
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(_request, { params }) {
  const { code } = await params;
  if (!code) return NextResponse.json({ error: "Unit code required" }, { status: 400 });

  const buildId = await getBuildId();
  if (!buildId) return NextResponse.json({ error: "Could not fetch handbook build ID" }, { status: 502 });

  const upper = code.toUpperCase();
  const url = `https://handbook.monash.edu/_next/data/${buildId}/2026/units/${upper}.json?year=2026&catchAll=2026&catchAll=units&catchAll=${upper}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "u-nitme/1.0" },
      next: { revalidate: 86400 },
    });

    const json = await res.json();

    // Rate limited or not found
    if (json.message || !json.pageProps?.pageContent) {
      return NextResponse.json({ error: "Unit not found in handbook" }, { status: 404 });
    }

    const pc = json.pageProps.pageContent;

    const offerings: { period: string; location: string; mode: string }[] = (pc.unit_offering ?? [])
      .filter((o: any) => o.publish === "true")
      .map((o: any) => ({
        period: o.teaching_period?.value ?? "",
        location: o.location?.value ?? "",
        mode: o.attendance_mode?.value ?? "",
      }));

    const assessments: { name: string; weight: string; type: string }[] = (pc.assessments ?? []).map(
      (a: any) => ({
        name: a.name ?? a.assessment_name ?? "",
        weight: a.weight ? `${a.weight}%` : "",
        type: a.assessment_type?.label ?? "",
      })
    );

    // Recursively extract unit code groups from nested containers
    function extractGroups(containers: any[]): { connector: string; codes: string[] }[] {
      const groups: { connector: string; codes: string[] }[] = [];
      for (const c of containers) {
        const codes = (c.relationships ?? [])
          .map((r: any) => r.academic_item?.value?.replace(/^Unit:\s*/i, "").trim())
          .filter(Boolean);
        if (codes.length) {
          groups.push({ connector: c.parent_connector?.label ?? "OR", codes });
        }
        groups.push(...extractGroups(c.containers ?? []));
      }
      return groups;
    }

    const requisites: { type: string; groups: { connector: string; codes: string[] }[] }[] = (pc.requisites ?? [])
      .filter((r: any) => r.requisite_type?.label)
      .map((r: any) => ({
        type: r.requisite_type.label,
        groups: extractGroups(r.container ?? []),
      }))
      .filter((r: any) => r.groups.length > 0)
      .filter((r: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.type === r.type) === i);

    return NextResponse.json({
      code: upper,
      title: pc.title ?? "",
      creditPoints: pc.credit_points ?? "",
      level: pc.level?.label ?? (pc.level ? `Level ${pc.level}` : ""),
      school: pc.school?.value ?? pc.academic_org?.value ?? "",
      synopsis: pc.handbook_synopsis ? stripHtml(pc.handbook_synopsis) : "",
      workload: pc.workload_requirements ? stripHtml(pc.workload_requirements) : "",
      offerings,
      assessments,
      requisites,
      handbookUrl: `https://handbook.monash.edu/2026/units/${upper}`,
    });
  } catch (err) {
    console.error("Handbook API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
