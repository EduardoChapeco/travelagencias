# Multiagentes, Personas e Skills

Este documento audita a arquitetura de personas especializadas, o roteamento de intenções e a cooperação entre os agentes e revisores.

---

## 1. Roteamento de Intenções e Registro de Personas

O TravelOS não emula especialistas em um prompt monolítico. O roteador seleciona a persona mais qualificada com base no conteúdo da pergunta do operador:
* **Arquivo**: [AgentRouter.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/AgentRouter.ts)
* **Personas Registradas**:
  * `backoffice`: Auxilia em cadastros de leads, preenchimento de formulários de viajantes e cotações básicas.
  * `manager`: Focado em análises comerciais de faturamento, margem de lucro e relatórios gerenciais da agência.
  * `destination_asia`: Especialista com prompt customizado em roteiros e documentação consular local para Tailândia, Filipinas e China.
* **Lógica de Roteamento**: A função `routeToSpecialist(userMessage)` faz varredura por palavras-chave na mensagem do usuário para determinar qual System Prompt especializado anexar ao prompt base.

---

## 2. IA Revisora (Double-Pass)

Para garantir integridade nas respostas da IA especialista, o sistema implementa uma segunda etapa de validação automática:
* **Fórmula de Revisão**: No arquivo [ai-chat.functions.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts#L369-L394), o rascunho de resposta gerado pelo especialista é enviado a um segundo processamento de LLM (`REVIEWER_PROMPT`).
* **Verificações do Revisor**:
  * Bloqueio contra injeções de prompt indiretas ou desvios de finalidade.
  * Ajuste do tom para tom estritamente operacional/comercial, expurgando termos técnicos de banco de dados ou depuração.
  * Detecção de erros conceituais flagrantes nas instruções.
* **Gaps**: A IA revisora é executada como chamada de rede subsequente de forma síncrona. Isso encarece o custo e adiciona latência na resposta do chat do frontend, mas provê uma camada de proteção adicional.

---

## 3. Classificação das Entregas de Multiagentes

* **Roteamento de Personas Especialistas**: **REAL PONTA A PONTA**
* **IA Revisora (Double-Pass)**: **REAL, MAS NÃO TESTADA**
* **Orquestração Multitask Assíncrona**: **AUSENTE**
