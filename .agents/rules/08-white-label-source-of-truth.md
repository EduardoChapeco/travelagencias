# 08 — White-label Source of Truth

**REGRA PÉTREA:** O sistema é um SaaS White-label (atualmente a marca base chama-se "Turis OS").
**PROIBIÇÃO ABSOLUTA:** É terminantemente proibido utilizar as strings hardcoded "TravelOS", "Travel OS", "Turis", "Turis OS" no código-fonte (.ts, .tsx, .css).
**FONTE ÚNICA DE VERDADE:** Toda menção à marca principal do sistema deve vir da tabela `platform_branding` no Supabase.

### 1. No Frontend (React)
- Sempre injete o hook `useBrand()` exportado de `src/hooks/use-brand.ts` (ou consuma do contexto global se disponível).
- Renderize como: `brand.platform_name`, `brand.platform_short_name`.
- Use a logo de `brand.logo_url`.

### 2. No Backend (Edge Functions)
- Faça fetch da tabela `platform_branding` (com cache em Redis/KV, se configurado) e utilize os campos resultantes em e-mails e respostas de API.

### 3. Exceções
Nenhuma. Hardcodar nome de marca em SaaS White-label quebra a experiência do tenant principal.
