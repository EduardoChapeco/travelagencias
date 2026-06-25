# Prompt Injection e Segurança

Este documento descreve as defesas de segurança cibernética e contenções estruturadas para neutralizar ataques de Prompt Injection direto e indireto no Chat de IA.

---

## 1. Vulnerabilidades de Injeção Identificadas

A plataforma interage com fontes externas (como raspagem de conteúdo de links enviados pelos usuários), o que abre riscos de injeção indireta (quando uma página web terceira possui instruções maliciosas ocultas para desviar o comportamento do LLM).

- **Ataque Direto**: Operador solicita a revelação de instruções internas do sistema, chaves ou bypass de segurança.
- **Ataque Indireto**: Inserção de frases maliciosas em blogs ou leads raspados pela API para forçar a execução de ferramentas.

---

## 2. Lógica de Contenção e Defesas Implementadas

Em [ai-chat.functions.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts):

- **Filtro de Tags HTML/XML**: Regex remove tags do conteúdo extraído para evitar quebras estruturais no prompt.
- **Censura de Palavras-Chave**: Expressão regular `/system_prompt|instructions|ignore/gi` substitui termos que buscam burlar regras de sistema pelo token `[CENSORED]`.
- **Isolamento por Tags**: O conteúdo externo é encapsulado sob delimitação rígida e isolada:
  ```txt
  [SISTEMA - DADOS DO WEBSCRAPER CONTIDOS DE FORMA ISOLADA]:
  <scraped_content url="...">
  {CONTEÚDO SANITIZADO}
  </scraped_content>
  ```
- **Instrução de Segurança**: Anexo no prompt avisando à IA para não aceitar nenhuma instrução ou comando contido dentro da tag de scraping.
- **Double-Pass da IA Revisora**: Validação secundária na resposta gerada em busca de tentativas de desvio de comportamento.

---

## 3. Classificação das Entregas de Segurança

- **Isolamento de Conteúdo de Scraping**: **REAL PONTA A PONTA**
- **Sanitização contra XML Injections**: **REAL PONTA A PONTA**
- **Detecção e Prevenção Ativa de Exfiltração**: **REAL, MAS NÃO TESTADA**
