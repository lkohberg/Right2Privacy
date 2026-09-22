ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS read_receipts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS notify_detail text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS auto_delete_hours integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_theme_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_theme_check CHECK (theme IN ('dark','light','system'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_notify_detail_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_notify_detail_check CHECK (notify_detail IN ('full','minimal'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_auto_delete_hours_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_auto_delete_hours_check CHECK (auto_delete_hours >= 0 AND auto_delete_hours <= 8760);