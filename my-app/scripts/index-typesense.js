#!/usr/bin/env node
/**
 * Bulk-indexes mock units, AOS, and courses into Typesense Cloud.
 * Creates three collections: "units", "aos", "courses"
 *
 * Usage:
 *   node scripts/index-typesense.js
 *   (reads credentials from .env.local automatically)
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const Typesense = require("typesense");
const fs  = require("fs");
const path = require("path");

const host     = process.env.TYPESENSE_HOST;
const adminKey = process.env.TYPESENSE_ADMIN_KEY;

if (!host || !adminKey) {
  console.error("ERROR: Set TYPESENSE_HOST and TYPESENSE_ADMIN_KEY in .env.local");
  process.exit(1);
}

const client = new Typesense.Client({
  nodes: [{ host, port: 443, protocol: "https" }],
  apiKey: adminKey,
  connectionTimeoutSeconds: 10,
});

const DATA_DIR = path.join(__dirname, "../../algo/src/data");

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
}

async function recreateCollection(schema) {
  try {
    await client.collections(schema.name).delete();
    console.log(`  Deleted existing '${schema.name}' collection.`);
  } catch {
    console.log(`  No existing '${schema.name}' collection — creating fresh.`);
  }
  await client.collections().create(schema);
  console.log(`  Created '${schema.name}' collection.`);
}

async function bulkImport(collectionName, docs) {
  if (!docs.length) return;
  const BATCH = 250;
  let total = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const slice = docs.slice(i, i + BATCH);
    const results = await client.collections(collectionName).documents().import(slice, { action: "upsert" });
    const errors = results.filter((r) => !r.success);
    if (errors.length) console.error(`  ${errors.length} errors:`, errors[0].error);
    total += slice.length;
    process.stdout.write(`\r  Indexed ${total}/${docs.length}...`);
  }
  console.log(`\r  Done — ${total} documents in '${collectionName}'.`);
}

// ── 1. Units ──────────────────────────────────────────────────────────────────

async function indexUnits() {
  console.log("\n[1/3] Indexing units...");

  await recreateCollection({
    name: "units",
    fields: [
      { name: "code",          type: "string" },
      { name: "title",         type: "string" },
      { name: "overview",      type: "string", optional: true },
      { name: "credit_points", type: "int32"  },
      { name: "level",         type: "int32"  },
      { name: "school",        type: "string", optional: true },
      { name: "academic_org",  type: "string", optional: true },
      { name: "assessments",   type: "string[]", optional: true },
      { name: "prerequisites", type: "string", optional: true },
    ],
    default_sorting_field: "level",
  });

  const raw  = loadJson("mock_units.json");
  const docs = Object.values(raw).map((u) => {
    const assessments = (u.assessments || []).map(
      (a) => a.name.replace(/^\d+\s*-\s*/, "").trim()
    );

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
      id:            u.code,
      code:          u.code,
      title:         (u.title || "").trim(),
      overview:      (u.overview || "").trim(),
      credit_points: parseInt(u.credit_points) || 6,
      level:         u.level || 1,
      school:        u.school || u.academic_org || "",
      academic_org:  u.academic_org || "",
      assessments,
      prerequisites,
    };
  });

  await bulkImport("units", docs);
}

// ── 2. AOS ────────────────────────────────────────────────────────────────────

async function indexAos() {
  console.log("\n[2/3] Indexing areas of study (AOS)...");

  await recreateCollection({
    name: "aos",
    fields: [
      { name: "course_code",         type: "string" },
      { name: "course_title",        type: "string" },
      { name: "total_credit_points", type: "int32"  },
      { name: "unit_codes",          type: "string[]", optional: true },
      { name: "unit_summary",        type: "string", optional: true },
    ],
    default_sorting_field: "total_credit_points",
  });

  const raw  = loadJson("mock_aos.json");
  const docs = Object.values(raw).map((a) => {
    const allUnits   = a.all_units || {};
    const unitCodes  = Object.keys(allUnits);
    const unitSummary = Object.entries(allUnits)
      .map(([code, title]) => `${code}: ${title}`)
      .join(" | ");

    return {
      id:                  a.course_code,
      course_code:         a.course_code,
      course_title:        a.course_title || "",
      total_credit_points: a.total_credit_points || 0,
      unit_codes:          unitCodes,
      unit_summary:        unitSummary,
    };
  });

  await bulkImport("aos", docs);
}

// ── 3. Courses ────────────────────────────────────────────────────────────────

async function indexCourses() {
  console.log("\n[3/3] Indexing courses...");

  await recreateCollection({
    name: "courses",
    fields: [
      { name: "course_code",         type: "string" },
      { name: "course_title",        type: "string" },
      { name: "total_credit_points", type: "int32"  },
      { name: "available_aos",       type: "string[]", optional: true },
      { name: "aos_summary",         type: "string", optional: true },
    ],
    default_sorting_field: "total_credit_points",
  });

  const raw     = loadJson("mock_courses.json");
  const aosMeta = loadJson("mock_aos.json");

  const docs = Object.values(raw).map((c) => {
    const availableAos = [
      ...new Set(
        (c.requirement_groups || []).flatMap((g) => g.units || [])
      ),
    ].filter((code) => aosMeta[code]);

    const aosSummary = availableAos
      .map((code) => `${code}: ${aosMeta[code]?.course_title || ""}`)
      .join(" | ");

    return {
      id:                  c.course_code,
      course_code:         c.course_code,
      course_title:        c.course_title || "",
      total_credit_points: c.total_credit_points || 0,
      available_aos:       availableAos,
      aos_summary:         aosSummary,
    };
  });

  await bulkImport("courses", docs);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Connecting to Typesense Cloud...");
  const health = await client.health.retrieve();
  console.log(`Connected — status: ${health.ok ? "ok" : "degraded"}`);

  await indexUnits();
  await indexAos();
  await indexCourses();

  console.log("\nAll done!");
}

main().catch((err) => {
  console.error("\nFatal error:", err.message ?? err);
  process.exit(1);
});
