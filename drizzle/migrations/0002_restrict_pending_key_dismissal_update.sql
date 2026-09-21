REVOKE UPDATE ON public.pending_keys FROM authenticated;
GRANT UPDATE (dismissed_at) ON public.pending_keys TO authenticated;