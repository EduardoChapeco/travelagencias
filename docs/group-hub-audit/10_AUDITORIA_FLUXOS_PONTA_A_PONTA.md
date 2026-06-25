# 10. Auditoria dos Fluxos Ponta a Ponta

## Análise de Integração por Etapa de Fluxo

### Fluxo A: Inscrição B2C e Provisionamento Operacional

- **Etapas**: Página pública `/p/$slug/tour/$id` → Cadastro de passageiro + upload de comprovante → Painel administrativo → Ação de Aprovar → Provisionamento de Clientes, Viagens, Contratos, Planos de Pagamento, Parcelas, Fluxo de Caixa → Portal "Minhas Viagens".
- **Auditoria**:
  - A inscrição grava corretamente no banco e anexa comprovante.
  - A aprovação roda as queries no frontend. Contudo, a falta de atomicidade e de RLS permissiva para o cliente no portal quebra o fluxo de ponta a ponta na ponta final (o cliente não consegue ver seu quarto).
  - **Status Real**: **PARCIAL**.

### Fluxo B: Logística e Rooming List

- **Etapas**: Criação de quartos → Distribuição de quartos → Drag and Drop de passageiros → Fechamento da Lista → Envio para hotel/ônibus → Exportação Excel → Exibição no Portal.
- **Auditoria**:
  - O DndKit funciona perfeitamente, gravando o JSONB de passageiros no quarto.
  - O checklist de validação é dinâmico.
  - O envio de e-mails para o hotel e ônibus é simulado (apenas alterna flags no banco, sem envio de e-mail real).
  - A exportação para Excel é real. A exportação para Word é inexistente.
  - **Status Real**: **PARCIAL** (Bloqueado por RLS no portal e Word ausente).

### Fluxo C: Emissão de Recibo de Pagamento

- **Etapas**: Ação de gerar recibo → Geração de código de autenticação → Renderização de Layout (A4 ou Térmico 80mm) → Impressão / PDF / PNG.
- **Auditoria**:
  - Renderiza layouts fiéis no frontend.
  - Download de PNG e PDF funcionando via bibliotecas dinâmicas.
  - QR Code codifica apenas texto. O recibo não é imutável (sem persistência de snapshot no banco).
  - **Status Real**: **REAL, MAS COM LIMITAÇÕES DE SEGURANÇA/AUDITORIA**.

### Fluxo D: Flyer Story de Divulgação

- **Etapas**: Detalhes da excursão → Geração de Canvas 9:16 → QR Code de Reserva → Download PNG → Cadastro de Lead.
- **Auditoria**:
  - Geração de imagem e download de PNG funcionando perfeitamente.
  - QR Code funcional redirecionando para a inscrição.
  - Ausência de tracking UTM para monitorar origem dos leads.
  - **Status Real**: **REAL PONTA A PONTA**.

### Fluxo E: Brochura Comercial no Proposal Studio

- **Etapas**: Detalhes da excursão → Ação "Criar Brochura" → Cópia de dados (itinerário, inclusos, fotos) → Redirecionamento para o Proposal Studio.
- **Auditoria**:
  - Cria e preenche a proposta corretamente, redirecionando o agente.
  - Geração de registros duplicados e falta de chave estrangeira estruturada no banco de dados.
  - **Status Real**: **PARCIAL / ARQUITETURA INADEQUADA**.

### Fluxo F: Consolidação Financeira

- **Etapas**: Pagamento aprovado → Lançamento financeiro → Atualização do Dashboard Financeiro de Grupos (KPIs) → Caixa Geral.
- **Auditoria**:
  - O dashboard financeiro faz a leitura dos dados e apresenta os totais.
  - Cálculo de custos variáveis sujeito a erros.
  - Dessincronização de receita por usar a tabela de inscrições estática como fonte de faturamento.
  - Extrato geral poluidi com viagens individuais.
  - **Status Real**: **PARCIAL**.
