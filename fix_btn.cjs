const fs = require('fs');

let crm = fs.readFileSync('src/routes/agency.$slug.crm.tsx', 'utf8');
crm = crm.replace(/, DangerButton/g, '');
crm = crm.replace(/DangerButton/g, 'GhostButton');
fs.writeFileSync('src/routes/agency.$slug.crm.tsx', crm);

let app = fs.readFileSync('src/routes/p.corporate.approve.tsx', 'utf8');
app = app.replace(/import \{ DangerButton \} from "\@\/components\/ui\/button";\n/g, '');
app = app.replace(/<DangerButton/g, '<GhostButton className="text-danger hover:bg-danger/10"');
app = app.replace(/<\/DangerButton>/g, '<\/GhostButton>');
fs.writeFileSync('src/routes/p.corporate.approve.tsx', app);
