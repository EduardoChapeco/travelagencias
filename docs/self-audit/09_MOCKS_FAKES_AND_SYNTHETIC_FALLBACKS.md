# 09. Mocks, Fakes e Fallbacks Sintéticos do Sistema

Este documento apresenta um inventário detalhado de todos os blocos de simulação, dados fictícios e fallbacks sintéticos ativos nos módulos analisados do **TravelOS**.

---

## 1. Inventário de Mocks e Fallbacks Ativos

### A. Fallback de Alternativas no Motor de Cotações (`ai-quote-engine`)
* **Localização**: [supabase/functions/ai-quote-engine/index.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/ai-quote-engine/index.ts) (Linhas 140-176)
* **Descrição**: Quando a agência não possui chaves de API da Infotravel reais configuradas na tabela `api_keys`, ou quando a chamada ao connector falha, o motor intercepta o fluxo e gera de forma autônoma duas alternativas sintéticas:
  1. *Pacote Comfort*: Voo Direto (`FL-DIR-META`) + Pousada Premium (`HT-PREM-META`), com preço calculado como `budgetLimit * 0.85`.
  2. *Pacote Smart*: Voo com Conexão (`FL-CON-META`) + Pousada Categoria Turística (`HT-TOUR-META`), com preço calculado como `budgetLimit * 0.60`.
* **Avaliação de Risco**: **Risco Baixo / Aceitável**. Esse fallback é um comportamento de salvaguarda necessário para manter a usabilidade da plataforma em ambientes de demonstração/desenvolvimento sem credenciais de produção vinculadas. O motor sinaliza esses dados gravando a string *"Usando dados operacionais simulados"* no campo `warnings` do banco de dados, mantendo a transparência operacional para o agente de viagens.

---

### B. Mocks de Depoimentos no Construtor de Portais (`LiveReviewsBlock`)
* **Localização**: [src/components/portal/BlockRenderer.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/portal/BlockRenderer.tsx) (Linha 2525)
* **Descrição**: Se o banco de dados não contiver depoimentos de clientes aprovados na tabela `agency_reviews` para a agência ativa, o bloco renderiza dois depoimentos simulados ("Gabriela Abreu" e "Luciano Costa").
* **Avaliação de Risco**: **Risco Baixo (Estético)**. Evita que o site do portal do cliente apresente uma seção de depoimentos em branco (tela sem conteúdo) no onboarding inicial da agência.
* **Transição**: Conforme a agência coleta avaliações reais através do portal e o administrador as aprova no painel, o array `reviews` é populado e os mocks são automaticamente ocultados pelo fluxo real do banco.

---

## 2. Desativação Concluída de Mocks de Produção

* **Importação de Reservas (GDS)**: No conector do provedor [supabase/functions/infotravel-connector/index.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/infotravel-connector/index.ts) linha 81, a flag `isMock` agora lança uma exceção expressa se as credenciais de produção forem inválidas ou sandbox:
  ```ts
  if (isMock) {
    throw new Error("Ambiente de Simulação Desativado. As credenciais do Infotravel não foram configuradas...");
  }
  ```
  Isso garante que transações, emissões ou importações de vouchers reais nunca operem sobre dados falsificados, forçando a integração com as chaves reais de agência.
