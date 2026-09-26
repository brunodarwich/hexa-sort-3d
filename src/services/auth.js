/**
 * src/services/auth.js
 * Gerenciamento de Autenticação Supabase com Suporte a Google OAuth
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, isSupabaseConfigured } from './supabase.js';

const GOOGLE_USER_CACHE_KEY = 'hexa_sort_google_user_v1';
const PLAYER_ID_KEY = 'hexa_sort_player_id_v2';
const NICKNAME_KEY = 'hexa_sort_player_nickname';
const PENDING_MERGE_KEY = 'hexa_sort_pending_guest_merge_v1';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];

    if (Capacitor.isNativePlatform()) {
      // Capturar retornos de Deep Link (OAuth com Google no Android)
      App.addListener('appUrlOpen', async (event) => {
        try {
          const url = event?.url;
          if (!url) return;
          if (url.includes('access_token=') || url.includes('refresh_token=') || url.includes('code=')) {
            await Browser.close().catch(() => {});

            if (url.includes('#')) {
              const hash = url.split('#')[1];
              const params = new URLSearchParams(hash);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              if (accessToken && refreshToken && supabase) {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                });
              }
            } else if (url.includes('?')) {
              const query = url.split('?')[1];
              const params = new URLSearchParams(query);
              const code = params.get('code');
              if (code && supabase) {
                await supabase.auth.exchangeCodeForSession(code);
              }
            }
          }
        } catch (deepLinkErr) {
          console.warn('Erro ao processar Deep Link de autenticação:', deepLinkErr);
        }
      });
    }

    if (isSupabaseConfigured && supabase) {
      // Monitorar estado da sessão em tempo real
      supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user || null;
        this.currentUser = user;

        if (user && !user.is_anonymous) {
          try {
            localStorage.setItem(GOOGLE_USER_CACHE_KEY, JSON.stringify({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
              avatar: user.user_metadata?.avatar_url || null
            }));

            // Verificar se há uma conta anônima pendente para fusão
            const pendingGuestId = localStorage.getItem(PENDING_MERGE_KEY);
            if (pendingGuestId && pendingGuestId !== user.id) {
              try {
                const { data: mergeResult, error: mergeErr } = await supabase.rpc('merge_player_accounts', {
                  p_guest_id: pendingGuestId,
                  p_target_id: user.id
                });
                if (!mergeErr) {
                  console.log('Fusão de contas concluída com sucesso:', mergeResult);
                } else {
                  console.warn('Aviso na fusão de contas:', mergeErr.message);
                }
              } catch (mergeEx) {
                console.warn('Exceção durante fusão de contas:', mergeEx);
              } finally {
                localStorage.removeItem(PENDING_MERGE_KEY);
              }
            }

            // Sincronizar na tabela players
            setTimeout(() => this.syncPlayerProfile(user), 0);
          } catch (e) {
            console.warn('Erro ao armazenar cache de autenticação:', e);
          }
        } else {
          localStorage.removeItem(GOOGLE_USER_CACHE_KEY);
        }

        this.notifyListeners(user?.is_anonymous ? null : user);
      });
    }
  }

  async ensureSession() {
    if (!isSupabaseConfigured || !supabase) throw new Error('Conexão online indisponível.');
    if (!this.sessionPromise) {
      this.sessionPromise = (async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) { this.currentUser = session.user; return session; }
        const { data, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw new Error('Não foi possível conectar. Tente novamente mais tarde.');
        this.currentUser = data.user;
        return data.session;
      })().finally(() => { this.sessionPromise = null; });
    }
    return this.sessionPromise;
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

    return null;
  }

  /**
   * Retorna o ID ativo do jogador (se autenticado com Google, usa user.id; senão, usa playerId anônimo)
   */
  getActivePlayerId() {
    if (this.currentUser?.id) {
      return this.currentUser.id;
    }
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
   * Inicia o fluxo oficial de Login com Google com suporte a vinculação direta ou fusão
   */
  async signInWithGoogle() {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não está configurado neste ambiente.');
    }

    const isNative = Capacitor.isNativePlatform();
    const redirectTo = isNative
      ? 'com.brunodarwich.hexainfinity://auth/callback'
      : (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');

    const session = await this.ensureSession();
    const currentUserId = session?.user?.id;

    if (currentUserId && session?.user?.is_anonymous) {
      // Salvar o ID anônimo para caso seja necessário fusão com conta existente
      localStorage.setItem(PENDING_MERGE_KEY, currentUserId);

      // Tentar vincular a identidade Google diretamente ao usuário anônimo
      try {
        const { data: linkData, error: linkError } = await supabase.auth.linkIdentity({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: isNative
          }
        });

        if (!linkError && linkData) {
          if (isNative && linkData.url) {
            await Browser.open({ url: linkData.url, windowName: '_system' });
          }
          return linkData;
        }
      } catch (linkErr) {
        console.warn('linkIdentity não disponível ou falhou, usando fallback OAuth padrão:', linkErr);
      }
    }

    const options = {
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: isNative
      }
    };
    const { data, error } = await supabase.auth.signInWithOAuth(options);

    if (error) {
      console.error('Erro no login com Google:', error);
      throw error;
    }

    if (isNative && data?.url) {
      await Browser.open({ url: data.url, windowName: '_system' });
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
    localStorage.removeItem(PENDING_MERGE_KEY);
    this.notifyListeners(null);
  }

  /**
   * Executa a exclusão de conta e anonimização de histórico conforme LGPD (Art. 12) e Google Play
   */
  async deleteAndAnonymizeAccount() {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Serviço indisponível no momento.');
    }
    const session = await this.ensureSession();
    if (!session?.user?.id) {
      throw new Error('Nenhuma conta ativa para exclusão.');
    }
    const { data, error } = await supabase.rpc('delete_and_anonymize_user');
    if (error) {
      console.error('Erro ao anonimizar conta:', error);
      throw error;
    }
    await this.signOut();
    localStorage.clear();
    return data;
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

    localStorage.setItem(NICKNAME_KEY, displayName);

    const { error } = await supabase.from('players').upsert({
      id: user.id,
      username: displayName,
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
    if (this.currentUser && !this.currentUser.is_anonymous) {
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
