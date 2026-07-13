import fs from 'fs';
import path from 'path';

function getAllFiles(dir, exts = ['.ts', '.tsx'], result = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', '.git', 'dist', '.agents'].includes(e.name)) {
      getAllFiles(full, exts, result);
    } else if (e.isFile() && exts.some(ext => e.name.endsWith(ext))) {
      result.push(full);
    }
  }
  return result;
}

const hooksDir = path.resolve('./src/hooks');
const hookFiles = fs.readdirSync(hooksDir).filter(f => f.match(/\.(ts|tsx)$/));

// Todos os arquivos TS fora de src/hooks
const allFiles = getAllFiles('./src').filter(f => !f.includes('\\hooks\\') && !f.includes('/hooks/'));

const results = [];

for (const hookFile of hookFiles) {
  const hookName = hookFile.replace(/\.tsx?$/, '');
  const usedIn = [];

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(hookName)) {
      usedIn.push(file.replace(/\\/g, '/').replace('./src/', 'src/'));
    }
  }

  results.push({ hook: hookFile, externalUses: usedIn.length, usedIn });
}

results.sort((a, b) => a.externalUses - b.externalUses);

console.log('\n=== INVENTÁRIO DE HOOKS — USOS EXTERNOS ===\n');
for (const r of results) {
  const badge = r.externalUses === 0 ? '🔴 ZERO USOS (candidato a remoção)' : `✅ ${r.externalUses} uso(s)`;
  console.log(`${badge} → ${r.hook}`);
  if (r.usedIn.length) {
    for (const f of r.usedIn) console.log(`    • ${f}`);
  }
  console.log('');
}
