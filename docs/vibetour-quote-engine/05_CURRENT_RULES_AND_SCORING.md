# 05. Regras Operacionais e Sistema de Pontuação Atual (Current Rules and Scoring)

Este documento analisa as regras de validação logística, conformidade de conexões e cálculo de pontuação (scoring) de pacotes na base de código atual.

---

## 1. Análise do Estado Atual

Atualmente, o Turis tem cobertura **NULA (0%)** para motores de pontuação explicável ou verificação automatizada de regras logísticas:

- **Validação de Roteiros**: Totalmente manual. O operador humano é quem deve identificar inconsistências de viagem (como voos que chegam tarde demais impossibilitando o transfer no mesmo dia).
- **Conexões e Trocas de Aeroporto**: Não há alarmes ou restrições de parada ou layover. Se um voo exigir troca de aeroporto (ex: Congonhas para Guarulhos), o sistema grava o trecho JSON sem lançar avisos de risco.
- **Cálculo de Custo-Benefício**: O Turis exibe apenas o preço final e o subtotal. Não há indicadores que comparem o valor incremental de um hotel superior ou a perda de dias úteis de viagem em virtude de voos de madrugada.

---

## 2. Necessidades de Engenharia de Decisão (Decision Engine)

Para a ativação do motor do VibeTour, é necessário implantar:

1.  **Mapeador de Conexões (FlightScore)**: Penalizar trechos com múltiplas escalas, layovers maiores que 6 horas ou conexões extremamente curtas (<45min).
2.  **Cálculo de Conforto (HotelScore/LogisticsScore)**: Considerar classificação do hotel, distância de pontos turísticos gateway e compatibilidade horária com transfers terrestres.
3.  **Explicação de Vantagens (CostBenefitScore)**: Apresentar de forma textual por que o cenário sugerido pelo motor inteligente é melhor que as opções lineares.
