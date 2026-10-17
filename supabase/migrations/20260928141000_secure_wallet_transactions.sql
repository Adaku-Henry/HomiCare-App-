-- Wallet records are private financial data. Deposits, payouts, and ledger
-- entries must be created by trusted payment services, never directly by a client.
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "public_read_wallet" ON wallet_transactions;
DROP POLICY IF EXISTS "auth_insert_wallet" ON wallet_transactions;

CREATE POLICY "wallet_owner_or_provider_read" ON wallet_transactions
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = wallet_transactions.provider_id
        AND providers.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_owner ON wallet_transactions(owner_id);