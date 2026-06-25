# 08. Vinculação CRM: Clientes, Passageiros e Viagens

Este documento descreve o fluxo de reconciliação e vinculação de passageiros, contatos e clientes entre a base do **Infotravel/Infotera** e o **CRM do TravelOS**, detalhando as regras de cruzamento de dados para evitar duplicações de registros e vazamentos de privilégios.

---

## 1. O Fluxo de Vinculação de Contatos e Clientes

Quando uma reserva é importada ou criada via API, os dados dos passageiros e do cliente comprador devem ser processados e correlacionados de forma inteligente com os contatos existentes no CRM do TravelOS.

```txt
Reserva Importada do Infotravel
  │
  ├──> Identifica o Cliente Comprador (clientId / client_name)
  │    │
  │    ├──> 1. Busca por CPF no TravelOS (`public.clients.document`)
  │    │    Se encontrado: Vincula a reserva a este cliente existente.
  │    │
  │    ├──> 2. Se CPF não disponível, busca por E-mail (`public.clients.email`)
  │    │    Se encontrado: Vincula a reserva a este cliente existente.
  │    │
  │    └──> 3. Se não encontrado:
  │         Cria um novo registro de Cliente (`public.clients`) e salva o vínculo
  │         em `external_entity_links` (tipo `client`).
  │
  └──> Identifica os Passageiros (ApiName / ApiNameTicket)
       │
       └──> Para cada passageiro da reserva:
            - Busca passageiro pelo CPF/Documento na tabela `public.trip_passengers`.
            - Se existir: Vincula à nova viagem (`public.trips`).
            - Se não existir: Cria o registro em `trip_passengers` associado à viagem.
            - Registra os links correspondentes em `external_entity_links`.
```

---

## 2. Regras de Matching e Prevenção de Conflitos

Para manter a base de dados consistente e evitar a poluição de cadastros com homônimos e duplicados, o sistema implementa regras estritas de correspondência:

1. **Proibição de Fuzzy Matching Automático**: O sistema **nunca** deve mesclar ou vincular cadastros de clientes baseando-se apenas na correspondência parcial ou fonética de nomes (ex: mesclar "José Silva" e "José da Silva" de forma autônoma). Se não houver identificador exclusivo (CPF, E-mail ou ID externo confiável), o sistema cria um novo registro de cliente.
2. **Fila de Revisão de Conflitos (CRM Inbox)**: Se o sistema encontrar inconsistências cadastrais (ex: o mesmo CPF cadastrado no Infotravel com um e-mail diferente daquele registrado no CRM do TravelOS), o vínculo automático é bloqueado. O registro é direcionado para uma fila de conciliação manual no painel de CRM do operador ("Fila de Conflitos de Sincronização"), onde o agente comercial escolhe se deseja mesclar os contatos ou manter cadastros separados.
3. **Validação de LGPD e Aceites Legais**: Clientes importados do Infotravel que ainda não possuem registro de consentimento no TravelOS devem ser marcados com a flag `lgpd_accepted = false`. No primeiro login do cliente no Portal B2C para visualizar a viagem importada, um termo de consentimento e aceite de políticas de privacidade é exibido de forma mandatória antes da liberação dos vouchers.
