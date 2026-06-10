const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/aline/Music/travelagencias/src/routes';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

for(const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, 'utf8');
  let changed = false;
  if(content.includes('\\${')) {
    content = content.replace(/\\\$\{/g, '${');
    changed = true;
  }
  if(content.includes('\\`')) {
    content = content.replace(/\\`/g, '`');
    changed = true;
  }
  if(changed) {
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Fixed:', file);
  }
}
