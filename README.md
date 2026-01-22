# AutoBid - Sistema de Cotação de Veículos

Sistema de avaliação e cotação de veículos com integração à FipeAPI (Tabela FIPE).

## 🚀 Tecnologias

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (Ícones)
- **FipeAPI** - Consulta de dados FIPE por placa

## 📦 Instalação

```bash
npm install
```

## ⚙️ Configuração

1. Cadastre-se em [FipeAPI](https://fipeapi.com.br/planos-placa.php) e obtenha sua API Key
2. Crie o arquivo `.env.local` na raiz do projeto:

```bash
FIPE_API_KEY=sua_chave_aqui
```

## 🏃 Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🏗️ Build para Produção

```bash
npm run build
npm start
```

## 🐳 Deploy no Coolify

### Configuração de Variáveis de Ambiente

**IMPORTANTE**: Configure a variável de ambiente no Coolify:

```
FIPE_API_KEY=sua_chave_da_fipeapi
```

### Opção 1: Detecção Automática (Nixpacks)

O Coolify detecta automaticamente projetos Next.js. Apenas:

1. Conecte seu repositório Git
2. Configure a variável `FIPE_API_KEY` nas configurações do projeto
3. Deploy!

### Opção 2: Dockerfile Manual

O projeto já inclui um `Dockerfile` otimizado. No Coolify:

1. Selecione "Dockerfile" como build method
2. Configure a porta: `3000`
3. Configure a variável `FIPE_API_KEY`
4. Deploy

## 📁 Estrutura do Projeto

```
site-repasse/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── quote/
│   │   │   │   └── route.ts      # API de cotação (integração FIPE)
│   │   │   ├── availability/
│   │   │   │   └── route.ts      # API horários disponíveis (Google Calendar)
│   │   │   └── schedule/
│   │   │       └── route.ts      # API criar agendamento (Google Calendar)
│   │   ├── layout.tsx            # Layout raiz
│   │   ├── page.tsx              # Página principal (wizard + agendamento)
│   │   └── globals.css           # Estilos globais
├── public/                       # Arquivos estáticos
├── Dockerfile                    # Container otimizado
├── next.config.js               # Configuração Next.js
├── tailwind.config.ts           # Configuração Tailwind
├── tsconfig.json                # Configuração TypeScript
├── GOOGLE_CALENDAR_SETUP.md     # Guia configuração Google Calendar
└── package.json
```

## 🔌 API Endpoints

### POST `/api/quote`

Gera cotação de veículo baseada na placa e quilometragem.

**Request Body:**
```json
{
  "placa": "ABC1D23",
  "km": 55000,
  "nome": "João Silva"
}
```

**Response:**
```json
{
  "sucesso": true,
  "modelo": "Toyota Corolla XEi 2.0",
  "ano": 2020,
  "valorFipe": 85000,
  "valorProposta": 59500
}
```

### GET `/api/availability`

Retorna horários disponíveis para agendamento (próximos 30 dias).

**Response:**
```json
{
  "ok": true,
  "slots": [
    {
      "start": "2026-01-23T12:00:00.000Z",
      "end": "2026-01-23T13:00:00.000Z",
      "display": "09:00"
    }
  ]
}
```

### POST `/api/schedule`

Cria agendamento no Google Calendar.

**Request Body:**
```json
{
  "startIso": "2026-01-23T12:00:00.000Z",
  "endIso": "2026-01-23T13:00:00.000Z",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "(11) 99999-9999",
  "readableSlot": "23/01/2026 09:00",
  "description": "Vistoria de veículo ABC1D23"
}
```

**Response:**
```json
{
  "ok": true,
  "eventId": "abc123",
  "hangoutLink": "https://meet.google.com/xxx-yyyy-zzz"
}
```

## 🧮 Algoritmo de Precificação

1. **Consulta FIPE** via BrasilAPI
2. **Desconto Base**: 20% (margem de revenda)
3. **Desconto por KM**: 1% adicional a cada 100.000 km
4. **Trava de Segurança**: Proposta nunca excede 70% da FIPE

## 🎨 Design System

Inspirado nos princípios da Vértice Growth:
- Minimalismo funcional
- Microinterações sutis
- Hierarquia visual clara
- Performance otimizada

## 📝 Licença

Proprietário - © 2026 AutoBid System
