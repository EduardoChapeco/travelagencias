# Rule 06 — Performance & Anti-Rerenderização Catastrófica

## Por que isso importa
Um loop de renderização silencioso com escrita no banco pode:
- Fazer N escritas por segundo sem o usuário perceber
- Esgotar a cota do Supabase
- Indisponibilizar o banco para todos os usuários da plataforma

## Checklist de Rerenderização (verificar em todo componente criado ou modificado)

### Vícios de `useEffect`
- [ ] **Array de dependências SEMPRE explícito** — nunca omitir
  ```tsx
  // ❌ Loop infinito garantido
  useEffect(() => { fetchData(); });
  
  // ✅ Correto
  useEffect(() => { fetchData(); }, [agencyId]);
  ```
- [ ] **Objeto/Array como dependência instável** → loop
  ```tsx
  // ❌ filters é recriado a cada render → loop
  useEffect(() => { fetch(filters); }, [filters]);
  
  // ✅ Comparar primitivos ou usar useMemo
  const filterKey = useMemo(() => JSON.stringify(filters), [filters.status, filters.date]);
  useEffect(() => { fetch(filters); }, [filterKey]);
  ```

### Vícios de event handlers
- [ ] **`onClick={fn()}`** chama durante render — usar `onClick={fn}`
- [ ] **`onChange={handler()}`** mesmo problema

### Vícios de estado
- [ ] **`setState` no corpo do componente** fora de `useEffect`/handler → loop imediato
- [ ] **Autosave sem debounce** em campos de texto → grava a cada keystroke

### Vícios de Realtime/Subscriptions
- [ ] **Cleanup obrigatório em subscriptions:**
  ```tsx
  useEffect(() => {
    const channel = supabase.channel('room').on(...).subscribe();
    return () => supabase.removeChannel(channel); // ← OBRIGATÓRIO
  }, []);
  ```
- [ ] **`refetchInterval`** mínimo de 30s para dados não críticos

### Vícios de listas e memoização
- [ ] **`React.memo`** em componentes pesados renderizados em lista
- [ ] **`useCallback`** em handlers passados como props para filhos memoizados
- [ ] **Paginação obrigatória** em queries de tabelas que crescem sem limite (mensagens, logs, reservas)

## Teste mental obrigatório
> "Se este componente re-renderizar 100x em 1 segundo por estado instável, o que acontece no banco?"
> Se a resposta for "grava 100x" → bug bloqueante, refatorar antes de merge.

## Quando o usuário reportar lentidão/travamento
1. React DevTools Profiler → componente com mais re-renders
2. Rastrear qual state/prop mudou
3. `useMemo`, `useCallback` ou `React.memo` na causa raiz
4. DevTools de rede → subscriptions Realtime duplicadas?
