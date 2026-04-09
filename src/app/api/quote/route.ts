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

    console.log('🚗 [QUOTE] Iniciando cotação:', { placa, km, nome, telefone, cidade, leadId: incomingLeadId });

    // 1. Validação Básica
    if (!placa || !km) {
      console.error('❌ [QUOTE] Dados incompletos');
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const apiKey = process.env.FIPE_API_KEY;

    let modelo: string;
    let ano: string;
    let valorFipe: number;
    let isMock = false;

    // MODO DESENVOLVIMENTO: Se não houver API key, usa dados mockados
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.log('⚠️ [QUOTE] FIPE_API_KEY não configurada. Usando dados mockados para desenvolvimento.');
      console.log('⏳ [QUOTE] Simulando chamada à API FIPE...');

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

      console.log('📊 [QUOTE] Dados FIPE (Mock):', { modelo, ano, valorFipe });

    } else {
      // MODO PRODUÇÃO: Consulta real na API
      console.log('📡 [QUOTE] Consultando API FIPE real...');
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

      console.log('📊 [QUOTE] Dados FIPE (Real):', { modelo, ano, valorFipe });
    }

    // 3. Algoritmo de Precificação
    const descontoFixo = 0.18;
    const valorProposta = Math.floor(valorFipe * (1 - descontoFixo));
    
    console.log('💰 [QUOTE] Precificação:', { valorFipe, descontoFixo, valorProposta });

    // 4. Atualizar/criar lead no Supabase com dados da FIPE
    let leadId: string | null = incomingLeadId ?? null;
    console.log('💾 [QUOTE] Iniciando salvamento no Supabase. LeadId recebido:', leadId);
    
    const supabase = await createClient();
    
    const fipeFields = {
      placa,
      km,
      cidade,
      modelo,
      ano,
      valor_fipe: valorFipe,
      valor_proposta: valorProposta,
      status: 'cotacao_visualizada',
    };

    try {
      if (leadId) {
        // Lead já existe (criado progressivamente) → apenas atualiza com dados da FIPE
        console.log('🔄 [QUOTE/Supabase] Atualizando lead', leadId, 'com campos:', fipeFields);
        const { error } = await supabase.from('leads').update(fipeFields).eq('id', leadId);
        if (error) {
          console.error('❌ [QUOTE/Supabase] Erro ao atualizar lead:', {
            leadId,
            message: error.message,
            code: error.code,
            details: error.details
          });
        } else {
          console.log('✅ [QUOTE/Supabase] Lead atualizado com sucesso! ID:', leadId);
          console.log('📝 [QUOTE/Supabase] Campos salvos:', Object.keys(fipeFields).join(', '));
        }
      } else {
        // Fallback: cria o lead completo de uma vez (sem salvamento progressivo)
        console.log('🆕 [QUOTE/Supabase] LeadId não fornecido. Criando novo lead completo...');
        console.log('📋 [QUOTE/Supabase] Dados para criação:', { nome, telefone, placa, km, cidade, ...fipeFields });
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .insert({ nome, telefone, placa, km, cidade, ...fipeFields })
          .select('id')
          .single();

        if (leadError) {
          console.error('❌ [QUOTE/Supabase] Erro ao criar lead:', {
            message: leadError.message,
            code: leadError.code,
            hint: leadError.hint,
            details: leadError.details
          });
        } else {
          leadId = leadData.id;
          console.log('✅ [QUOTE/Supabase] Lead criado com sucesso! ID:', leadId);
        }
      }
    } catch (dbErr: any) {
      console.error('❌ [QUOTE/Supabase] Exceção ao salvar:', dbErr?.message || dbErr);
      console.error('Stack trace:', dbErr?.stack);
    }

    console.log('✅ [QUOTE] Cotação finalizada. Retornando resultado:', { leadId, modelo, ano, valorFipe, valorProposta });

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
