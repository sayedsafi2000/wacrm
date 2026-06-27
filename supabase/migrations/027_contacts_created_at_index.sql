-- ============================================================
-- 027_contacts_created_at_index
--
-- The contacts list orders by created_at DESC and paginates. With no
-- index on created_at, Postgres had to evaluate the per-row RLS
-- function (is_account_member) across the whole table and then sort —
-- which, once an account holds hundreds of thousands of contacts
-- (bulk import), exceeded the statement timeout and the list failed to
-- load entirely.
--
-- A descending index on created_at lets the ordered, limited
-- pagination read straight from the index and stop early, keeping the
-- list fast regardless of table size. Paired with the switch from an
-- exact to an estimated count in the page query.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contacts_created_at
  ON contacts (created_at DESC);

-- Composite for the common path: a future explicit account_id filter on
-- the list query can seek straight to an account's newest rows.
CREATE INDEX IF NOT EXISTS idx_contacts_account_created_at
  ON contacts (account_id, created_at DESC);
