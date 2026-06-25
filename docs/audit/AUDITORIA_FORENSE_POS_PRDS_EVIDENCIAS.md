# Auditoria Forense Pós-PRDs: Evidências Técnicas Reais

**Data:** 19 de Junho de 2026  
**Status da Auditoria:** Concluída (Sem atenuantes ou otimismo)  
**Autor:** Agente Técnico Antigravity

---

## 1. Estado Atual do Repositório (Evidências)

- **Branch Atual:** `audit/finalizacao-pos-prds` (criada a partir da `main`).
- **Último Commit:** `e64dfba` - _"feat(voucher): dynamic brand kit propagation, A4 template company info footer & responsive canvas layout fixes"_.
- **Status do Build:** `npm run typecheck` passando com **0 erros**.
- **Arquivos Modificados/Não-Commitados:**
  - `docs/audit/RELATORIO_POS_PRDS_TRAVELAGENCIAS.md` (não rastreado)

### 1.1 Inventário de Migrations Recentes

Abaixo está o inventário forense das migrações do banco de dados na pasta `supabase/migrations`:

| Migration                                         | Criou o quê                                                                                                     | Alterou o quê                                                      | Tem RLS? | Tem indexes? | Tem rollback? | Front usa? | Status                                                                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------- | ------------ | ------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `20260622000000_brand_kit_public_rpc_and_rls.sql` | RPC `get_public_agency_by_slug`                                                                                 | Políticas RLS de `brand_kit` e `company_profiles`                  | Sim      | Não          | Não           | Sim        | **REAL PONTA A PONTA** (carrega fontes e cores via context, com risco de flicker).                                         |
| `20260623000001_supplier_intelligence_schema.sql` | Tabelas `supplier_contacts`, `supplier_products`, `supplier_files`, `supplier_reviews`, Bucket `supplier-files` | Colunas de endereço, tags, rating em `suppliers`                   | Sim      | Sim (em Fks) | Não           | Parcial    | **PARCIAL / BANCO OK**. CRUD básico na tela de fornecedores, mas sem ingestão do OCR ou autocomplete.                      |
| `20260623000002_boarding_operational_upgrade.sql` | Tabela `boarding_tickets`, Bucket `boarding-tickets`                                                            | Colunas de embarque (aeroporto, voo, hotel) em `boarding_cards`    | Sim      | Sim (em Fks) | Não           | Parcial    | **PARCIAL / BANCO OK**. View básica em check-in e boarding, sem integração real de tickets ou voos no front.               |
| `20260623000003_contract_clause_library.sql`      | Tabela `contract_clauses`, 8 cláusulas globais padrão, RPC `append_contract_audit`                              | Colunas `clause_snapshot`, `version`, `audit_trail` em `contracts` | Sim      | Sim (em Fks) | Não           | Parcial    | **DESALINHADO / PARCIAL**. Editor de cláusulas existe, mas gerador de contratos usa RPC antigo com 49 cláusulas hardcoded. |

---

## 2. Sinais de Fake, Mocks e Placeholders Encontrados

Após busca rigorosa no código-fonte, foram classificadas as seguintes implementações não-produção:

### 2.1 Ingestão de Produtos e Contatos Extraídos via OCR

- **Arquivo:** [agency.$slug.suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx) (linha 512).
- **Evidência:** O botão de "Confirmar Dados" da aba de arquivos de fornecedor dispara apenas o seguinte update:
  ```ts
  await (supabase as any)
    .from("supplier_files")
    .update({ ocr_reviewed: true, ocr_reviewed_at: new Date().toISOString() })
    .eq("id", f.id);
  ```
  Ele **não realiza** nenhuma chamada para inserir as entidades de produtos (`supplier_products`) ou contatos (`supplier_contacts`) extraídos no JSONB `ocr_data`.
- **Classificação:** **UI FAKE / SEM PERSISTÊNCIA REAL** (os dados extraídos pelo Gemini Flash morrem no JSON de metadados sem se tornarem registros reais).

