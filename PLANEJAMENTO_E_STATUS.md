# 🚀 Hexa Infinity — Planejamento de Implementação & Status

Documento oficial de acompanhamento de tarefas, status de configuração, arquitetura de pagamentos, dashboard analítico e publicação na **Google Play Store**.

---

## 📌 Quadro Geral de Status

| Tarefa / Funcionalidade | Responsável / Módulo | Status | Observações |
| :--- | :--- | :---: | :--- |
| **1. Renomeação para Hexa Infinity** | Web / UI / Config | 🟢 Concluído | Alteração de títulos, identificadores, manifest e package ID |
| **2. Dashboard Administrativo** | `admin.html` / Supabase | 🟢 Concluído | Métricas de jogadores, partidas, receitas e inventário |
| **3. Chave de Proteção do Dashboard** | `.env` / Admin Auth | 🟢 Concluído | Bloqueio por senha de admin com persistência |
| **4. Pagamentos Pix (R$ 0,25)** | Mercado Pago / Supabase | 🟢 Concluído | Integrado com modo de simulação e produção |
| **5. Pagamentos Cartão de Crédito (Web)** | Stripe Checkout | 🟢 Concluído | Backend pronto, pendente apenas chaves de produção |
| **6. Empacotamento Android** | Capacitor 8 / Android Studio | 🟢 Concluído | Projeto Android gerado com package ID `com.brunodarwich.hexainfinity` |
| **7. Google Play Billing (IAP)** | RevenueCat Plugin | 🟢 Concluído | Integração híbrida Web (Pix/Stripe) e Android (RevenueCat) |
| **8. Ficha & Publicação Google Play** | Google Play Console | 🟡 Em Preparação | Pacote `app-release.aab` gerado com sucesso! Pendente ficha e envio no Console |

---

## 🎯 Detalhamento das Etapas e Orientações

### 1️⃣ Renomeação do Projeto para "Hexa Infinity"
- **Novo Nome Oficial**: Hexa Infinity
- **Identificador de Pacote Android (Package ID)**: `com.brunodarwich.hexainfinity`
- **Itens a Modificar**:
  - `package.json`: `"name": "hexa-infinity"`
  - `index.html`: `<title>Hexa Infinity - Jogo 3D</title>` e tags Open Graph
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
- Definida pela variável de ambiente:
  ```env
  VITE_ADMIN_ACCESS_KEY=sua_chave_secreta_aqui
  ```
- O painel exibe uma tela de desbloqueio elegante exigindo a chave antes de carregar qualquer dado do Supabase.

---

### 3️⃣ Pagamentos por Cartão de Crédito (Web) via Stripe
- **Função Backend**: `supabase/functions/create-stripe-session`
- **Webhook de Confirmação**: `supabase/functions/stripe-webhook`
- **Como Ativar em Produção**:
  1. Criar conta no [Stripe Brasil](https://dashboard.stripe.com/register).
  2. Cadastrar as chaves no Supabase:
     ```bash
     npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
     npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
     ```
  3. No painel do Stripe, cadastrar o webhook apontando para a sua Edge Function.

---

### 4️⃣ Empacotamento Android (Capacitor) & In-App Purchases (RevenueCat)
Para publicar na Google Play Store cumprindo as políticas de monetização do Google:

#### Configuração do Capacitor:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Hexa Infinity" "com.brunodarwich.hexainfinity" --web-dir dist
npm run build
npx cap add android
```

#### Configuração do RevenueCat (IAP):
```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```
- A camada `paymentService.js` detecta se o jogo está rodando em ambiente web (usando Pix/Stripe) ou no app Android (usando o faturamento nativo do Google Play).

---

### 5️⃣ Publicação na Google Play Store (Checklist)

#### Requisitos de Conta e Ferramentas:
- [ ] Conta no [Google Play Console](https://play.google.com/console) ($25 taxa única de registro).
- [ ] Android Studio instalado para geração do pacote `.aab` assinado.

#### Materiais da Loja (Assets):
- [ ] **Ícone do App**: 512 x 512 px (PNG 32-bit com transparência).
- [ ] **Banner de Destaque / Gráfico de Recursos**: 1024 x 500 px (JPG ou PNG).
- [ ] **Capturas de Tela (Screenshots)**: Pelo menos 4 capturas verticais (proporção 9:16 ou 16:9).
- [ ] **Política de Privacidade**: Link público hospedado com as diretrizes de privacidade.
- [ ] **Classificação de Conteúdo**: Questionário IARC preenchido (Classificação Livre).

#### Geração do Pacote Release (.aab):
1. No Android Studio: **Build** > **Generate Signed Bundle / APK** > **Android App Bundle (.aab)**.
2. Criar e armazenar em segurança o arquivo `keystore.jks`.
3. Fazer upload do `.aab` na trilha de testes / produção da Play Store.
