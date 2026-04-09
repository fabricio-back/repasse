import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RequestBody {
  placa: string;
  km: number;
  nome: string;
  telefone: string;
  cidade: string;
  leadId?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { placa, km, nome, telefone, cidade, leadId: incomingLeadId } = body;

    // 1. Validação Básica
    if (!placa || !km) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const apiKey = process.env.FIPE_API_KEY;

    let modelo: string;
    let ano: string;
    let valorFipe: number;
    let isMock = false;

    // MODO DESENVOLVIMENTO: Se não houver API key, usa dados mockados
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.log('⚠️ FIPE_API_KEY não configurada. Usando dados mockados para desenvolvimento.');

      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockData = {
        data: {
          veiculo: { ano: '2020/2020', placa },
          fipes: [{ valor: 85000, marca_modelo: 'Toyota Corolla XEi 2.0 Flex 16V Aut.' }],
        },
      };

      valorFipe = mockData.data.fipes[0].valor;
      modelo = mockData.data.fipes[0].marca_modelo;
      ano = mockData.data.veiculo.ano.split('/')[0];
      isMock = true;

    } else {
      // MODO PRODUÇÃO: Consulta real na API
      const fipeResponse = await fetch(
        `https://placas.fipeapi.com.br/placas/${placa}?key=${apiKey}`
      );

      if (!fipeResponse.ok) {
        const errorText = await fipeResponse.text();
        console.error('Erro na API FIPE:', errorText);
        throw new Error('Veículo não encontrado na base FIPE');
      }

      const fipeData = await fipeResponse.json();

      if (!fipeData.data || !fipeData.data.fipes || fipeData.data.fipes.length === 0) {
        throw new Error('Dados do veículo não encontrados');
      }

      const veiculo = fipeData.data.veiculo;
      const fipeInfo = fipeData.data.fipes[0];

      valorFipe = fipeInfo.valor;
      modelo = fipeInfo.marca_modelo || veiculo.marca_modelo;
      ano = veiculo.ano ? veiculo.ano.split('/')[0] : 'N/A';
    }

    // 3. Algoritmo de Precificação
    const descontoFixo = 0.18;
    const valorProposta = Math.floor(valorFipe * (1 - descontoFixo));

    // 4. Atualizar/criar lead no Supabase com dados da FIPE
    let leadId: string | null = incomingLeadId ?? null;
    const supabase = await createClient();
    
    const fipeFields = {
      modelo,
      ano,
      valor_fipe: valorFipe,
      valor_proposta: valorProposta,
      status: 'cotacao_visualizada',
    };

    try {
      if (leadId) {
        // Lead já existe (criado progressivamente) → apenas atualiza com dados da FIPE
        console.log('🔄 [Supabase] Atualizando lead existente com FIPE...', leadId, fipeFields);
        const { error } = await supabase.from('leads').update(fipeFields).eq('id', leadId);
        if (error) {
          console.error('❌ [Supabase] Erro ao atualizar lead com FIPE:', error.message);
        } else {
          console.log('✅ [Supabase] Lead atualizado com FIPE! ID:', leadId);
        }
      } else {
        // Fallback: cria o lead completo de uma vez (sem salvamento progressivo)
        console.log('🔄 [Supabase] Criando lead completo (fallback)...', { nome, telefone, placa, km, cidade });
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .insert({ nome, telefone, placa, km, cidade, ...fipeFields })
          .select('id')
          .single();

        if (leadError) {
          console.error('❌ [Supabase] Erro ao criar lead:', { message: leadError.message, code: leadError.code, hint: leadError.hint });
        } else {
          leadId = leadData.id;
          console.log('✅ [Supabase] Lead criado com sucesso! ID:', leadId);
        }
      }
    } catch (dbErr: any) {
      console.error('❌ [Supabase] Exceção:', dbErr?.message || dbErr);
    }

    return NextResponse.json({
      sucesso: true,
      modelo,
      ano,
      valorFipe,
      valorProposta,
      leadId,
      mock: isMock || undefined,
    });

  } catch (error: any) {
    console.error('Erro no processamento:', error);
    return NextResponse.json(
      {
        error: error.message || 'Falha ao gerar cotação. Tente novamente.',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}
