const fs = require("node:fs")

const INPUT_FILE = "final_units.json"
const OUTPUT_FILE = INPUT_FILE.replace(".json", ".ndjson")

const data = Object.values(JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8")))

data.map(obj => {
    delete obj.academic_org;
    delete obj.sca_band;
})

function createNDJSON(filename, data) {
    fs.writeFileSync(filename, data.map(it => JSON.stringify(it)).join("\n") + "\n")
}

createNDJSON(OUTPUT_FILE, data)