### 2.2 Upload de Comprovante de Pagamento PIX no Checkout Público B2C

- **Arquivo:** [p.$agency_slug.tour.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.tour.$id.tsx) (linhas 101-116).
- **Evidência:** O upload do comprovante de PIX utiliza um temporizador simulado:
  ```ts
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadedFile(file.name);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };
  ```
- **Classificação:** **MOCK / NÃO PRODUÇÃO** (não sobe o comprovante no Supabase Storage; salva apenas o nome do arquivo no estado local React para colar na nota de texto).

### 2.3 Integração com Gmail e Resend no Painel de Atendimento (Suporte)

- **Arquivo:** [agency.$slug.support.$ticket_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.support.$ticket_id.tsx) (linha 98-99).
- **Evidência:** O handler `sendReply` apenas insere no banco local na tabela `ticket_messages` e contém a seguinte anotação:
  ```ts
  // Se for email real do Gmail, uma Edge Function poderia interceptar via Webhook na tabela ticket_messages
  // Ou chamamos a EF diretamente aqui, mas por ora vamos focar na persistência local.
  ```
- **Classificação:** **UI FAKE / SEM INTEGRAÇÃO** (a interface permite selecionar "E-mail Fornecedor", mas não há envio para Resend ou Gmail).

### 2.4 Rooming List (Alocação de Quartos)

- **Evidência:** A aba "Inscritos" na excursão (`agency.$slug.group-tours.$id.tsx`) e a página de passageiros da viagem (`agency.$slug.trips.$id.passengers.tsx`) mostram títulos como "Rooming List", mas apenas exibem uma tabela/cartões de passageiros comuns com campo de texto estático para "Acomodação" (Ex: `Standard`). Não existem tabelas de quartos (`boarding_rooming_list`) e nenhum Drag and Drop de quartos (single, duplo, triplo) está implementado.
- **Classificação:** **BANCO OK, UI FAKE/PENDENTE**.

### 2.5 Destination Intelligence

- **Evidência:** A tabela `destination_info` existe no banco de dados (`supabase/migrations`), mas **nenhum arquivo** no frontend (`src/`) possui referências ou consultas a esta tabela.
- **Classificação:** **BANCO OK, UI PENDENTE**.

### 2.6 Airline Deep Links

- **Evidência:** Não há código para as companhias aéreas LATAM, GOL, Azul ou MSC gerarem links automáticos baseados nos dados de PNR/sobrenome. O check-in na página `/m/checkin/$token` exibe apenas PNR textual.
- **Classificação:** **PLANEJADO, NÃO IMPLEMENTADO**.

---

## 3. Sombras e Desvios de Design System (Fora do Visual Lock)

Detectamos o uso impróprio de sombras (que contraria a regra absoluta de design plano **Light Editorial SaaS**):

| Arquivo                                                | Classe/trecho                           | Problema                                      | Correção necessária                                          |
| ------------------------------------------------------ | --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `src/routes/agency.$slug.financial.reconciliation.tsx` | `shadow-sm` (linha 316)                 | Presença de sombra na tabela de reconciliação | Substituir por `shadow-none` ou remover                      |
| `src/routes/agency.$slug.financial.reconciliation.tsx` | `shadow-xl` (linhas 402, 481)           | Sombra pesada nos modais de upload/detalhes   | Substituir por `shadow-none` ou usar borda simples           |
| `src/routes/agency.$slug.group-tours.$id.tsx`          | `shadow-sm` (linha 374, 246, 252, etc.) | Abas e cartões usando sombras sutis           | Remover sombra, aplicar `shadow-none`                        |
| `src/routes/agency.$slug.suppliers.$id.tsx`            | `shadow-sm` (linha 715)                 | Sombra no container do logotipo do fornecedor | Substituir por borda fina `border border-border shadow-none` |
| `src/routes/agency.$slug.boarding.tsx`                 | `shadow-sm` (linhas 213, 225, 237)      | Cartões do Kanban de embarque usam sombra     | Substituir por borda simples ou cor de fundo plana           |
| `src/routes/agency.$slug.suppliers.index.tsx`          | `hover:shadow-...` (linha 124)          | Efeito de sombra no hover dos itens           | Remover efeito de sombra, usar destaque de borda             |
| `src/routes/agency.$slug.design-system.tsx`            | `shadow-lg` (linha 167, 875)            | Exemplos de Shadow no guia do Design System   | Atualizar documentação visual para reforçar `shadow-none`    |

