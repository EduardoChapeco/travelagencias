# 11 REVISÃO DE FLUXOS END-TO-END

## Fluxo: Criação de Viagem até Embarque
- Criação -> Venda -> Inscrição -> Rooming -> Voucher.
- **Falhas detectadas:** A geração de Voucher (`agency.$slug.trips.$id.vouchers.tsx`) depende da renderização HTML do lado do cliente (html2pdf), o que é frágil. Se a aba for fechada, falha.
