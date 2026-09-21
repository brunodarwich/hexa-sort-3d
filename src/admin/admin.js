/**
 * src/admin/admin.js
 * Hexa Infinity - Painel de Controle e Estatísticas Administrativas
 */

import { supabase, isSupabaseConfigured } from '../services/supabase.js';

// Chave Secreta de Acesso configurada via .env ou fallback seguro para desenvolvimento
const ADMIN_ACCESS_KEY = import.meta.env.VITE_ADMIN_ACCESS_KEY || 'admin123';
const AUTH_STORAGE_KEY = 'hexainfinity_admin_auth';
const POLLING_INTERVAL_SECONDS = 30;

// Estado Global da Aplicação Admin
let isAuthorized = false;
let pollingTimer = null;
let countdownTimer = null;
let secondsUntilNextPoll = POLLING_INTERVAL_SECONDS;
let isFetching = false;

// Estado de Dados
let rawPlayers = [];
let rawSessions = [];
let rawOrders = [];
let rawInventories = [];

// Instâncias do Chart.js
let chartRevenue = null;
let chartAuth = null;
let chartPowerups = null;
let chartConversion = null;

// ==========================================
// 1. GERENCIAMENTO DE AUTENTICAÇÃO
// ==========================================

export function initAuth() {
  const storedAuth = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (storedAuth === 'true') {
    isAuthorized = true;
    showDashboard();
  } else {
    showLockScreen();
  }

  // Event Listeners de Login
  const loginForm = document.getElementById('login-form');
  const loginInput = document.getElementById('admin-key-input');
  const loginError = document.getElementById('login-error');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = loginInput.value.trim();
      if (entered === ADMIN_ACCESS_KEY) {
        isAuthorized = true;
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
        loginError.classList.add('hidden');
        showDashboard();
      } else {
        loginError.classList.remove('hidden');
        loginInput.classList.add('border-red-500');
        loginInput.value = '';
        loginInput.focus();
      }
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      isAuthorized = false;
      stopPolling();
      showLockScreen();
    });
  }
}

function showLockScreen() {
  document.getElementById('lock-screen')?.classList.remove('hidden');
  document.getElementById('dashboard-content')?.classList.add('hidden');
}

function showDashboard() {
  document.getElementById('lock-screen')?.classList.add('hidden');
  document.getElementById('dashboard-content')?.classList.remove('hidden');
  
  // Atualizar indicador de conexão
  updateConnectionBadge();
  
  // Iniciar carregamento de dados e polling
  refreshData();
  startPolling();
  setupUIEventListeners();
}

function updateConnectionBadge() {
  const badge = document.getElementById('supabase-status-badge');
  if (!badge) return;

  if (isSupabaseConfigured) {
    badge.innerHTML = `
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="text-emerald-300 text-xs font-semibold">Supabase Conectado</span>
    `;
    badge.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/50';
  } else {
    badge.innerHTML = `
      <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
      <span class="text-amber-300 text-xs font-semibold">Modo Simulação / Demo</span>
    `;
    badge.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-700/50';
  }
}

// ==========================================
// 2. BUSCA E SINCRONIZAÇÃO DE DADOS
// ==========================================

export async function refreshData() {
  if (isFetching) return;
  isFetching = true;
  setRefreshLoading(true);

  try {
    if (isSupabaseConfigured && supabase) {
      await fetchRealData();
    } else {
      loadDemoData();
    }

    renderKPIs();
    renderCharts();
    renderTables();
    updateLastSyncTimestamp();
  } catch (err) {
    console.warn('[Admin] Erro ao buscar dados do Supabase. Carregando dados demo...', err);
    loadDemoData();
    renderKPIs();
    renderCharts();
    renderTables();
    updateLastSyncTimestamp();
  } finally {
    isFetching = false;
    setRefreshLoading(false);
    resetCountdown();
  }
}

