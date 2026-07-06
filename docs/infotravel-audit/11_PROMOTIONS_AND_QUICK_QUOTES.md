# 11. Cotação Rápida e Motor de Promoções do Dia

Este documento descreve as especificações funcionais e técnicas para o módulo de **Cotação Rápida** e o pipeline automatizado de **Promoções do Dia** no Turis, conectando diretamente os motores de busca e disponibilidade da API **Infotravel**.

---

## 1. Módulo de Cotação Rápida (Sem Dependência de IA)

O painel de cotação rápida é uma ferramenta de busca clássica e direta (estilo Booking/Decolar), permitindo consultar tarifas e disponibilidades de forma estruturada nas operadoras:

### 1.1. Filtros de Busca Disponíveis

- **Origem/Destino**: Aeroporto/Cidade de partida e chegada.
- **Datas**: Ida e volta, com flexibilidade opcional de $\pm1, \pm3$ ou $\pm7$ dias.
- **Passageiros**: Quantidade de adultos, crianças e bebês (com preenchimento mandatório da idade de cada criança para cálculo preciso de tarifa aérea e gratuidade de berço no hotel).
- **Filtros de Produto**: Tipo de serviço (Aéreo, Hotel, Transfer, Pacote Completo, Seguro).
- **Preferências do Catálogo**: Categoria do hotel (estrelas), regime de alimentação (Café da manhã, Meia pensão, All inclusive), franquia de bagagem inclusa no voo, e operadora de turismo emissora (credenciais ativas).

### 1.2. Painel de Resultados Comparativo

Os resultados retornados na estrutura unificada `NormalizedOffer` são apresentados em uma lista de cartões comparáveis contendo:

- Preço total da oferta e detalhamento de preço por pessoa (incluindo taxas e impostos locais).
- Informações do voo (companhia aérea, número do voo, escalas, conexões longas e horários).
- Detalhes do hotel (nome, localização, regime de alimentação, fotos reais do catálogo e tipo de acomodação).
- Políticas de cancelamento e regras de reembolso claras.
- **Ações Rápidas**: Comparar (até 4 opções lado a lado), Salvar cotação no histórico, Vincular a um Lead/Cliente existente no CRM, Criar proposta formal temporária, ou Gerar mini página compartilhável no WhatsApp.

---

## 2. Pipeline do Motor de Promoções do Dia

O Turis contará com um job automatizado de segundo plano que varre o inventário da Infotravel para descobrir "Oportunidades de Ouro" (ofertas com preço abaixo da média histórica ou descontos agressivos) sem estourar as cotas diárias da API.

### 2.1. Fluxo do Pipeline de Promoções

```txt
Fila de Tarefas (Cron semanal/diário com execução programada em horários de baixa demanda)
  │
  ├──> [Fase 1: Geração de Combinações Autorizadas]
  │    Monta matriz de consultas (ex: origens [GRU, GIG] x destinos populares [MIA, LIS, FEN] x janelas de férias)
  │
  ├──> [Fase 2: Varredura de Disponibilidade (API Infotravel)]
  │    Dispara consultas paginadas via `GET /api/v1/avail/package/{packageType}`.
  │    Aplica Throttling rigoroso para evitar bloqueios de IP na API da operadora.
  │
  ├──> [Fase 3: Normalização e Cálculo do Score de Oportunidade]
  │    Normaliza os candidatos para `NormalizedOffer`.
  │    Calcula o Score matemático (Sem IA) da oferta com base em métricas reais.
  │
  ├──> [Fase 4: Seleção e Armazenamento em Staging]
  │    Ofertas com Score superior a 8.5 são salvas em `public.daily_promotions` com status `pending_review`.
  │
  └──> [Fase 5: Enriquecimento Inteligente (IA Opcional) e Revisão]
       IA opcional gera textos de marketing, títulos atraentes e segmentação de público.
       Agente comercial revisa no dashboard do Turis e clica em "Publicar na Página" ou "Descartar".
```

### 2.2. Algoritmo do Score de Oportunidade (Determinístico)

O cálculo do score de relevância da promoção não utiliza IA para evitar desvios tarifários e baseia-se em fatores matemáticos objetivos:
$$\text{Score} = (W_1 \times \Delta_{\text{Preço}}) + (W_2 \times \text{Rating Hotel}) - (W_3 \times \text{Escalas}) - (W_4 \times \text{Conexões})$$

- **Diferencial de Tarifa ($\Delta_{\text{Preço}}$)**: Diferença percentual em relação ao preço médio histórico para o mesmo destino e época do ano.
- **Qualidade do Hotel**: Avaliação média do hotel (rating) retornada pela API.
- **Penalidade por Escalas e Conexões**: Reduz o score se o voo contiver escalas demoradas ou troca de aeroportos complexa.
- **Comissão**: Bonifica o score se a margem ou comissão repassada pela operadora for superior à média acordada.
- **Validade**: Penaliza se o prazo limite para emissão da cotação for inferior a 24 horas.
