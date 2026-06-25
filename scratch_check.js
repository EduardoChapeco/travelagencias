const fs = require("fs");
const path = require("path");

const typesPath = path.join(__dirname, "src/integrations/supabase/types.ts");
const content = fs.readFileSync(typesPath, "utf8");

console.log("File length:", content.length);
const matches = [];
let idx = -1;
while ((idx = content.indexOf("flight_change_cases", idx + 1)) !== -1) {
  matches.push(idx);
}
console.log("flight_change_cases found at indices:", matches);

if (matches.length > 0) {
  matches.forEach((m) => {
    console.log("Snippet:", content.substring(m - 50, m + 100));
  });
}
