# Plano de Testes: Manipulação e Edição de Blocos

Este documento detalha os cenários de teste para a criação, modificação, reordenação, duplicação e exclusão de blocos/seções no editor.

---

## 1. Adição e Remoção de Blocos

- **Caso de Teste 1: Adição Simples**
  - **Passos**:
    1. Acessar o editor de uma página.
    2. No sidepanel esquerdo, aba "Seções", clicar em "Hero / Banner".
    3. Confirmar que o bloco é adicionado no final do canvas de preview.
    4. Confirmar que a aba lateral de propriedades do bloco é aberta automaticamente.
- **Caso de Teste 2: Remoção**
  - **Passos**:
    1. Clicar no ícone de lixeira (excluir) no cabeçalho do bloco selecionado (painel direito) ou na aba "Camadas" (lado esquerdo).
    2. Confirmar que o bloco desapareceu imediatamente do preview e da lista de camadas.
    3. Verificar se o estado de auto-save indica "Salvando..." e depois "Salvo".

---

## 2. Reordenação via Drag & Drop

- **Caso de Teste 3: Movimentação de Seções**
  - **Passos**:
    1. Adicionar duas seções diferentes (ex: "Hero" e "Texto com Imagem").
    2. Acessar a aba "Camadas" no sidepanel esquerdo.
    3. Clicar e segurar no ícone de drag-handle (GripVertical) do segundo bloco.
    4. Arrastar para cima do primeiro bloco e soltar.
    5. Validar se a ordem mudou instantaneamente no canvas de preview.
    6. Confirmar que o auto-save disparou e gravou a nova ordenação dos blocos.

---

## 3. Configuração de Conteúdo e Upload de Mídia

- **Caso de Teste 4: Upload de Imagem Única (Hero Background)**
  - **Passos**:
    1. Selecionar o bloco "Hero / Banner" para abrir suas propriedades.
    2. No campo de upload "Imagem de fundo", selecionar um arquivo JPG/PNG local.
    3. Validar se a barra de progresso de upload aparece e conclui com sucesso.
    4. Verificar se a imagem é renderizada instantaneamente no fundo do banner no canvas de preview.
- **Caso de Teste 5: Upload de Múltiplas Imagens (Galeria)**
  - **Passos**:
    1. Adicionar um bloco "Galeria de Fotos".
    2. Clicar no componente de multi-upload no painel de propriedades.
    3. Selecionar 3 imagens simultaneamente.
    4. Garantir que todas as 3 imagens carregam no Supabase Storage e aparecem na lista de imagens.
    5. Validar se a galeria se ajusta em colunas responsivas no preview.

---

## 4. Edição de CTAs e Links

- **Caso de Teste 6: Botão de Ação**
  - **Passos**:
    1. No bloco "Hero", alterar o campo "Botão (Label)" para _"Comprar Agora"_.
    2. Alterar o campo "Botão (Link)" para `https://wa.me/5549999999999`.
    3. Clicar em "Salvar Rascunho".
    4. Clicar no ícone de preview para abrir a página pública.
    5. Clicar no botão na página pública e validar se ele redireciona exatamente para o link configurado.
