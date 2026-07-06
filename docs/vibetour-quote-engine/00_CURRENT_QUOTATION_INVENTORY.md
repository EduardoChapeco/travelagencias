# 00. Inventário do Sistema de Cotação Atual (Current Quotation Inventory)

Este documento realiza o inventário das telas, fluxos, arquivos e serviços existentes relacionados a cotações e propostas no Turis.

---

## 1. Inventário de Recursos Físicos

| Recurso / Componente             | Localização do Arquivo                                               | Status / Estado Real                                        |     Classificação      | Evidência / Papel no Sistema                                                  |
| :------------------------------- | :------------------------------------------------------------------- | :---------------------------------------------------------- | :--------------------: | :---------------------------------------------------------------------------- |
| **Nova Proposta/Cotação (Form)** | `src/routes/agency.$slug.proposals.new.tsx`                          | UI operacional. Integra drag-and-drop de arquivos para OCR. | **REAL PONTA A PONTA** | Formulário de criação de propostas com vinculação opcional de leads/clientes. |
| **Listagem de Propostas**        | `src/routes/agency.$slug.proposals.index.tsx`                        | Lista propostas ativas filtradas por agência.               | **REAL PONTA A PONTA** | Interface administrativa das propostas.                                       |
| **Preview da Proposta**          | `src/routes/agency.$slug.proposals.$id.preview.tsx`                  | Renderização visual da cotação/proposta.                    | **REAL PONTA A PONTA** | Visualização pré-envio do material.                                           |
| **Página Pública da Proposta**   | `src/routes/m.proposal.$token.tsx`                                   | Interface pública para o cliente final.                     | **REAL PONTA A PONTA** | Visualização do cliente com assinatura online.                                |
| **Serviço de Cotações**          | `src/services/proposals.ts`                                          | Contém métodos de CRUD e envio para OCR.                    | **REAL PONTA A PONTA** | Integração com banco e chamada para o Vision OCR.                             |
| **Mapeador Contábil de Totais**  | `supabase/migrations/20260611000001_recalculate_proposal_totals.sql` | Trigger de recálculo automático de taxas/valores.           | **REAL PONTA A PONTA** | Mantém totais contábeis consistentes no banco.                                |
| **Conversão para Viagem**        | `supabase/migrations/20260614000001_convert_proposal_to_trip.sql`    | Procedimento de transformação em viagem.                    | **REAL PONTA A PONTA** | Cria trip a partir da proposta aprovada.                                      |

---

## 2. Diagnóstico de Cobertura e Gaps

- **Cotação Multicenário**: Atualmente **ausente**. O Turis cria apenas propostas lineares de cenário único. Não há capacidade nativa de testar opções alternativas (voos mais tarde, noites extras) dentro do mesmo contexto de cotação de forma estruturada.
- **Mapeamento de Mocks**: **0**. Toda a gravação e manipulação de cotações/propostas no banco Supabase é real e integrada com as regras de totais e RLS da agência.
