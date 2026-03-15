const fs = require("node:fs")

const INPUT_FILE = "final_aos.json"
const OUTPUT_FILE = INPUT_FILE.replace(".json", ".ndjson")

const data = Object.values(JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8")))

data.map(aos => {
    delete aos.all_units;
    aos.requirement_groups.map(group => {
        delete group.parent_id;
        delete group.num_required;
    })
})

function createNDJSON(filename, data) {
    fs.writeFileSync(filename, data.map(it => JSON.stringify(it)).join("\n"))
}

createNDJSON(OUTPUT_FILE, data)