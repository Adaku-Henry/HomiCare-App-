import { adminSupabase, corsHeaders, getAuthenticatedUser, jsonResponse } from '../_shared/flutterwave.ts';

const paymentMethods = {
  mtn_mobile_money: 'mobilemoneyuganda',
  airtel_money: 'mobilemoneyuganda',
  visa: 'card',
} as const;

type PaymentMethod = keyof typeof paymentMethods;

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Use POST to start a payment.' }, 405);

  const secretKey = Deno.env.get('FLW_SECRET_KEY');
  if (!secretKey) return jsonResponse({ error: 'Payment processing is not configured yet.' }, 503);

  try {
    const { client, user } = await getAuthenticatedUser(request);
    if (!user) return jsonResponse({ error: 'Sign in before starting a payment.' }, 401);
    if (!user.email) return jsonResponse({ error: 'Add an email address to your account before paying.' }, 400);

    const body = await request.json();
    const paymentKind = body.payment_kind === 'wallet_topup' ? 'wallet_topup' : 'booking';
    const bookingCode = typeof body.booking_code === 'string' ? body.booking_code.trim() : '';
    const method = body.payment_method as PaymentMethod;
    if (!Object.prototype.hasOwnProperty.call(paymentMethods, method)) {
      return jsonResponse({ error: 'Choose a supported payment method.' }, 400);
    }
    const submittedPhoneNumber = typeof body.phone_number === 'string' ? body.phone_number.trim() : '';
    const phoneDigits = submittedPhoneNumber.replace(/\D/g, '');
    const localPhoneNumber = phoneDigits.startsWith('256') ? phoneDigits.slice(3) : phoneDigits.startsWith('0') ? phoneDigits.slice(1) : phoneDigits;
    const mobileMoneyPhone = /^7\d{8}$/.test(localPhoneNumber) ? `+256${localPhoneNumber}` : null;
    if (method !== 'visa' && !mobileMoneyPhone) {
      return jsonResponse({ error: 'Enter a valid Uganda mobile-money number, such as +256 7XX XXX XXX.' }, 400);
    }

    let booking: { id: string; booking_code: string; customer_name: string; customer_phone: string; service_name: string; final_price: number; payment_status: string } | null = null;
    let amount: number;
    if (paymentKind === 'booking') {
      if (!bookingCode) return jsonResponse({ error: 'Choose a booking before paying.' }, 400);
      const { data, error: bookingError } = await client.from('bookings')
        .select('id, booking_code, customer_id, customer_name, customer_phone, service_name, final_price, payment_status')
        .eq('booking_code', bookingCode)
        .eq('customer_id', user.id)
        .maybeSingle();
      if (bookingError || !data) return jsonResponse({ error: 'This booking is unavailable to your account.' }, 404);
      booking = data;
      amount = Number(booking.final_price);
      if (!Number.isSafeInteger(amount) || amount <= 0) return jsonResponse({ error: 'Wait for the provider to confirm the final amount before paying.' }, 409);
      if (['paid', 'completed'].includes(String(booking.payment_status).toLowerCase())) {
        return jsonResponse({ error: 'This booking is already paid.' }, 409);
      }
    } else {
      amount = Number(body.amount);
      if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 5000000) {
        return jsonResponse({ error: 'Wallet top-ups must be between UGX 1,000 and UGX 5,000,000.' }, 400);
      }
    }

    const txRef = `HC-${crypto.randomUUID()}`;
    const { data: attempt, error: attemptError } = await adminSupabase.from('payment_attempts').insert({
      booking_id: booking?.id || null,
      customer_id: user.id,
      payment_kind: paymentKind,
      tx_ref: txRef,
      payment_method: method,
      amount,
      currency: 'UGX',
      status: 'pending',
    }).select('id').single();
    if (attemptError || !attempt) throw new Error('Could not create a secure payment attempt.');

    const appUrl = (Deno.env.get('APP_URL') || request.headers.get('origin') || '').replace(/\/$/, '');
    if (!appUrl) throw new Error('Set APP_URL to the public HomiCare web address.');
    const redirectUrl = new URL(paymentKind === 'booking' ? '/payment' : '/wallet', appUrl);
    if (booking) redirectUrl.searchParams.set('booking_code', booking.booking_code);
    else redirectUrl.searchParams.set('payment_kind', 'wallet_topup');
    redirectUrl.searchParams.set('tx_ref', txRef);

    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: 'UGX',
        redirect_url: redirectUrl.toString(),
        payment_options: paymentMethods[method],
        customer: {
          email: user.email,
          name: booking?.customer_name || String(user.user_metadata?.full_name || user.email.split('@')[0]),
          phonenumber: mobileMoneyPhone || booking?.customer_phone || user.phone || undefined,
        },
        customizations: {
          title: paymentKind === 'booking' ? 'HomiCare booking payment' : 'HomiCare wallet top-up',
          description: booking ? `${booking.service_name} · ${booking.booking_code}` : 'Wallet top-up',
          logo: `${appUrl}/icons/homicare-icon.svg`,
        },
        meta: { booking_code: booking?.booking_code || null, payment_kind: paymentKind, payment_attempt_id: attempt.id },
      }),
    });
    const checkout = await flutterwaveResponse.json();
    if (!flutterwaveResponse.ok || checkout?.status !== 'success' || typeof checkout?.data?.link !== 'string') {
      await adminSupabase.from('payment_attempts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', attempt.id);
      return jsonResponse({ error: 'The payment provider could not start checkout. Try again or choose another method.' }, 502);
    }

    return jsonResponse({ checkout_url: checkout.data.link, tx_ref: txRef });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not start the payment.';
    return jsonResponse({ error: message }, 500);
  }
});
