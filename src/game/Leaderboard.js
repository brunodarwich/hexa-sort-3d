/**
 * Leaderboard.js
 * Manages LocalStorage high scores and Global Online leaderboard synchronization.
 */

import { supabase, isSupabaseConfigured } from '../services/supabase.js';
import { authService } from '../services/auth.js';

const LOCAL_STORAGE_KEY = 'hexa_sort_local_scores_v2';
const NICKNAME_KEY = 'hexa_sort_player_nickname';
const PLAYER_ID_KEY = 'hexa_sort_player_id_v2';
const GLOBAL_STORAGE_KEY = 'hexa_sort_global_cache_v3';

export class LeaderboardManager {
  constructor() {
    let playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (!playerId) {
      playerId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'p_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(PLAYER_ID_KEY, playerId);
    }
    this.playerId = playerId;
    this.globalStatus = 'unavailable';
    this.lastSubmitSynced = false;
    
    // Se não houver apelido salvo, definir um apelido padrão inicial
    let saved = localStorage.getItem(NICKNAME_KEY);
    if (!saved) {
      const suffix = playerId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
      saved = `Jogador #${suffix || Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem(NICKNAME_KEY, saved);
    }
    this.savedNickname = saved;
  }

  getPlayerId() {
    return this.playerId;
  }

  getSavedNickname() {
    return this.savedNickname || 'Jogador';
  }

  setSavedNickname(name) {
    const trimmed = (name || '').trim().slice(0, 15);
    if (trimmed) {
      this.savedNickname = trimmed;
      localStorage.setItem(NICKNAME_KEY, this.savedNickname);

      // Sincronizar perfil do jogador no Supabase em background
      if (isSupabaseConfigured && supabase) {
        authService.ensureSession().then(session => {
          if (!session?.user?.id) return;
          this.playerId = session.user.id;
          return supabase.from('players').upsert({
            id: session.user.id,
            username: this.savedNickname,
            last_active_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }).then((res) => {
          if (res?.error) console.warn('Aviso ao sincronizar perfil do jogador:', res.error.message);
        }).catch(err => {
          console.warn('Aviso ao autenticar perfil:', err.message);
        });
      }
    }
  }

  /**
   * Get highest recorded local score
   */
  getHighScore() {
    const local = this.getLocalScores();
    if (local.length > 0) {
      return local[0].score;
    }
    return 0;
  }

  /**
   * Remove pontuações idênticas/duplicadas (mesmo jogador e mesma pontuação exata)
   */
  static deduplicateScores(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const unique = [];

    for (const item of list) {
      if (!item) continue;
      const nameKey = (item.name || item.player_name || 'Anônimo').trim().toLowerCase();
      const scoreKey = Number(item.score) || 0;
      const key = `${nameKey}_${scoreKey}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Retrieve personal scores from localStorage
   */
  getLocalScores() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return LeaderboardManager.deduplicateScores(parsed);
        }
      }
    } catch (e) {
      console.error('Error reading local scores:', e);
    }
    return [];
  }

  /**
   * Save a completed game run to local scores
   */
  saveLocalScore(scoreData) {
    const scores = this.getLocalScores();
    const cleanName = (scoreData.name || 'Anônimo').trim();
    const targetScore = Number(scoreData.score) || 0;

    // Evitar salvar duplicada local se já houver a mesma pontuação exata do mesmo jogador
    const exists = scores.some(s => 
      (s.name || '').trim().toLowerCase() === cleanName.toLowerCase() &&
      Number(s.score) === targetScore
    );

    if (!exists) {
      scores.push({
        ...scoreData,
        name: cleanName,
        score: targetScore,
        date: new Date().toLocaleDateString('pt-BR')
      });
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);
    const uniqueScores = LeaderboardManager.deduplicateScores(scores);
    const topScores = uniqueScores.slice(0, 100);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(topScores));
    } catch (e) {
      console.error('Error saving local score:', e);
    }
    return topScores;
  }

  /**
   * Fetch online global leaderboard with resilient caching and Supabase integration
   */
  async getGlobalScores() {
    try {
      if (!supabase) throw new Error('Offline');
      const { data, error } = await supabase.from('global_leaderboard').select('*')
        .order('score', { ascending: false }).order('time_seconds', { ascending: true }).limit(200);
      if (error) throw error;
      const scores = LeaderboardManager.deduplicateScores((data || []).map(item => ({
        name: item.player_name,
        score: item.score,
        time: item.time_seconds,
        clears: item.clears,
        combo: item.combo,
        avatar: item.avatar_url || null,
        date: new Date(item.created_at).toLocaleDateString('pt-BR')
      }))).slice(0, 100);
      this.globalStatus = 'live';
      try { localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(scores)); } catch {}
      return scores;
    } catch {
      try {
        const cached = JSON.parse(localStorage.getItem(GLOBAL_STORAGE_KEY) || 'null');
        if (Array.isArray(cached)) { this.globalStatus = 'cached'; return cached; }
      } catch {}
      this.globalStatus = 'unavailable';
      return [];
    }
  }

  /**
   * Submit new score to Global (Supabase) and Local leaderboards
   */
  async submitScore({ name, score, time, clears, combo }) {
    this.lastSubmitSynced = false;
    this.setSavedNickname(name);

    const playerName = (name || 'Anônimo').trim();
    const targetScore = Number(score) || 0;
    const currentUser = await authService.getCurrentUser();
    const cachedAvatar = localStorage.getItem('hexa_sort_player_avatar_url');
    const avatarUrl = currentUser?.user_metadata?.avatar_url || 
                      currentUser?.user_metadata?.picture || 
                      cachedAvatar || 
                      null;

    const record = {
      name: playerName,
      score: targetScore,
      time,
      clears,
      combo,
      avatar: avatarUrl,
      date: new Date().toLocaleDateString('pt-BR')
    };

    // 1. Salvar localmente
    this.saveLocalScore(record);

    // 2. Enviar ao Supabase se configurado (evita envio de duplicata imediata idêntica)
    if (isSupabaseConfigured && supabase && targetScore > 0) {
      try {
        const session = await authService.ensureSession();
        if (!session?.user?.id) throw new Error('Sessão de usuário indisponível');
        this.playerId = session.user.id;

        // Upsert do perfil do jogador (tolerante a colunas extras)
        try {
          const profilePayload = {
            id: this.playerId,
            username: playerName,
            last_active_at: new Date().toISOString()
          };
          if (avatarUrl) profilePayload.avatar_url = avatarUrl;

          const { error: profileError } = await supabase.from('players').upsert(profilePayload, { onConflict: 'id' });
          if (profileError) {
            console.warn('Aviso no upsert do perfil do jogador:', profileError.message);
            if (profileError.message?.includes('avatar_url') || profileError.message?.includes('permission denied')) {
              delete profilePayload.avatar_url;
              await supabase.from('players').upsert({
                id: this.playerId,
                username: playerName,
                last_active_at: new Date().toISOString()
              }, { onConflict: 'id' });
            }
          }
        } catch (profEx) {
          console.warn('Exceção ao atualizar perfil:', profEx);
        }

        const { data: recent } = await supabase
          .from('game_sessions')
          .select('score, time_seconds')
          .eq('player_id', this.playerId)
          .order('created_at', { ascending: false })
          .limit(1);

        const isExactRecentDuplicate = recent && recent.length > 0 && 
          recent[0].score === targetScore && 
          recent[0].time_seconds === time;

        if (!isExactRecentDuplicate) {
          const { error } = await supabase
            .from('game_sessions')
            .insert({
              player_id: this.playerId,
              player_name: playerName,
              score: targetScore,
              time_seconds: time,
              clears,
              combo
            });

          if (error) {
            throw error;
          }
        }
        this.lastSubmitSynced = true;
      } catch (err) {
        console.error('Erro ao enviar pontuação para o Supabase:', err);
      }
    }

    return true;
  }

  /**
   * Calcula o percentil e o tier do jogador em relação à base de dados de pontuações
   * @param {number} score Pontuação do jogador
   * @returns {Promise<Object>} Estatísticas de percentil, tier, ícone e texto
   */
  async getScoreStats(score) {
    const targetScore = Math.max(0, Number(score) || 0);
    let percentile = null;
    if (supabase) {
      try {
        const [total, lower] = await Promise.all([
          supabase.from('game_sessions').select('*', { count: 'exact', head: true }),
          supabase.from('game_sessions').select('*', { count: 'exact', head: true }).lt('score', targetScore)
        ]);
        if (!total.error && !lower.error && total.count > 5) percentile = Math.round(lower.count / total.count * 100);
      } catch {}
    }

    // 2. Definir Tiers e Badges Visuais
    let tier = 'Aspirante';
    let icon = '🎯';
    let badgeClass = 'tier-rookie';
    let topText = 'Em Evolução';

    if (percentile >= 98 || targetScore >= 80000) {
      tier = 'Mestre Hexa';
      icon = '👑';
      badgeClass = 'tier-master';
      topText = 'Top 1% Global';
    } else if (percentile >= 90 || targetScore >= 45000) {
      tier = 'Diamante';
      icon = '💎';
      badgeClass = 'tier-diamond';
      topText = `Top ${Math.max(1, 100 - percentile)}% Global`;
    } else if (percentile >= 75 || targetScore >= 20000) {
      tier = 'Ouro';
      icon = '🥇';
      badgeClass = 'tier-gold';
      topText = `Top ${100 - percentile}% Global`;
    } else if (percentile >= 50 || targetScore >= 8000) {
      tier = 'Prata';
      icon = '🥈';
      badgeClass = 'tier-silver';
      topText = `Top ${100 - percentile}% Global`;
    } else if (percentile >= 25 || targetScore >= 3000) {
      tier = 'Bronze';
      icon = '🥉';
      badgeClass = 'tier-bronze';
      topText = `Top ${100 - percentile}% Global`;
    }

    return {
      score: targetScore,
      percentile,
      tier,
      icon,
      badgeClass,
      topText: percentile === null ? 'Classificação por pontuação' : `Acima de ${percentile}% das partidas`,
      betterThanText: percentile === null ? 'Ainda não há dados suficientes para comparação.' : `Pontuação maior que ${percentile}% das partidas registradas`
    };
  }

  /**
   * Format seconds to MM:SS string
   */
  static formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
