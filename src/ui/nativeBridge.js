/**
 * src/ui/nativeBridge.js
 * Android native bridge for hardware back button, status bar styling, and app lifecycle.
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export class NativeBridge {
  static isNative() {
    return Capacitor.isNativePlatform();
  }

  static init({ onBackAction, getActiveScreen, switchScreen } = {}) {
    if (!this.isNative()) return;

    // 1. Configurar barra de status imersiva
    this.configureStatusBar();

    // 2. Tratar botão voltar físico do Android
    App.addListener('backButton', ({ canGoBack }) => {
      // Prioridade 1: Fechar qualquer modal ou overlay aberto
      const openModals = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
      if (openModals.length > 0) {
        const topModal = openModals[openModals.length - 1];
        topModal.classList.add('hidden');
        if (topModal.id === 'modal-payment') {
          window.dispatchEvent(new CustomEvent('close-payment-modal'));
        }
        return;
      }

      // Prioridade 2: Se estiver em tela secundária (ranking, perfil), voltar para home
      if (typeof getActiveScreen === 'function' && typeof switchScreen === 'function') {
        const currentScreen = getActiveScreen();
        if (currentScreen === 'ranking' || currentScreen === 'profile') {
          switchScreen('home');
          return;
        } else if (currentScreen === 'game') {
          // Se estiver no jogo, pode pausar ou voltar para home
          switchScreen('home');
          return;
        }
      }

      // Prioridade 3: Callback personalizado
      if (typeof onBackAction === 'function') {
        const handled = onBackAction();
        if (handled) return;
      }

      // Prioridade 4: Se na tela inicial sem modais, minimizar o aplicativo
      App.minimizeApp();
    });
  }

  static async configureStatusBar(theme = 'light') {
    if (!this.isNative()) return;
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({
        style: theme === 'dark' ? Style.Dark : Style.Light
      });
    } catch (e) {
      console.warn('Configuração de StatusBar não disponível:', e);
    }
  }

  static async updateTheme(theme) {
    if (!this.isNative()) return;
    await this.configureStatusBar(theme);
  }
}
