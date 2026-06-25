const fs = require("fs");
const path = require("path");

const filePath = path.join("src", "routes", "agency.$slug.quotes.$id.tsx");
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (line.includes("simulation") || line.includes("rightTab") || line.includes("simulating")) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log("File does not exist:", filePath);
}