async function fetchRealData() {
  const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // 1. Buscar dados em paralelo
  const [resPlayers, resSessions, resOrders, resInventories] = await Promise.all([
    supabase.from('players').select('*').order('created_at', { ascending: false }),
    supabase.from('game_sessions').select('*').order('created_at', { ascending: false }),
    supabase.from('payment_orders').select('*').order('created_at', { ascending: false }),
    supabase.from('player_inventory').select('*')
  ]);

  // 2. Atualizar no Supabase pedidos pendentes com mais de 1h para 'expired'
  supabase
    .from('payment_orders')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', oneHourAgoIso)
    .then(() => {})
    .catch(() => {});

  rawPlayers = resPlayers.data || [];
  rawSessions = resSessions.data || [];
  
  // Normalizar status de ordens carregadas localmente
  const oneHourAgoTime = Date.now() - 60 * 60 * 1000;
  rawOrders = (resOrders.data || []).map(o => {
    if (o.status === 'pending' && new Date(o.created_at).getTime() < oneHourAgoTime) {
      return { ...o, status: 'expired' };
    }
    return o;
  });

  rawInventories = resInventories.data || [];

  // Se o banco estiver vazio, preenche com amostra para não ficar tudo zerado no primeiro acesso
  if (rawPlayers.length === 0 && rawOrders.length === 0) {
    loadDemoData();
  }
}

function loadDemoData() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 72 * 3600 * 1000);

  rawPlayers = [
    { id: 'p-101', username: 'HexaMaster', email: 'master@hexainfinity.io', avatar_emoji: '👑', created_at: threeDaysAgo.toISOString(), last_active_at: now.toISOString() },
    { id: 'p-102', username: 'BrunoDev', email: 'bruno@gmail.com', avatar_emoji: '🚀', created_at: twoDaysAgo.toISOString(), last_active_at: now.toISOString() },
    { id: 'p-103', username: 'Jogador_894', email: null, avatar_emoji: '🎮', created_at: twoDaysAgo.toISOString(), last_active_at: oneDayAgo.toISOString() },
    { id: 'p-104', username: 'ComboQueen', email: 'queen@sortgame.com', avatar_emoji: '⚡', created_at: oneDayAgo.toISOString(), last_active_at: now.toISOString() },
    { id: 'p-105', username: 'Anon_3812', email: null, avatar_emoji: '🎲', created_at: now.toISOString(), last_active_at: now.toISOString() },
    { id: 'p-106', username: 'PuzzleNinja', email: 'ninja@play.com', avatar_emoji: '🥷', created_at: now.toISOString(), last_active_at: now.toISOString() }
  ];

  rawSessions = [
    { id: 's-1', player_id: 'p-101', player_name: 'HexaMaster', score: 14520, time_seconds: 480, clears: 24, combo: 8, created_at: now.toISOString() },
    { id: 's-2', player_id: 'p-102', player_name: 'BrunoDev', score: 9800, time_seconds: 360, clears: 18, combo: 5, created_at: now.toISOString() },
    { id: 's-3', player_id: 'p-104', player_name: 'ComboQueen', score: 12200, time_seconds: 410, clears: 21, combo: 7, created_at: oneDayAgo.toISOString() },
    { id: 's-4', player_id: 'p-103', player_name: 'Jogador_894', score: 4350, time_seconds: 195, clears: 9, combo: 3, created_at: oneDayAgo.toISOString() },
    { id: 's-5', player_id: 'p-106', player_name: 'PuzzleNinja', score: 7600, time_seconds: 280, clears: 14, combo: 4, created_at: twoDaysAgo.toISOString() }
  ];

  rawOrders = [
    { id: 'ord-001', player_id: 'p-101', gateway: 'mercadopago', item_type: 'pack_reroll', quantity: 3, amount: 0.25, currency: 'BRL', status: 'paid', created_at: now.toISOString(), paid_at: now.toISOString() },
    { id: 'ord-002', player_id: 'p-102', gateway: 'stripe', item_type: 'combo_pack', quantity: 1, amount: 1.00, currency: 'USD', status: 'paid', created_at: oneDayAgo.toISOString(), paid_at: oneDayAgo.toISOString() },
    { id: 'ord-003', player_id: 'p-104', gateway: 'mercadopago', item_type: 'lightning', quantity: 1, amount: 0.25, currency: 'BRL', status: 'paid', created_at: oneDayAgo.toISOString(), paid_at: oneDayAgo.toISOString() },
    { id: 'ord-004', player_id: 'p-105', gateway: 'mercadopago', item_type: 'reroll', quantity: 1, amount: 0.25, currency: 'BRL', status: 'pending', created_at: now.toISOString(), paid_at: null },
    { id: 'ord-005', player_id: 'p-106', gateway: 'stripe', item_type: 'pack_lightning', quantity: 3, amount: 1.00, currency: 'USD', status: 'paid', created_at: twoDaysAgo.toISOString(), paid_at: twoDaysAgo.toISOString() },
    { id: 'ord-006', player_id: 'p-103', gateway: 'mercadopago', item_type: 'combo_pack', quantity: 1, amount: 0.25, currency: 'BRL', status: 'paid', created_at: threeDaysAgo.toISOString(), paid_at: threeDaysAgo.toISOString() }
  ];

  rawInventories = [
    { player_id: 'p-101', reroll_count: 5, lightning_count: 2 },
    { player_id: 'p-102', reroll_count: 3, lightning_count: 4 },
    { player_id: 'p-103', reroll_count: 1, lightning_count: 0 },
    { player_id: 'p-104', reroll_count: 2, lightning_count: 3 },
    { player_id: 'p-105', reroll_count: 0, lightning_count: 0 },
    { player_id: 'p-106', reroll_count: 4, lightning_count: 5 }
  ];
}

