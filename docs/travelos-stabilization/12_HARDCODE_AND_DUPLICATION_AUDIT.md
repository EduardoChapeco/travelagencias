# Hardcode and Duplication Audit — Lote 2 (Atualizado)

## STATUS GERAL DA VARREDURA

| Padrão | Instâncias Encontradas | Classificação | Status |
|:---|:---:|:---|:---|
| `text-white` (AppShell header) | 5 | Hardcode visual indevido | **CORRIGIDO → text-os / text-os-muted** |
| `bg-white/10 border-white/10` (PageHeader search/filters) | ~8 | Hardcode visual indevido | **CORRIGIDO → bg-surface-alt/50 border-border/50** |
| `ModuleActionButton` com `<button>` manual | 22 consumers | Duplicação / componente fora do primitive | **CORRIGIDO → `<Button size="sm">` canônico** |
| `<button>` manual com `text-white/60 border-white/15` (actions toolbar) | ~8 ocorrências em rotas | Hardcode visual indevido | **CORRIGIDO → `<Button variant="ghost">` (trips, clients)** |
| `bg-red-50 border-red-200 text-red-800` (estados de erro) | ~50 instâncias | Padrão sem token semântico | **REGISTRADO — migração para `--color-danger-bg` planejada no Lote 3** |
| `style={{ backgroundColor: stage.color }}` | ~8 | Constante de domínio legítima | **ACEITO — dado dinâmico de domínio** |
| `style={{ background: brand_color }}` | ~5 | Constante de domínio legítima | **ACEITO — personalização de marca runtime** |
| `style={{ width: X% }}` (barras de progresso) | ~6 | Constante técnica legítima | **ACEITO — geometria calculada** |
| `style={{ animationDelay }}` | ~3 | Constante técnica legítima | **ACEITO — não suportado em Tailwind** |

## TOKENS OS-AMBIENT CRIADOS (Novo)

Adicionados em `src/styles.css` dentro de `@layer utilities`:
```css
.text-os       { color: var(--os-text); }           /* rgba(255,255,255,0.95) */
.text-os-muted { color: var(--os-text-muted); }     /* rgba(255,255,255,0.55) */
.text-os-faint { color: var(--os-text-faint); }     /* rgba(255,255,255,0.30) */
.hover:text-os:hover       { color: var(--os-text); }
.hover:text-os-muted:hover { color: var(--os-text-muted); }
```

**Fonte canônica:** `--os-text` definido em `:root` no `styles.css` linha 31.
**Semântica:** "texto sobre wallpaper no AppShell header" — contexto de OS-desktop, não de módulo.
**Temas que precisam implementá-lo:** Qualquer tema futuro que altere o wallpaper deve atualizar `--os-text`.

## DUPLICAÇÕES AINDA EXISTENTES

### 1. `EmptyState` com imports duplicados
- `clients.tsx` importa `EmptyState` duas vezes (linha 8 e linha 9), pois as duas linhas fazem import da mesma origem.
- **Status:** DUPLICADO MENOR — sem efeito funcional, mas sujo. Corrigir consolidando em um import único.

### 2. Padrão de erro `bg-red-50` sem token
- ~50 instâncias do padrão `border-red-200 bg-red-50/60 text-red-800` como estado de erro em todo o sistema.
- **O correto:** usar o token `--color-danger-bg` e `--color-danger` do `DESIGN.md`.
- **Status:** DUPLICADO / sem token semântico. Planejado para Lote 3.

### 3. `<select>` manual inline (CRM, Proposals)
- Nas rotas `crm.tsx` (linha 204, 220) e `proposals.index.tsx` (linha 168), há `<select>` manuais com `bg-transparent hover:bg-white/5 text-white/70` para filtros.
- **O correto:** usar o primitive `<Select>` do Radix (`@/components/ui/form`) ou o `SearchableSelect`.
- **Status:** HARDCODADO / select fora do primitive. Planejado para Lote 3.

## VERIFICAÇÃO DE FUNCIONALIDADE

### ModuleActionButton (22 consumers)
- `onClick` → handler → mutation → UI → CONFORME (o wrapper thin não altera o fluxo)
- `disabled` e `loading` adicionados ao contrato → backward-compatible (props opcionais)

### Button import no TaskShell admin button
- `Settings2` agora usa `Button variant="ghost" size="icon"` → sem handler conectado
- **ATENÇÃO:** Este botão de administrar módulo em TaskShell não tem `onClick`. Status: **FUNCIONALIDADE NÃO COMPROVADA** (era assim antes também — não é regressão desta refatoração).
