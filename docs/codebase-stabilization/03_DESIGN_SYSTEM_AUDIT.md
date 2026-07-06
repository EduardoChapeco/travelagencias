# 03. Auditoria do Design System - Turis

Este documento apresenta a auditoria estética do design plano **Light Editorial SaaS** do Turis, com as regras de visual lock, injeção do Brand Kit e o status de eliminação de sombras.

---

## 1. Regras Visuais e Identidade Visual (Visual Lock)

A interface do Turis deve seguir estritamente o padrão **Light Editorial SaaS**:

- **Fundo Predominante**: Branco puro (`#FFFFFF` ou `bg-background`).
- **Sombras**: Absolutamente proibidas (`shadow-none` ou override do box-shadow).
- **Bordas**: Finas, de 1px, com cores neutras e suaves (`border-border` ou `#E5E7EB`).
- **Tipografia**: Caráter editorial com uso harmonioso de fontes serifadas (como Cormorant) para títulos marcantes e sans-serif (como Inter ou Outfit) para leitura corporativa densa.
- **Menus e Sidebars**: Ultrafinas, com cores chapadas e sem gradientes ou profundidade artificial.

---

## 2. Inventário de Desvios Encontrados (Uso de Sombras)

Apesar das diretrizes estritas de design flat, foram encontradas as seguintes ocorrências de sombras no código-fonte que contrariam o Visual Lock:

| Arquivo                                     | Componente / Elemento                                  | Classe CSS        | Ação Corretiva                                                        |
| :------------------------------------------ | :----------------------------------------------------- | :---------------- | :-------------------------------------------------------------------- |
| `agency.$slug.financial.reconciliation.tsx` | Tabela de reconciliação (linha 316)                    | `shadow-sm`       | Mudar para `shadow-none` ou remover.                                  |
| `agency.$slug.financial.reconciliation.tsx` | Modais de Upload e Detalhes (linhas 402, 481)          | `shadow-xl`       | Mudar para `shadow-none` e aplicar borda fina `border border-border`. |
| `agency.$slug.group-tours.$id.tsx`          | Tabs operacionais e cartões de passageiros (linha 374) | `shadow-sm`       | Remover e aplicar `shadow-none`.                                      |
| `agency.$slug.suppliers.$id.tsx`            | Container do logotipo do fornecedor (linha 715)        | `shadow-sm`       | Mudar para `border border-border shadow-none`.                        |
| `agency.$slug.boarding.tsx`                 | Cartões do Kanban de Embarque (linhas 213, 225, 237)   | `shadow-sm`       | Mudar para `shadow-none` e aplicar destaque de borda plana.           |
| `agency.$slug.suppliers.index.tsx`          | Hover de itens da listagem de fornecedores (linha 124) | `hover:shadow-md` | Remover efeito shadow, usar destaque de borda ou sutil background.    |
| `styles.css`                                | Definições utilitárias herdadas (linhas 201-206)       | `box-shadow`      | Remover do core de estilos.                                           |

---

## 3. Brand Kit e Mecanismo de Carregamento de Fontes

### 3.1 O Problema de Flicker

O hook `useAgency` injeta as cores da marca (CSS Variables) e as fontes tipográficas de forma assíncrona baseando-se no `companyProfile`. Isso provoca um "flicker" visual (piscar na cor padrão do sistema antes de renderizar o Brand Kit correto do tenant).

- **Solução:** Otimizar `agency-context.tsx` para cachear síncronamente as últimas variáveis do Brand Kit no `localStorage`, aplicando-as imediatamente no início do ciclo de vida do componente antes do fetch da API do Supabase concluir.

### 3.2 O Problema do html2canvas (PDF/PNG Exports)

Componentes como `VoucherStudio.tsx` e `ExportPdfButton.tsx` geram bilhetes usando a biblioteca `html2canvas`.

- **Desvio Crítico:** Se as Google Fonts do Brand Kit não estiverem 100% carregadas e prontas no DOM no momento do clique, o `html2canvas` renderiza a imagem com fontes de fallback do sistema (Arial ou Times New Roman).
- **Solução:** Inserir `await document.fonts.ready` ou pré-carregar as fontes mais comuns do sistema diretamente no cabeçalho estático `index.html` para cache local instantâneo.
