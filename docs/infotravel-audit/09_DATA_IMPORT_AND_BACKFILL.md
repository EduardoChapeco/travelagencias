# 09. Plano de Importação Histórica (Backfill)

Este documento descreve o planejamento técnico para realizar a carga inicial e a importação retroativa de dados ("Backfill") de reservas, clientes, passageiros e faturas contábeis da base do **Infotravel** para o **TravelOS**, garantindo resiliência contra falhas de rede e respeito aos limites de cota da API.

---

## 1. O Pipeline de Carga e Importação Histórica

Como as agências podem possuir milhares de reservas registradas no Infotravel ao longo de anos, a importação não pode ser feita em uma única chamada síncrona. O pipeline é estruturado em lotes controlados com persistência de estado (checkpoints):

```txt
Operador inicia Importação Histórica (Define Janela de Datas e Lote)
  │
  ├──> [Fase 1: Dry Run e Estimativa]
  │    Executa busca rápida com limites para contar o volume de registros na API.
  │    Apresenta ao operador a estimativa de tempo, consumo de cota e contagem.
  │
  ├──> [Fase 2: Execução Incremental com Cursores]
  │    Chama `GET /api/v1/backoffice/booking/search` com paginação (`page`, `limit`) e janela.
  │    Para cada página de reservas retornada:
  │    │  - Salva o checkpoint do cursor de paginação (`current_page`, `last_date_processed`).
  │    │  - Direciona os registros para a tabela de staging local `public.sync_inbox`.
  │    │  - Respeita o atraso obrigatório (Throttling) de 500ms entre requisições da API.
  │    │
  │    └──> [Fase 3: Processamento e Matching Assíncrono]
  │         Fila em segundo plano lê registros da staging, cria clientes, passageiros
  │         e insere as viagens correspondentes no banco de dados.
  │         Atualiza a tabela de mapeamento de identidades `external_entity_links`.
```

---

## 2. Mecanismo de Checkpoint e Retomada de Falhas

Para garantir que o processo possa ser interrompido e retomado a qualquer momento sem duplicação de dados ou perda de progresso, o sistema implementa controle de checkpoints:

- **Tabela de Estado de Sync (`public.sync_checkpoints`)**:
  Registra a agência, o provedor (`infotravel`), os parâmetros de busca originais (datas, página atual, total de páginas) e o status do job (`running`, `paused`, `completed`, `failed`).
- **Retomada Autônoma**:
  Caso ocorra um timeout de rede ou reinicialização do servidor no meio de uma importação de 10.000 registros, o job assíncrono consulta o último checkpoint salvo e retoma exatamente da página onde ocorreu a interrupção, evitando sobrecarga desnecessária na infraestrutura da Infotravel.
- **Prevenção de Duplicação por Hash**:
  Cada payload de reserva importada tem seu checksum (hash SHA-256) calculado. Se a reserva for re-importada, o sistema compara o checksum atual com o salvo em `external_entity_links`. Se forem idênticos, a importação daquela linha é ignorada, economizando processamento de banco de dados.

---

## 3. Políticas de Throttling e Rate Limiting

A API do Infotravel impõe limites rígidos de requisições por minuto para evitar sobrecarga em seus servidores de Backoffice.

- **Limite de Concorrência**: O backfill do TravelOS executa no máximo 1 thread concorrente por agência na fila de sincronização histórica.
- **Circuit Breaker**: Caso o servidor da Infotravel retorne código HTTP `429 Too Many Requests` ou `503 Service Unavailable`, o circuit breaker é ativado. O job entra em estado de espera ("Backoff") por 5 minutos antes de tentar processar a página novamente. Se a falha persistir por 3 tentativas consecutivas, o job é pausado e um alerta de erro de conexão é disparado para o administrador.
