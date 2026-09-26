# 🚀 Guia Completo e Prompts do Hexa Infinity para o Stitch with Google

Este documento traz a pesquisa detalhada sobre o **Stitch with Google** e um conjunto completo de prompts estruturados para você gerar, prototipar e exportar cada tela do jogo **Hexa Infinity** com alta fidelidade visual.

---

## 🔍 1. O que é o Stitch with Google?

O **Stitch with Google** (disponível em [stitch.withgoogle.com](https://stitch.withgoogle.com)) é uma ferramenta experimental de design de interfaces e prototipagem com inteligência artificial desenvolvida pelo **Google Labs**, potencializada pelos modelos **Gemini 2.5 / 3.8**.

### Principais Recursos:
1. **Canvas AI-Native ("Vibe Coding" & Design):** Você descreve o aplicativo em linguagem natural ou envia esboços (wireframes/screenshots), e o Stitch gera designs de alta fidelidade completos, com fluxos entre telas e layouts consistentes.
2. **Design System & DESIGN.md:** Permite carregar um arquivo `DESIGN.md` (criado neste projeto!) para definir paleta de cores, tipografia, cantos arredondados, sombras e componentes reaproveitáveis.
3. **Exportação com 1 Clique para o Figma:** Você pode enviar qualquer tela gerada diretamente para o Figma para refinar com componentes e auto-layout.
4. **Geração de Código Frontend Real:** O Stitch gera código pronto (HTML + Tailwind CSS ou componentes React), facilitando a implementação direta no código.
5. **Integração MCP (Model Context Protocol):** Seu ambiente no Antigravity já possui ferramentas do Stitch configuradas (`create_project`, `upload_design_md`, `generate_screen_from_text`, etc.).

---

## 🎨 2. Como Usar no Stitch (Passo a Passo)

1. Acesse [stitch.withgoogle.com](https://stitch.withgoogle.com) e faça login com sua conta Google.
2. Crie um novo projeto chamado **"Hexa Infinity Mobile & Web Game"**.
3. No painel de Design System, cole o conteúdo do arquivo [`DESIGN.md`](./DESIGN.md) que acabamos de criar.
4. Para cada tela abaixo, copie o bloco de prompt correspondente e envie no chat do Stitch.
5. Utilize os botões de variante e o refinamento ("zoom-in") para ajustar espaçamentos ou detalhes finos.

---

## 📱 3. Prompts Estruturados por Tela (Framework PTCF)

Seguindo o framework recomendado pelo Google Labs (**PTCF**: *Persona, Task, Context, Format*), use os prompts abaixo:

---

### 🖥️ Tela 1: Gameplay Principal & HUD In-Game (Mobile & Desktop)

```markdown
**Persona:** Especialista em UI/UX para jogos casuais mobile e web 3D (estilo Royal Match, Hexa Sort e Candy Crush).

**Task:** Crie a tela principal de gameplay in-game para "Hexa Infinity" no modo infinito.

**Context:**
- Dispositivo: Mobile Portrait (390x844px) com adaptação para Desktop widescreen.
- Visual: Moderno, tátil ("juicy"), elementos em vidro fosco (glassmorphism) com bordas suaves e sombras 3D nos botões.
- A tela é dividida em 5 seções verticais organizadas:
  1. Top HUD Header:
     - Barra de Utilidades: Pílula de perfil do jogador ("👤 Bruno ✏️") à esquerda; Grupo de botões bolha 3D redondos à direita: Loja ("🛒" com brilho dourado pulsante), Alternar Tema ("🌙"), Som ("🔊"), Placar ("🏆"), Reiniciar ("🔄"), Ajuda ("❔").
     - Barra de Gameplay: Cápsula de Moedas/Pontuação preta com badge dourada ("🪙 1.450") e um botão verde de adicionar ("+"); Cápsula central de Nível em degradê com badge arco-íris ("🌈 NÍVEL 4 ✨"); Pílula de cronômetro esportivo ("⏱️ 03:42") e Pílula de Recorde ("👑 REC 3.200").
  2. Zona de Notificação Flutuante (Central):
     - Banner comemorativo de combo: "🔥 SEQUÊNCIA: COMBO x3!" em tons degradê laranja/fogo com efeito pop-in.
  3. Área Central do Tabuleiro 3D:
     - Visão isométrica de uma grade hexagonal com pilhas de cartas coloridas em 3D (vermelho, amarelo, azul, verde, roxo) empilhadas e se fundindo.
  4. Dock Inferior de Power-Ups:
     - Cápsula flutuante em vidro fosco com 2 botões táteis:
       - Botão "Atualizar Deque": Ícone azul celeste ("🔄"), título "Atualizar" e badge de custo verde ("R$ 0,25" ou "1x Usar").
       - Botão "Raio Destruidor": Ícone amarelo elétrico ("⚡"), título "Raio" e badge de custo verde ("R$ 0,25" ou "Grátis").
  5. Deck Inferior de Cartas & Dica:
     - 3 pilhas hexagonais prontas para serem arrastadas para o tabuleiro.
     - Pílula flutuante com texto discreto: "Escolha uma pilha e toque no tabuleiro. Ou arraste para jogar."

**Format:** Layout de alta fidelidade para tela mobile, componentes com Tailwind CSS, botões com efeito 3D (relevo inferior) e paleta vibrante.
```

---

### 🏆 Tela 2: Modal de Game Over & Segunda Chance (Revive)

```markdown
**Persona:** Designer sênior de UI focado em monetização e retenção para jogos casuais.

**Task:** Desenhe o modal de Game Over com seção de Segunda Chance (Revive) para o jogo "Hexa Infinity".

**Context:**
- Overlay escuro semi-transparente com desfoque de fundo (backdrop-blur).
- Card central moderno com cantos arredondados (28px) e borda de destaque avermelhada sutil.
- Conteúdo do Card:
  1. Topo: Badge vermelho pastel "GAME OVER", Título marcante "Fim de Partida!" e subtítulo cinza "O tabuleiro ficou sem espaços livres válidos."
  2. Grid de Estatísticas (2x2):
     - "PONTUAÇÃO FINAL": 3.840 (destaque em dourado/âmbar grande)
     - "TEMPO DE SOBREVIVÊNCIA": 06:18
     - "PILHAS ELIMINADAS": 42
     - "MAIOR COMBO": x5
  3. Faixa Comemorativa: "🎉 NOVO RECORDE PESSOAL! 🎉" com fundo amarelo ouro sutil e borda dourada.
  4. Confirmação do Ranking: Pílula verde suave "✅ Registrado no Ranking como: Bruno" com botão de link "Trocar".
  5. Seção de Segunda Chance / Salva-Vidas:
     - Caixa destacada com borda tracejada âmbar e badge "SEGUNDA CHANCE ⚡".
     - Subtítulo: "Não perca seus pontos! Salve a partida e continue jogando agora:".
     - Dois botões de ação horizontais ou empilhados:
       - Botão 1: "⚡ Raio Salva-Vidas - Eliminar 3 pilhas do tabuleiro" com preço "R$ 0,25".
       - Botão 2: "🔄 Novo Deque - Trocar as 3 pilhas do deque" com preço "R$ 0,25".
  6. Rodapé: Botão primário verde vibrante em 3D de largura total: "Jogar Novamente 🔄".

**Format:** UI Card flutuante com sombra profunda, botões de alta conversão, tipografia limpa (Fredoka para títulos, Outfit para dados numéricos).
```

---

### 🛒 Tela 3: Loja de Power-Ups & Pacotes Promocionais

```markdown
**Persona:** Designer especialista em e-commerce e monetização de jogos (In-Game Store UI).

**Task:** Desenhe a tela de Loja de Power-Ups para o "Hexa Infinity".

**Context:**
- Card modal flutuante em vidro fosco ou fundo limpo com botão fechar circular ("✕") no topo superior direito.
- Cabeçalho: Ícone 3D ("⚡🛒"), título "Loja de Power-Ups", subtítulo "Adquira créditos e use seus poderes a qualquer momento sem pausar o jogo!".
- Grid de Produtos (2 colunas + destaque):
  - Item 1: "1x Raio" | Ícone: ⚡ | Descrição: "Elimina 3 pilhas do tabuleiro" | Preço: R$ 0,25 (Botão verde esmeralda).
  - Item 2: "1x Atualizar" | Ícone: 🔄 | Descrição: "Troca as 3 pilhas do deque" | Preço: R$ 0,25.
  - Item 3 (Em destaque com fita "POPULAR 🔥"): "10x Raios" | Ícone: ⚡⚡ | Descrição: "Pacote de sobrevivência" | Preço: R$ 2,50 | Borda dourada com fundo âmbar suave.
  - Item 4: "10x Atualizar" | Ícone: 🔄🔄 | Descrição: "Pacote de renovação" | Preço: R$ 2,50.
  - Item 5 (Card Largo de largura total com fita "SUPER DESCONTO ✨"): "Combo Mestre" | Ícones: ⚡🔄 | Descrição: "10x Raios + 10x Atualizar" | Preço: R$ 4,50 | Borda roxa neon com gradiente lilás suave.
- Rodapé: Botão secundário "Fechar".

**Format:** Cards com micro-interações de elevação ao passar o cursor, badges de desconto coloridas e botões de compra táteis com feedback visual claro.
```

---

### 💳 Tela 4: Modal de Pagamento Instantâneo Pix & Cartão Internacional

```markdown
**Persona:** Designer de Fintech e UI de Pagamentos instantâneos com foco no mercado brasileiro e global.

**Task:** Crie o modal de checkout instantâneo Pix e Cartão de Crédito para compra de power-ups no "Hexa Infinity".

**Context:**
- Card modal elegante e seguro com visual bancário moderno.
- Seletor de Região no Topo: Pílula arredondada com abas "🇧🇷 Brasil (Pix)" (ativa) e "🌐 Internacional (Card)".
- Ícone do produto em destaque (ex: "⚡") e Título: "Ativar Raio Destruidor".
- Resumo da Compra: Caixa suave exibindo o nome do item ("1x Raio Destruidor"), descrição curta e valor em destaque verde ("R$ 0,25").
- Seção Pix Ativa:
  - QR Code centralizado em moldura branca com cantos arredondados e sombra suave.
  - Campo de entrada com o código Pix Copia e Cola e botão "Copiar Código Pix 📋".
  - Notificação de status com indicador de radar pulsante verde: "Aguardando pagamento no app do banco... Ativação instantânea!".
  - Botão de simulação para testes (modo sandbox).
- Seção Internacional (Cartão):
  - Explicação sobre o pacote Stripe de $1.00 USD e botão roxo característico da Stripe com ícone de cadeado de segurança.
- Rodapé: Botão de cancelar discreto.

**Format:** Layout de alta confiança e segurança, contraste refinado, QR Code nítido, elementos responsivos.
```

---

### 🥇 Tela 5: Modal de Placar de Recordes (Leaderboard Global)

```markdown
**Persona:** UX Designer para sistemas de gamificação e placares de líderes.

**Task:** Crie a tela do Placar de Recordes (Leaderboard) para "Hexa Infinity".

**Context:**
- Cabeçalho: Ícone de troféu ("🏆"), título "Placar de Recordes".
- Alternador de Abas: "Global Online" (ativa) e "Seus Recordes".
- Tabela com Podio e Rolagem Suave:
  - 1º Lugar (Ouro): Card com borda dourada, fundo amarelo suave, coroa "👑 1º", foto/avatar, nome "MestreHexa", pontuação "12.850 pts" e tempo "18:24".
  - 2º Lugar (Prata): Borda prateada, medalha "🥈 2º", nome "Alice_Sort", pontuação "10.420 pts".
  - 3º Lugar (Bronze): Borda bronze, medalha "🥉 3º", nome "CarlosGamer", pontuação "8.910 pts".
  - Linhas seguintes (4º ao 10º): Cards neutros compactos e bem alinhados.
  - Linha fixa do próprio usuário destacada em azul/ciano: "Você (Bruno) - 14º Lugar - 3.840 pts".
- Rodapé: Botão secundário "Fechar".

**Format:** Visual competitivo e estimulante, tipografia com números tabulares alinhados à direita, avatares circulares e scroll estilizado.
```

---

### 👤 Tela 6: Modal de Perfil do Jogador & Login com Google

```markdown
**Persona:** Especialista em Onboarding e Autenticação Social.

**Task:** Crie a tela modal de Boas-Vindas, Apelido e Login Social com Google para o "Hexa Infinity".

**Context:**
- Card modal acolhedor com ícone de controle ("🎮"), título "Defina seu Apelido" e texto explicativo sobre o Ranking Global.
- Campo de texto estilizado com ícone de usuário ("👤"), placeholder "Ex: Bruno, MestreHexa..." e botão de envio verde largo "Salvar e Jogar 🚀".
- Divisor visual: "── OU CONECTE-SE ──".
- Botão oficial Google: Fundo branco, logo multicolorido da Google (G), texto "Entrar com Google".
- Estado conectado: Card do jogador com foto do perfil (Google Avatar), Nome completo em negrito, e-mail em cinza e botão vermelho "Sair".
- Dica no rodapé: "💡 Salvo automaticamente em cache para seus próximos acessos neste dispositivo."

**Format:** Design limpo, amigável e com tipografia legível.
```

---

### 📖 Tela 7: Tutorial Interativo "Como Jogar"

```markdown
**Persona:** Designer de Tutoriais e Onboarding em Jogos Mobile.

**Task:** Crie o modal instrutivo passo a passo de "Como Jogar Hexa Sort".

**Context:**
- Card modal com título "Como Jogar Hexa Sort" e botão de fechar.
- Lista de passos ilustrados em cards com ícones grandes:
  1. Ícone "1️⃣" - "Posicione as Pilhas": Arraste as pilhas de cartas do deque para espaços vazios no tabuleiro hexagonal.
  2. Ícone "2️⃣" - "Regras do Ímã": Pilhas de cor única e maior quantidade puxam cartas da mesma cor de pilhas vizinhas.
  3. Ícone "3️⃣" - "Estouro Total & Bônus": Junte 10 ou mais cartas da mesma cor para fazê-las explodir! Cartas extras dão multiplicadores de pontos.
  4. Ícone "4️⃣" - "Reações em Cadeia": Cartas que se revelam embaixo podem disparar combos automáticos!
  5. Ícone "5️⃣" - "Modo Infinito": O jogo continua até o tabuleiro lotar. Sobreviva o máximo que puder!
- Rodapé: Botão verde de ação em destaque "Entendi, Vamos Jogar!".

**Format:** Cards com excelente espaçamento, texto escaneável e destaques em negrito.
```

---

## 💡 4. Dicas de Ouro ao Usar no Stitch

- **Para variar o estilo:** No Stitch, selecione qualquer tela e clique em *"Generate Variants"* para ver versões minimalistas, neomórficas, cyberpunk ou 3D arcade.
- **Para exportar para o Figma:** No menu superior direito do Stitch, selecione **"Export to Figma"** para receber o arquivo com frames e componentes nativos.
- **Para gerar o código React ou Tailwind:** Use a opção **"View Code"** no Stitch para copiar o JSX e as classes CSS diretamente para o projeto.
