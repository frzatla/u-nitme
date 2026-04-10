#!/usr/bin/env node
/**
 * Bulk-indexes final_units.ndjson into Elasticsearch.
 *
 * Usage:
 *   ELASTICSEARCH_CLOUD_ID=... ELASTICSEARCH_API_KEY=... node scripts/index-units.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const { Client } = require("@elastic/elasticsearch");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

const cloudId = process.env.ELASTICSEARCH_CLOUD_ID;
const apiKey = process.env.ELASTICSEARCH_API_KEY;

if (!cloudId || !apiKey) {
  console.error(
    "ERROR: Set ELASTICSEARCH_CLOUD_ID and ELASTICSEARCH_API_KEY environment variables."
  );
  process.exit(1);
}

const client = new Client({ cloud: { id: cloudId }, auth: { apiKey } });
const NDJSON_PATH = path.join(__dirname, "../public/data/final_units.ndjson");
const INDEX_NAME = "units";

async function main() {
  // Drop existing index
  try {
    await client.indices.delete({ index: INDEX_NAME });
    console.log(`Deleted existing '${INDEX_NAME}' index.`);
  } catch {
    console.log(`No existing '${INDEX_NAME}' index — creating fresh.`);
  }

  // Create index with mappings
  await client.indices.create({
    index: INDEX_NAME,
    mappings: {
      properties: {
        code: { type: "keyword" },
        title: { type: "text", analyzer: "english" },
        credit_points: { type: "integer" },
        level: { type: "integer" },
        school: { type: "keyword" },
        offerings: {
          type: "nested",
          properties: {
            period: { type: "keyword" },
            location: { type: "keyword" },
            mode: { type: "text" },
          },
        },
      },
    },
  });
  console.log("Index created with mappings.");

  // Stream ndjson and bulk index in batches of 250
  const rl = readline.createInterface({
    input: fs.createReadStream(NDJSON_PATH),
    crlfDelay: Infinity,
  });

  const BATCH_SIZE = 250;
  let batch = [];
  let total = 0;

  async function flushBatch() {
    if (batch.length === 0) return;
    const operations = batch.flatMap((doc) => [
      { index: { _index: INDEX_NAME, _id: doc.code } },
      { ...doc, credit_points: parseInt(doc.credit_points) || 6 },
    ]);
    const result = await client.bulk({ operations });
    if (result.errors) {
      const errors = result.items.filter((i) => i.index?.error);
      if (errors.length > 0)
        console.error(`  ${errors.length} errors in batch`, errors[0]);
    }
    total += batch.length;
    process.stdout.write(`\r  Indexed ${total} units...`);
    batch = [];
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length >= BATCH_SIZE) await flushBatch();
  }
  await flushBatch();

  console.log(`\nDone! Indexed ${total} units into '${INDEX_NAME}'.`);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message ?? err);
  process.exit(1);
});
