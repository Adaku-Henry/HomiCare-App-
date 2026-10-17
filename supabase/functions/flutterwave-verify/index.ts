import { adminSupabase, corsHeaders, getAuthenticatedUser, jsonResponse, verifyAndFinalizePayment } from '../_shared/flutterwave.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Use POST to verify a payment.' }, 405);

  try {
    const { client, user } = await getAuthenticatedUser(request);
    if (!user) return jsonResponse({ error: 'Sign in to verify this booking payment.' }, 401);

    const body = await request.json();
    const paymentKind = body.payment_kind === 'wallet_topup' ? 'wallet_topup' : 'booking';
    const bookingCode = typeof body.booking_code === 'string' ? body.booking_code.trim() : '';
    const txRef = typeof body.tx_ref === 'string' ? body.tx_ref.trim() : '';
    const transactionId = typeof body.transaction_id === 'string' || typeof body.transaction_id === 'number'
      ? String(body.transaction_id)
      : '';
    if ((paymentKind === 'booking' && !bookingCode) || !txRef || !/^\d+$/.test(transactionId)) {
      return jsonResponse({ error: 'The payment return details are incomplete.' }, 400);
    }

    const { data: attempt } = await adminSupabase.from('payment_attempts').select('id')
      .eq('customer_id', user.id)
      .eq('tx_ref', txRef)
      .eq('payment_kind', paymentKind)
      .maybeSingle();
    if (!attempt) return jsonResponse({ error: 'This payment reference does not match your booking.' }, 404);

    if (paymentKind === 'booking') {
      const { data: booking } = await client.from('bookings').select('id, booking_code')
        .eq('booking_code', bookingCode)
        .eq('customer_id', user.id)
        .maybeSingle();
      if (!booking || attempt.id === undefined) return jsonResponse({ error: 'This booking is unavailable to your account.' }, 404);
      const { data: matchingAttempt } = await adminSupabase.from('payment_attempts').select('id')
        .eq('id', attempt.id).eq('booking_id', booking.id).maybeSingle();
      if (!matchingAttempt) return jsonResponse({ error: 'This payment reference does not match your booking.' }, 404);
    }

    const result = await verifyAndFinalizePayment(txRef, transactionId);
    return jsonResponse(result);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not verify the payment.';
    return jsonResponse({ error: message }, 400);
  }
});
