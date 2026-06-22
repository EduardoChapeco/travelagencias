# 06. Auditoria do Gerador de Recibos de Pagamento

## 1. Avaliação de Segurança e Autenticidade

### O Problema do QR Code Decorativo
O modal gera um QR Code no frontend utilizando a API pública do QR Server:
```typescript
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
  `Autenticação TravelOS: ${authCode} | Valor: ${money(data.amount)} | Pago por: ${data.payerName}`
)}`;
```
- **Crítica**: O QR Code **não aponta para uma página de validação real** no portal público da agência. Ele codifica apenas uma string de texto simples com os dados da transação. 
- **Risco**: Se um cliente escanear o QR Code no celular, o aparelho exibirá apenas uma string de texto cru ao invés de abrir uma página de validação segura do TravelOS. Isso classifica o QR Code como **decorativo/simbólico**, incapaz de prover verificação de autenticidade contra falsificações.

### Falta de Snapshots e Imutabilidade
- **Análise**: Os recibos não são salvos em uma tabela de auditoria (`payment_receipts` ou histórico de snapshots). Eles são gerados dinamicamente no frontend com base nas informações correntes das tabelas de inscrições e agências.
- **Risco**: Se o operador da agência alterar o nome do passageiro na inscrição ou o valor base da excursão futuramente, a segunda via do recibo gerada terá dados diferentes da primeira via. O recibo **não é imutável** e não possui snapshot estático em arquivo ou hash criptográfico no banco, violando princípios básicos de conformidade fiscal e contábil.

---

## 2. Layouts e Impressão (Monospace Térmico vs. A4)

### Impressão Térmica (80mm)
- **Implementação**: O layout de 80mm usa fonte mono e elementos formatados por separadores textuais (`--------------------------------`).
- **Problema de Impressão**: O modal utiliza `window.print()` injetando CSS para isolar o elemento `#print-receipt-area`. Na prática, impressoras térmicas não industriais (sem drivers de conversão de página inteira de navegadores) imprimem margens brancas gigantescas nas laterais ou cortam o texto devido à falta de redimensionamento do viewport do navegador na fila de impressão. Não há suporte a comandos raw (ESC/POS) para envio direto às portas seriais/USB de hardware térmico.

### Documentos Fiscais vs. Recibo Simples
O layout A4 utiliza termos como:
- *"Recibo de Pagamento"*
- *"Autenticação de Transação"*
- *"Assinado digitalmente por TravelOS"*
- **Crítica**: O documento **não apresenta nenhum aviso legal ou disclaimer** informando ao consumidor que aquele recibo *não possui validade fiscal de nota fiscal* (NF-e/NFS-e). Isso pode induzir clientes e operadores ao erro contábil ou fiscal.

---

## 3. Desempenho de Renderização (jsPDF e html2canvas)
- **Implementação**: O uso de imports dinâmicos (`await import("html2canvas")` e `await import("jspdf")`) funciona bem e reduz o consumo de memória no primeiro carregamento do app.
- **Ajuste de Escala**: A escala aplicada no `html2canvas` é de `2`, o que fornece boa definição em dispositivos retina. Porém, em dispositivos móveis modestos, a rasterização de um elemento HTML grande no canvas para conversão em PDF/PNG pode causar lentidão significativa ou falhas de estouro de memória no Safari móvel.
