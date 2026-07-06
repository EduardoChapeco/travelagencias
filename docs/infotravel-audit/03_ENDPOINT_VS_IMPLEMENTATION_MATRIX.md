# 03. Matriz de Endpoints vs. Implementação Real

Esta matriz detalha o estado de implementação física no **Turis** de cada funcionalidade crítica da API **Infotravel/Infotera**, comparando a capacidade oficial documentada no Swagger da plataforma com o código do repositório.

---

## 1. Matriz Geral de Cobertura

| Capacidade             | Endpoint Oficial                               | Arquivo Implementado            | UI  | Persistência | Sync | Estado Real                                 | Evidência / Diagnóstico                                                                                  |
| :--------------------- | :--------------------------------------------- | :------------------------------ | :-: | :----------: | :--: | :------------------------------------------ | :------------------------------------------------------------------------------------------------------- |
| **Autenticação**       | `POST /api/v1/user/login`                      | `infotravel-connector/index.ts` | Sim |     Não      | N/A  | **MOCK** (Chama `/auth/login` incorreto)    | Linhas 117-141. O conector possui código real de fetch, mas usa a rota errada. Funciona apenas sob mock. |
| **Busca de Hotéis**    | `GET/POST /api/v1/avail/hotel`                 | `src/services/infotravel.ts`    | Sim |     Não      | Não  | **MOCK** (Chama `/search/hotel` incorreto)  | Linhas 4-17 em `infotravel.ts`. Retorna dados fictícios do simulador de sandbox.                         |
| **Busca de Voos**      | `GET /api/v1/avail/flight`                     | `src/services/infotravel.ts`    | Sim |     Não      | Não  | **MOCK** (Chama `/search/flight` incorreto) | Linhas 19-32 em `infotravel.ts`. Retorna dados fictícios da Latam/American Airlines.                     |
| **Importar Reserva**   | `GET /api/v1/booking/{id}`                     | `src/services/infotravel.ts`    | Sim |     Não      | Não  | **MOCK** (Chama `/booking/{id}` incorreto)  | Linhas 34-44 em `infotravel.ts`. O conector retorna JSON estático sem salvar tabelas.                    |
| **Check Rate**         | `POST /api/v1/checkRate`                       | Nenhum                          | Não |     Não      | Não  | **NÃO IMPLEMENTADO**                        | Rota ausente no backend e no frontend. Sem validação de tarifas antes da venda.                          |
| **Cancelar Reserva**   | `DELETE /api/v1/booking/{id}/cancel`           | Nenhum                          | Não |     Não      | Não  | **NÃO IMPLEMENTADO**                        | Funcionalidade inexistente. Exige que o operador cancele manualmente no painel da Infotravel.            |
| **Confirmar Reserva**  | `POST /api/v1/booking/{id}/confirm`            | Nenhum                          | Não |     Não      | Não  | **NÃO IMPLEMENTADO**                        | Rota ausente. Sem fluxo de confirmação eletrônica no fechamento da venda.                                |
| **Criar Reserva**      | `POST /api/v1/booking`                         | Nenhum                          | Não |     Não      | Não  | **NÃO IMPLEMENTADO**                        | Rota de reserva (Booking RQ) ausente. O sistema não envia dados dos passageiros para o GDS.              |
| **Conciliação PIX**    | `GET /api/v1/payment/pix/consult/{id}`         | Nenhum                          | Não |     Não      | Não  | **NÃO IMPLEMENTADO**                        | Sem comunicação com o gateway de PIX da Infotravel.                                                      |
| **Geração de Invoice** | `GET /api/v1/invoice/generate/{idPayment}`     | Nenhum                          | Não |     Não      | Não  | **NÃO IMPLEMENTADO**                        | Sem sincronização física de notas fiscais geradas pela operadora.                                        |
| **Contratos**          | `GET /api/v1/utility/contract/{idReserva}`     | Nenhum                          | Não |     Não      | Não  | **NÃO IMPLEMENTADO**                        | Sem importação dos termos contratuais e políticas oficiais da reserva.                                   |
| **Busca de Clientes**  | `GET /api/v1/backoffice/client/{externalCode}` | Nenhum                          | Não |     Não      | Não  | **NÃO IMPLEMENTADO**                        | Sem sincronização do cadastro de clientes e empresas entre os sistemas.                                  |

---

## 2. Conclusão da Análise de Cobertura

Atualmente, o **Turis possui cobertura zero (0%) de integração real** com a API do Infotravel em ambientes de produção. As telas existentes baseiam-se em fluxos estáticos e mocks acoplados na Edge Function, operando exclusivamente em modo Sandbox demonstrativo. O reordenamento dos caminhos (endpoints) e a estruturação de mapeadores de dados constituem os primeiros passos para a ativação do ecossistema real.