---

## 4. Auditoria Detalhada dos Módulos Solicitados

### 2.1 Design System / Visual Lock

- **Estado:** Parcial. CSS Vars implementadas, sidebar ultrafina e topbar adaptadas, porém sombras indevidas ainda residem em sub-módulos como Reconciliação, Boarding e Suppliers.
- **Evidências:**
  - Arquivo: [styles.css](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css) (linhas 201-206) possui regras legadas de sombra.
  - Correção: Garantir `shadow-none` rígido em toda a árvore DOM.

### 2.2 Brand Kit Global

- **Estado:** Parcial / Risco de Flicker.
- **Evidências:**
  - O hook `useAgency` (`agency-context.tsx`) injeta fontes assincronamente inserindo uma tag `<link>` no HTML.
  - **FALHA CRÍTICA:** Nenhum arquivo que gera PDF/PNG via `html2canvas` (como `VoucherStudio.tsx` ou `ExportPdfButton.tsx`) executa `await document.fonts.ready` antes da renderização. Isso faz com que fontes customizadas (como Outfit ou Cormorant) não apareçam no arquivo final em conexões lentas, revertendo para Arial.
  - Correção: Inserir `await document.fonts.ready` antes do disparo do `html2canvas`.

### 2.3 Site Builder / Builder Core & 2.4 Biolink Builder

- **Estado:** Real (Biolink integrado no Core).
- **Evidências:**
  - O Biolink não possui rota isolada na administração; ele é tratado como um modo de template (`template = "biolink"`) dentro do `portal.pages.$page_id.tsx`.
  - Bloqueia layouts desktop (força viewport Mobile) e ativa blocos restritos (como `biolink_links`).
  - Persistência: Real no banco (tabela `portal_pages`), mas o B2C Checkout de PIX associado a inscrições é mockado no upload.

### 2.5 Pacotes / Roteiros / Vitrine pública

- **Estado:** Parcial.
- **Evidências:**
  - Rota pública: `p.$agency_slug.tour.$id.tsx` renderiza o roteiro.
  - Inscrição pública: Funciona, chama `enrollPublicTour` que cria o lead no CRM e insere o registro na tabela `group_tour_enrollments`.
  - **GAPs:** O fluxo de checkout do Pix possui upload simulado no frontend. Não há upload de arquivo no storage `passenger-documents` para este comprovante.

### 2.6 Supplier Intelligence

- **Estado:** Banco OK / UI Parcial.
- **Evidências:**
  - Tabelas e RLS criadas na migration `20260623000001`.
  - O front possui tela de detalhes do fornecedor (`suppliers.$id.tsx`) onde permite criar e deletar contatos e produtos associados.
  - **GAPs:** Ausência completa de integração cruzada de fornecedores, deduplicação ou autocomplete em orçamentos, propostas e vouchers.

### 2.7 OCR de fornecedor

- **Estado:** Backend OK / UI Parcial.
- **Evidências:**
  - Edge Function `supplier-ocr-extractor` existe.
  - O front chama em `suppliers.$id.tsx` (linha 434) e atualiza `ocr_data`.
  - **GAPs:** A confirmação do OCR não ingere os dados estruturados de produtos ou contatos nas tabelas correspondentes.

### 2.8 Contratos / ContractClauseLibrary

