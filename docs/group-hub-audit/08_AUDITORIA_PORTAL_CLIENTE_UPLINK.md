# 08. Auditoria do Portal do Cliente & Uplink de Dados

## 1. O Bloqueio Crítico de RLS (Funcionalidade Quebrada)

A página de detalhe da viagem no portal público ([client.trips.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/client.trips.$id.tsx)) tenta buscar a alocação de quartos realizando uma consulta direta na tabela:

```typescript
const roomingListQ = useQuery({
  enabled: !!tripQ.data && !!tripQ.data.group_tour_id,
  queryKey: ["client-rooming-list", tripQ.data?.group_tour_id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("boarding_rooming_list")
      .select("*")
      .eq("group_tour_id", tripQ.data!.group_tour_id!)
```

- **Conflito de Segurança**: A tabela `boarding_rooming_list` possui a política RLS `rooming read` configurada para permitir SELECT apenas para membros da agência: `public.is_agency_member(auth.uid(), agency_id)`.
- **Efeito**: Para o cliente final, a consulta retorna erro `401 Unauthorized` ou um vetor vazio. A interface do portal exibirá silenciosamente `"Acomodação: A definir"`, quebrando a funcionalidade de exibição de quarto para o passageiro em produção.

---

## 2. Risco de Vazamento de Dados (Falta de Isolamento de Privacidade)

Se a política RLS do banco de dados for relaxada para permitir que qualquer usuário autenticado (`authenticated`) leia os registros de `boarding_rooming_list` de um grupo em que participa:

- **Falha de Privacidade**: O frontend baixa o array completo de quartos e passageiros da excursão via `.select("*")` e executa o filtro no navegador (`roomingListQ.data?.find(...)`).
- **Vulnerabilidade**: Qualquer passageiro da excursão poderá abrir o Console do Desenvolvedor (F12 / Network Tab) e visualizar a lista completa de todos os quartos do hotel, contendo os nomes completos de todos os outros passageiros e seus respectivos números de quarto. Isso viola leis de privacidade de dados (LGPD) e expõe informações pessoais e de hospedagem de terceiros de forma indevida.
- **Correção Necessária**: A busca de quartos deve ser substituída por uma função RPC segura no banco de dados (ex: `get_my_room_allocation(trip_id)`) que filtre os dados no servidor PostgreSQL e retorne estritamente o quarto do cliente solicitante.

---

## 3. Ordem de Precedência dos Dados e Fallbacks (Viagem vs. Grupo)

O sistema unifica os dados em tempo de renderização utilizando a seguinte precedência:

```typescript
const trip = {
  ...rawTrip,
  itinerary:
    rawTrip.itinerary && rawTrip.itinerary.length > 0
      ? rawTrip.itinerary
      : rawTrip.group_tour?.itinerary || [],
  includes:
    rawTrip.includes && rawTrip.includes.length > 0
      ? rawTrip.includes
      : rawTrip.group_tour?.includes || [],
  excludes:
    rawTrip.excludes && rawTrip.excludes.length > 0
      ? rawTrip.excludes
      : rawTrip.group_tour?.excludes || [],
};
```

### Análise da Precedência:

1. **Roteiro / Inclusos Individuais (`rawTrip.itinerary`)**: Se existirem dados customizados na viagem individual do cliente, eles vencem.
2. **Dados do Grupo (`rawTrip.group_tour.itinerary`)**: Se a viagem individual estiver vazia, o sistema herda os dados da excursão em grupo ao vivo.

### Crítica de Integridade Comercial:

O fallback ao vivo do grupo é um risco legal. Se o operador da agência alterar o itinerário ou remover um item incluso da excursão (ex: remover "jantar incluso") após a venda ter sido efetuada, o portal do cliente refletirá a mudança imediatamente. O cliente perderá a prova do que contratou no momento da compra (sem snapshot do contrato original na viagem individual), abrindo espaço para disputas de CDC (Código de Defesa do Consumidor).