// ==========================================
// 3. CÁLCULO E RENDERIZAÇÃO DE KPIS
// ==========================================

function renderKPIs() {
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 3600 * 1000);
  const past7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // Jogadores
  const totalPlayers = rawPlayers.length;
  const active24h = rawPlayers.filter(p => new Date(p.last_active_at || p.created_at) >= past24h).length;
  const active7d = rawPlayers.filter(p => new Date(p.last_active_at || p.created_at) >= past7d).length;
  const googlePlayers = rawPlayers.filter(p => Boolean(p.email)).length;
  const anonPlayers = totalPlayers - googlePlayers;

  // Financeiro
  const paidOrders = rawOrders.filter(o => o.status === 'paid');
  const pixRevenue = paidOrders
    .filter(o => o.gateway === 'mercadopago' || o.currency === 'BRL')
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const stripeRevenueUSD = paidOrders
    .filter(o => o.gateway === 'stripe' && o.currency === 'USD')
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalOrdersCount = rawOrders.length;
  const conversionRate = totalOrdersCount > 0 
    ? ((paidOrders.length / totalOrdersCount) * 100).toFixed(1) 
    : 0;

  // Partidas & Recordes
  const totalSessions = rawSessions.length;
  const totalPlayTimeSec = rawSessions.reduce((acc, s) => acc + (s.time_seconds || 0), 0);
  const avgPlayTimeSec = totalSessions > 0 ? Math.round(totalPlayTimeSec / totalSessions) : 0;
  const highScore = rawSessions.reduce((max, s) => Math.max(max, s.score || 0), 0);
  const maxCombo = rawSessions.reduce((max, s) => Math.max(max, s.combo || 1), 1);
  const avgScore = totalSessions > 0 ? Math.round(rawSessions.reduce((a, s) => a + s.score, 0) / totalSessions) : 0;

  // Power-ups no Inventário
  const totalRerolls = rawInventories.reduce((acc, i) => acc + (i.reroll_count || 0), 0);
  const totalLightnings = rawInventories.reduce((acc, i) => acc + (i.lightning_count || 0), 0);

  // Inserir valores no DOM
  setText('kpi-total-players', totalPlayers);
  setText('kpi-active-24h', active24h);
  setText('kpi-active-7d', active7d);
  setText('kpi-google-players', googlePlayers);
  setText('kpi-anon-players', anonPlayers);

  setText('kpi-pix-revenue', `R$ ${pixRevenue.toFixed(2).replace('.', ',')}`);
  setText('kpi-stripe-revenue', `$ ${stripeRevenueUSD.toFixed(2)}`);
  setText('kpi-conversion-rate', `${conversionRate}%`);
  setText('kpi-paid-orders-count', `${paidOrders.length} de ${totalOrdersCount}`);

  setText('kpi-total-sessions', totalSessions);
  setText('kpi-avg-playtime', formatDuration(avgPlayTimeSec));
  setText('kpi-high-score', highScore.toLocaleString('pt-BR'));
  setText('kpi-max-combo', `${maxCombo}x`);
  setText('kpi-avg-score', avgScore.toLocaleString('pt-BR'));

  setText('kpi-inv-rerolls', totalRerolls);
  setText('kpi-inv-lightnings', totalLightnings);
}

