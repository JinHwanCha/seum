ALTER TABLE users
  ADD COLUMN IF NOT EXISTS requires_group_selection BOOLEAN NOT NULL DEFAULT false;
