import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getTypesenseClient, UNITS_COLLECTION, AOS_COLLECTION, COURSES_COLLECTION } from "@/lib/typesense";
import { redis, CHAT_TTL, StoredMessage } from "@/lib/redis";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Separate key prefix so floating-chatbot sessions don't collide with elective-chat sessions
const floatingChatKey = (sessionId: string) => `course-chat:${sessionId}`;

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ChatJKW, a knowledgeable and friendly course-planning advisor inside U-NIT ME.

CRITICAL — OUTPUT FORMAT:
Start your response IMMEDIATELY with the actual answer. Never output task summaries, planning notes, persona reminders, constraint lists, or any preamble. Your first word must be part of the answer itself.

Your role is BROADER than just unit recommendations. You advise on:
- Course structure — what a degree involves, how it's organised
- Areas of Study (AOS) — what they cover, how many credit points they require, and how to choose between them
- Degree planning — year-by-year progression, semester sequencing, spreading prerequisites strategically
- Credit point management — standard 24 CP/semester, total degree requirements (typically 144 CP for 3 year degrees, 192 CP for 4 year degrees), extended vs standard study
- Prerequisite strategy — planning ahead so long chains don't bottleneck later years
- Study load — managing 4 units/semester, when to take lighter or heavier loads

When the context includes AOS, course, or unit data, use it to give specific, grounded answers.
If a student wants specific unit-by-unit elective recommendations, tell them to use the "Ask AI" tab inside their course plan — that assistant is purpose-built for that.

Tone: casual, friendly, practical. Use bullet points when listing options or steps. Keep answers concise.
Do not pretend to be an official university advisor — for enrolment-critical decisions, remind the student to verify with the official handbook or their course advisor.`;

// ── RAG: search across units, AOS, and courses ───────────────────────────────

async function searchContext(query: string): Promise<string> {
  try {
    const client = getTypesenseClient();
    const parts: string[] = [];

    const unitResult = await client.collections(UNITS_COLLECTION).documents().search({
      q:                query,
      query_by:         "code,title,overview,school",
      query_by_weights: "6,4,3,2",
      num_typos:        2,
      per_page:         4,
    });
    const unitDocs = unitResult.hits?.map((h) => h.document as Record<string, any>) ?? [];
    if (unitDocs.length) {
      const lines = unitDocs.map((s) => {
        const prereqs = s.prerequisites && s.prerequisites !== "None" ? ` | Prereqs: ${s.prerequisites}` : "";
        return `  ${s.code} (L${s.level}, ${s.credit_points}CP): ${s.title}${prereqs}`;
      });
      parts.push(`=== Related Units ===\n${lines.join("\n")}`);
    }

    const aosResult = await client.collections(AOS_COLLECTION).documents().search({
      q:                query,
      query_by:         "course_title,unit_summary",
      query_by_weights: "4,2",
      num_typos:        2,
      per_page:         3,
    });
    const aosDocs = aosResult.hits?.map((h) => h.document as Record<string, any>) ?? [];
    if (aosDocs.length) {
      const lines = aosDocs.map((s) =>
        `  ${s.course_code}: ${s.course_title} (${s.total_credit_points}CP total)`,
      );
      parts.push(`=== Related Areas of Study ===\n${lines.join("\n")}`);
    }

    const courseResult = await client.collections(COURSES_COLLECTION).documents().search({
      q:                query,
      query_by:         "course_title,aos_summary",
      query_by_weights: "4,2",
      num_typos:        2,
      per_page:         3,
    });
    const courseDocs = courseResult.hits?.map((h) => h.document as Record<string, any>) ?? [];
    if (courseDocs.length) {
      const lines = courseDocs.map((s) =>
        `  ${s.course_code}: ${s.course_title} (${s.total_credit_points}CP)`,
      );
      parts.push(`=== Related Courses ===\n${lines.join("\n")}`);
    }

    return parts.join("\n\n");
  } catch {
    return "";
  }
}

// ── Build Gemma conversation history from stored messages ─────────────────────

function buildGemmaHistory(history: StoredMessage[]) {
  return [
    {
      role: "user" as const,
      parts: [{ text: `Instructions:\n${SYSTEM_PROMPT}` }],
    },
    {
      role: "model" as const,
      parts: [
        {
          text: "Got it. I'll jump straight into answers — no preamble. I advise on courses, AOS, degree planning, and credit points. For specific elective unit picks, I'll point students to the Ask AI tab in their plan.",
        },
      ],
    },
    ...history.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    })),
  ];
}

// ── GET — load session history ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ messages: [] });

  try {
    const stored = await redis.get<StoredMessage[]>(floatingChatKey(sessionId));
    return NextResponse.json({ messages: stored ?? [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

// ── POST — send message, get response, save to Redis ─────────────────────────

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_AI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    sessionId: string;
    newMessage: string;
    context?: string;
  };

  const { sessionId, newMessage, context } = body;

  if (!sessionId || !newMessage?.trim()) {
    return NextResponse.json(
      { error: "Missing sessionId or newMessage" },
      { status: 400 },
    );
  }

  try {
    // 1. Load history from Redis
    const history: StoredMessage[] =
      (await redis.get<StoredMessage[]>(floatingChatKey(sessionId))) ?? [];

    // 2. RAG search
    const ragContext = await searchContext(newMessage);

    // 3. Build enriched message
    const appContext = context?.trim()
      ? `=== App Context ===\n${context.trim()}`
      : "";
    const fullContext = [appContext, ragContext].filter(Boolean).join("\n\n");
    const enrichedMessage = fullContext
      ? `${fullContext}\n\nStudent question: ${newMessage}`
      : newMessage;

    // 4. Call Gemini 3 Flash (non-thinking by default — no thought filtering needed)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 2048 },
    });
    const chat = model.startChat({ history: buildGemmaHistory(history) });
    const result = await chat.sendMessage(enrichedMessage);

    // Gemini 3 Flash is non-thinking by default — response.text() is clean
    const text = result.response.text().trim();

    // 6. Save updated history to Redis
    const updated: StoredMessage[] = [
      ...history,
      { role: "user", content: newMessage },
      { role: "assistant", content: text },
    ];
    await redis.setex(floatingChatKey(sessionId), CHAT_TTL, updated);

    return NextResponse.json({ text });
  } catch (error) {
    // console.error("General chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
