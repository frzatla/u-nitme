import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getElasticsearchClient, UNITS_INDEX } from "@/lib/elasticsearch";
import { redis, chatKey, CHAT_TTL, StoredMessage } from "@/lib/redis";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

type PlanUnit = { code: string; name: string; level: string };

// ── Elasticsearch unit search ─────────────────────────────────────────────────

async function searchUnits(query: string): Promise<string> {
  const client = getElasticsearchClient();
  const result = await client.search({
    index: UNITS_INDEX,
    size: 8,
    query: {
      multi_match: {
        query,
        fields: ["code^3", "title^2", "school"],
        fuzziness: "AUTO",
      },
    },
  });

  return result.hits.hits
    .map((h) => {
      const s = h._source as Record<string, unknown>;
      return `${s.code} (L${s.level}, ${s.credit_points} CP): ${s.title} — ${s.school}`;
    })
    .join("\n");
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You're a friendly uni advisor helping Monash students pick free electives. Think of yourself as a helpful senior student who knows the course catalogue really well.

Keep it real and casual — you're talking to uni students, not writing a formal report. Short sentences, friendly tone, maybe a touch of enthusiasm when a unit is genuinely cool.

What you do:
- Suggest free elective units that fit what the student's interested in
- Point out if anything needs a prerequisite so they don't get caught off guard
- Keep recommendations short and punchy — unit code, level, title, and a one-liner on why it's worth it

What you don't do:
- Don't suggest full degrees or areas of study — just individual units
- Don't recommend units they've already got in their plan
- Don't make up units — only suggest ones from the "Available elective units" list provided
- If nothing in the list fits what they're asking, just say so honestly

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
    // 1. Load history from Redis (server is the source of truth)
    const rawHistory = await redis.get(chatKey(sessionId));
    const history: StoredMessage[] = rawHistory ? JSON.parse(rawHistory) : [];

    // 2. Search for relevant elective units
    const unitResults = await searchUnits(newMessage);

    // 3. Build context blocks
    const planBlock = planUnits.length
      ? `=== Student's Current Plan (do NOT recommend these) ===\n${planUnits
          .map((u) => `${u.code} (${u.level}): ${u.name}`)
          .join("\n")}`
      : "";
    const unitsBlock = unitResults ? `=== Available Elective Units ===\n${unitResults}` : "";
    const context = [planBlock, unitsBlock].filter(Boolean).join("\n\n");

    const enrichedMessage = context
      ? `${context}\n\nStudent question: ${newMessage}`
      : newMessage;

    // 4. Build Gemma conversation — system turn + stored history + new message
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
        temperature: 1.2,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    });
    const chat   = model.startChat({ history: gemmaHistory });
    const result = await chat.sendMessage(enrichedMessage);

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const text  = parts.length
      ? parts.filter((p: any) => !p.thought).map((p: any) => p.text ?? "").join("").trim()
      : result.response.text();

    // 6. Save updated history to Redis, refreshing the TTL
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
