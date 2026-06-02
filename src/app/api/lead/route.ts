import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifySistemaRS } from '@/lib/sistemaRS';

// POST: cria o lead com nome + telefone (step 2)
// PATCH: atualiza o lead existente com novos campos
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, telefone } = body;

    console.log('🆕 [LEAD] Criando novo lead:', { nome, telefone });

    if (!nome || !telefone) {
      console.error('❌ [LEAD] Dados incompletos');
      return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
    }

    const supabase = await createClient();

    console.log('� [LEAD/Supabase] Inserindo lead na tabela leads...');

    const { data, error } = await supabase
      .from('leads')
      .insert({ nome, telefone, status: 'inicio' })
      .select('id')
      .single();

    if (error) {
      console.error('❌ [LEAD/Supabase] Erro ao criar lead:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      });
      // Retorna 200 para não quebrar o fluxo do usuário
      return NextResponse.json({ ok: false, error: error.message, leadId: null });
    }

    console.log('✅ [LEAD/Supabase] Lead criado com sucesso! ID:', data.id);

    await notifySistemaRS({
      phone: telefone,
      name: nome,
      requestedStatus: 'NEW_LEAD',
      metadata: { source: 'landing-page' },
    });

    return NextResponse.json({ ok: true, leadId: data.id });

  } catch (err: any) {
    console.error('❌ [LEAD/Supabase] Exceção no POST:', err?.message || err);
    console.error('Stack trace:', err?.stack);
    return NextResponse.json({ ok: false, error: err.message, leadId: null });
  }
}

// PATCH: atualiza campos do lead pelo ID
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { leadId, ...fields } = body;

    console.log('🔄 [LEAD] Atualizando lead:', leadId, 'com campos:', Object.keys(fields).join(', '));

    if (!leadId) {
      console.error('❌ [LEAD] LeadId não fornecido');
      return NextResponse.json({ error: 'leadId é obrigatório' }, { status: 400 });
    }

    const supabase = await createClient();

    console.log('� [LEAD/Supabase] Executando UPDATE na tabela leads...');

    const { data, error } = await supabase
      .from('leads')
      .update(fields)
      .eq('id', leadId)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('❌ [LEAD/Supabase] Erro ao atualizar:', {
        leadId,
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      });
      return NextResponse.json({ ok: false, error: error.message });
    }

    if (!data) {
      console.error('❌ [LEAD/Supabase] Nenhum lead encontrado para atualizar:', leadId);
      return NextResponse.json({ ok: false, error: 'Lead não encontrado' }, { status: 404 });
    }

    // Se houver contraproposta, notifica o SistemaRS sem bloquear o fluxo principal
    if (fields.valor_contraproposta) {
      try {
        const { data: leadData, error: leadFetchError } = await supabase
          .from('leads')
          .select('nome, telefone, placa, km, cidade, modelo, ano, valor_fipe, valor_proposta')
          .eq('id', leadId)
          .maybeSingle();

        if (leadFetchError) {
          console.warn('⚠️ [LEAD/SistemaRS] Não foi possível buscar dados do lead para webhook:', {
            leadId,
            message: leadFetchError.message,
            code: leadFetchError.code,
          });
        } else {
          await notifySistemaRS({
            phone: leadData?.telefone || '',
            name: leadData?.nome,
            requestedStatus: 'COUNTER_OFFER',
            valorContraproposta: fields.valor_contraproposta,
            vehicleDetails: {
              placa: leadData?.placa,
              km: leadData?.km,
              cidade: leadData?.cidade,
              modelo: leadData?.modelo,
              ano: leadData?.ano,
              valorFipe: leadData?.valor_fipe,
              valorProposta: leadData?.valor_proposta,
            },
            metadata: {
              source: 'landing-page',
              leadId,
            },
          });
        }
      } catch (notifyErr: any) {
        console.warn('⚠️ [LEAD/SistemaRS] Falha ao notificar contraproposta (ignorada):', notifyErr?.message || notifyErr);
      }
    }

    console.log('✅ [LEAD/Supabase] Lead atualizado com sucesso!', leadId);
    console.log('📝 [LEAD/Supabase] Campos atualizados:', Object.keys(fields).join(', '));
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('❌ [LEAD/Supabase] Exceção no PATCH:', err?.message || err);
    console.error('Stack trace:', err?.stack);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
