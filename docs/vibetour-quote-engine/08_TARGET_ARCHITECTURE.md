# 08. Arquitetura Alvo do Motor Inteligente (Target Architecture)

Este documento estabelece o design arquitetural planejado para o motor de cotações, assegurando acoplamento limpo com o ecossistema existente.

---

## 1. Pipeline de Fluxo do Motor de Decisão

O motor estruturado é desenhado em camadas isoladas para garantir determinismo e segurança:

```txt
  Intenção de Viagem (Linguagem Natural ou Form)
        │
        ├──> [Fase 1: Interpretador (Zod Schema)]
        │    Analisa e valida o JSON da intenção (`TravelIntent`).
        │
        ├──> [Fase 2: Planejador de Busca (SearchPlan)]
        │    Gera e limita os cenários pesquisáveis (datas, aeroportos gateway).
        │
        ├──> [Fase 3: Camada de Provedores (Adapters)]
        │    Chama concorrentemente o conector Infotravel e outros provedores.
        │    Salva os payloads brutos na tabela de cache `quote_raw_results`.
        │
        ├──> [Fase 4: Normalização (DTO NormalizedOffer)]
        │    Converte os esquemas proprietários em um modelo unificado de oferta.
        │
        ├──> [Fase 5: Motor de Regras e Logística (Gateway Checker)]
        │    Aplica validações determinísticas (layovers, tempo mínimo de transfer).
        │
        ├──> [Fase 6: Scoring Engine (Pesos e Perfis)]
        │    Calcula pontuações baseadas no perfil de conforto/preço selecionado.
        │
        └──> [Fase 7: Workspace de Decisão (Aprovação Humana)]
             Exibe na UI o painel de comparação lado a lado.
             Agente aprova e gera proposta vinculada ao CRM.
```

---

## 2. Abordagem Híbrida: Determinismo vs. IA

- **Determinismo**: Cálculos matemáticos, soma de tarifas, cálculo de conexões aéreas, e cruzamento de horários de check-in são programados de forma puramente matemática e rígida. A IA nunca é a fonte do cálculo ou da disponibilidade.
- **IA Generativa**: Usada exclusivamente para traduzir a intenção inicial do cliente, resumir as diferenças chaves na comparação de ofertas, explicar o score e sugerir novas regras de negócio baseadas em decisões de rejeição/aceitação anteriores.
- **Isolamento de Tenants**: Toda query e inserção carrega obrigatoriamente o identificador `agency_id`, garantindo RLS em nível de linha em todas as tabelas de cotação e de memória.
