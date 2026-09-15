/**
 * main.js
 * Application entry point, UI event bindings, modal handling, and Leaderboard renderer.
 */

import { GameManager } from './game/GameManager.js';
import { LeaderboardManager } from './game/Leaderboard.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const game = new GameManager(canvasContainer);
  const leaderboard = game.leaderboard;

  // UI Elements
  const btnTheme = document.getElementById('btn-theme');
  const btnSound = document.getElementById('btn-sound');
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const btnRestart = document.getElementById('btn-restart');
  const btnInfo = document.getElementById('btn-info');
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

  const modalInfo = document.getElementById('modal-info');
  const modalLeaderboard = document.getElementById('modal-leaderboard');
  const modalGameOver = document.getElementById('modal-gameover');

  const tabGlobal = document.getElementById('tab-global');
  const tabLocal = document.getElementById('tab-local');
  const leaderboardList = document.getElementById('leaderboard-list');
  const leaderboardLoading = document.getElementById('leaderboard-loading');

  let currentLeaderboardTab = 'global'; // 'global' | 'local'

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

    if (btnTheme) {
      if (theme === 'dark') {
        btnTheme.textContent = '☀️';
        btnTheme.setAttribute('title', 'Mudar para Modo Claro');
        btnTheme.setAttribute('aria-label', 'Mudar para Modo Claro');
      } else {
        btnTheme.textContent = '🌙';
        btnTheme.setAttribute('title', 'Mudar para Modo Escuro (Neon)');
        btnTheme.setAttribute('aria-label', 'Mudar para Modo Escuro (Neon)');
      }
    }

    if (game && typeof game.setTheme === 'function') {
      game.setTheme(theme);
    }

    if (showFeedback) {
      showToast(theme === 'dark' ? 'Modo Escuro Neon ativado! 🌌⚡' : 'Modo Claro ativado! ☀️');
    }
  }

  // Apply initial theme
  applyTheme(activeTheme, false);

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      game.sound.playClick();
      const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });
  }

  // Helper para atualizar visualmente o apelido no HUD e modais
  function updatePlayerNicknameUI(name) {
    const displayName = name || 'Definir Apelido';
    if (headerPlayerName) headerPlayerName.textContent = displayName;
    if (goNicknameDisplay) goNicknameDisplay.textContent = name || 'Jogador';
    if (playerNicknameInput) playerNicknameInput.value = name || '';
  }

  // Inicialização do apelido salvo (persistência de cache)
  const savedNick = leaderboard.getSavedNickname();
  if (savedNick) {
    updatePlayerNicknameUI(savedNick);
  } else {
    // Primeiro acesso nesta máquina: abre o modal de boas-vindas para definir apelido
    setTimeout(() => {
      if (modalNickname) {
        modalNickname.classList.remove('hidden');
        if (inputWelcomeNickname) inputWelcomeNickname.focus();
      }
    }, 450);
  }

  // Abrir modal de edição de apelido pelo cabeçalho
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

  // Submissão do formulário de apelido (boas-vindas ou edição)
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

  // Botão "Trocar" na tela de Game Over
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

  // Botão "Cancelar" na tela de Game Over
  if (btnCancelEditGo) {
    btnCancelEditGo.addEventListener('click', () => {
      game.sound.playClick();
      const currentNick = leaderboard.getSavedNickname();
      if (playerNicknameInput) playerNicknameInput.value = currentNick || '';
      if (manualNicknameRow) manualNicknameRow.classList.add('hidden');
      if (autoSubmitBadge) autoSubmitBadge.classList.remove('hidden');
    });
  }

  // Sound Toggle
  btnSound.addEventListener('click', () => {
    const isMuted = game.sound.toggleMute();
    btnSound.textContent = isMuted ? '🔇' : '🔊';
    btnSound.setAttribute('title', isMuted ? 'Ativar Som' : 'Desativar Som');
    showToast(isMuted ? 'Som desativado' : 'Som ativado');
  });

  // Restart Button
  btnRestart.addEventListener('click', () => {
    game.sound.playClick();
    if (confirm('Deseja reiniciar a partida atual?')) {
      game.startNewGame();
      showToast('Partida reiniciada!');
    }
  });

  // How to Play Modal
  btnInfo.addEventListener('click', () => {
    game.sound.playClick();
    modalInfo.classList.remove('hidden');
  });

  // Leaderboard Modal
  btnLeaderboard.addEventListener('click', () => {
    game.sound.playClick();
    openLeaderboardModal();
  });

  // Play Again (Game Over)
  btnPlayAgain.addEventListener('click', () => {
    game.sound.playClick();
    modalGameOver.classList.add('hidden');
    game.startNewGame();
  });

  // Modal Close Buttons
  document.querySelectorAll('.modal-close, [data-close]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      game.sound.playClick();
      const modalId = btn.getAttribute('data-close') || btn.closest('.modal-overlay').id;
      const targetModal = document.getElementById(modalId);
      if (targetModal) targetModal.classList.add('hidden');
    });
  });

  // Close modal when clicking outside card
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && overlay.id !== 'modal-gameover') {
        overlay.classList.add('hidden');
      }
    });
  });

  // Leaderboard Tab Switching
  tabGlobal.addEventListener('click', () => {
    game.sound.playClick();
    currentLeaderboardTab = 'global';
    tabGlobal.classList.add('active');
    tabLocal.classList.remove('active');
    renderLeaderboardView();
  });

  tabLocal.addEventListener('click', () => {
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

    let html = '';
    scores.forEach((entry, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
      const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : `#${rank}`;

      html += `
        <div class="leaderboard-row ${rankClass}">
          <div class="lb-left">
            <span class="lb-rank">${medal}</span>
            <div class="lb-info">
              <span class="lb-name">${escapeHTML(entry.name || 'Anônimo')}</span>
              <span class="lb-sub">⏱️ ${LeaderboardManager.formatTime(entry.time || 0)} • 💥 ${entry.clears || 0} clears ${entry.date ? `• ${entry.date}` : ''}</span>
            </div>
          </div>
          <div class="lb-right">
            <span class="lb-score">${(entry.score || 0).toLocaleString('pt-BR')} pts</span>
            ${entry.combo && entry.combo > 1 ? `<span class="lb-time">Combo máx: x${entry.combo}</span>` : ''}
          </div>
        </div>
      `;
    });

    leaderboardList.innerHTML = html;
  }

  // Submit Score in Game Over Modal (manual override ou primeiro salvamento)
  if (playerNicknameInput) {
    playerNicknameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSubmitScore.click();
      }
    });
  }

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
