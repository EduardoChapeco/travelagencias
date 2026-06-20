# 10. Rooming List Concorrente e Links de Check-in

Este relatório analisa os riscos de integridade concorrencial no gerenciamento de quartos de hotel (Rooming List) e a segurança e validade dos deep links de check-in integrados.

## 1. Concorrência e Risco de Lost Update no Rooming List

O Rooming List foi migrado para uma tabela dedicada `boarding_rooming_list` (em vez de um campo JSONB na tabela de viagens), permitindo registros por quarto. Porém, a persistência dos passageiros alocados em cada quarto continua insegura:

1. **Persistência Baseada em Estado Cliente:**
   * A coluna `passengers` na tabela `boarding_rooming_list` é do tipo `JSONB` e armazena um array contendo os dados dos passageiros (`[{ passenger_id, name, ... }]`).
   * As funções `allocatePassengerToRoom` e `deallocatePassengerFromRoom` (linhas 115-139 de `src/services/rooming.ts`) leem os passageiros atuais da tela do operador, adicionam/removem o elemento e executam um `update` gravando todo o array no banco.
2. **Risco Crítico de Lost Update:**
   * Caso dois agentes de viagens (Operador A e Operador B) estejam visualizando a mesma viagem de grupo e alocando passageiros nos quartos em paralelo:
     * O Operador A aloca o Passageiro X no Quarto 101 (que estava vazio) e salva `[X]`.
     * O Operador B (sem atualizar a tela) aloca o Passageiro Y no Quarto 101 e salva `[Y]`.
     * O update do Operador B sobrescreve o do Operador A. O Passageiro X é removido silenciosamente do quarto, gerando graves falhas de organização no hotel.
3. **Ausência de Triggers e Controles no Banco:** Não há locks pessimistas, nem controle de versão otimista (ex: checar `updated_at` ou coluna de `version`), nem restrições de banco (constraints/triggers) impedindo que a capacidade do quarto seja estourada. Toda a validação ocorre no frontend, sendo burlável via chamadas de API diretas.

## 2. Deep Links de Check-in Aéreo

O arquivo [airline-deeplinks.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/utils/airline-deeplinks.ts) implementa links direcionando para check-ins de companhias aéreas brasileiras.

* **Avaliação de Funcionalidades e Validade:**
  * **GOL (G3):** Direciona para `b2c.voegol.com.br/check-in/dados-voo?recordLocator=${pnr}&departureAirport=${origin}`. Válido e estruturado.
  * **Azul (AD):** Direciona para `checkin.voeazul.com.br/?pnr=${pnr}&origin=${origin}`. Válido e estruturado.
  * **LATAM (LA/JJ):** Direciona para `www.latamairlines.com/br/pt/check-in?orderId=${pnr}&lastName=${lastName}`. Válido e estruturado.
  * **Fallback:** Direciona para pesquisa Google: `google.com/search?q=checkin+${airline}+${pnr}`. Heurístico de segurança.
* **Segurança e Privacidade (PII nas URLs):**
  * O localizador (PNR) e o sobrenome do passageiro são passados como query parameters nas URLs externas. Isso é necessário para automatizar o preenchimento no site das companhias, mas as credenciais de voo são salvas no histórico de navegação do dispositivo.
  * O sistema não registra PNR e sobrenome de passageiros em analytics públicos ou logs internos, limitando a exposição aos redirecionamentos externos necessários.
  * **Classificação por Provedor:**
    * GOL: Validado (Heurístico)
    * Azul: Validado (Heurístico)
    * LATAM: Validado (Heurístico)
    * Demais Provedores: Fallback Manual (Pesquisa Google)
