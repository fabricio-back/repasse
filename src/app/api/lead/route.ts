import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: cria o lead com nome + telefone (step 2)
// PATCH: atualiza o lead existente com novos campos
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, telefone } = body;

    if (!nome || !telefone) {
      return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
    }

    if (!supabase) {
      console.warn('⚠️ [Supabase] Cliente não inicializado. Lead não criado.');
      return NextResponse.json({ ok: true, leadId: null, mock: true });
    }

    console.log('🔄 [Supabase] Criando lead...', { nome, telefone });

    const { data, error } = await supabase
      .from('leads')
      .insert({ nome, telefone, status: 'inicio' })
      .select('id')
      .single();

    if (error) {
      console.error('❌ [Supabase] Erro ao criar lead:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
      });
      // Retorna 200 para não quebrar o fluxo do usuário
      return NextResponse.json({ ok: false, error: error.message, leadId: null });
    }

    console.log('✅ [Supabase] Lead criado! ID:', data.id);
    return NextResponse.json({ ok: true, leadId: data.id });

  } catch (err: any) {
    console.error('❌ [Supabase] Exceção no POST /api/lead:', err?.message || err);
    return NextResponse.json({ ok: false, error: err.message, leadId: null });
  }
}

// PATCH: atualiza campos do lead pelo ID
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { leadId, ...fields } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId é obrigatório' }, { status: 400 });
    }

    if (!supabase) {
      console.warn('⚠️ [Supabase] Cliente não inicializado. Lead não atualizado.');
      return NextResponse.json({ ok: true, mock: true });
    }

    console.log('🔄 [Supabase] Atualizando lead', leadId, 'com campos:', fields);

    const { error } = await supabase
      .from('leads')
      .update(fields)
      .eq('id', leadId);

    if (error) {
      console.error('❌ [Supabase] Erro ao atualizar lead:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
      });
      return NextResponse.json({ ok: false, error: error.message });
    }

    console.log('✅ [Supabase] Lead atualizado com sucesso!', leadId);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('❌ [Supabase] Exceção no PATCH /api/lead:', err?.message || err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
