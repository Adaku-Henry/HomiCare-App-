import { corsHeaders, jsonResponse, verifyAndFinalizePayment } from '../_shared/flutterwave.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Use POST for Flutterwave webhooks.' }, 405);

  const webhookHash = Deno.env.get('FLW_WEBHOOK_HASH');
  if (!webhookHash || request.headers.get('verif-hash') !== webhookHash) {
    return jsonResponse({ error: 'Invalid webhook signature.' }, 401);
  }

  try {
    const payload = await request.json();
    if (payload?.event !== 'charge.completed') return jsonResponse({ received: true });
    const transactionId = payload?.data?.id;
    const txRef = payload?.data?.tx_ref;
    if ((!Number.isInteger(transactionId) && typeof transactionId !== 'string') || typeof txRef !== 'string') {
      return jsonResponse({ error: 'Webhook transaction reference is incomplete.' }, 400);
    }

    const result = await verifyAndFinalizePayment(txRef, transactionId);
    return jsonResponse({ received: true, status: result.status });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not process payment webhook.';
    return jsonResponse({ error: message }, 500);
  }
});
