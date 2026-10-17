import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const flutterwaveSecret = Deno.env.get('FLW_SECRET_KEY')!;

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function createUserSupabase(request: Request) {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: request.headers.get('Authorization') || '' } },
  });
}

export async function getAuthenticatedUser(request: Request) {
  const token = request.headers.get('Authorization');
  if (!token) return { client: createUserSupabase(request), user: null };
  const client = createUserSupabase(request);
  const { data, error } = await client.auth.getUser();
  return { client, user: error ? null : data.user };
}

interface PaymentAttempt {
  id: string;
  booking_id: string | null;
  customer_id: string;
  payment_kind: 'booking' | 'wallet_topup';
  tx_ref: string;
  gateway_transaction_id: string | null;
  payment_method: 'mtn_mobile_money' | 'airtel_money' | 'visa';
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed' | 'cancelled';
}

interface FlutterwaveTransaction {
  id: string | number;
  tx_ref: string;
  status: string;
  amount: number | string;
  currency: string;
  payment_type?: string;
}

export async function verifyAndFinalizePayment(txRef: string, transactionId: string | number) {
  const { data: attempt, error: attemptError } = await adminSupabase
    .from('payment_attempts')
    .select('*')
    .eq('tx_ref', txRef)
    .maybeSingle();
  if (attemptError || !attempt) throw new Error('Payment attempt was not found.');
  const paymentAttempt = attempt as PaymentAttempt;

  const { data: booking, error: bookingError } = paymentAttempt.payment_kind === 'booking' && paymentAttempt.booking_id
    ? await adminSupabase.from('bookings').select('id, booking_code, final_price, payment_status').eq('id', paymentAttempt.booking_id).maybeSingle()
    : { data: null, error: null };
  if (paymentAttempt.payment_kind === 'booking' && (bookingError || !booking)) throw new Error('The booking for this payment could not be found.');
  if (paymentAttempt.status === 'successful') {
    if (paymentAttempt.gateway_transaction_id !== String(transactionId)) {
      throw new Error('This payment reference belongs to a different gateway transaction.');
    }
    return { status: 'successful', payment_kind: paymentAttempt.payment_kind, booking_code: booking?.booking_code || null };
  }

  const verifyResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId))}/verify`, {
    headers: { Authorization: `Bearer ${flutterwaveSecret}`, 'Content-Type': 'application/json' },
  });
  const verification = await verifyResponse.json();
  const transaction = verification?.data as FlutterwaveTransaction | undefined;
  if (!verifyResponse.ok || !transaction) throw new Error('Flutterwave could not verify this transaction.');

  const exactAmount = Number(transaction.amount) === Number(paymentAttempt.amount)
    && (paymentAttempt.payment_kind === 'wallet_topup' || Number(booking?.final_price) === Number(paymentAttempt.amount));
  if (transaction.tx_ref !== paymentAttempt.tx_ref
    || String(transaction.id) !== String(transactionId)
    || transaction.currency?.toUpperCase() !== paymentAttempt.currency
    || !exactAmount) {
    throw new Error('The transaction details do not match this payment.');
  }
  if (transaction.status === 'failed' || transaction.status === 'cancelled') {
    await adminSupabase.from('payment_attempts').update({ status: transaction.status, updated_at: new Date().toISOString() }).eq('id', paymentAttempt.id);
    return { status: transaction.status, payment_kind: paymentAttempt.payment_kind, booking_code: booking?.booking_code || null };
  }
  if (transaction.status !== 'successful') {
    return { status: 'pending', payment_kind: paymentAttempt.payment_kind, booking_code: booking?.booking_code || null };
  }

  const { data: result, error: finalizeError } = await adminSupabase.rpc('confirm_flutterwave_payment', {
    p_attempt_id: paymentAttempt.id,
    p_gateway_transaction_id: String(transaction.id),
  });
  if (finalizeError) throw new Error(finalizeError.message);
  return result as { status: string; payment_kind: string; booking_code: string | null };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
