# Framework: Inventory First

**Propósito:** Impedir a criação de código redundante ou duplicado, código morto, tabelas sobressalentes ou componentes de UI repetidos. Toda tarefa de engenharia deve iniciar obrigatoriamente com uma varredura profunda no ecossistema TravelOS para mapear ativos reutilizáveis ou refatoráveis.

---

## 1. Diretórios de Busca Obrigatórios (TravelOS)

Ao receber a listagem de componentes e entidades que o **Prompt Monsterizer** planejou, o agente **Inventory First Architect** deve realizar buscas explícitas utilizando a ferramenta `grep_search` nos seguintes caminhos físicos:

1. **Camada de Dados & Tipos (Supabase):**
   - Migrações: `supabase/migrations/`
   - Tipos gerados pelo CLI: `src/integrations/supabase/types.ts`
   - RPCs e Triggers: Buscar por declarações `CREATE FUNCTION` nas migrações sql.
2. **Camada de Comunicação & Hooks:**
   - Hooks globais de dados: `src/hooks/`
   - Serviços e instâncias do cliente Supabase: `src/services/` ou `src/lib/`
3. **Componentes Visuais & Rotas:**
   - Componentes compartilhados: `src/components/` (ex: `src/components/ui/`)
   - Rotas de visualização (Remix/Vite): `src/routes/`
   - Elementos utilitários: `src/utils/` ou `src/helpers/`

---

## 2. Metodologia de Mapeamento Semântico

Para evitar falhas de busca (por exemplo, buscar "upload" e não encontrar "anexo"), siga o seguinte protocolo de busca de 3 etapas:

1. **Busca Literal Direta:** Pesquisar pelo nome exato do recurso desejado (ex: `lead_status`).
2. **Busca Semântica Expandida:** Pesquisar por sinônimos em inglês e português (ex: `pipeline`, `funil`, `oportunidade`, `commercial`).
3. **Busca de Componentes Próximos:** Buscar por padrões de importação comuns no arquivo `src/integrations/supabase/types.ts` para capturar referências a tabelas secundárias.

---

## 3. Matriz de Decisão (Reuse/Refactor/Create Matrix)

Todo relatório de inventário deve apresentar a tabela de decisão preenchida com a seguinte classificação padrão:

- **REUSAR:** O recurso já existe exatamente como necessário. Deve-se apenas importá-lo no novo fluxo.
- **REFATORAR/EXTENDER:** O recurso existe parcialmente. Deve-se adicionar propriedades (`props` no React ou colunas na tabela) para cobrir o novo requisito sem quebrar a retrocompatibilidade.
- **MIGRAR/DELETAR:** O recurso existe de forma duplicada ou obsoleta. Deve ser substituído pela versão padronizada global.
- **CRIAR NOVO:** O recurso é inédito no TravelOS e nenhuma entidade próxima ou genérica pode ser reaproveitada.

```markdown
### 📋 MATRIZ DE DECISÃO DE ATIVOS

| Entidade Solicitada | Arquivo Encontrado no Projeto | Ação Decidida               | Justificativa Técnica / Impacto |
| :------------------ | :---------------------------- | :-------------------------- | :------------------------------ |
| [Entidade]          | [Path do arquivo físico]      | [Reusar / Extender / Criar] | [Por que reusar ou estender?]   |
```

---

## 4. Protocolo de Bloqueio

O Inventory First Architect deve **vetar** e retornar a tarefa com erro se:

1. Houver tentativa de criar uma nova tabela que armazene dados que já estão contidos em outra tabela existente (redundância de dados).
2. O desenvolvedor propor criar um componente visual (ex: `PremiumModal.tsx`) quando o projeto já dispõe de um modal genérico funcional ou configurado via `shadcn/ui` (`dialog.tsx`).
3. O inventário inicial não contiver buscas físicas comprovadas via `grep_search` ou `list_dir`.
