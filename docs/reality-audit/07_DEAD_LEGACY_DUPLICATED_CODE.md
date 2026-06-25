# Código Morto, Legado e Duplicações

Inventário forense contendo trechos de código órfãos, lógica legada inativa e duplicações estruturais identificadas no TravelOS.

---

## 💀 Código Morto & Estados Órfãos

1. **Variável `proposalSheetOpen`** em [crm.$lead_id.lazy.tsx:L93](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.$lead_id.lazy.tsx#L93):
   - _Descrição_: O estado `proposalSheetOpen` é inicializado e o componente `<NewProposalSheet>` está condicionalmente acoplado ao fim do arquivo. No entanto, o botão que disparava a abertura da gaveta foi convertido para rotear o usuário diretamente para `/proposals/new`.
   - _Impacto_: O estado e a renderização condicional do componente são código morto que consome processamento desnecessário do React.
2. **Edge Functions Legadas de OCR**:
   - As pastas `supabase/functions/ocr-proposal/`, `supabase/functions/ocr-passenger-document/` e `supabase/functions/ai-voucher-ocr/` estão obsoletas no Deno deploy, visto que todos os acionadores principais do frontend foram migrados para o endpoint unificado `ai-orchestrator`. Elas devem ser deletadas para limpar a árvore de diretórios do repositório.

---

## 👥 Código Duplicado (Dívida Técnica)

1. **Formulário de Nova Cotação**:
   - _Onde_: [proposals.new.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.new.tsx) e [NewProposalSheet.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/proposals/NewProposalSheet.tsx).
   - _Problema_: Ambas as estruturas de arquivo repetem os campos do formulário (Título, Destino, Cliente, Datas, PAX, Moeda, Validade, Notas), a importação via FileReader do OCR, e o payload de submissão do hook form. Qualquer alteração em regras de negócio de cotações exigirá alteração manual nos dois arquivos sob o risco de quebrar um dos fluxos.
2. **Criptografia & Descriptografia no Deno**:
   - _Onde_: `ai-orchestrator/index.ts`, `ocr-boleto/index.ts` e `supplier-ocr-extractor/index.ts`.
   - _Problema_: As funções `getCryptoKey` e `decryptData` estão copiadas textualmente nos três arquivos para decifrar as chaves do banco de dados, em vez de importar um utilitário compartilhado.
3. **Resolução de Chaves Ativas**:
   - _Onde_: A chamada ao RPC `pick_active_api_key` e seu processamento subsequente de descriptografia estão duplicados nos mesmos três arquivos de Edge Functions.
