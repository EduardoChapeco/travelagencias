-- Migration: get_daily_digest RPC
-- Criada em: 2026-06-28
-- Descrição: Função que retorna o digest diário de um usuário para o módulo "Meu Dia"
-- Tabelas envolvidas: tasks, lead_meetings, boarding_tickets, profiles

CREATE OR REPLACE FUNCTION public.get_daily_digest(
  p_user_id UUID,
  p_agency_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := p_date::TIMESTAMPTZ;
  v_today_end   TIMESTAMPTZ := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  v_result      JSONB;
BEGIN

  SELECT jsonb_build_object(
    'date', p_date,

    -- Tarefas com prazo para hoje (atribuídas ao usuário)
    'tasks_today', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'status', t.status,
        'priority', t.priority,
        'due_date', t.due_date,
        'due_time', t.due_time,
        'position', t.position
      ) ORDER BY t.position ASC)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND t.is_deleted = false
        AND t.due_date = p_date
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.status NOT IN ('done', 'cancelled')
    ), '[]'::jsonb),

    -- Tarefas atrasadas (prazo anterior a hoje, ainda abertas)
    'overdue_tasks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'status', t.status,
        'priority', t.priority,
        'due_date', t.due_date,
        'position', t.position
      ) ORDER BY t.due_date ASC)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND t.is_deleted = false
        AND t.due_date < p_date
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.status NOT IN ('done', 'cancelled')
    ), '[]'::jsonb),

    -- Prazos nos próximos 3 dias
    'upcoming_deadlines', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'due_date', t.due_date,
        'priority', t.priority
      ) ORDER BY t.due_date ASC)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND t.is_deleted = false
        AND t.due_date > p_date
        AND t.due_date <= (p_date + INTERVAL '3 days')
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.status NOT IN ('done', 'cancelled')
    ), '[]'::jsonb),

    -- Reuniões/eventos de agenda para hoje
    'agenda_events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', lm.id,
        'title', COALESCE(lm.title, 'Reunião'),
        'start_time', lm.scheduled_at,
        'end_time', lm.scheduled_at + (lm.duration_minutes * INTERVAL '1 minute'),
        'meeting_type', lm.meeting_type,
        'participants_count', 1,
        'is_video_call', lm.meeting_type = 'video'
      ) ORDER BY lm.scheduled_at ASC)
      FROM public.lead_meetings lm
      WHERE lm.agency_id = p_agency_id
        AND DATE(lm.scheduled_at) = p_date
    ), '[]'::jsonb),

    -- Embarques para hoje (voos confirmados)
    'embarques_today', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', bt.id,
        'passenger_name', bt.passenger_name,
        'route', bt.venue,
        'flight_code', bt.ticket_code,
        'departure_time', bt.date_time,
        'status', bt.status,
        'has_special_requests', false,
        'alerts', '[]'::jsonb
      ) ORDER BY bt.date_time ASC)
      FROM public.boarding_tickets bt
      WHERE bt.agency_id = p_agency_id
        AND DATE(bt.date_time) = p_date
        AND bt.kind = 'flight'
        AND bt.status IN ('confirmed', 'checked_in')
    ), '[]'::jsonb),

    -- Tarefas concluídas hoje
    'completed_today', (
      SELECT COUNT(*)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND t.is_deleted = false
        AND t.status = 'done'
        AND DATE(t.resolved_at) = p_date
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Permissões: usuários autenticados podem chamar via PostgREST
GRANT EXECUTE ON FUNCTION public.get_daily_digest(UUID, UUID, DATE) TO authenticated;

COMMENT ON FUNCTION public.get_daily_digest IS
  'Retorna o digest diário de um usuário: tarefas do dia, tarefas atrasadas, reuniões de agenda e embarques.';
