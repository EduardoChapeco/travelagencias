import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:EEaR6399!%40%232026@db.esmppoxxnyiscidzsjvy.supabase.co:6543/postgres';

const queries = [
  // PARTE 1: Limpeza de policies redundantes em leads
  `DROP POLICY IF EXISTS "Agency members can view leads" ON public.leads`,
  `DROP POLICY IF EXISTS "Leads are viewable by agency members" ON public.leads`,
  `DROP POLICY IF EXISTS "Agency members can insert leads" ON public.leads`,
  `DROP POLICY IF EXISTS "Leads are insertable by agency members" ON public.leads`,
  `DROP POLICY IF EXISTS "Agency members can update leads" ON public.leads`,
  `DROP POLICY IF EXISTS "Leads are updatable by agency members" ON public.leads`,
  `DROP POLICY IF EXISTS "Agency members can delete leads" ON public.leads`,
  `DROP POLICY IF EXISTS "Leads are deletable by agency members" ON public.leads`,

  // PARTE 2: search_path em funções SECURITY DEFINER
  `ALTER FUNCTION public.append_contract_audit(_contract_id uuid, _action text, _description text, _user_id uuid) SET search_path = public`,
  `ALTER FUNCTION public.calculate_cash_summary(_agency_id uuid, _filter text) SET search_path = public`,
  `ALTER FUNCTION public.calculate_dre_summary(_agency_id uuid, _period text) SET search_path = public`,
  `ALTER FUNCTION public.calculate_task_progress(p_task_id uuid) SET search_path = public`,
  `ALTER FUNCTION public.check_agency_trip_limit() SET search_path = public`,
  `ALTER FUNCTION public.enroll_public_tour(_agency_id uuid, _tour_id uuid, _passenger_name text, _passenger_cpf text, _email text, _phone text, _notes text, _source text, _selected_seats text[], _unit_price numeric, _pax_count integer, _destination text, _receipt_url text) SET search_path = public`,
  `ALTER FUNCTION public.get_lead_id_for_whatsapp(_agency_id uuid, _trip_id uuid, _client_id uuid) SET search_path = public`,
  `ALTER FUNCTION public.handle_flight_itinerary_sync() SET search_path = public`,
  `ALTER FUNCTION public.handle_flight_segment_sync() SET search_path = public`,
  `ALTER FUNCTION public.handle_new_message_unread_count() SET search_path = public`,
  `ALTER FUNCTION public.log_financial_changes() SET search_path = public`,
  `ALTER FUNCTION public.match_knowledge_embeddings(query_embedding vector, match_threshold double precision, match_count integer, p_agency_id uuid, p_category text) SET search_path = public`,
  `ALTER FUNCTION public.prevent_active_flight_deletion() SET search_path = public`,
  `ALTER FUNCTION public.promote_lead_to_client_v2(_lead_id uuid, _client_payload jsonb) SET search_path = public`,
  `ALTER FUNCTION public.propagate_passenger_document_metadata() SET search_path = public`,
  `ALTER FUNCTION public.public_lead_by_id(_lead_id uuid) SET search_path = public`,
  `ALTER FUNCTION public.public_save_lead(_lead_id uuid, _payload jsonb) SET search_path = public`,
  `ALTER FUNCTION public.save_infotravel_booking_normalized(p_agency_id uuid, p_normalized jsonb, p_override_trip_id uuid) SET search_path = public`,
  `ALTER FUNCTION public.save_infotravel_booking_normalized(p_agency_id uuid, p_normalized jsonb) SET search_path = public`,
  `ALTER FUNCTION public.sign_contract_with_token(_token text, _signer_name text, _signer_document text, _signature_image text, _selfie_image text, _ip text, _user_agent text, _pdf_path text, _signed_hash text, _doc_front text, _doc_back text, _video_kyc text) SET search_path = public`,
  `ALTER FUNCTION public.submit_public_lead(_agency_slug text, _name text, _email text, _phone text, _destination text, _travel_start date, _travel_end date, _pax_count integer, _estimated_value numeric, _source text, _notes text, _tags text[]) SET search_path = public`,
  `ALTER FUNCTION public.sync_cash_transaction_delete_to_ledger() SET search_path = public`,
  `ALTER FUNCTION public.sync_cash_transaction_to_ledger() SET search_path = public`,
  `ALTER FUNCTION public.sync_financial_record_delete_to_ledger() SET search_path = public`,
  `ALTER FUNCTION public.sync_financial_record_to_ledger() SET search_path = public`,
  `ALTER FUNCTION public.trigger_addendum_created_whatsapp() SET search_path = public`,
  `ALTER FUNCTION public.trigger_ai_message_processor() SET search_path = public`,
  `ALTER FUNCTION public.trigger_contract_signed_whatsapp() SET search_path = public`,
  `ALTER FUNCTION public.trigger_meta_capi_sync() SET search_path = public`,
  `ALTER FUNCTION public.trigger_passport_expiry_whatsapp() SET search_path = public`,
  `ALTER FUNCTION public.trigger_whatsapp_sender() SET search_path = public`,
];

const VERIFY_QUERIES = {
  leads_policies: `SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='leads' ORDER BY cmd, policyname`,
  vulnerable_functions: `SELECT COUNT(*) AS vulnerable_count FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND prosecdef = true AND (proconfig IS NULL OR NOT (array_to_string(proconfig, ',') LIKE '%search_path%'))`,
};

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✅ Conexão estabelecida.\n');

    let errors = 0;
    for (const q of queries) {
      try {
        await client.query(q);
        const label = q.slice(0, 80).replace(/\n/g, ' ');
        console.log(`  ✅ OK: ${label}...`);
      } catch (err) {
        console.error(`  ❌ ERRO: ${q.slice(0, 80)}\n     → ${err.message}`);
        errors++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Execução concluída. Erros: ${errors}\n`);

    console.log('📋 VERIFICAÇÃO PÓS-MIGRATION:\n');
    const policiesResult = await client.query(VERIFY_QUERIES.leads_policies);
    console.log('Policies restantes em leads:');
    console.table(policiesResult.rows);

    const vulnResult = await client.query(VERIFY_QUERIES.vulnerable_functions);
    console.log(`\nFunções SECURITY DEFINER sem search_path: ${vulnResult.rows[0].vulnerable_count}`);
    if (Number(vulnResult.rows[0].vulnerable_count) === 0) {
      console.log('✅ ZERO funções vulneráveis. Segurança confirmada.');
    } else {
      console.log('⚠️  Ainda há funções vulneráveis. Investigar manualmente.');
    }

  } catch (err) {
    console.error('Erro fatal de conexão:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
