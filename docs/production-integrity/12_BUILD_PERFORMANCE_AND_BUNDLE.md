# 12. Performance de Build e Análise do Bundle

Este relatório analisa o comportamento de compilação da aplicação, consumo de memória do compilador e a eficiência das dependências do bundle de produção.

## 1. Incidente do Heap Limit (Out of Memory)

Ao executar a compilação local da aplicação em um ambiente limpo utilizando o comando padrão `npm run build` (sem flags de aumento de heap), o processo **falha sistematicamente**:

- **Mensagem de Erro:**
  ```text
  FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
  ```
- **Causa do Comportamento:** O bundler ultrapassa o limite padrão de memória do Node.js (cerca de 2048 MB). A causa raiz desse estouro de memória é o processamento pesado de análise estática e compilação do compilador Vite + Tailwind CSS V4, agravado pela presença de dependências densas importadas de forma redundante e monolitos de código.
- **Resolução Utilizada:** O walkthrough utilizou `$env:NODE_OPTIONS="--max-old-space-size=8192"` para expandir o heap limit de build para 8 GB. Embora isso oculte o erro e permita a conclusão do build em 34.29 segundos, isso não resolve o problema subjacente de ineficiência do bundle e impede o deploy em esteiras de CI/CD básicas que limitam recursos de RAM a 2 GB ou 4 GB (como no GitHub Actions ou Cloudflare Pages autogerenciado).

## 2. Auditoria do Bundle e Code Splitting

Analisamos o impacto e a eficiência do fatiamento de código (Code Splitting) implementado no repositório:

1. **Dynamic Imports de Bibliotecas Pesadas:**
   - **jsPDF:** A biblioteca `jspdf` é importada corretamente via `import("jspdf")` de forma assíncrona dentro dos métodos de clique no `VoucherStudio.tsx` e `ExportPdfButton.tsx`. Isso remove o peso do jsPDF da renderização inicial da página.
   - **xlsx:** Importada dinamicamente no `exportRoomingList.ts`.
2. **Importação Estática do `html2canvas`:** Ao contrário do jsPDF, o `html2canvas` é importado de forma **estática** no topo dos arquivos `VoucherStudio.tsx` (linha 31) e `agency.$slug.trips.$id.vouchers.tsx` (linha 36). Isso força o carregamento dessa dependência no chunk principal do portal de viagens, aumentando o tempo de carregamento de páginas básicas que não utilizam exportadores.
3. **Dependências Duplicadas e Barrel Imports:**
   - A coexistência de componentes duplicados em `@/components/ui/` e `@/components/ui/form.tsx` cria redundâncias de compilação no AST (Abstract Syntax Tree).
   - A importação massiva de ícones do `lucide-react` em arquivos únicos sem tree-shaking apropriado arrasta centenas de declarações de ícones não utilizados para os chunks locais.
