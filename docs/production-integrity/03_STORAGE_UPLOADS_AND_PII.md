# 03. Upload de Comprovantes e Exposição de PII

Este documento analisa as vulnerabilidades do fluxo de upload físico de comprovantes de pagamento e a consequente exposição de dados pessoais sensíveis (PII) dos viajantes.

## 1. Configuração do Bucket e Políticas RLS

- **Nome do Bucket:** `payment-receipts`
- **Tipo do Bucket:** Público (`public = true`) - Servido diretamente via CDN do Supabase sem validação de sessão em links diretos.
- **Políticas Ativas no Banco:**
  1. `payment_receipts_public_insert` (INSERT): Permite inserção para qualquer usuário contanto que o `bucket_id` seja `'payment-receipts'`.
  2. `payment_receipts_public_read` (SELECT): Permite seleção para qualquer usuário se o `bucket_id` for `'payment-receipts'`.

### Teste de Isolamento e Resultados

1. **Acesso como Cliente B a Arquivos de Cliente A:** COMPROVADO. Qualquer pessoa com o link de um comprovante enviado por outro cliente consegue abrir o arquivo livremente, pois o bucket é público.
2. **Listagem Anônima:** COMPROVADO. Como a política de SELECT não restringe caminhos nem exige autenticação, chamadas do tipo `.from("payment-receipts").list()` feitas de forma anônima retornam a lista de caminhos de arquivos de todos os clientes.
3. **Modificação do Path:** COMPROVADO. Um usuário anônimo pode enviar arquivos para qualquer subpasta (ex: tentar enviar para a pasta de outra agência se souber o ID da agência).

## 2. Análise do Fluxo de Upload

Com base no código encontrado em `src/routes/p.$agency_slug.tour.$id.tsx` (linhas 107-146) e `src/routes/m.payment.$token.tsx` (linhas 30-76):

1. **Estrutura dos Caminhos (Paths):**
   - Em `p.$agency_slug.tour.$id.tsx`: `${agency.id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`.
   - Em `m.payment.$token.tsx`: `receipts/${instId}_${Date.now()}.${fileExt}`.
   - _Falha:_ O caminho no checkout público não está vinculado a um identificador seguro da transação ou inscrição (`booking_id`), pois o upload ocorre _antes_ de a inscrição ser gravada. No portal de pagamento, todos os arquivos de recibos são salvos na pasta raiz `receipts/` em uma lista plana, sem separação por agência.
2. **Exposição do Nome Original:** O nome original do arquivo é exibido na UI do cliente, mas o arquivo é renomeado no storage. No entanto, a extensão original é preservada sem tratamento de sanitização.
3. **Validação de MIME e Extensão:** NENHUMA. Não há verificação no backend ou nas políticas RLS do storage para filtrar extensões permitidas. Qualquer usuário pode carregar arquivos executáveis (`.exe`, `.bat`), scripts (`.php`, `.js`), ou documentos disfarçados para o bucket.
4. **Limitação de Tamanho:** NENHUMA. Não há restrição de tamanho máximo de arquivo (maxFileSize) no frontend ou no RLS, permitindo que uploads maliciosos consumam o espaço em disco da agência.
5. **Rate Limiting:** INEXISTENTE. Um bot pode automatizar múltiplos uploads falsos gerando milhares de arquivos na conta.
6. **Uploads Órfãos:** Não existe nenhum processo ou cron job de limpeza de arquivos órfãos. Se o cliente enviar o arquivo e desistir de preencher a inscrição, o arquivo permanece ocupando espaço de armazenamento permanentemente.
7. **Falha de Integridade Transacional:** O arquivo é gravado no storage antes de a inscrição ou pagamento ser gravado no banco de dados. Caso ocorra uma falha de conexão ou validação de formulário na chamada final, a inscrição não será confirmada, mas o arquivo já estará exposto na CDN pública.

## 3. Avaliação de Impacto e Risco

A atual arquitetura do bucket `payment-receipts` é classificada como **CRÍTICA / P0**.
Ela desrespeita diretamente a LGPD e as boas práticas de segurança, pois expõe documentos bancários privados contendo nomes completos, chaves Pix, CPFs e valores de transações a qualquer pessoa na internet.
A arquitetura segura exigida é:

- Bucket privado;
- Caminho criptografado/não previsível incluindo IDs de transação;
- Upload restrito via URL assinada de escrita (presigned upload URL) de curta duração;
- Leitura exclusivamente via URLs assinadas geradas sob demanda com expiração curta (ex: 5 minutos);
- Registro de log de auditoria de quem solicitou o acesso ao comprovante.
