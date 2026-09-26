# 📱 Guia Prático de Publicação — Hexa Infinity no Google Play & RevenueCat

Este guia contém todas as informações exatas, textos, arquivos e passos para você copiar e colar nas plataformas oficiais.

---

## 🧭 Visão Geral dos Dados do Aplicativo

| Campo | Valor Oficial |
| :--- | :--- |
| **Nome do App** | `Hexa Infinity` |
| **Nome do Pacote (Package ID)** | `com.brunodarwich.hexainfinity` |
| **Idioma Padrão** | `Português (Brasil) - pt-BR` |
| **Tipo do App** | `Jogo` (Game) |
| **Categoria** | `Quebra-cabeça` (Puzzle) / `Casual` |
| **Preço Base** | `Gratuito` (com compras no aplicativo) |
| **E-mail de Contato** | `brunodarwich@gmail.com` |
| **URL da Política de Privacidade** | `https://brunodarwich.github.io/hexa-sort-3d/privacy.html` |
| **Arquivo Release (.aab)** | `android/app/release/app-release.aab` |

---

## 1️⃣ Etapa 1: Criar o App no Google Play Console

1. Acesse o [Google Play Console](https://play.google.com/console).
2. Clique no botão azul **"Criar app"** no canto superior direito.
3. Preencha o formulário inicial:
   - **Nome do app**: `Hexa Infinity`
   - **Idioma padrão**: `Português (Brasil)`
   - **App ou jogo**: Selecione **Jogo**
   - **Gratuito ou pago**: Selecione **Gratuito**
4. Marque as caixas de aceite de políticas e leis de exportação dos EUA.
5. Clique em **Criar app**.

---

## 2️⃣ Etapa 2: Ficha Principal da Loja (Textos & Assets)

No menu lateral esquerdo, vá em **Apresentação na Google Play Store** > **Ficha principal da loja**.

### 📝 Textos da Loja:

- **Nome do app**:
  ```text
  Hexa Infinity
  ```

- **Breve descrição** (até 80 caracteres):
  ```text
  Empilhe, ordene e combine hexágonos 3D com física relaxante e combos infinitos!
  ```

- **Descrição completa** (copie e cole o texto abaixo):
  ```text
  Mergulhe no universo viciante e relaxante de Hexa Infinity!

  Hexa Infinity é um envolvente quebra-cabeça 3D que combina estratégia inteligente, visual minimalista moderno e uma física tátil incrivelmente satisfatória.

  🎯 COMO JOGAR:
  • Posicione as pilhas de peças hexagonais no tabuleiro.
  • Quando pilhas adjacentes possuem a mesma cor no topo, as peças se fundem automaticamente em cascatas dinâmicas.
  • Complete 10 ou mais peças da mesma cor para eliminá-las e liberar espaço no tabuleiro.
  • Crie combos épicos em cadeia para multiplicar seus pontos e bater recordes!

  ⚡ PODERES ESPECIAIS (POWER-UPS):
  • 🌪️ Reroll (Atualizar Deque): Troque suas 3 pilhas do deque para obter novas cores estratégicas.
  • ⚡ Raio Eliminador: Limpe instantaneamente até 3 pilhas perigosas do tabuleiro para escapar do game over.
  • 🌟 Super Combos: Ative sequências consecutivas e domine o ranking global.

  ✨ DESTAQUES DO HEXA INFINITY:
  • Gráficos 3D limpos e fluidos com iluminação dinâmica suave.
  • Sons táteis e efeitos sonoros relaxantes ASMR.
  • Desafio infinito sem limite de tempo: jogue no seu próprio ritmo para desestressar ou desafiar seu raciocínio lógico.
  • Otimizado para smartphones e tablets Android com desempenho ultrarrápido.

  Baixe agora o Hexa Infinity e desafie sua mente no puzzle 3D mais satisfatório da Play Store!
  ```

### 🎨 Imagens e Banners (Arquivos Prontos na pasta `store_assets/`):

- **Ícone do App (512x512 PNG)**:
  `store_assets/google_play_icon_512x512.png`
- **Banner de Destaque / Gráfico de Recursos (1024x500 PNG)**:
  `store_assets/google_play_feature_graphic_1024x500.png`
- **Capturas de Tela (Screenshots Formatadas)**:
  Disponíveis na pasta `store_assets/screenshots/` com formatos verticais (1280x2560) e horizontais (1024x500) prontas para upload no Console.

---

## 3️⃣ Etapa 3: Subir o Pacote `.aab` (Teste Interno)

No menu lateral esquerdo, vá em **Testes** > **Teste interno**:

1. Clique em **Criar novo lançamento**.
2. No campo **Pacotes de apps**, faça o upload do arquivo assinado gerado no seu computador:
   ```text
   c:\Users\Bruno\Documents\antigravity\mysterious-hawking\android\app\release\app-release.aab
   ```
3. Nome da versão: `1.0.0 (1)`
4. Notas de lançamento:
   ```text
   Lançamento inicial do Hexa Infinity para testes de jogabilidade, sistema de ranking e compras no app.
   ```
5. Clique em **Avançar** e **Salvar**.

---

## 4️⃣ Etapa 4: Configurar Compras In-App (Google Play & RevenueCat)

### 🛒 No Google Play Console:
Vá em **Monetização** > **Produtos no app**:
Crie os 3 produtos com os seguintes IDs:

1. **Pacote 4x Atualizar (Reroll)**:
   - **ID do produto**: `pack_reroll`
   - **Nome**: `Pacote 4x Atualizar Deque`
   - **Descrição**: `Receba 4 usos do poder Atualizar para renovar suas peças.`
   - **Preço**: `R$ 1,00`
   - **Status**: Ativo

2. **Pacote 4x Raios**:
   - **ID do produto**: `pack_lightning`
   - **Nome**: `Pacote 4x Raios Eliminadores`
   - **Descrição**: `Receba 4 usos do poder Raio para limpar 3 pilhas do tabuleiro.`
   - **Preço**: `R$ 1,00`
   - **Status**: Ativo

3. **Combo Mestre (Mega Pack)**:
   - **ID do produto**: `combo_pack`
   - **Nome**: `Combo Mestre (8x Raios + 8x Atualizar)`
   - **Descrição**: `Super pacote com 8 Raios e 8 Atualizações com desconto especial.`
   - **Preço**: `R$ 2,99`
   - **Status**: Ativo

---

### 🐱 No RevenueCat:

1. Acesse o painel do [RevenueCat](https://app.revenuecat.com).
2. Crie o projeto **Hexa Infinity**.
3. Em **Apps**, adicione um app **Google Play Store**:
   - **App name**: `Hexa Infinity Android`
   - **Google Play package name**: `com.brunodarwich.hexainfinity`
4. Em **API Keys**, copie a **Public API Key do Google** (que começa com `goog_...`).
5. Cole no seu arquivo `.env`:
   ```env
   VITE_REVENUECAT_GOOGLE_API_KEY=goog_sua_chave_aqui
   ```
6. Em **Products** no RevenueCat, cadastre os mesmos identificadores:
   - `pack_reroll`
   - `pack_lightning`
   - `combo_pack`

---

## 5️⃣ Etapa 5: Perfil para Pagamentos (Merchant Account)

Para você receber o dinheiro das vendas em sua conta bancária:
1. No menu principal do Google Play Console, vá em **Configurações** > **Perfil para pagamentos** (ou **Configurações da conta** > **Comerciante**).
2. Preencha seus dados de pessoa física (CPF) ou jurídica (CNPJ).
3. Cadastre a sua conta bancária brasileira para recebimento dos repasses mensais automáticos do Google.
