# Auditoria de Segurança, Autenticação, RLS e Service Role

Este documento apresenta a análise de vulnerabilidades na autenticação, isolamento de tenant e uso de chaves administrativas (service role) na infraestrutura de IA e OCR do TravelAgencias/TravelOS.

---

## 1. Validação de Autenticação (JWT e Headers)

- **Status Geral**: As Edge Functions de OCR validam a presença de `Authorization` header e executam `supabaseClient.auth.getUser()`, o que impede o uso anônimo ou tokens expirados.
- **Problema Identificado**:
  - A Edge Function `ai-orchestrator` permite bypass total do token JWT se receber a chave `SUPABASE_SERVICE_ROLE_KEY` no header de autorização. Embora isso seja útil para chamadas de sistema (s2s), expõe a função a riscos caso essa chave venha a vazar.

---

## 2. Isolamento de Tenants (Multi-Tenant Checks)

- **Funcionalidades Seguras (OCR)**:
  - `ocr-proposal`, `ocr-passenger-document`, `ocr-boleto`, `ai-voucher-ocr` executam uma consulta na tabela `user_roles` usando o `user.id` do JWT e o `agency_id` do body da requisição:
    ```typescript
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("agency_id", agency_id)
      .maybeSingle();
    ```
    Se o usuário não pertencer à agência, a chamada é bloqueada com erro 403. Isso previne o acesso cruzado de tenants.
- **Vulnerabilidades Críticas (Vazamentos de Tenant)**:
  - As Edge Functions **`ai-orchestrator`**, **`generate-site-ai`**, **`landing-page-agent`** e **`google-business-post`** **NÃO VALIDAM** a relação de membership. Elas aceitam o `agency_id` enviado no body e utilizam a chave de serviço (`supabaseAdmin`) para executar as ações sem checar se o usuário logado realmente tem direito de interagir com os dados daquela agência.
  - **Risco**: Um usuário malicioso autenticado na agência A pode enviar o `agency_id` da agência B no body da requisição e consumir/esgotar a cota de IA da agência B, ou gerar capas e propostas utilizando as chaves de API da agência B.

---

## 3. Políticas de RLS (Row Level Security) na Tabela `api_keys`

As políticas definidas na migration `20260603030500` são:

```sql
create policy "ak read" on public.api_keys for select to authenticated using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));
create policy "ak insert" on public.api_keys for insert to authenticated with check (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));
create policy "ak update" on public.api_keys for update to authenticated using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));
create policy "ak delete" on public.api_keys for delete to authenticated using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));
```

### Fragilidades Identificadas no RLS

1. **Exposição da Chave no SELECT**: A política `ak read` permite que qualquer usuário com a role `agency_admin` consulte a tabela `api_keys` e obtenha a coluna `key_value` (em texto puro ou formato encriptado de fácil descriptografia) no frontend. Isso viola a regra de segurança de credenciais: **o segredo nunca deve voltar para o cliente após cadastrado**.
2. **RPC SECURITY DEFINER**: A função `pick_active_api_key` executa queries internas ignorando o RLS (`SECURITY DEFINER`), mas possui a proteção de `REVOKE EXECUTE ON FUNCTION FROM PUBLIC, anon, authenticated;`, limitando seu acionamento estritamente ao cliente administrativo `service_role`. Isso é seguro contra injeções ou consultas diretas do cliente, contanto que o backend valide quem está solicitando.
