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

    // 2. Consulta FIPE (FipeAPI.com.br ou Mock para Desenvolvimento)
    // Nota: Em produção, considere fazer cache desta requisição
    const apiKey = process.env.FIPE_API_KEY;
    
    let modelo: string;
    let ano: string;
    let valorFipe: number;
    let isMock = false;

    // MODO DESENVOLVIMENTO: Se não houver API key, usa dados mockados
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.log('⚠️ FIPE_API_KEY não configurada. Usando dados mockados para desenvolvimento.');
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Dados mockados baseados na estrutura real da FipeAPI
      const mockData = {
        data: {
          veiculo: {
            uf: "SP",
            ano: "2020/2020",
            cor: "Prata",
            placa: placa,
            combustivel: "Gasolina",
            marca_modelo: "Toyota Corolla XEi 2.0",
            municipio: "São Paulo"
          },
          fipes: [
            {
              valor: 85000,
              codigo: "005074-1",
              marca_modelo: "Toyota Corolla XEi 2.0 Flex 16V Aut."
            }
          ]
        }
      };
      
      const veiculo = mockData.data.veiculo;
      const fipeInfo = mockData.data.fipes[0];
      
      valorFipe = fipeInfo.valor;
      modelo = fipeInfo.marca_modelo;
      ano = veiculo.ano.split('/')[0];
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
      
      // Validar se retornou dados
      if (!fipeData.data || !fipeData.data.fipes || fipeData.data.fipes.length === 0) {
        throw new Error('Dados do veículo não encontrados');
      }

      // Extrair informações do veículo
      const veiculo = fipeData.data.veiculo;
      const fipeInfo = fipeData.data.fipes[0]; // Primeiro resultado FIPE
      
      valorFipe = fipeInfo.valor; // Já vem como número
      modelo = fipeInfo.marca_modelo || veiculo.marca_modelo;
      ano = veiculo.ano ? veiculo.ano.split('/')[0] : 'N/A';
    }

    // 3. Algoritmo de Precificação (Privado)
    const descontoFixo = 0.18; // 18% de desconto fixo
    const valorProposta = Math.floor(valorFipe * (1 - descontoFixo));

    // 4. Salvar lead no Supabase
    let leadId: string | null = null;
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
      // Não bloqueia o fluxo do usuário se o Supabase falhar
      console.error('⚠️ Supabase indisponível:', dbErr);
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
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Falha ao gerar cotação. Tente novamente.',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      }, 
      { status: 500 }
    );
  }
}
