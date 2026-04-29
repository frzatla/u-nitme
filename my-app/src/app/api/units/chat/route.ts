import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getElasticsearchClient, UNITS_INDEX } from "@/lib/elasticsearch";

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

// ── Route handler ─────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  const { messages, planUnits = [] } =
    (await request.json()) as { messages: ChatMessage[]; planUnits?: PlanUnit[] };

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  try {
    const latestMessage = messages[messages.length - 1].content;

    // 1. Search for relevant elective units
    const unitResults = await searchUnits(latestMessage);

    // 2. Build plan context block
    const planBlock = planUnits.length
      ? `=== Student's Current Plan (do NOT recommend these) ===\n${planUnits
          .map((u) => `${u.code} (${u.level}): ${u.name}`)
          .join("\n")}`
      : "";

    const unitsBlock = unitResults
      ? `=== Available Elective Units ===\n${unitResults}`
      : "";

    const context = [planBlock, unitsBlock].filter(Boolean).join("\n\n");

    // 3. Build enriched user message
    const enrichedMessage = context
      ? `${context}\n\nStudent question: ${latestMessage}`
      : latestMessage;

    // 4. Build conversation history with system prompt as first exchange
    const systemTurn = [
      { role: "user"  as const, parts: [{ text: `Instructions:\n${SYSTEM_PROMPT}` }] },
      { role: "model" as const, parts: [{ text: "Got it! I'll keep it friendly and only suggest electives from the catalogue — nothing they've already got locked in." }] },
    ];
    const history = [
      ...systemTurn,
      ...messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      })),
    ];

    // 5. Call Gemma
    const model = genAI.getGenerativeModel({
      model: "gemma-4-26b-a4b-it",
      generationConfig: {
        temperature: 1.2,   // higher = more natural/conversational (default ~1.0)
        topP: 0.95,         // nucleus sampling — keeps responses varied but coherent
        maxOutputTokens: 512, // enough for a good recommendation, not an essay
      },
    });
    const chat   = model.startChat({ history });
    const result = await chat.sendMessage(enrichedMessage);

    // Strip thought parts — only return the visible response
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const text = parts.length
      ? parts
          .filter((p: any) => !p.thought)
          .map((p: any) => p.text ?? "")
          .join("")
          .trim()
      : result.response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
