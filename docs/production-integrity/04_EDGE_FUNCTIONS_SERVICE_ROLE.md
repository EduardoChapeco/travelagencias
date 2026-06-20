# 04. Edge Functions e Uso do Service Role

Este documento analisa as Edge Functions do TravelOS, focando no hardening das chamadas, na validação de permissões e no risco introduzido pelo uso de privilégios administrativos.

## 1. Mapeamento de Segurança das Edge Functions de OCR

Foram auditadas as quatro Edge Functions envolvidas no processamento inteligente de documentos:
* `ai-voucher-ocr`
* `ocr-proposal`
* `ocr-passenger-document`
* `ocr-boleto`

A tabela abaixo resume os controles de segurança implementados nas versões atualmente implantadas em produção:

| Edge Function | Valida JWT | Valida Membership | Valida Role | Valida Resource Ownership | Usa Service Role | Risco Cross-Tenant | Custo/Rate Limit |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `ai-voucher-ocr` | SIM | **NÃO** | **NÃO** | **NÃO** | SIM | **ALTO** (Consumo de chaves alheias) | Inexistente |
| `ocr-proposal` | SIM | **NÃO** | **NÃO** | **NÃO** | SIM | **ALTO** (Leitura de propostas e chaves) | Inexistente |
| `ocr-passenger-document` | SIM | **NÃO** | **NÃO** | **NÃO** | SIM | **ALTO** (Leitura de chaves) | Inexistente |
| `ocr-boleto` | SIM | **NÃO** | **NÃO** | **NÃO** | SIM | **ALTO** (Leitura de chaves) | Inexistente |

## 2. Detalhamento Técnico das Vulnerabilidades

1. **Validação do JWT:**
   * O código implementa o check correto de JWT: `supabaseClient.auth.getUser()`. Se o token for inválido, a execução é bloqueada. Isso garante que apenas usuários autenticados no Supabase utilizem o serviço.
2. **Ausência de Controle de Tenant (Membership):**
   * *Problema:* O parâmetro `agency_id` é aceito livremente no JSON body enviado pelo frontend. O script da Edge Function utiliza o `supabaseAdmin` para invocar a procedure `pick_active_api_key` ou selecionar diretamente a tabela `api_keys` filtrando pelo `agency_id` recebido.
   * *Impacto:* Como o cliente administrador ignora RLS, o banco de dados retorna a chave de API da agência sem validar se o usuário do JWT pertence àquela agência. Um usuário autenticado pode consumir tokens e cotas de IA de qualquer agência concorrente cadastrada no sistema apenas alterando o ID no corpo HTTP.
3. **Ausência de Verificação de Papel (Role):**
   * A extração de dados e consumo de APIs de inteligência artificial de fornecedores deveria ser restrita a operadores (`agent`, `agency_admin`). Clientes da agência (usuários finais) não deveriam poder acionar esses endpoints indiscriminadamente, mas não há validação de roles (`user_roles`).
4. **CORS Aberto (`*`):**
   * Os cabeçalhos de resposta retornam `"Access-Control-Allow-Origin": "*"`. Qualquer site pode tentar fazer requisições cross-origin para estas funções se conseguir capturar o token JWT do usuário, aumentando a superfície de ataque para CSRF ou clonagem de portal.
5. **Falta de Validação de Schema (Payload):**
   * A função lê as variáveis por destruturação simples: `const { file_base64, mime, agency_id } = body;`. Não há validação estruturada com ferramentas como `Zod`. Isso torna a execução suscetível a erros de runtime por payloads corrompidos.
6. **Stack Traces e Vazamento de Mensagens de Erro:**
   * Em caso de falha nas APIs do Gemini ou Groq, o erro é retornado no corpo da resposta: `return new Response(JSON.stringify({ error: error.message }), { status: 400 });`. Se a chave falhar ou houver exceções de conexão, dados internos e mensagens de erro do provedor podem ser expostos para o cliente final.
