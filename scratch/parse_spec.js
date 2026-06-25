const fs = require("fs");
const path = require("path");

const specPath = path.resolve("docs/infotravel-audit/reference/api-doc.json");
const raw = fs.readFileSync(specPath, "utf8");
const spec = JSON.parse(raw);

console.log("--- SPEC INFO ---");
console.log("Title:", spec.info?.title);
console.log("Version:", spec.info?.version);
console.log("Description:", spec.info?.description?.substring(0, 200) + "...");
console.log("Servers:", JSON.stringify(spec.servers));

const paths = Object.keys(spec.paths || {});
console.log("Total Endpoints (paths):", paths.length);

const schemas = Object.keys(spec.components?.schemas || {});
console.log("Total Schemas:", schemas.length);

// Let's inventory all endpoints by grouping them or listing them
const endpointList = [];
for (const p of paths) {
  const methods = Object.keys(spec.paths[p]);
  for (const m of methods) {
    const op = spec.paths[p][m];
    endpointList.push({
      path: p,
      method: m.toUpperCase(),
      summary: op.summary || "",
      description: op.description || "",
      operationId: op.operationId || "",
      tags: op.tags || [],
      parameters:
        op.parameters?.map((param) => ({
          name: param.name,
          in: param.in,
          required: !!param.required,
          type: param.schema?.type || "",
        })) || [],
      requestBodyRef: op.requestBody?.content?.["application/json"]?.schema?.$ref || "",
      responseBodyRef:
        op.responses?.["200"]?.content?.["application/json"]?.schema?.$ref ||
        op.responses?.["201"]?.content?.["application/json"]?.schema?.$ref ||
        "",
    });
  }
}

console.log("\n--- DOMAIN CLASSIFICATION ---");
const domains = {};
endpointList.forEach((e) => {
  // Determine domain based on path tags or prefixes
  let tag = e.tags[0] || "General";
  if (!domains[tag]) domains[tag] = [];
  domains[tag].push(e);
});

Object.keys(domains)
  .sort()
  .forEach((d) => {
    console.log(`Domain: ${d} (${domains[d].length} endpoints)`);
    domains[d].forEach((e) => {
      console.log(`  - [${e.method}] ${e.path} (${e.summary || e.operationId})`);
    });
  });

// Save structured inventory to a json file for our reference!
fs.writeFileSync(
  "docs/infotravel-audit/reference/structured_inventory.json",
  JSON.stringify(endpointList, null, 2),
  "utf8",
);
console.log("\nSaved structured_inventory.json");
