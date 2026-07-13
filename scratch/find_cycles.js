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
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = getFiles(srcDir);
const importMap = new Map();

// Simplified import parser (regex-based)
const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
const exportFromRegex = /export\s+.*?from\s+['"](.*?)['"]/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const imports = [];
  let match;
  
  // Reset regex
  importRegex.lastIndex = 0;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  exportFromRegex.lastIndex = 0;
  while ((match = exportFromRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  const resolvedImports = imports.map(imp => {
    if (imp.startsWith('@/')) {
      return path.resolve(srcDir, imp.slice(2));
    } else if (imp.startsWith('.')) {
      return path.resolve(path.dirname(file), imp);
    }
    return null; // External package
  }).filter(Boolean).map(imp => {
    // Try resolving with .ts, .tsx, /index.ts, /index.tsx
    const extensions = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.d.ts'];
    for (const ext of extensions) {
      const fullPath = imp + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    // Also try direct file path
    if (fs.existsSync(imp)) {
      return imp;
    }
    return null;
  }).filter(Boolean);
  
  importMap.set(file, resolvedImports);
});

// Tarjan's or simple DFS for cycle detection
const visited = new Set();
const stack = new Set();
const cycles = [];

function dfs(node, pathStack = []) {
  if (stack.has(node)) {
    const cycleStartIndex = pathStack.indexOf(node);
    cycles.push(pathStack.slice(cycleStartIndex).concat(node));
    return;
  }
  if (visited.has(node)) {
    return;
  }
  
  visited.add(node);
  stack.add(node);
  pathStack.push(node);
  
  const neighbors = importMap.get(node) || [];
  neighbors.forEach(neighbor => {
    dfs(neighbor, [...pathStack]);
  });
  
  stack.delete(node);
}

for (const file of importMap.keys()) {
  dfs(file);
}

console.log(`Audited ${importMap.size} files for import cycles.`);
console.log(`Found ${cycles.length} dependency cycles.`);

if (cycles.length > 0) {
  console.log('\n--- DETECTED CYCLES ---');
  cycles.slice(0, 10).forEach((cycle, idx) => {
    console.log(`\nCycle #${idx + 1}:`);
    cycle.forEach(node => {
      console.log(`  -> ${path.relative(srcDir, node).replace(/\\/g, '/')}`);
    });
  });
  if (cycles.length > 10) {
    console.log(`\n... and ${cycles.length - 10} more cycles.`);
  }
}
