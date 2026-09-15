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
  const btnSound = document.getElementById('btn-sound');
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const btnRestart = document.getElementById('btn-restart');
  const btnInfo = document.getElementById('btn-info');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnSubmitScore = document.getElementById('btn-submit-score');
  const playerNicknameInput = document.getElementById('player-nickname');
  const submitStatus = document.getElementById('submit-status');

  const modalInfo = document.getElementById('modal-info');
  const modalLeaderboard = document.getElementById('modal-leaderboard');
  const modalGameOver = document.getElementById('modal-gameover');

  const tabGlobal = document.getElementById('tab-global');
  const tabLocal = document.getElementById('tab-local');
  const leaderboardList = document.getElementById('leaderboard-list');
  const leaderboardLoading = document.getElementById('leaderboard-loading');

  let currentLeaderboardTab = 'global'; // 'global' | 'local'

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

  // Submit Score in Game Over Modal
  btnSubmitScore.addEventListener('click', async () => {
    game.sound.playClick();
    const nickname = playerNicknameInput.value.trim() || 'Jogador';

    btnSubmitScore.disabled = true;
    submitStatus.textContent = 'Enviando pontuação...';
    submitStatus.className = 'submit-status';

    try {
      await leaderboard.submitScore({
        name: nickname,
        score: game.score,
        time: game.gameTimeSeconds,
        clears: game.totalClears,
        combo: game.maxCombo
      });

      submitStatus.textContent = '✓ Pontuação registrada com sucesso!';
      submitStatus.className = 'submit-status success';
      showToast('Recorde registrado no Ranking!');
    } catch (e) {
      submitStatus.textContent = 'Erro ao salvar. Salvo localmente.';
      submitStatus.className = 'submit-status error';
    } finally {
      setTimeout(() => {
        btnSubmitScore.disabled = false;
      }, 2000);
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
