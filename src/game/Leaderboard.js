/**
 * Leaderboard.js
 * Manages LocalStorage high scores and Global Online leaderboard synchronization.
 */

import { supabase, isSupabaseConfigured } from '../services/supabase.js';

const LOCAL_STORAGE_KEY = 'hexa_sort_local_scores_v2';
const NICKNAME_KEY = 'hexa_sort_player_nickname';
const PLAYER_ID_KEY = 'hexa_sort_player_id_v2';
const GLOBAL_STORAGE_KEY = 'hexa_sort_global_cache_v2';

// Placar inicial zerado (sem jogadores fictícios/mockados)
const DEFAULT_GLOBAL_LEADERBOARD = [];

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
    this.savedNickname = localStorage.getItem(NICKNAME_KEY) || '';
  }

  getPlayerId() {
    return this.playerId;
  }

  getSavedNickname() {
    return this.savedNickname;
  }

  setSavedNickname(name) {
    const trimmed = (name || '').trim().slice(0, 15);
    if (trimmed) {
      this.savedNickname = trimmed;
      localStorage.setItem(NICKNAME_KEY, this.savedNickname);

      // Sincronizar perfil do jogador no Supabase em background
      if (isSupabaseConfigured && supabase) {
        supabase.from('players').upsert({
          id: this.playerId,
          username: this.savedNickname,
          last_active_at: new Date().toISOString()
        }, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.warn('Aviso ao sincronizar perfil do jogador:', error.message);
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
    // 1. Tentar buscar do Supabase caso esteja configurado
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('global_leaderboard')
          .select('*')
          .limit(200); // Buscar até 200 registros para garantir 100 pontuações únicas

        if (!error && data && data.length > 0) {
          const formatted = data.map(item => ({
            name: item.player_name,
            score: item.score,
            time: item.time_seconds,
            clears: item.clears,
            combo: item.combo,
            date: new Date(item.created_at).toLocaleDateString('pt-BR')
          }));

          const unique = LeaderboardManager.deduplicateScores(formatted).slice(0, 100);

          // Atualizar cache local
          localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(unique));
          return unique;
        }
      } catch (err) {
        console.warn('Falha ao consultar Supabase, utilizando cache local:', err);
      }
    }

    // 2. Fallback para cache local / seeded list
    try {
      const cached = localStorage.getItem(GLOBAL_STORAGE_KEY);
      let globalList = cached ? JSON.parse(cached) : [...DEFAULT_GLOBAL_LEADERBOARD];

      globalList.sort((a, b) => b.score - a.score);
      const unique = LeaderboardManager.deduplicateScores(globalList);
      return unique.slice(0, 100);
    } catch (e) {
      console.warn('Could not fetch remote leaderboard, using cached fallback:', e);
      return DEFAULT_GLOBAL_LEADERBOARD;
    }
  }

  /**
   * Submit new score to Global (Supabase) and Local leaderboards
   */
  async submitScore({ name, score, time, clears, combo }) {
    this.setSavedNickname(name);

    const playerName = (name || 'Anônimo').trim();
    const targetScore = Number(score) || 0;
    const record = {
      name: playerName,
      score: targetScore,
      time,
      clears,
      combo,
      date: new Date().toLocaleDateString('pt-BR')
    };

    // 1. Salvar localmente
    this.saveLocalScore(record);

    // 2. Enviar ao Supabase se configurado (evita envio de duplicata imediata idêntica)
    if (isSupabaseConfigured && supabase && targetScore > 0) {
      try {
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
            console.warn('Aviso ao submeter pontuação no Supabase:', error.message);
          }
        }
      } catch (err) {
        console.error('Erro ao enviar pontuação para o Supabase:', err);
      }
    }

    // 3. Atualizar cache local
    try {
      let globalList = await this.getGlobalScores();
      const cleanName = playerName.toLowerCase();
      if (!globalList.some(r => (r.name || '').trim().toLowerCase() === cleanName && r.score === targetScore)) {
        globalList.push(record);
        globalList.sort((a, b) => b.score - a.score);
        const unique = LeaderboardManager.deduplicateScores(globalList);
        localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(unique.slice(0, 100)));
      }
    } catch (e) {
      console.error('Failed to update global list cache:', e);
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
    let percentile = 50;
    let totalSessions = 0;

    // 1. Tentar calcular via Supabase em tempo real
    if (isSupabaseConfigured && supabase) {
      try {
        const [totalRes, lowerRes] = await Promise.all([
          supabase.from('game_sessions').select('*', { count: 'exact', head: true }),
          supabase.from('game_sessions').select('*', { count: 'exact', head: true }).lt('score', targetScore)
        ]);

        if (totalRes.count && totalRes.count > 5) {
          totalSessions = totalRes.count;
          const lowerCount = lowerRes.count || 0;
          percentile = Math.min(99, Math.max(1, Math.round((lowerCount / totalSessions) * 100)));
        } else {
          percentile = this.calculateBenchmarkPercentile(targetScore);
        }
      } catch (err) {
        console.warn('Erro ao calcular estatísticas no Supabase, usando benchmark:', err);
        percentile = this.calculateBenchmarkPercentile(targetScore);
      }
    } else {
      percentile = this.calculateBenchmarkPercentile(targetScore);
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
      topText,
      betterThanText: percentile > 0 ? `Melhor que ${percentile}% dos jogadores` : 'Inicie sua jornada no Ranking!'
    };
  }

  /**
   * Curva de benchmark calibrada de pontuação
   */
  calculateBenchmarkPercentile(score) {
    if (score >= 100000) return 99;
    if (score >= 60000) return 95;
    if (score >= 35000) return 88;
    if (score >= 20000) return 78;
    if (score >= 10000) return 65;
    if (score >= 5000) return 48;
    if (score >= 2000) return 30;
    if (score >= 800) return 18;
    return 8;
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
