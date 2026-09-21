# 🔷 Hexa Infinity — Infinite Sort 3D

Um jogo de quebra-cabeça 3D casual e viciante com mecânicas de classificação hexagonal, fusão em cascata, efeitos táteis de áudio procedural (ASMR), placar de recordes global em tempo real e sistema de micro-monetização.

---

## 🎮 Principais Funcionalidades

- **Mecânica 3D com Three.js**: Tabuleiro hexagonal interativo com física visual, feedback tátil, animações suaves e renderização WebGL de alta performance.
- **Áudio Procedural ASMR**: Sistema de som procedural nativo utilizando a Web Audio API com efeitos sonoros de empilhamento, deslizamento e fusão.
- **Sistema de Níveis & Temas**: Ambientes e paletas dinâmicas que evoluem conforme o jogador avança de nível.
- **Placar Global em Tempo Real**: Integração com **Supabase** para registro de recordes globais, apelidos e sincronização via Google Auth.
- **Power-Ups & Boosters**:
  - 🔄 **Atualizar Deque (Re-roll)**: Recarrega as 3 opções de cartas do deque.
  - ⚡ **Raio Destruidor (Lightning)**: Elimina 3 pilhas aleatórias para desafogar o tabuleiro.
  - 🚀 **Foguete Inteligente**: Booster lateral recarregado por pontuação (50.000 pts).
  - 🍀 **Trevo da Sorte**: Booster lateral recarregado por pontuação (100.000 pts).
- **Sistema de Pagamentos Integrado**:
  - 🇧🇷 **Pix Instantâneo (R$ 0,25)** via Mercado Pago com QR Code e Copia e Cola.
  - 🌐 **Cartão de Crédito Internacional** via Stripe Checkout.
- **Multiplataforma**:
  - Suporte completo a **PWA (Progressive Web App)** para navegadores desktop e mobile.
  - Empacotamento nativo Android via **Capacitor 6** (`com.brunodarwich.hexainfinity`).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend & Engine 3D**: [Vite](https://vitejs.dev/), [Three.js](https://threejs.org/), Vanilla JavaScript (ES Modules), CSS3 Glassmorphism & Custom Properties.
- **Backend & Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Supabase Edge Functions / Deno, Supabase Realtime).
- **Gateways de Pagamento**: Mercado Pago API (Pix) e Stripe API (Cartão de Crédito).
- **Mobile Packaging**: [Capacitor](https://capacitorjs.com/).

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- `npm` ou `yarn`

### 2. Instalação e Execução

```bash
# Clone o repositório
git clone https://github.com/brunodarwich/hexa-sort-3d.git
cd mysterious-hawking

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Abra o navegador no endereço exibido no terminal (geralmente `http://localhost:5173`).

### 3. Build de Produção

```bash
# Gerar arquivos minificados em /dist
npm run build

# Pré-visualizar a build de produção localmente
npm run preview
```

---

## ⚙️ Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto com as credenciais do seu projeto Supabase:

```env
# Conexão Supabase
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Proteção de Acesso ao Dashboard Administrativo
VITE_ADMIN_ACCESS_KEY=sua_chave_secreta_aqui
```

---

## 📂 Estrutura do Projeto

```
├── public/                     # Assets públicos estáticos e Web Manifest
│   └── manifest.webmanifest    # Configuração PWA do Hexa Infinity
├── src/
│   ├── game/                   # Lógica 3D do jogo, grid, áudio e placar
│   │   ├── HexGrid.js          # Tabuleiro e lógica de conexões hexagonais
│   │   ├── HexTile.js          # Geometrias 3D, materiais e cores das peças
│   │   ├── Leaderboard.js      # Integração com o ranking Supabase
│   │   └── SoundSystem.js      # Efeitos de áudio com Web Audio API
│   ├── main.js                 # Ponto de entrada, loop de jogo e HUD
│   ├── responsive.css          # Adaptações responsivas para mobile/desktop
│   └── style.css               # Design System, glassmorphism e temas
├── supabase/
│   ├── functions/              # Edge Functions para Pix e Stripe
│   │   ├── create-pix-order/   # Geração de cobrança Pix no Mercado Pago
│   │   ├── create-stripe-session/ # Sessão de checkout no Stripe
│   │   ├── mercadopago-webhook/ # Webhook de confirmação Pix
│   │   └── stripe-webhook/     # Webhook de confirmação Stripe
│   └── migrations/             # Scripts SQL de schema do banco de dados
├── capacitor.config.json       # Configuração do Capacitor Android
├── index.html                  # Interface principal da aplicação web
├── package.json                # Dependências e scripts do projeto
└── PLANEJAMENTO_E_STATUS.md    # Quadro de acompanhamento de tarefas e status
```

---

## 📚 Documentação Complementar

- [`PLANEJAMENTO_E_STATUS.md`](file:///c:/Users/Bruno/Documents/antigravity/mysterious-hawking/PLANEJAMENTO_E_STATUS.md) — Status detalhado de todas as tarefas e checklist de publicação na Google Play.
- [`SETUP_PAGAMENTOS_E_AUTH.md`](file:///c:/Users/Bruno/Documents/antigravity/mysterious-hawking/SETUP_PAGAMENTOS_E_AUTH.md) — Guia passo a passo de configuração do Mercado Pago, Stripe e Google OAuth.
- [`DESIGN.md`](file:///c:/Users/Bruno/Documents/antigravity/mysterious-hawking/DESIGN.md) — Tokens de design, paleta de cores, tipografia e especificações de interface.
- [`STITCH_PROMPTS.md`](file:///c:/Users/Bruno/Documents/antigravity/mysterious-hawking/STITCH_PROMPTS.md) — Prompts de UI para prototipagem com Stitch with Google.
