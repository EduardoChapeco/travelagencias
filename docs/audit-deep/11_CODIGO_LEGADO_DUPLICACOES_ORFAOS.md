# 11. Código Legado, Duplicações e Arquivos Órfãos

Este documento apresenta a análise de detritos técnicos, código duplicado e arquivos/tabelas sem uso real no projeto TravelOS.

---

## 1. Duplicações Estruturais e Fontes de Verdade Duplas

### 1.1 O Caso das Rooming Lists

- **Duplicação:**
  1. `group_tours.rooming_list`: Coluna JSONB atualizada diretamente no componente de grupos (`group-tours.$id.tsx`).
  2. `boarding_rooming_list`: Tabela normalizada com RLS e registros estruturados gerenciada pelo componente `RoomingList.tsx`.
- **Causa:** O desenvolvedor anterior adicionou a tabela normalizada, mas manteve a lógica JSONB no editor de grupos para não quebrar a UI de grupos.
- **Impacto:** Concorrência e risco de perda de dados. Se o agente atualiza o quarto na rota operacional, os dados não aparecem na view do editor do grupo, e vice-versa.

### 1.2 Registro de Voos Duplicado

- **Duplicação:**
  1. `boarding_tickets` (tipo = `flight`): Armazena bilhetes individuais de voos de passageiros de forma plana na aba "Bilhetes de Embarque".
  2. `flight_itineraries` + `flight_segments`: Armazena o itinerário corporativo de voo e seus trechos versionados na nova aba "Aéreos".
- **Impacto:** Os bilhetes e trechos de voos não são integrados. Se o agente atualiza o voo na aba "Aéreos" (gerando uma nova versão confirmed), os bilhetes individuais na aba "Bilhetes de Embarque" mantêm o PNR e dados de voo antigos, obrigando o agente a fazer a atualização manual em dois lugares diferentes.

---

## 2. Componentes Monolíticos e Complexidade de Código

Identificamos os maiores arquivos do projeto que acumulam responsabilidades excessivas e lógicas de negócios acopladas:

| Arquivo Basename                                                                                                                                           | Caminho do Arquivo                                     | Qtd de Linhas | Problema de Engenharia                                                                                                                                | Ação Sugerida                                                                                                   |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- | :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| [client.trips.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/client.trips.$id.tsx)                              | `src/routes/client.trips.$id.tsx`                      | 1960          | **Monolito Crítico**. Gerencia todas as abas, galerias de fotos, localizadores, banners de destino, timeline e check-ins em um único arquivo de 98KB. | Fatiar em sub-componentes (ex: `MemoryGallery`, `ConfirmationWidget`, `DestinationBanner`) em pastas dedicadas. |
| [destination-intelligence.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.destination-intelligence.tsx) | `src/routes/agency.$slug.destination-intelligence.tsx` | 694           | Gerencia o CRUD completo, formulários e integração da Edge Function no mesmo arquivo da rota.                                                         | Isolar o formulário de destino em um componente separado.                                                       |
| [flights.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.flights.tsx)                         | `src/routes/agency.$slug.trips.$id.flights.tsx`        | 1006          | Combina a listagem de versões de voo, formulário de trechos múltiplos e render de Diff na mesma rota.                                                 | Mover o modal de Diff e o formulário de criação de segmentos para arquivos dedicados.                           |

---

## 3. Elementos Órfãos (Sem Uso)

- **Tabelas Órfãs:**
  - A tabela `checkin_links` e `boarding_events` propostas para o check-in de cias aéreas estão ausentes no banco de dados e no frontend.
  - A tabela `boarding_rooming_list` do modelo antigo de card (que continha referências antigas a `card_id`) ainda reside no banco, coexistindo em conflito com a nova estrutura.
