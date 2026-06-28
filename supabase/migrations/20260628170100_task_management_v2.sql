-- ============================================================
-- FASE 2 — BANCO DE DADOS: SISTEMA DE GESTÃO AVANÇADA DE TRABALHO
-- ============================================================

-- Rename old table to preserve data safely
ALTER TABLE IF EXISTS public.agent_tasks RENAME TO legacy_agent_tasks;

-- 1. SPACES — Áreas de trabalho dentro da organização
CREATE TABLE IF NOT EXISTS public.task_spaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT,                    -- hex color para identificação visual
  icon            TEXT,                    -- nome do ícone (lucide ou similar)
  description     TEXT,
  position        FLOAT8 DEFAULT 0,        -- ordenação
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted      BOOL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROJECTS — Projetos dentro de um space
CREATE TABLE IF NOT EXISTS public.task_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  space_id        UUID NOT NULL REFERENCES public.task_spaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT,
  icon            TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  source_module   TEXT,                    -- null para manual, ou 'embarques'/'suportes' para auto
  position        FLOAT8 DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted      BOOL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TASKS — Tabela principal (núcleo do sistema)
CREATE TABLE IF NOT EXISTS public.tasks (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id               UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  space_id                UUID REFERENCES public.task_spaces(id) ON DELETE SET NULL,
  project_id              UUID REFERENCES public.task_projects(id) ON DELETE SET NULL,
  parent_task_id          UUID REFERENCES public.tasks(id) ON DELETE CASCADE, -- para subtasks
  
  -- Conteúdo
  title                   TEXT NOT NULL,
  description             JSONB,           -- rich text (tiptap/prosemirror JSON format)
  
  -- Status e prioridade
  status                  TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'waiting', 'done', 'cancelled')),
  priority                TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  
  -- Pessoas
  assigned_to             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Datas e tempo
  due_date                DATE,
  due_time                TIME,
  start_date              DATE,
  estimated_minutes       INT DEFAULT 0,
  actual_minutes          INT DEFAULT 0,   -- calculado de time_entries via trigger
  resolved_at             TIMESTAMPTZ,
  
  -- Source (origem da task)
  source_type             TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'embarque', 'suporte', 'agenda', 'crm', 'system', 'trip', 'ticket', 'lead')),
  source_id               UUID,            -- ID do registro de origem (embarque_id, etc.)
  source_url              TEXT,            -- deep link ex: /embarques/uuid
  source_metadata         JSONB,           -- dados extras da origem
  
  -- Recorrência
  is_recurring            BOOL DEFAULT false,
  recurrence_rule         JSONB,
  recurrence_parent_id    UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  
  -- Ordenação e agrupamento
  position                FLOAT8 DEFAULT 0, -- posição no Kanban ou lista
  difficulty_score        INT NOT NULL DEFAULT 1 CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
  
  -- IA e análise
  ai_suggested_priority   TEXT,
  ai_suggested_due_date   DATE,
  ai_complexity_score     FLOAT DEFAULT 0, -- 0.0 a 1.0
  ai_completion_pred      FLOAT,           -- probabilidade de conclusão no prazo
  ai_last_analyzed_at     TIMESTAMPTZ,
  
  -- Soft delete
  is_deleted              BOOL DEFAULT false,
  deleted_at              TIMESTAMPTZ,
  
  -- Audit
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrar dados antigos para a nova estrutura de tasks
INSERT INTO public.tasks (id, agency_id, assigned_to, created_by, title, description, status, source_type, source_id, difficulty_score, due_date, resolved_at, created_at, updated_at)
SELECT 
    id, 
    agency_id, 
    agent_id, 
    agent_id,
    title, 
    to_jsonb(description), 
    status, 
    type, 
    reference_id, 
    difficulty_score, 
    due_date, 
    resolved_at, 
    created_at, 
    updated_at
FROM public.legacy_agent_tasks;

