-- ──────────────────────────────────────────────────────────────
-- Melhorias no Boarding Cards:
-- tags: array de etiquetas (ex: ["Passaporte vencendo", "Visto pendente"])
-- notes: anotações livres do operador
-- internal_ref: referência interna (localizador interno, OS, etc.)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE boarding_cards
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS internal_ref TEXT;
