# 12. Compositor de Pacotes Assistido por IA

Este documento descreve a arquitetura do **Compositor de Pacotes Assistido por IA**, detalhando a separação de papéis entre a inteligência generativa (que sugere e roteiriza) e o motor de validação determinística (que garante integridade e executa as chamadas físicas da API **Infotravel**).

---

## 1. Arquitetura de Divisão de Responsabilidades

Para evitar alucinações (como a IA sugerir hotéis inexistentes, voos em horários incompatíveis com o transfer ou tarifas fictícias), o sistema implementa uma separação estrita de camadas:

```txt
Operador digita no Chat: "Quero um pacote de lua de mel para Paris em Setembro"
  │
  ├──> [Camada Generativa (LLM/IA)]
  │    - Interpreta o desejo comercial e o perfil do cliente.
  │    - Sugere destinos, hotéis 5 estrelas em Paris e atrações românticas.
  │    - Roteiriza o dia a dia de forma editorial.
  │    - Traduz o plano em uma intenção estruturada de parâmetros de busca.
  │
  └──> [Motor Determinístico do TravelOS]
       - Recebe os parâmetros estruturados (Destino: CDG/PAR, Datas: 10/09 a 17/09, PAX: 2).
       - Executa as consultas físicas na API Infotravel (`/avail/hotel`, `/avail/flight`).
       - Valida e garante a integridade lógica (veja regras no Item 2).
       - Se houver voos e hotéis reais disponíveis, monta a oferta e executa o `checkRate`.
       - Retorna os dados tarifários reais e as opções reais para o operador.
       - IA apenas "envelopa" o resultado final, gerando a copy comercial e explicações.
```

---

## 2. Regras de Validação Determinística e Integridade

Nenhum pacote pode ser gerado ou exibido ao operador se falhar em qualquer uma das validações lógicas executadas diretamente pelo motor do TravelOS:

1. **Janela de Transfer (Check-in/Check-out vs. Horário do Voo)**:
   * O horário de chegada do voo deve ser de no mínimo **2 horas antes** do início do transfer agendado, permitindo tempo hábil para desembarque e coleta de bagagem.
   * O horário de partida do voo de retorno deve ser de no mínimo **3 horas após** o horário de partida do transfer de retorno do hotel.
   * A data de check-in no hotel deve coincidir exatamente com a data de chegada do voo de ida (ou D+1 em caso de voos noturnos/longo curso). A data de check-out deve coincidir com o voo de retorno.
2. **Compatibilidade Geográfica (Cidades e Aeroportos)**:
   * O motor valida via tabela `public.airports` e mapas se o hotel selecionado e o ponto de parada do transfer pertencem ao mesmo município ou região metropolitana do aeroporto de chegada do voo (impedindo que a IA monte, por exemplo, um voo para Roma com hotel em Veneza no mesmo dia sem conexões lógicas).
3. **Idades e Regimes de Acomodação**:
   * O motor valida se a capacidade máxima dos quartos do hotel selecionado suporta o número de adultos e crianças do grupo, e se há gratuidades de alimentação (regime) aplicáveis para a idade dos menores informada no payload da consulta.
4. **Moeda e Tarifas**:
   * Garante a conversão cambial exata caso o hotel retorne valores em Euros ou Dólares e o voo esteja cotado em Reais, aplicando as taxas de spread configuradas pela agência no fechamento da proposta.
