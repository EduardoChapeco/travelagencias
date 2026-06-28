# 01. Declared vs Actually Created (Declarado vs Realmente Criado)

## 1. O que foi declarado como concluído vs Estado Real

### Integração Meta (WhatsApp e Instagram)
* **Declaração:** Integração completa conectada ao Inbox e banco de dados real.
* **Realidade:** O WhatsApp funciona de forma básica com chaves manuais (token e phone number id). O fluxo de **Embedded Signup** (Login da Meta / postMessage / troca de código por token) é inexistente na interface do usuário (UI). A integração do **Instagram** está somente na UI e no salvamento do token/id do canal — não há webhook de recebimento de DMs de Instagram implementado nem envio operacional de respostas.

### Páginas Legais e Compliance
* **Declaração:** Compliance legal completo com páginas de privacidade e termos.
* **Realidade:** As páginas de `/privacy`, `/terms` e `/data-deletion` foram criadas localmente em código agora nesta sessão. Não existiam anteriormente no bundle de produção. O callback da Meta de data deletion ainda não está operacional de ponta a ponta em produção por falta de domínio público canônico homologado.

### Radar Global de Clientes
* **Declaração:** Radar de clientes ao vivo em mapa interativo integrado à operação.
* **Realidade:** O Radar de clientes lê destinos de viagens e aéreos do banco, mas a exibição no mapa usa coordenadas aproximadas de um dicionário estático no código (`COUNTRY_COORDINATES`) ou espalha os pins via hash de forma puramente matemática. Não existe rastreamento GPS real nem geocodificação ativa.

### Módulo de Tarefas
- **Declaração:** Módulo de tarefas estabilizado e Kanban otimizado.
- **Realidade:** O Kanban foi estabilizado em termos de carregamento de tarefas e ordenação, mas a renomeação de colunas é puramente local (`localStorage`) e não persiste no banco de dados da agência.
