const fs = require('fs');
const spec = JSON.parse(fs.readFileSync('docs/infotravel-audit/reference/api-doc.json', 'utf8'));
const paths = Object.keys(spec.paths).filter(p => p.toLowerCase().includes('auth') || p.toLowerCase().includes('login'));
console.log('Matching paths:', paths);
