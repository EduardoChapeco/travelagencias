# 44 Débito Técnico e Visual de UI Restante

Este documento cataloga de forma estruturada as pendências de estilo, geometria e performance identificadas durante a auditoria e que ainda não foram totalmente resolvidas na codebase.

## Inventário de Débito Técnico de Interface

### 1. Centralização de Variáveis CSS (Geometria AppShell)
* **Status:** Pendente de migração completa.
* **Descrição:** A largura da sidebar flutuante (`52px` colapsada, `184px` expandida) e a largura do menu contextual (`220px`) estão declaradas diretamente como classes de utilidade do Tailwind no `DynamicIslandNav.tsx` ao invés de consumirem variáveis do CSS `:root`.
* **Gravidade:** Média.

### 2. Altura de Janelas e Cadeia Flexbox
* **Status:** Em monitoramento.
* **Descrição:** Algumas tabelas internas de listagem de propostas ou de cotações podem exceder a altura do workspace se a view de dados ultrapassar as restrições da grid flex, forçando a window a ter barra de rolagem.
* **Gravidade:** Média.

### 3. Arredondamentos Desalinhados
* **Status:** Parcialmente resolvido.
* **Descrição:** Primitivas como `Select` e `Popover` utilizam `rounded-[20px]` que não está formalmente mapeado no `styles.css`.
* **Gravidade:** Baixa.

### 4. Fontes e Tipografia no Public Portal
* **Status:** Pendente de auditoria visual.
* **Descrição:** O portal público da agência (`/p/$agency_slug`) e o Biolink utilizam famílias tipográficas locais que podem ignorar o reset de fontes definido na AppShell.
* **Gravidade:** Baixa.
