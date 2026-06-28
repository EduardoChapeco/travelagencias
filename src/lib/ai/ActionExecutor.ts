import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ActionRegistry } from "./ActionRegistry";

export const executeAIChatAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      agencyId: z.string().uuid(),
      actionCode: z.string(),
      payload: z.any(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { agencyId, actionCode, payload } = data;

    // 1. Resolve action definition
    const action = ActionRegistry[actionCode];
    if (!action) {
      throw new Error(`Ação '${actionCode}' não cadastrada no catálogo de ferramentas.`);
    }

    // 2. Validate user membership and active roles in the agency
    const { data: roleRecord, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (roleError) throw new Error("Erro ao validar credenciais da agência.");
    const activeRole = roleRecord?.role || "agent";

    const isAllowed = action.allowedRoles.includes(activeRole) || activeRole === "super_admin";
    if (!isAllowed) {
      throw new Error(
        `Acesso negado. Seu papel atual (${activeRole}) não tem permissão para a ação '${action.name}'.`,
      );
    }

    // 3. Parse input payload against Zod schema
    const parseResult = action.inputSchema.safeParse(payload);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors
        .map((e: any) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      throw new Error(`Dados inválidos para '${action.name}': ${errorMsg}`);
    }

    const validatedData = parseResult.data;
    let resultMessage = "";
    let entityId: string | null = null;
    let entityType = "";

    // 4. DB Transaction / Execution
    try {
      if (actionCode === "create_lead") {
        const { data: crmStages } = await supabase
          .from("lead_stages")
          .select("id")
          .eq("agency_id", agencyId)
          .order("position")
          .limit(1);

        const stageId = crmStages && crmStages.length > 0 ? crmStages[0].id : null;

        const { data: lead, error } = await supabase
          .from("leads")
          .insert({
            agency_id: agencyId,
            stage_id: stageId,
            owner_id: userId,
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone,
            destination: validatedData.destination,
            notes: validatedData.notes,
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = lead.id;
        entityType = "lead";
        resultMessage = `Lead '${validatedData.name}' cadastrado com sucesso para o destino '${validatedData.destination}'.`;
      } else if (actionCode === "update_lead") {
        const { error } = await supabase
          .from("leads")
          .update({
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone,
            destination: validatedData.destination,
            notes: validatedData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", validatedData.leadId)
          .eq("agency_id", agencyId);

        if (error) throw error;
        entityId = validatedData.leadId;
        entityType = "lead";
        resultMessage = `Dados cadastrais do lead atualizados com sucesso.`;
      } else if (actionCode === "change_lead_stage") {
        const { data: stages } = await supabase
          .from("lead_stages")
          .select("id, name, is_won, is_lost")
          .eq("agency_id", agencyId)
          .order("position");

        let targetStageId: string | null = null;
        if (stages && stages.length > 0) {
          const s = validatedData.stage;
          if (s === "new") {
            targetStageId = stages[0].id;
          } else if (s === "won") {
            targetStageId =
              stages.find((x: any) => x.is_won)?.id ||
              stages[stages.length - 2]?.id ||
              stages[0].id;
          } else if (s === "lost") {
            targetStageId =
              stages.find((x: any) => x.is_lost)?.id ||
              stages[stages.length - 1]?.id ||
              stages[0].id;
          } else {
            const searchKeyword =
              s === "contacted" ? "contato" : s === "proposal" || s === "negotiation" ? "cota" : "";
            const matched = searchKeyword
              ? stages.find((x: any) => x.name.toLowerCase().includes(searchKeyword))
              : null;
            targetStageId =
              matched?.id || stages[Math.min(stages.length - 1, s === "contacted" ? 1 : 2)].id;
          }
        }

        if (!targetStageId) {
          throw new Error(
            "Nenhum estágio do funil de vendas correspondente foi encontrado para a agência.",
          );
        }

        const { error } = await supabase
          .from("leads")
          .update({
            stage_id: targetStageId,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", validatedData.leadId)
          .eq("agency_id", agencyId);

        if (error) throw error;
        entityId = validatedData.leadId;
        entityType = "lead";
        resultMessage = `Estágio do lead alterado com sucesso para '${validatedData.stage}'.`;
      } else if (actionCode === "create_client") {
        const { data: client, error } = await supabase
          .from("clients")
          .insert({
            agency_id: agencyId,
            full_name: validatedData.name,
            document: validatedData.document,
            email: validatedData.email,
            phone: validatedData.phone,
            birth_date: validatedData.birthDate,
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = client.id;
        entityType = "client";
        resultMessage = `Cliente '${validatedData.name}' cadastrado com sucesso.`;
      } else if (actionCode === "add_traveler") {
        const { data: traveler, error } = await supabase
          .from("trip_passengers")
          .insert({
            agency_id: agencyId,
            trip_id: validatedData.tripId,
            full_name: validatedData.name,
            document: validatedData.document,
            phone: validatedData.phone,
            birth_date: validatedData.birthDate || null,
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = traveler.id;
        entityType = "trip_passenger";
        resultMessage = `Viajante '${validatedData.name}' adicionado à viagem com sucesso.`;
      } else if (actionCode === "update_traveler") {
        const { error } = await supabase
          .from("trip_passengers")
          .update({
            full_name: validatedData.name,
            document: validatedData.document,
            phone: validatedData.phone,
            birth_date: validatedData.birthDate || null,
          } as any)
          .eq("id", validatedData.travelerId);

        if (error) throw error;
        entityId = validatedData.travelerId;
        entityType = "trip_passenger";
        resultMessage = `Dados do viajante atualizados com sucesso.`;
      } else if (actionCode === "start_quote") {
        const { data: quote, error } = await supabase
          .from("proposals")
          .insert({
            agency_id: agencyId,
            client_id: validatedData.clientId,
            title: validatedData.title,
            destination: validatedData.destination,
            pax_adults: validatedData.passengersCount || 1,
            travel_start: validatedData.travelDate || null,
            status: "draft",
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = quote.id;
        entityType = "proposal";
        resultMessage = `Cotação '${validatedData.title}' iniciada com sucesso.`;
      } else if (actionCode === "create_proposal") {
        const { error } = await supabase
          .from("proposals")
          .update({
            title: validatedData.title,
            total: validatedData.totalAmount,
            notes: validatedData.notes,
            status: "draft",
          } as any)
          .eq("id", validatedData.quoteId);

        if (error) throw error;
        entityId = validatedData.quoteId;
        entityType = "proposal";
        resultMessage = `Proposta '${validatedData.title}' criada com sucesso no valor de R$ ${validatedData.totalAmount}.`;
      } else if (actionCode === "quote_create") {
        const intent = {
          agencyId,
          clientId: validatedData.clientId || null,
          leadId: validatedData.leadId || null,
          requestedBy: "chat",
          origin: [
            {
              code: validatedData.origin,
              name: validatedData.origin === "CXP" ? "Chapecó" : validatedData.origin,
            },
          ],
          destinations: [
            {
              code: validatedData.destination.substring(0, 3).toUpperCase(),
              name: validatedData.destination,
            },
          ],
          dateWindow: {
            start: validatedData.startDate || new Date().toISOString().split("T")[0],
            end:
              validatedData.endDate ||
              new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            flexDays: 3,
          },
          duration: {
            minNights: 5,
            maxNights: 7,
          },
          travelers: {
            adults: validatedData.paxAdults,
            children: validatedData.paxChildren,
            infants: 0,
          },
          budget: {
            amount: validatedData.budget || 10000,
            currency: "BRL",
            priority: "medium",
          },
          productTypes: ["flight", "hotel", "transfer"],
          source: "chat" as const,
        };

        const { data: quote, error: quoteErr } = await supabase
          .from("quote_requests")
          .insert({
            agency_id: agencyId,
            lead_id: validatedData.leadId || null,
            client_id: validatedData.clientId || null,
            source: "chat",
            status: "draft",
            normalized_intent: intent as any,
          })
          .select("id")
          .single();

        if (quoteErr) throw quoteErr;

        const travelerInserts = [
          ...Array.from({ length: validatedData.paxAdults }).map(() => ({
            quote_request_id: quote.id,
            traveler_type: "adult",
            age: 30,
          })),
          ...Array.from({ length: validatedData.paxChildren }).map(() => ({
            quote_request_id: quote.id,
            traveler_type: "child",
            age: 8,
          })),
        ];

        const { error: travelersErr } = await supabase
          .from("quote_travelers")
          .insert(travelerInserts);

        if (travelersErr) throw travelersErr;

        entityId = quote.id;
        entityType = "quote_request";
        resultMessage = `Cotação inteligente para '${validatedData.destination}' iniciada com sucesso via chat.`;
      } else if (actionCode === "quote_compare") {
        entityId = validatedData.quoteRequestId;
        entityType = "quote_request";
        resultMessage = `Central de decisão carregada para comparar os cenários e alternativas da cotação.`;
      } else if (actionCode === "add_hotel") {
        const { data: existingVoucher } = await supabase
          .from("vouchers")
          .select("id, accommodation")
          .eq("trip_id", validatedData.tripId)
          .is("deleted_at", null)
          .maybeSingle();

        const newHotel = {
          name: validatedData.hotelName,
          checkin: validatedData.checkIn,
          checkout: validatedData.checkOut,
          room_type: validatedData.roomType || "",
          confirmation: validatedData.locator || "",
        };

        if (existingVoucher) {
          const accs = Array.isArray(existingVoucher.accommodation)
            ? [...existingVoucher.accommodation, newHotel]
            : [newHotel];

          const { error } = await supabase
            .from("vouchers")
            .update({ accommodation: accs } as any)
            .eq("id", existingVoucher.id);
          if (error) throw error;
          entityId = existingVoucher.id;
        } else {
          const { data: newV, error } = await supabase
            .from("vouchers")
            .insert({
              agency_id: agencyId,
              trip_id: validatedData.tripId,
              accommodation: [newHotel],
              source_type: "manual",
            } as any)
            .select("id")
            .single();
          if (error) throw error;
          entityId = newV.id;
        }
        entityType = "voucher";
        resultMessage = `Hotel '${validatedData.hotelName}' adicionado ao voucher da viagem.`;
      } else if (actionCode === "add_flight") {
        const { data: existingVoucher } = await supabase
          .from("vouchers")
          .select("id, flights")
          .eq("trip_id", validatedData.tripId)
          .is("deleted_at", null)
          .maybeSingle();

        const newFlight = {
          airline: validatedData.airline,
          flight_number: validatedData.flightNumber,
          origin: validatedData.fromCode,
          destination: validatedData.toCode,
          departure_time: validatedData.departureTime,
          arrival_time: validatedData.arrivalTime || "",
          locator: validatedData.locator || "",
        };

        if (existingVoucher) {
          const fls = Array.isArray(existingVoucher.flights)
            ? [...existingVoucher.flights, newFlight]
            : [newFlight];

          const { error } = await supabase
            .from("vouchers")
            .update({ flights: fls } as any)
            .eq("id", existingVoucher.id);
          if (error) throw error;
          entityId = existingVoucher.id;
        } else {
          const { data: newV, error } = await supabase
            .from("vouchers")
            .insert({
              agency_id: agencyId,
              trip_id: validatedData.tripId,
              flights: [newFlight],
              source_type: "manual",
            } as any)
            .select("id")
            .single();
          if (error) throw error;
          entityId = newV.id;
        }
        entityType = "voucher";
        resultMessage = `Voo '${validatedData.flightNumber}' adicionado ao voucher.`;
      } else if (actionCode === "create_trip") {
        const { data: proposal } = await supabase
          .from("proposals")
          .select("client_id, total")
          .eq("id", validatedData.proposalId)
          .maybeSingle();

        const { data: trip, error } = await supabase
          .from("trips")
          .insert({
            agency_id: agencyId,
            proposal_id: validatedData.proposalId,
            client_id: proposal?.client_id || null,
            title: validatedData.title,
            travel_start: validatedData.startDate,
            travel_end: validatedData.endDate,
            total_sale: proposal?.total || 0,
            status: "planning",
          } as any)
          .select("id")
          .single();

        if (error) throw error;

        await supabase
          .from("proposals")
          .update({ status: "converted" } as any)
          .eq("id", validatedData.proposalId);

        entityId = trip.id;
        entityType = "trip";
        resultMessage = `Viagem '${validatedData.title}' criada com sucesso a partir da proposta.`;
      } else if (actionCode === "query_trip") {
        const { data: trips } = await supabase
          .from("trips")
          .select("id, title, travel_start")
          .eq("agency_id", agencyId)
          .ilike("title", `%${validatedData.query}%`)
          .limit(5);

        entityId = trips && trips.length > 0 ? trips[0].id : null;
        entityType = "trip";
        resultMessage =
          trips && trips.length > 0
            ? `Viagens encontradas: ${trips.map((t: any) => `${t.title} (Início: ${t.travel_start})`).join(", ")}.`
            : `Nenhuma viagem encontrada para '${validatedData.query}'.`;
      } else if (actionCode === "create_task") {
        const { data: task, error } = await supabase
          .from("agent_tasks")
          .insert({
            agency_id: agencyId,
            agent_id: validatedData.assignedTo || userId,
            title: validatedData.title,
            due_date: validatedData.dueDate || new Date().toISOString().split("T")[0],
            reference_id: validatedData.tripId || null,
            type: validatedData.tripId ? "trip" : "manual",
            status: "todo",
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = task.id;
        entityType = "agent_task";
        resultMessage = `Tarefa '${validatedData.title}' criada com sucesso.`;
      } else if (actionCode === "create_ticket") {
        const { data: ticket, error } = await supabase
          .from("support_tickets")
          .insert({
            agency_id: agencyId,
            client_id: validatedData.clientId,
            title: validatedData.subject,
            description: validatedData.description,
            priority: validatedData.priority || "medium",
            status: "open",
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = ticket.id;
        entityType = "support_ticket";
        resultMessage = `Ticket de suporte criado com sucesso.`;
      } else if (actionCode === "register_payment") {
        const { data: record, error } = await supabase
          .from("financial_records")
          .insert({
            agency_id: agencyId,
            trip_id: validatedData.tripId,
            type: "income",
            amount: validatedData.amount,
            amount_brl: validatedData.amount,
            payment_method: validatedData.method,
            due_date: validatedData.dueDate || new Date().toISOString().split("T")[0],
            notes: validatedData.notes,
            status: "confirmed",
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = record.id;
        entityType = "financial_record";
        resultMessage = `Pagamento de R$ ${validatedData.amount} registrado com sucesso.`;
      } else if (actionCode === "query_installments") {
        const { data: plan } = await supabase
          .from("payment_plans")
          .select("id, total_amount")
          .eq("trip_id", validatedData.tripId)
          .maybeSingle();

        let installmentsList: any[] = [];
        if (plan) {
          const { data: insts } = await supabase
            .from("payment_installments")
            .select("number, due_date, amount, status")
            .eq("payment_plan_id", plan.id)
            .order("number");
          installmentsList = insts || [];
        }

        entityId = plan?.id || null;
        entityType = "payment_plan";
        resultMessage =
          installmentsList.length > 0
            ? `Parcelas da viagem: ${installmentsList.map((i: any) => `Parc ${i.number} - R$ ${i.amount} (${i.status})`).join(", ")}.`
            : `Nenhum plano de parcelamento encontrado para esta viagem.`;
      } else if (actionCode === "generate_contract") {
        const { data: tripRecord } = await supabase
          .from("trips")
          .select("proposal_id")
          .eq("id", validatedData.tripId)
          .maybeSingle();

        let total = 0;
        let notes = "Pacote de Viagem";

        if (tripRecord?.proposal_id) {
          const { data: proposal } = await supabase
            .from("proposals")
            .select("total, notes")
            .eq("id", tripRecord.proposal_id)
            .maybeSingle();
          if (proposal) {
            total = proposal.total || 0;
            notes = proposal.notes || "Pacote de Viagem";
          }
        }

        const { data: contract, error } = await supabase
          .from("contracts")
          .insert({
            agency_id: agencyId,
            trip_id: validatedData.tripId,
            total_value: total,
            package_summary: notes,
            status: "draft",
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = contract.id;
        entityType = "contract";
        resultMessage = `Rascunho de contrato gerado com sucesso para a viagem.`;
      } else if (actionCode === "generate_voucher") {
        const { data: voucher, error } = await supabase
          .from("vouchers")
          .insert({
            agency_id: agencyId,
            trip_id: validatedData.tripId,
            source_type: "manual",
            observations: validatedData.notes || "",
            template: "navy",
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        entityId = voucher.id;
        entityType = "voucher";
        resultMessage = `Rascunho do voucher manual gerado com sucesso.`;
      } else if (actionCode === "query_supplier") {
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id, name, kind")
          .eq("agency_id", agencyId)
          .ilike("name", `%${validatedData.query}%`)
          .limit(5);

        entityId = sups && sups.length > 0 ? sups[0].id : null;
        entityType = "supplier";
        resultMessage =
          sups && sups.length > 0
            ? `Fornecedores: ${sups.map((s: any) => `${s.name} (${s.kind})`).join(", ")}.`
            : `Nenhum fornecedor encontrado para '${validatedData.query}'.`;
      } else if (actionCode === "start_ocr") {
        const { data: job, error } = await (supabase as any)
          .from("ai_jobs")
          .insert({
            agency_id: agencyId,
            user_id: userId,
            status: "pending",
            metadata: { file_url: validatedData.fileUrl, ocr_type: validatedData.ocrType },
          })
          .select("id")
          .single();

        if (error) throw error;
        entityId = job.id;
        entityType = "ai_job";
        resultMessage = `Processamento OCR iniciado com sucesso.`;
      } else if (actionCode === "query_groups") {
        const { data: groups } = await supabase
          .from("group_tours")
          .select("id, title, departure_date, status")
          .eq("agency_id", agencyId)
          .ilike("title", `%${validatedData.query}%`)
          .limit(5);

        entityId = groups && groups.length > 0 ? groups[0].id : null;
        entityType = "group_tour";
        resultMessage =
          groups && groups.length > 0
            ? `Grupos encontrados: ${groups.map((g: any) => `${g.title} (${g.status})`).join(", ")}.`
            : `Nenhum grupo encontrado para '${validatedData.query}'.`;
      } else if (actionCode === "update_rooming") {
        const { error } = await supabase
          .from("group_tours")
          .update({
            seat_map: validatedData.roomingData,
          } as any)
          .eq("id", validatedData.groupId);

        if (error) throw error;
        entityId = validatedData.groupId;
        entityType = "group_tour";
        resultMessage = `Mapa de leitos da excursão atualizado com sucesso.`;
      } else if (actionCode === "generate_report") {
        const { count } = await supabase
          .from("trips")
          .select("id", { count: "exact" })
          .eq("agency_id", agencyId)
          .gte("travel_start", validatedData.startDate)
          .lte("travel_start", validatedData.endDate);

        entityId = crypto.randomUUID();
        entityType = "report";
        resultMessage = `Relatório concluído. Encontradas ${count || 0} viagens no período selecionado.`;
      } else if (actionCode === "create_visa") {
        const { data: visaStages } = await (supabase as any)
          .from("visa_stages")
          .select("id")
          .eq("agency_id", agencyId)
          .order("position")
          .limit(1);

        let stageId = visaStages && visaStages.length > 0 ? visaStages[0].id : null;
        if (!stageId) {
          await (supabase as any).rpc("seed_default_visa_stages", { p_agency_id: agencyId });
          const { data: reloadedStages } = await (supabase as any)
            .from("visa_stages")
            .select("id")
            .eq("agency_id", agencyId)
            .order("position")
            .limit(1);
          stageId = reloadedStages && reloadedStages.length > 0 ? reloadedStages[0].id : null;
        }

        if (!stageId) {
          throw new Error("Estágio de visto não configurado para esta agência.");
        }

        const { data: visa, error } = await (supabase as any)
          .from("visas")
          .insert({
            agency_id: agencyId,
            client_id: validatedData.clientId,
            stage_id: stageId,
            country: validatedData.country,
            category: validatedData.category,
            expected_date: validatedData.expectedDate || null,
            interview_date: validatedData.interviewDate || null,
            notes: validatedData.notes || "",
          })
          .select("id")
          .single();

        if (error) throw error;
        entityId = visa.id;
        entityType = "visa";
        resultMessage = `Processo de visto consular para ${validatedData.country} (${validatedData.category}) criado com sucesso.`;
      } else if (actionCode === "add_insurance") {
        const { data: existingVoucher } = await (supabase as any)
          .from("vouchers")
          .select("id, insurance")
          .eq("trip_id", validatedData.tripId)
          .is("deleted_at", null)
          .maybeSingle();

        const newInsurance = {
          provider: validatedData.provider,
          policy_number: validatedData.policyNumber,
          coverage_limit: validatedData.coverageLimit || "",
          notes: validatedData.notes || "",
        };

        if (existingVoucher) {
          const ins = Array.isArray(existingVoucher.insurance)
            ? [...existingVoucher.insurance, newInsurance]
            : [newInsurance];

          const { error } = await (supabase as any)
            .from("vouchers")
            .update({ insurance: ins })
            .eq("id", existingVoucher.id);
          if (error) throw error;
          entityId = existingVoucher.id;
        } else {
          const { data: newV, error } = await (supabase as any)
            .from("vouchers")
            .insert({
              agency_id: agencyId,
              trip_id: validatedData.tripId,
              insurance: [newInsurance],
              source_type: "manual",
            })
            .select("id")
            .single();
          if (error) throw error;
          entityId = newV.id;
        }
        entityType = "voucher";
        resultMessage = `Seguro viagem '${validatedData.provider}' (Apólice: ${validatedData.policyNumber}) adicionado ao voucher da viagem com sucesso.`;
      } else if (actionCode === "send_whatsapp_template") {
        const { data: client } = await supabase
          .from("clients")
          .select("full_name, phone")
          .eq("id", validatedData.clientId)
          .maybeSingle();

        const contactPhone = validatedData.phoneNumber.replace(/\D/g, "");

        // 1. Obter canal ativo
        const { data: activeChannel } = await supabase
          .from("channels")
          .select("id")
          .eq("agency_id", agencyId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        let targetChannelId = activeChannel?.id;

        if (!targetChannelId) {
          const { data: existingChannel } = await supabase
            .from("channels")
            .select("id")
            .eq("agency_id", agencyId)
            .limit(1)
            .maybeSingle();
          targetChannelId = existingChannel?.id;

          if (!targetChannelId) {
            const { data: newChan, error: chanErr } = await supabase
              .from("channels")
              .insert({
                agency_id: agencyId,
                type: "whatsapp",
                display_name: "WhatsApp CRM",
                external_id: "whatsapp-crm-default",
                is_active: true,
              })
              .select("id")
              .single();

            if (chanErr) throw chanErr;
            targetChannelId = newChan.id;
          }
        }

        // 2. Obter ou criar contato
        let { data: contact } = await supabase
          .from("contacts")
          .select("id")
          .eq("agency_id", agencyId)
          .like("phone", `%${contactPhone}%`)
          .maybeSingle();

        if (!contact) {
          const { data: newContact, error: contactErr } = await supabase
            .from("contacts")
            .insert({
              agency_id: agencyId,
              name: client?.full_name || "Cliente via WhatsApp",
              phone: contactPhone,
            })
            .select("id")
            .single();

          if (contactErr) throw contactErr;
          contact = newContact;
        }

        // 3. Obter ou criar conversa
        let { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("contact_id", contact!.id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv, error: convErr } = await supabase
            .from("conversations")
            .insert({
              agency_id: agencyId,
              channel_id: targetChannelId,
              contact_id: contact!.id,
              status: "open",
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (convErr) throw convErr;
          conv = newConv;
        }

        // 4. Mapear template text
        const templateTexts: Record<string, string> = {
          welcome: `Olá! Bem-vindo à Vibetour. Estamos felizes em ter você conosco!`,
          voucher_ready: `Olá! Seu voucher de viagem já está pronto e disponível na sua área do cliente. Boa viagem!`,
          payment_receipt: `Olá! Confirmamos o recebimento do seu pagamento. Obrigado pela preferência!`,
          contract_sign: `Olá! Seu contrato de viagem foi gerado. Por favor, acesse o link enviado para assinar digitalmente.`,
        };
        const contentText =
          templateTexts[validatedData.templateName] ||
          `Template [${validatedData.templateName}] disparado via WhatsApp.`;

        // 5. Gravar a mensagem
        const { data: message, error: mErr } = await supabase
          .from("messages")
          .insert({
            conversation_id: conv.id,
            agency_id: agencyId,
            direction: "outbound",
            body: contentText,
            status: "sent",
          })
          .select("id")
          .single();

        if (mErr) throw mErr;
        entityId = message.id;
        entityType = "message";
        resultMessage = `Template de WhatsApp '${validatedData.templateName}' disparado para o número ${validatedData.phoneNumber} com sucesso.`;
      } else if (actionCode === "apply_discount_or_fee") {
        const { data: proposal, error: getErr } = await supabase
          .from("proposals")
          .select("total, notes, title")
          .eq("id", validatedData.proposalId)
          .maybeSingle();

        if (getErr || !proposal) throw new Error("Proposta não encontrada.");

        const currentTotal = proposal.total || 0;
        let newTotal = currentTotal;
        let opText = "";

        if (validatedData.type === "discount") {
          newTotal = Math.max(0, currentTotal - validatedData.amount);
          opText = `Desconto de R$ ${validatedData.amount} aplicado.`;
        } else {
          newTotal = currentTotal + validatedData.amount;
          opText = `Taxa/Acréscimo de R$ ${validatedData.amount} aplicada.`;
        }

        const notesText = proposal.notes
          ? `${proposal.notes}\n[Ajuste: ${opText} - Total alterado de R$ ${currentTotal} para R$ ${newTotal}]`
          : `[Ajuste: ${opText} - Total alterado de R$ ${currentTotal} para R$ ${newTotal}]`;

        const { error: updErr } = await supabase
          .from("proposals")
          .update({
            total: newTotal,
            notes: notesText,
          } as any)
          .eq("id", validatedData.proposalId);

        if (updErr) throw updErr;

        entityId = validatedData.proposalId;
        entityType = "proposal";
        resultMessage = `${opText} Valor total da proposta '${proposal.title}' atualizado para R$ ${newTotal}.`;
      } else {
        // Fallback for custom actions
        entityId = crypto.randomUUID();
        entityType = action.domain;
        resultMessage = `Ação '${action.name}' executada com sucesso.`;
      }

      // 5. Commit audit log
      await supabase.from("audit_log").insert({
        agency_id: agencyId,
        actor_id: userId,
        actor_type: "user",
        action: actionCode,
        entity_type: entityType,
        entity_id: entityId,
        metadata: {
          payload: validatedData,
          result: "success",
          message: resultMessage,
        },
      });

      return { success: true, message: resultMessage, entityId };
    } catch (err: any) {
      // Commit failed audit log
      await supabase.from("audit_log").insert({
        agency_id: agencyId,
        actor_id: userId,
        actor_type: "user",
        action: actionCode,
        entity_type: entityType || "action",
        entity_id: entityId || null,
        metadata: {
          payload: validatedData,
          result: "failed",
          error: err.message,
        },
      });

      throw new Error(`Falha ao executar '${action.name}': ${err.message}`);
    }
  });
