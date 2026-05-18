import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.SISTEMA_RS_API_URL;
  const key = process.env.SISTEMA_RS_API_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: 'Variáveis SISTEMA_RS_API_URL ou SISTEMA_RS_API_KEY não configuradas',
    });
  }

  try {
    const res = await fetch(`${url}/webhooks/n8n-ingress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
      body: JSON.stringify({
        phone: '51900000000',
        name: 'Teste LP',
        requestedStatus: 'NEW_LEAD',
        metadata: { source: 'landing-page', test: true },
      }),
    });

    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text; }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      response: body,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    });
  }
}