function setText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// ==========================================
// 4. GRÁFICOS (CHART.JS)
// ==========================================

function renderCharts() {
  if (typeof Chart === 'undefined') return;

  // Chart defaults for dark mode
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = '#1e293b';
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, sans-serif';

  renderRevenueChart();
  renderAuthChart();
  renderPowerupsChart();
  renderConversionChart();
}

function renderRevenueChart() {
  const ctx = document.getElementById('chart-revenue')?.getContext('2d');
  if (!ctx) return;

  // Filtrar estritamente apenas pedidos com status 'paid'
  const paidOrders = rawOrders.filter(o => o.status === 'paid');

  // Agrupar pedidos pagos por data (últimos 7 dias)
  const days = [];
  const amounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const displayStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    days.push(displayStr);

    const dayTotal = paidOrders
      .filter(o => {
        const orderDate = (o.paid_at || o.created_at || '').split('T')[0];
        return orderDate === dateStr;
      })
      .reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
    
    amounts.push(dayTotal);
  }

  if (chartRevenue) chartRevenue.destroy();

  chartRevenue = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Faturamento Diário Pago (R$)',
        data: amounts,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Receita Paga: R$ ${Number(ctx.parsed.y || 0).toFixed(2).replace('.', ',')}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#1e293b' },
          ticks: {
            callback: (v) => `R$ ${Number(v).toFixed(2)}`
          }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderAuthChart() {
  const ctx = document.getElementById('chart-auth')?.getContext('2d');
  if (!ctx) return;

  const googleCount = rawPlayers.filter(p => Boolean(p.email)).length;
  const anonCount = rawPlayers.length - googleCount;

  if (chartAuth) chartAuth.destroy();

  chartAuth = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Login Google', 'Anônimo / Convidado'],
      datasets: [{
        data: [googleCount || 3, anonCount || 3],
        backgroundColor: ['#6366f1', '#475569'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 16 }
        }
      },
      cutout: '70%'
    }
  });
}

function renderPowerupsChart() {
  const ctx = document.getElementById('chart-powerups')?.getContext('2d');
  if (!ctx) return;

  // Apenas pedidos PAGOS contam nas vendas confirmadas
  const paidOrders = rawOrders.filter(o => o.status === 'paid');

  const rerollsCount = paidOrders
    .filter(o => o.item_type && o.item_type.includes('reroll'))
    .reduce((acc, o) => acc + (Number(o.quantity) || 1), 0);

  const lightningsCount = paidOrders
    .filter(o => o.item_type && o.item_type.includes('lightning'))
    .reduce((acc, o) => acc + (Number(o.quantity) || 1), 0);

  const combosCount = paidOrders
    .filter(o => o.item_type && o.item_type.includes('combo'))
    .reduce((acc, o) => acc + (Number(o.quantity) || 1), 0);

  if (chartPowerups) chartPowerups.destroy();

  chartPowerups = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Atualizar Deque (Reroll)', 'Raio Destruidor', 'Super Combo'],
      datasets: [{
        label: 'Unidades Vendidas (Pagas)',
        data: [rerollsCount, lightningsCount, combosCount],
        backgroundColor: ['#ec4899', '#eab308', '#8b5cf6'],
        borderRadius: 8,
        barThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderConversionChart() {
  const ctx = document.getElementById('chart-conversion')?.getContext('2d');
  if (!ctx) return;

  const paidCount = rawOrders.filter(o => o.status === 'paid').length;
  const pendingCount = rawOrders.filter(o => o.status === 'pending').length;
  const expiredCount = rawOrders.filter(o => o.status === 'expired').length;
  const otherCount = rawOrders.length - (paidCount + pendingCount + expiredCount);

  if (chartConversion) chartConversion.destroy();

  const labels = ['Pagos / Aprovados', 'Pendentes Ativos', 'Expirados / Abandonados'];
  const data = [paidCount, pendingCount, expiredCount];
  const bgColors = ['#10b981', '#f59e0b', '#f43f5e'];

  if (otherCount > 0) {
    labels.push('Outros');
    data.push(otherCount);
    bgColors.push('#64748b');
  }

  chartConversion = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data.some(v => v > 0) ? data : [1, 0, 0],
        backgroundColor: bgColors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 16 }
        }
      },
      cutout: '70%'
    }
  });
}