- **Estado:** Banco OK / UI Desalinhada.
- **Evidências:**
  - Tabela `contract_clauses` com 8 registros semeados criada.
  - Componente `ContractClauseLibrary.tsx` criado.
  - **FALHA CRÍTICA:** A página de emissão do contrato (`agency.$slug.trips.$id.contract.tsx`) faz a chamada para o RPC legado `contract_template_clauses` (que retorna o template estático de 49 cláusulas), ignorando por completo a biblioteca `contract_clauses` recém-criada.

### 2.9 Propostas / Vouchers / Render (html2canvas)

- **Estado:** Parcial.
- **Evidências:**
  - Gerador de PDF e PNG funciona, mas sofre de falhas tipográficas intermitentes por não aguardar o carregamento assíncrono das Google Fonts no DOM.

### 2.10 Informações de Embarque & 2.11 Airline Deep Links

- **Estado:** Planejado, Não Implementado / Parcial.
- **Evidências:**
  - Portal de embarque `/m/checkin/$token` exibe apenas um checklist reativo simples sem automações, sem deep links de cias aéreas e sem dados consulares integrados.

### 2.12 Tickets / Gmail / Resend

- **Estado:** Parcial / UI Fake.
- **Evidências:**
  - Banco possui tabelas e chaves para Resend.
  - Painel de Atendimento (`support.$ticket_id.tsx`) insere localmente na tabela `ticket_messages`, mas não integra de fato com Gmail ou Resend para envio real.

### 2.13 Rooming List

- **Estado:** Planejado, Não Implementado (MOCK).
- **Evidências:**
  - Não há migração ou tabelas de quartos no banco. O frontend possui apenas campos de texto estáticos nos passageiros.

### 2.14 Destination Intelligence

- **Estado:** Banco OK, UI Pendente (Ausente no Front).
- **Evidências:**
  - Tabela `destination_info` sem consumo em nenhuma rota React.

---

## 5. Matriz de Verdade Forense

| Funcionalidade                 | Real ponta a ponta | Parcial | Só banco | Só UI | Mock | Ausente | Evidência                                                                  |
| ------------------------------ | ------------------ | ------- | -------- | ----- | ---- | ------- | -------------------------------------------------------------------------- |
| **Design System Editorial**    |                    | X       |          |       |      |         | Sombras no módulo financeiro, boarding e suppliers.                        |
| **Brand Kit Dinâmico**         |                    | X       |          |       |      |         | Flicker de cores e PDF gerado sem esperar fontes.                          |
| **Site Builder Core**          | X                  |         |          |       |      |         | Rotas e blocos persistidos no banco.                                       |
| **Biolink Builder**            | X                  |         |          |       |      |         | Modo mobile do Builder com blocos próprios.                                |
| **Vitrine Pública de Pacotes** |                    | X       |          |       |      |         | Checkout com upload de Pix fake.                                           |
| **Supplier Intelligence**      |                    | X       |          |       |      |         | CRUD de produtos local, sem autocomplete ou merge global.                  |
| **OCR de Vouchers**            |                    | X       |          |       |      |         | Executa extração, mas "Confirmar" não persiste produtos/contatos.          |
| **Contract Clause Library**    |                    | X       |          |       |      |         | Biblioteca criada, mas emissão de contrato usa RPC de 49 cláusulas legado. |
| **Propostas/Vouchers PDF**     |                    | X       |          |       |      |         | Exportações instáveis devido ao carregamento de fontes.                    |
| **Check-in / Airline Links**   |                    |         |          |       | X    |         | Links não gerados, check-in exibe apenas PNR textual.                      |
| **Tickets / Gmail / Resend**   |                    | X       |          |       |      |         | Local persistence OK, mas dispatch de e-mail não integrado.                |
| **Rooming List**               |                    |         |          |       |      | X       | Ausência de tabelas e UI de quartos.                                       |
| **Destination Intelligence**   |                    |         | X        |       |      |         | Tabela `destination_info` vazia e intocada no frontend.                    |
