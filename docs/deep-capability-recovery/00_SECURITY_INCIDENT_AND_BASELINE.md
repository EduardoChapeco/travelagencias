# 00. Security Incident and Baseline (Auditoria de Segurança)

Este relatório apresenta a auditoria de segurança das credenciais e a definição da linha de base de segurança do TravelOS.

---

## 1. Auditoria de Segredos e Vazamento de Credenciais

### 1.1 Investigação no Histórico do Git
* Realizamos uma varredura rigorosa em busca de chaves de API, segredos de serviço, tokens JWT e chaves privadas que possam ter sido expostos em commits anteriores.
* O token do Supabase (`service_role` ou similar) compartilhado no histórico da conversa foi marcado como **comprometido** e sua rotação imediata foi solicitada.
* **Invariante:** Nenhuma credencial ou token privado deve ser gravado ou persistido no Git, arquivos Markdown de walkthrough, localStorage do navegador ou logs acessíveis ao frontend.

### 1.2 Auditoria de Arquivos Locais de Configuração
* Validamos que as variáveis de ambiente sensíveis (ex: `SUPABASE_SERVICE_ROLE_KEY`, `META_ACCESS_TOKEN`, `WHATSAPP_TOKEN`) estão devidamente alocadas no painel da Cloudflare (como Secrets do Workers) e no arquivo `.env` local, o qual está devidamente listado no `.gitignore` para evitar envio acidental ao repositório remoto.

---

## 2. Auditoria de Controles e Permissões (Supabase RLS)

### 2.1 Políticas de Row Level Security (RLS)
* **Status:** RLS está habilitado em todas as tabelas críticas de produção (`agencies`, `profiles`, `crm_leads`, `conversations`, `messages`, `channels`, `clients`, `client_documents`, `proposals`).
* **Isolamento Multitenant:** A política garante que membros de uma agência só consigam ler e manipular registros cuja coluna `agency_id` seja correspondente à sua própria agência:
  ```sql
  CREATE POLICY "agency members read contacts" ON public.contacts 
    FOR SELECT USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
  ```
* **Vulnerabilidades Mitigadas:**
  * **IDOR (Insecure Direct Object Reference):** A RLS barra requisições do frontend que tentem acessar IDs de outras agências diretamente.
  * **Mass Assignment:** Restringimos a escrita em colunas sensíveis (como `assigned_user_id` e permissões de roles) através de triggers e procedures executadas exclusivamente no banco de dados.

---

## 3. Segurança do Storage e Assinaturas Digitais

### 3.1 Permissões dos Buckets do Storage
* Os buckets `client-documents` e `agency-media` possuem políticas de segurança ativas.
* **Documentos de Passageiros (RG/Passaporte):** Arquivos armazenados no bucket `client-documents` são privados. O acesso do frontend ocorre exclusivamente através de URLs assinadas de curta duração (`signed URLs`), geradas dinamicamente via backend seguro, impedindo o acesso público direto aos documentos pessoais.
