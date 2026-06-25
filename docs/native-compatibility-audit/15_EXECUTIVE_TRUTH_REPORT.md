# Relatório Executivo de Verdade (Executive Truth Report)

Este documento sumariza formalmente o diagnóstico final resultante da auditoria forense completa realizada no Motor VibeTour.

---

## 1. Conclusões Principais da Auditoria

### 1.1. O que foi comprovado como NATIVO E COMPATÍVEL
* As telas de Workspace e layouts seguem o padrão TanStack Router e Design System canônico de formulários do projeto.
* O fluxo de criação de cotações, controle de intenções de viagem e associação de passageiros.
* A gravação física de cenários e scorecards de cotações no banco remoto.
* O fluxo de simulação de aceitação de proposta utilizando o orquestrador de IA.

### 1.2. O que foi implementado em paralelo
* Não foram criadas bibliotecas paralelas ou componentes UI customizados fora do Design System.

### 1.3. O que está duplicado
* A migration `20260726000000_vibetour_quote_tables.sql` foi executada de forma ad-hoc na base remota, o que duplicará o registro ou causará falhas de deploy quando tentarmos fazer o commit formal via CLI.

### 1.4. O que está incompatível
* O service do RAG (`quotes-rag.ts`) utiliza desvios de tipo (`as any`) sistemáticos para poder acessar tabelas de banco inexistentes no arquivo Supabase `types.ts`.
* O código de simulação agêntica tenta acessar propriedades do tipo `Json` do Supabase sem realizar coerção ou cast prévio, gerando **erros de compilação estática (Typescript block)**.

### 1.5. Quais tabelas ou colunas estão ausentes
* As tabelas da base de conhecimento vetorial RAG estão completamente ausentes do banco remoto: `knowledge_sources`, `knowledge_documents`, `knowledge_chunks` e `knowledge_embeddings`.
* A função RPC `match_knowledge_embeddings` para busca de similaridade cosseno está ausente do banco remoto.

### 1.6. Quais migrations não foram aplicadas
* Todas as 14 migrations locais a partir do dia 15 de Julho de 2026 (ID `20260715000000` até `20260728000000`) não foram aplicadas formalmente à base remota do Supabase.

### 1.7. Quais contratos estão divergentes
* A tipagem da base de dados gerada em `src/integrations/supabase/types.ts` não possui as declarações das quatro tabelas de RAG, divergindo das interfaces canônicas declaradas em `src/types/quotes.ts`.

### 1.8. Quais telas não persistem corretamente
* A aba de **Cérebro Semântico** (Cadastro e Listagem de Diretrizes) falha ao salvar dados porque a API do Supabase retorna erro 400 (Tabela não encontrada) devido à ausência das tabelas no banco de dados.

### 1.9. Quais fluxos quebram após reload
* O fluxo de indexação RAG e as buscas que dependem do RAG falham deterministicamente.

### 1.10. Quais riscos de RLS existem
* **Vulnerabilidade Alta (P0)**: As políticas RLS nas tabelas `score_profiles` e `decision_rules` permitem que qualquer usuário autenticado altere, crie ou exclua regras globais, expondo todas as agências do ecossistema a vandalismo de dados ou quebras lógicas.

### 1.11. Quais divergências existem entre local, main e produção
* A branch `main` local e remota estão em sincronia com o git. Porém, o banco de dados remoto (produção Supabase) diverge do estado local, possuindo tabelas parciais criadas sem controle de versionamento CLI e totalmente desprovido de tabelas RAG e RLS atualizadas.

---

## 2. Quantitativos de Classificação

* **REAL PONTA A PONTA**: 7 features (Telas de cotação core, scoring, simulação).
* **REAL NÃO TESTADA**: 1 feature (Integração física com GDS da Infotravel/Incomum).
* **AUSENTE / QUEBRADA**: 3 features (Aba de conhecimento RAG, indexação semântica, RPC vetorial).
* **INSEGURA**: 3 tabelas (Regras globais e scorecards com RLS vulnerável).
* **MIGRATION NÃO APLICADA**: 14 migrations.

---

## 3. Ordem Recomendada de Correções (Roadmap)

1. **Prioridade 1 (P0 - Segurança)**: Aplicar correção de RLS global e isolamento de tenants (migration `20260727000000`).
2. **Prioridade 2 (P0 - Compilação)**: Refatorar o código TypeScript para sanar os erros do typecheck no service de simulação.
3. **Prioridade 3 (P1 - Integridade RAG)**: Aplicar migration `20260728000000` para subir tabelas e RPC de RAG, regenerar tipos Supabase e remover bypasses de `as any`.
4. **Prioridade 4 (P1 - Idempotência comercial)**: Corrigir duplo clique no botão de conversão para evitar propostas duplicadas.
5. **Prioridade 5 (P2 - Conectividade)**: Atualizar endpoint do Infotravel para HTTPS para evitar falha 405 decorrente de redirecionamento 301.
6. **Prioridade 6 (P2 - Custos de IA)**: Consolidar chamadas de simulação consecutivas em requisição lote para economia de tokens.
