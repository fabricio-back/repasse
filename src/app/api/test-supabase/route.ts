import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Teste simples - buscar dados de alguma tabela
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        status: 'error',
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ 
      status: 'success',
      message: 'Supabase conectado com sucesso!',
      data: data || [],
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ URL configurada' : '❌ URL não configurada',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Key configurada' : '❌ Key não configurada'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message || 'Erro desconhecido',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
