# 🔷 Hexa Infinity — Infinite Sort 3D

> **Auditoria e Revisão Integral — Setembro/2026:** Projeto auditado com 100% de testes de segurança aprovados, mitigação de IDOR e Stored XSS, RPC de exclusão de conta em conformidade com a LGPD (Art. 12) e diretrizes de publicação do Google Play.

Um jogo de quebra-cabeça 3D casual e viciante com mecânicas de classificação hexagonal, fusão em cascata, efeitos táteis de áudio procedural (ASMR), placar de recordes global em tempo real e sistema completo de micro-monetização.

> 📅 **Data da Última Atualização**: 26 de Setembro de 2026  
> 🏷️ **Versão**: `v1.0.5` (Web PWA & Android Release Bundle)  
> 📱 **Package ID Android**: `com.brunodarwich.hexainfinity`  
> 📄 **Licença**: [MIT](LICENSE)

---

## 📌 Status Atual do Projeto (Setembro/2026)

| Módulo / Funcionalidade | Plataforma | Status | Detalhes |
| :--- | :---: | :---: | :--- |
| **Engine 3D & Gameplay** | Web & Android | 🟢 Concluído | Tabuleiro hexagonal Three.js, física visual, combos e animações fluidas |
| **Áudio Procedural ASMR** | Web & Android | 🟢 Concluído | Síntese procedural nativa via Web Audio API (sem assets pesados) |
| **Placar & Auth em Tempo Real** | Supabase | 🟢 Concluído | Ranking global, recordes e autenticação Google / Anônima |
| **Dashboard Administrativo** | Web (`/admin.html`) | 🟢 Concluído | Login Supabase com papel administrativo (`app_metadata.role = 'admin'`) |
| **Pagamentos Pix (R$ 0,25)** | Web | 🟢 Concluído | Mercado Pago com autenticação, assinatura de webhook e crédito transacional |
| **Cartão de Crédito (Stripe)** | Web | 🟢 Concluído | Funções e webhooks no Supabase com sanitização de `returnUrl` |
| **Google Play Billing (IAP)** | Android | 🟢 Concluído | Integração RevenueCat com webhook seguro fail-closed |
| **Privacidade & LGPD** | Web & Android | 🟢 Concluído | Exclusão de conta in-app e anonimização de histórico (Art. 12 da LGPD) |
| **Empacotamento Android** | Capacitor 8 | 🟢 Concluído | Target SDK 36, `allowBackup=false`, pacote `.aab` assinado pronto |
| **Publicação Google Play** | Google Play Console | 🟢 Pronto para Lançamento | Segurança homologada, diretrizes de privacidade e assets completos |

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
  - 📱 **Google Play Billing** via RevenueCat para o app Android.
