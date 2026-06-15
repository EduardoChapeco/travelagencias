# Regras de UI — Flat Premium

**Padrão visual obrigatório para todo componente do TravelOS.**

---

## Proibições Absolutas

### Efeitos Visuais Proibidos

- `shadow-*` — **PROIBIDO**. Nenhuma sombra em nenhum componente.
- `bg-gradient-*` — **PROIBIDO**. Nenhum degradê.
- `from-*`, `via-*`, `to-*` (para gradiente) — **PROIBIDO**.
- Glassmorphism — **PROIBIDO**. Sem `backdrop-blur` decorativo (exceto overlays de Sheet/Modal).
- `drop-shadow-*` — **PROIBIDO**.

### Scan de Violação

Comando para verificar violações:

```bash
grep -rn "shadow-" src/ --include="*.tsx" | grep -v "node_modules" | grep -v ".git"
grep -rn "bg-gradient" src/ --include="*.tsx"
grep -rn "from-.*via-\|from-.*to-" src/ --include="*.tsx"
```

---

## Modais e Overlays

### Proibido

- Modal central (`items-center justify-center`) para workflows complexos

### Obrigatório

- **Sheet** (painel lateral deslizante) para ações de criação/edição
- **Página dedicada** para builders, CMS, wizards longos e fluxos complexos
- **In-page** para configurações e formulários de contexto

### Padrão de Sheet

```
fixed inset-0 z-[N] flex justify-end bg-background/80 backdrop-blur-sm
  → div com max-w-*, border-l, animate-in slide-in-from-right
```

---

## Botões

### Obrigatório

- `whitespace-nowrap` — texto nunca quebra linha
- `inline-flex items-center justify-center gap-2` — layout interno
- `shrink-0` — não encolhe em flex containers

### Proibido

- Texto do botão quebrando em duas linhas
- Botão sem ação (visível mas não faz nada)
- Botão "Em breve"

---

## Layout

### Obrigatório

- Layouts fluidos em desktop grande (não espremidos)
- `max-w-*` apenas quando justificado (formulários, conteúdo de leitura)
- Responsividade em todos os breakpoints

### Proibido

- Layout espremido em tela grande sem motivo
- Scroll horizontal em tabelas sem indicação

---

## Estados Obrigatórios

Toda tela que busca dados DEVE ter:

| Estado  | Requisitos                                     |
| ------- | ---------------------------------------------- |
| Empty   | Ícone + título + descrição + ação sugerida     |
| Loading | Skeleton ou spinner contextual (não genérico)  |
| Error   | Causa do erro + ação sugerida (retry, contato) |

### Proibido

- Loading infinito (sem timeout ou fallback)
- Empty state vazio (apenas "Nada aqui")
- Error state genérico (apenas "Erro")

---

## Design System

### Obrigatório

- Usar tokens CSS do design system (`--brand`, `--surface`, `--border`, etc.)
- Usar componentes do `src/components/ui/form.tsx` (PrimaryButton, GhostButton, Field, Input, Select, etc.)

### Proibido

- Cores hardcoded (`#FF0000`, `rgb(...)`) — usar tokens
- Espaçamentos inconsistentes entre telas similares
- Tipografia fora do sistema (fontes não registradas)

---

## Formulários

### Obrigatório

- Hierarquia clara (seções, agrupamentos, etapas quando necessário)
- Labels descritivos
- Validação inline (não apenas toast genérico)
- Campos obrigatórios marcados

### Proibido

- Formulário gigante sem agrupamento
- Campos sem label
- Validação apenas no submit
