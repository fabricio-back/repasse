import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ [Supabase] VARIÁVEIS NÃO CONFIGURADAS!\n' +
    '   → NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ OK' : '❌ AUSENTE\n' +
    '   → NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ OK' : '❌ AUSENTE'
  );
} else {
  console.log('✅ [Supabase] Cliente inicializado. URL:', supabaseUrl.slice(0, 30) + '...');
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;
