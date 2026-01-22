# Configuração do Google Calendar

Este guia explica como configurar o Google Calendar para o sistema de agendamento.

## 📋 Pré-requisitos

- Conta Google
- Projeto no Google Cloud Platform

## 🚀 Passo a Passo

### 1. Criar Projeto no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote o **ID do Projeto**

### 2. Ativar a API do Google Calendar

1. No menu lateral, vá em **APIs e Serviços** > **Biblioteca**
2. Pesquise por **Google Calendar API**
3. Clique em **Ativar**

### 3. Criar Service Account

1. Vá em **APIs e Serviços** > **Credenciais**
2. Clique em **Criar credenciais** > **Conta de serviço**
3. Preencha:
   - **Nome**: `site-repasse-scheduler`
   - **Descrição**: `Service account para agendamentos`
4. Clique em **Criar e continuar**
5. Em **Função**, selecione: **Projeto** > **Editor**
6. Clique em **Concluir**

### 4. Gerar Chave JSON

1. Na lista de contas de serviço, clique na conta criada
2. Vá na aba **Chaves**
3. Clique em **Adicionar chave** > **Criar nova chave**
4. Selecione **JSON**
5. Clique em **Criar** (o arquivo JSON será baixado)

### 5. Extrair Credenciais

Abra o arquivo JSON baixado e copie os valores:

```json
{
  "type": "service_account",
  "project_id": "seu-projeto",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "site-repasse-scheduler@seu-projeto.iam.gserviceaccount.com",
  ...
}
```

### 6. Configurar Calendário

1. Acesse [Google Calendar](https://calendar.google.com/)
2. Crie um novo calendário:
   - Clique no **+** ao lado de **Outros calendários**
   - Selecione **Criar novo calendário**
   - Nome: `Agendamentos Site Repasse`
3. Após criar, clique nas **configurações do calendário**
4. Role até **Integrar calendário** e copie o **ID do calendário** (ex: `xyz@group.calendar.google.com`)
5. Vá em **Compartilhar com pessoas específicas**
6. Adicione o email da service account (ex: `site-repasse-scheduler@seu-projeto.iam.gserviceaccount.com`)
7. Defina a permissão como **Fazer alterações nos eventos**

### 7. Configurar Variáveis de Ambiente

Edite o arquivo `.env.local`:

```bash
# Google Calendar
GOOGLE_SERVICE_ACCOUNT_EMAIL=site-repasse-scheduler@seu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=xyz@group.calendar.google.com
```

**IMPORTANTE**: A `GOOGLE_PRIVATE_KEY` deve manter os `\n` (quebras de linha).

### 8. Testar

1. Reinicie o servidor Next.js:
   ```bash
   npm run dev
   ```

2. Acesse o sistema e teste o agendamento

3. Verifique se o evento aparece no Google Calendar

## ⚠️ Modo Desenvolvimento (Sem Google Calendar)

Se você **não configurar** as variáveis do Google Calendar:

- O sistema funciona normalmente com dados mockados
- Os agendamentos são apenas logados no console
- Ideal para desenvolvimento local

## 🐳 Deploy no Coolify

No painel do Coolify, adicione as variáveis de ambiente:

1. Abra seu projeto
2. Vá em **Environment Variables**
3. Adicione:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=...
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_CALENDAR_ID=...
   ```

## 🔒 Segurança

- **Nunca** commite o arquivo JSON da service account no Git
- As credenciais devem estar apenas em `.env.local` (que está no `.gitignore`)
- No Coolify, use variáveis de ambiente criptografadas

## 🆘 Troubleshooting

### Erro: "Calendar API has not been used..."
- Certifique-se de ativar a Google Calendar API no projeto

### Erro: "Insufficient Permission"
- Verifique se a service account tem permissão no calendário
- Verifique se a permissão é "Fazer alterações nos eventos"

### Private Key com erro
- Certifique-se de manter os `\n` na chave
- Use aspas duplas ao redor da chave completa