-- Índices críticos para performance
CREATE INDEX IF NOT EXISTS idx_tasks_agency_id         ON public.tasks(agency_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to       ON public.tasks(assigned_to) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date          ON public.tasks(due_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_status            ON public.tasks(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_source            ON public.tasks(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent            ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project           ON public.tasks(project_id) WHERE is_deleted = false;

-- 4. TASK_CHECKLIST_ITEMS — Itens de checklist dentro de uma task
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  is_done     BOOL DEFAULT false,
  done_at     TIMESTAMPTZ,
  done_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  position    FLOAT8 DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TASK_TIME_ENTRIES — Registros de tempo por task
CREATE TABLE IF NOT EXISTS public.task_time_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  agency_id     UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ,              -- NULL = timer ativo
  duration_min  INT,                      -- calculado ao parar o timer
  description   TEXT,
  is_manual     BOOL DEFAULT false,       -- lançado manualmente ou via timer
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TASK_COMMENTS — Comentários (threadados)
CREATE TABLE IF NOT EXISTS public.task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES public.task_comments(id) ON DELETE CASCADE, -- para replies
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         JSONB NOT NULL,         -- rich text
  is_edited       BOOL DEFAULT false,
  edited_at       TIMESTAMPTZ,
  is_deleted      BOOL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TASK_DEPENDENCIES — Relações de dependência entre tasks
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,    -- task que depende
  depends_on_id   UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,    -- task bloqueadora
  dep_type        TEXT DEFAULT 'blocks' CHECK (dep_type IN ('blocks', 'related', 'duplicates')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, depends_on_id)
);

-- 8. TASK_LABELS — Labels customizáveis por organização
CREATE TABLE IF NOT EXISTS public.task_labels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,             -- hex color
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TASK_LABEL_ASSIGNMENTS — N:N entre tasks e labels
CREATE TABLE IF NOT EXISTS public.task_label_assignments (
  task_id   UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id  UUID NOT NULL REFERENCES public.task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- 10. TASK_WATCHERS — Usuários que acompanham uma task
CREATE TABLE IF NOT EXISTS public.task_watchers (
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- 11. TASK_ACTIVITY_LOG — Histórico completo de ações
CREATE TABLE IF NOT EXISTS public.task_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_task ON public.task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_org  ON public.task_activity_log(agency_id, created_at DESC);

-- 12. USER_TASK_PREFERENCES — Preferências de view por usuário
CREATE TABLE IF NOT EXISTS public.user_task_preferences (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  active_view     TEXT DEFAULT 'my-day',
  kanban_filters  JSONB DEFAULT '{}',
  list_columns    JSONB DEFAULT '[]',    -- quais colunas e ordem
  list_sort       JSONB DEFAULT '{}',
  calendar_view   TEXT DEFAULT 'month',  -- month | week | day
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, agency_id)
);

-- 13. AGENT_PRODUCTIVITY_SCORES — Score calculado periodicamente
CREATE TABLE IF NOT EXISTS public.agent_productivity_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id           UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_date         DATE NOT NULL,       -- dia a que o score se refere
  period_type         TEXT NOT NULL,       -- daily | weekly | monthly
  
  -- Scores (0.0 a 1.0)
  score_total         FLOAT DEFAULT 0,
  score_volume        FLOAT DEFAULT 0,
  score_quality       FLOAT DEFAULT 0,
  score_complexity    FLOAT DEFAULT 0,
  score_response      FLOAT DEFAULT 0,
  score_consistency   FLOAT DEFAULT 0,
  
  -- Métricas brutas
  tasks_created       INT DEFAULT 0,
  tasks_completed     INT DEFAULT 0,
  tasks_overdue       INT DEFAULT 0,
  tasks_on_time       INT DEFAULT 0,
  avg_completion_h    FLOAT DEFAULT 0,
  estimated_h         FLOAT DEFAULT 0,
  actual_h            FLOAT DEFAULT 0,
  
  -- IA
  ai_strengths        JSONB DEFAULT '[]',
  ai_improvement      JSONB DEFAULT '[]',
  ai_trend            TEXT,               -- improving | stable | declining
  ai_burnout_risk     FLOAT DEFAULT 0,    -- 0.0 a 1.0
  ai_recommendations  JSONB DEFAULT '[]',
  
  -- Audit
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_date, period_type)
);
CREATE INDEX IF NOT EXISTS idx_prod_scores_org_date ON public.agent_productivity_scores(agency_id, period_date DESC);


-- ============================================================
-- RLS POLICIES E SEGURANÇA ABSOLUTA
-- ============================================================

-- TASKS SPACES
ALTER TABLE public.task_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_spaces_select" ON public.task_spaces FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id) AND is_deleted = false);
CREATE POLICY "task_spaces_insert" ON public.task_spaces FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "task_spaces_update" ON public.task_spaces FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "task_spaces_delete" ON public.task_spaces FOR DELETE USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- TASKS PROJECTS
ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_projects_select" ON public.task_projects FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id) AND is_deleted = false);
CREATE POLICY "task_projects_insert" ON public.task_projects FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "task_projects_update" ON public.task_projects FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "task_projects_delete" ON public.task_projects FOR DELETE USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (
  public.is_agency_member(auth.uid(), agency_id) AND is_deleted = false AND (
    public.has_role(auth.uid(), 'agency_admin', agency_id) OR
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM public.task_watchers WHERE task_id = tasks.id AND user_id = auth.uid())
  )
);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (
  public.is_agency_member(auth.uid(), agency_id) AND (
    public.has_role(auth.uid(), 'agency_admin', agency_id) OR
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  )
);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- Triggers to handle updated_at and resolved_at for tasks
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_new_task_resolved_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.resolved_at = now();
  ELSIF NEW.status != 'done' THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_new_tasks_resolved BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_new_task_resolved_at();

-- TASK CHECKLIST ITEMS
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_select" ON public.task_checklist_items FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "checklist_insert" ON public.task_checklist_items FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "checklist_update" ON public.task_checklist_items FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "checklist_delete" ON public.task_checklist_items FOR DELETE USING (public.is_agency_member(auth.uid(), agency_id));
CREATE TRIGGER set_checklist_updated_at BEFORE UPDATE ON public.task_checklist_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TASK TIME ENTRIES
ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_entries_select" ON public.task_time_entries FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "time_entries_insert" ON public.task_time_entries FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "time_entries_update" ON public.task_time_entries FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "time_entries_delete" ON public.task_time_entries FOR DELETE USING (public.is_agency_member(auth.uid(), agency_id));
CREATE TRIGGER set_time_entries_updated_at BEFORE UPDATE ON public.task_time_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TASK COMMENTS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON public.task_comments FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id) AND is_deleted = false);
CREATE POLICY "comments_insert" ON public.task_comments FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "comments_update" ON public.task_comments FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id) AND user_id = auth.uid());
CREATE POLICY "comments_delete" ON public.task_comments FOR DELETE USING (public.is_agency_member(auth.uid(), agency_id) AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'agency_admin', agency_id)));
CREATE TRIGGER set_comments_updated_at BEFORE UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TASK DEPENDENCIES
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dependencies_select" ON public.task_dependencies FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "dependencies_insert" ON public.task_dependencies FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "dependencies_delete" ON public.task_dependencies FOR DELETE USING (public.is_agency_member(auth.uid(), agency_id));

