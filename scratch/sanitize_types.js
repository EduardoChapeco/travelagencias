import fs from 'fs';

const typesPath = 'src/integrations/supabase/types.ts';
let content = fs.readFileSync(typesPath, 'utf8');

const lines = content.split('\n');
const result = [];
const blockStack = [];
let currentFields = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Track blocks
  if (trimmed.endsWith('{')) {
    blockStack.push(currentFields);
    currentFields = new Set();
    result.push(line);
    continue;
  }
  
  if (trimmed.startsWith('}') || trimmed === '};') {
    if (blockStack.length > 0) {
      currentFields = blockStack.pop();
    } else {
      currentFields = new Set();
    }
    result.push(line);
    continue;
  }

  // Check if it's a property line: "name: type;" or "name?: type;"
  const match = trimmed.match(/^(\w+)\??\s*:/);
  if (match) {
    const fieldName = match[1];
    if (currentFields.has(fieldName)) {
      // Duplicate field in the same block! Skip this line.
      console.log(`Removing duplicate field "${fieldName}" in current block`);
      continue;
    }
    currentFields.add(fieldName);
  }

  result.push(line);
}

fs.writeFileSync(typesPath, result.join('\n'), 'utf8');
console.log('Advanced sanitization complete!');
