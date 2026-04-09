import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RequestBody {
  placa: string;
  km: number;
  nome: string;
  telefone: string;
  cidade: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { placa, km, nome, telefone, cidade } = body;

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

    // 4. Salvar lead no Supabase (não bloqueia se não configurado)
    let leadId: string | null = null;
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado. Lead não salvo.');
    } else {
      try {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .insert({
            nome,
            telefone,
            placa,
            km,
            cidade,
            modelo,
            ano,
            valor_fipe: valorFipe,
            valor_proposta: valorProposta,
            status: 'cotacao_visualizada',
          })
          .select('id')
          .single();

        if (leadError) {
          console.error('⚠️ Erro ao salvar lead no Supabase:', leadError.message);
        } else {
          leadId = leadData.id;
          console.log('✅ Lead salvo no Supabase:', leadId);
        }
      } catch (dbErr) {
        console.error('⚠️ Supabase indisponível:', dbErr);
      }
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