// ==========================================
// 5. TABELAS DE DADOS & FILTROS
// ==========================================

function renderTables() {
  renderPlayersTable();
  renderOrdersTable();
}

function renderPlayersTable() {
  const tbody = document.getElementById('players-table-body');
  if (!tbody) return;

  const searchFilter = (document.getElementById('player-search-input')?.value || '').toLowerCase();

  const filtered = rawPlayers.filter(p => {
    const name = (p.username || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const id = (p.id || '').toLowerCase();
    return name.includes(searchFilter) || email.includes(searchFilter) || id.includes(searchFilter);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-500 text-sm">
          Nenhum jogador encontrado com o filtro atual.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const inv = rawInventories.find(i => i.player_id === p.id) || { reroll_count: 0, lightning_count: 0 };
    const dateFormatted = new Date(p.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const isGoogle = Boolean(p.email);

    return `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
        <td class="py-3 px-4 flex items-center gap-3">
          <span class="text-xl">${p.avatar_emoji || '🎮'}</span>
          <div>
            <div class="font-medium text-slate-200 text-sm">${escapeHTML(p.username || 'Jogador')}</div>
            <div class="text-xs text-slate-500 font-mono">${p.id}</div>
          </div>
        </td>
        <td class="py-3 px-4 text-xs">
          ${isGoogle 
            ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                 <span>Google</span> • ${escapeHTML(p.email)}
               </span>`
            : `<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
                 Anônimo
               </span>`
          }
        </td>
        <td class="py-3 px-4 text-xs text-slate-400">${dateFormatted}</td>
        <td class="py-3 px-4 text-xs">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-pink-950/70 border border-pink-800/40 text-pink-300 font-mono font-medium">🎲 ${inv.reroll_count}</span>
            <span class="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800/40 text-amber-300 font-mono font-medium">⚡ ${inv.lightning_count}</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;

  const searchFilter = (document.getElementById('order-search-input')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('order-status-filter')?.value || 'all';

  const filtered = rawOrders.filter(o => {
    const id = (o.id || '').toLowerCase();
    const item = (o.item_type || '').toLowerCase();
    const gateway = (o.gateway || '').toLowerCase();
    const matchesSearch = id.includes(searchFilter) || item.includes(searchFilter) || gateway.includes(searchFilter);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-500 text-sm">
          Nenhum pedido encontrado para o filtro selecionado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const player = rawPlayers.find(p => p.id === o.player_id);
    const playerName = player ? player.username : (o.player_id || 'Desconhecido');
    const dateFormatted = new Date(o.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    let statusBadge = '';
    if (o.status === 'paid') {
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/50">Pago</span>`;
    } else if (o.status === 'pending') {
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950 text-amber-300 border border-amber-800/50">Pendente</span>`;
    } else if (o.status === 'expired') {
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/40">Expirado</span>`;
    } else {
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/50">${escapeHTML(o.status)}</span>`;
    }

    const gatewayBadge = o.gateway === 'mercadopago'
      ? `<span class="text-xs text-sky-400 font-medium">Pix (Mercado Pago)</span>`
      : `<span class="text-xs text-indigo-400 font-medium">Stripe</span>`;

    const formattedAmount = o.currency === 'BRL'
      ? `R$ ${Number(o.amount).toFixed(2).replace('.', ',')}`
      : `$ ${Number(o.amount).toFixed(2)}`;

    return `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
        <td class="py-3 px-4 text-xs font-mono text-slate-400">${o.id}</td>
        <td class="py-3 px-4 text-xs text-slate-300 font-medium">${escapeHTML(playerName)}</td>
        <td class="py-3 px-4 text-xs">${gatewayBadge}</td>
        <td class="py-3 px-4 text-xs text-slate-300">
          <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">${formatItemType(o.item_type)} (x${o.quantity || 1})</span>
        </td>
        <td class="py-3 px-4 text-xs font-mono font-semibold text-slate-200">${formattedAmount}</td>
        <td class="py-3 px-4 text-xs">${statusBadge}</td>
        <td class="py-3 px-4 text-xs text-slate-500">${dateFormatted}</td>
      </tr>
    `;
  }).join('');
}

function formatItemType(itemType) {
  if (!itemType) return 'Item';
  if (itemType === 'pack_reroll') return 'Pack 3x Reroll';
  if (itemType === 'pack_lightning') return 'Pack 3x Raios';
  if (itemType === 'combo_pack') return 'Super Combo Pack';
  if (itemType === 'reroll') return 'Reroll Avulso';
  if (itemType === 'lightning') return 'Raio Avulso';
  return itemType;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// 6. EXPORTAÇÃO CSV
// ==========================================

export function exportPlayersCSV() {
  const headers = ['ID', 'Username', 'Email', 'CriadoEm', 'UltimoAcesso', 'Rerolls', 'Raios'];
  const rows = rawPlayers.map(p => {
    const inv = rawInventories.find(i => i.player_id === p.id) || { reroll_count: 0, lightning_count: 0 };
    return [
      p.id,
      `"${p.username || ''}"`,
      `"${p.email || ''}"`,
      p.created_at,
      p.last_active_at,
      inv.reroll_count,
      inv.lightning_count
    ].join(',');
  });

  downloadCSV(`hexainfinity_jogadores_${new Date().toISOString().split('T')[0]}.csv`, [headers.join(','), ...rows].join('\n'));
}

export function exportOrdersCSV() {
  const headers = ['ID', 'PlayerID', 'Gateway', 'Item', 'Quantidade', 'Valor', 'Moeda', 'Status', 'CriadoEm', 'PagoEm'];
  const rows = rawOrders.map(o => [
    o.id,
    o.player_id,
    o.gateway,
    o.item_type,
    o.quantity,
    o.amount,
    o.currency,
    o.status,
    o.created_at,
    o.paid_at || ''
  ].join(','));

  downloadCSV(`hexainfinity_pedidos_${new Date().toISOString().split('T')[0]}.csv`, [headers.join(','), ...rows].join('\n'));
}

function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// 7. POLLING AUTOMÁTICO (30 SEGUNDOS)
// ==========================================

function startPolling() {
  stopPolling();
  secondsUntilNextPoll = POLLING_INTERVAL_SECONDS;
  updateCountdownBadge();

  countdownTimer = setInterval(() => {
    if (!isAuthorized) return;
    secondsUntilNextPoll--;
    if (secondsUntilNextPoll <= 0) {
      secondsUntilNextPoll = POLLING_INTERVAL_SECONDS;
      refreshData();
    }
    updateCountdownBadge();
  }, 1000);
}

function stopPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  if (countdownTimer) clearInterval(countdownTimer);
}

function resetCountdown() {
  secondsUntilNextPoll = POLLING_INTERVAL_SECONDS;
  updateCountdownBadge();
}

function updateCountdownBadge() {
  const el = document.getElementById('polling-countdown');
  if (el) el.textContent = `${secondsUntilNextPoll}s`;
}

function setRefreshLoading(isLoading) {
  const btn = document.getElementById('manual-refresh-btn');
  const icon = document.getElementById('refresh-icon');
  if (btn) btn.disabled = isLoading;
  if (icon) {
    if (isLoading) {
      icon.classList.add('animate-spin');
    } else {
      icon.classList.remove('animate-spin');
    }
  }
}

function updateLastSyncTimestamp() {
  const el = document.getElementById('last-sync-time');
  if (el) {
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    el.textContent = `Atualizado às ${timeStr}`;
  }
}

// ==========================================
// 8. EVENT LISTENERS DA INTERFACE
// ==========================================

function setupUIEventListeners() {
  document.getElementById('manual-refresh-btn')?.addEventListener('click', () => {
    refreshData();
  });

  document.getElementById('player-search-input')?.addEventListener('input', () => {
    renderPlayersTable();
  });

  document.getElementById('order-search-input')?.addEventListener('input', () => {
    renderOrdersTable();
  });

  document.getElementById('order-status-filter')?.addEventListener('change', () => {
    renderOrdersTable();
  });

  document.getElementById('export-players-btn')?.addEventListener('click', () => {
    exportPlayersCSV();
  });

  document.getElementById('export-orders-btn')?.addEventListener('click', () => {
    exportOrdersCSV();
  });
}

// Inicialização automática ao carregar
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
