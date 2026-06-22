# Relatório Executivo da Verdade: Auditoria Técnica Forense

Este documento sintetiza de forma honesta e transparente as conclusões técnicas da auditoria de infraestrutura e interfaces do TravelAgencias/TravelOS.

---

## 🎯 Resumo das Descobertas e Estado Atual

### 1. Code-Splitting e Dívida do Heap de Memória
- **Diferença**: O code-splitting foi implementado separando as páginas gigantes (`crm.$lead_id.lazy.tsx`, `group-tours.$id.lazy.tsx`, `omnichannel.lazy.tsx`) do bundle estático principal. 
- **Verdade Executiva**: Isso reduziu o tamanho de carregamento inicial do navegador, mas **não solucionou a causa raiz do estouro de memória**. O build do Nitro SSR ainda requer a configuração manual `NODE_OPTIONS=--max-old-space-size=8192` para passar, evidenciando vazamentos de dependências ou importações circulares severas no bundler.

### 2. Infraestrutura de IA e OCR
- **Diferença**: A arquitetura `AI Provider & API Key Orchestration` e a tabela `ai_api_credentials` foram implementadas com sucesso e segurança no `/ai-orchestrator`.
- **Verdade Executiva**: Há bypass ativo. Módulos fundamentais do sistema, como o **Caixa Financeiro** e a tela de **Fornecedores**, não migraram suas requisições de OCR e continuam batendo nas Edge Functions legadas (`/ocr-boleto` e `/supplier-ocr-extractor`), ignorando a central de orquestração. Isso quebra o monitoramento central de cotas e fallbacks.

### 3. Modulo de Cotações: SheetPage (Drawer) vs. InPage (Página `/new`)
- **Diferença**: O botão "Nova Cotação" da tela de leads foi alterado para redirecionar o usuário para a página `/proposals/new` (`InPage`).
- **Verdade Executiva**: A rota `/proposals/new` é útil para imports de orçamentos pesados por OCR de IA (que requerem muito espaço). No entanto, o redirecionamento bruto destrói o contexto de anotações do Lead e obriga o agente a realizar cliques adicionais de carregamento. O componente `NewProposalSheet` (drawer rápido) ainda é usado em outras listagens, resultando em uma usabilidade inconsistente. Recomenda-se a imediata unificação sob uma **Arquitetura Híbrida**.

### 4. Compilação TypeScript do Frontend
- O frontend compila com **zero erros** no compilador TypeScript (`tsc --noEmit`). No entanto, isso exigiu adulterar o código com coerções `(supabase as any)` devido à falta de sincronia das tabelas de IA no contrato estático `types.ts` do frontend.
