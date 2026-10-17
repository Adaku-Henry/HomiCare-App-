# Payments

HomiCare uses Flutterwave-hosted checkout for booking payments. The app never collects mobile-money PINs or card security codes. The checkout and mobile operator handle approval, and HomiCare records a payment only after the server verifies the transaction reference, exact UGX amount, and currency.

## Supported methods

- MTN Mobile Money and Airtel Money use Flutterwave's Uganda mobile-money checkout. The customer chooses the operator and approves the prompt in the provider flow.
- Visa uses Flutterwave card checkout and any bank authentication it requests.
- Google Pay is shown as unavailable because Flutterwave's documented UGX methods are card and Uganda mobile money; Google Pay is not listed for Uganda. Do not enable it until Flutterwave confirms it for this merchant account.

## Configure and deploy

1. Apply the database migration from the project folder:

   ```powershell
   npx supabase db push
   ```

2. Create `supabase/functions/.env` locally with the Flutterwave **test** secret, a random webhook hash, and the deployed HomiCare HTTPS URL:

   ```dotenv
   FLW_SECRET_KEY=FLWSECK_TEST-your-test-secret
   FLW_WEBHOOK_HASH=replace-with-a-long-random-value
   APP_URL=https://your-homicare-domain.example
   ```

   Keep this file private. Never send keys through chat or commit them.

3. Upload the secrets to the linked Supabase project:

   ```powershell
   npx supabase secrets set --env-file supabase/functions/.env
   ```

4. Deploy the Edge Functions:

   ```powershell
   npx supabase functions deploy flutterwave-initialize
   npx supabase functions deploy flutterwave-verify
   npx supabase functions deploy flutterwave-webhook
   ```

5. In Flutterwave Dashboard, enable Uganda card and mobile-money methods. Add this webhook URL and use the same webhook hash:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/flutterwave-webhook
   ```

6. Test with Flutterwave test mode first. Switch to live keys only after successful MTN/Airtel approval, Visa verification, callback, webhook, and wallet-ledger checks.

The payment return URL must be reachable by the phone. `localhost` works only on the development computer, not on an installed phone. Use the public HTTPS app URL or an HTTPS development tunnel while testing.
