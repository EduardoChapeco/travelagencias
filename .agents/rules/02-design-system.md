# Rule 02 — Design System (Anti-"Vibe Coded")

## Fonte de Verdade
**DESIGN.md** na raiz do projeto. Contém todos os tokens em YAML front-matter machine-readable.
Nenhuma cor, fonte ou espaçamento deve ser inventado ad-hoc — tudo referencia um token do DESIGN.md.

## Checklist Anti-"Vibe Coded" (toda tela nova passa por isso antes de "pronta")
- [ ] Nenhum gradiente roxo/indigo decorativo sem função semântica
- [ ] Nenhum emoji usado como ícone de interface
- [ ] Cards de destaque têm pelo menos uma imagem real ou ilustração com intenção
- [ ] Tipografia, cor e espaçamento vêm 100% dos tokens do DESIGN.md
- [ ] Efeitos visuais (blur, glow, shadow) só existem se comunicarem hierarquia ou estado
- [ ] border-radius máximo de 12px em elementos principais
- [ ] Sem `box-shadow` decorativo (suprimido globalmente no CSS)

## Como aplicar tokens em código
```tsx
// ✅ Correto: CSS var referenciando token
style={{ backgroundColor: 'var(--color-surface-alt)' }}
className="bg-surface-alt border border-border rounded-md"

// ❌ Proibido: valor hardcoded
style={{ backgroundColor: '#f0f0f0', borderRadius: '20px' }}
```

## Verificação silenciosa
Esta checklist roda como verificação interna antes de considerar qualquer tarefa de UI concluída.
O agente não anuncia "estou rodando a checklist" — ele simplesmente aplica e reporta apenas se houver violação corrigida.

## Pattern de layout do TravelOS
- Sidebar ultra-fina colapsável: 40px collapsed, 190px expanded
- CRUDs e formulários de criação: Sheet full-screen (não Dialog/Modal)
- Dashboards e visões gerais: bento grid
- Scrollbars invisíveis via `.no-scrollbar`
- Sem sombra pesada, sem neon, sem gradientes decorativos
