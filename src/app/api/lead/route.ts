import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { error } = await supabase
      .from('leads')
      .update(fields)
      .eq('id', leadId);

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

    console.log('✅ [LEAD/Supabase] Lead atualizado com sucesso!', leadId);
    console.log('📝 [LEAD/Supabase] Campos atualizados:', Object.keys(fields).join(', '));
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('❌ [LEAD/Supabase] Exceção no PATCH:', err?.message || err);
    console.error('Stack trace:', err?.stack);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
