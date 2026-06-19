const fs = require('fs');

const content = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('public_') || line.includes('_by_token')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
