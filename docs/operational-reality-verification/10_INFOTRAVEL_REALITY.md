# 10. InfoTravel Reality (Realidade da Integração InfoTravel)

## 1. Conexão e Busca GDS Real
A integração com o GDS InfoTravel foi auditada e refatorada para ser **100% real**, eliminando qualquer simulação de dados:

* **Fallback de Sandbox Removido:** O conector não simula mais voos ou hotéis fictícios. Se as credenciais do GDS não estiverem configuradas ou forem inválidas, ele retorna o erro estruturado `CREDENTIALS_NOT_CONFIGURED`.
* **Tratamento no Frontend:** Ao receber o código de erro de credenciais ausentes, a tela de cotações (`quotes.$id.tsx`) oculta os resultados de busca e exibe um banner contextual amigável ("GDS não conectado") orientando o operador a configurar a integração.
* **Transfers e Passeios:** Os endpoints de busca de Traslados (`/api/v1/avail/transfer`) e Passeios (`/api/v1/avail/tour`) foram implementados com chamadas HTTP reais e mapeadores de normalização (`mapApiTransferToNormalizedOffer` e `mapApiActivityToNormalizedOffer`) que persistem as ofertas em `normalized_offers` para serem usadas na composição do pacote.
