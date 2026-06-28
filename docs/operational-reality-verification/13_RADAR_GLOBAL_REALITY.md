# 13. Radar Global Reality (Realidade do Radar Global)

## 1. Origem dos Dados
* O Radar Global (`agency.$slug.radar.tsx`) é alimentado pelas tabelas `trips` (viagens sob medida da agência) e `boarding_tickets` (passagens de embarque cadastradas de tipo aéreo).
* **Filtros e Atividade:** Filtra registros por viagens ativas hoje (com base nas datas de início e fim da viagem) e exibe os passageiros em trânsito.

## 2. Geolocalização e Pins
* **Mapeamento:** O posicionamento dos pins no mapa do mundo utiliza uma função local `parseDestinationToCoords` que busca palavras-chave de destino (ex: "Orlando", "Paris") e associa a um dicionário estático de coordenadas pré-mapeadas (`COUNTRY_COORDINATES`).
* **Fallback sintético:** Se a cidade de destino não corresponder a nenhuma chave do dicionário, um hash determinístico é calculado com base no ID da viagem para gerar coordenadas de posicionamento `(x, y)` espalhadas na tela de forma visual.
* **Diagnóstico:** A geolocalização **não é baseada em GPS real dos clientes**, sendo um mapeamento aproximado baseado em texto inserido manualmente nos cadastros de viagens e bilhetes.
