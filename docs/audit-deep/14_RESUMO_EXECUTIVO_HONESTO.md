# 14. Resumo Executivo Honesto

Este documento resume as descobertas da auditoria técnica forense do repositório TravelAgencias/TravelOS pós-Fases 1 a 12, fornecendo uma visão clara do estado real do projeto.

---

## 1. Visão Geral da Auditoria

A auditoria revelou um sistema de alta qualidade visual, com as premissas estéticas do design plano **Light Editorial SaaS** e do **Brand Kit Dinâmico** bem estruturadas. No entanto, foram encontradas inconsistências graves de versionamento (migrations locais não rastreadas que já estão em produção) e simulações/mocks em fluxos operacionais críticos (upload Pix fake, centrais de chat/e-mail sem disparo real e ausência de tabelas estruturais de check-in).

A boa notícia é que a Fase 3 (OCR Ingestion) e a Fase 10 (Destination Intelligence no portal) foram de fato implementadas ponta a ponta e funcionam com o banco real. A compilação typescript (`npm run typecheck`) está com **zero erros**.

---

## 2. Métricas de Status das Funcionalidades

- **Funcionalidades Reais:** **4** (Brand Kit Cache, OCR Ingestion, Destination Intelligence, Confirmação de Reserva).
- **Funcionalidades Parciais:** **10** (Design System Flat, Vitrine B2C Checkout, Catálogo Fornecedores, Clause Library, PDF/PNG Exports, Omnichannel Inbox, Rooming List, Conferência de Voos, Reacomodação Aérea, Site Builder).
- **Funcionalidades Mockadas/Simuladas:** **2** (Pix Upload de Comprovante no Checkout, Deep Links/Checkin Links de Cias Aéreas).
- **Funcionalidades Ausentes:** **0** (Todos os stubs foram inicializados).
- **Funcionalidades Órfãs:** **1** (`boarding_rooming_list` do modelo antigo de card, substituída por lógica contextual).

---

## 3. Top 20 Problemas Identificados

1. **Migrations locais não rastreadas:** Migrations `20260624*` constam como untracked, embora as tabelas existam na produção.
2. **Dupla fonte de verdade da Rooming List:** Conflito de gravação entre `group_tours.rooming_list` e a tabela `boarding_rooming_list`.
3. **Upload de Pix B2C Fictício:** Checkout de pacotes públicos simula progresso e não sobe o arquivo do comprovante.
4. **Omnichannel Comentado:** Chat do admin grava no banco local, mas não dispara requisições para Resend/Gmail.
5. **Tabelas de Check-in Ausentes:** Produção não possui as tabelas `checkin_links` e `boarding_events` propostas na Fase 7.
6. **Desacoplamento Aéreo:** Itinerários da nova aba "Aéreos" não atualizam os bilhetes planos da aba "Bilhetes de Embarque".
7. **Monolito no Roteador:** O arquivo `client.trips.$id.tsx` possui 1960 linhas de acoplamento de estados.
8. **Ausência de Drag and Drop (Dnd):** O Rooming list normalizado funciona por formulários e dropdowns, não Dnd.
9. **Falta de Exportações no Rooming:** Não há geração de planilhas Excel ou PDFs dedicados para o hotel na Rooming list.
10. **Shadows Radix UI:** Modais e autocomplete herdam sombras padrão da biblioteca Radix UI.
11. **Ausência de Consentimento LGPD:** O formulário de checkout público coleta PII sem checkbox de aceitação de termos.
12. **Falta de Redundância nas Fontes:** Fontes customizadas carregadas via link Google Fonts podem falhar no html2canvas em conexões ruins.
13. **Falta de Render Jobs no Backend:** PDFs assinados de propostas/vouchers são gerados de forma síncrona no lado do cliente.
14. **Centralização de Contratos:** Rota `trips.$id.contract.tsx` utiliza stubs eRPC estática herdada de 49 cláusulas.
15. **Ausência de Alertas WhatsApp:** Nenhuma notificação é disparada para o cliente quando seu status de reacomodação muda.
16. **Falta de Logs Criptográficos:** O histórico de auditoria de contratos é armazenado como string JSON simples.
17. **SLA do Suporte Inativo:** O cálculo de SLA de resposta no Omnichannel inbox não aciona cron de alertas no admin.
18. **Falta de Testes Unitários:** Não existem suites de testes unitários ou de RLS ativos.
19. **Ausência de Rollback de Itinerário:** O arquivamento de itinerários de voo não possui trigger automático para restaurar a versão anterior caso o agente delete a vigente.
20. **Falta de Campo de Fontes de Dados:** A tabela `destination_info` não armazena a URL de expiração da informação.

---

## 4. Top 10 Riscos de Produção

1. **Quebra de Deploy/CI:** Migrations locais não rastreadas podem bloquear deploys automatizados no Git.
2. **Perda de Alocações de Quartos:** Gravações concorrentes de agentes na Rooming list JSONB vs Normalizada podem gerar exclusões silenciosas.
3. **Inadimplência de Vendas B2C:** Clientes podem fraudar o comprovante Pix enviando nomes de arquivos aleatórios (já que o arquivo físico do Pix não é gravado).
4. **Central de Suporte Parada:** Falta de notificação de e-mails para fornecedores/clientes deixa o suporte operando em silêncio.
5. **Erros de RLS no Portal do Cliente:** Falta de aplicação de políticas de cliente na produção pode travar a renderização de localizadores de voo.
6. **Estouro de Heap de Memória (OOM):** A compilação do Vite de produção sem code splitting de chunks pesados pode travar servidores CI de menor memória.
7. **Falha Tipográfica em Documentos:** Vouchers/Propostas gerados com fontes padrão Arial caso as Google Fonts falhem em carregar a tempo do html2canvas.
8. **Inconsistência Operacional de Voos:** Passageiro viajar com PNR antigo porque a aba Aéreos foi atualizada mas a aba Bilhetes de Embarque não.
9. **Passivos LGPD:** Processamento de CPFs/Passaportes em checkout público sem termos explícitos de consentimento.
10. **Lentidão em Roteamento:** Downloads pesados no carregamento de rotas devido ao acoplamento monolítico de 98KB do portal do cliente.

---

## 5. Status de Conclusão de Fases

### Fases Falsamente Consideradas Concluídas:

- **Fase 7 (Check-in / Cias Aéreas):** Mockada (faltam tabelas estruturais de checkin_links, links são estáticos no front).
- **Fase 8 (Tickets / Gmail / Resend):** Partial/UI Fake (mensagens gravam localmente mas não há envio real).
- **Fase 9 (Rooming List):** Parcial (CRUD relacional funciona, mas não há Drag and Drop ou Excel).
- **Fase 11 (Conferência de Voos):** Parcial (é apenas uma lista de edição inline de bilhetes de voo).

### Fases Realmente Concluídas:

- **Fase 1 (Design System Flat & Estabilização):** REAL.
- **Fase 2 (Compatibilização Banco/Front types):** REAL.
- **Fase 3 (OCR Ingestion):** REAL.
- **Fase 10 (Destination Intelligence no portal):** REAL.

---

## 6. Recomendação Corretiva Imediata

- **Fase A (Estabilização Git & Migrations):** Commitar as migrations locais untracked `20260624*` e os arquivos de navegação modificados para alinhar o repositório Git local com o banco Supabase de produção.
