# Sistema Operacional de Engenharia do TravelOS: Workflows Obrigatórios

Este documento especifica os fluxos de trabalho operacionais que o Antigravity deve executar. Cada workflow descreve a entrada, o papel de coordenação, as etapas procedimentais e as saídas esperadas.

---

## WORKFLOW 1 — Prompt Monsterizer

* **Objetivo:** Traduzir solicitações informais do usuário em planos de engenharia altamente detalhados e estruturados.
* **Coordenação Principal:** AGENTE 1 (Prompt Amplifier / Prompt Architect)
* **Entrada:** Um prompt de texto simples ou uma instrução preliminar.
* **Ferramentas Recomendadas:** `grep_search`, `list_dir`, `view_file` (para contextualização rápida).

### Etapas do Algoritmo de Execução
1. **Análise de Intenção Comercial:** Identificar o impacto da feature no faturamento da agência ou na eficiência do agente.
2. **Classificação do Domínio:** Mapear a solicitação para as seguintes áreas:
   * Turístico (Pacotes, Grupos, Embarques, Venda, CRM)
   * Técnico (RLS, Migrations, TypeScript, Hooks, React)
   * Jurídico (LGPD, Consentimento, Aceite de Contratos)
   * CMS (Blocos, Editor Visual, SEO, Renderizador)
3. **Mapeamento Prévio:** Identificar os módulos e rotas impactados no código atual.
4. **Geração de Critérios de Aceite:** Definir limites funcionais claros e regras de validação.
5. **Avaliação de Riscos:** Identificar regressões potenciais de performance ou vazamento de dados.
6. **Formulação de Perguntas Críticas:** Levantar questões sobre regras de negócio ambíguas (por exemplo: "Como deve funcionar o cancelamento se a fatura já estiver emitida?").
7. **Montagem de Plano de Implementação:** Estruturar a entrega em fases interdependentes e incrementais.

* **Saída Esperada:** Artefato `PRD Expansion` e arquivo `implementation_plan.md` no diretório de cérebro da conversa, contendo as questões abertas para o usuário.

---

## WORKFLOW 2 — Inventory Before Creation

* **Objetivo:** Garantir o reaproveitamento máximo do código e evitar a proliferação de componentes ou tabelas redundantes.
* **Coordenação Principal:** AGENTE 2 (Inventory First Architect)
* **Entrada:** O plano de implementação proposto ou lista de entidades desejadas.
* **Ferramentas Recomendadas:** `grep_search` (pelo menos duas buscas com variações semânticas), `list_dir`.

### Etapas do Algoritmo de Execução
1. **Varredura no Banco de Dados:** Pesquisar em `supabase/migrations/` e `src/integrations/supabase/types.ts` se existem tabelas ou tipos equivalentes.
2. **Varredura no Frontend:** Buscar em `src/components/`, `src/routes/` e `src/hooks/` por palavras-chave semanticamente equivalentes.
3. **Análise de Extensibilidade:** Se um componente similar for encontrado, avaliar se ele pode ser adaptado usando novas propriedades (props) opcionais em vez de criar outro arquivo.
4. **Resolução de Conflitos:** Identificar se novas tabelas criarão redundâncias ou loops de chaves estrangeiras.
5. **Matriz de Decisão:** Classificar cada entidade planejada em uma tabela com colunas: `Entidade | Ação (Reusar / Refatorar / Extender / Criar) | Justificativa Técnica`.

* **Saída Esperada:** Artefato `Inventory Report` e `Reuse/Refactor/Create Matrix` documentados.

---

## WORKFLOW 3 — Secure Development Lifecycle (SDL)

* **Objetivo:** Aplicar segurança em profundidade (Zero Trust) em cada nova funcionalidade do sistema.
* **Coordenação Principal:** AGENTE 4 (Security Red Team Auditor)
* **Entrada:** Especificação técnica e plano de banco de dados.
* **Ferramentas Recomendadas:** `grep_search` para buscar por policies de tabelas similares, `view_file` para analisar arquivos de rotas.

### Etapas do Algoritmo de Execução
1. **Modelagem de Ameaças (Threat Model):**
   * Listar Ativos Sensíveis (ex: CPF do passageiro, chaves de API externa).
   * Identificar Agentes de Ameaça (ex: usuário malicioso tentando acessar painel financeiro de outro tenant).
2. **Análise de Permissões (RBAC / RLS):**
   * Verificar se a nova tabela possui RLS habilitada por padrão.
   * Auditar a query da política: ela impede leitura de dados de outras agências? Ela valida se o `agency_id` do usuário logado confere com o da linha da tabela?
3. **Segurança de Inputs:**
   * Garantir que inputs de texto rico que serão impressos na tela passem por sanitização contra XSS.
   * Validar se uploads de arquivos bloqueiam extensões executáveis (ex: `.exe`, `.js`, `.sh`) e validam o tipo de conteúdo (mime-type).
