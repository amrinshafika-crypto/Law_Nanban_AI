-- Persist citizen conversations per authenticated account. Guest chats remain session-only.
CREATE TABLE IF NOT EXISTS public.citizen_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.citizen_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.citizen_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  role text NOT NULL CHECK (role IN ('user', 'model')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.citizen_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.citizen_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.citizen_messages TO authenticated;

DROP POLICY IF EXISTS citizen_conversations_owner ON public.citizen_conversations;
CREATE POLICY citizen_conversations_owner ON public.citizen_conversations
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS citizen_messages_owner ON public.citizen_messages;
CREATE POLICY citizen_messages_owner ON public.citizen_messages
  FOR ALL TO authenticated USING (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.citizen_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  ) WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.citizen_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_citizen_conversations_owner_updated
  ON public.citizen_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_citizen_messages_conversation_created
  ON public.citizen_messages(conversation_id, created_at);

CREATE OR REPLACE FUNCTION public.touch_citizen_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.citizen_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_citizen_message_touch_conversation ON public.citizen_messages;
CREATE TRIGGER trg_citizen_message_touch_conversation
  AFTER INSERT ON public.citizen_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_citizen_conversation();
