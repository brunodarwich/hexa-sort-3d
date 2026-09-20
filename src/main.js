/**
 * src/main.js
 * Application entry point, UI event bindings, Google Auth, Power-Ups, Pagamentos Pix & Stripe e Placar.
 */

import { GameManager } from './game/GameManager.js';
import { LeaderboardManager } from './game/Leaderboard.js';
import { authService } from './services/auth.js';
import { paymentService } from './services/paymentService.js';

document.addEventListener('DOMContentLoaded', async () => {
  const canvasContainer = document.getElementById('canvas-container');
  const game = new GameManager(canvasContainer);
  const leaderboard = game.leaderboard;

  // --- UI Elements ---
  const btnTheme = document.getElementById('btn-theme');
  const btnSound = document.getElementById('btn-sound');
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const btnRestart = document.getElementById('btn-restart');
  const btnInfo = document.getElementById('btn-info');
  const btnShop = document.getElementById('btn-shop');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnSubmitScore = document.getElementById('btn-submit-score');
  const playerNicknameInput = document.getElementById('player-nickname');
  const submitStatus = document.getElementById('submit-status');

  // Nickname & Player Identity Elements
  const btnPlayerProfile = document.getElementById('btn-player-profile');
  const headerPlayerName = document.getElementById('header-player-name');
  const modalNickname = document.getElementById('modal-nickname');
  const formNickname = document.getElementById('form-nickname');
  const inputWelcomeNickname = document.getElementById('input-welcome-nickname');
  const btnEditNicknameGo = document.getElementById('btn-edit-nickname-go');
  const btnCancelEditGo = document.getElementById('btn-cancel-edit-go');
  const autoSubmitBadge = document.getElementById('auto-submit-badge');
  const manualNicknameRow = document.getElementById('manual-nickname-row');
  const goNicknameDisplay = document.getElementById('go-nickname-display');

  // Google Auth Elements
  const btnGoogleLogin = document.getElementById('btn-google-login');
  const googleLoggedInfo = document.getElementById('google-logged-info');
  const googleAvatarImg = document.getElementById('google-avatar-img');
  const googleUserName = document.getElementById('google-user-name');
  const googleUserEmail = document.getElementById('google-user-email');
  const btnGoogleLogout = document.getElementById('btn-google-logout');

  // Power-Ups Dock Elements
  const btnPowerupReroll = document.getElementById('btn-powerup-reroll');
  const btnPowerupLightning = document.getElementById('btn-powerup-lightning');
  const badgeRerollCost = document.getElementById('badge-reroll-cost');
  const badgeLightningCost = document.getElementById('badge-lightning-cost');

  // Game Over Second Chance Elements
  const btnGoReviveLightning = document.getElementById('btn-go-revive-lightning');
  const btnGoReviveReroll = document.getElementById('btn-go-revive-reroll');
  const goLightningPrice = document.getElementById('go-lightning-price');
  const goRerollPrice = document.getElementById('go-reroll-price');

  // Modals
  const modalInfo = document.getElementById('modal-info');
  const modalLeaderboard = document.getElementById('modal-leaderboard');
  const modalGameOver = document.getElementById('modal-gameover');
  const modalPayment = document.getElementById('modal-payment');
  const modalShop = document.getElementById('modal-shop');

  // Payment Modal Elements
  const tabRegionBr = document.getElementById('tab-region-br');
  const tabRegionIntl = document.getElementById('tab-region-intl');
  const paymentPixArea = document.getElementById('payment-pix-area');
  const paymentIntlArea = document.getElementById('payment-intl-area');
  const paymentIconBadge = document.getElementById('payment-icon-badge');
  const paymentTitle = document.getElementById('payment-title');
  const paymentSubtitle = document.getElementById('payment-subtitle');
  const summaryProductName = document.getElementById('summary-product-name');
  const summaryProductDesc = document.getElementById('summary-product-desc');
  const summaryProductPrice = document.getElementById('summary-product-price');
  const pixLoadingState = document.getElementById('pix-loading-state');
  const pixContentState = document.getElementById('pix-content-state');
  const pixQrcodeImg = document.getElementById('pix-qrcode-img');
  const inputPixCopiacola = document.getElementById('input-pix-copiacola');
  const btnCopyPix = document.getElementById('btn-copy-pix');
  const btnSimulatePix = document.getElementById('btn-simulate-pix');
  const btnStripeCheckout = document.getElementById('btn-stripe-checkout');

  // Leaderboard Elements
  const tabGlobal = document.getElementById('tab-global');
  const tabLocal = document.getElementById('tab-local');
  const leaderboardList = document.getElementById('leaderboard-list');
  const leaderboardLoading = document.getElementById('leaderboard-loading');
  let currentLeaderboardTab = 'global'; // 'global' | 'local'

  // Variável para armazenar a ação a ser executada logo após pagamento bem-sucedido
  let pendingPaymentSuccessAction = null;
  let currentPaymentOrderId = null;
  let currentSelectedPaymentItem = 'lightning';

  // --- THEME MANAGEMENT (LIGHT / DARK NEON) ---
  const THEME_KEY = 'hexa_sort_theme';
  function getInitialTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  let activeTheme = getInitialTheme();

  function applyTheme(theme, showFeedback = false) {
    activeTheme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}

    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#090d18' : '#d8dce4');
    }

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    if (btnTheme) {
      if (theme === 'dark') {
        btnTheme.setAttribute('title', 'Mudar para Modo Claro (Porcelain Garden)');
        btnTheme.setAttribute('aria-label', 'Mudar para Modo Claro');
      } else {
        btnTheme.setAttribute('title', 'Mudar para Modo Escuro (Velvet Meadow)');
        btnTheme.setAttribute('aria-label', 'Mudar para Modo Escuro');
      }
    }

    if (game && typeof game.setTheme === 'function') {
      game.setTheme(theme);
    }

    if (showFeedback) {
      showToast(theme === 'dark' ? 'Modo Velvet Meadow (Cozy) ativado! 🌌' : 'Modo Porcelain Garden (Claro) ativado! ✨');
    }
  }

  applyTheme(activeTheme, false);

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      game.sound.playClick();
      const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });
  }

  // --- GOOGLE AUTH & USER PROFILE ---
  function updatePlayerNicknameUI(name, avatarUrl = null) {
    const displayName = name || 'Jogador';
    if (headerPlayerName) headerPlayerName.textContent = displayName;
    if (goNicknameDisplay) goNicknameDisplay.textContent = displayName;
    if (playerNicknameInput) playerNicknameInput.value = displayName;

    // Atualiza avatar circular no cabeçalho
    const avatarCircle = btnPlayerProfile?.querySelector('.player-avatar-circle');
    if (avatarCircle) {
      if (avatarUrl) {
        avatarCircle.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar" />`;
      } else {
        avatarCircle.innerHTML = `<span class="material-symbols-outlined text-[17px]" style="font-variation-settings: 'FILL' 1;">face</span>`;
      }
    }
  }

  // Monitora autenticação com Google
  authService.onAuthStateChanged(async (user) => {
    if (user) {
      const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Jogador Google';
      const avatarUrl = user.user_metadata?.avatar_url || null;

      leaderboard.setSavedNickname(displayName);
      updatePlayerNicknameUI(displayName, avatarUrl);

      if (btnGoogleLogin) btnGoogleLogin.classList.add('hidden');
      if (googleLoggedInfo) {
        googleLoggedInfo.classList.remove('hidden');
        if (googleUserName) googleUserName.textContent = displayName;
        if (googleUserEmail) googleUserEmail.textContent = user.email || '';
        if (googleAvatarImg) {
          googleAvatarImg.src = avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.id;
        }
      }

      showToast(`Conectado como ${displayName}! 🚀`);
      await paymentService.fetchInventory();
    } else {
      const savedNick = leaderboard.getSavedNickname();
      updatePlayerNicknameUI(savedNick, null);

      if (btnGoogleLogin) btnGoogleLogin.classList.remove('hidden');
      if (googleLoggedInfo) googleLoggedInfo.classList.add('hidden');
    }
  });

  // Login com Google
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', async () => {
      game.sound.playClick();
      try {
        await authService.signInWithGoogle();
      } catch (err) {
        showToast('Falha ao conectar com Google. Verifique a configuração.');
      }
    });
  }

  // Logout
  if (btnGoogleLogout) {
    btnGoogleLogout.addEventListener('click', async () => {
      game.sound.playClick();
      await authService.signOut();
      showToast('Desconectado com sucesso.');
    });
  }

  // Inicialização do apelido e sincronização de inventário
  const savedNick = leaderboard.getSavedNickname();
  if (savedNick) {
    updatePlayerNicknameUI(savedNick);
  } else {
    setTimeout(() => {
      if (modalNickname) {
        modalNickname.classList.remove('hidden');
        if (inputWelcomeNickname) inputWelcomeNickname.focus();
      }
    }, 450);
  }

  // Sincronizar inventário inicial
  await paymentService.fetchInventory();

  // Abrir modal de perfil
  if (btnPlayerProfile) {
    btnPlayerProfile.addEventListener('click', () => {
      game.sound.playClick();
      if (inputWelcomeNickname) {
        inputWelcomeNickname.value = leaderboard.getSavedNickname();
      }
      if (modalNickname) {
        modalNickname.classList.remove('hidden');
        if (inputWelcomeNickname) inputWelcomeNickname.focus();
      }
    });
  }

  // Salvar formulário de apelido
  if (formNickname) {
    formNickname.addEventListener('submit', (e) => {
      e.preventDefault();
      game.sound.playClick();
      const newNick = (inputWelcomeNickname.value || '').trim();
      if (newNick) {
        leaderboard.setSavedNickname(newNick);
        updatePlayerNicknameUI(newNick);
        if (modalNickname) modalNickname.classList.add('hidden');
        showToast(`Apelido salvo: ${newNick} 🎉`);
      }
    });
  }

  // --- POWER-UPS UI & INVENTORY SYNC ---
  function updatePowerUpBadges(inv) {
    const region = paymentService.detectPlayerRegion();
    const isBr = region === 'BR';
    const singlePriceText = isBr ? 'R$ 0,25' : '$0.10';

    // Reroll Badge
    if (badgeRerollCost) {
      if (inv.reroll > 0) {
        badgeRerollCost.textContent = `${inv.reroll}x Usar`;
        badgeRerollCost.className = 'powerup-badge free';
      } else {
        badgeRerollCost.textContent = singlePriceText;
        badgeRerollCost.className = 'powerup-badge';
      }
    }

    // Lightning Badge
    if (badgeLightningCost) {
      if (inv.lightning > 0) {
        badgeLightningCost.textContent = `${inv.lightning}x Usar`;
        badgeLightningCost.className = 'powerup-badge free';
      } else {
        badgeLightningCost.textContent = singlePriceText;
        badgeLightningCost.className = 'powerup-badge';
      }
    }

    // Game Over Revive Badges
    if (goLightningPrice) {
      goLightningPrice.textContent = inv.lightning > 0 ? `${inv.lightning}x Grátis` : singlePriceText;
    }
    if (goRerollPrice) {
      goRerollPrice.textContent = inv.reroll > 0 ? `${inv.reroll}x Grátis` : singlePriceText;
    }
  }

  paymentService.onInventoryChange((inv) => {
    updatePowerUpBadges(inv);
  });

  // --- POWER-UP: ATUALIZAR DEQUE (RE-ROLL) ---
  if (btnPowerupReroll) {
    btnPowerupReroll.addEventListener('click', async () => {
      game.sound.playClick();
      const inv = paymentService.getInventory();

      if (inv.reroll > 0) {
        await paymentService.consumePowerUp('reroll');
        await game.rerollDeck();
        showToast('Deque atualizado! 🔄');
      } else {
        // Abrir modal de pagamento para compra instantânea
        openPaymentModal('reroll', async () => {
          await paymentService.consumePowerUp('reroll');
          await game.rerollDeck();
          showToast('Power-up ativado com sucesso! 🔄');
        });
      }
    });
  }

  // --- POWER-UP: RAIO DESTRUIDOR (LIGHTNING STRIKE) ---
  if (btnPowerupLightning) {
    btnPowerupLightning.addEventListener('click', async () => {
      game.sound.playClick();
      const occupied = game.hexGrid.getAllSlots().filter(s => s.stack.length > 0);
      if (occupied.length === 0) {
        showToast('Não há pilhas no tabuleiro para eliminar.');
        return;
      }

      const inv = paymentService.getInventory();

      if (inv.lightning > 0) {
        await paymentService.consumePowerUp('lightning');
        const res = await game.lightningStrike();
        if (res.success) {
          showToast(`⚡ Raio eliminou ${res.count} pilha(s)!`);
        }
      } else {
        // Abrir modal de pagamento para compra instantânea
        openPaymentModal('lightning', async () => {
          await paymentService.consumePowerUp('lightning');
          const res = await game.lightningStrike();
          if (res.success) {
            showToast(`⚡ Raio eliminou ${res.count} pilha(s)!`);
          }
        });
      }
    });
  }

  // --- BOOSTER LATERAL: FOGUETE INTELIGENTE (50K) ---
  const btnBoosterRocket = document.getElementById('btn-booster-rocket');
  if (btnBoosterRocket) {
    btnBoosterRocket.addEventListener('click', async () => {
      game.sound.playClick();
      if (game.rocketCount <= 0) {
        const remaining = Math.max(0, 50000 - game.rocketCharge);
        showToast(`🚀 Foguete recarregando! Faltam ${remaining.toLocaleString('pt-BR')} pts.`);
        return;
      }
      const occupied = game.hexGrid.getAllSlots().filter(s => s.stack.length > 0);
      if (occupied.length === 0) {
        showToast('Não há pilhas no tabuleiro para detonar.');
        return;
      }
      const res = await game.triggerRocketBooster();
      if (res && res.success) {
        showToast(`🚀 Foguete detonou ${res.count} carta(s)!`);
      } else if (res && res.reason) {
        showToast(res.reason);
      }
    });
  }

  // --- BOOSTER LATERAL: TREVO DA SORTE (100K) ---
  const btnBoosterClover = document.getElementById('btn-booster-clover');
  if (btnBoosterClover) {
    btnBoosterClover.addEventListener('click', async () => {
      game.sound.playClick();
      if (game.cloverCount <= 0) {
        const remaining = Math.max(0, 100000 - game.cloverCharge);
        showToast(`🍀 Trevo recarregando! Faltam ${remaining.toLocaleString('pt-BR')} pts.`);
        return;
      }
      const res = await game.triggerCloverBooster();
      if (res && res.success) {
        showToast('🍀 Trevo renovou seu deque com 8 cartas estratégicas!');
      } else if (res && res.reason) {
        showToast(res.reason);
      }
    });
  }

  // --- SEGUNDA CHANCE NO GAME OVER ---
  if (btnGoReviveLightning) {
    btnGoReviveLightning.addEventListener('click', async () => {
      game.sound.playClick();
      const inv = paymentService.getInventory();

      if (inv.lightning > 0) {
        await paymentService.consumePowerUp('lightning');
        await game.lightningStrike();
        showToast('⚡ Raio ativado! Partida retomada!');
      } else {
        openPaymentModal('lightning', async () => {
          await paymentService.consumePowerUp('lightning');
          await game.lightningStrike();
          showToast('⚡ Raio ativado! Partida retomada!');
        });
      }
    });
  }

  if (btnGoReviveReroll) {
    btnGoReviveReroll.addEventListener('click', async () => {
      game.sound.playClick();
      const inv = paymentService.getInventory();

      if (inv.reroll > 0) {
        await paymentService.consumePowerUp('reroll');
        await game.rerollDeck();
        showToast('🔄 Deque renovado!');
      } else {
        openPaymentModal('reroll', async () => {
          await paymentService.consumePowerUp('reroll');
          await game.rerollDeck();
          showToast('🔄 Deque renovado!');
        });
      }
    });
  }

  // --- MODAL DE PAGAMENTO (PIX & STRIPE) ---
  const ITEM_DETAILS = {
    reroll: { name: '1x Atualizar Deque', desc: 'Troca as 3 pilhas do deque inferior', icon: '🔄', priceBr: 'R$ 0,25', priceIntl: '$0.10' },
    lightning: { name: '1x Raio Destruidor', desc: 'Elimina 3 pilhas do tabuleiro', icon: '⚡', priceBr: 'R$ 0,25', priceIntl: '$0.10' },
    pack_reroll: { name: '10x Atualizar Deque', desc: 'Pacote de 10 renovações de deque', icon: '🔄🔄', priceBr: 'R$ 2,50', priceIntl: '$1.00' },
    pack_lightning: { name: '10x Raios Destruidores', desc: 'Pacote de 10 raios para emergências', icon: '⚡⚡', priceBr: 'R$ 2,50', priceIntl: '$1.00' },
    combo_pack: { name: 'Combo Mestre Hexa', desc: '10x Raios + 10x Atualizações de Deque', icon: '⚡🔄', priceBr: 'R$ 4,50', priceIntl: '$1.80' }
  };

  function openPaymentModal(itemType, onSuccessCallback = null) {
    currentSelectedPaymentItem = itemType;
    pendingPaymentSuccessAction = onSuccessCallback;

    const details = ITEM_DETAILS[itemType] || ITEM_DETAILS.lightning;

    if (paymentIconBadge) paymentIconBadge.textContent = details.icon;
    if (paymentTitle) paymentTitle.textContent = `Ativar ${details.name}`;
    if (summaryProductName) summaryProductName.textContent = details.name;
    if (summaryProductDesc) summaryProductDesc.textContent = details.desc;
    if (summaryProductPrice) summaryProductPrice.textContent = details.priceBr;

    if (modalPayment) modalPayment.classList.remove('hidden');

    // Gera imediatamente o QR Code Pix
    loadPixOrder(itemType);
  }

  async function loadPixOrder(itemType) {
    if (pixLoadingState) pixLoadingState.classList.remove('hidden');
    if (pixContentState) pixContentState.classList.add('hidden');

    try {
      const order = await paymentService.createPixOrder(itemType);
      currentPaymentOrderId = order.orderId;

      // Exibir imagem do QR Code
      if (pixQrcodeImg) {
        if (order.qrCodeBase64) {
          pixQrcodeImg.src = `data:image/png;base64,${order.qrCodeBase64}`;
        } else {
          pixQrcodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(order.qrCode)}`;
        }
      }

      if (inputPixCopiacola) {
        inputPixCopiacola.value = order.qrCode;
      }

      // Exibir botão de simulação para desenvolvimento se estiver em sandbox
      if (btnSimulatePix) {
        btnSimulatePix.classList.remove('hidden');
      }

      if (pixLoadingState) pixLoadingState.classList.add('hidden');
      if (pixContentState) pixContentState.classList.remove('hidden');

      // Escutar confirmação do pagamento via Supabase Realtime
      paymentService.subscribeToOrder(order.orderId, async () => {
        handlePaymentSuccess();
      });
    } catch (err) {
      if (pixLoadingState) {
        pixLoadingState.innerHTML = `<span>Erro ao gerar Pix: ${err.message}</span>`;
      }
    }
  }

  // Copiar código Pix
  if (btnCopyPix) {
    btnCopyPix.addEventListener('click', () => {
      game.sound.playClick();
      if (inputPixCopiacola && inputPixCopiacola.value) {
        navigator.clipboard.writeText(inputPixCopiacola.value);
        btnCopyPix.textContent = 'Copiado! ✅';
        setTimeout(() => {
          btnCopyPix.textContent = 'Copiar Código Pix 📋';
        }, 2200);
      }
    });
  }

  // Simular Pagamento em Ambiente de Teste
  if (btnSimulatePix) {
    btnSimulatePix.addEventListener('click', async () => {
      game.sound.playClick();
      btnSimulatePix.disabled = true;
      btnSimulatePix.textContent = 'Processando simulação...';
      try {
        await paymentService.simulatePayment(currentPaymentOrderId);
        handlePaymentSuccess();
      } catch (e) {
        showToast('Erro ao simular pagamento.');
      } finally {
        btnSimulatePix.disabled = false;
        btnSimulatePix.textContent = '🧪 Simular Pagamento Aprovado (Teste)';
      }
    });
  }

  // Stripe Checkout
  if (btnStripeCheckout) {
    btnStripeCheckout.addEventListener('click', async () => {
      game.sound.playClick();
      btnStripeCheckout.disabled = true;
      btnStripeCheckout.textContent = 'Abrindo Stripe...';
      try {
        const res = await paymentService.createStripeCheckout(currentSelectedPaymentItem);
        if (res.url) {
          window.location.href = res.url;
        } else if (res.isSandbox) {
          // Sandbox mock confirmation
          await paymentService.creditPowerUp(currentSelectedPaymentItem, 10);
          handlePaymentSuccess();
        }
      } catch (e) {
        showToast('Erro ao iniciar Checkout Stripe.');
      } finally {
        btnStripeCheckout.disabled = false;
        btnStripeCheckout.innerHTML = '<span>Comprar Pacote ($1.00 USD com Cartão)</span>';
      }
    });
  }

  function handlePaymentSuccess() {
    game.sound.playPurchaseSuccess();
    showToast('Pagamento confirmado! Power-up liberado! 🎉⚡');
    if (modalPayment) modalPayment.classList.add('hidden');
    paymentService.unsubscribeOrder();

    if (typeof pendingPaymentSuccessAction === 'function') {
      const action = pendingPaymentSuccessAction;
      pendingPaymentSuccessAction = null;
      action();
    }
  }

  // --- LOJA DE POWER-UPS ---
  if (btnShop) {
    btnShop.addEventListener('click', () => {
      game.sound.playClick();
      if (modalShop) modalShop.classList.remove('hidden');
    });
  }

  const scoreCard = document.getElementById('score-card');
  if (scoreCard) {
    scoreCard.addEventListener('click', () => {
      game.sound.playClick();
      if (modalShop) modalShop.classList.remove('hidden');
    });
  }

  document.querySelectorAll('.btn-shop-buy').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      game.sound.playClick();
      const item = btn.getAttribute('data-item');
      if (modalShop) modalShop.classList.add('hidden');
      openPaymentModal(item, () => {
        showToast('Créditos adicionados ao seu inventário! ⚡');
      });
    });
  });

  // --- GAMEPLAY UI BINDINGS ---
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      const isMuted = game.sound.toggleMute();
      const soundIcon = document.getElementById('sound-icon');
      if (soundIcon) {
        soundIcon.textContent = isMuted ? 'volume_off' : 'volume_up';
      }
      showToast(isMuted ? 'Som desativado' : 'Som ativado');
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      game.sound.playClick();
      if (confirm('Deseja reiniciar a partida atual?')) {
        game.startNewGame();
        showToast('Partida reiniciada!');
      }
    });
  }

  // --- TUTORIAL INTERATIVO COM ILUSTRAÇÕES 3D E ACESSIBILIDADE TDAH ---
  function setupTutorialCarousel() {
    const tutTrack = document.getElementById('tut-carousel-track');
    const tutSlides = document.querySelectorAll('.tut-slide');
    const tutDots = document.querySelectorAll('[data-step-dot]');
    const btnPrev = document.getElementById('btn-tut-prev');
    const btnNext = document.getElementById('btn-tut-next');
    const nextLabel = document.getElementById('tut-btn-next-label');
    const nextIcon = document.getElementById('tut-btn-next-icon');
    const stepCounter = document.getElementById('tut-step-counter');
    const progressFill = document.getElementById('tut-progress-fill');

    let currentStep = 0;
    const totalSteps = tutSlides.length || 5;

    function goToStep(step, playSfx = true) {
      currentStep = Math.max(0, Math.min(totalSteps - 1, step));
      if (playSfx && game?.sound) {
        game.sound.playClick();
      }

      // 1. Atualizar Track do Carrossel
      if (tutTrack) {
        tutTrack.style.transform = `translateX(-${currentStep * 100}%)`;
      }

      // 2. Atualizar estado ativo dos slides
      tutSlides.forEach((slide, idx) => {
        if (idx === currentStep) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });

      // 3. Atualizar Dots de navegação
      tutDots.forEach((dot, idx) => {
        const isCurrent = (idx === currentStep);
        dot.classList.toggle('active', isCurrent);
        dot.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });

      // 4. Barra de Progresso Gamificada & Contador com percentual
      const percent = Math.round(((currentStep + 1) / totalSteps) * 100);
      if (progressFill) {
        progressFill.style.width = `${percent}%`;
      }
      if (stepCounter) {
        stepCounter.textContent = `Passo ${currentStep + 1} de ${totalSteps} (${percent}%)`;
      }

      // 5. Botões de Ação (Voltar / Próximo / Jogar)
      if (btnPrev) {
        btnPrev.disabled = (currentStep === 0);
      }

      if (btnNext && nextLabel && nextIcon) {
        if (currentStep === totalSteps - 1) {
          nextLabel.textContent = 'Entendi, Vamos Jogar! 🚀';
          nextIcon.textContent = 'sports_esports';
        } else {
          nextLabel.textContent = 'Próximo';
          nextIcon.textContent = 'arrow_forward';
        }
      }
    }

    // Botões de navegação
    btnPrev?.addEventListener('click', () => {
      if (currentStep > 0) goToStep(currentStep - 1);
    });

    btnNext?.addEventListener('click', () => {
      if (currentStep < totalSteps - 1) {
        goToStep(currentStep + 1);
      } else {
        // Concluiu o tutorial
        game?.sound?.playLevelUp();
        modalInfo?.classList.add('hidden');
        showToast('Tudo pronto! Bom jogo! 🎮');
      }
    });

    // Clique direto nos dots
    tutDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const targetStep = parseInt(dot.getAttribute('data-step-dot'), 10);
        if (!isNaN(targetStep)) {
          goToStep(targetStep);
        }
      });
    });

    // Suporte a teclado (setas para esquerda / direita)
    document.addEventListener('keydown', (e) => {
      if (modalInfo && !modalInfo.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          btnNext?.click();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (currentStep > 0) goToStep(currentStep - 1);
        }
      }
    });

    // Micro-interações táteis / sonoras em cada cena (reforço cinestésico para TDAH)
    for (let i = 1; i <= 5; i++) {
      const stage = document.getElementById(`tut-stage-${i}`);
      if (stage) {
        stage.addEventListener('click', () => {
          stage.classList.remove('tut-activated');
          void stage.offsetWidth; // trigger reflow
          stage.classList.add('tut-activated');

          // Efeito sonoro temático de acordo com a mecânica do jogo
          if (game?.sound) {
            switch (i) {
              case 1:
                game.sound.playPick();
                setTimeout(() => game.sound.playSnap(), 220);
                break;
              case 2:
                game.sound.playCardSlide(3);
                break;
              case 3:
                game.sound.playStackClear(1);
                break;
              case 4:
                game.sound.playLevelUp();
                break;
              case 5:
                game.sound.playThunder();
                break;
            }
          }
        });
      }
    }

    // Ao abrir modal pelo botão de ajuda
    if (btnInfo) {
      btnInfo.addEventListener('click', () => {
        game.sound.playClick();
        goToStep(0, false);
        modalInfo.classList.remove('hidden');
      });
    }

    // Inicialização
    goToStep(0, false);
  }

  setupTutorialCarousel();

  if (btnLeaderboard) {
    btnLeaderboard.addEventListener('click', () => {
      game.sound.playClick();
      openLeaderboardModal();
    });
  }

  if (btnPlayAgain) {
    btnPlayAgain.addEventListener('click', () => {
      game.sound.playClick();
      modalGameOver.classList.add('hidden');
      game.startNewGame();
    });
  }

  // Fechamento genérico de modais
  document.querySelectorAll('.modal-close, [data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      game.sound.playClick();
      const modalId = btn.getAttribute('data-close') || btn.closest('.modal-overlay')?.id;
      const targetModal = document.getElementById(modalId);
      if (targetModal) targetModal.classList.add('hidden');
      if (modalId === 'modal-payment') {
        paymentService.unsubscribeOrder();
      }
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && overlay.id !== 'modal-gameover') {
        overlay.classList.add('hidden');
        if (overlay.id === 'modal-payment') {
          paymentService.unsubscribeOrder();
        }
      }
    });
  });

  // Troca de abas do Leaderboard
  tabGlobal?.addEventListener('click', () => {
    game.sound.playClick();
    currentLeaderboardTab = 'global';
    tabGlobal.classList.add('active');
    tabLocal.classList.remove('active');
    renderLeaderboardView();
  });

  tabLocal?.addEventListener('click', () => {
    game.sound.playClick();
    currentLeaderboardTab = 'local';
    tabLocal.classList.add('active');
    tabGlobal.classList.remove('active');
    renderLeaderboardView();
  });

  function openLeaderboardModal() {
    modalLeaderboard.classList.remove('hidden');
    renderLeaderboardView();
  }

  async function renderLeaderboardView() {
    leaderboardList.innerHTML = '';
    leaderboardLoading.classList.remove('hidden');

    if (currentLeaderboardTab === 'global') {
      const scores = await leaderboard.getGlobalScores();
      leaderboardLoading.classList.add('hidden');
      renderScoresList(scores, true);
    } else {
      const scores = leaderboard.getLocalScores();
      leaderboardLoading.classList.add('hidden');
      renderScoresList(scores, false);
    }
  }

  function renderScoresList(scores, isGlobal) {
    if (!scores || scores.length === 0) {
      leaderboardList.innerHTML = `
        <div class="empty-state">
          ${isGlobal ? 'Nenhum recorde global registrado ainda.' : 'Você ainda não possui partidas registradas neste dispositivo.'}
        </div>
      `;
      return;
    }

    const first = scores[0];
    const second = scores[1] || null;
    const third = scores[2] || null;
    const rest = scores.slice(3, 10);

    let html = `
      <div class="podium-container">
        <!-- 2nd Place: Silver -->
        <div class="podium-col rank-2">
          ${second ? `
            <div class="podium-avatar-wrap">
              <div class="podium-rank-badge">2º</div>
              <div class="podium-avatar">${escapeHTML((second.name || '2')[0]).toUpperCase()}</div>
            </div>
            <div class="podium-card">
              <span class="podium-name">${escapeHTML(second.name || 'Jogador')}</span>
              <span class="podium-score">${(second.score || 0).toLocaleString('pt-BR')}</span>
              <span class="podium-time">
                <span class="material-symbols-outlined text-[11px]">schedule</span> ${LeaderboardManager.formatTime(second.time || 0)}
              </span>
            </div>
          ` : `
            <div class="podium-card" style="opacity:0.5;"><span class="podium-time">-</span></div>
          `}
        </div>

        <!-- 1st Place: Gold Hero (Elevated) -->
        <div class="podium-col rank-1">
          <div class="podium-avatar-wrap">
            <span class="podium-crown">👑</span>
            <div class="podium-rank-badge">1º</div>
            <div class="podium-avatar">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">military_tech</span>
            </div>
          </div>
          <div class="podium-card">
            <span class="podium-name">${escapeHTML(first.name || 'Campeão')}</span>
            <span class="podium-score">${(first.score || 0).toLocaleString('pt-BR')}</span>
            <span class="podium-time">
              <span class="material-symbols-outlined text-[11px]">schedule</span> ${LeaderboardManager.formatTime(first.time || 0)}
            </span>
          </div>
        </div>

        <!-- 3rd Place: Bronze -->
        <div class="podium-col rank-3">
          ${third ? `
            <div class="podium-avatar-wrap">
              <div class="podium-rank-badge">3º</div>
              <div class="podium-avatar">${escapeHTML((third.name || '3')[0]).toUpperCase()}</div>
            </div>
            <div class="podium-card">
              <span class="podium-name">${escapeHTML(third.name || 'Jogador')}</span>
              <span class="podium-score">${(third.score || 0).toLocaleString('pt-BR')}</span>
              <span class="podium-time">
                <span class="material-symbols-outlined text-[11px]">schedule</span> ${LeaderboardManager.formatTime(third.time || 0)}
              </span>
            </div>
          ` : `
            <div class="podium-card" style="opacity:0.5;"><span class="podium-time">-</span></div>
          `}
        </div>
      </div>
    `;

    if (rest.length > 0) {
      html += `<div class="leaderboard-rows-list">`;
      rest.forEach((entry, idx) => {
        const rank = idx + 4;
        html += `
          <div class="lb-row">
            <div class="lb-row-left">
              <span class="lb-row-rank">${rank}</span>
              <div class="lb-row-avatar">${escapeHTML((entry.name || '#')[0]).toUpperCase()}</div>
              <span class="lb-row-name">${escapeHTML(entry.name || 'Anônimo')}</span>
            </div>
            <span class="lb-row-score">${(entry.score || 0).toLocaleString('pt-BR')} pts</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    leaderboardList.innerHTML = html;
  }

  // Submissão manual de apelido na tela de Game Over
  if (btnEditNicknameGo) {
    btnEditNicknameGo.addEventListener('click', () => {
      game.sound.playClick();
      if (autoSubmitBadge) autoSubmitBadge.classList.add('hidden');
      if (manualNicknameRow) {
        manualNicknameRow.classList.remove('hidden');
        if (btnCancelEditGo) btnCancelEditGo.classList.remove('hidden');
        if (playerNicknameInput) {
          playerNicknameInput.focus();
          playerNicknameInput.select();
        }
      }
    });
  }

  if (btnCancelEditGo) {
    btnCancelEditGo.addEventListener('click', () => {
      game.sound.playClick();
      const currentNick = leaderboard.getSavedNickname();
      if (playerNicknameInput) playerNicknameInput.value = currentNick || '';
      if (manualNicknameRow) manualNicknameRow.classList.add('hidden');
      if (autoSubmitBadge) autoSubmitBadge.classList.remove('hidden');
    });
  }

  if (playerNicknameInput) {
    playerNicknameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSubmitScore?.click();
      }
    });
  }

  if (btnSubmitScore) {
    btnSubmitScore.addEventListener('click', async () => {
      game.sound.playClick();
      const nickname = (playerNicknameInput.value || '').trim();
      if (!nickname) {
        submitStatus.textContent = 'Por favor, digite um apelido válido.';
        submitStatus.className = 'submit-status error';
        if (playerNicknameInput) playerNicknameInput.focus();
        return;
      }

      leaderboard.setSavedNickname(nickname);
      updatePlayerNicknameUI(nickname);

      btnSubmitScore.disabled = true;
      submitStatus.textContent = 'Salvando e sincronizando...';
      submitStatus.className = 'submit-status';

      try {
        if (game.score > 0) {
          await leaderboard.submitScore({
            name: nickname,
            score: game.score,
            time: game.gameTimeSeconds,
            clears: game.totalClears,
            combo: game.maxCombo
          });
        }

        submitStatus.textContent = 'Pontuação sincronizada no Ranking Global!';
        submitStatus.className = 'submit-status success';
        if (manualNicknameRow) manualNicknameRow.classList.add('hidden');
        if (autoSubmitBadge) autoSubmitBadge.classList.remove('hidden');
        showToast(`Recorde registrado como ${nickname}! 🎉`);
      } catch (e) {
        submitStatus.textContent = 'Salvo localmente.';
        submitStatus.className = 'submit-status';
        if (manualNicknameRow) manualNicknameRow.classList.add('hidden');
        if (autoSubmitBadge) autoSubmitBadge.classList.remove('hidden');
      } finally {
        setTimeout(() => {
          btnSubmitScore.disabled = false;
        }, 1500);
      }
    });
  }

  // Toast Helper
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');

    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
