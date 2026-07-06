# Goal Description

Finalizar a Fase 4 refatorando os bindings do `BlockRenderer.tsx` para React Query e criando um seletor visual de Templates no Builder do Portal Público. Seguiremos estritamente o protocolo "Blast-radius primeiro".

## 💥 Blast-Radius Analysis

1. **Refatoração do `BlockRenderer.tsx` (React Query)**
   - **Dependências de Entrada:** O arquivo usa `useEffect` e `supabase.from()` para buscar dados em mais de 15 componentes internos (e.g. `TourHighlights`, `Testimonials`, `GroupTourDetailsBlock`).
   - **Dependências de Saída (Quem usa):** Utilizado em rotas públicas (`p.$agency_slug.$page_slug.tsx`, `p.$agency_slug.index.tsx`) e no Preview do Builder (`agency.$slug.portal.pages.$page_id.tsx`).
   - **Riscos Identificados:** 
     1. O Builder renderiza o `BlockRenderer` dentro do `IframeSandbox` via `createPortal`. Felizmente, o React Context (`QueryClientProvider`) é preservado através de portais, logo o `useQuery` funcionará perfeitamente dentro do preview.
     2. Devido ao tamanho massivo do `BlockRenderer.tsx` (~5200 linhas), fazer alterações manuais pontuais em 15 componentes tem altíssimo risco de quebra de sintaxe.
   - **Mitigação:** Utilizarei um script Python para aplicar a refatoração das funções `load` baseadas em `useEffect` para `useQuery`, garantindo consistência estrutural e preservando toda a lógica original de renderização.

2. **Seletor Visual de Templates (`agency.$slug.portal.pages.$page_id.tsx`)**
   - **Dependências de Entrada:** `CMS_TEMPLATES` de `src/lib/cms-templates.ts`.
   - **Dependências de Saída:** Afeta apenas a UI da sidebar do Builder.
   - **Riscos Identificados:** Inconsistência visual em relação ao `DESIGN.md`.
   - **Mitigação:** Criarei um modal ou painel visual (utilizando tokens Flat do `DESIGN.md`, como `bg-surface`, borders estritas sem shadows) para pré-visualizar e selecionar templates.

## User Review Required

> [!IMPORTANT]
> **Aprovação do Método de Refatoração do BlockRenderer:** 
> Devido ao arquivo ter 5200 linhas, proponho o uso de um **Script Python de Refatoração de Código** (AST/Regex guiado) para injetar o `useQuery` e substituir os padrões de `useEffect` de forma limpa e automática. Isso evita o risco de truncamentos ou erros de digitação ao alterar manualmente. 
> 
> Você aprova essa estratégia? Caso sim, basta dar o "Proceed" para que eu inicie a execução cirúrgica.

## Proposed Changes

### `BlockRenderer.tsx` (Componente de Renderização do CMS)
- Injetar a importação de `useQuery` de `@tanstack/react-query`.
- Substituir o padrão atual `const [tour, setTour] = useState(...)` + `useEffect` por `const { data: tour, isLoading } = useQuery(...)`.
- Preservar o tratamento `if (isLoading)` de todos os componentes internos para evitar render loops (Regra 7 - Performance).

#### [MODIFY] [BlockRenderer.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/components/portal/BlockRenderer.tsx)

### Builder do Portal (`agency.$slug.portal.pages.$page_id.tsx`)
- Adicionar uma interface visual (modal/sheet) que exibe as opções do `CMS_TEMPLATES` com ícones, nome e descrição detalhada.
- Integrar com o atual `setApplyConfirmTemplate` para aplicar o template sem quebrar o fluxo.

#### [MODIFY] [agency.$slug.portal.pages.$page_id.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.portal.pages.$page_id.tsx)

## Verification Plan

### Automated Tests
- Executaremos `npm run typecheck` para garantir que as alterações no `BlockRenderer.tsx` não introduziram inconsistências de tipos.
- Executaremos o `npm run build` ao final da Fase 4 para validar que não há quebras de compilação.

### Manual Verification
- O agente irá verificar os arquivos gerados e criar o Relatório de Match detalhando as RLS, tipos e design tokens utilizados.
