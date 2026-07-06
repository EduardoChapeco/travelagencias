# 16. Security, RLS, Storage and Secrets (Segurança Física e RLS)

Este relatório descreve as políticas de Row Level Security (RLS) no Supabase, regras do Storage de arquivos e a proteção de segredos operacionais.

---

## 1. RLS e Isolamento de Dados por Agência

O Turis adota o padrão multitenant estrito.
* **Mapeamento de Usuário:** O ID do usuário autenticado no Supabase Auth (`auth.uid()`) é cruzado com a tabela `public.profiles`. O `profile` mapeia a qual `agency_id` o consultor pertence.
* **Escopo das Políticas:** Todas as tabelas públicas (`crm_leads`, `proposals`, `clients`, `conversations`, `messages`, `tasks`) aplicam a política de restrição:
  ```sql
  CREATE POLICY "agency_isolation_policy" ON public.leads 
    USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
  ```
* **Bypass de Service Role:** Webhooks e rotinas em Edge Functions utilizam a chave `service_role` apenas para bypassar a RLS ao gravar logs e auditoria interna, mas a verificação contextual do `agency_id` é obrigatória no payload da função.

---

## 2. Bucket e Segurança de Arquivos do Storage

* **`client-documents` (Passaportes, Vistos, RG):**
  * Bucket configurado como privado. A leitura dos arquivos é permitida apenas a membros da agência proprietária do cliente associado através de URLs assinadas (`Signed URLs`) que expiram em 15 minutos, impedindo a exposição de dados sensíveis da LGPD.
* **`agency-media` (Comprovantes, imagens do chat):**
  * Acesso de leitura público apenas para arquivos dentro da pasta `inbox/attachments` para visualização das mídias no chat, mas a gravação é restrita a usuários autenticados da agência.
* **Secrets:** A chave do WhatsApp Business Token e chaves da Meta são gravadas com RLS na tabela `agency_integrations` e descriptografadas apenas em tempo de execução no backend.
