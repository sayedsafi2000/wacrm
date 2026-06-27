-- ============================================================
-- 028_message_delete
--
-- WhatsApp-style message deletion for the shared inbox:
--   • deleted_at on messages  → "Delete for everyone" (all agents
--     see "This message was deleted")
--   • message_user_hides      → "Delete for me" (per-agent hide)
-- ============================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_deleted_at
  ON messages (conversation_id)
  WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS message_user_hides (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_user_hides_user
  ON message_user_hides (user_id);

ALTER TABLE message_user_hides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_user_hides_select ON message_user_hides;
DROP POLICY IF EXISTS message_user_hides_insert ON message_user_hides;
DROP POLICY IF EXISTS message_user_hides_delete ON message_user_hides;

CREATE POLICY message_user_hides_select ON message_user_hides
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY message_user_hides_insert ON message_user_hides
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      -- Qualify: messages also has a TEXT column named message_id (Meta wamid).
      WHERE m.id = message_user_hides.message_id
        AND is_account_member(c.account_id, 'agent')
    )
  );

CREATE POLICY message_user_hides_delete ON message_user_hides
  FOR DELETE USING (user_id = auth.uid());
