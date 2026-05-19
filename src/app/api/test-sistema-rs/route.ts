import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo') ?? 'NEW_LEAD';

  const url = process.env.SISTEMA_RS_API_URL;
  const key = process.env.SISTEMA_RS_API_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: 'Variáveis SISTEMA_RS_API_URL ou SISTEMA_RS_API_KEY não configuradas',
    });
  }

  const payloads: Record<string, object> = {
    NEW_LEAD: {
      phone: '51900000000',
      name: 'Teste LP',
      requestedStatus: 'NEW_LEAD',
      metadata: { source: 'landing-page', test: true },
    },
    COUNTER_OFFER: {
      phone: '51900000000',
      name: 'Teste LP',
      requestedStatus: 'COUNTER_OFFER',
      vehicleDetails: {
        placa: 'ABC1D23',
        km: 45000,
        cidade: 'Porto Alegre',
        modelo: 'Toyota Corolla XEi 2.0',
        ano: '2020',
        valorFipe: 85000,
        valorProposta: 69700,
      },
      metadata: { source: 'landing-page', test: true },
    },
    SCHEDULED: {
      phone: '51900000000',
      name: 'Teste LP',
      requestedStatus: 'SCHEDULED',
      vehicleDetails: {
        placa: 'ABC1D23',
        modelo: 'Toyota Corolla XEi 2.0',
        valorFipe: 85000,
        valorProposta: 69700,
      },
      metadata: {
        source: 'landing-page',
        email: 'teste@email.com',
        dataAgendamento: new Date().toISOString(),
        horarioLegivel: 'Seg, 20/05 às 14h',
        googleEventId: 'mock-test',
        test: true,
      },
    },
  };

  const payload = payloads[tipo] ?? payloads['NEW_LEAD'];

  try {
    const res = await fetch(`${url}/webhooks/n8n-ingress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text; }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      tipo,
      payloadEnviado: payload,
      response: body,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
