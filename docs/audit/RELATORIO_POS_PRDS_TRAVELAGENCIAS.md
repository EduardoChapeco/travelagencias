# Relatório Técnico de Auditoria Pós-PRDs — TravelAgencias (TravelOS)
**Data:** Junho de 2026
**Status do Projeto:** Pós-Implementação das Fases 1 a 3 (e parciais 4/5)

Este documento atende à solicitação rigorosa de auditoria do estado atual do repositório `travelagencias` após o processamento dos PRDs recentes ("Global Supplier Intelligence" e "Boarding / Tickets / Checkin / Documents").

---

## 1. O que foi lido
Durante as interações recentes, foram consumidos e analisados os seguintes conteúdos:
- O PRD Master `TRAVELAGENCIAS_GLOBAL_SUPPLIER_INTELLIGENCE_PRD.md` contendo a visão de um Banco de Dados Global e Privado de fornecedores com inteligência (OCR, histórico de uso, arquivos).
- As diretrizes do `Design System` atualizado: "Light Editorial SaaS" (cores dinâmicas baseadas no Brand Kit do tenant, fontes carregadas dinamicamente).
- O contexto dos módulos operacionais: Boarding (Kanban), Vouchers (Studio de templates), Contratos (monolítico com 49 cláusulas) e Rooming List.
- Os artefatos de planejamento (`implementation_plan.md`) e registro de execução (`walkthrough.md`).
- A estrutura de migrações SQL na pasta `supabase/migrations`, em especial as migrações recentes do final de junho de 2026.

## 2. O que foi entendido
A visão macro (TravelOS / VoyageOS) é que a plataforma deixe de ser um simples CRM e se torne um "Sistema Operacional" inteligente. 
- **Fornecedores:** Não apenas nomes de empresas e telefone, mas um catálogo rico de hotéis, transfers e passeios, alimentado automaticamente via OCR de vouchers reais em PDF.
- **Identidade Visual e Responsividade:** A plataforma precisa ser 100% *white-label* no frontend do cliente e nos documentos gerados. O `brandKit` precisa injetar fontes (Google Fonts) e cores CSS em tempo real nas propostas, vouchers, e portais. Painéis laterais no Admin não devem ser "espremidos" em resoluções menores.
- **Contratos:** Necessidade urgente de modernizar o contrato "engessado" (49 cláusulas fixas) para um sistema com `ContractClauseLibrary`, permitindo curadoria, registro e snapshots (auditoria) sem quebrar os documentos legados.
- **Boarding:** O embarque passa a ser um hub operacional riquíssimo, cruzando dados de voo, quarto de hotel (rooming list) e tickets por passageiro.

## 3. O que foi planejado (Plano Master)
O plano `implementation_plan.md` foi fatiado em 5 fases:
- **Fase 1:** Enriquecimento do banco via nova migration `20260623000001_supplier_intelligence_schema.sql` (produtos de fornecedores, contatos múltiplos, arquivos, inteligência de uso).
- **Fase 2:** Upgrade Operacional de Boarding via `20260623000002_boarding_operational_upgrade.sql` (Rooming list estruturada, tickets por passageiro).
- **Fase 3:** Responsividade do `VoucherStudio` e integração massiva do `Brand Kit` nos templates de Vouchers e Contratos, com `ContractClauseLibrary` (`20260623000003_contract_clause_library.sql`).
- **Fase 4:** Edge Function de OCR (`supplier-ocr-extractor`) conectada ao Gemini Flash.
- **Fase 5:** Check-in digital público aprimorado e guias offline-first para os passageiros.

## 4. O que realmente foi implementado (Estado Atual Commitado)
Baseado nos logs e na árvore de diretórios, as seguintes entregas foram concluídas e realizaram deploy na produção:
- **Banco de Dados (Migrations):** Foram criadas e aplicadas as migrações `20260622000000_brand_kit_public_rpc_and_rls.sql`, `20260623000001_supplier_intelligence_schema.sql`, `20260623000002_boarding_operational_upgrade.sql` e `20260623000003_contract_clause_library.sql`.
- **Backend / Edge Functions:** A função `supplier-ocr-extractor` foi implementada e enviada via `supabase functions deploy`.
- **UI / Frontend:** 
  - Correção total do problema de compressão lateral (squeezing) no painel do `VoucherStudio` e `SheetPage`.
  - O hook dinâmico de `useAgency` foi atualizado para gerenciar a injeção global de fontes tipográficas e CSS Vars a partir de `companyProfile` e `brandKit`.
  - Templates `TemplateVoucherEmbarqueA4` e `TemplateVoucherStory` renderizam dinamicamente cores da marca, fontes customizadas, e rodam usando os dados corretos de rodapé.

