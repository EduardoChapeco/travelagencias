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

const allFiles = getAllFiles('./src');
const patterns = [
  /bg-blue-\d+/i,
  /text-blue-\d+/i,
  /border-blue-\d+/i,
  /bg-brand(?!\w)/i,
  /text-brand(?!\w)/i,
  /border-brand(?!\w)/i,
];

console.log('\n=== VARREDURA DE CLASSES AZUIS (VAZAMENTO) ===\n');

let total = 0;
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let filePrinted = false;

  lines.forEach((line, idx) => {
    patterns.forEach(pat => {
      const match = line.match(pat);
      // Exclui comentários, imports e arquivos de estilos
      if (match && !line.trim().startsWith('//') && !line.includes('import ') && !file.endsWith('.css')) {
        if (!filePrinted) {
          console.log(`\n📄 ${file.replace(/\\/g, '/')}`);
          filePrinted = true;
        }
        console.log(`   L${idx + 1}: ${line.trim().slice(0, 100)}`);
        total++;
      }
    });
  });
}

console.log(`\nTotal de vazamentos potenciais encontrados: ${total}`);
