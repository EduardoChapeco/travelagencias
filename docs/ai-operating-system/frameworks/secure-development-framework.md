# Framework: Secure Development Lifecycle (SDL) & Zero Trust

**Propósito:** Definir os requisitos de segurança e governança que devem ser embutidos em cada fase de desenvolvimento de software no Turis. Nenhuma funcionalidade deve confiar na validação do lado do cliente (Frontend). O sistema é projetado sob o princípio de Privilégio Mínimo (Least Privilege) e Defesa em Profundidade.

---

## 1. Requisitos de Autenticação e Autorização (RBAC)

1. **Proteção de Rotas:**
   - Toda rota do painel administrativo (`/agency/*`, `/admin/*`) deve passar por validação de sessão ativa no roteador ou middleware do framework.
   - Componentes visuais sensíveis (ex: botão de excluir fornecedor) devem ser ocultados de usuários sem a role adequada, porém a validação final da ação deve ocorrer no banco (RLS) ou em Edge Functions.
2. **Defesa contra IDOR (Insecure Direct Object Reference):**
   - Parâmetros passados em URLs (como `agency_id`, `client_id`, `rfp_id`) nunca devem ser aceitos pelo backend sem validar se o token de autenticação JWT do usuário logado possui propriedade ou vínculo comprovado com esses identificadores.

---

## 2. Sanitização de Inputs e Prevenção de Injeções (XSS & SQLi)

1. **Prevenção de Cross-Site Scripting (XSS):**
   - Entradas de texto rico vindas do CMS, editores de blog ou formulários de proposta devem ser sanitizadas antes de serem gravadas no banco de dados e higienizadas no momento de renderização no frontend.
   - Utilizar bibliotecas de higienização de HTML (como `DOMPurify`) limitando elementos permitidos a tags básicas (`p`, `strong`, `em`, `h1`, `h2`, `ul`, `ol`, `li`, `img`, `a`).
   - Tags de script (`<script>`), iframe (`<iframe>`) e atributos inline de JavaScript (`onload`, `onerror`, `onclick`) devem ser removidos obrigatoriamente.
2. **Prevenção de SQL Injection (SQLi):**
   - Toda e qualquer comunicação com o banco PostgreSQL através de RPCs ou scripts customizados deve utilizar consultas parametrizadas ou o query builder do Supabase (que parametriza variáveis por padrão).
   - Evitar concatenação direta de strings em comandos SQL brutos dentro do código ou migrações.

---

## 3. Segurança de Uploads e Gerenciamento de Mídia

1. **Validação de Extensão:**
   - O upload de arquivos deve ser restrito aos formatos explicitamente permitidos pelo contexto (ex: imagens de blog: `png`, `jpg`, `webp`; documentos/contratos: `pdf`).
   - Arquivos com extensões perigosas ou executáveis (`.exe`, `.js`, `.sh`, `.bat`, `.php`, `.py`) devem ser bloqueados no storage policy e na API.
2. **Validação de MIME-Type:**
   - O sistema deve inspecionar o cabeçalho HTTP `Content-Type` enviado pelo cliente e, se aplicável, validar o tipo do arquivo a fim de mitigar uploads mascarados (ex: um script JS salvo como `.jpg`).
3. **Isolamento de Buckets:**
   - Buckets públicos de mídia do portal ou blog devem possuir políticas de RLS que permitam leitura anônima, mas apenas escrita por usuários autorizados do respectivo tenant.
   - Documentos confidenciais (contratos, PDFs de passaportes, comprovantes financeiros) devem ser armazenados em buckets privados. O acesso a esses arquivos deve ser feito temporariamente via Signed URLs com tempo de expiração curto (máximo de 15 minutos).

---

## 4. Governança, Audit Logs e LGPD

1. **Geração de Logs de Auditoria (Audit Trail):**
   - Ações críticas do sistema (ex: alteração de dados bancários, exclusão de passageiros em lote, aceitação de termos contratuais) devem gerar registros persistentes de auditoria.
   - O registro de auditoria deve conter: data/hora UTC, identificador do usuário (`user_id`), tipo da ação, ID do tenant (`agency_id`) e informações de contexto (ex: IP anonimizado, User-Agent).
2. **Conformidade LGPD:**
   - Dados pessoais sensíveis de viajantes (como restrições alimentares médicas, relatórios médicos, detalhes de acessibilidade) devem ter finalidade de uso justificada e termo de consentimento explícito.
   - O banco de dados deve estar preparado para possibilitar a exportação de dados do titular ou a anonimização de registros em caso de solicitação de exclusão ("direito ao esquecimento").
