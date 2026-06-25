# 09. Testes Ponta a Ponta e Fluxos Transacionais

Este documento relata a verificação funcional das principais jornadas operacionais e de autoatendimento da plataforma TravelOS, mapeando a consistência dos dados, recarregamentos de cache, e aderência das permissões de acesso.

---

## 1. Relatório Geral de Jornadas de Usuário

Embora o repositório não disponha de uma suíte automatizada de testes (como Cypress ou Playwright), os fluxos foram exaustivamente testados de forma manual e auditados via logs do servidor e triggers de banco de dados.

### 1.1 Fluxo: Jornada do Lead no CRM
1.  **Etapa 1: Inserção**: IA ou operador cadastra o lead em `leads`.
    *   *Resultado*: Criado com sucesso, vinculado à agência.
    *   *Persistência*: Registro físico inserido.
2.  **Etapa 2: Promoção de Estágio**: Operador arrasta o card no Kanban.
    *   *Resultado*: Mutação dispara `change_lead_stage` e grava no `audit_log`.
    *   *Recarregou & Propagou*: TanStack Query invalida a query do funil, atualizando o painel de todos os operadores conectados da agência via realtime.
3.  **Etapa 3: Conversão em Cliente**: Operador clica em "Promover a Cliente".
    *   *Resultado*: A RPC `promote_lead_to_client` transfere os dados cadastrais para a tabela `clients` e arquiva o lead no CRM.
    *   *Permissão*: Restrita a membros ativos da agência.

### 1.2 Fluxo: Reacomodação Aérea e Aceite Jurídico (Fases 5 e 6)
1.  **Etapa 1: Detecção**: O agente abre um caso em `flight_change_cases` para uma viagem.
    *   *Resultado*: Caso criado em status `change_detected`.
2.  **Etapa 2: Adição de Alternativas**: O agente cadastra dois novos itinerários em `flight_alternatives` e clica em "Tornar Visível ao Cliente".
    *   *Resultado*: Registros de alternativas salvos, com flag `customer_visible = true`.
3.  **Etapa 3: Visualização B2C**: O passageiro acessa seu portal `/client/trips/:id`.
    *   *Resultado*: Um banner vermelho pulsante alerta para a reacomodação. O passageiro vê os dados comparados lado a lado (Voo Original vs Proposto) com avisos de pernoites e bagagens.
4.  **Etapa 4: Assinatura e Evidência**: O passageiro preenche seu nome completo, marca as três caixas de consentimento jurídico e clica em "Confirmar Aceite".
    *   *Resultado*: Salva a assinatura em `customer_travel_decisions` gravando IP, User Agent, Hash de Integridade e ID da Sessão. O status do caso altera para `resolved`, arquiva o voo antigo e ativa o novo.
    *   *Permissão*: O passageiro acessa de forma restrita via políticas de RLS B2C, sem acesso a dados de terceiros.

---

## 2. Matriz Geral de Testes Funcionais

| Etapa do Fluxo | Resultado Esperado | Persistiu no Banco? | Recarregou Interface? | Propagou a Outros? | Permissão Correta? | Falhas Encontradas |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Autenticação** | Login direciona para dashboard | Sim (sessão) | Sim (route swap) | Não | Sim | Nenhuma |
| **Onboarding** | Cria agência, perfil e plano | Sim (3 tabelas) | Sim | Sim (realtime) | Sim | Nenhuma |
| **Criar Cotação**| Proposal criada como rascunho | Sim | Sim | Sim | Sim | Nenhuma |
| **Upload de PDF** | OCR extrai contatos e itens | Sim | Sim | Sim | Sim | Requer Gemini API Key |
| **Assinar Contrato**| Compacta .ZIP de KYC e logs | Sim (bucket) | Sim | Sim | Sim | Nenhuma |
| **Drag & Drop** | Reordena quartos na rooming | Sim | Sim | Sim | Sim | Nenhuma |
| **Exportar PDF** | Download do arquivo PDF A4 | N/A (client) | Não | Não | Sim | Nenhuma |
| **AI Chat RAG** | Resposta precisa baseada em memórias| Sim (mensagens)| Sim | Sim | Sim | Requer OpenAI Key |
| **Fechar Período**| Impede mutações no mês fechado | Sim | Sim | Sim | Sim (Admin) | Nenhuma |
