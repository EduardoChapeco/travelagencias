# Auditoria de JSONB & Data Payloads (Sobrecarga de Dados)

Este documento analisa a sobrecarga de transferência de dados (payload) entre o banco de dados (Supabase/PostgreSQL) e o cliente, com foco na otimização de colunas JSONB e consultas monolíticas.

---

## 🔍 Colunas JSONB e Modelagem de Dados Grandes

No TravelAgencias/Turis, vários módulos fazem uso extensivo de colunas JSONB para guardar arrays de objetos complexos. Isso oferece flexibilidade, mas introduz um custo de largura de banda significativo nas consultas de lista.

### Tabela de Auditoria de JSONB/Payloads:

| Tabela / Campo                                               | Tipo de Dado | Tamanho Estimado por Linha | Uso Listagem (Carrega?)                | Problema / Risco                                                                                                                 | Ação Recomendada                                                                                                                                                           |
| ------------------------------------------------------------ | ------------ | -------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group_tours` -> `itinerary`                                 | JSONB        | 2 kB - 50 kB               | Sim (Carrega no `select("*")`)         | Transfere todo o roteiro detalhado (descrições longas) em listagens de excursões.                                                | **Omitir na listagem**. Selecionar apenas ID, título, status e datas. Buscar itinerário apenas na página de detalhes.                                                      |
| `proposals` -> `itinerary`, `flights`, `hotels`, `transfers` | JSONB        | 5 kB - 150 kB              | Sim (Em buscas de histórico e tabelas) | Brochuras completas com imagens em base64 e múltiplos trechos aéreos sobrecarregam o buffer de memória.                          | **Normalizar ou Projetar**. Realizar projeção explícita nas colunas básicas e carregar os blocos JSONB apenas sob demanda no Studio.                                       |
| `boarding_rooming_list` -> `passengers`                      | JSONB        | 0.5 kB - 2 kB              | Sim (Carrega na Rooming List)          | Armazena passageiros alocados em formato denso `[{ passenger_id, name }]`. Sem chaves estrangeiras rígidas na camada PostgreSQL. | **Normalização Relacional**. Migrar o array JSONB para uma tabela associativa de passageiros de quartos (`rooming_passengers`), garantindo integridade referencial rígida. |
| `agencies` -> `integrations_config`                          | JSONB        | 1 kB - 5 kB                | Não (Restrita)                         | Contém credenciais de API. Nunca deve ser retornada em consultas públicas.                                                       | **Segregação de Segurança**. Garantir que RLS e views limitem o retorno desta coluna ao painel de administração interno.                                                   |

---

## 🚫 Práticas de Consulta Ineficientes Detectadas

1. **Uso de `select("*")`**:
   - Vários queries no frontend (ex: `tourQ` em `group-tours.$id.tsx` e buscas no portal) carregam todas as colunas de tabelas pesadas, transferindo campos de controle e campos JSONB sem necessidade para o renderizador de UI.
2. **Listagens Não Paginadas**:
   - As tabelas de passageiros e rooming list carregam todos os registros de uma vez no cliente. Conforme a agência cresce, o volume de dados degradará a performance de hidratação.
3. **Cálculo de Métricas Contábeis no Cliente**:
   - Em `financial.groups.tsx`, o faturamento total e ROI de todas as excursões são calculados iterando sobre arrays inteiros de transações e inscrições no navegador.

---

## 🛠️ Diretrizes de Refatoração Contábil e de Banco

1. **Uso Obrigatório de Projeções (Select Parcial)**:
   - Toda query em listagens de dados deve especificar estritamente quais colunas deseja ler. Colunas de snapshot JSONB ou observações longas devem ser ignoradas:
     ```typescript
     supabase.from("group_tours").select("id, title, status, departure_date, base_price");
     ```
2. **Migração de Cálculos Contábeis para Banco de Dados**:
   - Criar views materializadas ou RPCs dedicados no PostgreSQL para retornar indicadores agregados de faturamento (KPIs). O cliente deve receber apenas os números finais de ROI, custo total e lucro líquido prontos para exibição.
3. **Normalização de Entidades Críticas**:
   - A tabela `boarding_rooming_list` deixará de depender de arrays JSONB mutáveis para passageiros, migrando para tabelas relacionais normais.
