# 09. Meta WhatsApp and Instagram Reality (Realidade da Integração Meta)

## 1. WhatsApp Cloud API
* **Status:** Parcialmente Funcional.
* **Envio/Recebimento:** Funcionam no nível do banco e webhook se chaves manuais forem configuradas.
* **Onboarding (Embedded Signup):** **Não implementado no frontend.** O usuário da agência precisa copiar os IDs e o Access Token manualmente do painel de desenvolvedores da Meta e salvar nos campos de input. Não há carregamento do SDK de Login ou fluxo de popups oficiais.
* **Coexistência:** Não há inteligência de tratamento ou sinalização explícita de coexistência com o aplicativo móvel tradicional do WhatsApp na interface além da coluna do banco.

## 2. Instagram Messaging
* **Status:** **MOCK/SIMULADO.**
* **Integração:** Embora exista a opção visual de conectar o Instagram no menu do Inbox, o handler apenas salva o token via `ai-orchestrator` e insere um registro inativo em `channels`.
* **Fluxo de Mensagens:** Não há implementação de recepção de DMs no webhook oficial nem lógica de envio de respostas de Instagram no emissor.
