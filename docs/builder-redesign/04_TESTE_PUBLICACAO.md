# Plano de Testes: Publicação e Versionamento de Páginas

Este documento especifica os testes para validar o ciclo de vida da página (Rascunho vs Publicado), cópia de blocos e reversão histórica.

---

## 1. Separação Rascunho vs Publicado

- **Caso de Teste 1: Edição sem Impacto no Ar**
  - **Passos**:
    1. Criar uma página e clicar em "Publicar Página".
    2. Confirmar que a página está no ar e exibe os blocos corretos.
    3. Reabrir o editor da página.
    4. Adicionar um novo bloco no topo e alterar um título existente.
    5. Aguardar o indicador "Salvo" (auto-save de rascunho em `portal_pages.blocks`).
    6. Abrir a página pública correspondente em outra aba.
    7. **Verificação**: O bloco novo e as alterações NÃO devem aparecer na página pública ainda (pois a página pública consome `published_blocks` e não `blocks`).
    8. Clicar em "Publicar Página".
    9. Atualizar a página pública e verificar se agora as alterações estão visíveis.

---

## 2. Versionamento e Reversão

- **Caso de Teste 2: Histórico de Versões**
  - **Passos**:
    1. Com a página publicada, mude um título e publique novamente.
    2. Abra o drawer "Histórico de Versões" clicando no ícone de relógio na Topbar.
    3. Verifique se o log exibe pelo menos duas versões anteriores com datas e horários correspondentes.
    4. Selecione a primeira versão criada e clique em "Reverter".
    5. Confirme a ação no modal/sheet de aviso.
    6. Valide se os blocos antigos foram recarregados de forma limpa no canvas de preview.
    7. Confirme que o rascunho foi atualizado no banco.

---

## 3. SEO e Sitemap

- **Caso de Teste 3: SEO Tags**
  - **Passos**:
    1. No editor, abrir as configurações de SEO.
    2. Definir um "Título SEO" como _"Promoção Exclusiva - Viagens"_ e "Descrição SEO".
    3. Clicar em "Publicar Página".
    4. Acessar a página pública e abrir a exibição de código fonte (View Source).
    5. Garantir que as tags `<title>` e `<meta name="description">` batem com as configurações inseridas no editor.