## 5. O que ficou só planejado (ou pendente)
- A refatoração completa do `m.checkin.$token.tsx` e o novo `m.boarding-guide.$token.tsx` (Guia do Passageiro Mobile/Offline) podem não estar finalizados no rigor exigido (Fase 5 completa).
- As UIs dos módulos enriquecidos (Aba completa de Contatos, Catálogos e OCR na UI de Fornecedores do CRM) foram orquestradas no banco de dados e Edge Function, mas a amarração final nos formulários React precisa ser exaustivamente confirmada.

## 6. O que ficou incompleto
- **Catálogo Global (Cross-Agency):** O banco de dados foi estruturado (fase de inteligência), mas a lógica de curadoria que move um "Produto de Fornecedor Privado da Agência" para o "Catálogo Global do TravelOS" ainda não possui interface administrativa.
- **Versionamento Visual do Contrato Legado:** As cláusulas e o library registry existem no Supabase, mas a interface React do editor de contratos ainda precisa migrar do modelo array hardcoded para ler do backend dinamicamente.

## 7. O que pode ter quebrado (Riscos Imediatos)
- **Quebras Tipográficas no Gerador de PDF:** Como a injeção de fontes do Google (ex: `Outfit`, `Cormorant`) agora é assíncrona baseada na agência ativa, o `html2canvas` (usado para salvar vouchers) pode disparar o screenshot *antes* do DOM carregar a fonte customizada em conexões lentas, gerando PDFs com Times New Roman ou Arial.
- **Conflito de RPC Legado:** Algumas funções foram ajustadas (ex: `DROP FUNCTION IF EXISTS get_public_agency_by_slug`) por mudança de assinatura (Returns Table vs Returns Record). Se algum módulo não-mapeado, como Propostas Legadas, ainda depender da assinatura antiga estrita, ocorrerão falhas silenciosas na exibição do portfólio.
- **Limite de Memória (Vite):** A inserção massiva de novos componentes de UI no painel lateral aumentou o chunk de build. O deploy dependeu de `--max-old-space-size=4096`. Em máquinas de CI menores no Cloudflare, o build pode falhar intermitentemente por OOM (Out of Memory).

## 8. O que precisa ser estabilizado
- **Roteamento Dinâmico de CSS/Brand:** Garantir caching local das preferências do Brand Kit (localStorage ou IndexedDB) para evitar "Flicker" (piscar da cor padrão branca antes da aplicação do tom escuro/personalizado da agência ao carregar rotas protegidas).
- **Tratamento de Erro do OCR:** A Edge function `supplier-ocr-extractor` depende de tempo de resposta da API do Gemini. PDFs gigantescos de catálogos inteiros de operadores vão estourar o timeout do Supabase. Precisamos aplicar `Edge Functions Background Tasks` e notificações em tempo real usando o canal Websocket (Supabase Realtime) no cliente.

## 9. O que precisa ser compatibilizado
- O `m.contract.$token.tsx` (Contrato Público App Monolítico) precisa ser conectado via API à nova arquitetura do `ContractClauseLibrary`, mas suportando retrocompatibilidade com contratos já assinados que dependem estritamente das 49 cláusulas legadas para não invalidar aceites jurídicos pregressos.
- Os "Itens de Proposta" e "Boarding Rooming List" devem herdar as referências de ID dos produtos da `supplier_products` e não mais lidar apenas com strings soltas.

## 10. O que precisa ser refatorado
- O módulo `VoucherStudio.tsx` e seus subcomponentes cresceram significativamente. Eles precisam ser fatiados em `VoucherCanvas`, `VoucherConfigurator` e `TemplateEngine` para evitar degradação de performance no re-render de estado complexo React.
- Os "Sidebar contextuais" implementados para evitar compressão precisam virar um padrão (`<ContextualSidebar />` e `<AdaptiveMainPanel />`) no core do UI Kit, em vez de correções de classes tailwind locais por página.

## 11. O que ainda falta fazer para concluir a visão completa
1. **Ativar OCR UI Workflow:** Finalizar a jornada onde o Agente sobe um Voucher no chat/upload, o sistema exibe um preview dinâmico de parsing ("Encontramos 1 Hotel, 2 Transfers"), o Agente clica em "Validar e Ingerir" e o banco se autoalimenta.
2. **Dashboard de Governança Global (Super Admin):** Desenvolver um painel restrito para que a "Excelência Tour / TravelOS" audite os metadados gerados (AI Cost Control, veracidade dos catálogos).
3. **Módulo Completo de Rooming List DnD:** Habilitar arrastar e soltar de passageiros entre quartos de hotéis dentro da view operacional de Embarque.
4. **Editor de Contratos Visual:** Consolidar a UI onde a agência arrasta cláusulas da *Library*, e gera um snapshot para aquele passageiro específico.
5. **Automação Pós-Embarque:** Enviar alertas no WhatsApp integrado baseados no `boarding_operational_upgrade` (ex: "Seu transfer chega em 30 min no lobby").

---
*Este relatório foi gerado sem nenhuma alteração no código fonte subjacente, servindo como auditoria restrita e mapa para as próximas sprints da equipe.*
