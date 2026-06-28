# 12. Inbox & Omnichannel Consolidation (Consolidação do Chat)

Este relatório descreve a consolidação do módulo de Inbox e Omnichannel unificado sob o mesmo modelo canônico e interface premium.

---

## 1. Modelo Canônico e Domínio Real

Para unificar de forma estável o chat e sanar a perda de capacidades do Omnichannel legado:
* **Canais Reais:** WhatsApp (via WhatsApp Cloud API Oficial), E-mail (via autenticação Gmail/Google API) e Instagram Direct (Meta APIs).
* **Estrutura de Tabelas Utilizada:**
  * `channels` (tipo enum `public.channel_type` - whatsapp, email, webchat). O canal do Instagram Direct é mapeado como tipo `webchat` ou configurado dinamicamente através das chaves de integrações Meta em `agency_integrations`.
  * `conversations` (vincula o canal e o contato do cliente, com o status `open`, `pending`, `closed`).
  * `messages` (mensagens inbound/outbound reais, com controle de status de leitura/entrega e URLs de mídias).

---

## 2. Interface Premium e Ações Reincorporadas

A nova interface em `/inbox` reincorporou a totalidade dos recursos do Omnichannel:
* **Gravação de Áudio:** Gravação real utilizando `MediaRecorder` com envio de arquivo `.webm` para o Storage `agency-media`.
* **Mutações Inteligentes:**
  * Criar lead no CRM direto do contato.
  * Gerar propostas automáticas por IA baseadas no histórico do chat.
  * Análise de sentimento comportamental do lead.
  * Notas internas persistidas no metadado do contato.
  * Documentação e upload de RG/Passaporte de passageiros associados ao contato no CRM.
* **Gaveta de Conexões (Sheet):** Transmutada a primeira coluna fixa de configurações em um Sheet deslizante à esquerda.
