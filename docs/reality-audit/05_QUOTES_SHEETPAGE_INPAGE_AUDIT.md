# Auditoria do Módulo de Cotações: SheetPage vs. InPage

Este documento analisa a substituição da gaveta lateral (`SheetPage`) pela página dedicada (`InPage`) na criação de cotações, avaliando o impacto na responsividade, produtividade dos agentes e propondo a arquitetura ideal.

---

## 🔍 Contexto da Mudança

Anteriormente, a criação de cotações ocorria de forma síncrona através do componente `NewProposalSheet` (uma gaveta lateral slide-in). Em refatorações recentes:

1. No arquivo [crm.$lead_id.lazy.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.$lead_id.lazy.tsx), o botão "Nova Cotação" foi alterado para redirecionar o usuário para a rota `/agency/$slug/proposals/new`.
2. A rota [proposals.new.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.new.tsx) foi criada, contendo uma página completa (`InPage`) centralizada.

### Por que a mudança foi feita?

- **Espaço para OCR**: A importação de orçamentos por inteligência artificial (OCR) exige uma área de drop de arquivo grande e a exibição de painéis de status de extração. O espaço estreito (480px) de uma gaveta lateral ficava excessivamente apertado para essa interface de upload e visualização de resultados de IA.
- **Isolamento de Erros**: Isolar o formulário em uma rota facilita a validação e impede que re-renderizações de formulários pesados lentifiquem a tela de detalhes do Lead ou do CRM.

---

## 📊 Análise Comparativa de UX & Produtividade

| Critério de Análise            | Gaveta Lateral (`NewProposalSheet`)                                                   | Página Dedicada (`InPage` / `/new`)                                                | Vencedor                   |
| :----------------------------- | :------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------- | :------------------------- |
| **Responsividade (Mobile)**    | `max-w-full` se adapta bem a celulares, mas a rolagem interna concorre com o teclado. | Ótima adaptação em coluna única sem concorrência de foco de rolagem.               | **InPage**                 |
| **Nº de Cliques & Transições** | **0 transições de página**. Abre instantaneamente na tela atual.                      | **1 transição de carregamento completa** para ir e outra para voltar/cancelar.     | **SheetPage**              |
| **Preservação de Contexto**    | Permite ver as anotações e timeline do lead logo abaixo do overlay.                   | Perde totalmente o contexto da tela anterior. O agente precisa memorizar detalhes. | **SheetPage**              |
| **Uso da Tela (Área Útil)**    | Estreita para formulários complexos ou dropzones de arquivos grandes.                 | Ampla (max-w-3xl) ideal para imports e visualizações lado a lado.                  | **InPage**                 |
| **Consistência do Fluxo**      | Utilizada no Kanban do CRM e na listagem de Propostas.                                | Utilizada apenas ao abrir por dentro dos detalhes de um Lead específico.           | **Nenhum (Inconsistente)** |

---

## 🛠️ Recomendação de Arquitetura Correta (Híbrida)

Preservar a mudança apenas porque "já está lá" prejudica a produtividade do agente que realiza cadastro rápido. A arquitetura correta deve ser **Híbrida**:

1. **Quick Create (Gaveta Lateral - `NewProposalSheet`)**:
   - Mantida para acionamento na listagem geral de Cotações e no Kanban do CRM. O agente clica em "Nova Cotação", insere apenas o Título/Cliente e salva imediatamente sem sair de sua visualização de trabalho.
2. **Deep Create & Import Hub (Página Completa - `/proposals/new`)**:
   - Ideal para quando o agente deseja realizar importações complexas ou carregar arquivos pesados de fornecedores para leitura via OCR de IA.
3. **Limpeza de Código Morto**:
   - Remover as variáveis e estados órfãos (como `proposalSheetOpen` que nunca é setado para true) do arquivo [crm.$lead_id.lazy.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.$lead_id.lazy.tsx) para evitar desperdício de renderização.