-- TASK LABELS
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "labels_select" ON public.task_labels FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "labels_insert" ON public.task_labels FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "labels_update" ON public.task_labels FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "labels_delete" ON public.task_labels FOR DELETE USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- TASK WATCHERS
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchers_select" ON public.task_watchers FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND public.is_agency_member(auth.uid(), agency_id)));
CREATE POLICY "watchers_insert" ON public.task_watchers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND public.is_agency_member(auth.uid(), agency_id)));
CREATE POLICY "watchers_delete" ON public.task_watchers FOR DELETE USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND public.is_agency_member(auth.uid(), agency_id)));

-- USER TASK PREFERENCES
ALTER TABLE public.user_task_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_select" ON public.user_task_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "prefs_insert" ON public.user_task_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "prefs_update" ON public.user_task_preferences FOR UPDATE USING (user_id = auth.uid());
CREATE TRIGGER set_prefs_updated_at BEFORE UPDATE ON public.user_task_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AGENT PRODUCTIVITY SCORES
ALTER TABLE public.agent_productivity_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores_select" ON public.agent_productivity_scores FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id) AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'agency_admin', agency_id)));


-- ============================================================
-- 2.3 — FUNÇÕES SQL
-- ============================================================

-- 1. Calcular progresso de uma task (0.0 a 1.0)
CREATE OR REPLACE FUNCTION public.calculate_task_progress(p_task_id UUID)
RETURNS FLOAT AS $$
DECLARE
  v_checklist_total INT;
  v_checklist_done  INT;
  v_subtask_total   INT;
  v_subtask_done    INT;
  v_progress        FLOAT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_done = true)
  INTO v_checklist_total, v_checklist_done
  FROM public.task_checklist_items WHERE task_id = p_task_id;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
  INTO v_subtask_total, v_subtask_done
  FROM public.tasks WHERE parent_task_id = p_task_id AND is_deleted = false;

  v_progress := 0;
  IF v_checklist_total > 0 THEN
    v_progress := v_progress + (v_checklist_done::FLOAT / v_checklist_total) * 0.5;
  END IF;
  IF v_subtask_total > 0 THEN
    v_progress := v_progress + (v_subtask_done::FLOAT / v_subtask_total) * 0.5;
  END IF;
  IF v_checklist_total = 0 AND v_subtask_total = 0 THEN
    RETURN CASE WHEN (SELECT status FROM public.tasks WHERE id = p_task_id) = 'done' THEN 1.0 ELSE 0.0 END;
  END IF;

  RETURN LEAST(v_progress, 1.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Digest diário do usuário
CREATE OR REPLACE FUNCTION public.get_daily_digest(
  p_user_id   UUID,
  p_agency_id UUID,
  p_date      DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'tasks_today', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.due_time NULLS LAST, t.priority), '[]'::jsonb)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.due_date = p_date
        AND t.is_deleted = false
        AND t.status != 'done'
    ),
    'overdue_tasks', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.due_date), '[]'::jsonb)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.due_date < p_date
        AND t.is_deleted = false
        AND t.status NOT IN ('done', 'cancelled')
    ),
    'upcoming_deadlines', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.due_date), '[]'::jsonb)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.due_date BETWEEN p_date + 1 AND p_date + 3
        AND t.is_deleted = false
        AND t.status NOT IN ('done', 'cancelled')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
