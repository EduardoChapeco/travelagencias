const fs = require("fs");
const path = require("path");

try {
  const filePath = path.join(__dirname, "..", "deployments.txt");
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf16le");
    console.log("--- deployments.txt ---");
    console.log(content.substring(0, 2000));
  } else {
    console.log("deployments.txt not found at " + filePath);
  }
} catch (err) {
  console.error("Error reading deployments.txt:", err);
}

try {
  const filePath2 = path.join(__dirname, "..", "wrangler_deployments.txt");
  if (fs.existsSync(filePath2)) {
    const content2 = fs.readFileSync(filePath2, "utf16le");
    console.log("--- wrangler_deployments.txt ---");
    console.log(content2.substring(0, 2000));
  } else {
    console.log("wrangler_deployments.txt not found at " + filePath2);
  }
} catch (err) {
  console.error("Error reading wrangler_deployments.txt:", err);
}
