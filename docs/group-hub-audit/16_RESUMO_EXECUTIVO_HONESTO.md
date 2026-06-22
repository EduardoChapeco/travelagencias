# 16. Resumo Executivo Honesto

## 1. Classificação das Entregas (Auditoria Forense)

Ao auditar as entregas programadas no Plano de Implementação, as funcionalidades receberam as seguintes classificações reais:

1. **REAL PONTA A PONTA**:
   - Fase 1 (Ajuste de variáveis CSS globais de rosa para neutro e adequação visual de páginas B2C/Admin).
   - Fase 2 (Banco de dados com adição de campos de status em `group_tours` via migração DDL).
   - Fase 5 (Layout de Recibos Térmico 80mm e A4, com importadores dinâmicos de renderização de PDF/PNG).
   - Fase 6 (Flyer Promocional 9:16 com canvas gerando imagem PNG com QR Code dinâmico funcional).

2. **REAL, MAS NÃO TESTADA EM PRODUÇÃO**:
   - Envio de listas para hotéis e ônibus (as flags mudam no banco e invalidam caches, mas o e-mail real não é disparado, tratando-se de simulação operacional parcial).

3. **PARCIAL**:
   - Fase 3 (Rooming List Geral com Drag and Drop funcional, mas **Word export está totalmente ausente** e os conflitos de Lost Update exigem recarregamento manual da página).
   - Fase 4 (Financeiro de Grupos com interface e cálculos, mas com alto risco contábil por efetuar processamento de custos no frontend e poluir extratos).

4. **SÓ UI / SÓ BANCO**:
   - Nenhum item se enquadrou em Só UI ou Só Banco de forma isolada, as tabelas e telas conversam entre si.

5. **QUEBRADA EM PRODUÇÃO**:
   - Fase 7 (A visualização de acomodação do Portal do Cliente está quebrada em produção devido ao bloqueio de leitura RLS da tabela `boarding_rooming_list`).

6. **ARQUITETURA INADEQUADA**:
   - Fase 8 (Aprovação de inscrição não atômica via 8 queries sequenciais separadas no frontend, gerando alto risco de dados inconsistentes).
   - Fase 6 (Proposal Studio cloner gera propostas duplicadas sem vínculo estruturado por chave estrangeira).

---

## 2. Top 20 Problemas e Vulnerabilidades

1. **Quebra do Portal**: RLS da tabela `boarding_rooming_list` impede que clientes vejam suas alocações de quarto.
2. **Vazamento de Privacidade**: Se a RLS for aberta, o contêiner baixa a lista completa de quartos e passageiros do grupo no client, vazando dados de terceiros.
3. **Não-Atomicidade na Aprovação**: 8 inserts soltos no frontend criam dados órfãos se a transação falhar no meio.
4. **Falta de Idempotência**: Aprovação de inscrições não possui chaves de proteção contra clique duplo de operadores.
5. **Duplicidade de Clientes**: Inscrições criam clientes duplicados se houver conflito menor de CPF/E-mail.
6. **Duplicidade de Viagens**: Viagens individuais idênticas geradas em paralelo na mesma excursão.
7. **Duplicidade Financeira**: Lançamentos em duplicidade no fluxo de caixa global da agência.
8. **Ausência de Word Export**: Promessa de exportação em Word no checklist foi omitida do código.
9. **Poluição do Extrato de Grupos**: Transações individuais aparecem no extrato de grupos por falta de filtro.
10. **Preço Presumido**: Faturamento assume `base_price` completo para clientes sem pagamento inicial registrado.
11. **Sincronização de Receita Ausente**: Pagamentos posteriores do carnê de parcelas não atualizam `total_paid` nas inscrições.
12. **Custo Variável Escalonado**: Risco de multiplicação incorreta caso o operador cadastre custos consolidados como variáveis.
13. **Lost Update Travado**: Conflitos de edição de quartos exigem refresh manual por falta de feedback dinâmico.
14. **Brochuras Órfãs**: Propostas no Proposal Studio criadas sem chave estrangeira relacional.
15. **Redundância de Brochuras**: Ação de clonar cria infinitas propostas no banco a cada clique (sem checagem se já existe).
16. **QR Code Decorativo de Recibo**: QR Code aponta para string de texto crú, não para um portal de validação real.
17. **Mutabilidade do Recibo**: Recibo gerado ao vivo (sem persistência de snapshot), vulnerável a edições futuras nos dados.
18. **Falta de Disclaimer Fiscal**: Recibos não possuem aviso informando que o documento não substitui Nota Fiscal.
19. **Transbordo Responsivo A4**: Recibo A4 quebra limites de tela em dispositivos móveis (exige rolagem horizontal).
20. **Falta de Touch no Drag and Drop**: DndKit sem `TouchSensor` dificulta arrastar passageiros em telas móveis e tablets.

---

## 3. Avaliação de Riscos e Causa Corretiva Recomendada

- **Executado como pedido?**: **Não**. As fases cruciais de integridade contábil, segurança/privacidade do portal e atomicidade de inscrições foram simplificadas e implementadas no frontend em vez de no servidor/banco.
- **Melhores técnicas?**: **Não**. O sistema delegou responsabilidade transacional e lógica de agregação financeira crítica ao navegador do cliente, ignorando as garantias relacionais do PostgreSQL.
- **Primeira Fase Corretiva Recomendada**: **Fase P0 (Segurança e Integridade)**. Focada em criar a RPC transacional `approve_group_enrollment` no banco de dados e a RPC segura `get_my_room_allocation` com RLS isolado para viabilizar o Portal do Cliente de forma privada.

## 4. Inventário de Arquivos Criados nesta Auditoria
- `docs/group-hub-audit/00_BASELINE_REPOSITORIO_PRODUCAO.md`
- `docs/group-hub-audit/01_PLANO_VS_IMPLEMENTACAO.md`
- `docs/group-hub-audit/02_AUDITORIA_DESIGN_SYSTEM.md`
- `docs/group-hub-audit/03_AUDITORIA_DATABASE_RLS.md`
- `docs/group-hub-audit/04_AUDITORIA_ROOMING_LIST.md`
- `docs/group-hub-audit/05_AUDITORIA_FINANCEIRO_GRUPOS.md`
- `docs/group-hub-audit/06_AUDITORIA_RECIBOS.md`
- `docs/group-hub-audit/07_AUDITORIA_FLYERS.md`
- `docs/group-hub-audit/08_AUDITORIA_PORTAL_CLIENTE_UPLINK.md`
- `docs/group-hub-audit/09_AUDITORIA_APROVACAO_INSCRICAO.md`
- `docs/group-hub-audit/10_AUDITORIA_FLUXOS_PONTA_A_PONTA.md`
- `docs/group-hub-audit/11_AUDITORIA_RESPONSIVIDADE_ACESSIBILIDADE.md`
- `docs/group-hub-audit/12_AUDITORIA_PERFORMANCE_BUILD.md`
- `docs/group-hub-audit/13_MATRIZ_VERDADE.md`
- `docs/group-hub-audit/14_RISCOS_E_REGRESSOES.md`
- `docs/group-hub-audit/15_PLANO_CORRETIVO_PRIORIZADO.md`
- `docs/group-hub-audit/16_RESUMO_EXECUTIVO_HONESTO.md`
