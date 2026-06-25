const fs = require("fs");
const path = require("path");

const typesPath = path.join(__dirname, "../src/integrations/supabase/types.ts");
const content = fs.readFileSync(typesPath, "utf8");

const lines = content.split("\n");
let found = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("destination_info")) {
    console.log(`Line ${i + 1}: ${lines[i]}`);
    found = true;
  }
}
if (!found) {
  console.log("destination_info NOT found in types.ts");
}
