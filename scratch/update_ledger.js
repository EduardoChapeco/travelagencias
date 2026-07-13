import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, 'coverage_ledger.json');
const mdPath = path.resolve(__dirname, 'coverage_ledger.md');

if (fs.existsSync(jsonPath)) {
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  let updatedCount = 0;
  ledger.forEach(item => {
    if (item.caminho === 'src/components/tasks/TaskShell.tsx') {
      item.status = 'COMPROVADO';
      item.responsabilidade = 'Gerenciador estrutural de visualizações de tarefas (Grid, Kanban, List)';
      item.consumidores = 'src/routes/agency.$slug.daily-tasks.tsx';
      item.issues = 'Remediado import circular com o objeto Route da rota';
      item.fonte_canonica = 'DESIGN.md (ambient glass, no shadow)';
      updatedCount++;
    } else if (item.caminho === 'src/routes/agency.$slug.daily-tasks.tsx') {
      item.status = 'COMPROVADO';
      item.responsabilidade = 'Ponto de entrada de rota para tarefas diárias';
      item.consumidores = 'TanStack Router Tree';
      item.issues = 'Nenhum (antes importava circularmente TaskShell.tsx)';
      item.fonte_canonica = 'TanStack Router Schema';
      updatedCount++;
    }
  });
  
  if (updatedCount > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(ledger, null, 2), 'utf8');
    
    // Regenerate markdown file
    const audited = ledger.filter(i => i.status !== 'NÃO AUDITADO').length;
    
    let md = `# Coverage Ledger - Project Stabilization Inventory\n\n`;
    md += `Total files in src: ${ledger.length}\n`;
    md += `Auditados: ${audited} / Corrigidos: 1 / Pendentes: ${ledger.length - audited}\n\n`;
    md += `| Arquivo | Pasta | Camada | Módulo | Linhas | Status | Issues |\n`;
    md += `| --- | --- | --- | --- | --- | --- | --- |\n`;
    
    // Put audited first, then the rest
    const sorted = [...ledger].sort((a, b) => {
      if (a.status !== 'NÃO AUDITADO' && b.status === 'NÃO AUDITADO') return -1;
      if (a.status === 'NÃO AUDITADO' && b.status !== 'NÃO AUDITADO') return 1;
      return a.caminho.localeCompare(b.caminho);
    });
    
    sorted.slice(0, 100).forEach(item => {
      md += `| [${item.arquivo}](file:///${path.resolve(__dirname, '..', item.caminho).replace(/\\/g, '/')}) | ${item.pasta} | ${item.camada} | ${item.modulo} | ${item.linhas} | ${item.status} | ${item.issues} |\n`;
    });
    if (sorted.length > 100) {
      md += `| ... and ${sorted.length - 100} more files | | | | | | |\n`;
    }
    
    fs.writeFileSync(mdPath, md, 'utf8');
    console.log(`Updated ledger with ${updatedCount} audited items.`);
  }
} else {
  console.error('Ledger file not found.');
}