- **Multiplataforma**:
  - Suporte completo a **PWA (Progressive Web App)** para navegadores desktop e mobile.
  - Empacotamento nativo Android via **Capacitor 8** (`com.brunodarwich.hexainfinity`).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend & Engine 3D**: [Vite](https://vitejs.dev/), [Three.js](https://threejs.org/), Vanilla JavaScript (ES Modules), CSS3 Glassmorphism & Custom Properties.
- **Backend & Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Supabase Edge Functions / Deno, Supabase Realtime).
- **Gateways de Pagamento**: Mercado Pago API (Pix), Stripe API (Cartão de Crédito) e RevenueCat (Google Play IAP).
- **Mobile Packaging**: [Capacitor 8](https://capacitorjs.com/) & Android Studio.

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

# O painel usa Supabase Auth com app_metadata.role=admin.
# Nunca coloque segredos administrativos em variáveis VITE_.
```

---

## 📂 Estrutura do Repositório

```
├── admin.html                  # Dashboard administrativo (página Vite)
├── index.html                  # Interface principal do jogo (página Vite)
├── privacy.html                # Política de Privacidade (página Vite)
├── package.json                # Dependências e scripts de build
├── capacitor.config.json       # Configurações do Capacitor Android
├── vite.config.js              # Configurações de compilação multi-page
│
├── docs/                       # 📚 Central de Documentação Técnica
│   ├── PLANEJAMENTO_E_STATUS.md           # Cronograma, checklist e status detalhado
│   ├── GUIA_PUBLICACAO_GOOGLE_PLAY.md      # Passo a passo de publicação na Play Store
│   ├── SETUP_PAGAMENTOS_E_AUTH.md         # Configuração Pix, Stripe, Google Auth e IAP
│   ├── FLUXO_DE_DESENVOLVIMENTO_E_LANCAMENTO.md # Fluxo de releases e ciclo de vida
│   ├── DESIGN.md                          # Design System, cores, HUD e tipografia
│   └── STITCH_PROMPTS.md                  # Prompts de UI para prototipagem
│
├── store_assets/               # 🛍️ Recursos Visuais da Google Play Store
│   ├── google_play_icon_512x512.png       # Ícone oficial da loja (512x512)
│   ├── google_play_feature_graphic_1024x500.png # Gráfico de destaque (1024x500)
│   ├── product_icons/                     # Ícones dos produtos IAP
│   └── screenshots/                       # Capturas de tela (1280x2560 e 1024x500)
│
├── design_assets/              # 🎨 Protótipos e Mockups de Interface
│   └── stitch/                            # Telas geradas via Stitch with Google
│
├── public/                     # 🌐 Assets Públicos Estáticos
│   ├── brand/                             # Logos oficiais e variantes
│   ├── favicon* & icons                   # Ícones para PWA e navegadores
│   └── manifest.webmanifest               # Manifesto da aplicação PWA
│
├── src/                        # 💻 Código-Fonte da Aplicação
│   ├── admin/                             # Lógica do painel de administração
│   ├── game/                              # Engine 3D, grid, áudio procedural, placar
│   │   ├── HexGrid.js                     # Tabuleiro e conexões hexagonais
│   │   ├── HexTile.js                     # Geometrias 3D e materiais
│   │   ├── Leaderboard.js                 # Integração com ranking Supabase
│   │   └── SoundSystem.js                 # Síntese sonora Web Audio ASMR
│   ├── services/                          # Camada de serviços e integração
│   │   ├── auth.js                        # Login Google e jogador anônimo
│   │   ├── paymentService.js              # Roteador Pix / Stripe / RevenueCat
│   │   └── supabase.js                    # Cliente Supabase
│   ├── styles/                            # Módulos CSS (HUD, modais, tokens, ranking)
│   ├── main.js                            # Loop principal e inicialização do jogo
│   └── style.css / responsive.css         # Estilização global e responsividade
│
├── supabase/                   # ⚡ Backend Serverless Supabase
│   ├── functions/                         # Edge Functions Deno (Pix & Stripe Webhooks)
│   └── migrations/                        # Schemas SQL e tabelas do banco
│
├── scripts/                    # 🛠️ Scripts utilitários de build e assets
└── android/                    # 📱 Projeto Nativo Android (Android Studio / Gradle)
```

---

## 📚 Central de Documentação

Acesse a documentação completa nos guias abaixo:

- 📋 [**Planejamento & Status do Projeto**](docs/PLANEJAMENTO_E_STATUS.md) — Quadro de tarefas, status das etapas e checklist de publicação.
- 📱 [**Guia de Publicação na Google Play**](docs/GUIA_PUBLICACAO_GOOGLE_PLAY.md) — Instruções completas para configuração de ficha, keystore e envio de `.aab`.
- 💳 [**Setup de Pagamentos & Autenticação**](docs/SETUP_PAGAMENTOS_E_AUTH.md) — Configuração do Mercado Pago (Pix), Stripe (Cartão Web), Google Auth e RevenueCat.
- 🚀 [**Fluxo de Desenvolvimento & Lançamento**](docs/FLUXO_DE_DESENVOLVIMENTO_E_LANCAMENTO.md) — Ciclo de iterações, build local e deploy.
- 🎨 [**Guia de Design & Identidade Visual**](docs/DESIGN.md) — Cores, temas, tipografia, glassmorphism e design system.
- 💡 [**Prompts de UI do Stitch**](docs/STITCH_PROMPTS.md) — Catálogo de prompts utilizados para design de interface.
