import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `You are ChatJKW, a friendly course-planning assistant inside U-NIT ME.

Help students with general questions about:
- using the dashboard
- understanding their course plan
- choosing what to review next
- course planning terminology
- units, prerequisites, electives, credit points, semesters, and study load

Keep answers short, practical, and easy to scan. Use bullet points when helpful.
Do not pretend to be an official university advisor. For enrolment-critical decisions, remind the student to verify with the official university handbook or course advisor.
If the student asks about something outside study planning, answer briefly if useful, then steer back to course planning.`;

function buildHistory(messages: ChatMessage[]) {
  return [
    {
      role: "user" as const,
      parts: [{ text: `Instructions:\n${SYSTEM_PROMPT}` }],
    },
    {
      role: "model" as const,
      parts: [
        {
          text: "Got it. I will help with course-planning questions in a concise student-friendly way.",
        },
      ],
    },
    ...messages.slice(0, -1).map((message) => ({
      role: message.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: message.content }],
    })),
  ];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_AI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    messages?: ChatMessage[];
    context?: string;
  };

  const messages = body.messages ?? [];
  const latestMessage = messages[messages.length - 1]?.content?.trim();

  if (!latestMessage) {
    return NextResponse.json({ error: "No message provided" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemma-4-26b-a4b-it",
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 600,
      },
    });

    const context = body.context?.trim()
      ? `Current app context:\n${body.context.trim()}\n\n`
      : "";

    const chat = model.startChat({ history: buildHistory(messages) });
    const result = await chat.sendMessage(
      `${context}Student question: ${latestMessage}`,
    );

    const text = result.response.text().trim();
    return NextResponse.json({ text });
  } catch (error) {
    console.error("General chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
