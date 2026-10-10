ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_early_birth BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_early_birth IS
  '빠른 년생 여부. 실제 birth_date는 유지하고 또래 표시 연도만 1년 낮춘다.';
