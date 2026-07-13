import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../src');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

function getCommitHash() {
  try {
    const gitHead = fs.readFileSync(path.resolve(__dirname, '../.git/HEAD'), 'utf8').trim();
    if (gitHead.startsWith('ref:')) {
      const refPath = gitHead.split(' ')[1];
      return fs.readFileSync(path.resolve(__dirname, `../.git/${refPath}`), 'utf8').trim();
    }
    return gitHead;
  } catch (e) {
    return 'unknown-commit';
  }
}

const allFiles = getFiles(srcDir);
const commit = getCommitHash();
const ledger = [];

allFiles.forEach(file => {
  const relativePath = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
  const basename = path.basename(file);
  const dirName = path.dirname(relativePath);
  
  // Categorize layer and module based on path
  let layer = 'unknown';
  let module = 'unknown';
  
  if (relativePath.startsWith('src/routes')) {
    layer = 'route';
    module = relativePath.split('/')[2] || 'root';
  } else if (relativePath.startsWith('src/components')) {
    layer = 'component';
    module = relativePath.split('/')[2] || 'global';
  } else if (relativePath.startsWith('src/hooks')) {
    layer = 'hook';
    module = relativePath.split('/')[2] || 'global';
  } else if (relativePath.startsWith('src/services')) {
    layer = 'service';
    module = relativePath.split('/')[2] || 'global';
  } else if (relativePath.startsWith('src/types')) {
    layer = 'type';
    module = relativePath.split('/')[2] || 'global';
  } else if (relativePath.startsWith('src/utils') || relativePath.startsWith('src/lib')) {
    layer = 'infrastructure/lib';
    module = 'global';
  }
  
  // Read first few lines or count lines
  const content = fs.readFileSync(file, 'utf8');
  const linesCount = content.split('\n').length;
  
  ledger.push({
    arquivo: basename,
    caminho: relativePath,
    pasta: dirName,
    camada: layer,
    modulo: module,
    linhas: linesCount,
    responsabilidade: 'A definir',
    consumidores: 'A definir',
    status: 'NÃO AUDITADO',
    issues: 'Nenhum',
    fonte_canonica: 'A definir',
    ultima_revisao: new Date().toISOString().split('T')[0],
    commit_revisado: commit
  });
});

fs.writeFileSync(
  path.resolve(__dirname, 'coverage_ledger.json'),
  JSON.stringify(ledger, null, 2),
  'utf8'
);

// Also generate a summary markdown
let md = `# Coverage Ledger - Initial Inventory\n\n`;
md += `Total files in src: ${ledger.length}\n\n`;
md += `| Arquivo | Pasta | Camada | Módulo | Linhas | Status |\n`;
md += `| --- | --- | --- | --- | --- | --- |\n`;

ledger.slice(0, 100).forEach(item => {
  md += `| [${item.arquivo}](file:///${path.resolve(__dirname, '..', item.caminho).replace(/\\/g, '/')}) | ${item.pasta} | ${item.camada} | ${item.modulo} | ${item.linhas} | ${item.status} |\n`;
});
if (ledger.length > 100) {
  md += `| ... and ${ledger.length - 100} more files | | | | | |\n`;
}

fs.writeFileSync(path.resolve(__dirname, 'coverage_ledger.md'), md, 'utf8');
console.log(`Generated ledger with ${ledger.length} entries.`);
