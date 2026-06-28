# 22 Impedimentos Externos Pendentes

Apesar de a aplicação estar com compilação e infraestrutura local estabilizadas, a transição para produção é limitada por alguns bloqueios externos que exigem chaves e acessos proprietários do usuário.

---

## 1. Supabase Personal Access Token (PAT)
* **Bloqueio:** Falta de PAT para a CLI do Supabase (`supabase login`).
* **Consequência:** Não é possível rodar `supabase gen types typescript` de forma automatizada no pipeline de CI sem expor erros. Isso obriga o uso temporário de `as any` em arquivos que consomem as tabelas recém-criadas.
* **Resolução:** O usuário deve gerar um token de gerenciamento no dashboard do Supabase e rodar a regeneração local de tipos para restaurar a tipagem forte do client.

---

## 2. Aprovação de APIs e Webhooks do WhatsApp (Meta B2B)
* **Bloqueio:** Ausência de chaves ativas (`WHATSAPP_TOKEN`, ID do número cadastrado na Meta) e URL de webhook pública homologada pela Meta.
* **Consequência:** As Edge Functions `whatsapp-sender` e `whatsapp-webhook` não podem ser testadas de ponta a ponta com tráfego real. O envio/recebimento de mensagens reais fica no estado "Configuração Necessária".

---

## 3. Credenciais de API de GDS (Infotravel)
* **Bloqueio:** Dependência de chaves de API da plataforma de GDS Infotravel.
* **Consequência:** O sync automático de bilhetes aéreos e hotéis (`infotravel-connector`) está inativo em produção até o input das credenciais de sandbox/produção no painel de integrações.
