# Regras de Git e Entrega — TravelOS

---

## Regras

1. **Nenhum commit pode ser declarado como "feito" sem output real de `git log -1` e `git status`.**
2. **Nenhum push pode ser declarado como "feito" sem output real de `git log origin/main..HEAD`.**
3. **Mensagens de commit devem ser descritivas** — não "fix" ou "update".
4. **Commits devem ser atômicos** — uma mudança lógica por commit.
5. **Arquivos temporários, logs e `.env` não devem ser commitados.**
6. **Antes de push, verificar que build passa** (`npm run build` ou `tsc --noEmit`).

## Evidência de Entrega

O `artifact_git_delivery_proof` deve conter:

```
## Git Delivery Proof

### Último commit
[output de git log -1 --oneline]

### Status
[output de git status]

### Branch
[output de git branch --show-current]

### Diff summary
[output de git diff --stat HEAD~1]

### Push confirmado
[output de git log origin/main..HEAD --oneline] ou "não houve push"
```
