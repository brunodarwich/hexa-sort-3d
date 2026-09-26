/**
 * src/main.js
 * Application entry point, UI event bindings, Google Auth, Power-Ups, Pagamentos Pix & Stripe e Placar.
 */

import { GameManager } from './game/GameManager.js';
import { LeaderboardManager } from './game/Leaderboard.js';
import { authService } from './services/auth.js';
import { paymentService } from './services/paymentService.js';
import { setupDialogs } from './ui/accessibility.js';
import { NativeBridge } from './ui/nativeBridge.js';
import { getProduct, formatBRL } from '../supabase/functions/_shared/catalog.js';

document.addEventListener('DOMContentLoaded', async () => {
  setupDialogs(id => { if (id === 'modal-payment') paymentService.unsubscribeOrder(); });
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
  const tabBtnPix = document.getElementById('tab-btn-pix');
  const tabBtnCard = document.getElementById('tab-btn-card');
  const paymentPixArea = document.getElementById('payment-pix-area');
  const paymentCardArea = document.getElementById('payment-card-area');
  const cardAvailableBox = document.getElementById('card-available-box');
  const cardUnavailableBox = document.getElementById('card-unavailable-box');
  const btnStripeText = document.getElementById('btn-stripe-text');
  const btnForceNewPix = document.getElementById('btn-force-new-pix');
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
  const btnStripeCheckout = document.getElementById('btn-stripe-checkout');

  // Leaderboard Elements
  const tabGlobal = document.getElementById('tab-global');
  const tabLocal = document.getElementById('tab-local');
  const leaderboardList = document.getElementById('leaderboard-list');
  const leaderboardLoading = document.getElementById('leaderboard-loading');
  let currentLeaderboardTab = 'global'; // 'global' | 'local'

  // Variável para armazenar a ação a ser executada logo após pagamento bem-sucedido
  let pendingPaymentSuccessAction = null;
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

    NativeBridge.updateTheme(theme);

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

  // --- MULTI-SCREEN NAVIGATION SYSTEM ---
  game.isPaused = true;
  let activeScreen = 'home'; // 'home' | 'game' | 'ranking' | 'profile'
  const screens = {
    home: document.getElementById('screen-home'),
    game: document.getElementById('screen-game'),
    ranking: document.getElementById('screen-ranking'),
    profile: document.getElementById('screen-profile')
  };

  const navTabs = document.querySelectorAll('#bottom-nav .nav-tab');

  function switchScreen(target) {
    if (!screens[target]) return;
    activeScreen = target;
    game.isPaused = target !== 'game';

    // Alternar visibilidade das telas
    Object.keys(screens).forEach((key) => {
      const el = screens[key];
      if (el) {
        el.inert = key !== target;
        el.setAttribute('aria-hidden', String(key !== target));
        if (key === target) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Atualizar aba ativa na barra de navegação inferior
    navTabs.forEach((tab) => {
      const navTarget = tab.getAttribute('data-nav');
      if (navTarget === target) {
        tab.classList.add('active');
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.classList.remove('active');
        tab.removeAttribute('aria-current');
      }
    });

    // Ações contextuais de cada tela
    if (target === 'home') {
      updateHomeScreenData();
    } else if (target === 'ranking') {
      renderFullRankingScreen();
    } else if (target === 'profile') {
      renderProfileScreen();
    }
  }

  // Inicializar Native Bridge para Android
  NativeBridge.init({
    getActiveScreen: () => activeScreen,
    switchScreen: (target) => switchScreen(target)
  });

  // Eventos das abas inferiores
  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      game.sound.playClick();
      const target = tab.getAttribute('data-nav');
      switchScreen(target);
    });
  });

  // --- 1. TELA INICIAL (HOME) ---
  const btnHomePlay = document.getElementById('btn-home-play');
  const btnHomeSettings = document.getElementById('btn-home-settings');
  const btnHomeProfile = document.getElementById('btn-home-profile');
  const homeRecordVal = document.getElementById('home-record-val');

  function updateHomeScreenData() {
    const highscore = game.highScore || leaderboard.getHighScore() || 0;
    if (homeRecordVal) {
      homeRecordVal.textContent = highscore.toLocaleString('pt-BR');
    }
  }

  if (btnHomePlay) {
    btnHomePlay.addEventListener('click', () => {
      game.sound.playClick();
      switchScreen('game');
      showToast('Junte 10 peças da mesma cor para liberar espaço.');
    });
  }

  if (btnHomeSettings) {
    btnHomeSettings.addEventListener('click', () => {
      game.sound.playClick();
      openSettingsModal();
    });
  }

  if (btnHomeProfile) {
    btnHomeProfile.addEventListener('click', () => {
      game.sound.playClick();
      switchScreen('profile');
    });
  }

  // --- 3. TELA DE RANKING (CLASSIFICAÇÃO) ---
  const btnRefreshRanking = document.getElementById('btn-refresh-ranking');
  const btnRankingHeaderProfile = document.getElementById('btn-ranking-header-profile');
  const rankingCompetitorsList = document.getElementById('ranking-competitors-list');

  if (btnRankingHeaderProfile) {
    btnRankingHeaderProfile.addEventListener('click', () => {
      game.sound.playClick();
      switchScreen('profile');
    });
  }

  async function renderFullRankingScreen() {
    if (!rankingCompetitorsList) return;

    rankingCompetitorsList.innerHTML = `
      <div class="ranking-empty-state">
        <div class="spinner-dot"></div>
        <span>Carregando melhores pontuações...</span>
      </div>
    `;

    try {
      const scores = await leaderboard.getGlobalScores();
      const rankingStatus = document.getElementById('ranking-data-status');
      if (rankingStatus) rankingStatus.textContent = leaderboard.globalStatus === 'live'
        ? 'Pontuações registradas online' : leaderboard.globalStatus === 'cached'
        ? 'Sem conexão. Exibindo a última atualização salva.' : 'Ranking indisponível. Você pode continuar jogando.';

      document.querySelector('#screen-ranking .podium-card')?.classList.toggle('hidden', scores.length === 0);
      // Pódio Top 3
      const first = scores[0] || null;
      const second = scores[1] || null;
      const third = scores[2] || null;

      // 1º Lugar
      const p1AvatarImg = document.getElementById('podium-avatar-img-1');
      const p1Avatar = document.getElementById('podium-avatar-1');
      const p1Name = document.getElementById('podium-name-1');
      const p1Score = document.getElementById('podium-score-1');
      if (first) {
        if (p1Name) p1Name.textContent = first.name || 'Jogador';
        if (p1Score) p1Score.textContent = (first.score || 0).toLocaleString('pt-BR');
        const avatarSrc = first.avatar;
        if (p1AvatarImg && avatarSrc) {
          p1AvatarImg.src = avatarSrc;
          p1AvatarImg.classList.remove('hidden');
          if (p1Avatar) p1Avatar.classList.add('hidden');
        } else if (p1Avatar) {
          p1AvatarImg?.classList.add('hidden');
          p1Avatar.textContent = (first.name || '1')[0].toUpperCase();
          p1Avatar.classList.remove('hidden');
        }
      } else {
        if (p1Name) p1Name.textContent = 'Sem pontuação';
        if (p1Score) p1Score.textContent = '0';
      }

      // 2º Lugar
      const p2AvatarImg = document.getElementById('podium-avatar-img-2');
      const p2Avatar = document.getElementById('podium-avatar-2');
      const p2Name = document.getElementById('podium-name-2');
      const p2Score = document.getElementById('podium-score-2');
      if (second) {
        if (p2Name) p2Name.textContent = second.name || 'Jogador';
        if (p2Score) p2Score.textContent = (second.score || 0).toLocaleString('pt-BR');
        const avatarSrc = second.avatar;
        if (p2AvatarImg && avatarSrc) {
          p2AvatarImg.src = avatarSrc;
          p2AvatarImg.classList.remove('hidden');
          if (p2Avatar) p2Avatar.classList.add('hidden');
        } else if (p2Avatar) {
          p2AvatarImg?.classList.add('hidden');
          p2Avatar.textContent = (second.name || '2')[0].toUpperCase();
          p2Avatar.classList.remove('hidden');
        }
      } else {
        if (p2Name) p2Name.textContent = '---';
        if (p2Score) p2Score.textContent = '0';
      }

      // 3º Lugar
      const p3AvatarImg = document.getElementById('podium-avatar-img-3');
      const p3Avatar = document.getElementById('podium-avatar-3');
      const p3Name = document.getElementById('podium-name-3');
      const p3Score = document.getElementById('podium-score-3');
      if (third) {
        if (p3Name) p3Name.textContent = third.name || 'Jogador';
        if (p3Score) p3Score.textContent = (third.score || 0).toLocaleString('pt-BR');
        const avatarSrc = third.avatar;
        if (p3AvatarImg && avatarSrc) {
          p3AvatarImg.src = avatarSrc;
          p3AvatarImg.classList.remove('hidden');
          if (p3Avatar) p3Avatar.classList.add('hidden');
        } else if (p3Avatar) {
          p3AvatarImg?.classList.add('hidden');
          p3Avatar.textContent = (third.name || '3')[0].toUpperCase();
          p3Avatar.classList.remove('hidden');
        }
      } else {
        if (p3Name) p3Name.textContent = '---';
        if (p3Score) p3Score.textContent = '0';
      }

      // Lista #4 a #10+
      const rest = scores.slice(3, 50);
      if (rest.length > 0) {
        rankingCompetitorsList.innerHTML = rest.map((item, idx) => {
          const pos = idx + 4;
          const initial = escapeHTML((item.name || '#')[0].toUpperCase());
          const name = escapeHTML(item.name || 'Competidor');
          const scoreStr = (item.score || 0).toLocaleString('pt-BR');
          const levelNum = item.level || Math.max(1, Math.floor((item.score || 0) / 18000));
          const comboStr = item.combo ? `${item.combo}x combo` : `${Math.max(5, 18 - pos)}x combo`;
          const avatar = item.avatar;
          const avatarHtml = avatar
            ? `<img src="${escapeHTML(avatar)}" alt="" loading="lazy" />`
            : `<span>${initial}</span>`;

          return `
            <div class="ranking-row">
              <div class="row-left">
                <span class="row-rank-num">#${pos}</span>
                <div class="row-avatar">${avatarHtml}</div>
                <div class="row-meta">
                  <span class="row-name">${name}</span>
                  <div class="row-sub-info">
                    <span class="row-level">Nível ${levelNum}</span>
                    <span class="row-dot">•</span>
                    <span class="row-combo">${comboStr}</span>
                  </div>
                </div>
              </div>
              <span class="row-score">${scoreStr}</span>
            </div>
          `;
        }).join('');
      } else {
        rankingCompetitorsList.innerHTML = `
          <div class="ranking-empty-state">
            <span>${leaderboard.globalStatus === 'unavailable' ? 'Sem conexão com o ranking. Jogue e salve seus recordes neste dispositivo.' : 'Novas pontuações aparecerão aqui conforme forem registradas.'}</span>
          </div>
        `;
      }
    } catch (err) {
      console.warn('Erro ao renderizar ranking:', err);
      rankingCompetitorsList.innerHTML = `
        <div class="ranking-empty-state">
          <span>Não foi possível carregar o placar online no momento.</span>
        </div>
      `;
    }
  }

  if (btnRefreshRanking) {
    btnRefreshRanking.addEventListener('click', () => {
      game.sound.playClick();
      renderFullRankingScreen();
      showToast('Ranking atualizado! 🏆');
    });
  }

  // --- 4. TELA DE PERFIL E LOGIN ---
  const btnProfileSettings = document.getElementById('btn-profile-settings');
  const profileNicknameText = document.getElementById('profile-nickname-text');
  const btnEditProfileNickname = document.getElementById('btn-edit-profile-nickname');
  const profileNicknameView = document.getElementById('profile-nickname-view');
  const profileNicknameEdit = document.getElementById('profile-nickname-edit');
  const inputProfileNickname = document.getElementById('input-profile-nickname');
  const btnSaveProfileNickname = document.getElementById('btn-save-profile-nickname');
  const btnCancelProfileNickname = document.getElementById('btn-cancel-profile-nickname');
  const profileAccountTag = document.getElementById('profile-account-tag');
  const profileAvatarImg = document.getElementById('profile-avatar-img');
  const profileAvatarFallback = document.getElementById('profile-avatar-fallback');

  const profileLoggedOut = document.getElementById('profile-logged-out');
  const profileLoggedIn = document.getElementById('profile-logged-in');
  const profileGoogleName = document.getElementById('profile-google-name');
  const profileGoogleEmail = document.getElementById('profile-google-email');
  const btnGoogleLoginProfile = document.getElementById('btn-google-login-profile');
  const btnGoogleLogoutProfile = document.getElementById('btn-google-logout-profile');

  // Stats Counters
  const statProfileGames = document.getElementById('stat-profile-games');
  const statProfileHighscore = document.getElementById('stat-profile-highscore');
  const statProfileCombo = document.getElementById('stat-profile-combo');
  const statProfileClears = document.getElementById('stat-profile-clears');

  function renderProfileScreen() {
    const savedNick = leaderboard.getSavedNickname() || 'Jogador';
    if (profileNicknameText) profileNicknameText.textContent = savedNick;

    // Estatísticas
    const games = Number(localStorage.getItem('hexa_sort_stats_games_played')) || 0;
    const highscore = game.highScore || leaderboard.getHighScore() || 0;
    const maxCombo = Number(localStorage.getItem('hexa_sort_stats_max_combo')) || 1;
    const clears = Number(localStorage.getItem('hexa_sort_stats_total_clears')) || 0;

    if (statProfileGames) statProfileGames.textContent = games.toLocaleString('pt-BR');
    if (statProfileHighscore) statProfileHighscore.textContent = highscore.toLocaleString('pt-BR');
    if (statProfileCombo) statProfileCombo.textContent = `${maxCombo}x`;
    if (statProfileClears) statProfileClears.textContent = clears.toLocaleString('pt-BR');
  }

  // Listener para atualização de estatísticas pós-partida
  window.addEventListener('hexa_stats_updated', () => {
    if (activeScreen === 'profile') renderProfileScreen();
    if (activeScreen === 'home') updateHomeScreenData();
  });

  if (btnProfileSettings) {
    btnProfileSettings.addEventListener('click', () => {
      game.sound.playClick();
      openSettingsModal();
    });
  }

  // Edição inline de apelido no perfil
  if (btnEditProfileNickname) {
    btnEditProfileNickname.addEventListener('click', () => {
      game.sound.playClick();
      const current = leaderboard.getSavedNickname() || '';
      if (inputProfileNickname) inputProfileNickname.value = current;
      if (profileNicknameView) profileNicknameView.classList.add('hidden');
      if (profileNicknameEdit) {
        profileNicknameEdit.classList.remove('hidden');
        if (inputProfileNickname) {
          inputProfileNickname.focus();
          inputProfileNickname.select();
        }
      }
    });
  }

  if (btnCancelProfileNickname) {
    btnCancelProfileNickname.addEventListener('click', () => {
      game.sound.playClick();
      if (profileNicknameEdit) profileNicknameEdit.classList.add('hidden');
      if (profileNicknameView) profileNicknameView.classList.remove('hidden');
    });
  }

  if (btnSaveProfileNickname) {
    btnSaveProfileNickname.addEventListener('click', () => {
      game.sound.playClick();
      const newNick = (inputProfileNickname?.value || '').trim();
      if (newNick) {
        leaderboard.setSavedNickname(newNick);
        updatePlayerNicknameUI(newNick);
        if (profileNicknameText) profileNicknameText.textContent = newNick;
        if (profileNicknameEdit) profileNicknameEdit.classList.add('hidden');
        if (profileNicknameView) profileNicknameView.classList.remove('hidden');
        showToast(`Apelido atualizado: ${newNick} ✨`);
      }
    });
  }

  if (btnGoogleLoginProfile) {
    btnGoogleLoginProfile.addEventListener('click', async () => {
      game.sound.playClick();
      try {
        await authService.signInWithGoogle();
      } catch (err) {
        showToast('Falha ao conectar com Google. Verifique a configuração.');
      }
    });
  }

  if (btnGoogleLogoutProfile) {
    btnGoogleLogoutProfile.addEventListener('click', async () => {
      game.sound.playClick();
      await authService.signOut();
      showToast('Desconectado com sucesso.');
    });
  }

  // --- 6. MODAL DE CONFIGURAÇÕES ---
  const modalSettings = document.getElementById('modal-settings');
  const settingToggleSound = document.getElementById('setting-toggle-sound');
  const settingSoundIcon = document.getElementById('setting-sound-icon');
  const settingToggleTheme = document.getElementById('setting-toggle-theme');
  const settingThemeIcon = document.getElementById('setting-theme-icon');
  const settingBtnTutorial = document.getElementById('setting-btn-tutorial');

  function openSettingsModal() {
    if (modalSettings) {
      // Atualizar estados dos toggles
      if (settingToggleSound) {
        const isMuted = game.sound?.isMuted;
        settingToggleSound.className = isMuted ? 'btn-toggle' : 'btn-toggle active';
        if (settingSoundIcon) settingSoundIcon.textContent = isMuted ? 'volume_off' : 'volume_up';
      }
      if (settingToggleTheme) {
        const isDark = activeTheme === 'dark';
        settingToggleTheme.className = isDark ? 'btn-toggle active' : 'btn-toggle';
        if (settingThemeIcon) settingThemeIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
      }
      modalSettings.classList.remove('hidden');
    }
  }

  if (settingToggleSound) {
    settingToggleSound.addEventListener('click', () => {
      if (game.sound) {
        game.sound.toggleMute();
        const isMuted = game.sound.isMuted;
        settingToggleSound.className = isMuted ? 'btn-toggle' : 'btn-toggle active';
        if (settingSoundIcon) settingSoundIcon.textContent = isMuted ? 'volume_off' : 'volume_up';
        const soundIcon = document.getElementById('sound-icon');
        if (soundIcon) soundIcon.textContent = isMuted ? 'volume_off' : 'volume_up';
        showToast(isMuted ? 'Sons desativados 🔇' : 'Sons ativados 🔊');
      }
    });
  }

  if (settingToggleTheme) {
    settingToggleTheme.addEventListener('click', () => {
      game.sound.playClick();
      const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
      settingToggleTheme.className = nextTheme === 'dark' ? 'btn-toggle active' : 'btn-toggle';
      if (settingThemeIcon) settingThemeIcon.textContent = nextTheme === 'dark' ? 'dark_mode' : 'light_mode';
    });
  }

  if (settingBtnTutorial) {
    settingBtnTutorial.addEventListener('click', () => {
      game.sound.playClick();
      if (modalSettings) modalSettings.classList.add('hidden');
      if (modalInfo) modalInfo.classList.remove('hidden');
    });
  }

  // --- GOOGLE AUTH & USER PROFILE ---
  function updatePlayerNicknameUI(name, avatarUrl = null) {
    const displayName = name || 'Jogador';
    if (headerPlayerName) headerPlayerName.textContent = displayName;
    if (goNicknameDisplay) goNicknameDisplay.textContent = displayName;
    if (playerNicknameInput) playerNicknameInput.value = displayName;
    if (profileNicknameText) profileNicknameText.textContent = displayName;

    // Atualiza avatar circular no cabeçalho
    const avatarCircle = btnPlayerProfile?.querySelector('.player-avatar-circle');
    if (avatarCircle) {
      if (avatarUrl) {
        const avatar = document.createElement('img');
        avatar.src = avatarUrl;
        avatar.alt = 'Avatar';
        avatar.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
        avatarCircle.replaceChildren(avatar);
      } else {
        avatarCircle.innerHTML = `<span class="material-symbols-outlined text-[17px]" style="font-variation-settings: 'FILL' 1;">face</span>`;
      }
    }

    // Atualiza avatar no perfil
    if (profileAvatarImg && profileAvatarFallback) {
      if (avatarUrl) {
        profileAvatarImg.src = avatarUrl;
        profileAvatarImg.classList.remove('hidden');
        profileAvatarFallback.classList.add('hidden');
      } else {
        profileAvatarImg.classList.add('hidden');
        profileAvatarFallback.classList.remove('hidden');
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

      // Sincronizar na tela de perfil
      if (profileLoggedOut) profileLoggedOut.classList.add('hidden');
      if (profileLoggedIn) {
        profileLoggedIn.classList.remove('hidden');
        if (profileGoogleName) profileGoogleName.textContent = displayName;
        if (profileGoogleEmail) profileGoogleEmail.textContent = user.email || '';
      }
      if (profileAccountTag) {
        profileAccountTag.textContent = 'Conta Conectada na Nuvem ☁️';
        profileAccountTag.style.color = '#5cff9f';
      }

      showToast(`Conectado como ${displayName}! 🚀`);
      void paymentService.fetchInventory();
    } else {
      const savedNick = leaderboard.getSavedNickname();
      updatePlayerNicknameUI(savedNick, null);

      if (btnGoogleLogin) btnGoogleLogin.classList.remove('hidden');
      if (googleLoggedInfo) googleLoggedInfo.classList.add('hidden');

      if (profileLoggedOut) profileLoggedOut.classList.remove('hidden');
      if (profileLoggedIn) profileLoggedIn.classList.add('hidden');
      if (profileAccountTag) {
        profileAccountTag.textContent = 'Jogador Convidado';
        profileAccountTag.style.color = '';
      }
    }
  });

  // Login com Google no modal de boas-vindas
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

  // Logout no modal de boas-vindas
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
  }

  // Inicializar dados da tela inicial
  updateHomeScreenData();

  // Sincronizar inventário inicial
  void paymentService.fetchInventory();

  // Verificar retorno de checkout (ex: Stripe ?payment=success)
  function checkPaymentReturnUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      if (paymentStatus === 'success') {
        void paymentService.fetchInventory();
        showToast('Pagamento confirmado via Cartão! Seus itens foram creditados. 🎉');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'cancel') {
        showToast('Pagamento com cartão cancelado.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }
  checkPaymentReturnUrl();

  // Abrir tela de perfil ao tocar no avatar do topo
  if (btnPlayerProfile) {
    btnPlayerProfile.addEventListener('click', () => {
      game.sound.playClick();
      switchScreen('profile');
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

  window.addEventListener('focus', () => { void paymentService.fetchInventory(); });
  window.addEventListener('online', () => { void paymentService.fetchInventory(); });

  // --- POWER-UPS UI & INVENTORY SYNC ---
  function updatePowerUpBadges(inv) {
    const singlePriceText = paymentService.isNativePlatform() ? 'Loja' : 'Comprar';

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
      goLightningPrice.textContent = inv.lightning > 0 ? `${inv.lightning} disponíveis` : singlePriceText;
    }
    if (goRerollPrice) {
      goRerollPrice.textContent = inv.reroll > 0 ? `${inv.reroll} disponíveis` : singlePriceText;
    }
  }

  paymentService.onInventoryChange((inv) => {
    updatePowerUpBadges(inv);
  });

  // --- POWER-UP: ATUALIZAR DEQUE (RE-ROLL) ---
  async function usePowerUp(type) {
    if (game.paidActionPending || game.isProcessingMerge || game.animation?.isBusy()) {
      showToast('Aguarde a jogada terminar.'); return;
    }
    if (type === 'lightning' && !game.hexGrid.getAllSlots().some(slot => slot.stack.length)) {
      showToast('Coloque uma pilha no tabuleiro antes de usar o raio.'); return;
    }
    if (type === 'reroll' && game.isGameOver && !game.hexGrid.getEmptySlots().length) {
      showToast('O tabuleiro está cheio. Use um raio ou foguete para liberar espaço.'); return;
    }
    game.paidActionPending = true;
    try {
      if (!await paymentService.consumePowerUp(type)) {
        showToast('Não foi possível usar o item. Confira seu saldo.'); return;
      }
      if (type === 'reroll') { await game.rerollDeck(); showToast('Pilhas trocadas! 🔄'); }
      else { const result = await game.lightningStrike(); if (result.success) showToast(`⚡ Raio eliminou ${result.count} pilha(s).`); }
    } finally { game.paidActionPending = false; }
  }

  function requestPowerUp(type) {
    if (paymentService.getInventory()[type] > 0) return usePowerUp(type);
    if (paymentService.isNativePlatform()) {
      if (modalShop) modalShop.classList.remove('hidden');
      return;
    }
    openPaymentModal(type, () => usePowerUp(type));
  }
  btnPowerupReroll?.addEventListener('click', () => requestPowerUp('reroll'));
  btnPowerupLightning?.addEventListener('click', () => requestPowerUp('lightning'));

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

  // --- PODERES ACUMULADOS NA TELA DE GAME OVER (FOGUETE & TREVO) ---
  const btnGoUseRocket = document.getElementById('btn-go-use-rocket');
  if (btnGoUseRocket) {
    btnGoUseRocket.addEventListener('click', async () => {
      game.sound.playClick();
      if (game.rocketCount <= 0) {
        const remaining = Math.max(0, 50000 - game.rocketCharge);
        showToast(`🚀 Foguete não carregado! Faltam ${remaining.toLocaleString('pt-BR')} pts acumulados na partida.`);
        return;
      }
      const occupied = game.hexGrid.getAllSlots().filter(s => s.stack.length > 0);
      if (occupied.length === 0) {
        showToast('Não há pilhas no tabuleiro para detonar.');
        return;
      }
      const res = await game.triggerRocketBooster();
      if (res && res.success) {
        showToast(`🚀 Foguete detonou ${res.count} carta(s)! Partida salva!`);
      } else if (res && res.reason) {
        showToast(res.reason);
      }
    });
  }

  const btnGoUseClover = document.getElementById('btn-go-use-clover');
  if (btnGoUseClover) {
    btnGoUseClover.addEventListener('click', async () => {
      game.sound.playClick();
      if (game.cloverCount <= 0) {
        const remaining = Math.max(0, 100000 - game.cloverCharge);
        showToast(`🍀 Trevo não carregado! Faltam ${remaining.toLocaleString('pt-BR')} pts acumulados na partida.`);
        return;
      }
      const res = await game.triggerCloverBooster();
      if (res && res.success) {
        showToast('🍀 Trevo ativado! 3 pilhas puras geradas e partida salva!');
      } else if (res && res.reason) {
        showToast(res.reason);
      }
    });
  }

  // --- ALTERNÂNCIA DE ABAS NO GAME OVER (PODERES vs PIX) ---
  const tabBtnBoosters = document.getElementById('tab-btn-boosters');
  const tabBtnGoPix = document.getElementById('tab-btn-go-pix');
  const tabContentBoosters = document.getElementById('go-tab-content-boosters');
  const tabContentPix = document.getElementById('go-tab-content-pix');

  if (tabBtnBoosters && tabBtnGoPix && tabContentBoosters && tabContentPix) {
    tabBtnBoosters.addEventListener('click', () => {
      game.sound.playClick();
      tabBtnBoosters.classList.add('active');
      tabBtnBoosters.setAttribute('aria-selected', 'true');
      tabBtnGoPix.classList.remove('active');
      tabBtnGoPix.setAttribute('aria-selected', 'false');
      tabContentBoosters.classList.remove('hidden');
      tabContentPix.classList.add('hidden');
    });

    tabBtnGoPix.addEventListener('click', () => {
      game.sound.playClick();
      tabBtnGoPix.classList.add('active');
      tabBtnGoPix.setAttribute('aria-selected', 'true');
      tabBtnBoosters.classList.remove('active');
      tabBtnBoosters.setAttribute('aria-selected', 'false');
      tabContentPix.classList.remove('hidden');
      tabContentBoosters.classList.add('hidden');
    });
  }

  // Usar e comprar compartilham validação de saldo e estado da partida.
  btnGoReviveLightning?.addEventListener('click', () => requestPowerUp('lightning'));
  btnGoReviveReroll?.addEventListener('click', () => requestPowerUp('reroll'));


  function openPaymentModal(itemType, onSuccessCallback = null) {
    paymentService.unsubscribeOrder();
    currentSelectedPaymentItem = itemType;
    pendingPaymentSuccessAction = onSuccessCallback;

    // Se estiver rodando no app nativo Android, utiliza faturamento oficial Google Play via RevenueCat
    if (paymentService.isNativePlatform()) {
      showToast('Iniciando Google Play Billing...');
      paymentService.purchaseNative(itemType)
        .then(() => {
          handlePaymentSuccess();
        })
        .catch((err) => {
          showToast(err.message || 'Erro ao processar compra Google Play.');
        });
      return;
    }

    const details = getProduct(itemType);
    if (!details) { showToast('Produto indisponível.'); return; }

    if (paymentIconBadge) paymentIconBadge.textContent = details.icon;
    if (paymentTitle) paymentTitle.textContent = `Comprar ${details.name}`;
    if (summaryProductName) summaryProductName.textContent = details.name;
    if (summaryProductDesc) summaryProductDesc.textContent = details.description;
    if (summaryProductPrice) summaryProductPrice.textContent = formatBRL(details.brlCents);

    // Configurar estado das Abas (Pix ativo por padrão)
    if (tabBtnPix && tabBtnCard) {
      tabBtnPix.classList.add('active');
      tabBtnCard.classList.remove('active');
    }
    if (paymentPixArea) paymentPixArea.classList.remove('hidden');
    if (paymentCardArea) paymentCardArea.classList.add('hidden');

    // Configurar disponibilidade do Cartão Stripe
    if (details.usdCents) {
      if (cardAvailableBox) cardAvailableBox.classList.remove('hidden');
      if (cardUnavailableBox) cardUnavailableBox.classList.add('hidden');
      if (btnStripeText) btnStripeText.textContent = `Pagar com Cartão ($${(details.usdCents / 100).toFixed(2)} USD)`;
    } else {
      if (cardAvailableBox) cardAvailableBox.classList.add('hidden');
      if (cardUnavailableBox) cardUnavailableBox.classList.remove('hidden');
    }

    if (modalPayment) modalPayment.classList.remove('hidden');

    // Gera o QR Code Pix inicial
    loadPixOrder(itemType);
  }

  // Alternância de Abas no Modal de Pagamento
  if (tabBtnPix) {
    tabBtnPix.addEventListener('click', () => {
      game.sound.playClick();
      tabBtnPix.classList.add('active');
      tabBtnCard?.classList.remove('active');
      paymentPixArea?.classList.remove('hidden');
      paymentCardArea?.classList.add('hidden');
    });
  }

  if (tabBtnCard) {
    tabBtnCard.addEventListener('click', () => {
      game.sound.playClick();
      tabBtnCard.classList.add('active');
      tabBtnPix?.classList.remove('active');
      paymentCardArea?.classList.remove('hidden');
      paymentPixArea?.classList.add('hidden');
    });
  }

  let pixRequestId = 0;
  async function loadPixOrder(itemType, forceNew = false) {
    const requestId = ++pixRequestId;
    paymentService.unsubscribeOrder();
    document.getElementById('btn-retry-pix')?.classList.add('hidden');
    if (pixLoadingState) { pixLoadingState.textContent = 'Gerando código Pix…'; pixLoadingState.classList.remove('hidden'); }
    if (pixContentState) pixContentState.classList.add('hidden');

    try {
      const order = await paymentService.createPixOrder(itemType, forceNew);
      if (requestId !== pixRequestId || modalPayment.classList.contains('hidden') || currentSelectedPaymentItem !== itemType) return;

      // Exibir imagem do QR Code
      if (pixQrcodeImg) {
        if (order.qrCodeBase64) {
          pixQrcodeImg.src = `data:image/png;base64,${order.qrCodeBase64}`;
          pixQrcodeImg.classList.remove('hidden');
        } else {
          pixQrcodeImg.removeAttribute('src');
          pixQrcodeImg.classList.add('hidden');
        }
      }

      if (inputPixCopiacola) {
        inputPixCopiacola.value = order.qrCode;
      }

      if (pixLoadingState) pixLoadingState.classList.add('hidden');
      if (pixContentState) pixContentState.classList.remove('hidden');

      // Escutar confirmação do pagamento via Supabase Realtime
      paymentService.subscribeToOrder(order.orderId, async () => {
        await handlePaymentSuccess();
      });
    } catch (err) {
      if (requestId !== pixRequestId) return;
      document.getElementById('btn-retry-pix')?.classList.remove('hidden');
      if (pixLoadingState) {
        pixLoadingState.textContent = `${err.message}`;
      }
    }
  }

  document.getElementById('btn-retry-pix')?.addEventListener('click', () => loadPixOrder(currentSelectedPaymentItem));
  btnForceNewPix?.addEventListener('click', () => {
    game.sound.playClick();
    loadPixOrder(currentSelectedPaymentItem, true);
  });

  window.addEventListener('payment-status', () => {
    pixContentState?.classList.add('hidden');
    if (pixLoadingState) { pixLoadingState.classList.remove('hidden'); pixLoadingState.textContent = 'Este pedido não está mais disponível. Gere um novo código para continuar.'; }
    document.getElementById('btn-retry-pix')?.classList.remove('hidden');
  });

  // Copiar código Pix
  if (btnCopyPix) {
    btnCopyPix.addEventListener('click', async () => {
      game.sound.playClick();
      if (inputPixCopiacola && inputPixCopiacola.value) {
        try { await navigator.clipboard.writeText(inputPixCopiacola.value); }
        catch { inputPixCopiacola.select(); showToast('Selecione e copie o código Pix.'); return; }
        btnCopyPix.querySelector('span:first-child').textContent = 'Copiado! ✅';
        setTimeout(() => {
          btnCopyPix.querySelector('span:first-child').textContent = 'Copiar Código';
        }, 2200);
      }
    });
  }

  // Stripe Checkout
  if (btnStripeCheckout) {
    btnStripeCheckout.addEventListener('click', async () => {
      game.sound.playClick();
      btnStripeCheckout.disabled = true;
      if (btnStripeText) btnStripeText.textContent = 'Abrindo Stripe...';
      try {
        const res = await paymentService.createStripeCheckout(currentSelectedPaymentItem);
        if (res.url) {
          window.location.href = res.url;
        } else { throw new Error('Não foi possível abrir o pagamento.'); }
      } catch (e) {
        showToast('Erro ao iniciar Checkout Stripe.');
      } finally {
        btnStripeCheckout.disabled = false;
        const details = getProduct(currentSelectedPaymentItem);
        if (btnStripeText && details?.usdCents) {
          btnStripeText.textContent = `Pagar com Cartão ($${(details.usdCents / 100).toFixed(2)} USD)`;
        }
      }
    });
  }

  async function handlePaymentSuccess() {
    game.sound.playPurchaseSuccess();
    showToast('Pagamento confirmado! Power-up liberado! 🎉⚡');
    if (modalPayment) modalPayment.classList.add('hidden');
    paymentService.unsubscribeOrder();

    if (typeof pendingPaymentSuccessAction === 'function') {
      const action = pendingPaymentSuccessAction;
      pendingPaymentSuccessAction = null;
      await action();
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

  // No Android nativo, ocultar itens de 1 unidade (R$ 0,25) exclusivos da web
  if (paymentService.isNativePlatform()) {
    document.querySelectorAll('.shop-item-web-only').forEach((el) => {
      el.classList.add('hidden');
    });
  }

  document.querySelectorAll('.btn-shop-buy').forEach((btn) => {
    const product = getProduct(btn.dataset.item);
    if (!product) { btn.disabled = true; return; }
    const card = btn.closest('.shop-item-card');
    card.querySelector('h3').textContent = product.name;
    card.querySelector('p').textContent = product.description;
    btn.querySelector('.shop-price').textContent = paymentService.isNativePlatform() ? 'Comprar' : formatBRL(product.brlCents);
    btn.setAttribute('aria-label', `Comprar ${product.name} por ${formatBRL(product.brlCents)}`);
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
        pixRequestId++;
        paymentService.unsubscribeOrder();
      }
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && overlay.id !== 'modal-gameover') {
        overlay.classList.add('hidden');
        if (overlay.id === 'modal-payment') {
          pixRequestId++;
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
          ${isGlobal ? (leaderboard.globalStatus === 'unavailable' ? 'Ranking indisponível. Tente novamente quando estiver online.' : 'Nenhum recorde global registrado ainda.') : 'Você ainda não possui partidas registradas neste dispositivo.'}
        </div>
      `;
      return;
    }

    const first = scores[0];
    const second = scores[1] || null;
    const third = scores[2] || null;
    const rest = scores.slice(3, 50);

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
    if (isGlobal && leaderboard.globalStatus === 'cached') {
      const status = document.createElement('p'); status.textContent = 'Sem conexão. Exibindo a última atualização salva.';
      status.setAttribute('role', 'status'); leaderboardList.prepend(status);
    }
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

        submitStatus.textContent = leaderboard.lastSubmitSynced ? 'Pontuação sincronizada no Ranking Global!' : 'Pontuação salva neste dispositivo. Envio online não confirmado.';
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
