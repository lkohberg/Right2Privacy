ALTER TABLE public.pending_keys
  ADD COLUMN dismissed_at timestamp with time zone;

GRANT UPDATE ON public.pending_keys TO authenticated;

CREATE POLICY "pending_keys recipient dismiss"
ON public.pending_keys
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

CREATE INDEX pending_keys_recipient_active_idx
ON public.pending_keys (recipient_id, created_at DESC)
WHERE dismissed_at IS NULL;