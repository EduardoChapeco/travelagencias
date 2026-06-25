# Plano de Testes de Compatibilidade & Caracterização

Este documento apresenta a estratégia de teste e verificação para garantir que nenhuma funcionalidade, fluxo, contrato TypeScript ou regra de negócio seja quebrado durante o processo de modularização e refatoração arquitetural.

---

## 🧪 Estratégia de Testes de Caracterização

Antes de mexer em um componente ou service legado, devemos criar um **teste de caracterização** (ou especificação de comportamento) para registrar as entradas e saídas esperadas do código atual.

### Fluxos Mínimos a Validar por Fase:

1. **Login & Troca de Agência**: Garantir que a troca de tenant (`slug` na rota) recarregue corretamente o contexto de agência (`useAgency`) e limpe estados de queries cacheadas de outras agências.
2. **CRM & Leads**: As transições de estágio no Kanban de leads devem persistir ordenadas e atualizar a data de atividade correspondente no banco.
3. **Brochuras & Roteiros (Proposal Studio)**: A clonagem de dados de itinerário das excursões para propostas no Studio deve manter a formatação Rich Text e os links de imagens de capa.
4. **Viagens & Matrículas**: O fluxo de aprovação de matrículas B2C deve provisionar a viagem com plano de parcelamento contendo parcelas consistentes com o preço base configurado.
5. **Rooming List & Alocação**:
   - A alocação de um passageiro a um quarto deve disparar a mutação sem concorrência ou conflitos de versões (concurrency lock).
   - O portal do cliente deve conseguir puxar seu quarto de forma restrita via a RPC `get_my_room_allocation` sem acesso a quartos de outros grupos.
6. **Recibos**: Validar se a abertura do recibo carrega os dados congelados do snapshot gravado na tabela `payment_receipt_snapshots` e não recalcula dinamicamente em caso de edição do cliente.
7. **Exportadores (Excel/Word/PDF)**: A exportação de listas de embarque e quartos deve processar os dados idênticos aos exibidos na UI.

---

## 🔍 Matriz de Verificação Visual e RLS

Após cada mudança de code-splitting ou isolamento de código:

### 1. Verificação de Regressão Visual

- **Ação**: Utilizar testes visuais manuais no navegador (ou ferramentas de snapshot de tela) para garantir que:
  - O layout A4 de recibo mantenha proporções timbradas e caixas de assinatura alinhadas.
  - O flyer 9:16 de divulgação mantenha margens limpas, QR code legível e fontes consistentes em celulares e desktop.
  - O drag-and-drop de quartos apresente transição suave no cursor do mouse e arraste com delay adequado no touch de smartphones.

### 2. Auditoria de Segurança RLS (Multi-tenant)

- **Ação**: Rodar consultas com usuários simulados contendo diferentes papéis de acesso (ex: `agent` de outra agência e `client` final):
  - Certificar que qualquer tentativa de ler quartos da Rooming List de outra agência via RPC retorne erro de autorização ou conjunto vazio de resultados.
  - Testar chamadas diretas com a biblioteca `@supabase/supabase-js` fingindo ser um cliente final acessando tabelas internas.
