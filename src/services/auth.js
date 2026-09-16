/**
 * src/services/auth.js
 * Gerenciamento de Autenticação Supabase com Suporte a Google OAuth
 */

import { supabase, isSupabaseConfigured } from './supabase.js';

const GOOGLE_USER_CACHE_KEY = 'hexa_sort_google_user_v1';
const PLAYER_ID_KEY = 'hexa_sort_player_id_v2';
const NICKNAME_KEY = 'hexa_sort_player_nickname';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];

    if (isSupabaseConfigured && supabase) {
      // Monitorar estado da sessão em tempo real
      supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user || null;
        this.currentUser = user;

        if (user) {
          try {
            localStorage.setItem(GOOGLE_USER_CACHE_KEY, JSON.stringify({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
              avatar: user.user_metadata?.avatar_url || null
            }));

            // Sincronizar na tabela players
            await this.syncPlayerProfile(user);
          } catch (e) {
            console.warn('Erro ao armazenar cache de autenticação:', e);
          }
        } else {
          localStorage.removeItem(GOOGLE_USER_CACHE_KEY);
        }

        this.notifyListeners(user);
      });
    }
  }

  /**
   * Retorna o usuário logado atualmente (ou cache local)
   */
  async getCurrentUser() {
    if (this.currentUser) return this.currentUser;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          this.currentUser = session.user;
          return session.user;
        }
      } catch (e) {
        console.warn('Falha ao obter sessão do Supabase:', e);
      }
    }

    // Fallback para cache local
    try {
      const cached = localStorage.getItem(GOOGLE_USER_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    return null;
  }

  /**
   * Retorna o ID ativo do jogador (se autenticado com Google, usa user.id; senão, usa playerId anônimo)
   */
  getActivePlayerId() {
    if (this.currentUser?.id) {
      return this.currentUser.id;
    }
    try {
      const cached = localStorage.getItem(GOOGLE_USER_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) return parsed.id;
      }
    } catch (e) {}

    let guestId = localStorage.getItem(PLAYER_ID_KEY);
    if (!guestId) {
      guestId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'p_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(PLAYER_ID_KEY, guestId);
    }
    return guestId;
  }

  /**
   * Inicia o fluxo oficial de Login com Google
   */
  async signInWithGoogle() {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não está configurado neste ambiente.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      console.error('Erro no login com Google:', error);
      throw error;
    }

    return data;
  }

  /**
   * Realiza logout da conta
   */
  async signOut() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    this.currentUser = null;
    localStorage.removeItem(GOOGLE_USER_CACHE_KEY);
    this.notifyListeners(null);
  }

  /**
   * Sincroniza os dados do Google na tabela public.players
   */
  async syncPlayerProfile(user) {
    if (!isSupabaseConfigured || !supabase || !user) return;

    const displayName = user.user_metadata?.full_name || 
                        localStorage.getItem(NICKNAME_KEY) || 
                        user.email?.split('@')[0] || 
                        'Jogador';
    const avatarUrl = user.user_metadata?.avatar_url || null;

    localStorage.setItem(NICKNAME_KEY, displayName);

    const { error } = await supabase.from('players').upsert({
      id: user.id,
      username: displayName,
      email: user.email,
      avatar_url: avatarUrl,
      last_active_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao atualizar perfil do jogador:', error.message);
    }
  }

  /**
   * Registra listener para mudanças no estado de login
   */
  onAuthStateChanged(callback) {
    this.authListeners.push(callback);
    // Dispara imediatamente com o estado atual se já conhecido
    if (this.currentUser) {
      callback(this.currentUser);
    }
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(user) {
    for (const listener of this.authListeners) {
      try {
        listener(user);
      } catch (e) {
        console.error('Erro em listener de auth:', e);
      }
    }
  }
}

export const authService = new AuthService();
