const fs = require('fs');
const path = require('path');

const docPath = path.resolve('docs/infotravel-audit/reference/api-doc.json');
const apiDoc = JSON.parse(fs.readFileSync(docPath, 'utf8'));

console.log('Schemas in api-doc:');
const schemas = apiDoc.components?.schemas || {};

function printSchema(name) {
  console.log(`\n=== Schema: ${name} ===`);
  const schema = schemas[name];
  if (!schema) {
    console.log('Not found');
    return;
  }
  console.log(JSON.stringify(schema, null, 2));
}

printSchema('ApiRoom');
printSchema('ApiBookingHotel');
printSchema('ApiBookingFlight');
printSchema('ApiName');
