# Plano de Testes: Renderização de Documentos e Exportação de PDF (html2canvas / jsPDF)

Este documento especifica os testes para a geração de PDFs no Document Builder (Propostas, Vouchers e Contratos) utilizando html2canvas e jsPDF.

---

## 1. Exportação de Proposta/Contrato em PDF

- **Caso de Teste 1: Fluxo de Download**
  - **Passos**:
    1. Acessar uma cotação/proposta ativa no painel do agente.
    2. Clicar no botão "Exportar PDF" no topo do Proposal Studio.
    3. Monitorar o indicador de progresso de geração do arquivo.
    4. Confirmar que o download do arquivo `.pdf` inicia automaticamente no navegador.
- **Caso de Teste 2: Integridade de Margens e Resolução**
  - **Passos**:
    1. Abrir o arquivo PDF baixado.
    2. Verificar se o cabeçalho e rodapé da agência (puxados do `brand_kit`) estão nítidos e com alta resolução.
    3. Garantir que as margens laterais (mínimo de 15px) evitam cortes no texto de cláusulas ou tabelas de preços.
    4. Confirmar que o texto não está borrado (relação de escala de DPI no html2canvas configurada corretamente em `scale: 2` ou superior).

---

## 2. Quebras de Página (Page Breaks)

- **Caso de Teste 3: Multi-folhas A4**
  - **Passos**:
    1. Criar um contrato longo contendo mais de 5 cláusulas extensas.
    2. No editor, verifique as linhas pontilhadas de simulação de quebra de página.
    3. Exportar o PDF.
    4. **Verificação**: Garantir que as linhas de texto não fiquem cortadas horizontalmente ao meio na divisão de duas páginas físicas do PDF.
    5. Certificar-se de que cada seção principal (ex: Assinatura, Dados Financeiros) comece em uma página nova se configurado o comportamento de quebra forçada.
