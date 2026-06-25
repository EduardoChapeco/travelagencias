# 04. Auditoria de Responsividade - TravelOS

Este documento apresenta a análise de quebras de layout, overflows horizontais, comportamentos de barras laterais (sidebars) e adaptabilidade em múltiplos viewports (mobile, tablet, notebook e desktop).

---

## 1. Padrões de Layout por Breakpoint

O TravelOS deve se comportar de forma consistente conforme a largura da janela:

- **Mobile (360px - 768px)**: Coluna única, modais expandidos em tela cheia (drawers/sheets), tabelas com scroll horizontal ou convertidas em blocos de cartões.
- **Tablet/Notebook Compacto (768px - 1024px)**: Grid duplo, barra lateral de navegação colapsada ou ultrafina (`SlimSidebar`), filtros superiores ocultos sob painel expansível.
- **Desktop (1024px+)**: Grid multi-colunas, visualização detalhada em split-screen, sidebar global e contextual aberta de forma síncrona.

---

## 2. Inconsistências de Responsividade Encontradas

A auditoria identificou os seguintes pontos críticos com problemas de responsividade:

### 2.1 Módulo Financeiro (`financial.reconciliation.tsx`)

- **Problema:** A tabela de lançamentos bancários transborda o layout horizontal em resoluções de notebook de 13 polegadas (~1280px) se as colunas de "Descrição" e "Status" forem muito longas. A tabela não possui scroll lateral de container isolado.
- **Ação:** Envolver a tabela em um componente `<div class="overflow-x-auto w-full">` e definir larguras máximas para colunas de texto.

### 2.2 Kanban do CRM (`crm.tsx`)

- **Problema:** No viewport de 768px (Tablet), as colunas do Kanban tentam espremer-se horizontalmente, reduzindo a largura útil de cada coluna para menos de 180px e cortando os títulos dos cards de leads.
- **Ação:** Em resoluções menores que 1024px, desativar o layout Kanban fixo horizontal e exibir os leads em formato de lista colapsável de estágios (acordeão).

### 2.3 VoucherStudio Configurator (`VoucherStudio.tsx`)

- **Problema:** O painel lateral de customização de cores, tipografia e dados de rodapé usa largura fixa de `450px`. Em resoluções compactas de 1024px, o canvas de preview central do voucher é comprimido lateralmente de forma agressiva (squeezing), quebrando a visualização real do layout A4.
- **Ação:** Ocultar o configurador lateral sob um componente `<Sheet>` (painel deslizante de tela cheia) em viewports menores que 1280px, mantendo apenas a visualização limpa do voucher no centro da tela.

### 2.4 Editor de Páginas do CMS (`portal.pages.$page_id.tsx`)

- **Problema:** O editor de blocos possui barra de ferramentas superior fixa que causa overflow em viewports móveis de 360px-390px, tornando os botões de "Salvar" e "Publicar" inacessíveis ao toque do usuário.
- **Ação:** Mover as ações do cabeçalho do editor para um menu flutuante inferior em dispositivos móveis.