4. **Verificação de Chaves:** Assegurar que nenhum token privado (`service_role` ou chaves de integração externas) esteja exposto em componentes do lado do cliente.

* **Saída Esperada:** Artefato `Threat Model` contendo a `Attack Surface Matrix` preenchida.

---

## WORKFLOW 4 — Feature Reality Verification

* **Objetivo:** Auditar empiricamente se a funcionalidade foi implementada no banco de dados e na interface, bloqueando simulações ou mocks.
* **Coordenação Principal:** AGENTE 8 (QA Regression Auditor)
* **Entrada:** Código implementado e caminhos dos arquivos modificados.
* **Ferramentas Recomendadas:** `view_file`, `run_command` (execução de testes/build).

### Etapas do Algoritmo de Execução
1. **Validação da UI:** Examinar o arquivo do componente React e confirmar que os botões possuem funções de callback reais ligadas a serviços de backend, e não apenas console.logs ou alertas visuais temporários.
2. **Rastreabilidade de Dados:** Rastrear a linha de dados do formulário até o Hook de mutação (ex: `useMutation`), o serviço de comunicação e a tabela do banco correspondente.
3. **Verificação de Persistência:** Conferir no arquivo de tipos do banco ou no esquema de migrations se os dados enviados pelo formulário são gravados em colunas físicas correspondentes.
4. **Auditoria de RLS no Banco:** Confirmar se a escrita passa por RLS ativas e válidas para o Tenant corrente.
5. **Classificação da Feature:** Atribuir à funcionalidade uma nota baseada no Framework de Classificação (CRUD raso, UI fake, SaaS premium, etc.).

* **Saída Esperada:** Artefato `Feature Reality Matrix` atualizado.

---

## WORKFLOW 5 — Prompt-to-Code Match Review

* **Objetivo:** Verificar se 100% dos itens solicitados no PRD original foram codificados com fidelidade técnica.
* **Coordenação Principal:** AGENTE 8 (QA / Match Reviewer)
* **Entrada:** PRD Expandido original e diff dos arquivos modificados.
* **Ferramentas Recomendadas:** `grep_search`, `view_file`.

### Etapas do Algoritmo de Execução
1. **Extração de Requisitos:** Mapear todos os requisitos funcionais e não-funcionais definidos na fase de design.
2. **Auditoria por Item:** Localizar nos arquivos alterados o trecho exato de código correspondente a cada requisito.
3. **Mapeamento de Simplificações:** Avaliar se houve redução no escopo planejado (por exemplo: remoção de filtros de paginação por limite de tempo ou simplificação de validações de formulário).
4. **Busca de Incongruências:** Identificar comportamentos implementados de forma divergente das diretrizes do design system ou da lógica de negócios de turismo aprovada.

* **Saída Esperada:** Artefato `Prompt-to-Code Match Matrix` preenchido, com status final (Match Completo, Parcial, Falhou ou Bloqueado).

---

## WORKFLOW 6 — CMS & Page Builder Full Audit

* **Objetivo:** Garantir a consistência, segurança e qualidade do construtor de páginas públicas e do blog da agência.
* **Coordenação Principal:** AGENTE 7 (CMS/Page Builder Architect)
* **Entrada:** Módulo de CMS (rotas, componentes e banco de dados).
* **Ferramentas Recomendadas:** `grep_search` para buscar esquemas de blocos JSON, `list_dir`.

### Etapas do Algoritmo de Execução
1. **Auditoria de Schemas:** Verificar se cada bloco de página suportado (Banner, Galeria, Depoimentos, FAQ) possui uma tipagem estrita para suas propriedades JSON e validação correspondente.
2. **Auditoria do Editor Visual:** Analisar se a área administrativa permite customização em tempo real das propriedades dos blocos (textos, links, ordenamento, imagens) com inputs funcionais de formulário.
3. **Auditoria do Renderizador:** Conferir se o portal público lê o layout da tabela do CMS e monta a árvore de componentes sem gerar erros de hidratação ou render no React.
4. **Auditoria SEO & Assets:** Verificar se a geração dinâmica de metatags de SEO está ocorrendo e se as imagens são servidas com otimização (uso de formatos modernos e dimensões adaptativas).
5. **Fluxo de Publicação:** Confirmar se há isolamento entre as versões de Rascunho (Draft) e a versão ativa de Produção (Published), permitindo preview prévio das edições antes de estarem online.

* **Saída Esperada:** Artefato `CMS Block Matrix` e relatório técnico detalhado.

---

## WORKFLOW 7 — BigTech Regression Gate

* **Objetivo:** Impedir o deploy de código defeituoso ou incompleto na ramificação principal de produção.
* **Coordenação Principal:** AGENTE 8 (QA & Regression Gate Reviewer)
* **Entrada:** Repositório local após a implementação.
* **Ferramentas Recomendadas:** `run_command`.

