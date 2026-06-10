# Contracts & Vouchers Audit Report

## Escopo Analisado

- `ContractTemplates.tsx` / `agency.$slug.trips.$id.contract.tsx` — contratos
- `agency.$slug.trips.$id.vouchers.tsx` — vouchers com OCR AI
- `m.contract.$token.tsx` — visualização e aceite público do contrato
- Motor de assinatura e `sign_contract_with_token` RPC
- Trigger de imutabilidade de contratos (`contracts_immutable_after_signed_trg`)

## Checklist de Auditoria

### Templates

- [x] **Templates salvos em tabela real:** Sim. Os templates são consumidos via a RPC `contract_template_clauses` que provê cláusulas fixas armazenadas no Supabase.
- [x] **Variáveis dinâmicas funcionam:** As cláusulas em si parecem ser petrificadas (imutáveis). As variáveis que seriam do usuário ou do pacote ficam salvas separadamente nos campos JSONB (`client_data`, `passengers_data`) e em campos nativos como `package_summary`.
- [x] **Template engine real:** É usado diretamente estado de React mesclado ao banco de dados com estrutura de cláusulas fixas vs personalizadas.

### Proposta / Aceite

- [x] **Aceite registra IP + User Agent + Timestamp:** Sim, em `m.contract.$token.tsx` captura `ip` (via ipify), `user_agent` e `timestamp`, repassando ao RPC `sign_contract_with_token` do DB.
- [!] **Hash SHA-256 calculado no servidor:** Parcial. O hash primário do documento (`content_hash`) é calculado via Web Crypto API no cliente e enviado ao servidor. O servidor recebe isso no parâmetro `_signed_hash`. Se nulo, o servidor faz fallback para um `md5` simples. Seria ideal o servidor validar o payload.
- [x] **Registro imutável (trigger WORM):** A tabela `contracts` possui o trigger `contracts_immutable_after_signed_trg` que bloqueia `UPDATE` em linhas que tenham `status = 'signed'`. O cofre imutável atua diretamente na mesma tabela, sem a necessidade da tabela externa legada (`contract_vault_records`).

### Voucher

- [x] **Nome da agência dinâmico:** Sim. A UI traz do contexto multi-tenant.
- [x] **Logo dinâmica:** Sim.
- [x] **PDF/PNG exportado:** Sim. O voucher permite upload de PDF da operadora e aplica extração de IA (OCR via Edge Function `processVoucherWithAI`).

### Cofre

- [x] **Trigger `block_vault_tampering` ativo:** Implementado via trigger customizado `contracts_immutable_after_signed_trg`.
- [x] **UPDATE bloqueados:** Sim.
- [x] **Certificado público acessível via `/certificate/:hash`:** Sim, o sistema exibe link `/verify/:serial` e salva a estampa (`certificate.serial`).

## Riscos e Considerações (Ponto de Atenção)

1. **Hash no Cliente:** Em `m.contract.$token.tsx`, o hash é feito via `crypto.subtle.digest` do payload e enviado como string para a Edge/RPC. A RFC e padrões de segurança mais exigentes preferem que este hash seja recalculado em backend de modo a impedir _tampering_ no tráfego. (Exceção tolerada se for assumido um modelo Zero-Trust sem intermediários maliciosos ou porque TLS garante integridade na ponta).
2. **Storage Base64:** Na RPC `sign_contract_with_token` `_pdf_data` está salvando o PDF (`base64`) na coluna da tabela (`pdf_url`). Para produção de altíssimo volume, este dado deve ser gravado num bucket Storage real e apenas o path/URL salvo na coluna `pdf_url` (o script atual comenta que _"num cenario real isso vai para o Storage bucket"_).

## Parecer Técnico

O fluxo está consistente e **atende à proposta funcional real**, evitando hardcodes severos, porém há débitos técnicos relativos ao dimensionamento do armazenamento do DB (não explodir o disco salvando DataURL em coluna `text`) e criptografia server-side forte.
