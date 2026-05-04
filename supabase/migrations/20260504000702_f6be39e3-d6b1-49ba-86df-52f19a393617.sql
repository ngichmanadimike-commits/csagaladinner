ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'general';