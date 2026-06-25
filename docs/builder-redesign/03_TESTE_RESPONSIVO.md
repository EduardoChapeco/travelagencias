# Plano de Testes: Responsividade e Visibilidade de Dispositivo

Este documento detalha os cenários de teste para validar a ocultação seletiva de seções por dispositivo (Mobile/Tablet/Desktop) e comportamentos de grid fluído.

---

## 1. Ocultação Seletiva de Seções

- **Caso de Teste 1: Ocultar em Dispositivos Móveis**
  - **Passos**:
    1. Adicionar uma seção "Hero / Banner" no canvas.
    2. Clicar na aba "Responsivo" no painel de propriedades do bloco.
    3. Marcar a opção "Ocultar no Celular" (`hideOnMobile: true`).
    4. Alterar a viewport do editor para "Mobile" (390px).
    5. **Verificação Visual**: O bloco deve aparecer com opacidade reduzida (ex: `opacity-40`) e uma tag/badge indicando _"Oculto em Mobile"_.
    6. Publicar a página e abrir em um dispositivo móvel (ou simular no DevTools).
    7. **Verificação Final**: A seção não deve ser renderizada na versão pública para celulares.

- **Caso de Teste 2: Ocultar em Tablets**
  - **Passos**:
    1. Selecionar outra seção e marcar "Ocultar no Tablet" (`hideOnTablet: true`).
    2. Alterar a viewport do editor para "Tablet" (768px).
    3. Confirmar a opacidade reduzida e a tag _"Oculto em Tablet"_.
    4. Verificar se a seção some na versão pública quando visualizada sob largura de tela entre 768px e 1024px.

---

## 2. Flexibilidade e Grids Fluídos

- **Caso de Teste 3: Grid de Roteiros Responsivo**
  - **Passos**:
    1. Adicionar o bloco "Grade de Roteiros".
    2. Definir o layout para "Grid".
    3. Mudar a viewport para "Desktop". Verificar se renderiza em 3 colunas.
    4. Mudar a viewport para "Tablet". Verificar se reduz para 2 colunas.
    5. Mudar a viewport para "Mobile". Verificar se empilha em 1 coluna vertical.
    6. Garantir que as imagens não estouram o limite lateral do card em nenhuma das resoluções.