### Etapas do Algoritmo de Execução
1. **Validação de Versionamento:** Executar `git status` e analisar modificações para identificar arquivos não rastreados ou modificações acidentais fora do escopo.
2. **Execução de Compilação & Tipagem:** Executar `npm run build` ou o comando de compilação correspondente do projeto para capturar erros silenciosos de importação ou conflitos de bibliotecas.
3. **Análise de Linter e Formatador:** Rodar o analisador estático (ex: `eslint`) e corrigir qualquer violação que impeça a build do projeto.
4. **Filtro Anti-Gambiarra (Anti-Mock/Hardcoded):**
   * Buscar por trechos de teste manual no código (ex: `const user_id = "123"` ou URLs fixas de staging).
   * Confirmar se botões inativos possuem feedbacks reais ao usuário em vez de estarem com links para `#` ou sem qualquer callback anexado.

* **Saída Esperada:** Artefato `Regression Report` assinado pelo QA.

---

## WORKFLOW 8 — Tourism Operations Validation

* **Objetivo:** Verificar se a feature implementada funciona corretamente sob as regras e dores diárias de uma agência de viagens comercial.
* **Coordenação Principal:** AGENTE 9 (Tourism Product PhD)
* **Entrada:** Fluxo de telas e regras de negócio da nova funcionalidade.
* **Ferramentas Recomendadas:** `view_file` (regras e fluxos comerciais).

### Etapas do Algoritmo de Execução
1. **Mapeamento de Jornada:** Rastrear a jornada completa dos dados (por exemplo, desde o recebimento de um lead de pacote turístico até o faturamento e atribuição de comissão do consultor).
2. **Auditoria Hoteleira & de Lotação:** Confirmar se as divisões de quartos, limites de idade para crianças e cálculos de tarifas de passagem são condizentes com os tarifários de operadoras parceiras.
3. **Auditoria Contratual:** Verificar se os termos de cancelamento e taxas administrativas são exibidos de forma clara para o cliente final na tela de compra.
4. **Verificação de Voucher:** Confirmar se o voucher final de viagem exibe todas as informações cruciais (hotéis, localizadores aéreos, voos, contatos dos receptivos locais).

* **Saída Esperada:** Artefato `Tourism Operations Fit Report`.

---

## WORKFLOW 9 — Security Red Team Gate

* **Objetivo:** Tentar burlar ou sequestrar ativamente as permissões e dados da funcionalidade implementada.
* **Coordenação Principal:** AGENTE 4 (Security Red Team Auditor)
* **Entrada:** Aplicação compilada e migrations aplicadas.
* **Ferramentas Recomendadas:** `view_file` (para simular requisições de API).

### Etapas do Algoritmo de Execução
1. **Teste de IDOR (Insecure Direct Object Reference):**
   * Tentar forçar o acesso a rotas de leitura ou mutação passando parâmetros `id` ou `agency_id` arbitrários pertencentes a outros tenants (Cross-Tenant data leakage).
2. **Bypass de Autenticação:** Simular chamadas a funções do Supabase ou Edge Functions sem o cabeçalho JWT ou com tokens inválidos/expirados.
3. **Auditoria de Upload:** Tentar burlar a validação de arquivo do storage enviando arquivos com extensões modificadas (ex: renomear `hack.js` para `hack.png`) e testar se o backend valida o mime-type real.
4. **Privilege Escalation:** Testar se um usuário com perfil de 'Agente' ou 'Cliente' consegue invocar funções administrativas do sistema de forma direta.

* **Saída Esperada:** Relatório de vulnerabilidades críticas e caminhos de ataque documentados no Threat Model.

---

## WORKFLOW 10 — Final Release Judge

* **Objetivo:** Veredito colegiado final atestando se a funcionalidade atende a todos os critérios operacionais para publicação.
* **Coordenação Principal:** Comitê de Líderes de Engenharia e Produto.
* **Entrada:** Relatórios de todos os workflows anteriores.
* **Ferramentas Recomendadas:** Nenhuma (decisão lógica consolidada).

### Critérios de Decisão (Tabela de Portão)
* **APPROVED (Aprovado):** Passou em todos os gates de segurança, não contém mocks, atende ao padrão premium de UI, foi validado no build e está em conformidade com as regras turísticas.
* **APPROVED WITH RISKS (Aprovado com Riscos):** Apresenta inconformidades menores que não afetam a segurança ou a integridade de dados do cliente (ex: pequenos ajustes visuais ou traduções pendentes). Requer plano de correção registrado em tarefas subsequentes.
* **BLOCKED (Bloqueado):** Falhas críticas de segurança, vazamento Cross-Tenant de dados, erros de build TypeScript, mocks evidentes em áreas de produção ou fluxos de turismo logicamente incoerentes.

* **Saída Esperada:** Artefato `Release Gate Report` com veredito final e lista de ações imediatas.
