import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getElasticsearchClient, UNITS_INDEX } from "@/lib/elasticsearch";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function searchUnits(query: string, level?: number): Promise<object[]> {
  const client = getElasticsearchClient();
  const filter: object[] = [];
  if (level) filter.push({ term: { level } });

  const result = await client.search({
    index: UNITS_INDEX,
    size: 8,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: ["code^3", "title^2", "school"],
              fuzziness: "AUTO",
            },
          },
        ],
        filter,
      },
    },
  });

  return result.hits.hits.map((hit) => {
    const src = hit._source as Record<string, unknown>;
    return {
      code: src.code,
      title: src.title,
      level: src.level,
      credit_points: src.credit_points,
      school: src.school,
      offerings: src.offerings,
    };
  });
}

const SYSTEM_PROMPT = `You are a friendly unit advisor for Monash University students who need to fill free elective slots in their course plan.

Your job:
- Help students discover interesting elective units
- Explain what units cover, why they're interesting, and who they suit
- Use the search_units tool to find relevant units before recommending them
- Keep responses concise — students want quick, useful advice

When recommending units, always include the unit code (e.g. FIT3152) and title so students can search for it.
Unit levels: 1 = first year, 2 = second year, 3 = third year, 4 = fourth year/honours.
All units are 6 credit points unless otherwise noted.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  const { messages } = await request.json() as { messages: ChatMessage[] };

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  try {
    const conversation: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const tools: Groq.Chat.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "search_units",
          description: "Search Monash University's unit catalogue by keywords, code, or topic.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Keywords: unit code (e.g. FIT3152), topic (e.g. machine learning), or skill",
              },
              level: {
                type: "integer",
                description: "Optional unit level filter: 1, 2, 3, or 4",
              },
            },
            required: ["query"],
          },
        },
      },
    ];

    async function callWithToolsAndRetry(messages, tools, maxRetries = 3) {
      /**
       * Call model with tools, retrying with adjusted temperature on failure
       */

      // Start with moderate temperature
      let temperature = 1.0;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            tools,
            tool_choice: "auto",
            max_tokens: 1024,
            temperature: temperature,
          });
          return response;
        } catch (e) {
          // Check if this is a tool call generation error
          if (e.status === 400) {
            if (attempt < maxRetries - 1) {
              // Decrease temperature for next attempt to reduce hallucinations
              temperature = Math.max(temperature - 0.2, 0.2);
              console.log(
                `Tool call failed, retrying with lower temperature ${temperature}`,
              );
              continue;
            }
          }

          // If not a tool call error or out of retries, throw
          throw e;
        }
      }

      throw new Error("Failed to generate valid tool calls after retries");
    }

    // Agentic loop
    while (true) {
      const response = await callWithToolsAndRetry(conversation, tools)

      const choice = response.choices[0];
      conversation.push(choice.message);

      if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
        return NextResponse.json({ text: choice.message.content ?? "" });
      }

      // Execute tool calls
      for (const call of choice.message.tool_calls) {
        const args = JSON.parse(call.function.arguments) as { query: string; level?: number | string };
        const level = args.level ? parseInt(String(args.level)) : undefined;
        const results = await searchUnits(args.query, level);
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(results),
        });
      }
    }
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
