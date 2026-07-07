-- Migration to add unread_count to conversations and sync with message status

-- 1. Add column to public.conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0 NOT NULL;

-- 2. Create comments
COMMENT ON COLUMN public.conversations.unread_count IS 'Número de mensagens recebidas (inbound) não lidas na conversa';

-- 3. Trigger function to increment unread_count on new inbound message
CREATE OR REPLACE FUNCTION public.handle_new_message_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'inbound' AND (NEW.status IS NULL OR NEW.status != 'read') THEN
    UPDATE public.conversations
    SET unread_count = unread_count + 1
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on messages
DROP TRIGGER IF EXISTS on_message_inserted_unread_count ON public.messages;
CREATE TRIGGER on_message_inserted_unread_count
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_unread_count();

-- 5. Backfill existing unread counts
UPDATE public.conversations c
SET unread_count = (
  SELECT COALESCE(count(*), 0)
  FROM public.messages m
  WHERE m.conversation_id = c.id
    AND m.direction = 'inbound'
    AND m.status != 'read'
);
