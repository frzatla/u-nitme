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
      const assessments =
        Array.isArray(s.assessments) && s.assessments.length
          ? `\n    Assessments: ${(s.assessments as string[]).join(", ")}`
          : "";
      const overview = s.overview ? `\n    Overview: ${s.overview}` : "";
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
  const mentionedCodes = [...query.matchAll(/\b([A-Z]{2,4}\d{4})\b/g)].map(
    (m) => m[1],
  );

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
      query: {
        multi_match: {
          query,
          fields: ["title^2", "overview^1.5", "school"],
          fuzziness: "AUTO",
        },
      },
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

const SYSTEM_PROMPT = `You are a friendly uni advisor helping Monash students pick free electives — like a helpful senior student who knows the catalogue well.

CRITICAL — OUTPUT FORMAT:
Your response must start IMMEDIATELY with your actual answer. Never output any of the following before or between recommendations:
- Task summaries ("User wants: ...", "Goal: ...", "Persona: ...")
- Constraint lists ("Constraints:", "Don't suggest...", "Format:", "Tone:")
- Planning or analysis notes ("FIT1234 is not relevant because...", "Student has X in plan so...")
- Restatements of the question
- Any preamble whatsoever
Your FIRST word must be part of the actual recommendation or conversational reply — nothing else.

Tone: casual, friendly, short sentences. A touch of enthusiasm when a unit is genuinely cool.

When recommending units, for each one give:
- Bold unit code + title
- Level and credit points
- One punchy sentence on why it's worth it
- Prerequisites (exactly as listed — never say "None" if prerequisites are listed)
- Assessment format briefly
Remember to use "-" or dot points when listing multiple units.
Paragraph spacing should not be too wide for each details of the units.

Prerequisites are the PRIMARY enrolment requirement:
- Read the "Prerequisites" field carefully for every unit you recommend
- State them exactly — e.g. "you'll need BEX1008 or BEX1014 first"
- NEVER say a unit has no prerequisites if the field lists specific units
- A student who has completed the listed prerequisites can enrol regardless of year level

Level-year guidance (soft, not a hard rule):
- L1: typically Year 1, usually no prerequisites
- L2: typically Year 2 — check prerequisites field
- L3: typically Year 3 — check prerequisites field

Hard rules:
- Only suggest units from the "Available elective units" block — never invent or recall units from elsewhere
- Never recommend units already in the student's plan
- Never suggest degrees or areas of study — individual units only
- If nothing fits, say so honestly and ask what they're interested in`;

// ── GET — load session history ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ messages: [] });

  try {
    const stored = await redis.get<StoredMessage[]>(chatKey(sessionId));
    return NextResponse.json({ messages: stored ?? [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

// ── POST — send message, get response, save to Redis ─────────────────────────

export async function POST(request: NextRequest) {
  const {
    sessionId,
    newMessage,
    planUnits = [],
  } = (await request.json()) as {
    sessionId: string;
    newMessage: string;
    planUnits?: PlanUnit[];
  };

  if (!sessionId || !newMessage?.trim()) {
    return NextResponse.json(
      { error: "Missing sessionId or newMessage" },
      { status: 400 },
    );
  }

  try {
    // 1. Load history from Redis
    const history: StoredMessage[] =
      (await redis.get<StoredMessage[]>(chatKey(sessionId))) ?? [];

    // 2. Search for relevant units (always includes explicitly mentioned codes)
    const unitResults = await searchUnits(newMessage);

    // 3. Build context
    const planBlock = planUnits.length
      ? `=== Student's Current Plan (do NOT recommend these) ===\n${planUnits
          .map((u) => `${u.code} (${u.level}): ${u.name}`)
          .join("\n")}`
      : "";
    const unitsBlock = unitResults
      ? `=== Available Elective Units ===\n${unitResults}`
      : "";
    const context = [planBlock, unitsBlock].filter(Boolean).join("\n\n");
    const enrichedMessage = context
      ? `${context}\n\nStudent question: ${newMessage}`
      : newMessage;

    // 4. Build conversation history for Gemma
    const systemTurn = [
      {
        role: "user" as const,
        parts: [{ text: `Instructions:\n${SYSTEM_PROMPT}` }],
      },
      {
        role: "model" as const,
        parts: [
          {
            text: "Got it. I'll jump straight into recommendations — no preamble, no task summaries, no planning notes. Just friendly, direct advice using only the units in the provided list.",
          },
        ],
      },
    ];
    const gemmaHistory = [
      ...systemTurn,
      ...history.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      })),
    ];

    // 5. Call Gemini 2.5 Flash (non-thinking by default — clean response, no filtering needed)
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });
    const chat = model.startChat({ history: gemmaHistory });
    const result = await chat.sendMessage(enrichedMessage);

    const text = result.response.text().trim();

    // 6. Save to Redis
    const updated: StoredMessage[] = [
      ...history,
      { role: "user", content: newMessage },
      { role: "assistant", content: text },
    ];
    await redis.setex(chatKey(sessionId), CHAT_TTL, updated);

    return NextResponse.json({ text });
  } catch (error) {
    // console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
