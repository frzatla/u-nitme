#!/usr/bin/env node
/**
 * Generates a 2-sentence overview for every unit in mock_units.json
 * using Gemini Flash. Batches 5 units per API call to stay well under
 * the free-tier rate limit (30 RPM). Saves progress after each batch
 * so you can Ctrl-C and re-run safely — already-generated overviews
 * are skipped.
 *
 * Usage:
 *   node scripts/generate-overviews.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs   = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" });

const UNITS_PATH  = path.join(__dirname, "../../algo/src/data/mock_units.json");
const BATCH_SIZE  = 3;    // smaller batches — Gemma is a bigger model
const DELAY_MS    = 5000; // 5 s between batches to respect rate limits

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function generateBatch(units) {
  const list = units
    .map((u) => `${u.code}: "${u.title}" (Level ${u.level}, ${u.academic_org || u.school || "University"})`)
    .join("\n");

  const prompt =
    `For each university unit listed below, write exactly 2 sentences describing what students ` +
    `will study and what skills they will develop. Be specific to the subject matter. ` +
    `Return ONLY a valid JSON object mapping each unit code to its overview string — no markdown, no extra text.\n\n` +
    `Units:\n${list}`;

  const result = await model.generateContent(prompt);
  // Filter out Gemma's thinking parts (thought: true) — same as the chatbot does
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  const raw = parts.length
    ? parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim()
    : result.response.text().trim();

  // Extract the JSON block (model sometimes wraps it in ```json ... ```)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON found in response:\n${raw}`);
  return JSON.parse(match[0]);
}

async function main() {
  const units = JSON.parse(fs.readFileSync(UNITS_PATH, "utf-8"));
  const all   = Object.values(units);

  const todo = all.filter((u) => !u.overview);
  console.log(`${all.length} total units — ${todo.length} need overviews, ${all.length - todo.length} already done.\n`);

  if (todo.length === 0) {
    console.log("Nothing to do!");
    return;
  }

  let generated = 0;
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(todo.length / BATCH_SIZE)} (${batch.map((u) => u.code).join(", ")})… `);

    let overviews;
    try {
      overviews = await generateBatch(batch);
    } catch (err) {
      console.error(`FAILED — ${err.message}. Retrying in 10 s…`);
      await sleep(10000);
      try {
        overviews = await generateBatch(batch);
      } catch (err2) {
        console.error(`Retry also failed — skipping batch: ${err2.message}`);
        continue;
      }
    }

    for (const unit of batch) {
      if (overviews[unit.code]) {
        units[unit.code].overview = overviews[unit.code].trim();
        generated++;
      }
    }

    fs.writeFileSync(UNITS_PATH, JSON.stringify(units, null, 4));
    console.log(`saved (${generated} total generated)`);

    if (i + BATCH_SIZE < todo.length) await sleep(DELAY_MS);
  }

  console.log(`\nDone! Generated overviews for ${generated} units.`);
  console.log(`Next step: node scripts/index-mock-data.js`);
}

main().catch((err) => {
  console.error("Fatal:", err.message ?? err);
  process.exit(1);
});
