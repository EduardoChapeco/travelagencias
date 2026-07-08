# UI-005 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-005

## 1. Evidência no Código e Compilação
* **Hipótese de Contaminação:** Não foi localizada nenhuma regra direta no [styles.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css) que force a largura de `h1` ou contêineres públicos a larguras unitárias de palavras.
* **Hipótese de Compilação do Tailwind v4:** No Windows, caminhos de diretório com caracteres especiais (como `Excelência Tour SMO` na pasta de usuário) podem causar falhas na leitura e rastreamento de arquivos em tempo de compilação por meio da diretiva `@source "../src";` no Tailwind v4. Isso impede a geração de classes utilitárias como `max-w-4xl` ou `max-w-6xl` no bundle final, resultando em comportamentos de layout indesejados devido a falta de compilação de regras de layout.
* **Hipótese de Seletor Global:** Um seletor de layout aplicado para restringir colunas Kanban ou tabelas operacionais pode ter atingido a tag genérica `section` ou contêineres públicos sem o devido escopo de classe do painel administrativo.

## 2. Status de Classificação
**HIPÓTESE PLAUSÍVEL** (A quebra de layout na Home pública precisa ser testada no runtime local para inspecionar os computed styles das classes de largura).
