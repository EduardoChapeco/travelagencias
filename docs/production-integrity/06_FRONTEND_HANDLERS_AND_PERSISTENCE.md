# 06. Frontend Handlers, Double-Clicks e Persistência

Este relatório analisa os manipuladores de eventos e fluxo de dados no frontend do TravelOS, focando no risco de concorrência, cliques duplos e consistência de estado.

## 1. Vulnerabilidade de Duplo Clique e Concorrência no Ingestion OCR

No arquivo [agency.$slug.suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx) (linhas 543-628), o botão de confirmação e persistência do OCR realiza a gravação dos dados extraídos pela IA no banco de dados. Este manipulador apresenta falhas de controle concorrente:

1. **Botão sem Estado de Loading:** A tag `<button>` de confirmação não recebe o atributo `disabled` enquanto a mutação está em andamento. O usuário pode clicar várias vezes no botão se a conexão estiver lenta ou se houver um delay de processamento.
2. **Ausência de Transação e Rollback Parcial:** O manipulador executa três chamadas assíncronas separadas para o Supabase:
   * `supabase.from("supplier_contacts").insert(contactRows)`
   * `supabase.from("supplier_products").insert(productRows)`
   * `supabase.from("suppliers").update(supplierPatch)`
3. **Inconsistência de Dados e Duplicação:**
   * Se o usuário clicar duas vezes, os contatos e produtos serão inseridos duas vezes, duplicando os registros na base, pois não há chaves de idempotência (Idempotency Key) nem constraints de unicidade na tabela baseadas em hashes do arquivo.
   * Se a inserção de produtos falhar no meio do processo por erro de validação, os contatos que já foram inseridos com sucesso na chamada anterior permanecerão salvos no banco. Não há rollback, deixando registros órfãos e dados corrompidos.

## 2. Invalidação de Cache e Sessão do Brand Kit

A persistência do Brand Kit em `localStorage` para evitar flicker visual (linhas 85-132 de `src/lib/agency-context.tsx`) falha em validar o ciclo de vida da sessão:

1. **Ausência de Limpeza no Logout:** Não há chamadas de limpeza (`localStorage.removeItem` ou `clear`) no fluxo de logout da aplicação. Os dados visuais e identidades das agências (logos, paletas de cores, fontes) permanecem gravados no navegador por tempo indeterminado.
2. **Ressalva Visual (Flash de Tenant Anterior):**
   * Ao abrir a agência A, o Brand Kit é carregado e salvo no cache.
   * Ao deslogar e logar na agência B, se a agência B não tiver cache prévio, a tela renderizará inicialmente com o design da agência A devido à execução síncrona do cache no topo do componente, antes de a query buscar o brand kit correto da agência B do servidor no `useEffect`.

## 3. Integridade do Exportador de PDF/PNG do VoucherStudio

O VoucherStudio exporta arquivos PDF e Story PNG esperando pelo carregamento de fontes:

1. **Validação Parcial de Recursos:** O código executa corretamente `await document.fonts.ready`. Isso garante que o Canvas aguarde o download de fontes personalizadas da Google Fonts antes da captura pelo `html2canvas`.
2. **Falha de Carregamento de Imagens:** O exportador **não** aguarda o carregamento completo de imagens do voucher (logotipos da agência, imagens de hotéis, ou QR Codes). Se o usuário clicar em exportar logo após carregar a página e alguma imagem ainda estiver em trânsito (não finalizada pelo navegador), o PDF/PNG gerado conterá espaços vazios ou imagens cortadas.
3. **Erros de CORS Silenciosos:** Se imagens externas forem carregadas sem os cabeçalhos apropriados de CORS no servidor de origem, o `html2canvas` falhará silenciosamente no desenho da imagem no Canvas 2D (devido a restrições de "tainted canvas"), ocultando imagens e logotipos sem disparar mensagens de erro explícitas para a interface do usuário.
