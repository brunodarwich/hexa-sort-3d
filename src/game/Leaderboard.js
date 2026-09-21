/**
 * Leaderboard.js
 * Manages LocalStorage high scores and Global Online leaderboard synchronization.
 */

import { supabase, isSupabaseConfigured } from '../services/supabase.js';

const LOCAL_STORAGE_KEY = 'hexa_sort_local_scores_v2';
const NICKNAME_KEY = 'hexa_sort_player_nickname';
const PLAYER_ID_KEY = 'hexa_sort_player_id_v2';
const GLOBAL_STORAGE_KEY = 'hexa_sort_global_cache_v2';

// Placar inicial com competidores de referência do Stitch (atualizado dinamicamente pelo Supabase)
const DEFAULT_GLOBAL_LEADERBOARD = [
  {
    name: 'NovaMaster',
    score: 489120,
    time: 840,
    clears: 68,
    combo: 18,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCet3Ww9fqxydrAJDyCMDwYxoE3QK112oo0AGMIksNjgJqJMRT9DnF0v_9WM5wcT-63fRSoNyUD02X_doQPVk7QFkCjCA0ti-Xn82pUxOHP5d4HL8PhRy0b9jT2Vttg_AisjUV3cW2zGjjrOF8icAU8r5oMDRzhIV8AbCA4EvjeN2szszFemUqCYyRKiTgzg4u_S7xX9JaD7LAD_e2Zyh12nvdg5HGxz2OGPWWuI_mZ94p9BES9_rCOmA',
    tier: 'Lendário',
    verified: true
  },
  {
    name: 'AstralWalker',
    score: 312450,
    time: 620,
    clears: 45,
    combo: 15,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0yL0BDJ8C3FW4YsNEgzNiU3FNu-rbwzpXZDKdzfaCt8KbGBywoMu4bqnMPf6H2gHa_0GH6VlRaF6Rr2szHz5BVk1w-n3Xcp5lcJx7tLqVnmF6ThZsHqa0GuC2lEIETI9mm3Lr241DBUoGDXFlzeDO29GU7RKkUNHn2KFb40h3NebYLkpHjrRJtQRDUVcQtUtY281I0sm7yP9cBPtO24zxnypvvwUlF3h9tIwLiZHkVHdgRBy8Y6F7NA',
    tier: 'Mestre'
  },
  {
    name: 'StarGazer',
    score: 287900,
    time: 580,
    clears: 42,
    combo: 14,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYIi3Rx3Xc3S_8LmpqOqo3ITEbXsKtnBnHEWTg8mej548Kwm-6Yj8XMXtR1O5EXR-52b51fjpV5zEVsST4mok3357xZnYEIrmGaDRic56xllXDKFYDhitGA69lluMEyPns74HsbqaJNGc47a9gXcpXuLJKFekffScVbYbhy5w3kAou-0aLkpwccbsLx7ayfiMYlkvxm7DpyG7r96xGpotjR6diZTIqoXCGUtuGKEE08LVchawuAFIN1A',
    tier: 'Elite'
  },
  {
    name: 'CosmoHex',
    score: 276400,
    time: 540,
    clears: 38,
    combo: 14,
    level: 16,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBP4OQKvMVUqfe_n8H2ZNv0PhIh-KFnJLWnFcRMZUWVd9kflU878uHr3rUTMJYEOSShyls5iexFJCeiElQ1Vi9x_97LRaNlOjNJQWZfd6ZeWsf_Emxac42n-2-shL2vnOow5NQXhTkCnHqy1uDpnK8yxl_Slt74duxDF__c9IDPYSR0fCFJOsusP6Xz-PF6S4VhU_Xhc8rYn0KfeSjZQzW1wLTjC5yY_cQgRdEELEAD_9VMsEbJYiVdKQ'
  },
  {
    name: 'PixelVoyager',
    score: 268150,
    time: 510,
    clears: 36,
    combo: 12,
    level: 15,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADD88z2Zfwc1JNz2Ev3IPbS1ZlpPJi3sFYy4rQHZxo09jcPd7fO7HPyJaB9L4W9hiQtobdtvJU3Z2sKmWK9HwYUSIRWWJoXxU1AJCcLG5G3jJXFP1gvK-fVgJPVO7M6LE9uHPoByIvHdHUn-lMmHuZKgxRVnHizIxeU9ug212aHksxicC6hBvDIHSIFCn8EJlWPJoKZsBQ7-BDwbxa4yLLCRuDMnK2NQvr9F3fnozxSYlNvyQmGBjXyw'
  },
  {
    name: 'Quantum99',
    score: 255300,
    time: 480,
    clears: 33,
    combo: 10,
    level: 15,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwAxSfqAd_veDayYr-AOYvrrlOKlWxoTPNveL0qnUPbdlGFYQq3HWCh1GU1Pru7jr1uTJEX3vInTJfL96rafFnNUINpIeAUchk6xFz-utt_mdMBoIH8bi2X69Gf9fod7gICgyADNaPgCj6-S0_05LETDHkbceDJu6z_eoFKwlZaeOyyrBXGjf0c_K6csKLicfdlagoolLO7MPNgDWkGInPdPrisAMm_XWZ3yGtm3SCaOVgqUFrxDHiAw'
  },
  {
    name: 'NebulaRider',
    score: 251890,
    time: 460,
    clears: 31,
    combo: 9,
    level: 14,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgSny1vIMIEPcocIqE4Sof_XqgHRNferd0GdWC_2MtXt-DHBXj9TSK41G9GOJM0gBkACSFyGdu2V6mA6OTwNfjJ2ws3QWFyxVfaRPclw-aN8smdf5yxCmrpsk0SqG5MuL6ESjf677LStqc0BmgR-kvLutV62Th9uLY6r-8sGL8aS_hq2XvxT8veC9pINb4dliOp4nQGUaBSLlL8r07WDC8D1v4nUI-CMbH_SBTpBZTuIXYqGibPIsJyg'
  },
  {
    name: 'HyperLoop',
    score: 249200,
    time: 440,
    clears: 30,
    combo: 8,
    level: 13,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYjzSxg8Ae1wR-CYjJYXr--toHFYMkUsqluHOsDAmjhtIto1AHQq4xIhH-y18hdXMbruzlDkDiiVhUfyvwhOxbGhcESgzuEowy-OnIh6NAH6-zFMFpKpMS7fsMd-4QCrpvQ9Ihtka_bpXzdpLAX23qOx2ruJ5D8fXku3kgxygveqR-HH-LpWcWg4LJbtbCDjYIeqew3CZw4ZSx0f4ipdhr-WqqznMe8TgCBuCLZgPVqWjNI4XMccuUoA'
  }
];

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
