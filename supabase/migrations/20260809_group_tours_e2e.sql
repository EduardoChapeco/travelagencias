-- Migration: Integração de Grupos com Contratos e Parcelas (E2E)

-- 1. contracts: Permitir que trip_id seja nulo (para contratos de grupos)
ALTER TABLE public.contracts ALTER COLUMN trip_id DROP NOT NULL;

-- 2. contracts: Adicionar relacionamento com a matrícula do grupo (group_tour_enrollments)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS group_enrollment_id UUID REFERENCES public.group_tour_enrollments(id) ON DELETE CASCADE;

-- 3. payment_plans: Adicionar relacionamento com a matrícula do grupo (trip_id já é anulável na tabela payment_plans)
ALTER TABLE public.payment_plans ADD COLUMN IF NOT EXISTS group_enrollment_id UUID REFERENCES public.group_tour_enrollments(id) ON DELETE CASCADE;

-- Comentários / Metadados para Documentação
COMMENT ON COLUMN public.contracts.group_enrollment_id IS 'Referência para a matrícula do grupo, quando o contrato for gerado a partir de uma excursão em grupo (substitui o trip_id).';
COMMENT ON COLUMN public.payment_plans.group_enrollment_id IS 'Referência para a matrícula do grupo, permitindo gerar parcelas para grupos no módulo financeiro.';
