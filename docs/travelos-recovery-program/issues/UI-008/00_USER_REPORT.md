# UI-008 - 00_USER_REPORT.md
# RELATO DO USUÁRIO - INCIDENTE DE EMPTY STATE NOS VOUCHERS

## 1. Descrição do Relato (Hipótese)
O usuário relata que a tela de Vouchers (`/agency/:slug/vouchers`), quando vazia, exibe um texto de estado vazio comprimido horizontalmente e uma área desfocada sem qualquer botão de chamada para ação (CTA).

## 2. Comportamento Esperado
* A exibição de estado vazio (`EmptyState`) deve ser espaçosa, centralizada e legível.
* Deve conter um botão de ação primária (CTA) permitindo que o usuário crie ou envie um voucher de forma rápida.
* Respeito às diretrizes de margens e alinhamentos sem compressão de texto.
