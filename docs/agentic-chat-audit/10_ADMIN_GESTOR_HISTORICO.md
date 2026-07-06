# Painel de Auditoria do Gestor

Este documento descreve a rota e o painel visual dedicado aos gestores para auditoria das interações de IA e monitoramento de logs.

---

## 1. Rota e Layout do Painel de Auditoria

- **Arquivo**: [ai-audit.tsx](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.settings.ai-audit.tsx)
- **Acesso**: A rota `/agency/$slug/settings/ai-audit` foi devidamente integrada na árvore de navegação contextual do gestor:
  - **Link Lateral**: Mapeado no [AppSidebar.tsx](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppSidebar.tsx) como item `"Auditoria de IA"`, associado ao ícone `Shield` de segurança.
  - **Permissão**: O menu de configurações e, consequentemente, o link de auditoria, são renderizados condicionalmente se a propriedade `isAdmin` for verdadeira, mantendo conformidade com as permissões de negócio da agência.

---

## 2. Recursos Funcionais do Dashboard

- **Métricas e KPIs**: Exibe painéis para:
  - **Total de Interações**: Contagem total de mensagens enviadas à IA.
  - **Ferramentas Executadas**: Quantidade de chamadas a ferramentas reais do CRM disparadas pela IA.
  - **Falhas / Erros**: Contagem de exceções de banco ou timeout da IA.
  - **Status de RLS**: Indicador visual confirmando a atividade da segurança multi-tenant no banco.
- **Filtros Dinâmicos**:
  - **Operador**: Carrega dinamicamente a lista de perfis da agência (`profiles` / `user_roles`) para filtrar logs por um agente específico.
  - **Ação**: Dropdown para filtrar por mensagens comuns ou ferramentas comerciais específicas (`create_lead`, `update_lead`, etc.).
- **Stream de Eventos (Event Log)**: Lista ordenada cronologicamente contendo badges de sucesso/erro, nome do operador, timestamp e detalhes da resposta.
- **Visualizador de Metadados JSON**: Cada item de log possui um botão de "olho". Ao ser clicado, expande um contêiner formatado exibindo o payload JSON completo salvo no metadados do `audit_log`, detalhando os parâmetros da ação, IDs de entidades e detalhes de erros.

---

## 3. Classificação das Entregas do Painel

- **Painel Administrativo com Filtros**: **REAL PONTA A PONTA**
- **Gráficos de Custos em Tempo Real**: **SÓ UI** (layouts e cards de métricas desenhados, sem integração ativa de contagem de centavos de APIs externas).
- **Filtro de Membros por Perfil**: **REAL PONTA A PONTA**
