# Plano de Testes: Botões de Preview & Responsividade

Este documento especifica os casos de teste manuais para validar o funcionamento do cabeçalho responsivo, redimensionamento do canvas e comportamentos contextuais por canal de preview.

---

## 1. Casos de Teste para Viewports

### 1.1 Preview Desktop

- **Objetivo**: Validar a exibição ideal em telas de alta resolução.
- **Tamanho esperado**: `100%` da largura disponível ou limitado a `1200px` (centralizado).
- **Ações de Verificação**:
  1. Clique no botão de monitor (Desktop) na Topbar.
  2. Verifique se o botão fica com a classe ativa (Light Editorial SaaS: fundo destacado, sem borda dupla ou sombra).
  3. Verifique se o container do canvas se expande para ocupação total / `max-w-5xl` (1024px) ou `1200px`.
  4. Confirme que todos os blocos desktop são exibidos sem restrições.

### 1.2 Preview Tablet

- **Objetivo**: Validar a simulação de dispositivos móveis médios (iPads, tablets).
- **Tamanho esperado**: Exatamente `768px`.
- **Ações de Verificação**:
  1. Clique no botão de tablet na Topbar.
  2. Verifique se a largura do canvas do preview encolhe de forma suave (transição de CSS configurada no `transition-all duration-300`).
  3. Verifique se a régua ou borda delimita exatamente os `768px`.
  4. Teste a rolagem vertical interna para garantir que não há estouros horizontais na barra lateral.

### 1.3 Preview Mobile

- **Objetivo**: Validar a exibição em smartphones comuns.
- **Tamanho esperado**: Exatamente `390px`.
- **Ações de Verificação**:
  1. Clique no botão de celular (Mobile) na Topbar.
  2. Verifique se o canvas reduz suavemente para `390px`.
  3. Garanta que elementos com propriedades de ocultação responsiva (`hideOnMobile`) fiquem invisíveis ou fiquem com opacidade reduzida com indicação visual de "oculto em mobile" no modo edição.

### 1.4 Preview Biolink Contextual

- **Objetivo**: Validar o modo específico para links na bio.
- **Tamanho esperado**: `390px` centralizado com comportamento de mock de smartphone (bordas arredondadas simulando aparelho físico).
- **Ações de Verificação**:
  1. Ao selecionar um template ou página de categoria Biolink, a viewport deve travar automaticamente no modo Mobile (390px).
  2. A tentativa de mudar para Desktop ou Tablet deve exibir um aviso/toast informando: _"Páginas de Biolink são otimizadas apenas para visualização Mobile."_ ou desabilitar os respectivos botões de viewport.

### 1.5 Preview Documento A4

- **Objetivo**: Validar o layout de propostas, contratos e vouchers imprimíveis.
- **Tamanho esperado**: `794px` de largura por `1123px` de altura (proporção A4 vertical) por página de documento.
- **Ações de Verificação**:
  1. Ao editar um documento (proposta, voucher ou contrato), a viewport deve se ajustar para a simulação de folhas A4 com divisores de página pontilhados.
  2. Verificar se a quebra de página de impressão (CSS `page-break-after`) é respeitada no preview.

### 1.6 Preview Story & Feed

- **Objetivo**: Validar visualizações rápidas de folhetos/vouchers em formatos de redes sociais.
- **Tamanho esperado**:
  - Story: `1080px` × `1920px` (proporcional, ex: `360px` × `640px` no canvas).
  - Feed: `1080px` × `1350px` (proporcional, ex: `360px` × `450px` no canvas).
- **Ações de Verificação**:
  1. Selecionar o formato correspondente na barra de configurações.
  2. Confirmar se a moldura de preview se ajusta de forma proporcional à escala das dimensões informadas.

---

## 2. Bloqueio de Blocos e Alertas de Incompatibilidade

| Contexto / Canal | Bloco Testado          | Ação Realizada         | Resultado Esperado                                                                                                  | Status   |
| :--------------- | :--------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------ | :------- |
| **Biolink**      | `hero` (Site complexo) | Tentar adicionar bloco | Exibir aviso visual de bloco incompatível com Biolink ou ocultar o bloco do menu de seleção.                        | Aprovado |
| **Site Comum**   | `biolink_links`        | Tentar adicionar bloco | Exibir tag/badge _"Otimizado para Mobile"_ ou mover para categoria correta.                                         | Aprovado |
| **Documento A4** | `video` / `map`        | Tentar adicionar bloco | Bloquear a inserção ou exibir aviso visual informando _"Mídias dinâmicas não serão renderizadas no PDF exportado."_ | Aprovado |

---

## 3. Persistência de Viewport

- **Caso de Teste**: Salvar o estado da última viewport visualizada pelo usuário.
- **Passos**:
  1. Mudar o preview para modo `mobile` (390px).
  2. Recarregar a página ou navegar para outra aba.
  3. Retornar ao editor.
  4. O editor deve recarregar no modo `mobile` se persistido localmente (`localStorage`), ou reiniciar no padrão do formato da página (Biolink = Mobile, Site = Desktop).
