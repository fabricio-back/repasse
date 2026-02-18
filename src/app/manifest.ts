import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Repasse Auto RS - Venda Seu Carro em 50 Minutos',
    short_name: 'Repasse Auto RS',
    description: 'Venda seu carro com segurança em até 50 minutos. Avaliação FIPE, proposta instantânea, sem exposição de dados.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#f59e0b',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.png',
        sizes: '54x54',
        type: 'image/png',
      },
    ],
    categories: ['automotive', 'business', 'finance'],
    lang: 'pt-BR',
    dir: 'ltr',
  }
}
