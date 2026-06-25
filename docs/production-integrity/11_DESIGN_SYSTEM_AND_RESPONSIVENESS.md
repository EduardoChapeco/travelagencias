# 11. Design System e Responsividade

Este relatório analisa a aderência visual da aplicação ao Design System canônico, os desvios de implementação estrutural (componentes duplicados) e a adaptabilidade das páginas em múltiplos viewports.

## 1. Auditoria do Design System e Componentes Canônicos

Identificamos uma divisão de arquitetura no frontend: coexistem os componentes padrões do Shadcn/Radix (instalados na pasta `components/ui/`) com componentes customizados de formulários criados em um único arquivo utilitário `src/components/ui/form.tsx`.

A tabela abaixo mapeia as divergências estruturais encontradas:

| Padrão de UI           | Componente Canônico                              | Componente Divergente Utilizado                                | Override Global Utilizado                                                                              | Correção Estrutural Recomendada                                                  |
| :--------------------- | :----------------------------------------------- | :------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **Botões**             | `src/components/ui/button.tsx` (Shadcn/Tailwind) | `PrimaryButton`, `GhostButton` em `src/components/ui/form.tsx` | N/A                                                                                                    | Substituir chamadas pelo botão canônico, portando as classes Flat Editorial.     |
| **Campos de Texto**    | `src/components/ui/input.tsx`                    | `Input`, `Select`, `Textarea` em `src/components/ui/form.tsx`  | N/A                                                                                                    | Padronizar no input canônico, eliminando a folha de estilo estática local.       |
| **Slide Over (Sheet)** | `src/components/ui/sheet.tsx` (Radix)            | `Sheet` em `src/components/ui/form.tsx`                        | N/A                                                                                                    | Remover o div overlay mock de `form.tsx` e unificar no Sheet baseado no Radix.   |
| **Modais e Menus**     | Radix Dialog / Radix Menu                        | N/A                                                            | `.shadow-lg { box-shadow: none !important; border: 1px solid var(--color-border-strong) !important; }` | Remover o reset forçado de sombra global no `styles.css` e estilizar via tokens. |

- **Nota sobre Shadow Overrides:** O uso de reset global com `!important` para ocultar sombrasRadix/Dialog cria um visual consistente na shell do app, mas força um contorno rígido de bordas sólidas em popovers e menus, prejudicando a profundidade do layout e impedindo o uso de sombras legítimas em componentes que eventualmente necessitem de legibilidade.

## 2. Responsividade e Adaptação de Viewports

Testamos a renderização das rotas em múltiplos viewports, avaliando quebras operacionais e comportamentos de layout:

1. **CRM Kanban:** Em resoluções abaixo de 1024px (`lg`), as colunas horizontais são ocultadas e substituídas pelo `MobileStageAccordion`, que empilha os estágios verticalmente de forma acordeão. Isso previne o espremimento de cartões e mantém a operabilidade em telas mobile (360px-390px).
2. **VoucherStudio:** A barra lateral de configurações (`w-[280px]`) é ocultada em viewports menores que `xl` (1280px), e ativada sob demanda via slide-out `<Sheet>` Radix. O canvas A4 é reescalonado proporcionalmente, evitando compressão horizontal agressiva em notebooks compactos de 13 polegadas (1366x768).
3. **Página de Conciliação Financeira:** A tabela diária de lançamentos foi envolvida no container `.overflow-x-auto .w-full`. A barra de rolagem horizontal isolada impede a quebra do layout principal em telas compactas (1280x720 e inferiores).
4. **Editor de Páginas CMS:** Os botões principais do cabeçalho são transferidos para um painel flutuante reativo no rodapé do mobile, limpando a barra superior `h-11` em resoluções de 360x800 e mantendo os controles acessíveis ao polegar do usuário.

### Matriz de Viewports e Integridade

| Rota / Tela       | 360x800 (Mobile)         | 768x1024 (Tablet)     | 1280x720 (Notebook) | 1920x1080 (Desktop) | Risco de Quebra        |
| :---------------- | :----------------------- | :-------------------- | :------------------ | :------------------ | :--------------------- |
| **CRM Kanban**    | Funcional (Accordion)    | Funcional (Accordion) | Funcional (Colunas) | Excelente           | Baixo                  |
| **Financeiro**    | Funcional (Scroll)       | Funcional (Scroll)    | Excelente           | Excelente           | Baixo                  |
| **VoucherStudio** | Funcional (Drawer)       | Funcional (Drawer)    | Excelente           | Excelente           | Médio (Corte de menus) |
| **Páginas CMS**   | Funcional (Header/Float) | Excelente             | Excelente           | Excelente           | Baixo                  |
