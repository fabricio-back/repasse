import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://repasseautors.com.br'),
  title: {
    default: 'Repasse Auto RS - Venda Seu Carro em até 50 Minutos | Porto Alegre e Região',
    template: '%s | Repasse Auto RS'
  },
  description: 'Venda seu carro com segurança em até 50 minutos no Rio Grande do Sul. Avaliação FIPE, proposta instantânea, pagamento à vista. Sem exposição de dados, sem curiosos, sem golpes. Atendemos Porto Alegre e toda região metropolitana.',
  keywords: [
    'vender carro Porto Alegre',
    'venda de veículos RS',
    'compra de carros usados',
    'avaliação FIPE',
    'venda rápida de carro',
    'repasse de veículos',
    'vender carro usado',
    'compra de carros Porto Alegre',
    'venda segura de veículo',
    'cotação de carro online',
    'venda de carro sem anúncio',
    'melhor preço carro usado RS'
  ],
  authors: [{ name: 'Repasse Auto RS' }],
  creator: 'Repasse Auto RS',
  publisher: 'Repasse Auto RS',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
  themeColor: '#0a0a0a',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://repasseautors.com.br',
    siteName: 'Repasse Auto RS',
    title: 'Repasse Auto RS - Venda Seu Carro em até 50 Minutos',
    description: 'Venda seu carro com segurança em até 50 minutos. Avaliação FIPE, proposta instantânea, sem exposição de dados.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Repasse Auto RS - Venda seu carro com segurança',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Repasse Auto RS - Venda Seu Carro em até 50 Minutos',
    description: 'Venda seu carro com segurança em até 50 minutos. Avaliação FIPE, proposta instantânea.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://repasseautors.com.br',
  },
  verification: {
    google: 'seu-codigo-verificacao-google',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://repasseautors.com.br/#organization',
        name: 'Repasse Auto RS',
        url: 'https://repasseautors.com.br',
        logo: {
          '@type': 'ImageObject',
          url: 'https://repasseautors.com.br/logo-repasse.png',
        },
        sameAs: [
          'https://www.instagram.com/repasseautors',
          'https://www.facebook.com/repasseautors',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+55-51-9422-1187',
          contactType: 'customer service',
          areaServed: 'BR-RS',
          availableLanguage: 'Portuguese',
        },
      },
      {
        '@type': 'LocalBusiness',
        '@id': 'https://repasseautors.com.br/#localbusiness',
        name: 'Repasse Auto RS',
        image: 'https://repasseautors.com.br/logo-repasse.png',
        url: 'https://repasseautors.com.br',
        telephone: '+55-51-9422-1187',
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Porto Alegre',
          addressRegion: 'RS',
          addressCountry: 'BR',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: -30.0346,
          longitude: -51.2177,
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '09:00',
            closes: '18:00',
          },
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '127',
        },
      },
      {
        '@type': 'Service',
        '@id': 'https://repasseautors.com.br/#service',
        name: 'Compra de Veículos Usados',
        provider: {
          '@id': 'https://repasseautors.com.br/#organization',
        },
        areaServed: {
          '@type': 'State',
          name: 'Rio Grande do Sul',
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Serviços de Compra de Veículos',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Avaliação FIPE e Proposta Instantânea',
                description: 'Avaliação baseada na tabela FIPE com proposta de compra em até 50 minutos',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Vistoria Agendada',
                description: 'Agendamento online de vistoria técnica do veículo',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Pagamento à Vista',
                description: 'Pagamento imediato após aprovação da vistoria',
              },
            },
          ],
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://repasseautors.com.br/#website',
        url: 'https://repasseautors.com.br',
        name: 'Repasse Auto RS',
        description: 'Venda seu carro com segurança em até 50 minutos',
        publisher: {
          '@id': 'https://repasseautors.com.br/#organization',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://repasseautors.com.br/#cotacao',
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Quanto tempo leva para vender meu carro?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'O processo completo pode levar até 50 minutos. Você recebe a proposta instantaneamente após preencher os dados do veículo e agendar a vistoria online.',
            },
          },
          {
            '@type': 'Question',
            name: 'Como funciona a avaliação do meu veículo?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Utilizamos a tabela FIPE como base e consideramos o estado do veículo, quilometragem e histórico. A proposta é gerada automaticamente após consulta à placa.',
            },
          },
          {
            '@type': 'Question',
            name: 'Meus dados ficam protegidos?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sim, seus dados pessoais nunca são expostos publicamente. Diferente de classificados tradicionais, intermediamos toda a negociação mantendo sua privacidade.',
            },
          },
          {
            '@type': 'Question',
            name: 'Preciso anunciar meu carro?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. Você não precisa criar anúncios, lidar com curiosos ou responder dezenas de mensagens. Nós fazemos uma proposta direta de compra.',
            },
          },
          {
            '@type': 'Question',
            name: 'Como é feito o pagamento?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'O pagamento é realizado à vista após a vistoria e aprovação do veículo. Todo o processo de documentação é gerenciado por nós.',
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="pt-BR">
      <head>
        {/* Google tag (gtag.js) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-302827508"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-302827508');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
