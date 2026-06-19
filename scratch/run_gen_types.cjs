const { execSync } = require('child_process');
const fs = require('fs');

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN environment variable is not set.");
  process.exit(1);
}

try {
  console.log('Generating types...');
  const output = execSync('npx supabase gen types typescript --project-id esmppoxxnyiscidzsjvy', {
    env: {
      ...process.env
    },
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  });
  
  fs.writeFileSync('src/integrations/supabase/types.ts', output);
  console.log('Types generated and saved successfully to src/integrations/supabase/types.ts');
} catch (error) {
  console.error('Error generating types:', error.message);
  if (error.stdout) console.log('Stdout:', error.stdout.toString());
  if (error.stderr) console.error('Stderr:', error.stderr.toString());
  process.exit(1);
}
