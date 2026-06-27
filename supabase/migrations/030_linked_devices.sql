-- ============================================================
-- 030_linked_devices.sql
-- WhatsApp-style "Linked devices": track browsers + one-time link codes.
-- ============================================================

CREATE TABLE IF NOT EXISTS device_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_link_codes_code
  ON device_link_codes(code)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS linked_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL,
  device_label TEXT NOT NULL DEFAULT 'Browser',
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_key)
);

CREATE INDEX IF NOT EXISTS idx_linked_devices_user
  ON linked_devices(user_id, last_seen_at DESC);

ALTER TABLE linked_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS linked_devices_select ON linked_devices;
CREATE POLICY linked_devices_select ON linked_devices FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS linked_devices_insert ON linked_devices;
CREATE POLICY linked_devices_insert ON linked_devices FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS linked_devices_update ON linked_devices;
CREATE POLICY linked_devices_update ON linked_devices FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS linked_devices_delete ON linked_devices;
CREATE POLICY linked_devices_delete ON linked_devices FOR DELETE
  USING (user_id = auth.uid());

-- Link codes are server-only (service role); no client RLS policies.
