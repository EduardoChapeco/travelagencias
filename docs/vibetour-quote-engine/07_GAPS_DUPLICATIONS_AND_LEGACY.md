# 07. Lacunas, Duplicações e Código Legado (Gaps, Duplications, and Legacy)

Este documento identifica os desvios entre os requisitos do PRD do motor inteligente e a base de código do TravelOS, determinando o que deve ser criado e o que deve ser preservado.

---

## 1. Mapeamento de Gaps de Implementação

Comparando o PRD com o codebase, as seguintes lacunas estruturais foram identificadas:

*   **Ausência de Entidade Cotação Isolada**: O TravelOS hoje cria propostas diretamente. Para implementar o motor multicenário, precisamos criar as tabelas `quote_requests`, `quote_search_plans` e `quote_scenarios` sem duplicar a tabela `proposals` (que continuará servindo de contêiner para propostas aprovadas enviadas ao cliente).
*   **Falta de Cache de Resultados de Busca**: Cada pesquisa de hotel/voo consome chamadas do provedor em tempo real. Falta a tabela `quote_raw_results` para atuar como cache temporário com tempo de expiração (`expires_at`), reduzindo latência e taxas de rate limit.
*   **Inexistência do Motor de Regras e Pesos (Scoring)**: O código atual não possui tabelas de controle de regras de destino (`gatewayLocationId`, `minimumArrivalBufferMinutes`) nem perfis de pesos (`score_profiles`).

---

## 2. Riscos de Duplicação a Evitar
*   **Vouchers e Passageiros**: Não crie novas tabelas para guardar passageiros finais ou itinerários. O motor inteligente deve normalizar os resultados na estrutura existente de vouchers/viagens para garantir compatibilidade com o financeiro e o portal do cliente.
*   **Interface do Chat**: Não crie uma nova caixa de diálogo de chat agêntico. O assistente de cotações deve ser incorporado no ActionRegistry do chat omnichannel já integrado.
*   **OCR de Documentos**: O motor de leitura inteligente via IA (`processOcrFile`) já está implementado e deve ser mantido como o adapter padrão para importações manuais de arquivos de imagem/PDF.
