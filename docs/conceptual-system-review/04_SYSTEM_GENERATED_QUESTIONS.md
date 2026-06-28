# 04 AUTOQUESTIONAMENTO ESPECÍFICO

## Ação: Inserir Passageiro na Viagem
- O usuário tem permissão na `agency_id` correta?
- A viagem não está `closed`?
- O RLS de `passengers` impede mass assignment?
- A capacidade do veículo (`bus_layouts`) foi respeitada? (O código atual NÃO checa lock de concorrência na capacidade do ônibus no banco).
