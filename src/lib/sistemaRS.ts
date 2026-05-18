interface SistemaRSPayload {
  phone: string;
  name?: string;
  requestedStatus?: string;
  vehicleDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function notifySistemaRS(payload: SistemaRSPayload): Promise<void> {
  const url = process.env.SISTEMA_RS_API_URL;
  const key = process.env.SISTEMA_RS_API_KEY;

  if (!url || !key) {
    console.warn('[SistemaRS] Variáveis não configuradas — integração ignorada.');
    return;
  }

  try {
    const res = await fetch(`${url}/webhooks/n8n-ingress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[SistemaRS] Erro HTTP ${res.status}:`, body);
    } else {
      const data = await res.json();
      console.log('[SistemaRS] Lead registrado:', data.leadId);
    }
  } catch (err) {
    // Falha silenciosa — não quebra o fluxo principal
    console.error('[SistemaRS] Falha na integração (ignorada):', err);
  }
}
