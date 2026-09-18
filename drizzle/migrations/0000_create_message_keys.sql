CREATE TABLE public.message_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  counterpart_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('sent','received')),
  wrapped_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX message_keys_owner_message_uidx ON public.message_keys (owner_id, message_id);

GRANT SELECT, INSERT, DELETE ON public.message_keys TO authenticated;
GRANT ALL ON public.message_keys TO service_role;

ALTER TABLE public.message_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_keys owner select" ON public.message_keys
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "message_keys owner insert" ON public.message_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "message_keys owner delete" ON public.message_keys
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);