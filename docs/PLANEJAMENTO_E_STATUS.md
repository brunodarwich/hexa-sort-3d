# 🚀 Hexa Infinity — Planejamento de Implementação & Status

Documento oficial de acompanhamento de tarefas, status de configuração, arquitetura de pagamentos, dashboard analítico e publicação na **Google Play Store**.

> 📅 **Data da Última Atualização**: 22 de Setembro de 2026  
> 🏷️ **Versão do Projeto**: `v1.0.0`  
> 📱 **Package ID Android**: `com.brunodarwich.hexainfinity`

---

## 📌 Quadro Geral de Status

| Tarefa / Funcionalidade | Responsável / Módulo | Status | Observações |
| :--- | :--- | :---: | :--- |
| **1. Renomeação para Hexa Infinity** | Web / UI / Config | 🟢 Concluído | Alteração de títulos, identificadores, manifest e package ID |
| **2. Dashboard Administrativo** | `admin.html` / Supabase | 🟢 Concluído | Métricas de jogadores, partidas, receitas e inventário em tempo real |
| **3. Chave de Proteção do Dashboard** | `.env` / Admin Auth | 🟢 Concluído | Bloqueio por senha de admin com persistência e tela dark moderna |
| **4. Pagamentos Pix (R$ 0,25)** | Mercado Pago / Supabase | 🟢 Concluído | Integrado com modo de simulação inteligente e pronto para produção |
| **5. Pagamentos Cartão de Crédito (Web)** | Stripe Checkout | 🟡 Backend Pronto | Edge Functions e webhooks prontos; pendente cadastro de chaves live |
| **6. Empacotamento Android** | Capacitor 8 / Android Studio | 🟢 Concluído | Projeto Android gerado e compilado com package ID `com.brunodarwich.hexainfinity` |
| **7. Google Play Billing (IAP)** | RevenueCat Plugin | 🟢 Concluído | Plugin integrado no `paymentService.js` com suporte a produtos de loja |
| **8. Assets Visuais da Google Play** | `store_assets/` | 🟢 Concluído | Ícone 512x512, feature graphic 1024x500 e prints 1280x2560 prontos |
| **9. Ficha & Publicação Google Play** | Google Play Console | 🚀 Pronto p/ Envio | Conta aprovada; pronto para upload do `.aab` e preenchimento da ficha |

---

## 🎯 Detalhamento das Etapas e Orientações

### 1️⃣ Renomeação do Projeto para "Hexa Infinity"
- **Novo Nome Oficial**: Hexa Infinity
- **Identificador de Pacote Android (Package ID)**: `com.brunodarwich.hexainfinity`
- **Itens Modificados**:
  - `package.json`: `"name": "hexa-infinity"`
  - `index.html`: `<title>Hexa Infinity - Jogo 3D</title>` e tags Open Graph
  - `capacitor.config.json`: `"appId": "com.brunodarwich.hexainfinity"`, `"appName": "Hexa Infinity"`
  - Elementos de UI (header do jogo, modais de vitória e derrota, rodapés)

---

### 2️⃣ Dashboard Administrativo de Estatísticas (`/admin.html`)
Página web dedicada com visual moderno em tema dark, protegida por chave de acesso, exibindo dados analíticos em tempo real vindos do Supabase:

#### Métricas do Dashboard:
1. **Jogadores**:
   - Total de jogadores cadastrados
   - Jogadores ativos nas últimas 24h / 7 dias
   - Divisão de contas: Login com Google vs Jogadores Anônimos
2. **Engajamento & Partidas**:
   - Total de sessões/partidas disputadas
   - Tempo total e médio de jogo por sessão
   - Pontuação média, recorde global (High Score) e recorde de combos
3. **Financeiro & Conversão**:
   - Receita total arrecadada (R$ no Pix e R$/USD no Stripe)
   - Total de pedidos gerados vs pedidos pagos (Taxa de Conversão %)
   - Power-ups mais vendidos (`Reroll`, `Raio` e `Combo Pack`)
4. **Economia de Power-ups**:
   - Total de power-ups emitidos vs total consumidos em jogo
5. **Tabela de Jogadores & Pedidos**:
   - Lista completa de jogadores com data de cadastro e saldo
   - Histórico de pedidos de pagamento com status em tempo real

#### Proteção de Acesso:
- Autenticação real integrada com o Supabase Auth.
- Requer login com e-mail e senha de uma conta com papel administrativo configurado (`app_metadata.role = 'admin'`).
- RLS do Supabase garante que apenas contas com o claim administrativo consigam consultar dados agregados de jogadores e pedidos.

---

### 3️⃣ Pagamentos por Cartão de Crédito (Web) via Stripe
- **Função Backend**: `supabase/functions/create-stripe-session`
- **Webhook de Confirmação**: `supabase/functions/stripe-webhook`
- **Status**: Backend 100% desenvolvido e pronto.
- **Como Ativar em Produção (Pendente)**:
  1. Criar ou ativar conta no [Stripe Brasil](https://dashboard.stripe.com/register).
  2. Cadastrar as chaves no Supabase:
     ```bash
     npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
     npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
     ```
  3. No painel do Stripe, cadastrar o webhook apontando para a sua Edge Function (`https://<seu-projeto>.functions.supabase.co/stripe-webhook`).

---

### 4️⃣ Empacotamento Android (Capacitor) & In-App Purchases (RevenueCat)
Para publicar na Google Play Store cumprindo as diretrizes de monetização:

#### Configuração do Capacitor 8:
- Projeto nativo Android configurado em `android/`.
- Ícones adaptativos configurados para Android 12+.
- Sincronização via `npx cap sync`.

#### Configuração do RevenueCat (IAP):
- Plugin `@revenuecat/purchases-capacitor` integrado.
- A camada `paymentService.js` detecta se o jogo está rodando em ambiente web (usando Pix/Stripe) ou no app Android (usando o faturamento nativo do Google Play via RevenueCat).

---

### 5️⃣ Publicação na Google Play Store (Checklist)

#### Requisitos de Conta e Ferramentas:
- [x] Conta no [Google Play Console](https://play.google.com/console) aprovada e identidade confirmada.
- [x] Conta no [RevenueCat](https://app.revenuecat.com) criada.
- [x] Android Studio instalado com SDK 34 / 35.
- [ ] Configuração do Perfil de Pagamentos / Comerciante (Merchant Account) no Google Play Console.

#### Materiais da Loja (Assets):
- [x] **Ícone do App**: 512 x 512 px (`store_assets/google_play_icon_512x512.png`).
- [x] **Banner de Destaque / Gráfico de Recursos**: 1024 x 500 px (`store_assets/google_play_feature_graphic_1024x500.png`).
- [x] **Capturas de Tela (Screenshots)**: Capturas verticais 1280x2560 e horizontais 1024x500 (`store_assets/screenshots/`).
- [x] **Política de Privacidade**: Página pública hospedada (`privacy.html`).
- [ ] **Classificação de Conteúdo**: Questionário IARC preenchido no Console (Classificação Livre).

#### Geração do Pacote Release (.aab):
1. No Android Studio: **Build** > **Generate Signed Bundle / APK** > **Android App Bundle (.aab)**.
2. Criar e armazenar em segurança o arquivo `keystore.jks`.
3. Fazer upload do `.aab` na trilha de testes fechados / produção da Play Store.
