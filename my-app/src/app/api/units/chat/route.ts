import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getElasticsearchClient, UNITS_INDEX } from "@/lib/elasticsearch";
import { redis, chatKey, CHAT_TTL, StoredMessage } from "@/lib/redis";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

type PlanUnit = { code: string; name: string; level: string };

// ── Elasticsearch unit search ─────────────────────────────────────────────────

function formatHits(hits: any[]): string {
  return hits
    .map((h) => {
      const s = h._source as Record<string, unknown>;
      const assessments = Array.isArray(s.assessments) && s.assessments.length
        ? `\n    Assessments: ${(s.assessments as string[]).join(", ")}`
        : "";
      const overview = s.overview
        ? `\n    Overview: ${s.overview}`
        : "";
      const prerequisites = s.prerequisites
        ? `\n    Prerequisites: ${s.prerequisites}`
        : "";
      return `${s.code} (L${s.level}, ${s.credit_points} CP): ${s.title} — ${s.school}${prerequisites}${assessments}${overview}`;
    })
    .join("\n");
}

async function searchUnits(query: string): Promise<string> {
  const client = getElasticsearchClient();

  // If the message mentions specific unit codes (e.g. BEX1008), always fetch them first
  const mentionedCodes = [...query.matchAll(/\b([A-Z]{2,4}\d{4})\b/g)].map((m) => m[1]);

  if (mentionedCodes.length > 0) {
    const exactResult = await client.search({
      index: UNITS_INDEX,
      size: mentionedCodes.length,
      query: { terms: { code: mentionedCodes } },
    });
    const exactHits = exactResult.hits.hits;
    const exactIds = new Set(exactHits.map((h) => h._id));

    // Supplement with keyword results to fill context, but always keep the exact hits
    const supplemental = await client.search({
      index: UNITS_INDEX,
      size: 6,
      query: { multi_match: { query, fields: ["title^2", "overview^1.5", "school"], fuzziness: "AUTO" } },
    });
    const extra = supplemental.hits.hits.filter((h) => !exactIds.has(h._id));
    return formatHits([...exactHits, ...extra].slice(0, 8));
  }

  // No specific unit mentioned — keyword search on the topic
  const targeted = await client.search({
    index: UNITS_INDEX,
    size: 8,
    query: {
      multi_match: {
        query,
        fields: ["code^3", "title^2", "overview^1.5", "school"],
        fuzziness: "AUTO",
      },
    },
  });

  if (targeted.hits.hits.length >= 3) return formatHits(targeted.hits.hits);

  // Vague query with no good matches — broad fallback so the model always has context
  const broad = await client.search({
    index: UNITS_INDEX,
    size: 8,
    query: { match_all: {} },
  });
  return formatHits(broad.hits.hits);
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You're a friendly uni advisor helping Monash students pick free electives. Think of yourself as a helpful senior student who knows the course catalogue really well.

Keep it real and casual — you're talking to uni students, not writing a formal report. Short sentences, friendly tone, maybe a touch of enthusiasm when a unit is genuinely cool.

What you do:
- Suggest free elective units that fit what the student's interested in
- Point out if anything needs a prerequisite so they don't get caught off guard
- Keep recommendations short and punchy — unit code, level, title, and a one-liner on why it's worth it
- When a unit has assessment info, briefly mention the format (e.g. "assessed via exam + assignments")

Prerequisites are the PRIMARY requirement — always read and report them accurately:
- Every unit in the list has a "Prerequisites" line — read it carefully before recommending
- "None" means no specific subject prerequisites (but level-year guidance below may still apply)
- When prerequisites are listed (e.g. "BEX1008 OR BEX1014"), tell the student exactly what they need
- NEVER say a unit has no prerequisites if the Prerequisites field lists specific units

Level-year guidance (soft recommendation, NOT a hard rule — prerequisites take priority):
- Level 1 units: typically taken in Year 1, no subject prerequisites expected
- Level 2 units: typically Year 2 — check the Prerequisites field for what's actually required
- Level 3 units: typically Year 3 — check the Prerequisites field for what's actually required
- A student who has already completed the listed prerequisites can enrol regardless of year level

What you DON'T do:
- Don't suggest full degrees or areas of study — just individual units
- Don't recommend units they've already got in their plan
- NEVER mention or suggest any unit that is not explicitly listed in the "Available elective units" block — not even if you know it from elsewhere
- NEVER second-guess, retract, or contradict units that ARE in the "Available elective units" block — if it's on the list, it's valid
- If the student asks broadly what's available and the list looks limited, suggest they tell you their interests so you can find better matches — don't imply the full catalogue only has those units

Format: use bold for unit codes and titles, bullet points for lists. Keep it readable.`;

// ── GET — load session history ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ messages: [] });

  try {
    const raw = await redis.get(chatKey(sessionId));
    const stored: StoredMessage[] | null = raw ? JSON.parse(raw) : null;
    return NextResponse.json({ messages: stored ?? [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

// ── POST — send message, get response, save to Redis ─────────────────────────

export async function POST(request: NextRequest) {
  const { sessionId, newMessage, planUnits = [] } = (await request.json()) as {
    sessionId: string;
    newMessage: string;
    planUnits?: PlanUnit[];
  };

  if (!sessionId || !newMessage?.trim()) {
    return NextResponse.json({ error: "Missing sessionId or newMessage" }, { status: 400 });
  }

  try {
    // 1. Load history from Redis
    const rawHistory = await redis.get(chatKey(sessionId));
    const history: StoredMessage[] = rawHistory ? JSON.parse(rawHistory) : [];

    // 2. Search for relevant units (always includes explicitly mentioned codes)
    const unitResults = await searchUnits(newMessage);

    // 3. Build context
    const planBlock = planUnits.length
      ? `=== Student's Current Plan (do NOT recommend these) ===\n${planUnits
          .map((u) => `${u.code} (${u.level}): ${u.name}`)
          .join("\n")}`
      : "";
    const unitsBlock = unitResults ? `=== Available Elective Units ===\n${unitResults}` : "";
    const context = [planBlock, unitsBlock].filter(Boolean).join("\n\n");
    const enrichedMessage = context ? `${context}\n\nStudent question: ${newMessage}` : newMessage;

    // 4. Build conversation history for Gemma
    const systemTurn = [
      { role: "user"  as const, parts: [{ text: `Instructions:\n${SYSTEM_PROMPT}` }] },
      { role: "model" as const, parts: [{ text: "Got it! I'll keep it friendly and only suggest electives from the catalogue — nothing they've already got locked in." }] },
    ];
    const gemmaHistory = [
      ...systemTurn,
      ...history.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      })),
    ];

    // 5. Call Gemma
    const model = genAI.getGenerativeModel({
      model: "gemma-4-26b-a4b-it",
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 512,
      },
    });
    const chat   = model.startChat({ history: gemmaHistory });
    const result = await chat.sendMessage(enrichedMessage);

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const text  = parts.length
      ? parts.filter((p: any) => !p.thought).map((p: any) => p.text ?? "").join("").trim()
      : result.response.text();

    // 6. Save updated history to Redis
    const updated: StoredMessage[] = [
      ...history,
      { role: "user",      content: newMessage },
      { role: "assistant", content: text },
    ];
    await redis.setex(chatKey(sessionId), CHAT_TTL, JSON.stringify(updated));

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
