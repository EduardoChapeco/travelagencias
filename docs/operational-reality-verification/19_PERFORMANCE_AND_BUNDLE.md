# 19. Performance and Bundle (Performance de Carregamento e Bundle)

## 1. Tamanho do Bundle e Code Splitting
* **Bundle Principal:** O TanStack Router e os componentes pesados de mapa (como Globe / Leaflet) e editores enriquecidos aumentam o tamanho do bundle inicial carregado pelo navegador.
* **Lazy Loading:** As rotas mais pesadas (ex: `/agency/$slug/crm/$lead_id.lazy.tsx` e `/agency/$slug/group-tours/$id.lazy.tsx`) usam as terminações `.lazy.tsx` do TanStack Router para carregamento tardio, reduzindo a pegada do primeiro carregamento do app.

## 2. Otimização de Consultas (PostgREST)
* As consultas de tarefas e propostas foram refatoradas para evitar buscas N+1 ou loops sequenciais.
* Os cenários de cotação e propostas utilizam joins aninhados para obter todos os componentes relacionados em uma única viagem de rede.
