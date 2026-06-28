# 07. RLS, Storage, and Tenancy (Segurança, RLS e Multi-tenant)

## 1. Row Level Security (RLS)
* **Tabela `whatsapp_connections`:**
  * Possui política `Agencies can manage their whatsapp connections` garantindo isolamento:
    ```sql
    CREATE POLICY "Agencies can manage their whatsapp connections" 
      ON public.whatsapp_connections
      FOR ALL USING (is_agency_member(auth.uid(), agency_id));
    ```
* **Tabelas `channels`, `conversations`, `messages`, `contacts`:**
  * Possuem RLS ativo garantindo que membros da agência só acessem registros cujo `agency_id` esteja associado a seu perfil.
* **Tabela `data_subject_requests`:**
  * Criada com RLS permitindo que membros da agência visualizem e gerenciem requisições associadas à agência.

## 2. Storage Buckets
* Buckets `client-documents` e `agency-media` possuem RLS ativos.
* Acesso aos arquivos do bucket `client-documents` é restrito e feito somente por URLs assinadas temporárias geradas pelo backend seguro, mitigando riscos de acesso não autorizado a documentos pessoais (RG/Passaporte).
