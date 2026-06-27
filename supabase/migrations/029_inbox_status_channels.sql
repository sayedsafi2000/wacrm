-- ============================================================
-- 029_inbox_status_channels.sql
--
-- WhatsApp-style Status (stories) and Channels directory for the
-- inbox. Meta Cloud API does not expose Status/Channels programmatically;
-- these tables let the team compose, track, and link out to WhatsApp.
-- Status rows expire after 24 hours (enforced in queries + optional cron).
-- ============================================================

CREATE TABLE IF NOT EXISTS status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video')),
  content_text TEXT,
  media_url TEXT,
  background_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_status_updates_account_expires
  ON status_updates(account_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  invite_link TEXT,
  follower_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_account
  ON whatsapp_channels(account_id, is_active, created_at DESC);

-- RLS
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS status_updates_select ON status_updates;
CREATE POLICY status_updates_select ON status_updates FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS status_updates_insert ON status_updates;
CREATE POLICY status_updates_insert ON status_updates FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') AND author_id = auth.uid());

DROP POLICY IF EXISTS status_updates_delete ON status_updates;
CREATE POLICY status_updates_delete ON status_updates FOR DELETE
  USING (is_account_member(account_id, 'agent') AND author_id = auth.uid());

DROP POLICY IF EXISTS whatsapp_channels_select ON whatsapp_channels;
CREATE POLICY whatsapp_channels_select ON whatsapp_channels FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS whatsapp_channels_insert ON whatsapp_channels;
CREATE POLICY whatsapp_channels_insert ON whatsapp_channels FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS whatsapp_channels_update ON whatsapp_channels;
CREATE POLICY whatsapp_channels_update ON whatsapp_channels FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS whatsapp_channels_delete ON whatsapp_channels;
CREATE POLICY whatsapp_channels_delete ON whatsapp_channels FOR DELETE
  USING (is_account_member(account_id, 'admin'));
