/**
 * Leaderboard.js
 * Manages LocalStorage high scores and Global Online leaderboard synchronization.
 */

import { supabase, isSupabaseConfigured } from '../services/supabase.js';

const LOCAL_STORAGE_KEY = 'hexa_sort_local_scores_v1';
const NICKNAME_KEY = 'hexa_sort_player_nickname';
const GLOBAL_STORAGE_KEY = 'hexa_sort_global_cache_v1';

// Seeded global benchmark players
const DEFAULT_GLOBAL_LEADERBOARD = [
  { name: 'HexaMaster', score: 12450, time: 480, clears: 38, combo: 7, date: '14/09/2026' },
  { name: 'PuzzleKing', score: 9820, time: 395, clears: 29, combo: 6, date: '14/09/2026' },
  { name: 'CyberStacker', score: 8150, time: 330, clears: 24, combo: 5, date: '15/09/2026' },
  { name: 'NeonGamer', score: 6700, time: 275, clears: 20, combo: 5, date: '15/09/2026' },
  { name: 'SortWizard', score: 5420, time: 240, clears: 17, combo: 4, date: '15/09/2026' },
  { name: 'AeroHex', score: 4300, time: 190, clears: 13, combo: 4, date: '15/09/2026' },
  { name: 'PixelPro', score: 3250, time: 160, clears: 10, combo: 3, date: '15/09/2026' },
  { name: 'Zenith', score: 2400, time: 125, clears: 7, combo: 3, date: '15/09/2026' },
  { name: 'Nova', score: 1850, time: 95, clears: 5, combo: 2, date: '15/09/2026' },
  { name: 'PlayerOne', score: 1200, time: 70, clears: 3, combo: 2, date: '15/09/2026' }
];

export class LeaderboardManager {
  constructor() {
    this.savedNickname = localStorage.getItem(NICKNAME_KEY) || '';
  }

  getSavedNickname() {
    return this.savedNickname;
  }

  setSavedNickname(name) {
    this.savedNickname = name.trim();
    if (this.savedNickname) {
      localStorage.setItem(NICKNAME_KEY, this.savedNickname);
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
   * Retrieve personal scores from localStorage
   */
  getLocalScores() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
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
    scores.push({
      ...scoreData,
      date: new Date().toLocaleDateString('pt-BR')
    });

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 15);

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
          .limit(15);

        if (!error && data && data.length > 0) {
          const formatted = data.map(item => ({
            name: item.player_name,
            score: item.score,
            time: item.time_seconds,
            clears: item.clears,
            combo: item.combo,
            date: new Date(item.created_at).toLocaleDateString('pt-BR')
          }));

          // Atualizar cache local
          localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(formatted));
          return formatted;
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
      return globalList.slice(0, 15);
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

    const playerName = name || 'Anônimo';
    const record = {
      name: playerName,
      score,
      time,
      clears,
      combo,
      date: new Date().toLocaleDateString('pt-BR')
    };

    // 1. Salvar localmente
    this.saveLocalScore(record);

    // 2. Enviar ao Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('game_sessions')
          .insert({
            player_name: playerName,
            score,
            time_seconds: time,
            clears,
            combo
          });

        if (error) {
          console.warn('Aviso ao submeter pontuação no Supabase:', error.message);
        }
      } catch (err) {
        console.error('Erro ao enviar pontuação para o Supabase:', err);
      }
    }

    // 3. Atualizar cache local
    try {
      let globalList = await this.getGlobalScores();
      if (!globalList.some(r => r.name === playerName && r.score === score)) {
        globalList.push(record);
        globalList.sort((a, b) => b.score - a.score);
        globalList = globalList.slice(0, 20);
        localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(globalList));
      }
    } catch (e) {
      console.error('Failed to update global list cache:', e);
    }

    return true;
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
