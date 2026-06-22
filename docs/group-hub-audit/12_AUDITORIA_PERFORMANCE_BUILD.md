# 12. Auditoria de Performance & Compilação (Build)

## 1. Pipeline de Compilação (Heap Limits e OOM)
- **Problema de OOM**: A execução do comando padrão `npm run build` falha sistematicamente com `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory` durante o empacotamento do servidor SSR (Nitro).
- **Causa Raiz**: O compilador do Nitro tenta compilar e otimizar todas as rotas estáticas e dinâmicas da aplicação de uma só vez, excedendo o limite de memória padrão do Node.js (~2GB).
- **Mitigação**: O comando de contingência `$env:NODE_OPTIONS="--max-old-space-size=8192"; npm run build` aloca até 8GB de memória para o processo do Node.js, permitindo que a build finalize com sucesso (conforme comprovado em nossa execução anterior). O typecheck passa com sucesso sem erros.

---

## 2. Otimização de Pacotes (Lazy Loading)
A implementação do código seguiu corretamente os princípios de otimização de pacotes de frontend, carregando bibliotecas pesadas de forma assíncrona (lazy loading) e sob demanda:
- **`xlsx` (SheetJS)**: Carregada dinamicamente via `const XLSX = await import("xlsx")` no utilitário de exportação de Rooming List.
- **`html2canvas`**: Carregada sob demanda via `await import("html2canvas")` tanto no gerador de recibos quanto na aba de download do flyer promocional.
- **`jspdf`**: Carregada sob demanda via `await import("jspdf")` apenas ao acionar o download do recibo em formato PDF.
- **Impacto**: O tamanho do bundle principal (`index.js` inicial) foi poupado de carregar mais de ~1.5MB de código Javascript de terceiros na primeira renderização, melhorando o tempo de carregamento da página (FCP e LCP).

---

## 3. Gargalos de Banco de Dados e Frontend (Queries N+1 e Cálculos de CPU)

### Queries N+1 Mitigadas por UI
No painel da Rooming List Geral (`rooming-list.tsx`), o dashboard faz o carregamento inicial apenas da lista de excursões (`group_tours`). As queries de alocação de quartos (`boarding_rooming_list`) e inscrições (`group_tour_enrollments`) só são ativadas quando o painel do grupo específico é expandido pelo agente. Isso evita o gargalo de N+1 queries na abertura da página, limitando as requisições ao banco sob demanda.

### Processamento Pesado no Client (Financeiro de Grupos)
Na página de Financeiro de Grupos (`agency.$slug.financial.groups.tsx`), a listagem de todos os grupos ativos, suas inscrições e custos é processada em memória no navegador do cliente:
```typescript
const tourEnrols = enrollments.filter((e) => e.group_tour_id === t.id);
const totalCost = fixedSum + varSum;
const netProfit = revenue - totalCost;
```
- **Problema**: À medida que a agência cresce e acumula centenas de grupos históricos e milhares de inscrições confirmadas, a busca de todas as tabelas completas para filtragem em memória do navegador degradará o desempenho do frontend (gargalo de CPU e rede). A consolidação deveria ser realizada no banco de dados através de uma View indexada ou RPC agregadora, paginando as excursões de forma adequada.
