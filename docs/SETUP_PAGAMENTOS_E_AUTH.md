# Guia Passo a Passo: Configuração de Pagamentos (Pix & Stripe) e Login com Google

> **Atualização:** este guia contém instruções históricas. Para a versão atual, siga primeiro [Implantação da revisão de segurança](REVISAO_SEGURANCA_UX_2026-09-22.md). As políticas abertas e os modos de simulação não devem ser usados em produção.

Este guia orienta a configuração completa das chaves de produção para receber os pagamentos de **R$ 0,25** no Brasil (Mercado Pago), pagamentos internacionais no **Nubank PJ** (Stripe) e ativar o **Login com Google** no **Hexa Infinity**.

---

## 1. Banco de Dados Supabase (Executar a Migration)

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2. Vá em **SQL Editor** no menu lateral esquerdo.
3. Abra o arquivo [`supabase/migrations/20260916000000_create_powerups_and_payments.sql`](../supabase/migrations/20260916000000_create_powerups_and_payments.sql), copie todo o conteúdo e cole no SQL Editor do Supabase.
4. Clique em **Run** (Executar).
   - Isso criará as tabelas `player_inventory`, `payment_orders`, adicionará as colunas de Google Auth e habilitará o **Supabase Realtime** para atualização instantânea dos pagamentos no jogo.

---

## 2. Login com Google (Google OAuth)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto (ex: `Hexa Infinity`) ou selecione um existente.
3. No menu lateral, acesse **APIs e Serviços** > **Tela de permissão OAuth**:
   - Selecione **Externo** e preencha o Nome do App e seu e-mail de suporte.
4. Vá em **Credenciais** > **+ Criar Credenciais** > **ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: `Hexa Infinity Web`.
   - Em **URIs de redirecionamento autorizados**, adicione a URL fornecida pelo Supabase:
     ```
     https://<seu-id-do-projeto>.supabase.co/auth/v1/callback
     ```
   - Clique em **Criar** e copie o **ID do cliente** e a **Chave secreta do cliente**.
5. No painel do [Supabase](https://supabase.com/dashboard):
   - Vá em **Authentication** > **Providers** > Selecione **Google**.
   - Ative o seletor **Enable Google provider**.
   - Cole o **Client ID** e **Client Secret**.
   - Clique em **Save**.

---

## 3. Mercado Pago (Pix no Brasil - R$ 0,25)

O Mercado Pago permite receber micro-pagamentos de **R$ 0,25** via Pix com taxa inferior a meio centavo. O dinheiro cai diretamente na sua conta do Mercado Pago.

1. Acesse o [Painel do Desenvolvedor do Mercado Pago](https://www.mercadopago.com.br/developers/panel).
2. Faça login com sua conta do Mercado Pago (PF ou PJ).
3. Clique em **Criar aplicação**:
   - Nome: `Hexa Infinity`.
   - Tipo de solução: `Pagamentos online`.
   - Meio de integração: `Checkout Transparente / API`.
4. Após criar a aplicação, vá em **Credenciais de Produção**:
   - Copie o **Access Token** (começa com `APP_USR-...`).
5. No painel do Supabase, vá em **Project Settings** > **Edge Functions** > **Secrets** (ou via CLI):
   - Adicione a variável:
     - Nome: `MERCADOPAGO_ACCESS_TOKEN`
     - Valor: `<seu-access-token-do-mercado-pago>`
6. Configure o **Webhook de Notificações**:
   - No painel do Mercado Pago na sua aplicação, clique em **Webhooks / Notificações IPN**.
   - Modo de notificação: `Webhooks`.
   - URL de produção:
     ```
     https://<seu-id-do-projeto>.functions.supabase.co/mercadopago-webhook
     ```
   - Eventos: Selecione **Pagamentos** (`payment`).
   - Salve as alterações.

---

## 4. Stripe (Internacional - $0.10 / $1.00 com Repasse para o Nubank PJ)

O Stripe aceita cartões internacionais em dólar e faz o repasse (payout) automático convertido para a sua conta **Nubank PJ** no Brasil.

1. Crie ou acesse sua conta no [Stripe Brasil](https://dashboard.stripe.com/register).
2. Conclua a ativação da conta comercial informando os dados da sua empresa e a sua conta bancária **Nubank PJ** (dados de agência/conta ou chave Pix PJ).
3. No painel do Stripe, vá em **Desenvolvedores** > **Chaves de API**:
   - Copie a **Chave secreta** (`sk_live_...` ou `sk_test_...` para testes).
4. No menu **Webhooks** do Stripe:
   - Clique em **Adicionar endpoint**.
   - URL do endpoint:
     ```
     https://<seu-id-do-projeto>.functions.supabase.co/stripe-webhook
     ```
   - Eventos a ouvir: `checkout.session.completed`.
   - Após criar, clique em **Revelar segredo de assinatura** (`whsec_...`).
5. No painel do Supabase > **Project Settings** > **Edge Functions** > **Secrets**:
   - Adicione as variáveis:
     - `STRIPE_SECRET_KEY`: `<sua-chave-secreta-stripe>`
     - `STRIPE_WEBHOOK_SECRET`: `<seu-segredo-whsec>`

---

## 5. Deploy das Supabase Edge Functions

Para publicar as 4 Edge Functions criadas no Supabase, você pode usar a [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
# Fazer login na sua conta Supabase
npx supabase login

# Vincular ao seu projeto
npx supabase link --project-ref <seu-id-do-projeto>

# Fazer deploy das funções
npx supabase functions deploy create-pix-order --no-verify-jwt
npx supabase functions deploy mercadopago-webhook --no-verify-jwt
npx supabase functions deploy create-stripe-session --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

> **Dica para Testes Locais e Demonstração**:
> O jogo já conta com detecção automática de ambiente: enquanto você não cadastra as chaves de produção nas Secrets do Supabase, o modal de pagamento Pix oferece um botão de **🧪 Simular Pagamento Aprovado (Teste)** que permite testar toda a experiência do jogador, ativação do poder e a Segunda Chance no Game Over sem gastar nenhum dinheiro real!
