#!/usr/bin/env node
/**
 * Bulk-indexes mock units, AOS, and courses into Elasticsearch.
 * Creates three indices: "units", "aos", "courses"
 *
 * Usage:
 *   node scripts/index-mock-data.js
 *   (reads credentials from .env.local automatically)
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const { Client } = require("@elastic/elasticsearch");
const fs = require("fs");
const path = require("path");

const cloudId = process.env.ELASTICSEARCH_CLOUD_ID;
const apiKey  = process.env.ELASTICSEARCH_API_KEY;

if (!cloudId || !apiKey) {
  console.error("ERROR: Set ELASTICSEARCH_CLOUD_ID and ELASTICSEARCH_API_KEY in .env.local");
  process.exit(1);
}

const client   = new Client({ cloud: { id: cloudId }, auth: { apiKey } });
const DATA_DIR = path.join(__dirname, "../../algo/src/data");

// ── helpers ───────────────────────────────────────────────────────────────────

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
}

async function recreateIndex(name, mappings) {
  try {
    await client.indices.delete({ index: name });
    console.log(`  Deleted existing '${name}' index.`);
  } catch {
    console.log(`  No existing '${name}' index — creating fresh.`);
  }
  await client.indices.create({ index: name, mappings });
  console.log(`  Created '${name}' index.`);
}

async function bulkIndex(indexName, docs) {
  if (!docs.length) return;
  const BATCH = 250;
  let total = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const slice = docs.slice(i, i + BATCH);
    const operations = slice.flatMap((doc) => [
      { index: { _index: indexName, _id: doc._id } },
      doc._body,
    ]);
    const result = await client.bulk({ operations });
    if (result.errors) {
      const errs = result.items.filter((it) => it.index?.error);
      if (errs.length) console.error(`  ${errs.length} errors`, errs[0].index.error);
    }
    total += slice.length;
    process.stdout.write(`\r  Indexed ${total}/${docs.length}...`);
  }
  console.log(`\r  Done — ${total} documents in '${indexName}'.`);
}

// ── 1. Units ──────────────────────────────────────────────────────────────────

async function indexUnits() {
  console.log("\n[1/3] Indexing units...");

  await recreateIndex("units", {
    properties: {
      code:          { type: "keyword" },
      title:         { type: "text", analyzer: "english" },
      overview:      { type: "text", analyzer: "english" },
      credit_points: { type: "integer" },
      level:         { type: "integer" },
      school:        { type: "keyword" },
      academic_org:  { type: "keyword" },
      assessments:   { type: "keyword" },
      prerequisites: { type: "keyword" },
      offerings: {
        type: "nested",
        properties: {
          period:   { type: "keyword" },
          location: { type: "keyword" },
          mode:     { type: "text" },
        },
      },
    },
  });

  const raw  = loadJson("mock_units.json");
  const docs = Object.values(raw).map((u) => {
    // Strip the leading "N - " from assessment names: "4 - Examination" → "Examination"
    const assessments = (u.assessments || []).map(
      (a) => a.name.replace(/^\d+\s*-\s*/, "").trim()
    );

    // Convert structured requisites into a human-readable string for the chatbot
    // Format: ";" = OR, "&" = AND
    const req = u.requisites || {};
    const prereqParts = (req.prerequisites || []).filter(Boolean).map((p) =>
      p.replace(/;/g, " OR ").replace(/&/g, " AND ")
    );
    const prohibParts = (req.prohibitions || []).filter(Boolean);
    const prerequisites = [
      prereqParts.length ? prereqParts.join("; ") : "None",
      prohibParts.length ? `Cannot enrol if completed: ${prohibParts.join(", ")}` : "",
    ].filter(Boolean).join(" | ");

    return {
      _id:   u.code,
      _body: {
        code:          u.code,
        title:         (u.title || "").trim(),
        overview:      (u.overview || "").trim(),
        credit_points: parseInt(u.credit_points) || 6,
        level:         u.level || 1,
        school:        u.school || u.academic_org || "",
        academic_org:  u.academic_org || "",
        assessments,
        prerequisites,
        offerings:     (u.offerings || []).map((o) => ({
          period:   o.period || "",
          location: o.location || "",
          mode:     o.mode || "",
        })),
      },
    };
  });

  await bulkIndex("units", docs);
}

// ── 2. AOS ────────────────────────────────────────────────────────────────────

async function indexAos() {
  console.log("\n[2/3] Indexing areas of study (AOS)...");

  await recreateIndex("aos", {
    properties: {
      course_code:          { type: "keyword" },
      course_title:         { type: "text", analyzer: "english" },
      total_credit_points:  { type: "integer" },
      // flat list of unit codes in this AOS
      unit_codes:           { type: "keyword" },
      // "CODE: Title" strings joined — full-text searchable
      unit_summary:         { type: "text", analyzer: "english" },
    },
  });

  const raw  = loadJson("mock_aos.json");
  const docs = Object.values(raw).map((a) => {
    const allUnits   = a.all_units || {};
    const unitCodes  = Object.keys(allUnits);
    const unitSummary = Object.entries(allUnits)
      .map(([code, title]) => `${code}: ${title}`)
      .join(" | ");

    return {
      _id:   a.course_code,
      _body: {
        course_code:         a.course_code,
        course_title:        a.course_title || "",
        total_credit_points: a.total_credit_points || 0,
        unit_codes:          unitCodes,
        unit_summary:        unitSummary,
      },
    };
  });

  await bulkIndex("aos", docs);
}

// ── 3. Courses ────────────────────────────────────────────────────────────────

async function indexCourses() {
  console.log("\n[3/3] Indexing courses...");

  await recreateIndex("courses", {
    properties: {
      course_code:         { type: "keyword" },
      course_title:        { type: "text", analyzer: "english" },
      total_credit_points: { type: "integer" },
      // AOS codes available in this course (for filtering / display)
      available_aos:       { type: "keyword" },
      // "AOS_CODE: AOS Title" strings — full-text searchable
      aos_summary:         { type: "text", analyzer: "english" },
    },
  });

  const raw    = loadJson("mock_courses.json");
  const aosMeta = loadJson("mock_aos.json");

  const docs = Object.values(raw).map((c) => {
    // Collect all AOS codes referenced in requirement_groups
    const availableAos = [
      ...new Set(
        (c.requirement_groups || []).flatMap((g) => g.units || [])
      ),
    ].filter((code) => aosMeta[code]); // only keep codes that are real AOS entries

    const aosSummary = availableAos
      .map((code) => `${code}: ${aosMeta[code]?.course_title || ""}`)
      .join(" | ");

    return {
      _id:   c.course_code,
      _body: {
        course_code:         c.course_code,
        course_title:        c.course_title || "",
        total_credit_points: c.total_credit_points || 0,
        available_aos:       availableAos,
        aos_summary:         aosSummary,
      },
    };
  });

  await bulkIndex("courses", docs);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Connecting to Elasticsearch...");
  const info = await client.info();
  console.log(`Connected to cluster: ${info.cluster_name}`);

  await indexUnits();
  await indexAos();
  await indexCourses();

  console.log("\nAll done!");
}

main().catch((err) => {
  console.error("\nFatal error:", err.message ?? err);
  process.exit(1);
});
