const fs = require('fs');

const content = fs.readFileSync('src/routes/m.passenger.$token.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('checkbox') || line.includes('lgpd') || line.includes('termos') || line.includes('LGPD') || line.includes('Termos')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
