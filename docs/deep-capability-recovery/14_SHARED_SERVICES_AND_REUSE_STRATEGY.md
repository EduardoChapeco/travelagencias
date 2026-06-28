# 14. Shared Services and Reuse Strategy (Reutilização de Serviços)

Este relatório detalha a estratégia de reuso de serviços transversais no TravelOS.

---

## 1. Mapeamento de Serviços Compartilhados

* **Serviço de Assinatura Eletrônica (`sign-contract`):**
  * Núcleo único de verificação de autenticidade, assinatura e logs. O mesmo serviço é consumido pela rota de assinatura pública do cliente e pelo fluxo de pós-venda da agência.
* **Serviço de Análise de Arquivos e OCR (`processOcrFile`):**
  * Acionado ao fazer upload de faturas de hotéis, voos ou documentos de identificação de passageiros, extraindo dados de forma transacional.
* **Serviço de Notificação Multi-canal:**
  * Dispara alertas (Web Push, e-mail comercial, WhatsApp template) baseando-se nas configurações de gatilhos operacionais (`whatsapp_operational_triggers`).

---

## 2. Invalidação de Cache e Estados Globais

* **React Query:** Toda mutação em um serviço compartilhado (ex: assumir atendimento em `inbox.tsx` ou alterar status do lead em `createLeadFromSession`) invalida de forma explícita as chaves de query correspondentes (`['conversations']`, `['crm-leads']`). Isso força o refetch automático das dependências e atualiza todas as telas da plataforma de forma homogênea.
